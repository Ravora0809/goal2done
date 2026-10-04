"""
Goal2Done LLM Failover Router

Purpose:
- Never stop at the first LLM failure.
- If a model hits rate limits, quota/credit limits, timeout, 5xx,
  model-not-found/deprecation, or returns an empty response, immediately
  move to the next configured model.
- OpenRouter and Groq are both first-class providers.
- Supports up to 5 fallback models per task.
- Temporarily cools down a failing model so repeated requests do not keep
  hammering the same unavailable endpoint.
"""

import os
import time
from typing import Optional

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

openrouter_client = (
    OpenAI(
        api_key=OPENROUTER_API_KEY,
        base_url="https://openrouter.ai/api/v1",
    )
    if OPENROUTER_API_KEY
    else None
)

groq_client = (
    OpenAI(
        api_key=GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1",
    )
    if GROQ_API_KEY
    else None
)

# model -> unix timestamp until which the model is temporarily skipped
_model_cooldown = {}

# Keep this short so a temporarily rate-limited model can recover.
MODEL_COOLDOWN_SECONDS = int(os.getenv("LLM_MODEL_COOLDOWN_SECONDS", "60"))


def _env_models(prefix: str, defaults):
    """
    Read MODEL, FALLBACK_1 ... FALLBACK_5.

    Example:
        PLANNER_MODEL=...
        PLANNER_FALLBACK_1=...
        PLANNER_FALLBACK_2=...
        ...
    """
    values = [
        os.getenv(f"{prefix}_MODEL", defaults[0] if len(defaults) > 0 else None),
        os.getenv(f"{prefix}_FALLBACK_1", defaults[1] if len(defaults) > 1 else None),
        os.getenv(f"{prefix}_FALLBACK_2", defaults[2] if len(defaults) > 2 else None),
        os.getenv(f"{prefix}_FALLBACK_3", defaults[3] if len(defaults) > 3 else None),
        os.getenv(f"{prefix}_FALLBACK_4", defaults[4] if len(defaults) > 4 else None),
        os.getenv(f"{prefix}_FALLBACK_5", defaults[5] if len(defaults) > 5 else None),
    ]

    result = []
    for value in values:
        if value and value not in result:
            result.append(value)
    return result


# ---------------------------------------------------------------------------
# Model pools
#
# Prefix is explicit:
#   openrouter/<OpenRouter model id>
#   groq/<Groq model id>
#
# Current Groq production GPT-OSS model IDs are used instead of deprecated
# Llama model IDs.
# ---------------------------------------------------------------------------

PLANNER_MODELS = _env_models(
    "PLANNER",
    [
        "openrouter/openai/gpt-6-luna-pro",
        "openrouter/openai/gpt-oss-120b",
        "groq/openai/gpt-oss-120b",
        "openrouter/openai/gpt-oss-20b",
        "groq/openai/gpt-oss-20b",
    ],
)

ANSWER_MODELS = _env_models(
    "ANSWER",
    [
        "openrouter/openai/gpt-oss-120b",
        "groq/openai/gpt-oss-120b",
        "openrouter/openai/gpt-oss-20b",
        "groq/openai/gpt-oss-20b",
    ],
)

RECOVERY_MODELS = _env_models(
    "RECOVERY",
    [
        "openrouter/openai/gpt-oss-120b",
        "groq/openai/gpt-oss-120b",
        "openrouter/openai/gpt-oss-20b",
        "groq/openai/gpt-oss-20b",
    ],
)

TASK_MODELS = {
    "planner": PLANNER_MODELS,
    "answer": ANSWER_MODELS,
    "recovery": RECOVERY_MODELS,

    "gmail": _env_models(
        "GMAIL",
        [
            "openrouter/openai/gpt-oss-20b",
            "groq/openai/gpt-oss-20b",
            "openrouter/openai/gpt-oss-120b",
            "groq/openai/gpt-oss-120b",
        ],
    ),

    "docs": _env_models(
        "DOCS",
        [
            "openrouter/openai/gpt-oss-120b",
            "groq/openai/gpt-oss-120b",
            "openrouter/openai/gpt-oss-20b",
            "groq/openai/gpt-oss-20b",
        ],
    ),

    "sheets": _env_models(
        "SHEETS",
        [
            "openrouter/openai/gpt-oss-120b",
            "groq/openai/gpt-oss-120b",
            "openrouter/openai/gpt-oss-20b",
            "groq/openai/gpt-oss-20b",
        ],
    ),

    "drive": _env_models(
        "DRIVE",
        [
            "openrouter/openai/gpt-oss-20b",
            "groq/openai/gpt-oss-20b",
            "openrouter/openai/gpt-oss-120b",
            "groq/openai/gpt-oss-120b",
        ],
    ),

    "fast": _env_models(
        "FAST",
        [
            "groq/openai/gpt-oss-20b",
            "openrouter/openai/gpt-oss-20b",
            "groq/openai/gpt-oss-120b",
            "openrouter/openai/gpt-oss-120b",
        ],
    ),

    "tool": _env_models(
        "TOOL",
        [
            "groq/openai/gpt-oss-120b",
            "openrouter/openai/gpt-oss-120b",
            "groq/openai/gpt-oss-20b",
            "openrouter/openai/gpt-oss-20b",
        ],
    ),

    "safety": _env_models(
        "SAFETY",
        [
            "openrouter/openai/gpt-oss-20b",
            "groq/openai/gpt-oss-20b",
            "openrouter/openai/gpt-oss-120b",
            "groq/openai/gpt-oss-120b",
        ],
    ),
}


# ---------------------------------------------------------------------------
# Provider selection
# ---------------------------------------------------------------------------

def _client_for(model: str):
    """Return (OpenAI-compatible client, provider-specific model ID)."""

    if model.startswith("openrouter/"):
        if not openrouter_client:
            raise RuntimeError("OPENROUTER_API_KEY is not configured")
        return openrouter_client, model[len("openrouter/"):]

    if model.startswith("groq/"):
        if not groq_client:
            raise RuntimeError("GROQ_API_KEY is not configured")
        return groq_client, model[len("groq/"):]

    # Backwards compatibility for old environment values.
    if model.startswith("openai/gpt-"):
        if not openrouter_client:
            raise RuntimeError("OPENROUTER_API_KEY is not configured")
        return openrouter_client, model

    if groq_client:
        return groq_client, model

    if openrouter_client:
        return openrouter_client, model

    raise RuntimeError("Configure OPENROUTER_API_KEY or GROQ_API_KEY")


# ---------------------------------------------------------------------------
# Response/error helpers
# ---------------------------------------------------------------------------

def _response_text(response) -> str:
    try:
        content = response.choices[0].message.content
    except (AttributeError, IndexError, TypeError):
        return ""

    if content is None:
        return ""

    return str(content).strip()


def _error_text(exc: Exception) -> str:
    return str(exc).lower()


def _status_code(exc: Exception):
    for attr in ("status_code", "http_status"):
        value = getattr(exc, attr, None)
        if value is not None:
            try:
                return int(value)
            except Exception:
                pass

    text = _error_text(exc)

    for code in (401, 402, 403, 404, 408, 409, 429, 500, 502, 503, 504):
        if str(code) in text:
            return code

    return None


def _should_failover(exc: Exception) -> bool:
    """
    Decide whether the next model should be tried.

    We fail over aggressively for provider-side failures because Goal2Done
    should not expose provider outages as a user-facing 'failed to fetch'.
    """

    code = _status_code(exc)
    text = _error_text(exc)

    # Provider-side failures: always fail over.
    if code in {401, 402, 403, 404, 408, 409, 429, 500, 502, 503, 504}:
        return True

    markers = (
        "rate limit",
        "rate_limit",
        "too many requests",
        "quota",
        "credit",
        "insufficient",
        "tokens per minute",
        "tokens per day",
        "temporarily unavailable",
        "service unavailable",
        "gateway timeout",
        "timeout",
        "timed out",
        "model not found",
        "does not exist",
        "deprecated",
        "empty response",
        "connection error",
        "connection reset",
        "connection refused",
        "server disconnected",
    )

    return any(marker in text for marker in markers)


def _cooldown(model: str):
    _model_cooldown[model] = time.time() + MODEL_COOLDOWN_SECONDS


def _is_cooled_down(model: str) -> bool:
    until = _model_cooldown.get(model)
    if until is None:
        return False

    if time.time() >= until:
        _model_cooldown.pop(model, None)
        return False

    return True


# ---------------------------------------------------------------------------
# Main completion function
# ---------------------------------------------------------------------------

def chat_completion(
    models=None,
    messages=None,
    temperature=0,
    max_tokens=4096,
    task: Optional[str] = None,
):
    """
    Run a completion with automatic multi-model/provider failover.

    Failover sequence example:

        OpenRouter GPT-6
             ↓ 429
        OpenRouter GPT-OSS 120B
             ↓ 402
        Groq GPT-OSS 120B
             ↓ empty response
        OpenRouter GPT-OSS 20B
             ↓
           success

    The first successful non-empty response is returned.
    """

    if messages is None:
        raise ValueError("messages are required")

    if task:
        candidates = TASK_MODELS.get(task, ANSWER_MODELS)
    elif models:
        candidates = list(models)
    else:
        candidates = ANSWER_MODELS

    if not candidates:
        raise RuntimeError("No LLM models are configured")

    # Remove duplicates while preserving order.
    candidates = list(dict.fromkeys(candidates))

    hard_cap = int(os.getenv("LLM_MAX_OUTPUT_TOKENS", "1200"))
    requested_tokens = max(256, min(int(max_tokens), hard_cap))

    # For credit-limited requests, try a smaller output once before giving
    # up on that model. For 429/404/5xx, we immediately move to the next model.
    token_attempts = [requested_tokens]
    if requested_tokens > 768:
        token_attempts.append(768)
    if requested_tokens > 512:
        token_attempts.append(512)

    failures = []

    # IMPORTANT:
    # Never skip a model merely because it failed on a previous request.
    # A rate limit can recover between requests, and skipping every model
    # created the previous "all models cooled down" deadlock.
    #
    # Cooldown is retained only as diagnostic state. Provider failures always
    # get a fresh chance on a new user request.
    for model in candidates:
        for attempt_index, attempt_tokens in enumerate(token_attempts):
            try:
                client, api_model = _client_for(model)

                print(
                    f"[LLM] TRY provider_model={model} "
                    f"max_tokens={attempt_tokens}"
                )

                response = client.chat.completions.create(
                    model=api_model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=attempt_tokens,
                )

                content = _response_text(response)

                if not content:
                    raise RuntimeError(
                        f"{model} returned an empty response"
                    )

                print(
                    f"[LLM] SUCCESS provider_model={model} "
                    f"max_tokens={attempt_tokens}"
                )

                return response, model

            except Exception as exc:
                last_error = exc
                code = _status_code(exc)
                error = _error_text(exc)

                failures.append(
                    f"{model}: {type(exc).__name__}: {exc}"
                )

                print(
                    f"[LLM] FAIL provider_model={model} "
                    f"status={code} error={exc}"
                )

                if not _should_failover(exc):
                    # A genuine application/request construction error should
                    # not be hidden by trying unrelated models.
                    raise

                # Important:
                # Rate-limit/quota/model-not-found/provider failures cause
                # immediate failover. Do NOT waste time retrying the same
                # unavailable model.
                # Do not permanently/cross-request disable the model.
                # The next request must be allowed to try it again.
                #
                # Only try a smaller token request for credit-related errors.
                credit_error = any(
                    marker in error
                    for marker in (
                        "402",
                        "credit",
                        "insufficient",
                        "can only afford",
                        "requires more credits",
                    )
                )

                if credit_error and attempt_index < len(token_attempts) - 1:
                    continue

                break

    # Every configured model failed.
    # Keep the exception concise so the API layer can convert it to a
    # user-friendly response instead of exposing a giant provider traceback.
    summary = " | ".join(failures[-6:])

    raise RuntimeError(
        "LLM_FAILOVER_EXHAUSTED: all configured AI models/providers "
        f"were unavailable. Attempts: {summary}"
    )


def get_task_models(task: str):
    """Backwards-compatible helper used by existing Goal2Done code."""
    return TASK_MODELS.get(task, ANSWER_MODELS)


def clear_model_cooldowns():
    """Clear diagnostic cooldown state without affecting model configuration."""
    _model_cooldown.clear()
