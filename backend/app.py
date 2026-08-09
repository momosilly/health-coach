import base64
import hashlib
import json
import os
import traceback
from datetime import datetime, timezone, timedelta

import jwt
import requests as http_requests
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, PlainTextResponse
from google import genai
from google.genai import types
from google.cloud import firestore
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

PROJECT_ID = os.getenv("GCLOUD_PROJECT_ID")
LOCATION = "europe-west4"
ENTRA_TENANT = "common"  # accepts any MS tenant — correct for multi-tenant B2B
ENTRA_CLIENT_ID = "3b38fc18-fb0a-4285-ad33-258cd547e59a"  # your app registration client ID
CLEANUP_SECRET = os.getenv("CLEANUP_SECRET")  # set this in Cloud Run env vars

# ── Vertex AI client ──────────────────────────────────────────────────────────
genai_client = genai.Client(
    vertexai=True,
    project=PROJECT_ID,
    location=LOCATION,
)

# ── Firestore client ──────────────────────────────────────────────────────────
db = firestore.AsyncClient(project=PROJECT_ID)

app = FastAPI()
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc):
    return PlainTextResponse("Too many requests. Please wait a moment.", status_code=429)

SYSTEM_PROMPT = (
    "You are Health Coach AI inside an app called Health Coach. "
    "Your mission is to help users better interpret their health data and possibly take action on it. "
    "If any question is unrelated to health, you only answer with 'That is beyond my knowledge' without further explaining. "
    "Answer the user in the language the question is asked in."
)

safety_settings = [
    types.SafetySetting(
        category="HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold="BLOCK_MEDIUM_AND_ABOVE",
    ),
    types.SafetySetting(
        category="HARM_CATEGORY_HARASSMENT",
        threshold="BLOCK_LOW_AND_ABOVE",
    ),
    types.SafetySetting(
        category="HARM_CATEGORY_HATE_SPEECH",
        threshold="BLOCK_LOW_AND_ABOVE",
    ),
    types.SafetySetting(
        category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold="BLOCK_MEDIUM_AND_ABOVE",
    ),
]

# ── JWT verification ──────────────────────────────────────────────────────────

# Cache Microsoft's public keys so we don't fetch them on every request
_jwks_cache: dict = {}
_jwks_cache_time: datetime | None = None
JWKS_CACHE_TTL = timedelta(hours=24)

def get_microsoft_public_keys() -> dict:
    """Fetch and cache Microsoft's public signing keys."""
    global _jwks_cache, _jwks_cache_time
    now = datetime.now(timezone.utc)
    if _jwks_cache and _jwks_cache_time and (now - _jwks_cache_time) < JWKS_CACHE_TTL:
        return _jwks_cache
    url = f"https://login.microsoftonline.com/{ENTRA_TENANT}/discovery/v2.0/keys"
    response = http_requests.get(url, timeout=10)
    response.raise_for_status()
    _jwks_cache = response.json()
    _jwks_cache_time = now
    return _jwks_cache

def verify_token(request: Request) -> dict:
    """
    Verify the JWT signature using Microsoft's public keys.
    Returns the decoded claims if valid, raises ValueError if not.
    """
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise ValueError("Missing or malformed Authorization header")

    token = auth[7:]

    try:
        jwks = get_microsoft_public_keys()
        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(
            next(
                k for k in jwks["keys"]
                if k["kid"] == jwt.get_unverified_header(token)["kid"]
            )
        )
        claims = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=ENTRA_CLIENT_ID,
        )
        return {
            "tid": claims.get("tid", ""),
            "oid": claims.get("oid", ""),
            "email": claims.get("preferred_username") or claims.get("email", ""),
        }
    except StopIteration:
        raise ValueError("Token signing key not found in Microsoft JWKS")
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError as e:
        raise ValueError(f"Invalid token: {e}")

# ── Firestore helpers ─────────────────────────────────────────────────────────

def hash_oid(oid: str) -> str:
    return hashlib.sha256(oid.encode()).hexdigest()

async def upsert_user(tid: str, oid: str, email: str) -> None:
    """Create or update a user record. Never raises — failure is logged only."""
    try:
        if not tid or not oid:
            return
        doc_ref = db.collection("tenants").document(tid).collection("users").document(hash_oid(oid))
        doc = await doc_ref.get()
        if doc.exists:
            await doc_ref.update({"last_active": firestore.SERVER_TIMESTAMP})
        else:
            await doc_ref.set({
                "email": email,
                "tid": tid,
                "first_seen": firestore.SERVER_TIMESTAMP,
                "last_active": firestore.SERVER_TIMESTAMP,
            })
    except Exception:
        traceback.print_exc()

async def delete_user(tid: str, oid: str) -> None:
    doc_ref = db.collection("tenants").document(tid).collection("users").document(hash_oid(oid))
    await doc_ref.delete()

# ── Prompt builder ────────────────────────────────────────────────────────────

def build_prompt(data: dict) -> tuple[dict, str]:
    user_question = data.get('user_note', '')
    user_question = user_question[:500].strip()
    steps = data.get('steps_last_24h', 0)
    hr_min = data.get('heart_rate_min', 0)
    hr_max = data.get('heart_rate_max', 0)
    total_calories = data.get('total_calories_burned', 0.0)
    resting_hr = data.get('resting_heart_rate', 0)
    sleep_hours = data.get('sleep_hours', 0.0)
    sleep_sessions = data.get('sleep_sessions', [])
    sleep_stages = data.get('sleep_stages', [])
    exercise_duration = data.get('exercise_duration_minutes', 0)
    exercise_sessions = data.get('exercise_sessions', [])

    response_data = {}
    stage_minutes = {}

    if user_question:
        response_data['user_question'] = user_question
    if steps:
        response_data['steps'] = steps
    if hr_min and hr_max:
        response_data['heart_rate'] = f"{hr_min}-{hr_max}"
    if resting_hr:
        response_data['resting_hr'] = resting_hr
    if total_calories:
        response_data['calories'] = f"{total_calories} cal"
    if exercise_duration:
        response_data['exercise_duration'] = f"{exercise_duration} min"
    if exercise_sessions:
        exercise_sessions_formatted = []
        for session in exercise_sessions:
            exercise_sessions_formatted.append(
                f" {session.get('title', 'Unknown')}: {session.get('duration_minutes')} min ({session.get('type')}) "
            )
        response_data['exercise_sessions'] = ", ".join(exercise_sessions_formatted)
    if sleep_hours:
        response_data['sleep_hours'] = sleep_hours
    if sleep_sessions:
        response_data['sleep_sessions'] = len(sleep_sessions)
    if sleep_stages:
        for stage in sleep_stages:
            stage_type = stage.get('type', 'Unknown')
            duration = stage.get('duration_minutes', 0)
            stage_minutes[stage_type] = stage_minutes.get(stage_type, 0) + duration

        sleep_stages_formatted = []
        stage_order = ['LIGHT', 'DEEP', 'REM', 'AWAKE', 'SLEEPING', 'OUT_OF_BED', 'UNKNOWN']
        for stage_name in stage_order:
            if stage_name in stage_minutes:
                minutes = stage_minutes[stage_name]
                sleep_stages_formatted.append(f"{stage_name}: {minutes} min")

        response_data['sleep_stages'] = ", ".join(sleep_stages_formatted)

    prompt = (
        f"The following data represents the user's last 24 hours of health metrics.\n\n"
        f"{json.dumps(response_data, indent=2)}\n\n"
        f"User's question: {user_question}"
    )

    return response_data, prompt

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
async def health_check():
    return {"status": "ok"}


@app.post("/register")
async def register_user(request: Request):
    try:
        claims = verify_token(request)
    except ValueError as e:
        return PlainTextResponse(str(e), status_code=401)

    await upsert_user(claims["tid"], claims["oid"], claims["email"])
    return PlainTextResponse("ok")


@app.delete("/delete-account")
async def delete_account(request: Request):
    try:
        claims = verify_token(request)
    except ValueError as e:
        return PlainTextResponse(str(e), status_code=401)

    try:
        await delete_user(claims["tid"], claims["oid"])
        return PlainTextResponse("ok")
    except Exception:
        traceback.print_exc()
        return PlainTextResponse("Failed to delete account. Please try again.", status_code=500)


@app.post("/cleanup")
async def cleanup_inactive_users(request: Request):
    """
    Deletes users inactive for 30+ days.
    Called daily by Cloud Scheduler — protected by a static secret key
    stored in Cloud Run environment variables, never in the codebase.
    """
    secret = request.headers.get("X-Cleanup-Secret", "")
    if not CLEANUP_SECRET or secret != CLEANUP_SECRET:
        return PlainTextResponse("Unauthorized", status_code=401)

    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    deleted_count = 0

    try:
        tenants_ref = db.collection("tenants")
        async for tenant in tenants_ref.stream():
            users_ref = tenants_ref.document(tenant.id).collection("users")
            query = users_ref.where("last_active", "<", cutoff)
            async for user in query.stream():
                await user.reference.delete()
                deleted_count += 1

        print(f"[CLEANUP] Deleted {deleted_count} inactive users", flush=True)
        return PlainTextResponse(f"Deleted {deleted_count} inactive users")

    except Exception:
        traceback.print_exc()
        return PlainTextResponse("Cleanup failed.", status_code=500)


@app.post("/healthdata")
@limiter.limit("5/minute")
async def receive_health_data(request: Request):
    try:
        claims = verify_token(request)
    except ValueError as e:
        return PlainTextResponse(str(e), status_code=401)

    try:
        data = await request.json()
    except Exception:
        return PlainTextResponse("Invalid request. Please try again.", status_code=400)

    # Update last_active — never blocks the AI response
    await upsert_user(claims["tid"], claims["oid"], claims["email"])

    _, prompt = build_prompt(data)

    async def generate():
        try:
            async for chunk in await genai_client.aio.models.generate_content_stream(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=0.7,
                    max_output_tokens=1500,
                    thinking_config=types.ThinkingConfig(thinking_budget=512),
                    safety_settings=safety_settings,
                ),
            ):
                if chunk.text:
                    yield chunk.text

        except Exception:
            traceback.print_exc()
            yield "Something went wrong. Please try again later."

    return StreamingResponse(generate(), media_type="text/plain")