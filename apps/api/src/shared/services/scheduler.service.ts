import { Injectable, OnModuleDestroy } from "@nestjs/common";

type JobRecord = {
  id: string;
  type: "interval" | "timeout";
  handle: NodeJS.Timeout;
  createdAt: number;
  intervalMs?: number;
};

@Injectable()
export class SchedulerService implements OnModuleDestroy {
  private readonly jobs = new Map<string, JobRecord>();

  every(id: string, intervalMs: number, fn: () => void | Promise<void>): void {
    this.cancel(id);

    const handle = setInterval(async () => {
      try {
        await fn();
      } catch (error) {
        console.error(
          JSON.stringify({
            level: "error",
            message: "Scheduled interval job failed",
            jobId: id,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          }),
        );
      }
    }, intervalMs);

    this.jobs.set(id, {
      id,
      type: "interval",
      handle,
      createdAt: Date.now(),
      intervalMs,
    });
  }

  once(id: string, delayMs: number, fn: () => void | Promise<void>): void {
    this.cancel(id);

    const handle = setTimeout(async () => {
      try {
        await fn();
      } catch (error) {
        console.error(
          JSON.stringify({
            level: "error",
            message: "Scheduled one-time job failed",
            jobId: id,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          }),
        );
      } finally {
        this.jobs.delete(id);
      }
    }, delayMs);

    this.jobs.set(id, {
      id,
      type: "timeout",
      handle,
      createdAt: Date.now(),
    });
  }

  cancel(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;

    clearInterval(job.handle);
    clearTimeout(job.handle);
    this.jobs.delete(id);
    return true;
  }

  has(id: string): boolean {
    return this.jobs.has(id);
  }

  list() {
    return Array.from(this.jobs.values()).map((job) => ({
      id: job.id,
      type: job.type,
      createdAt: new Date(job.createdAt).toISOString(),
      intervalMs: job.intervalMs || null,
    }));
  }

  onModuleDestroy(): void {
    for (const id of this.jobs.keys()) {
      this.cancel(id);
    }
  }
}
