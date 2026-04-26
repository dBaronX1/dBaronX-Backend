export interface ReleaseReadinessInput {
  frontendClosed: boolean;
  launchClosed: boolean;
  medusaClosed: boolean;
  deploymentReady: boolean;
  startupGatePassed: boolean;
}

export interface ReleaseReadinessScore {
  score: number;
  maxScore: number;
  percentage: number;
  verdict: "blocked" | "nearly_ready" | "ready";
}

export function calculateReleaseReadinessScore(
  input: ReleaseReadinessInput,
): ReleaseReadinessScore {
  const flags = [
    input.frontendClosed,
    input.launchClosed,
    input.medusaClosed,
    input.deploymentReady,
    input.startupGatePassed,
  ];

  const score = flags.filter(Boolean).length;
  const maxScore = flags.length;
  const percentage = Math.round((score / maxScore) * 100);

  let verdict: ReleaseReadinessScore["verdict"] = "blocked";
  if (score === maxScore) {
    verdict = "ready";
  } else if (score >= maxScore - 1) {
    verdict = "nearly_ready";
  }

  return {
    score,
    maxScore,
    percentage,
    verdict,
  };
}
