from __future__ import annotations

from typing import Any


class DBXAppError(Exception):
    def __init__(
        self,
        *,
        message: str,
        code: str,
        status_code: int = 400,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class InternalAuthError(DBXAppError):
    def __init__(self, message: str = "Unauthorized internal request") -> None:
        super().__init__(
            message=message,
            code="INTERNAL_AUTH_FAILED",
            status_code=401,
        )


class ValidationFailedError(DBXAppError):
    def __init__(
        self,
        message: str = "Validation failed",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code="VALIDATION_FAILED",
            status_code=422,
            details=details,
        )


class DependencyUnavailableError(DBXAppError):
    def __init__(
        self,
        dependency: str,
        message: str | None = None,
    ) -> None:
        super().__init__(
            message=message or f"{dependency} unavailable",
            code="DEPENDENCY_UNAVAILABLE",
            status_code=503,
            details={"dependency": dependency},
        )


class RiskEvaluationError(DBXAppError):
    def __init__(
        self,
        message: str = "Risk evaluation failed",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code="RISK_EVALUATION_FAILED",
            status_code=500,
            details=details,
        )
