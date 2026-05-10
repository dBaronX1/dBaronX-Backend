from __future__ import annotations

from typing import Any
from urllib.parse import quote

from telegram import Update
from telegram.ext import ContextTypes

from core.audit import audit_command
from core.settings import get_settings
from formatters.control_surface_formatters import diagnostic, json_block, summarize_response
from services.command_registry import get_command, list_commands
from services.fastapi_client import FastApiClient
from services.medusa_client import MedusaClient
from shared.context.actor_context import build_actor_context
from shared.http.http_client import InternalHttpClient
from shared.security.admin_guard import require_role

SAFE_SETTLEMENT_REQUIRED = "Only backend verified settlement proof may mark a Stripe payment settled."


class ControlSurfaceService:
    def __init__(self) -> None:
        settings = get_settings()
        self.http = InternalHttpClient()
        self.api_base_url = settings.api_base_url
        self.fastapi = FastApiClient()
        self.medusa = MedusaClient()

    async def handle(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        command = (update.effective_message.text.split()[0] if update.effective_message and update.effective_message.text else "").removeprefix("/").split("@", 1)[0]
        spec = get_command(command)
        user = update.effective_user
        if not spec:
            return
        if not await require_role(update, command, spec.required_role):
            return
        actor = build_actor_context(update)
        try:
            text = await self._dispatch(command, context.args or [], actor.telegram_user_id, raw=spec.raw_json)
            audit_command(command, actor.telegram_user_id, "success")
        except Exception as exc:  # sanitized final guard; no secrets
            audit_command(command, actor.telegram_user_id, "error")
            text = diagnostic(f"❌ /{command}", ["Message: command failed safely", f"Blockers: {exc.__class__.__name__}"], next_action="Check backend health and bot logs; secrets are not displayed.")
        if update.effective_message:
            await update.effective_message.reply_text(text, parse_mode="Markdown" if spec.raw_json else None)

    async def _dispatch(self, command: str, args: list[str], actor_id: str, *, raw: bool = False) -> str:
        if command == "debug_status":
            payload = await self._status_payload(actor_id)
            return json_block("/debug_status raw normalized JSON", payload, next_action="Use specific status commands for mobile summaries.")
        if command == "help" or command == "commands":
            return self._help_text()
        if command == "start":
            return diagnostic("dBaronX Telegram Control Surface", ["Authorized admin surface: active", "Mode: webhook, read-only diagnostics in this phase"], next_action="Run /status or /help.")
        if command in {"status", "health"}:
            payload = await self._status_payload(actor_id)
            sections = [summarize_response("API /api/health", payload["apiHealth"]), summarize_response("FastAPI /health", payload["fastapiHealth"]), summarize_response("Medusa /health", payload["medusaHealth"]), summarize_response("Payments readiness", payload["paymentsReadiness"])]
            return diagnostic(f"/{command} ecosystem health", sections, next_action="Investigate any ❌/⚠️ blocker with the matching module command.")
        if command == "runtime":
            return await self._api_summary("/runtime", ["/api/system/runtime-status", "/api/system/runtime-contract"], actor_id, "Use /routes if runtime route/controller mismatch appears.")
        if command == "launch":
            return await self._api_summary("/launch", ["/api/system/deployment-readiness", "/api/payments/readiness", "/api/payments/economic-readiness"], actor_id, "Clear blockers before launch; do not bypass backend readiness.")
        if command == "routes":
            return await self._api_summary("/routes", ["/api/system/controller-registry"], actor_id, "Add backend endpoint/controller if endpoint_not_available_yet appears.")
        if command == "env_check":
            blockers = get_settings().startup_blockers()
            sections = [f"{'✅' if not blockers else '⚠️'} Required env contract", "Configured flags only; values are never displayed.", f"Blockers: {', '.join(blockers) if blockers else 'none'}"]
            return diagnostic("/env_check", sections, next_action="Set missing Render/Fly env vars, then restart bot.")
        if command in {"commerce_status", "shipping_status", "catalog_status", "orders_status"}:
            return await self._api_summary(f"/{command}", ["/api/commerce/health", "/api/commerce/final-closure-readiness"], actor_id, "Use backend commerce ensure/repair endpoints outside Telegram if blockers remain.")
        if command == "medusa_status":
            payload = await self.medusa.health(actor_id=actor_id)
            return diagnostic("/medusa_status", [summarize_response("Medusa /health", payload)], next_action="If Medusa is down, restart Medusa before commerce repairs.")
        if command in {"payments_status", "economic_status", "dbx_status"}:
            paths = ["/api/payments/readiness", "/api/payments/economic-readiness"]
            if command == "dbx_status":
                paths.append("/api/system/controller-registry")
            summary = await self._api_summary(f"/{command}", paths, actor_id, "Configure DBX_TOKEN_MINT server-side if DBX mint blocker appears; Telegram remains read-only/proof-only for settlement.")
            if command == "payments_status":
                summary += "\n\nCheckout safe: use /stripe_first_tx_status plus the first-transaction smoke. Settlement safe: backend verified proof only. Order sync ready: verify with /stripe_settlement <cs_test_...>."
            return summary
        if command == "stripe_status":
            return await self._api_summary("/stripe_status", ["/api/checkout/stripe/readiness"], actor_id, "Do not bypass signed Stripe webhook verification.")
        if command == "stripe_first_tx_status":
            readiness = await self.http.get(self.api_base_url, "/api/checkout/stripe/readiness", actor_id=actor_id, internal=False)
            storage = await self.http.get(self.api_base_url, "/api/checkout/stripe/settlement-storage-readiness", actor_id=actor_id)
            payments = await self.http.get(self.api_base_url, "/api/payments/readiness", actor_id=actor_id, internal=False)
            sections = [
                summarize_response("Stripe readiness", readiness),
                summarize_response("Settlement storage", storage),
                summarize_response("Payments readiness", payments),
                "Checkout safe: only when backend smoke returns checkoutSafeToOpen=true and sessionId starts with cs_test_.",
                "Settlement safe: only when backend returns verifiedStripeEventReady, paymentRecordReady, economicEventVerified, medusaOrderCompletionReady, orderSyncReady, and duplicateWebhookSafe.",
                SAFE_SETTLEMENT_REQUIRED,
            ]
            return diagnostic("/stripe_first_tx_status", sections, next_action="Run node scripts/e2e-first-transaction-with-telegram-ops-smoke.mjs; open only a cs_test_* Checkout URL if checkoutSafeToOpen=true.")
        if command == "stripe_storage":
            payload = await self.http.get(self.api_base_url, "/api/checkout/stripe/settlement-storage-readiness", actor_id=actor_id)
            sections = [summarize_response("Settlement storage readiness", payload), "Checkout safe: not decided by storage alone.", "Settlement safe: false until signed Stripe webhook evidence and order sync proof exist.", SAFE_SETTLEMENT_REQUIRED]
            return diagnostic("/stripe_storage", sections, next_action="If tables are missing: apply Supabase migration, restart API, replay checkout.session.completed.")
        if command == "stripe_settlement":
            if not args:
                return diagnostic("/stripe_settlement", ["Usage: /stripe_settlement <cs_test_or_cs_live_session_id>", SAFE_SETTLEMENT_REQUIRED], next_action="Provide a checkout session ID returned by Stripe/backend.")
            session_id = args[0].strip()
            if not (session_id.startswith("cs_test_") or session_id.startswith("cs_live_")):
                return diagnostic("/stripe_settlement", ["Blockers: checkout_session_id_required", "Expected: cs_test_* or cs_live_*; evt_* is an event ID, pi_* is a PaymentIntent ID, and py_*/ch_* is charge-like evidence.", SAFE_SETTLEMENT_REQUIRED], next_action="Rerun with the Checkout Session ID from Stripe Checkout, not an event/payment/charge ID.")
            payload = await self.http.get(self.api_base_url, "/api/checkout/stripe/settlement-status", actor_id=actor_id, params={"sessionId": session_id})
            proof = self._payment_proof_lines(payload)
            return diagnostic("/stripe_settlement", [summarize_response("Settlement proof", payload), *proof, SAFE_SETTLEMENT_REQUIRED], next_action="If proof missing, apply migration/restart API/replay checkout.session.completed; do not claim settled manually.")
        if command == "dbx_payment":
            if not args:
                return diagnostic("/dbx_payment", ["Usage: /dbx_payment <reference>", "DBX verification is backend-only."], next_action="Provide a DBX payment reference.")
            ref = quote(args[0].strip(), safe="")
            payload = await self.http.get(self.api_base_url, f"/api/dbx-payments/{ref}", actor_id=actor_id)
            return diagnostic("/dbx_payment", [summarize_response("DBX payment proof", payload), "Payment is not treated as completed unless backend status/proof says completed."], next_action="If token mint blocker appears, configure DBX_TOKEN_MINT server-side.")
        if command in {"suppliers_status", "cj_status"}:
            paths = ["/api/suppliers/readiness"] + (["/api/suppliers/cj/preflight"] if command == "cj_status" else [])
            return await self._api_summary(f"/{command}", paths, actor_id, "No massive import from Telegram; use backend import only after readiness passes.")
        if command == "cj_import_ready":
            if len(args) < 2:
                return diagnostic("/cj_import_ready", ["Usage: /cj_import_ready <supplierProductId> <supplierSku>", "Explicit IDs are required; no auto massive import."], next_action="Copy exact CJ product ID and SKU from approved backend/admin source.")
            payload = await self.http.post(self.api_base_url, "/api/suppliers/cj/import-readiness", json_body={"supplierProductId": args[0], "supplierSku": args[1]}, actor_id=actor_id)
            return diagnostic("/cj_import_ready", [summarize_response("CJ import readiness", payload), "Readiness only; Telegram does not import real products in this phase."], next_action="If ready, perform controlled backend-approved import outside Telegram.")
        if command == "aliexpress_status":
            return self._planned("/aliexpress_status", "endpoint_not_available_yet", "Add approved AliExpress backend readiness endpoint; no scraping from Telegram.")
        endpoint_map = {
            "ads_status": ["/api/ads/admin/dashboard"],
            "watch_status": ["/api/system/controller-registry"],
            "affiliate_status": ["/api/v1/affiliate/admin/dashboard", "/api/system/controller-registry"],
            "payouts_status": ["/api/payouts/admin/dashboard", "/api/payouts/review-queue"],
            "wallet_status": ["/api/v1/wallet/admin/dashboard", "/api/system/controller-registry"],
            "ai_status": ["/api/system/intelligence/snapshot"],
            "ai_stories_status": ["/api/ai-stories/admin/dashboard"],
            "story_campaigns_status": ["/api/ai-stories/review/queue"],
        }
        if command in endpoint_map:
            return await self._api_summary(f"/{command}", endpoint_map[command], actor_id, "If endpoint_not_available_yet appears, add a backend readiness endpoint instead of faking success.")
        planned = {"dreams_status", "rewards_status", "subscriptions_status", "airdrop_status", "giftcards_status", "ebooks_status", "idcard_status"}
        if command in planned:
            return self._planned(f"/{command}", "planned_or_partial", f"Create backend readiness endpoint for {command.removesuffix('_status')} before Telegram operations.")
        return self._planned(f"/{command}", "endpoint_not_available_yet", "Register a backend endpoint and command handler.")


    def _payment_proof_lines(self, payload: dict[str, Any]) -> list[str]:
        data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
        proof_flags = {
            "verifiedStripeEventReady": data.get("verifiedStripeEventReady") is True,
            "paymentRecordReady": data.get("paymentRecordReady") is True,
            "economicEventVerified": data.get("economicEventVerified") is True,
            "medusaOrderCompletionReady": data.get("medusaOrderCompletionReady") is True,
            "orderSyncReady": data.get("orderSyncReady") is True,
            "duplicateWebhookSafe": data.get("duplicateWebhookSafe") is True,
        }
        settlement_safe = all(proof_flags.values()) and data.get("paymentMarkedPaid") is True
        checkout_safe = "n/a for existing session; open Checkout only from first smoke checkoutSafeToOpen=true and cs_test_* session"
        blockers = data.get("blockers") if isinstance(data.get("blockers"), list) else []
        return [
            f"Checkout safe: {checkout_safe}",
            f"Settlement safe: {'true' if settlement_safe else 'false'}",
            f"Order sync ready: {'true' if proof_flags['orderSyncReady'] else 'false'}",
            "Proof flags: " + ", ".join(f"{key}={str(value).lower()}" for key, value in proof_flags.items()),
            "Blockers: " + (", ".join(str(item) for item in blockers[:8]) if blockers else "none reported"),
        ]

    async def _status_payload(self, actor_id: str) -> dict[str, Any]:
        return {
            "apiHealth": await self.http.get(self.api_base_url, "/api/health", actor_id=actor_id, internal=False),
            "runtime": await self.http.get(self.api_base_url, "/api/system/runtime-status", actor_id=actor_id),
            "deployment": await self.http.get(self.api_base_url, "/api/system/deployment-readiness", actor_id=actor_id),
            "paymentsReadiness": await self.http.get(self.api_base_url, "/api/payments/readiness", actor_id=actor_id, internal=False),
            "economicReadiness": await self.http.get(self.api_base_url, "/api/payments/economic-readiness", actor_id=actor_id, internal=False),
            "fastapiHealth": await self.fastapi.health(actor_id=actor_id),
            "medusaHealth": await self.medusa.health(actor_id=actor_id),
        }

    async def _api_summary(self, title: str, paths: list[str], actor_id: str, next_action: str) -> str:
        sections = []
        for path in paths:
            payload = await self.http.get(self.api_base_url, path, actor_id=actor_id)
            sections.append(summarize_response(path, payload))
        return diagnostic(title, sections, next_action=next_action)

    def _planned(self, title: str, blocker: str, next_endpoint: str) -> str:
        return diagnostic(title, ["⚠️ planned_or_partial", f"Blockers: {blocker}", f"nextBackendEndpointNeeded: {next_endpoint}"], next_action=next_endpoint)

    def _help_text(self) -> str:
        lines = ["dBaronX Telegram Control Surface", "Commands are backend-orchestrated; no secrets or dangerous writes.", ""]
        current_group = None
        for spec in list_commands():
            if spec.group != current_group:
                current_group = spec.group
                lines.append(f"{current_group.upper()}")
            lines.append(f"/{spec.name} - {spec.description}")
        lines.append("\nNext action: Run /status, then a module-specific *_status command.")
        return "\n".join(lines)[:3900]


control_surface_service = ControlSurfaceService()


async def control_surface_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await control_surface_service.handle(update, context)
