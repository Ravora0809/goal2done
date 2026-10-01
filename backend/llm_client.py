# ==========================================================
# GOAL2DONE - OPENROUTER LLM CLIENT
# ==========================================================

import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()


# ==========================================================
# CONFIGURATION
# ==========================================================

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

if not OPENROUTER_API_KEY:
    raise ValueError(
        "OPENROUTER_API_KEY is missing from .env"
    )


PLANNER_MODEL = os.getenv(
    "PLANNER_MODEL",
    "openai/gpt-6-luna-pro"
)

RECOVERY_MODEL = os.getenv(
    "RECOVERY_MODEL",
    "openai/gpt-6-luna-pro"
)

ANSWER_MODEL = os.getenv(
    "ANSWER_MODEL",
    "openai/gpt-6-luna"
)


# ==========================================================
# OPENROUTER CLIENT
# ==========================================================

client = OpenAI(
    api_key=OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
    default_headers={
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Goal2Done",
    },
)


# ==========================================================
# COMMON CHAT FUNCTION
# ==========================================================

def chat_completion(
    model,
    messages,
    max_tokens=4096,
    fallback_models=None,
):

    request = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
    }

    # ------------------------------------------------------
    # OPENROUTER MODEL FALLBACK
    # ------------------------------------------------------

    if fallback_models:

        request["extra_body"] = {
            "models": fallback_models
        }

    response = client.chat.completions.create(
        **request
    )

    return response