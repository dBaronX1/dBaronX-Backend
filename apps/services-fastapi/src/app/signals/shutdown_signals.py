from __future__ import annotations

import asyncio
import logging
import signal
from collections.abc import Callable
from typing import Awaitable

logger = logging.getLogger("dbaronx.fastapi.signals")

ShutdownCallback = Callable[[], Awaitable[None] | None]


class ShutdownSignalRegistry:
    def __init__(self) -> None:
        self._callbacks: list[ShutdownCallback] = []
        self._installed = False

    def add(self, callback: ShutdownCallback) -> None:
        self._callbacks.append(callback)

    def install(self) -> None:
        if self._installed:
            return

        loop = asyncio.get_event_loop()

        for sig in (signal.SIGTERM, signal.SIGINT):
            try:
                loop.add_signal_handler(sig, lambda s=sig: asyncio.create_task(self._handle(s)))
            except NotImplementedError:
                signal.signal(sig, lambda *_args, s=sig: asyncio.create_task(self._handle(s)))

        self._installed = True

    async def _handle(self, sig: signal.Signals) -> None:
        logger.info("Received shutdown signal: %s", sig.name)

        for callback in list(self._callbacks):
            try:
                result = callback()
                if result is not None:
                    await result
            except Exception as exc:
                logger.exception("Shutdown callback failed: %s", exc)


shutdown_signals = ShutdownSignalRegistry()