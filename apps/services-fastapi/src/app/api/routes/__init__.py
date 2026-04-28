"""Route modules package.

Intentionally avoids eager route imports so optional module mounts can import
individual route modules without triggering unrelated provider dependencies.
"""

__all__: list[str] = []
