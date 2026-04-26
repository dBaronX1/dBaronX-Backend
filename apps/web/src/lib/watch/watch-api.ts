import { getFastapiHandoffPack, getLaunchClosure } from "@/lib/platform/platform-api";

export interface WatchSurfaceState {
  launchReady: boolean;
  launchBlockers: string[];
  fastapiClosed: boolean;
  fastapiEnforcementClosed: boolean;
  recommendedConsumers: string[];
}

export async function getWatchSurfaceState(): Promise<WatchSurfaceState> {
  const [launch, fastapi] = await Promise.all([
    getLaunchClosure(),
    getFastapiHandoffPack(),
  ]);

  return {
    launchReady: launch.ready,
    launchBlockers: launch.blockers,
    fastapiClosed: fastapi.closed,
    fastapiEnforcementClosed: fastapi.enforcement.closed,
    recommendedConsumers: fastapi.recommended_consumers,
  };
}
