from __future__ import annotations

from typing import Any
from urllib.parse import quote

from telegram import Update
from telegram.ext import ContextTypes

from core.settings import get_settings
from formatters.control_surface_formatters import diagnostic, summarize_response
from shared.context.actor_context import build_actor_context
from shared.http.http_client import InternalHttpClient

CUSTOMER_SAFE_MODE = "customer_read_only_no_money_or_fulfillment_writes"
PAYMENT_PROOF_RULE = "Payment status is never treated as paid unless backend proof explicitly says paid."
FULFILLMENT_PROOF_RULE = "Order status is never treated as fulfilled unless backend proof explicitly says fulfilled."
PRODUCT_SOURCE_RULE = "Product source: Medusa Store API/public API backed; demo-only catalog is labeled DEMO and blocked for first real transaction."
SAFE_PAYMENT_STATES = {"pending_verification", "paid_verified", "not_found", "support_required"}
SAFE_ORDER_STATES = {"support_required", "not_found", "pending_verification"}


class CustomerCommandService:
    def __init__(self) -> None:
        settings = get_settings()
        self.http = InternalHttpClient()
        self.api_base_url = settings.api_base_url
        self.medusa_base_url = settings.medusa_base_url
        self.web_base_url = settings.web_base_url

    async def handle(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        command = _command_name(update)
        actor = build_actor_context(update)
        try:
            text = await self._dispatch(command, context.args or [], actor.telegram_user_id)
        except Exception as exc:  # sanitized final guard; no secrets
            text = diagnostic(
                f"/{command or 'customer'}",
                ["Message: customer command failed safely", f"Blockers: {exc.__class__.__name__}"],
                next_action="Use /support or retry after storefront/API health is restored.",
            )
        if update.effective_message:
            await update.effective_message.reply_text(text)

    async def _dispatch(self, command: str, args: list[str], actor_id: str) -> str:
        if command in {"start", "help"}:
            return self._customer_help(actor_id)
        if command == "shop":
            return self._shop_text()
        if command == "products":
            return await self._products_text(actor_id)
        if command == "product":
            return await self._product_text(args, actor_id)
        if command == "cart_help":
            return self._cart_help()
        if command == "checkout_help":
            return self._checkout_help()
        if command == "order_status":
            return await self._order_status(args, actor_id)
        if command == "payment_status":
            return await self._payment_status(args, actor_id)
        if command in {"support", "contact_support"}:
            return await self._support_text(args, actor_id)
        return self._customer_help(actor_id)

    def _customer_help(self, actor_id: str) -> str:
        return diagnostic(
            "dBaronX Customer Bot",
            [
                f"Telegram User ID: {actor_id}",
                "Public customer commands: /shop, /products, /product <handle_or_id>, /cart_help, /checkout_help, /order_status <order_or_email_or_reference>, /payment_status <checkout_session_or_order_ref>, /support, /contact_support.",
                f"Mode: {CUSTOMER_SAFE_MODE}.",
                "Admin/ops diagnostic commands are protected and are not shown to customer users.",
            ],
            next_action="Use /products to browse, then open the product or storefront link to checkout through the verified web flow.",
        )

    def _shop_text(self) -> str:
        return diagnostic(
            "/shop",
            [
                f"Storefront URL: {self.web_base_url}",
                f"Product listing URL: {self.web_base_url}/products",
                "Telegram browse path: run /products, then /product <handle_or_id> for details.",
                f"Support path: /contact_support or {self.web_base_url}/support",
                "Checkout must happen through the dBaronX storefront/Stripe flow, not inside Telegram.",
                f"Mode: {CUSTOMER_SAFE_MODE}.",
            ],
            next_action="Open the product listing, choose a real supplier product, then complete checkout through the web storefront and Stripe-hosted payment.",
        )

    async def _products_text(self, actor_id: str) -> str:
        payload = await self._medusa_get("/store/products", actor_id=actor_id, params={"limit": 5})
        products = _extract_products(payload)[:5]
        if not products:
            return diagnostic(
                "/products",
                [
                    PRODUCT_SOURCE_RULE,
                    summarize_response("Medusa /store/products", payload),
                    f"Product listing URL: {self.web_base_url}/products",
                    "Blockers: endpoint_not_available_yet" if _is_not_available(payload) else "Blockers: no_public_products_returned",
                ],
                next_action="Open the product listing. If it is empty, publish/import one approved real supplier product outside Telegram.",
            )
        real_supplier_present = any(not _is_demo_product(product) and _has_supplier_signal(product) for product in products)
        demo_only = all(_is_demo_product(product) for product in products)
        sections = [PRODUCT_SOURCE_RULE, f"Returned {len(products)} public products (Telegram limit: 5)."]
        if demo_only or not real_supplier_present:
            sections.append("Blockers: real_supplier_product_missing")
        sections.extend(_product_summary_line(idx + 1, product, self.web_base_url) for idx, product in enumerate(products))
        return diagnostic(
            "/products",
            sections,
            next_action="Use /product <handle_or_id> or open a listed product link. For first real checkout, use only a non-DEMO product with storefront availability.",
        )

    async def _product_text(self, args: list[str], actor_id: str) -> str:
        if not args:
            return diagnostic("/product", ["Usage: /product <handle_or_id>", f"Product listing URL: {self.web_base_url}/products"], next_action="Copy a product handle or ID from /products or the storefront.")
        product_ref = args[0].strip()
        payloads = [
            await self._medusa_get(f"/store/products/{quote(product_ref, safe='')}", actor_id=actor_id),
            await self._medusa_get("/store/products", actor_id=actor_id, params={"handle": product_ref, "limit": 1}),
        ]
        products: list[dict[str, Any]] = []
        for payload in payloads:
            products.extend(_extract_products(payload))
        product = _first_matching_product(products, product_ref)
        if not product:
            fallback = f"{self.web_base_url}/products/{quote(product_ref, safe='')}"
            return diagnostic(
                "/product",
                [
                    PRODUCT_SOURCE_RULE,
                    "Status: not_found",
                    f"Product/storefront lookup URL: {fallback}",
                    "Telegram did not create a cart, payment, fulfillment, or supplier import.",
                ],
                next_action="Open the lookup link, use /products for published products, or contact /support with the product reference.",
            )
        demo = _is_demo_product(product)
        sections = [
            PRODUCT_SOURCE_RULE,
            f"Product: {'DEMO — ' if demo else ''}{_product_title(product)}",
            f"Price: {_product_price(product)}",
            f"Availability: {_availability_hint(product)}",
            f"Supplier: {_supplier_hint(product)}",
            f"Product URL: {_product_link(product, self.web_base_url)}",
            f"Checkout URL: {_product_link(product, self.web_base_url)}",
            "Checkout must run through the storefront and Stripe; Telegram does not mark paid or fulfilled.",
        ]
        if demo or not _has_supplier_signal(product):
            sections.append("Blockers: real_supplier_product_missing")
        return diagnostic(
            "/product",
            sections,
            next_action="Open the product URL, add to cart on the web storefront, and continue only if the storefront shows the item as available.",
        )

    def _cart_help(self) -> str:
        return diagnostic(
            "/cart_help",
            [
                "Use the storefront cart to add/remove products and review shipping/taxes.",
                f"Cart/storefront link: {self.web_base_url}/cart",
                "Telegram cannot create carts, override prices, credit wallets, or reserve inventory.",
            ],
            next_action="Open the cart link after selecting a product from /products.",
        )

    def _checkout_help(self) -> str:
        return diagnostic(
            "/checkout_help",
            [
                "Safe checkout flow: Telegram → product page → web checkout → Stripe-hosted checkout → signed webhook → order confirmation.",
                "Telegram can guide you to the product page, but it cannot complete or confirm payment.",
                "Payment/order status is verified only after backend confirmation from signed Stripe webhook evidence and durable order/payment records.",
                PAYMENT_PROOF_RULE,
                FULFILLMENT_PROOF_RULE,
            ],
            next_action="After checkout, keep your order reference or Checkout Session ID and use /payment_status or /order_status for safe verification guidance.",
        )

    async def _order_status(self, args: list[str], actor_id: str) -> str:
        if not args:
            return diagnostic("/order_status", ["Usage: /order_status <order_or_email_or_reference>", "Safe status: support_required", FULFILLMENT_PROOF_RULE], next_action="Provide the order ID/reference from checkout or use /contact_support.")
        reference = args[0].strip()
        payload = await self._api_get("/api/orders/customer/status", actor_id=actor_id, params={"reference": reference})
        fulfilled = _truthy_nested(payload, ["fulfilled", "isFulfilled", "orderFulfilled"])
        safe_status = "support_required" if _is_not_available(payload) else ("pending_verification" if not fulfilled else "support_required")
        proof = "Fulfilled: false/not proven"
        return diagnostic(
            "/order_status",
            [
                f"Safe status: {safe_status}",
                summarize_response("Customer order status", payload),
                proof,
                FULFILLMENT_PROOF_RULE,
                "Telegram never exposes admin order internals and never claims fulfillment for customers.",
            ],
            next_action="Use /contact_support with your order/payment reference for fulfillment help; do not treat the order as fulfilled from Telegram.",
        )

    async def _payment_status(self, args: list[str], actor_id: str) -> str:
        if not args:
            return diagnostic("/payment_status", ["Usage: /payment_status <checkout_session_or_order_ref>", "Safe statuses: pending_verification, paid_verified, not_found, support_required", PAYMENT_PROOF_RULE], next_action="Provide the Stripe Checkout Session ID or order reference from checkout.")
        reference = args[0].strip()
        params = _payment_lookup_params(reference)
        payload = await self._api_get("/api/checkout/stripe/settlement-status", actor_id=actor_id, params=params)
        paid = _payment_verified(payload)
        safe_status = _customer_payment_status(payload, paid)
        proof = "Paid: true (backend proof)" if safe_status == "paid_verified" else "Paid: false/not proven"
        return diagnostic(
            "/payment_status",
            [
                f"Safe status: {safe_status}",
                summarize_response("Customer payment settlement status", _customer_safe_payment_payload(payload)),
                proof,
                PAYMENT_PROOF_RULE,
                "Customer output is limited to pending_verification, paid_verified, not_found, or support_required.",
            ],
            next_action="If payment is not proven, wait for signed Stripe webhook processing or contact support with the checkout/session reference.",
        )

    async def _support_text(self, args: list[str], actor_id: str) -> str:
        message = " ".join(args).strip()
        sections = [
            "Contact dBaronX support with your order reference, payment reference, product link, and a short issue summary.",
            "Support email/channel: use the official dBaronX storefront contact/support page if configured.",
            f"Support page fallback: {self.web_base_url}/support",
        ]
        if message and self.api_base_url:
            payload = await self._api_get("/api/support/customer-request", actor_id=actor_id, params={"message": message[:500]})
            sections.append(summarize_response("Support request endpoint", payload))
            if _is_not_available(payload):
                sections.append("Blockers: endpoint_not_available_yet")
        return diagnostic("/support", sections, next_action="Open the support page or send your order/payment reference through the official dBaronX support channel.")

    async def _api_get(self, path: str, *, actor_id: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        if not self.api_base_url:
            return {"success": False, "data": {}, "blockers": ["API_BASE_URL_missing"], "statusCode": 0, "message": "API_BASE_URL missing"}
        return await self.http.get(self.api_base_url, path, actor_id=actor_id, params=params, internal=False)

    async def _medusa_get(self, path: str, *, actor_id: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        if not self.medusa_base_url:
            return {"success": False, "data": {}, "blockers": ["MEDUSA_BASE_URL_missing"], "statusCode": 0, "message": "MEDUSA_BASE_URL missing"}
        return await self.http.get(self.medusa_base_url, path, actor_id=actor_id, params=params, internal=False)


def _command_name(update: Update) -> str:
    text = update.effective_message.text if update.effective_message and update.effective_message.text else ""
    return text.split()[0].removeprefix("/").split("@", 1)[0]


def _extract_products(payload: dict[str, Any]) -> list[dict[str, Any]]:
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    for key in ("products", "items", "data"):
        value = data.get(key) if isinstance(data, dict) else None
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
    if isinstance(data, dict) and isinstance(data.get("product"), dict):
        return [data["product"]]
    return []


def _product_title(product: dict[str, Any]) -> str:
    return str(product.get("title") or product.get("name") or product.get("handle") or product.get("id") or "Untitled product")[:120]


def _product_link(product: dict[str, Any], web_base_url: str) -> str:
    handle = str(product.get("handle") or product.get("id") or "").strip()
    if not handle:
        return f"{web_base_url}/products"
    return f"{web_base_url}/products/{quote(handle, safe='')}"


def _product_summary_line(index: int, product: dict[str, Any], web_base_url: str) -> str:
    prefix = "DEMO — " if _is_demo_product(product) else ""
    return f"{index}. {prefix}{_product_title(product)} | Price: {_product_price(product)} | Availability: {_availability_hint(product)} | Supplier: {_supplier_hint(product)} | URL: {_product_link(product, web_base_url)}"


def _first_matching_product(products: list[dict[str, Any]], product_ref: str) -> dict[str, Any] | None:
    ref = product_ref.strip().lower()
    for product in products:
        if ref in {str(product.get("handle") or "").lower(), str(product.get("id") or "").lower()}:
            return product
    return products[0] if products else None


def _product_price(product: dict[str, Any]) -> str:
    direct = product.get("price") or product.get("display_price") or product.get("price_text")
    if isinstance(direct, str) and direct.strip():
        return direct.strip()[:80]
    if isinstance(direct, (int, float)):
        return _format_minor_price(direct, str(product.get("currency_code") or product.get("currency") or "usd"))
    variants = product.get("variants")
    prices: list[str] = []
    if isinstance(variants, list):
        for variant in variants:
            if not isinstance(variant, dict):
                continue
            calculated = variant.get("calculated_price")
            if isinstance(calculated, dict):
                amount = calculated.get("calculated_amount") or calculated.get("amount")
                currency = calculated.get("currency_code") or calculated.get("currency")
                if amount is not None:
                    prices.append(_format_minor_price(amount, str(currency or "usd")))
            price_list = variant.get("prices")
            if isinstance(price_list, list):
                for price in price_list:
                    if isinstance(price, dict) and price.get("amount") is not None:
                        prices.append(_format_minor_price(price.get("amount"), str(price.get("currency_code") or "usd")))
    return prices[0] if prices else "not publicly listed"


def _format_minor_price(amount: Any, currency: str) -> str:
    try:
        value = float(amount) / 100
    except (TypeError, ValueError):
        return "not publicly listed"
    return f"{currency.upper()} {value:.2f}"


def _availability_hint(product: dict[str, Any]) -> str:
    if product.get("is_giftcard") is True:
        return "digital/product availability shown on storefront"
    status = str(product.get("status") or "").lower()
    if status and status not in {"published", "active"}:
        return f"storefront status: {status}"
    variants = product.get("variants")
    if isinstance(variants, list) and variants:
        inventory_values = [variant.get("inventory_quantity") for variant in variants if isinstance(variant, dict)]
        numeric = [int(value) for value in inventory_values if isinstance(value, int)]
        if numeric:
            return "in stock" if any(value > 0 for value in numeric) else "not publicly in stock"
        if any(isinstance(variant, dict) and variant.get("manage_inventory") is False for variant in variants):
            return "availability managed by storefront/supplier"
    return "availability shown on storefront; supplier stock not faked in Telegram"


def _supplier_hint(product: dict[str, Any]) -> str:
    metadata = product.get("metadata") if isinstance(product.get("metadata"), dict) else {}
    supplier = metadata.get("supplier") or metadata.get("supplier_name") or metadata.get("supplier_id") or metadata.get("source") or product.get("supplier")
    if supplier:
        return str(supplier)[:100]
    if _is_demo_product(product):
        return "DEMO only; real supplier product missing"
    return "not publicly listed"


def _is_demo_product(product: dict[str, Any]) -> bool:
    metadata = product.get("metadata") if isinstance(product.get("metadata"), dict) else {}
    if metadata.get("realSupplierProduct") is True and metadata.get("demo") is False:
        return False
    if metadata.get("demo") is True or metadata.get("realSupplierProduct") is False:
        return True
    values = [product.get("title"), product.get("name"), product.get("handle"), product.get("id")]
    values.extend(metadata.get(key) for key in ("source", "supplier", "supplier_name", "environment", "type"))
    joined = " ".join(str(value or "") for value in values).lower()
    return any(marker in joined for marker in ("demo", "sample", "test product", "mock"))


def _has_supplier_signal(product: dict[str, Any]) -> bool:
    metadata = product.get("metadata") if isinstance(product.get("metadata"), dict) else {}
    supplier_values = [metadata.get(key) for key in ("supplier", "supplier_name", "supplier_id", "source", "supplierProductId", "supplier_product_id", "supplierSku", "supplier_sku", "sourceUrl", "cj_product_id", "external_id")]
    return any(str(value or "").strip() and "demo" not in str(value).lower() for value in supplier_values)


def _payment_lookup_params(reference: str) -> dict[str, Any]:
    if reference.startswith("cs_"):
        return {"sessionId": reference}
    if reference.startswith("evt_"):
        return {"stripeEventId": reference}
    if reference.startswith("pi_"):
        return {"paymentIntentId": reference}
    if reference.startswith(("ch_", "py_")):
        return {"chargeId": reference}
    return {"orderRef": reference, "checkoutRef": reference}


def _payment_verified(payload: dict[str, Any]) -> bool:
    return _truthy_nested(payload, ["paymentMarkedPaid"]) and _truthy_nested(payload, ["verifiedStripeEventReady", "paymentRecordReady"])


def _customer_payment_status(payload: dict[str, Any], paid: bool) -> str:
    if paid:
        return "paid_verified"
    if _is_not_available(payload):
        return "support_required"
    blockers = _payload_blockers(payload)
    if any("required" in blocker or "missing" in blocker for blocker in blockers):
        return "not_found"
    return "pending_verification"


def _customer_safe_payment_payload(payload: dict[str, Any]) -> dict[str, Any]:
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    safe_data = {}
    if isinstance(data, dict):
        for key in ("success", "verifiedStripeEventReady", "paymentRecordReady", "economicEventVerified", "paymentMarkedPaid", "settlementStatus"):
            if key in data:
                safe_data[key] = data[key]
    return {"success": bool(payload.get("success")), "data": safe_data, "blockers": [], "statusCode": payload.get("statusCode"), "message": payload.get("message")}


def _payload_blockers(payload: dict[str, Any]) -> list[str]:
    blockers = payload.get("blockers") or []
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    if isinstance(data, dict):
        blockers = [*blockers, *(data.get("blockers") or [])]
    return [str(blocker) for blocker in blockers]


def _truthy_nested(payload: dict[str, Any], keys: list[str]) -> bool:
    values: list[Any] = [payload]
    data = payload.get("data") if isinstance(payload.get("data"), dict) else None
    if data:
        values.append(data)
    for value in values:
        if isinstance(value, dict) and any(value.get(key) is True for key in keys):
            return True
    return False


def _is_not_available(payload: dict[str, Any]) -> bool:
    blockers = payload.get("blockers") or []
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    if isinstance(data, dict):
        blockers = [*blockers, *(data.get("blockers") or [])]
    message = str(payload.get("message") or "")
    status = int(payload.get("statusCode") or 0)
    return status in {0, 404, 405, 501} or any("endpoint_not_available" in str(blocker) for blocker in blockers) or "not found" in message.lower()


customer_command_service = CustomerCommandService()


async def customer_command_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await customer_command_service.handle(update, context)
