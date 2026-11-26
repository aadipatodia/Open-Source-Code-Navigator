"""Firebase sign-in check — every API route requires a valid Firebase ID token.

The browser signs in with Firebase and sends the resulting ID token as
`Authorization: Bearer <token>`. We verify its signature against Google's public
certificates, its expiry, and that it was issued for this Firebase project.
"""

import logging
import os
import threading
import time
from typing import Dict, Optional

import requests
from fastapi import Header, HTTPException
from google.auth import exceptions as google_exceptions
from google.auth import jwt

logger = logging.getLogger(__name__)

FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "open-source-code-navigator")
CERTS_URL = (
    "https://www.googleapis.com/robot/v1/metadata/x509/"
    "securetoken@system.gserviceaccount.com"
)
CERTS_TTL_SECONDS = 3600

_certs: Dict[str, str] = {}
_certs_fetched_at = 0.0
_certs_lock = threading.Lock()


def _signing_certs() -> Dict[str, str]:
    """Google rotates these keys every few hours; refetch at most once an hour."""
    global _certs, _certs_fetched_at
    with _certs_lock:
        if not _certs or time.time() - _certs_fetched_at > CERTS_TTL_SECONDS:
            response = requests.get(CERTS_URL, timeout=10)
            response.raise_for_status()
            _certs = response.json()
            _certs_fetched_at = time.time()
        return _certs


def verify_firebase_token(token: str) -> dict:
    """Return the token's claims, or raise HTTPException(401) if it is not valid."""
    try:
        claims = jwt.decode(token, certs=_signing_certs(), audience=FIREBASE_PROJECT_ID)
    except (ValueError, google_exceptions.GoogleAuthError) as exc:
        raise HTTPException(401, "Your sign-in has expired or is invalid. Please sign in again.") from exc
    except requests.RequestException as exc:
        logger.error("Could not fetch Firebase signing certificates: %s", exc)
        raise HTTPException(503, "Could not verify sign-in right now. Try again shortly.") from exc

    if claims.get("iss") != f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}" or not claims.get("sub"):
        raise HTTPException(401, "Your sign-in has expired or is invalid. Please sign in again.")
    return claims


def require_user(authorization: Optional[str] = Header(default=None)) -> dict:
    """FastAPI dependency: reject any request that does not carry a valid sign-in token."""
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(401, "Please sign in to use Code Scout.")
    return verify_firebase_token(token.strip())
