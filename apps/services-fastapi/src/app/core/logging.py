from __future__ import annotations

import logging
import sys
from typing import Any

from pythonjsonlogger.json import JsonFormatter

from app.core.config import Settings


class DBXJsonFormatter(JsonFormatter):
    def add_fields(
        self,
        log_record: dict[str, Any],
        record: logging.LogRecord,
        message_dict: dict[str, Any],
    ) -> None:
        super().add_fields(log_record, record, message_dict)
        log_record["level"] = record.levelname
        log_record["logger"] = record.name
        log_record["timestamp"] = self.formatTime(record, self.datefmt)
        if "message" not in log_record:
            log_record["message"] = record.getMessage()


def configure_logging(settings: Settings) -> None:
    root = logging.getLogger()

    for handler in list(root.handlers):
        root.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        DBXJsonFormatter(
            "%(timestamp)s %(level)s %(name)s %(message)s %(request_id)s %(path)s %(method)s"
        )
    )

    root.setLevel(settings.app_log_level)
    root.addHandler(handler)

    for noisy in (
        "uvicorn",
        "uvicorn.access",
        "httpx",
        "httpcore",
    ):
        logging.getLogger(noisy).setLevel(
            "INFO" if settings.app_log_level == "DEBUG" else settings.app_log_level
        )


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
