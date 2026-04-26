from __future__ import annotations

from crypto.errors.dbx_errors import DbxInvalidInputError

BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


def is_base58(value: str, *, min_len: int = 1, max_len: int = 128) -> bool:
    cleaned = str(value or "").strip()

    if len(cleaned) < min_len or len(cleaned) > max_len:
        return False

    return all(char in BASE58_ALPHABET for char in cleaned)


def assert_base58(
    value: str,
    *,
    field_name: str,
    min_len: int = 1,
    max_len: int = 128,
) -> str:
    cleaned = str(value or "").strip()

    if not is_base58(cleaned, min_len=min_len, max_len=max_len):
        raise DbxInvalidInputError(
            f"{field_name} must be a valid base58 value",
            code=f"invalid_{field_name}",
            details={
                "field": field_name,
                "minLength": min_len,
                "maxLength": max_len,
            },
        )

    return cleaned