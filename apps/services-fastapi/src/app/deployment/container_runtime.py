from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ContainerRuntime:
    detected: bool
    hostname: str
    port: str
    web_concurrency: str
    docker_env_exists: bool
    kubernetes_detected: bool
    render_detected: bool

    def to_dict(self) -> dict:
        return {
            "detected": self.detected,
            "hostname": self.hostname,
            "port": self.port,
            "webConcurrency": self.web_concurrency,
            "dockerEnvExists": self.docker_env_exists,
            "kubernetesDetected": self.kubernetes_detected,
            "renderDetected": self.render_detected,
        }


def detect_container_runtime() -> ContainerRuntime:
    docker_env_exists = Path("/.dockerenv").exists()
    kubernetes_detected = bool(os.getenv("KUBERNETES_SERVICE_HOST"))
    render_detected = bool(os.getenv("RENDER_SERVICE_ID") or os.getenv("RENDER"))

    return ContainerRuntime(
        detected=docker_env_exists or kubernetes_detected or render_detected,
        hostname=os.getenv("HOSTNAME", ""),
        port=os.getenv("PORT", "8080"),
        web_concurrency=os.getenv("WEB_CONCURRENCY", "1"),
        docker_env_exists=docker_env_exists,
        kubernetes_detected=kubernetes_detected,
        render_detected=render_detected,
    )