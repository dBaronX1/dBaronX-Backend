from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from core.roles import Role

CommandSafety = Literal["safe", "protected_read", "blocked_write", "debug"]


@dataclass(frozen=True)
class CommandSpec:
    name: str
    description: str
    required_role: Role
    target_service: str
    safety: CommandSafety
    group: str
    raw_json: bool = False


_COMMANDS: tuple[CommandSpec, ...] = (
    CommandSpec("start", "Open the control surface", Role.VIEWER, "bot", "safe", "system"),
    CommandSpec("help", "List all registered commands", Role.VIEWER, "bot", "safe", "system"),
    CommandSpec("commands", "Show command registry", Role.VIEWER, "bot", "safe", "system"),
    CommandSpec("status", "Unified ecosystem status", Role.VIEWER, "api/fastapi/medusa", "protected_read", "system"),
    CommandSpec("health", "Bot/API/FastAPI/Medusa health", Role.VIEWER, "api/fastapi/medusa", "protected_read", "system"),
    CommandSpec("runtime", "Runtime contract/status", Role.OPS, "api", "protected_read", "system"),
    CommandSpec("launch", "Deployment readiness", Role.OPS, "api", "protected_read", "system"),
    CommandSpec("routes", "Controller registry/routes readiness", Role.OPS, "api", "protected_read", "system"),
    CommandSpec("env_check", "Sanitized env contract check", Role.OPS, "bot", "protected_read", "system"),
    CommandSpec("commerce_status", "Commerce readiness summary", Role.OPS, "api/medusa", "protected_read", "commerce"),
    CommandSpec("medusa_status", "Medusa health", Role.OPS, "medusa", "protected_read", "commerce"),
    CommandSpec("shipping_status", "Shipping/cart readiness", Role.OPS, "api/medusa", "protected_read", "commerce"),
    CommandSpec("catalog_status", "Stock/price/supplier metadata readiness", Role.OPS, "api/medusa", "protected_read", "commerce"),
    CommandSpec("orders_status", "Order sync/admin readiness", Role.OPS, "api", "protected_read", "commerce"),
    CommandSpec("payments_status", "Payment readiness", Role.OPS, "api", "protected_read", "payments"),
    CommandSpec("stripe_status", "Stripe checkout readiness", Role.OPS, "api", "protected_read", "payments"),
    CommandSpec("stripe_storage", "Stripe settlement storage readiness", Role.ADMIN, "api", "protected_read", "payments"),
    CommandSpec("stripe_settlement", "Stripe settlement proof by checkout session", Role.ADMIN, "api", "protected_read", "payments"),
    CommandSpec("dbx_status", "DBX payment readiness", Role.OPS, "api", "protected_read", "payments"),
    CommandSpec("dbx_payment", "DBX payment proof by reference", Role.ADMIN, "api", "protected_read", "payments"),
    CommandSpec("economic_status", "Economic event readiness", Role.OPS, "api", "protected_read", "payments"),
    CommandSpec("suppliers_status", "Supplier readiness", Role.OPS, "api", "protected_read", "suppliers"),
    CommandSpec("cj_status", "CJ preflight", Role.OPS, "api", "protected_read", "suppliers"),
    CommandSpec("cj_import_ready", "CJ import readiness for explicit product+SKU", Role.ADMIN, "api", "protected_read", "suppliers"),
    CommandSpec("aliexpress_status", "AliExpress module status", Role.OPS, "api", "protected_read", "suppliers"),
    CommandSpec("ads_status", "Ads readiness/status", Role.OPS, "api", "protected_read", "engagement"),
    CommandSpec("watch_status", "Watch readiness/status", Role.OPS, "api", "protected_read", "engagement"),
    CommandSpec("affiliate_status", "Affiliate readiness/status", Role.OPS, "api", "protected_read", "engagement"),
    CommandSpec("payouts_status", "Payout readiness/status (read-only)", Role.ADMIN, "api", "protected_read", "engagement"),
    CommandSpec("wallet_status", "Wallet readiness/status", Role.ADMIN, "api", "protected_read", "engagement"),
    CommandSpec("ai_status", "AI provider/system readiness", Role.OPS, "api/fastapi", "protected_read", "ai"),
    CommandSpec("ai_stories_status", "AI Stories readiness/status", Role.OPS, "api", "protected_read", "ai"),
    CommandSpec("story_campaigns_status", "Story campaigns readiness/status", Role.OPS, "api", "protected_read", "ai"),
    CommandSpec("dreams_status", "Dreams module status", Role.OPS, "api", "protected_read", "planned"),
    CommandSpec("rewards_status", "Rewards module status", Role.OPS, "api", "protected_read", "planned"),
    CommandSpec("subscriptions_status", "Subscriptions module status", Role.OPS, "api", "protected_read", "planned"),
    CommandSpec("airdrop_status", "Airdrop module status", Role.OPS, "api", "protected_read", "planned"),
    CommandSpec("giftcards_status", "Gift cards module status", Role.OPS, "api", "protected_read", "planned"),
    CommandSpec("ebooks_status", "Ebooks module status", Role.OPS, "api", "protected_read", "planned"),
    CommandSpec("idcard_status", "ID card module status", Role.OPS, "api", "protected_read", "planned"),
    CommandSpec("debug_status", "Raw normalized status JSON", Role.ADMIN, "api/fastapi/medusa", "debug", "debug", True),
)

COMMAND_REGISTRY: dict[str, CommandSpec] = {spec.name: spec for spec in _COMMANDS}
REQUIRED_COMMANDS: tuple[str, ...] = tuple(spec.name for spec in _COMMANDS)


def list_commands() -> list[CommandSpec]:
    return list(_COMMANDS)


def get_command(name: str) -> CommandSpec | None:
    return COMMAND_REGISTRY.get(name.removeprefix("/"))
