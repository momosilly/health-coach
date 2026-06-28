import json
import os
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, PlainTextResponse
from google import genai
from google.genai import types
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import traceback

PROJECT_ID = os.getenv("GCLOUD_PROJECT_ID")
LOCATION = "europe-west4"

# Initialize the Gen AI client for Vertex AI
client = genai.Client(
    vertexai=True,
    project=PROJECT_ID,
    location=LOCATION,
)

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
        threshold="BLOCK_MEDIUM_AND_ABOVE",  # Blocks dangerous medical advice
    ),
    types.SafetySetting(
        category="HARM_CATEGORY_HARASSMENT",
        threshold="BLOCK_LOW_AND_ABOVE",  # Strict, not really relevant but good practice
    ),
    types.SafetySetting(
        category="HARM_CATEGORY_HATE_SPEECH",
        threshold="BLOCK_LOW_AND_ABOVE",  # Strict
    ),
    types.SafetySetting(
        category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold="BLOCK_MEDIUM_AND_ABOVE",  # Strict, not relevant but good practice
    ),
]

def build_prompt(data: dict) -> tuple[dict, str]:
    """Extract and format health data, return (response_data, prompt)."""
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

#  ── Initial GET route ───────────────────────────────────────────────────────────
@app.get("/")
async def health_check():
    return {"status": "ok"}

# ── POST /healthdata ───────────────────────────────────────────────────────────
@app.post("/healthdata")
@limiter.limit("5/minute")
async def receive_health_data(request: Request):

    try:
        data = await request.json()
    except Exception:
        traceback.print_exc()
        return PlainTextResponse("Invalid request. Please try again.", status_code=400)

    _, prompt = build_prompt(data)

    async def generate():
        try:
            async for chunk in await client.aio.models.generate_content_stream(
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

        except Exception as e:
            import traceback
            traceback.print_exc()
            yield "Something went wrong. Please try again later."

    return StreamingResponse(generate(), media_type="text/plain")