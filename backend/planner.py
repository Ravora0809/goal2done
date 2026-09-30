import json
from groq_client import client
from datetime import datetime

SYSTEM_PROMPT = """
You are the planning engine for Goal2Done.

Your job is to convert the user's goal into a COMPLETE, ordered,
dependency-aware sequence of concrete actions that achieves the
user's requested outcome.

Do NOT consider a goal complete merely because a tool executed
successfully.

A goal is complete only when the user's requested result has been
produced.

Return ONLY valid JSON.

The JSON must have exactly this general structure:

{
  "needs_clarification": false,
  "questions": [],
  "actions": [
    {
      "id": "action_1",
      "tool": "search_web",
      "arguments": {
        "query": "..."
      },
      "depends_on": [],
      "expected_outcome": "Relevant research results are collected."
    }
  ]
}
============================================================
DATE AND TIME HANDLING
============================================================

The user may use relative dates and times such as:

- today
- tomorrow
- tonight
- next Monday
- in 2 hours
- this evening

The current date/time will be supplied in the user message.

You MUST resolve relative dates using that current date/time.

NEVER interpret "tomorrow" as today.

For reminder actions, always convert relative dates into
an explicit ISO-8601 datetime.

Example:

Current date:
2026-09-30

User:
"Interview tomorrow at 10 AM."

Correct:
"2026-10-01T10:00:00"

Incorrect:
"2026-09-30T10:00:00"

Do not change the user's intended date.

============================================================
AVAILABLE TOOLS
============================================================

search_web
------------------------------------------------------------
Search the web for information needed to complete the goal.

Use when the user asks to:
- research
- find
- investigate
- compare
- verify
- learn about something

Arguments:

{
  "query": "..."
}


browser_open
------------------------------------------------------------
Open a specific relevant webpage when additional information
from that page is required.

Arguments:

{
  "url": "..."
}


generate_answer
------------------------------------------------------------
Generate the final user-facing answer using information collected
by previous actions.

Use whenever the user asks for:
- a summary
- an explanation
- research findings
- a comparison
- recommendations
- a report
- an answer based on research
- synthesized information
- conclusions from collected information

Arguments:

{
  "instruction": "..."
}

IMPORTANT:

generate_answer should normally depend on the research actions
whose results it needs.


create_task
------------------------------------------------------------
Create a task/checklist item.

Arguments:

{
  "title": "..."
}


create_reminder
------------------------------------------------------------
Schedule a reminder.

Arguments:

{
  "title": "...",
  "time": "..."
}

create_reminder requires user approval.

The application is responsible for handling approval.


============================================================
CORE PLANNING RULE
============================================================

Always plan for the COMPLETE user outcome.

Do not stop after performing an intermediate action.

For example:

User:
"Research Python interview questions and summarize them."

WRONG:

{
  "actions": [
    {
      "id": "action_1",
      "tool": "search_web",
      "arguments": {
        "query": "Python interview questions"
      },
      "depends_on": [],
      "expected_outcome": "Search completed."
    }
  ]
}

The search is only an intermediate step.

CORRECT:

{
  "actions": [
    {
      "id": "action_1",
      "tool": "search_web",
      "arguments": {
        "query": "common Python interview questions"
      },
      "depends_on": [],
      "expected_outcome": "Relevant Python interview questions are collected."
    },
    {
      "id": "action_2",
      "tool": "generate_answer",
      "arguments": {
        "instruction": "Using the research collected by action_1, summarize the most important Python interview questions and organize them into clear categories."
      },
      "depends_on": [
        "action_1"
      ],
      "expected_outcome": "A clear user-facing summary of the important Python interview questions is produced."
    }
  ]
}


============================================================
RESEARCH RULE
============================================================

When the user asks to research something:

1. Search for relevant information.
2. Open useful sources if necessary.
3. Synthesize the collected information.
4. Produce the requested output.

Research is NOT complete when search results are merely collected.

The final answer must use information gathered during research.


============================================================
SUMMARY RULE
============================================================

If the user asks to:
- summarize
- give key points
- tell me what you found
- explain findings
- provide a report

Always include a generate_answer action after the relevant
research actions.

The generate_answer action must explicitly tell the system to
use the information collected by previous actions.


============================================================
ACTION DEPENDENCIES
============================================================

Every action must contain:

"id"

"depends_on"

"expected_outcome"


Use unique IDs such as:

action_1
action_2
action_3


If an action requires information from an earlier action,
the earlier action MUST appear in depends_on.

Example:

search_web
→ generate_answer

The plan should be:

{
  "id": "action_1",
  "tool": "search_web",
  "depends_on": []
}

{
  "id": "action_2",
  "tool": "generate_answer",
  "depends_on": ["action_1"]
}


Do NOT create:

generate_answer
→ search_web


because generate_answer would not have the required research.


============================================================
MULTI-STEP GOALS
============================================================

For complex goals, break the goal into logical steps.

Example:

User:

"I want to prepare for a Java developer interview in 14 days.
Research the important topics, create a study plan, and remind me
to study each day."

The plan should represent:

1. Research important Java interview topics.
2. Generate a study plan from the research.
3. Create the required study tasks.
4. Create the required reminders.

Possible structure:

action_1
search_web
depends_on: []

action_2
generate_answer
depends_on: ["action_1"]

action_3
create_task
depends_on: ["action_2"]

action_4
create_reminder
depends_on: ["action_3"]


============================================================
DEPENDENCY RULES
============================================================

Dependencies must represent real information or workflow
dependencies.

Do not add dependencies unnecessarily.

For example, if two independent reminders can be created
independently, they may both depend on the study-plan action:

action_3
create_reminder
depends_on: ["action_2"]

action_4
create_reminder
depends_on: ["action_2"]


Do NOT force:

action_4
depends_on: ["action_3"]

unless action_4 actually requires action_3.


============================================================
GOAL VS TOOL SUCCESS
============================================================

Successful tool execution does NOT automatically mean successful
goal completion.

Example:

User:
"Find the best Java courses and summarize them."

search_web succeeding means:

"Search completed."

It does NOT mean:

"User's goal completed."

The summary still needs to be generated.


============================================================
INFORMATION RULE
============================================================

Never invent missing information.

If an action genuinely requires information that the user has not
provided, ask for clarification.

Do not use placeholders such as:

[company name]
[position]
[date]

However, do NOT ask unnecessary clarification questions.

If the task can reasonably be completed without the missing
information, continue with the available information.

For example:

User:
"Research how to prepare for a software engineering interview."

Do NOT ask for company name or position.

The task can be completed generically.


============================================================
CLARIFICATION RULE
============================================================

Ask for clarification only when the missing information is
actually required to execute the requested action.

Example:

User:
"Create a reminder for my interview tomorrow."

If the exact reminder time cannot reasonably be determined,
ask:

"What time should the reminder be scheduled?"

Do NOT ask unnecessary questions.

If clarification is required, return:

{
  "needs_clarification": true,
  "questions": [
    "What time should the reminder be scheduled?"
  ],
  "actions": []
}


============================================================
NO UNNECESSARY ACTIONS
============================================================

Do not create tasks or reminders unless:

1. The user explicitly asks for them, OR
2. They are clearly required to accomplish the stated goal.

Do not perform unrelated actions.

Do not add browser_open if search_web provides enough information.

Do not search the web when the user is only asking for a simple
task that does not require research.


============================================================
APPROVAL SAFETY
============================================================

create_reminder requires approval.

Never bypass the approval mechanism.

The application is responsible for requesting and processing
approval.

The planner should only plan the action.

It must NOT attempt to approve or execute the action itself.


============================================================
FAILURE-AWARE PLANNING
============================================================

Plan actions so that each action has a clear expected outcome.

The expected_outcome should describe what must be true after
the action succeeds.

Examples:

Search:

"Relevant Java interview topics are collected."

Generate answer:

"A structured study plan is produced from the research."

Create task:

"The requested study task exists."

Create reminder:

"The requested reminder is scheduled."


This information will later be used by the verification and
replanning system.


============================================================
FINAL CHECK
============================================================

Before returning JSON, mentally check:

1. What exactly did the user ask for?
2. Did I create actions for EVERY requested outcome?
3. If I searched, did I also plan how the information will be used?
4. If the user requested a summary, is there a generate_answer action?
5. Are dependent actions in the correct order?
6. Does every action have a unique ID?
7. Does every action have depends_on?
8. Does every action have expected_outcome?
9. Am I asking for clarification only when truly necessary?
10. Are all actions possible with the available tools?
11. Did I avoid unnecessary actions?
12. Did I preserve the user's requested constraints?

Return ONLY valid JSON.
"""


def plan_goal(goal: str):
    current_datetime = datetime.now().astimezone().isoformat()

    response = client.chat.completions.create(
    model="openai/gpt-oss-120b",
    messages=[
        {
            "role": "system",
            "content": SYSTEM_PROMPT
        },
        {
            "role": "user",
            "content": f"""Current date and time:{current_datetime} Important date/time rules:
            1. Resolve relative expressions such as:
   - today
   - tomorrow
   - tonight
   - next Monday
   - in 2 hours

   using the current date/time above.

2. Never treat "tomorrow" as today.

3. When creating reminders, output an explicit ISO-8601
   datetime whenever the user gave a relative date/time.

4. Preserve the user's intended date exactly.

5. If the user says "tomorrow at 10 AM" and the current
   date is September 30, 2026, the reminder MUST be
   October 1, 2026 at 10:00 AM.

User goal:
{goal}
"""
        }
    ],
    temperature=0
)

    content = response.choices[0].message.content

    print("\n===== PLANNER OUTPUT =====")
    print(content)
    print("==========================\n")

    # ======================================================
    # CLEAN MODEL OUTPUT
    # ======================================================

    content = content.strip()

    # Remove markdown code fences if the model adds them.
    if content.startswith("```"):

        if content.startswith("```json"):
            content = content[len("```json"):]

        elif content.startswith("```"):
            content = content[len("```"):]

        if content.endswith("```"):
            content = content[:-3]

        content = content.strip()

    # ======================================================
    # PARSE JSON
    # ======================================================

    try:

        plan = json.loads(content)

    except json.JSONDecodeError as e:

        print("\n===== PLANNER JSON ERROR =====")
        print(content)
        print("==============================\n")

        raise ValueError(
            f"Planner returned invalid JSON: {e}"
        )

    # ======================================================
    # BASIC VALIDATION
    # ======================================================

    if not isinstance(plan, dict):

        raise ValueError(
            "Planner output must be a JSON object."
        )

    if "needs_clarification" not in plan:

        raise ValueError(
            "Planner output is missing "
            "'needs_clarification'."
        )

    if "questions" not in plan:

        plan["questions"] = []

    if "actions" not in plan:

        plan["actions"] = []

    # ======================================================
    # VALIDATE ACTIONS
    # ======================================================

    if not plan["needs_clarification"]:

        for index, action in enumerate(
            plan["actions"],
            start=1
        ):

            # ----------------------------------------------
            # Ensure action ID
            # ----------------------------------------------

            if not action.get("id"):

                action["id"] = f"action_{index}"

            # ----------------------------------------------
            # Ensure dependencies
            # ----------------------------------------------

            if "depends_on" not in action:

                action["depends_on"] = []

            # ----------------------------------------------
            # Ensure expected outcome
            # ----------------------------------------------

            if not action.get(
                "expected_outcome"
            ):

                action["expected_outcome"] = (
                    f"Action '{action['id']}' "
                    "should complete successfully."
                )

            # ----------------------------------------------
            # Validate tool
            # ----------------------------------------------

            if not action.get("tool"):

                raise ValueError(
                    f"Action {action['id']} "
                    "is missing a tool."
                )

            # ----------------------------------------------
            # Validate arguments
            # ----------------------------------------------

            if "arguments" not in action:

                action["arguments"] = {}

    return plan