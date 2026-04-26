from __future__ import annotations

from typing import Any, Iterable, Optional

from crypto.dbx_models import DbxTransferCandidate


class DbxInstructionParser:
    def extract_transfer_candidates(
        self,
        *,
        signature: str,
        transaction: dict[str, Any],
        confirmation_status: str,
    ) -> list[DbxTransferCandidate]:
        return list(
            self._iter_transfer_candidates(
                signature=signature,
                transaction=transaction,
                confirmation_status=confirmation_status,
            )
        )

    def _iter_transfer_candidates(
        self,
        *,
        signature: str,
        transaction: dict[str, Any],
        confirmation_status: str,
    ) -> Iterable[DbxTransferCandidate]:
        slot = transaction.get("slot")
        tx = transaction.get("transaction") or {}
        message = tx.get("message") or {}
        instructions: list[dict[str, Any]] = []

        for instruction in message.get("instructions") or []:
            if isinstance(instruction, dict):
                instructions.append(instruction)

        meta = transaction.get("meta") or {}
        for inner_group in meta.get("innerInstructions") or []:
            if not isinstance(inner_group, dict):
                continue

            for instruction in inner_group.get("instructions") or []:
                if isinstance(instruction, dict):
                    instructions.append(instruction)

        for instruction in instructions:
            candidate = self._candidate_from_instruction(
                signature=signature,
                instruction=instruction,
                slot=slot if isinstance(slot, int) else None,
                confirmation_status=confirmation_status,
            )

            if candidate:
                yield candidate

    def _candidate_from_instruction(
        self,
        *,
        signature: str,
        instruction: dict[str, Any],
        slot: Optional[int],
        confirmation_status: str,
    ) -> Optional[DbxTransferCandidate]:
        parsed = instruction.get("parsed")
        if not isinstance(parsed, dict):
            return None

        instruction_type = str(parsed.get("type") or "").strip()
        info = parsed.get("info") or {}
        if not isinstance(info, dict):
            return None

        if instruction_type == "transferChecked":
            token_amount = info.get("tokenAmount") or {}
            amount = token_amount.get("amount")
            decimals = token_amount.get("decimals")

            return DbxTransferCandidate(
                signature=signature,
                mint=self._clean(info.get("mint")),
                sender=self._clean(info.get("source")) or self._clean(info.get("authority")),
                receiver=self._clean(info.get("destination")),
                amountBaseUnits=self._clean(amount),
                decimals=decimals if isinstance(decimals, int) else None,
                slot=slot,
                confirmationStatus=confirmation_status,
                err=None,
                instructionType=instruction_type,
                rawInstruction=instruction,
            )

        if instruction_type == "transfer":
            return DbxTransferCandidate(
                signature=signature,
                mint=self._clean(info.get("mint")),
                sender=self._clean(info.get("source")) or self._clean(info.get("authority")),
                receiver=self._clean(info.get("destination")),
                amountBaseUnits=self._clean(info.get("amount")),
                decimals=None,
                slot=slot,
                confirmationStatus=confirmation_status,
                err=None,
                instructionType=instruction_type,
                rawInstruction=instruction,
            )

        return None

    def _clean(self, value: Any) -> Optional[str]:
        if value is None:
            return None
        cleaned = str(value).strip()
        return cleaned or None