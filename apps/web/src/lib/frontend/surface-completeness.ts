export interface SurfaceCompletenessGroup {
  title: string;
  complete: number;
  total: number;
}

export function calculateSurfaceCompleteness(
  groups: SurfaceCompletenessGroup[],
) {
  const totalComplete = groups.reduce((acc, item) => acc + item.complete, 0);
  const total = groups.reduce((acc, item) => acc + item.total, 0);

  return {
    groups,
    totalComplete,
    total,
    percentage: total > 0 ? Math.round((totalComplete / total) * 100) : 0,
  };
}
