from __future__ import annotations

from typing import Any

from telegram import Update
from telegram.ext import ContextTypes

from services.nestjs_client import NestJsClient
from core.settings import get_settings
from shared.context.actor_context import build_actor_context
from shared.security.admin_guard import require_admin

SAFE_ADMIN_ERROR = "CJ import command failed. Check API deployment, internal token, and migration status."


async def _reply(update: Update, text: str) -> None:
    if update.effective_message:
        await update.effective_message.reply_text(text)


def _extract_rows(payload: dict[str, Any]) -> list[dict[str, Any]]:
    data = payload.get("data")
    if isinstance(data, list):
        return [row for row in data if isinstance(row, dict)]
    if isinstance(data, dict):
        rows = data.get("items") or data.get("rows")
        if isinstance(rows, list):
            return [row for row in rows if isinstance(row, dict)]
    return []


def _collect_blockers(*payloads: dict[str, Any]) -> list[str]:
    blockers: list[str] = []
    for payload in payloads:
        status = int(payload.get("statusCode") or 0)
        message = str(payload.get("message") or "").lower()
        raw_blockers = payload.get("blockers")
        if isinstance(raw_blockers, list):
            for blocker in raw_blockers:
                b = str(blocker).strip().lower()
                if b and b not in blockers:
                    blockers.append(b)
        if status == 401 or status == 403:
            blockers.append("unauthorized_internal_token")
        elif status == 404:
            blockers.append("endpoint_not_found")
        elif status == 0:
            blockers.append("api_unreachable")
        if "migration" in message:
            blockers.append("migration_missing")
        if "cj_access_token" in message or "cj_api_key" in message or "cj credentials" in message:
            blockers.append("cj_credentials_missing")
    uniq: list[str] = []
    for b in blockers:
        if b not in uniq:
            uniq.append(b)
    return uniq


def _safe_status_summary(runs_payload: dict[str, Any], items_payload: dict[str, Any]) -> str:
    runs = _extract_rows(runs_payload)
    items = _extract_rows(items_payload)
    latest_run = runs[0].get("id") if runs else "none"

    pending = [i for i in items if i.get("approval_status") == "pending_admin_approval"]
    approved = [i for i in items if i.get("approval_status") == "approved"]
    rejected = [i for i in items if i.get("approval_status") == "rejected"]
    published = [i for i in items if i.get("publish_status") == "published"]
    approved_not_published = [i for i in approved if i.get("publish_status") != "published"]

    lines = [
        "CJ Import Status",
        f"Latest run: {latest_run}",
        f"Pending approval: {len(pending)}",
        f"Approved not published: {len(approved_not_published)}",
        f"Published: {len(published)}",
        f"Rejected: {len(rejected)}",
        "",
    ]

    if not pending:
        lines.append("No CJ import items found yet. Run /cj_import_preview fashion 20 first, then /cj_import_run fashion 20.")
        return "\n".join(lines)

    lines.append("Pending items:")
    for item in pending[:5]:
        lines.append(
            f"{item.get('id', 'unknown')} — {item.get('title', 'untitled')} — {item.get('category', 'unknown')} — blockers: {', '.join(item.get('blockers', [])) if isinstance(item.get('blockers'), list) and item.get('blockers') else 'none'}"
        )
    return "\n".join(lines)


async def _handle_admin_failure(
    update: Update,
    *payloads: dict[str, Any],
    api_host: str | None = None,
    endpoint_path: str | None = None,
    api_base_had_api_suffix: bool | None = None,
) -> None:
    blockers = _collect_blockers(*payloads)
    if not blockers:
        blockers = ["invalid_response"]
    http_status = next((int(payload.get("statusCode") or 0) for payload in payloads if int(payload.get("statusCode") or 0) > 0), 0)
    next_action = "Check API deployment, internal token, and migration status."
    if "endpoint_not_found" in blockers:
        next_action = "Check Telegram API_BASE_URL host points to dbaronx-api-unified service root."
    lines = [SAFE_ADMIN_ERROR, f"blockers: {', '.join(blockers[:6])}"]
    if api_host:
        lines.append(f"apiHost: {api_host}")
    if endpoint_path:
        lines.append(f"endpointPath: {endpoint_path}")
    if api_base_had_api_suffix is not None:
        lines.append(f"apiBaseHadApiSuffix: {'true' if api_base_had_api_suffix else 'false'}")
    if http_status:
        lines.append(f"httpStatus: {http_status}")
    lines.append(f"next action: {next_action}")
    await _reply(update, "\n".join(lines))


async def cj_import_preview_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await require_admin(update, context):
        return
    actor = build_actor_context(update)
    args = context.args or []
    category = args[0] if args else "all"
    limit = int(args[1]) if len(args) > 1 and str(args[1]).isdigit() else 10
    client = NestJsClient()
    payload = await client.cj_import_preview(category=category, limit=limit, actor_id=actor.telegram_user_id)
    if not payload.get("success"):
        return await _handle_admin_failure(update, payload, api_host=client.api_host, endpoint_path=client.cj_products_endpoint_path("/import-preview"), api_base_had_api_suffix=client.api_base_had_api_suffix)
    items = _extract_rows(payload)
    await _reply(update, f"preview: items={len(items)} category={category} limit={limit}")


async def cj_import_run_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await require_admin(update, context):
        return
    actor = build_actor_context(update)
    args = context.args or []
    category = args[0] if args else "all"
    limit = int(args[1]) if len(args) > 1 and str(args[1]).isdigit() else 10
    client = NestJsClient()
    payload = await client.cj_import_run(category=category, limit=limit, actor_id=actor.telegram_user_id)
    if not payload.get("success"):
        return await _handle_admin_failure(update, payload, api_host=client.api_host, endpoint_path=client.cj_products_endpoint_path("/import-run"), api_base_had_api_suffix=client.api_base_had_api_suffix)
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    await _reply(update, f"run: imported={data.get('imported', 0)} accepted={data.get('accepted', 0)} rejected={data.get('rejected', 0)}")


async def cj_import_status_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await require_admin(update, context):
        return
    actor = build_actor_context(update)
    client = NestJsClient()
    runs = await client.cj_import_runs(actor_id=actor.telegram_user_id)
    items = await client.cj_import_items(actor_id=actor.telegram_user_id)
    if not runs.get("success") or not items.get("success"):
        return await _handle_admin_failure(update, runs, items, api_host=client.api_host, endpoint_path=client.cj_products_endpoint_path("/import-runs"), api_base_had_api_suffix=client.api_base_had_api_suffix)
    await _reply(update, _safe_status_summary(runs, items))


async def api_probe_cj_import_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await require_admin(update, context):
        return
    actor = build_actor_context(update)
    client = NestJsClient()
    auth_endpoint_path = client.cj_products_endpoint_path("/auth-diagnostics")
    fallback_endpoint_path = client.cj_products_endpoint_path("/import-runs")
    endpoint_path = auth_endpoint_path
    payload = await client.cj_auth_diagnostics(actor_id=actor.telegram_user_id)
    if int(payload.get("statusCode") or 0) == 404:
        endpoint_path = fallback_endpoint_path
        payload = await client.cj_import_runs(actor_id=actor.telegram_user_id)
    blockers = [] if payload.get("success") else _collect_blockers(payload)
    if not blockers:
        blockers = ["none"]
    http_status = int(payload.get("statusCode") or 200)
    blocker = "route_auth_ok" if payload.get("success") else blockers[0]
    meta = client.internal_auth_metadata()
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    diagnostics = data.get("diagnostics") if isinstance(data.get("diagnostics"), dict) else {}
    api_diag_present = bool(diagnostics)
    api_expected_configured = diagnostics.get("expectedTokenConfigured") if api_diag_present else None
    api_expected_source = str(diagnostics.get("expectedTokenSource") or "none") if api_diag_present else "none"
    api_configured_aliases = diagnostics.get("configuredAliases") if api_diag_present and isinstance(diagnostics.get("configuredAliases"), list) else []
    api_alias_conflict_possible = diagnostics.get("aliasConflictPossible") if api_diag_present else None
    api_received_internal = diagnostics.get("receivedInternalHeader") if api_diag_present else None
    api_received_dbx = diagnostics.get("receivedDbxInternalHeader") if api_diag_present else None
    api_received_bearer = diagnostics.get("receivedBearerHeader") if api_diag_present else None
    api_received_any = diagnostics.get("receivedAnyAcceptedHeader") if api_diag_present else None
    api_normalized_non_empty = diagnostics.get("normalizedHeaderNonEmpty") if api_diag_present else None
    api_token_matched = diagnostics.get("tokenMatched") if api_diag_present else None

    api_guard_diagnostics_missing = not api_diag_present and int(payload.get("statusCode") or 0) == 401
    if api_expected_configured is False:
        blocker = "token_not_configured_on_api"
        next_action = "Set INTERNAL_SERVICE_TOKEN on API service and redeploy."
    elif not bool(meta.get("internalTokenConfigured")):
        blocker = "token_not_configured_on_telegram"
        next_action = "Set INTERNAL_SERVICE_TOKEN on Telegram bot service and redeploy."
    elif api_diag_present and str(meta.get("internalTokenSource")) != api_expected_source and api_expected_source != "none":
        blocker = "token_source_mismatch"
        next_action = "Use INTERNAL_SERVICE_TOKEN only on API and Telegram. Remove conflicting aliases or make all aliases identical. Redeploy API then Telegram."
    elif api_diag_present and api_received_any is False:
        blocker = "token_header_not_sent"
        next_action = "Telegram did not reach API with an accepted auth header. Inspect Telegram HTTP client."
    elif api_diag_present and bool(api_received_any) and api_token_matched is False:
        blocker = "token_header_received_but_mismatch"
        next_action = "API received auth header but token did not match selected API token source. Set one exact INTERNAL_SERVICE_TOKEN on both services and redeploy API then Telegram."
    elif int(payload.get("statusCode") or 0) == 404:
        blocker = "auth_diagnostics_route_missing"
        next_action = "auth-diagnostics route missing; fell back to import-runs endpoint."
    elif api_guard_diagnostics_missing:
        blocker = "auth_guard_diagnostics_missing"
        next_action = "API guard diagnostics are not deployed or response body was not parsed."
    else:
        next_action = "None" if blocker == "route_auth_ok" else "Check internal token aliases and API guard diagnostics."

    lines = [
        "CJ Import API Probe",
        f"apiHost: {client.api_host}",
        f"endpointPath: {endpoint_path}",
        f"httpStatus: {http_status}",
        f"blocker: {blocker}",
        f"internalTokenConfigured: {'true' if bool(meta.get('internalTokenConfigured')) else 'false'}",
        f"internalTokenSource: {meta.get('internalTokenSource')}",
        f"configuredAliases: {', '.join(meta.get('configuredAliases', [])) if isinstance(meta.get('configuredAliases'), list) and meta.get('configuredAliases') else 'none'}",
        f"aliasConflictPossible: {'true' if bool(meta.get('aliasConflictPossible')) else 'false'}",
        f"xInternalTokenHeaderPrepared: {'true' if bool(meta.get('xInternalTokenHeaderPrepared')) else 'false'}",
        f"bearerHeaderPrepared: {'true' if bool(meta.get('bearerHeaderPrepared')) else 'false'}",
        f"apiBaseHadApiSuffix: {'true' if client.api_base_had_api_suffix else 'false'}",
        f"apiExpectedTokenConfigured: {api_expected_configured if api_diag_present else 'unknown'}",
        f"apiExpectedTokenSource: {api_expected_source if api_diag_present else 'unknown'}",
        f"apiConfiguredAliases: {', '.join(api_configured_aliases) if api_configured_aliases else 'none'}",
        f"apiAliasConflictPossible: {api_alias_conflict_possible if api_diag_present else 'unknown'}",
        f"apiReceivedInternalHeader: {api_received_internal if api_diag_present else 'unknown'}",
        f"apiReceivedDbxInternalHeader: {api_received_dbx if api_diag_present else 'unknown'}",
        f"apiReceivedBearerHeader: {api_received_bearer if api_diag_present else 'unknown'}",
        f"apiReceivedAnyAcceptedHeader: {api_received_any if api_diag_present else 'unknown'}",
        f"apiNormalizedHeaderNonEmpty: {api_normalized_non_empty if api_diag_present else 'unknown'}",
        f"apiTokenMatched: {api_token_matched if api_diag_present else 'unknown'}",
        f"apiGuardDiagnosticsMissing: {'true' if api_guard_diagnostics_missing else 'false'}",
        f"nextAction: {next_action}",
    ]
    await _reply(update, "\n".join(lines))


async def cj_import_approve_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await require_admin(update, context):
        return
    if not context.args:
        return await _reply(update, "usage: /cj_import_approve <item_id>")
    actor = build_actor_context(update)
    client = NestJsClient()
    payload = await client.cj_import_approve(item_id=context.args[0], actor_id=actor.telegram_user_id)
    if not payload.get("success"):
        return await _handle_admin_failure(update, payload, api_host=client.api_host, endpoint_path=client.cj_products_endpoint_path(f"/import-items/{context.args[0]}/approve"), api_base_had_api_suffix=client.api_base_had_api_suffix)
    await _reply(update, f"approved: {context.args[0]}")


async def cj_import_reject_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await require_admin(update, context):
        return
    if not context.args:
        return await _reply(update, "usage: /cj_import_reject <item_id>")
    actor = build_actor_context(update)
    client = NestJsClient()
    payload = await client.cj_import_reject(item_id=context.args[0], actor_id=actor.telegram_user_id)
    if not payload.get("success"):
        return await _handle_admin_failure(update, payload, api_host=client.api_host, endpoint_path=client.cj_products_endpoint_path(f"/import-items/{context.args[0]}/reject"), api_base_had_api_suffix=client.api_base_had_api_suffix)
    await _reply(update, f"rejected: {context.args[0]}")


async def cj_publish_approved_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await require_admin(update, context):
        return
    actor = build_actor_context(update)
    client = NestJsClient()
    payload = await client.cj_publish_approved(actor_id=actor.telegram_user_id)
    if not payload.get("success"):
        return await _handle_admin_failure(update, payload, api_host=client.api_host, endpoint_path=client.cj_products_endpoint_path("/publish-approved"), api_base_had_api_suffix=client.api_base_had_api_suffix)
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    await _reply(update, f"published={data.get('published', 0)}")


async def cj_import_readiness_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not await require_admin(update, context):
        return
    actor = build_actor_context(update)
    client = NestJsClient()
    payload = await client.cj_import_readiness(actor_id=actor.telegram_user_id)
    if not payload.get("success"):
        if int(payload.get("statusCode") or 0) == 401:
            return await api_probe_cj_import_handler(update, context)
        return await _handle_admin_failure(update, payload, api_host=client.api_host, endpoint_path=client.cj_products_endpoint_path("/readiness"), api_base_had_api_suffix=client.api_base_had_api_suffix)
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    checks = data.get("checks") if isinstance(data.get("checks"), dict) else {}
    blockers = data.get("blockers") if isinstance(data.get("blockers"), list) else []
    await _reply(update, "\n".join([
        "CJ Import Readiness",
        f"migrationReady: {checks.get('migrationReady')}",
        f"cjCredentialsConfigured: {checks.get('cjCredentialsConfigured')}",
        f"storefrontPublishTargetReady: {checks.get('storefrontPublishTargetReady')}",
        f"blockers: {', '.join(blockers) if blockers else 'none'}",
        f"nextAction: {data.get('nextAction', 'none')}"
    ]))
