# ==========================================================
# GOAL2DONE - RECOVERY ENGINE
# ==========================================================

import json

from llm_client import chat_completion, RECOVERY_MODELS


RECOVERY_SYSTEM_PROMPT = """
You are the recovery engine for Goal2Done.

Your job is to recover from a failed action without
repeating the exact same failure.

You receive:
- the original user goal
- the failed action
- the failure result
- previously completed actions

Determine whether the failed action can be replaced by
another action using the available tools.

Available tools:

1. search_web
   arguments:
   {
       "query": "..."
   }

2. browser_open
   arguments:
   {
       "url": "..."
   }

3. generate_answer
   arguments:
   {
       "instruction": "..."
   }

4. create_task
   arguments:
   {
       "title": "..."
   }

5. create_reminder
   arguments:
   {
       "title": "...",
       "time": "..."
   }

6. send_message
7. list_files
8. search_files
9. read_file
10. generate_document
11. maps_search
12. maps_directions
13. browser_action

Rules:

- Do not blindly repeat the failed action.
- Understand why the action failed.
- Use another tool when possible.
- Preserve the original user goal.
- Do not remove important requirements.
- Do not invent information.
- create_reminder requires approval.
- If recovery is impossible, return recoverable=false.
- Return ONLY valid JSON.

Output format:

{
    "recoverable": true,
    "reason": "Why recovery is possible",
    "actions": [
        {
            "tool": "search_web",
            "arguments": {
                "query": "..."
            },
            "expected_outcome": "..."
        }
    ]
}

If recovery is impossible:

{
    "recoverable": false,
    "reason": "Why recovery is impossible",
    "actions": []
}
"""


def recover_action(
    goal,
    failed_action,
    failure_result,
    completed_actions
):

    prompt = f"""
ORIGINAL USER GOAL:
{goal}

FAILED ACTION:
{json.dumps(failed_action, indent=2)}

FAILURE RESULT:
{json.dumps(failure_result, indent=2)}

COMPLETED ACTIONS:
{json.dumps(completed_actions, indent=2)}

Create a recovery plan.
"""

    response, used_model = chat_completion(
        models=RECOVERY_MODELS,
        messages=[
            {
                "role": "system",
                "content": RECOVERY_SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        temperature=0,
        max_tokens=4096,
    )

    print(f"[RECOVERY] Model used: {used_model}")
    content = response.choices[0].message.content.strip()

    # Remove markdown fences if the model adds them
    if content.startswith("```"):

        content = content.replace(
            "```json",
            ""
        ).replace(
            "```",
            ""
        ).strip()

    try:

        recovery_plan = json.loads(content)

    except json.JSONDecodeError:

        return {
            "recoverable": False,
            "reason": (
                "Recovery engine returned "
                "invalid JSON."
            ),
            "actions": [],
        }

    if not isinstance(recovery_plan, dict):

        return {
            "recoverable": False,
            "reason": "Invalid recovery plan.",
            "actions": [],
        }

    actions = recovery_plan.get(
        "actions",
        []
    )

    if not isinstance(actions, list):

        actions = []

    # Basic validation
    valid_tools = {
        "search_web",
        "browser_open",
        "generate_answer",
        "create_task",
        "create_reminder",
        "send_message",
        "list_files",
        "search_files",
        "read_file",
        "generate_document",
        "maps_search",
        "maps_directions",
        "browser_action",
    }

    validated_actions = []

    for action in actions:

        if not isinstance(action, dict):
            continue

        tool = action.get("tool")

        arguments = action.get(
            "arguments",
            {}
        )

        if tool not in valid_tools:
            continue

        if not isinstance(arguments, dict):
            continue

        validated_actions.append({
            "tool": tool,
            "arguments": arguments,
            "expected_outcome": action.get(
                "expected_outcome",
                ""
            ),
        })

    if not validated_actions:

        return {
            "recoverable": False,
            "reason": recovery_plan.get(
                "reason",
                "No valid recovery actions."
            ),
            "actions": [],
        }

    return {
        "recoverable": True,
        "reason": recovery_plan.get(
            "reason",
            "A recovery plan was generated."
        ),
        "actions": validated_actions,
    }