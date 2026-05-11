from __future__ import annotations

from fastapi import APIRouter

from app.services.risk_policy_service import FirstSaleRiskPolicyService

router = APIRouter(tags=["first-sale-risk-policy"])


@router.get("/", summary="First-sale risk-based security ladder policy")
async def first_sale_risk_policy() -> dict[str, object]:
    service = FirstSaleRiskPolicyService()
    return {
        "policy": service.policy(),
        "phase_two_warning": "MFA_PASSKEY_REQUIRED_FOR_ADMIN_PHASE_TWO",
    }
