from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class RenderRuntime:
    service_id: str | None
    service_name: str | None
    instance_id: str | None
    git_commit: str | None
    external_hostname: str | None
    detected: bool

    def to_dict(self) -> dict:
        return {
            "detected": self.detected,
            "serviceId": self.service_id,
            "serviceName": self.service_name,
            "instanceId": self.instance_id,
            "gitCommit": self.git_commit,
            "externalHostname": self.external_hostname,
        }


def detect_render_runtime() -> RenderRuntime:
    service_id = os.getenv("RENDER_SERVICE_ID")
    service_name = os.getenv("RENDER_SERVICE_NAME")
    instance_id = os.getenv("RENDER_INSTANCE_ID")
    git_commit = os.getenv("RENDER_GIT_COMMIT")
    external_hostname = os.getenv("RENDER_EXTERNAL_HOSTNAME")

    return RenderRuntime(
        service_id=service_id,
        service_name=service_name,
        instance_id=instance_id,
        git_commit=git_commit,
        external_hostname=external_hostname,
        detected=bool(service_id or service_name or instance_id or external_hostname),
    )