from __future__ import annotations

import importlib
import sys


def alias_module(alias: str, target: str) -> bool:
    if alias in sys.modules:
        return True

    try:
        sys.modules[alias] = importlib.import_module(target)
        return True
    except Exception:
        return False


def install_module_aliases() -> dict[str, bool]:
    """
    Keeps old imports alive while the final canonical structure is used.
    Does not duplicate logic; only points aliases to canonical modules.
    """
    aliases = {
        "src.app.app_factory": "app.factory.app_builder",
        "src.app.api_router": "app.registry.runtime_registry",
        "src.crypto.dbx_routes": "crypto.dbx_internal_api",
    }

    return {
        alias: alias_module(alias, target)
        for alias, target in aliases.items()
    }