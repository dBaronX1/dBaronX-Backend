from app.api.routes.ai_generation import router as ai_generation_router
from app.api.routes.captcha import router as captcha_router
from app.api.routes.health import router as health_router
from app.api.routes.internal_admin import router as internal_admin_router
from app.api.routes.risk import router as risk_router
from app.api.routes.root import router as root_router

__all__ = [
    "ai_generation_router",
    "captcha_router",
    "health_router",
    "internal_admin_router",
    "risk_router",
    "root_router",
]
