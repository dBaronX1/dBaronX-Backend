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
                f"Storefront: {self.web_base_url}",
                "Checkout must happen through the dBaronX storefront/Stripe flow, not inside Telegram.",
                f"Mode: {CUSTOMER_SAFE_MODE}.",
            ],
            next_action="Open the storefront link, add a real supplier product to cart, then complete checkout through Stripe.",
        )

    async def _products_text(self, actor_id: str) -> str:
        payload = await self._medusa_get("/store/products", actor_id=actor_id, params={"limit": 5})
        products = _extract_products(payload)
        if not products:
            return diagnostic(
                "/products",
                [
                    summarize_response("Medusa /store/products", payload),
                    f"Storefront fallback: {self.web_base_url}/products",
                    "Blockers: endpoint_not_available_yet" if _is_not_available(payload) else "Blockers: no_public_products_returned",
                ],
                next_action="Open the storefront products page. If it is empty, publish/import one approved real supplier product outside Telegram.",
            )
        lines = [f"{idx + 1}. {_product_title(product)} — {_product_link(product, self.web_base_url)}" for idx, product in enumerate(products)]
        return diagnostic(
            "/products",
            ["Public products returned by Medusa store API:", *lines],
            next_action="Use /product <handle_or_id> or open a listed product link to checkout through the verified storefront.",
        )

    async def _product_text(self, args: list[str], actor_id: str) -> str:
        if not args:
            return diagnostic("/product", ["Usage: /product <handle_or_id>", f"Storefront fallback: {self.web_base_url}/products"], next_action="Copy a product handle or ID from /products or the storefront.")
        product_ref = args[0].strip()
        payloads = [
            await self._medusa_get(f"/store/products/{quote(product_ref, safe='')}", actor_id=actor_id),
            await self._medusa_get("/store/products", actor_id=actor_id, params={"handle": product_ref, "limit": 1}),
        ]
        products = []
        for payload in payloads:
            products.extend(_extract_products(payload))
        if not products:
            fallback = f"{self.web_base_url}/products/{quote(product_ref, safe='')}"
            return diagnostic(
                "/product",
                [
                    "Blockers: endpoint_not_available_yet",
                    f"Product/storefront fallback: {fallback}",
                    "Telegram did not create a cart, payment, fulfillment, or supplier import.",
                ],
                next_action="Open the fallback link or use /products to find a published product.",
            )
        product = products[0]
        return diagnostic(
            "/product",
            [
                f"Product: {_product_title(product)}",
                f"Link: {_product_link(product, self.web_base_url)}",
                "Checkout must run through the storefront and Stripe; Telegram does not mark paid or fulfilled.",
            ],
            next_action="Open the product link, add to cart, and complete checkout through Stripe only if the storefront shows the product as available.",
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
                "Checkout is completed on the dBaronX storefront with Stripe-hosted payment when available.",
                "Only signed Stripe webhook proof and backend order records can mark a payment/order complete.",
                PAYMENT_PROOF_RULE,
                FULFILLMENT_PROOF_RULE,
            ],
            next_action="After payment, keep your order reference or Checkout Session ID and use /payment_status or /order_status.",
        )

    async def _order_status(self, args: list[str], actor_id: str) -> str:
        if not args:
            return diagnostic("/order_status", ["Usage: /order_status <order_or_email_or_reference>", FULFILLMENT_PROOF_RULE], next_action="Provide the order ID/reference from checkout or support email.")
        reference = args[0].strip()
        payload = await self._api_get("/api/orders/customer/status", actor_id=actor_id, params={"reference": reference})
        fulfilled = _truthy_nested(payload, ["fulfilled", "isFulfilled", "orderFulfilled"])
        proof = "Fulfilled: true (backend proof)" if fulfilled else "Fulfilled: false/not proven"
        return diagnostic(
            "/order_status",
            [summarize_response("Customer order status", payload), proof, FULFILLMENT_PROOF_RULE],
            next_action="If endpoint_not_available_yet or not proven appears, contact support with your order/payment reference; do not treat the order as fulfilled.",
        )

    async def _payment_status(self, args: list[str], actor_id: str) -> str:
        if not args:
            return diagnostic("/payment_status", ["Usage: /payment_status <checkout_session_or_order_ref>", PAYMENT_PROOF_RULE], next_action="Provide the Stripe Checkout Session ID or order reference from checkout.")
        reference = args[0].strip()
        payload = await self._api_get("/api/checkout/stripe/customer-payment-status", actor_id=actor_id, params={"reference": reference})
        paid = _truthy_nested(payload, ["paid", "paymentMarkedPaid", "paymentPaid", "settlementSafeToClaim"])
        proof = "Paid: true (backend proof)" if paid else "Paid: false/not proven"
        return diagnostic(
            "/payment_status",
            [summarize_response("Customer payment status", payload), proof, PAYMENT_PROOF_RULE],
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
    message = str(payload.get("message") or "")
    status = int(payload.get("statusCode") or 0)
    return status in {0, 404, 405, 501} or any("endpoint_not_available" in str(blocker) for blocker in blockers) or "not found" in message.lower()


customer_command_service = CustomerCommandService()


async def customer_command_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await customer_command_service.handle(update, context)
