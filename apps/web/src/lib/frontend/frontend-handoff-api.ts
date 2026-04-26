import { getFastapiHandoffPack, getLaunchClosure, getPlatformAdminPack, getReadinessMatrix } from "@/lib/platform/platform-api";
import { buildFrontendPhaseState, type FrontendPhaseCheck } from "@/lib/frontend/frontend-phase-state";

export async function getFrontendPhaseClosureState() {
  const [launch, matrix, platform, fastapi] = await Promise.all([
    getLaunchClosure(),
    getReadinessMatrix(),
    getPlatformAdminPack(),
    getFastapiHandoffPack(),
  ]);

  const checks: FrontendPhaseCheck[] = [
    {
      key: "launch_closure",
      label: "Launch Closure",
      ready: launch.ready,
      description: "Global launch blocker state from NestJS.",
    },
    {
      key: "platform_shell",
      label: "Platform Shell",
      ready: platform.shell.ready,
      description: "Platform shell readiness exposed through NestJS admin pack.",
    },
    {
      key: "fastapi_handoff",
      label: "FastAPI Handoff",
      ready: fastapi.closed,
      description: "FastAPI handoff must be closed for frontend launch surfaces.",
    },
    {
      key: "wallet_matrix",
      label: "Wallet Matrix",
      ready: matrix.wallet.ready,
      description: "Wallet domain operational readiness.",
    },
    {
      key: "payments_matrix",
      label: "Payments Matrix",
      ready: matrix.payments.ready,
      description: "Payments and settlement operational readiness.",
    },
    {
      key: "commerce_matrix",
      label: "Commerce Matrix",
      ready: matrix.commerce.ready,
      description: "Commerce mirror and reconciliation readiness.",
    },
    {
      key: "ads_matrix",
      label: "Ads Matrix",
      ready: matrix.ads.ready,
      description: "Ads operational readiness for campaign-driven surfaces.",
    },
    {
      key: "ai_stories_matrix",
      label: "AI Stories Matrix",
      ready: matrix.aiStories.ready,
      description: "AI Stories operational readiness for campaign surfaces.",
    },
    {
      key: "payouts_matrix",
      label: "Payouts Matrix",
      ready: matrix.payouts.ready,
      description: "Affiliate payout operational readiness.",
    },
  ];

  return buildFrontendPhaseState(checks);
}
