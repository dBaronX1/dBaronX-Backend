from __future__ import annotations

import os


class DbxFeatureFlags:
    def enabled(self, key: str, default: bool = True) -> bool:
        raw = str(os.getenv(key, "true" if default else "false")).strip().lower()
        return raw in {"1", "true", "yes", "on", "enabled"}

    def snapshot(self) -> dict[str, bool]:
        return {
            "dbxVerificationEnabled": self.enabled("DBX_VERIFICATION_ENABLED", True),
            "dbxTraceEnabled": self.enabled("DBX_TRACE_ENABLED", True),
            "dbxDiagnosticsEnabled": self.enabled("DBX_DIAGNOSTICS_ENABLED", True),
            "dbxRequireFinalized": self.enabled("DBX_REQUIRE_FINALIZED", False),
            "dbxStrictStartupValidation": self.enabled(
                "FASTAPI_STRICT_STARTUP_VALIDATION",
                True,
            ),
        }