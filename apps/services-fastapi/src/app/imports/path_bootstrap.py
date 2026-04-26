from __future__ import annotations

import sys
from pathlib import Path


def bootstrap_python_path() -> None:
    """
    Makes both `src` and project root imports stable across:
    - local uvicorn main:app
    - Render start commands
    - pytest
    - direct python src/main.py
    """
    current = Path(__file__).resolve()
    src_dir = current.parents[2]
    service_root = current.parents[3]

    for path in (src_dir, service_root):
        text = str(path)
        if text not in sys.path:
            sys.path.insert(0, text)


bootstrap_python_path()