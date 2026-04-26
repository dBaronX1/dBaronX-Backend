import { Injectable } from "@nestjs/common";

export interface RuntimeServiceState {
  name: string;
  status: "ready" | "degraded" | "unknown";
  compatible: boolean;
  blockers: string[];
  details?: Record<string, unknown>;
  checkedAt: string;
}

@Injectable()
export class ServiceRuntimeRegistryService {
  private readonly states = new Map<string, RuntimeServiceState>();

  set(state: RuntimeServiceState): void {
    this.states.set(state.name, state);
  }

  get(name: string): RuntimeServiceState | null {
    return this.states.get(name) || null;
  }

  getAll(): RuntimeServiceState[] {
    return [...this.states.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  clear(): void {
    this.states.clear();
  }

  summary(): {
    total: number;
    ready: number;
    degraded: number;
    unknown: number;
  } {
    const states = this.getAll();

    return states.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === "ready") acc.ready += 1;
        else if (item.status === "degraded") acc.degraded += 1;
        else acc.unknown += 1;
        return acc;
      },
      { total: 0, ready: 0, degraded: 0, unknown: 0 },
    );
  }
}
