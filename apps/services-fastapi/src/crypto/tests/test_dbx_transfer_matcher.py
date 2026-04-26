from __future__ import annotations

import pytest

from crypto.dbx_models import DbxTransferCandidate
from crypto.errors.dbx_errors import DbxTransferMismatchError, DbxTransferNotFoundError
from crypto.services.dbx_transfer_matcher import (
    DbxTransferMatcher,
    DbxTransferMatchRequest,
)


def candidate(**overrides):
    base = {
        "signature": "sig",
        "mint": "mint111",
        "sender": "sender111",
        "receiver": "treasury111",
        "amountBaseUnits": "1000000000",
        "decimals": 9,
        "slot": 1,
        "confirmationStatus": "confirmed",
        "err": None,
        "instructionType": "transferChecked",
        "rawInstruction": {},
    }
    base.update(overrides)
    return DbxTransferCandidate(**base)


def test_match_required_accepts_valid_transfer():
    matcher = DbxTransferMatcher()

    result = matcher.match_required(
        candidates=[candidate()],
        request=DbxTransferMatchRequest(
            expected_mint="mint111",
            expected_treasury_wallet="treasury111",
            expected_amount_base_units="999999999",
            expected_sender_wallet="sender111",
        ),
    )

    assert result.amount_ok is True
    assert result.mint_ok is True
    assert result.receiver_ok is True
    assert result.sender_ok is True


def test_match_required_rejects_empty_candidates():
    matcher = DbxTransferMatcher()

    with pytest.raises(DbxTransferNotFoundError):
        matcher.match_required(
            candidates=[],
            request=DbxTransferMatchRequest(
                expected_mint="mint111",
                expected_treasury_wallet="treasury111",
                expected_amount_base_units="1",
            ),
        )


def test_match_required_rejects_low_amount():
    matcher = DbxTransferMatcher()

    with pytest.raises(DbxTransferMismatchError) as error:
        matcher.match_required(
            candidates=[candidate(amountBaseUnits="10")],
            request=DbxTransferMatchRequest(
                expected_mint="mint111",
                expected_treasury_wallet="treasury111",
                expected_amount_base_units="11",
            ),
        )

    assert "dbx_amount_below_expected" in str(error.value)


def test_match_required_rejects_wrong_sender():
    matcher = DbxTransferMatcher()

    with pytest.raises(DbxTransferMismatchError) as error:
        matcher.match_required(
            candidates=[candidate(sender="different")],
            request=DbxTransferMatchRequest(
                expected_mint="mint111",
                expected_treasury_wallet="treasury111",
                expected_amount_base_units="1",
                expected_sender_wallet="sender111",
            ),
        )

    assert "sender_wallet_mismatch" in str(error.value)