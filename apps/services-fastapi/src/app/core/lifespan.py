from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.logging import get_logger
from app.core.runtime_state import RuntimeState
from app.jobs.watch_validation_jobs import WatchValidationJobCoordinator
from app.services.lifecycle import AppLifecycleService
from app.services.nestjs_client import NestJSClient
from app.services.redis_service import RedisService
from app.services.supabase_service import SupabaseService
from app.workers.heartbeat_cleanup_worker import HeartbeatCleanupWorker
from app.workers.risk_event_flush_worker import RiskEventFlushWorker

logger = get_logger("app.lifespan")


@asynccontextmanager
async def create_lifespan(app: FastAPI):
    redis = RedisService()
    supabase = SupabaseService()
    nestjs = NestJSClient()
    lifecycle = AppLifecycleService(redis=redis)

    runtime_state = RuntimeState()
    app.state.runtime = runtime_state
    app.state.redis = redis
    app.state.supabase = supabase
    app.state.nestjs = nestjs

    heartbeat_cleanup_worker = HeartbeatCleanupWorker(redis=redis, supabase=supabase)
    risk_event_flush_worker = RiskEventFlushWorker(redis=redis, supabase=supabase)
    watch_jobs = WatchValidationJobCoordinator(
      redis=redis,
      supabase=supabase,
      nestjs=nestjs,
    )

    app.state.heartbeat_cleanup_worker = heartbeat_cleanup_worker
    app.state.risk_event_flush_worker = risk_event_flush_worker
    app.state.watch_jobs = watch_jobs

    try:
        await lifecycle.startup()

        runtime_state.redis_connected = await redis.ping()
        runtime_state.supabase_reachable = (await supabase.health()).ok
        runtime_state.nestjs_reachable = bool((await nestjs.health()).get("ok"))
        runtime_state.mark_started(
            service="services-fastapi",
            phase="startup_complete",
        )

        await heartbeat_cleanup_worker.start()
        await risk_event_flush_worker.start()
        await watch_jobs.start()

        runtime_state.background_workers_started = True

        logger.info(
            "FastAPI lifespan startup completed",
            extra={
                "redis_connected": runtime_state.redis_connected,
                "supabase_reachable": runtime_state.supabase_reachable,
                "nestjs_reachable": runtime_state.nestjs_reachable,
                "background_workers_started": runtime_state.background_workers_started,
            },
        )

        yield
    finally:
        logger.info("FastAPI lifespan shutdown started")

        await watch_jobs.stop()
        await heartbeat_cleanup_worker.stop()
        await risk_event_flush_worker.stop()
        await lifecycle.shutdown()
        await nestjs.close()

        runtime_state.background_workers_started = False

        logger.info("FastAPI lifespan shutdown completed")
