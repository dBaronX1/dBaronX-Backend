from __future__ import annotations

from decimal import Decimal, InvalidOperation, ROUND_DOWN

from crypto.errors.dbx_errors import DbxInvalidInputError


def assert_positive_base_units(value: str, *, field_name: str = "amount") -> str:
    cleaned = str(value or "").strip()

    if not cleaned.isdigit() or int(cleaned) <= 0:
        raise DbxInvalidInputError(
            f"{field_name} must be a positive integer string",
            code=f"invalid_{field_name}",
        )

    return cleaned


def base_units_to_decimal_string(base_units: str, decimals: int = 9) -> str:
    cleaned = assert_positive_base_units(base_units, field_name="baseUnits")
    padded = cleaned.zfill(decimals + 1)
    whole = padded[:-decimals]
    fraction = padded[-decimals:].rstrip("0")
    return f"{whole}.{fraction}" if fraction else whole


def decimal_string_to_base_units(amount: str, decimals: int = 9) -> str:
    try:
        value = Decimal(str(amount).strip())
    except InvalidOperation as exc:
        raise DbxInvalidInputError(
            "amount must be a decimal string",
            code="invalid_decimal_amount",
        ) from exc

    if value <= 0:
        raise DbxInvalidInputError(
            "amount must be greater than zero",
            code="amount_must_be_positive",
        )

    multiplier = Decimal(10) ** decimals
    base_units = (value * multiplier).quantize(Decimal("1"), rounding=ROUND_DOWN)
    return str(int(base_units))


def compare_base_units(left: str, right: str) -> int:
    left_int = int(assert_positive_base_units(left, field_name="left"))
    right_int = int(assert_positive_base_units(right, field_name="right"))

    if left_int > right_int:
        return 1
    if left_int < right_int:
        return -1
    return 0