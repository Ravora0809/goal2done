"""Provider/model fallback router for Goal2Done."""
import os
import time
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

openrouter_client = OpenAI(
    api_key=OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
) if OPENROUTER_API_KEY else None

groq_client = OpenAI(
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1",
) if GROQ_API_KEY else None


def _clean_models(primary, fallback_1, fallback_2):
    return [m for m in [primary, fallback_1, fallback_2] if m]


PLANNER_MODELS = _clean_models(
    os.getenv("PLANNER_MODEL", "openai/gpt-6-luna-pro"),
    os.getenv("PLANNER_FALLBACK_1", "openai/gpt-oss-120b"),
    os.getenv("PLANNER_FALLBACK_2", "openai/gpt-oss-20b"),
)
RECOVERY_MODELS = _clean_models(
    os.getenv("RECOVERY_MODEL", "openai/gpt-6-luna-pro"),
    os.getenv("RECOVERY_FALLBACK_1", "openai/gpt-oss-120b"),
    os.getenv("RECOVERY_FALLBACK_2", "openai/gpt-oss-20b"),
)
ANSWER_MODELS = _clean_models(
    os.getenv("ANSWER_MODEL", "openai/gpt-6-luna"),
    os.getenv("ANSWER_FALLBACK_1", "openai/gpt-oss-120b"),
    os.getenv("ANSWER_FALLBACK_2", "openai/gpt-oss-20b"),
)


def _client_for(model: str):
    # GPT-6 models are configured through OpenRouter in this project.
    if model.startswith("openai/gpt-6") or model.startswith("openai/gpt-5"):
        if not openrouter_client:
            raise RuntimeError("OPENROUTER_API_KEY is not configured")
        return openrouter_client

    if groq_client:
        return groq_client
    if openrouter_client:
        return openrouter_client
    raise RuntimeError("Configure OPENROUTER_API_KEY or GROQ_API_KEY")


def chat_completion(models, messages, temperature=0, max_tokens=4096):
    last_error = None
    for model in models:
        try:
            response = _client_for(model).chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response, model
        except Exception as exc:
            last_error = exc
            print(f"[LLM] {model} failed: {exc}")
            time.sleep(0.5)

    raise RuntimeError(f"All configured LLM models failed. Last error: {last_error}")
