from __future__ import annotations

from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
)

from handlers.admin_actions_handler import (
    admin_action_pack_handler,
    admin_recheck_help_handler,
)
from handlers.admin_handler import admin_callback_handler, admin_home_handler
from handlers.ai_stories_handler import (
    ai_stories_distribution_help_handler,
    ai_stories_ops_handler,
)
from handlers.affiliate_handler import (
    affiliate_ops_handler,
    affiliate_payout_help_handler,
)
from handlers.callback_fallback_handler import callback_fallback_handler
from handlers.command_manifest_handler import command_manifest_handler
from handlers.commerce_admin_handler import commerce_admin_handler
from handlers.control_surface_handler import control_surface_handler
from handlers.commerce_handler import (
    commerce_ops_handler,
    commerce_reconciliation_help_handler,
)
from handlers.fastapi_handler import (
    fastapi_enforcement_sweep_handler,
    fastapi_handoff_pack_handler,
    fastapi_route_family_matrix_handler,
)
from handlers.help_handler import help_handler
from handlers.launch_audit_handler import launch_audit_handler
from handlers.ops_callback_handler import ops_callback_handler
from handlers.ops_handler import ops_home_handler
from handlers.ops_pack_handler import ops_pack_handler
from handlers.payouts_handler import (
    payout_approve_handler,
    payout_queue_handler,
    payout_reject_handler,
    payout_settle_handler,
)
from handlers.payments_handler import (
    payments_ops_handler,
    payments_settlement_help_handler,
)
from handlers.platform_handler import platform_shell_handler
from handlers.review_handler import (
    ads_queue_handler,
    ai_review_queue_handler,
    suppliers_ops_handler,
)
from handlers.start_handler import start_handler
from handlers.status_handler import status_handler
from handlers.system_handler import (
    system_fastapi_handler,
    system_launch_handler,
    system_platform_pack_handler,
    system_readiness_handler,
)
from handlers.telegram_admin_summary_handler import telegram_admin_summary_handler
from handlers.telegram_handoff_pack_handler import telegram_handoff_pack_handler
from handlers.telegram_surface_closure_handler import telegram_surface_closure_handler
from handlers.wallet_handler import (
    wallet_hold_help_handler,
    wallet_ops_handler,
)
from handlers.watch_handler import (
    watch_ops_handler,
    watch_reward_help_handler,
)


def register_handlers(application: Application) -> None:

    control_commands = [
        "start", "help", "commands", "status", "health", "runtime", "launch", "routes", "env_check",
        "commerce_status", "medusa_status", "shipping_status", "catalog_status", "orders_status",
        "payments_status", "stripe_status", "stripe_first_tx_status", "stripe_storage", "stripe_settlement", "dbx_status", "dbx_payment", "economic_status",
        "suppliers_status", "cj_status", "cj_import_ready", "aliexpress_status",
        "ads_status", "watch_status", "affiliate_status", "payouts_status", "wallet_status",
        "ai_status", "ai_stories_status", "story_campaigns_status",
        "dreams_status", "rewards_status", "subscriptions_status", "airdrop_status", "giftcards_status", "ebooks_status", "idcard_status",
        "debug_status",
    ]
    for command in control_commands:
        application.add_handler(CommandHandler(command, control_surface_handler))

    application.add_handler(CommandHandler("start", start_handler))
    application.add_handler(CommandHandler("help", help_handler))
    application.add_handler(CommandHandler("commands", command_manifest_handler))

    application.add_handler(CommandHandler("admin", admin_home_handler))
    application.add_handler(CommandHandler("ops", ops_home_handler))
    application.add_handler(CommandHandler("status", status_handler))
    application.add_handler(CommandHandler("health", status_handler))
    application.add_handler(CommandHandler("api", system_launch_handler))
    application.add_handler(CommandHandler("medusa", commerce_ops_handler))
    application.add_handler(CommandHandler("web", platform_shell_handler))
    application.add_handler(CommandHandler("orders", commerce_admin_handler))
    application.add_handler(CommandHandler("payouts", payout_queue_handler))
    application.add_handler(CommandHandler("ads", ads_queue_handler))
    application.add_handler(CommandHandler("suppliers", suppliers_ops_handler))
    application.add_handler(CommandHandler("payments", payments_ops_handler))
    application.add_handler(CommandHandler("checkout", payments_ops_handler))
    application.add_handler(CommandHandler("ops_pack", ops_pack_handler))
    application.add_handler(CommandHandler("admin_summary", telegram_admin_summary_handler))
    application.add_handler(CommandHandler("launch_audit", launch_audit_handler))
    application.add_handler(CommandHandler("platform_shell", platform_shell_handler))
    application.add_handler(CommandHandler("telegram_closure", telegram_surface_closure_handler))
    application.add_handler(CommandHandler("telegram_handoff", telegram_handoff_pack_handler))

    application.add_handler(CommandHandler("launch", system_launch_handler))
    application.add_handler(CommandHandler("readiness", system_readiness_handler))
    application.add_handler(CommandHandler("fastapi", system_fastapi_handler))
    application.add_handler(CommandHandler("fastapi_handoff_pack", fastapi_handoff_pack_handler))
    application.add_handler(CommandHandler("fastapi_route_matrix", fastapi_route_family_matrix_handler))
    application.add_handler(CommandHandler("fastapi_enforcement", fastapi_enforcement_sweep_handler))
    application.add_handler(CommandHandler("platform_pack", system_platform_pack_handler))
    application.add_handler(CommandHandler("admin_action_pack", admin_action_pack_handler))
    application.add_handler(CommandHandler("admin_recheck_help", admin_recheck_help_handler))

    application.add_handler(CommandHandler("wallet_ops", wallet_ops_handler))
    application.add_handler(CommandHandler("wallet_hold_help", wallet_hold_help_handler))

    application.add_handler(CommandHandler("payments_ops", payments_ops_handler))
    application.add_handler(
        CommandHandler("payments_settlement_help", payments_settlement_help_handler)
    )

    application.add_handler(CommandHandler("payout_queue", payout_queue_handler))
    application.add_handler(CommandHandler("payout_approve", payout_approve_handler))
    application.add_handler(CommandHandler("payout_reject", payout_reject_handler))
    application.add_handler(CommandHandler("payout_settle", payout_settle_handler))

    application.add_handler(CommandHandler("ads_queue", ads_queue_handler))
    application.add_handler(CommandHandler("ai_queue", ai_review_queue_handler))
    application.add_handler(CommandHandler("suppliers_ops", suppliers_ops_handler))

    application.add_handler(CommandHandler("watch_ops", watch_ops_handler))
    application.add_handler(CommandHandler("watch_reward_help", watch_reward_help_handler))

    application.add_handler(CommandHandler("affiliate_ops", affiliate_ops_handler))
    application.add_handler(
        CommandHandler("affiliate_payout_help", affiliate_payout_help_handler)
    )

    application.add_handler(CommandHandler("ai_stories_ops", ai_stories_ops_handler))
    application.add_handler(
        CommandHandler(
            "ai_stories_distribution_help",
            ai_stories_distribution_help_handler,
        )
    )

    application.add_handler(CommandHandler("commerce_ops", commerce_ops_handler))
    application.add_handler(CommandHandler("commerce_admin", commerce_admin_handler))
    application.add_handler(
        CommandHandler(
            "commerce_reconciliation_help",
            commerce_reconciliation_help_handler,
        )
    )

    application.add_handler(
        CallbackQueryHandler(admin_callback_handler, pattern=r"^admin:")
    )
    application.add_handler(
        CallbackQueryHandler(ops_callback_handler, pattern=r"^ops:")
    )
    application.add_handler(CallbackQueryHandler(callback_fallback_handler))
