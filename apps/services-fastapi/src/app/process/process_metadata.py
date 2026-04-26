from __future__ import annotations

import os
import platform
import sys
import time
from dataclasses import dataclass, asdict


_BOOT_TIME = time.time()


@dataclass(frozen=True)
class ProcessMetadata:
    pid: int
    ppid: int
    python_version: str
    platform: str
    executable: str
    cwd: str
    uptime_seconds: float
    service_name: str
    app_version: str
    environment: str

    def to_dict(self) -> dict:
        return asdict(self)


def process_metadata() -> ProcessMetadata:
    return ProcessMetadata(
        pid=os.getpid(),
        ppid=os.getppid(),
        python_version=platform.python_version(),
        platform=platform.platform(),
        executable=sys.executable,
        cwd=os.getcwd(),
        uptime_seconds=round(time.time() - _BOOT_TIME, 2),
        service_name=os.getenv("SERVICE_NAME", "dbaronx-fastapi"),
        app_version=os.getenv("APP_VERSION", "1.0.0"),
        environment=(
            os.getenv("APP_ENV")
            or os.getenv("ENVIRONMENT")
            or os.getenv("NODE_ENV")
            or "development"
        ),
    )