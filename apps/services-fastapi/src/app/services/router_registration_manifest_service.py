from __future__ import annotations

import ast
from pathlib import Path
from typing import Any


class RouterRegistrationManifestService:
    """Static manifest reader for the canonical router registration table."""

    def build(self) -> dict[str, Any]:
        registry_path = Path(__file__).resolve().parents[1] / "api" / "router_registry.py"
        tree = ast.parse(registry_path.read_text())
        routers: list[dict[str, Any]] = []

        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            if not isinstance(node.func, ast.Name) or node.func.id != "RouterRegistration":
                continue
            if len(node.args) < 5:
                continue
            values: list[Any] = []
            for arg in node.args[:5]:
                if isinstance(arg, ast.Constant):
                    values.append(arg.value)
                elif isinstance(arg, ast.Name):
                    values.append(arg.id)
                else:
                    values.append(None)
            routers.append(
                {
                    "name": str(values[0] or ""),
                    "prefix": str(values[1] or ""),
                    "internal_only": bool(values[3]),
                    "critical": bool(values[4]),
                }
            )

        return {
            "success": True,
            "router_registration_manifest": {
                "count": len(routers),
                "routers": routers,
            },
        }
