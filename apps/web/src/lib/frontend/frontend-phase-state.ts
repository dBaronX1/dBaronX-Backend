export interface FrontendPhaseCheck {
  key: string;
  label: string;
  ready: boolean;
  description: string;
}

export interface FrontendPhaseState {
  closed: boolean;
  checks: FrontendPhaseCheck[];
  blockers: string[];
}

export function buildFrontendPhaseState(
  checks: FrontendPhaseCheck[],
): FrontendPhaseState {
  const blockers = checks.filter((item) => !item.ready).map((item) => item.key);

  return {
    closed: blockers.length === 0,
    checks,
    blockers,
  };
}
