from __future__ import annotations

import hashlib
import ipaddress
import json
import re
from typing import Any


class DeviceFingerprintService:
    """
    Canonical device identity normalizer for:
    - watch-to-earn abuse resistance
    - affiliate fraud correlation
    - payment risk correlation
    - session evidence grouping
    """

    HIGH_ENTROPY_HEADERS = (
        "user-agent",
        "accept-language",
        "sec-ch-ua",
        "sec-ch-ua-mobile",
        "sec-ch-ua-platform",
        "x-device-model",
        "x-device-os",
        "x-device-browser",
        "x-app-version",
        "x-screen-width",
        "x-screen-height",
        "x-timezone",
        "x-locale",
    )

    def build(
        self,
        *,
        headers: dict[str, Any],
        ip: str | None = None,
        account_id: str | None = None,
        fingerprint_seed: str | None = None,
    ) -> dict[str, Any]:
        normalized_headers = self._normalize_headers(headers)
        normalized_ip = self._normalize_ip(ip)
        ip_network_hint = self._ip_network_hint(normalized_ip)
        ua = normalized_headers.get("user-agent", "")

        browser_family = self._browser_family(ua)
        os_family = self._os_family(ua)
        device_family = self._device_family(ua)

        base_payload = {
            "headers": {key: normalized_headers.get(key, "") for key in self.HIGH_ENTROPY_HEADERS},
            "ip_network_hint": ip_network_hint,
            "browser_family": browser_family,
            "os_family": os_family,
            "device_family": device_family,
            "fingerprint_seed": self._clean_optional(fingerprint_seed),
        }

        canonical_string = json.dumps(base_payload, sort_keys=True, separators=(",", ":"))
        device_hash = hashlib.sha256(canonical_string.encode("utf-8")).hexdigest()

        account_scoped_hash = None
        if account_id:
            scoped_raw = f"{account_id}:{device_hash}"
            account_scoped_hash = hashlib.sha256(scoped_raw.encode("utf-8")).hexdigest()

        stability_score = self._stability_score(
            normalized_headers=normalized_headers,
            normalized_ip=normalized_ip,
            browser_family=browser_family,
            os_family=os_family,
        )

        return {
            "success": True,
            "fingerprint": {
                "device_hash": device_hash,
                "account_scoped_hash": account_scoped_hash,
                "browser_family": browser_family,
                "os_family": os_family,
                "device_family": device_family,
                "ip_network_hint": ip_network_hint,
                "stability_score": stability_score,
                "signals": {
                    "has_user_agent": bool(ua),
                    "has_sec_ch_ua": bool(normalized_headers.get("sec-ch-ua")),
                    "has_timezone": bool(normalized_headers.get("x-timezone")),
                    "has_screen_dimensions": bool(
                        normalized_headers.get("x-screen-width")
                        and normalized_headers.get("x-screen-height")
                    ),
                },
            },
        }

    def _normalize_headers(self, headers: dict[str, Any]) -> dict[str, str]:
        normalized: dict[str, str] = {}
        for key, value in headers.items():
            normalized[str(key).lower()] = re.sub(r"\s+", " ", str(value)).strip()
        return normalized

    def _normalize_ip(self, ip: str | None) -> str | None:
        if not ip:
            return None
        try:
            parsed = ipaddress.ip_address(ip.strip())
            return str(parsed)
        except ValueError:
            return None

    def _ip_network_hint(self, ip: str | None) -> str | None:
        if not ip:
            return None
        try:
            parsed = ipaddress.ip_address(ip)
            if parsed.version == 4:
                parts = ip.split(".")
                return ".".join(parts[:3]) + ".0/24"
            exploded = parsed.exploded.split(":")
            return ":".join(exploded[:4]) + "::/64"
        except ValueError:
            return None

    def _browser_family(self, ua: str) -> str:
        lowered = ua.lower()
        if "edg/" in lowered:
            return "edge"
        if "chrome/" in lowered and "edg/" not in lowered:
            return "chrome"
        if "firefox/" in lowered:
            return "firefox"
        if "safari/" in lowered and "chrome/" not in lowered:
            return "safari"
        if "opr/" in lowered or "opera" in lowered:
            return "opera"
        return "unknown"

    def _os_family(self, ua: str) -> str:
        lowered = ua.lower()
        if "android" in lowered:
            return "android"
        if "iphone" in lowered or "ipad" in lowered or "ios" in lowered:
            return "ios"
        if "windows" in lowered:
            return "windows"
        if "mac os x" in lowered or "macintosh" in lowered:
            return "macos"
        if "linux" in lowered:
            return "linux"
        return "unknown"

    def _device_family(self, ua: str) -> str:
        lowered = ua.lower()
        if "mobile" in lowered or "iphone" in lowered or "android" in lowered:
            return "mobile"
        if "ipad" in lowered or "tablet" in lowered:
            return "tablet"
        return "desktop"

    def _stability_score(
        self,
        *,
        normalized_headers: dict[str, str],
        normalized_ip: str | None,
        browser_family: str,
        os_family: str,
    ) -> float:
        score = 20.0
        if normalized_headers.get("user-agent"):
            score += 22.0
        if normalized_headers.get("sec-ch-ua"):
            score += 16.0
        if normalized_headers.get("x-timezone"):
            score += 12.0
        if normalized_headers.get("x-screen-width") and normalized_headers.get("x-screen-height"):
            score += 12.0
        if normalized_ip:
            score += 8.0
        if browser_family != "unknown":
            score += 5.0
        if os_family != "unknown":
            score += 5.0
        return round(min(100.0, score), 2)

    def _clean_optional(self, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = str(value).strip()
        return cleaned or None
