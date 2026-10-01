import base64
import hashlib
import hmac
import json
import os
import time

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from cryptography.fernet import Fernet


from user_store import get_google_connection, save_google_connection
import os
import certifi

os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()


GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    "http://127.0.0.1:8000/auth/google/callback",
)

APP_SECRET = os.getenv("APP_SECRET", "")
TOKEN_ENCRYPTION_KEY = os.getenv("TOKEN_ENCRYPTION_KEY", "")


# ==========================================================
# INITIAL GOOGLE LOGIN SCOPES
# ==========================================================

GOOGLE_SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",

    "https://www.googleapis.com/auth/calendar",

    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",

    "https://www.googleapis.com/auth/drive.readonly",
     "https://www.googleapis.com/auth/documents",
        "https://www.googleapis.com/auth/spreadsheets",
]


# ==========================================================
# OPTIONAL SCOPES
# ==========================================================

GOOGLE_OPTIONAL_SCOPES = [
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/spreadsheets",
]


# ==========================================================
# CONFIG
# ==========================================================

def _require_config():

    missing = [
        name
        for name, value in {
            "GOOGLE_CLIENT_ID": GOOGLE_CLIENT_ID,
            "GOOGLE_CLIENT_SECRET": GOOGLE_CLIENT_SECRET,
            "GOOGLE_REDIRECT_URI": GOOGLE_REDIRECT_URI,
            "APP_SECRET": APP_SECRET,
            "TOKEN_ENCRYPTION_KEY": TOKEN_ENCRYPTION_KEY,
        }.items()
        if not value
    ]

    if missing:
        raise RuntimeError(
            "Missing Google auth configuration: "
            + ", ".join(missing)
        )


def _client_config():

    return {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [
                GOOGLE_REDIRECT_URI
            ],
        }
    }


# ==========================================================
# STATE
# ==========================================================

def _b64(data):

    return base64.urlsafe_b64encode(
        data
    ).rstrip(b"=").decode()


def _unb64(value):

    return base64.urlsafe_b64decode(
        value + "=" * (-len(value) % 4)
    )


def _sign(value):

    return _b64(
        hmac.new(
            APP_SECRET.encode(),
            value.encode(),
            hashlib.sha256,
        ).digest()
    )


def make_state():

    payload = _b64(
        json.dumps(
            {
                "iat": int(time.time())
            }
        ).encode()
    )

    return f"{payload}.{_sign(payload)}"


def verify_state(state):

    try:

        payload, signature = state.split(".", 1)

        if not hmac.compare_digest(
            signature,
            _sign(payload),
        ):
            return False

        data = json.loads(
            _unb64(payload)
        )

        return (
            int(time.time())
            - int(data["iat"])
            < 600
        )

    except Exception:

        return False


# ==========================================================
# SESSION
# ==========================================================

def create_session(user_id):

    payload = _b64(
        json.dumps(
            {
                "sub": user_id,
                "iat": int(time.time()),
            }
        ).encode()
    )

    return f"{payload}.{_sign(payload)}"


def verify_session(
    token,
    max_age=60 * 60 * 24 * 7,
):

    try:

        payload, signature = token.split(".", 1)

        if not hmac.compare_digest(
            signature,
            _sign(payload),
        ):
            return None

        data = json.loads(
            _unb64(payload)
        )

        if (
            int(time.time())
            - int(data["iat"])
            > max_age
        ):
            return None

        return data["sub"]

    except Exception:

        return None


# ==========================================================
# GOOGLE LOGIN
# ==========================================================

def authorization_url(state=None):

    _require_config()

    flow = Flow.from_client_config(
        _client_config(),
        scopes=GOOGLE_SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI,
        autogenerate_code_verifier=False,
    )

    url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=state or make_state(),
    )

    return url


# ==========================================================
# GOOGLE CALLBACK
# ==========================================================

def exchange_code(code):

    _require_config()

    # IMPORTANT:
    # Use EXACTLY the scopes that are requested
    # during the initial login.
    #
    # Do NOT include Docs or Sheets here.

    flow = Flow.from_client_config(
        _client_config(),
        scopes=GOOGLE_SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI,
        autogenerate_code_verifier=False,
    )

    flow.fetch_token(
        code=code
    )

    credentials = flow.credentials

    return credentials


# ==========================================================
# GOOGLE USER
# ==========================================================

def google_user(credentials):

    service = build(
        "oauth2",
        "v2",
        credentials=credentials,
        cache_discovery=False,
    )

    return (
        service
        .userinfo()
        .get()
        .execute()
    )


# ==========================================================
# ENCRYPTION
# ==========================================================

def _fernet():

    return Fernet(
        TOKEN_ENCRYPTION_KEY.encode()
    )


# ==========================================================
# SAVE GOOGLE CONNECTION
# ==========================================================

def save_connection(
    user_id,
    credentials,
):

    token_json = _fernet().encrypt(
        credentials.to_json().encode()
    ).decode()

    save_google_connection(
        user_id,
        token_json,
    )


# ==========================================================
# GET USER GOOGLE CREDENTIALS
# ==========================================================

def get_user_credentials(
    user_id,
    required_scopes=None,
):

    connection = get_google_connection(
        user_id
    )

    if not connection:

        raise RuntimeError(
            "Google is not connected for this user. "
            "Sign in with Google first."
        )

    token_json = _fernet().decrypt(
        connection["token_json"].encode()
    ).decode()

    info = json.loads(
        token_json
    )

    scopes = (
        required_scopes
        or GOOGLE_SCOPES
    )

    creds = Credentials.from_authorized_user_info(
        info,
        scopes=scopes,
    )

    if (
        creds.expired
        and creds.refresh_token
    ):

        creds.refresh(
            Request()
        )

        save_connection(
            user_id,
            creds,
        )

    if not creds.valid:

        raise RuntimeError(
            "Google authorization is no longer valid. "
            "Please reconnect Google."
        )

    return creds