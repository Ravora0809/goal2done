from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import json

from planner import plan_goal
from executor import execute_tool

app = FastAPI(
    title="Goal2Done",
    description="Autonomous personal operations agent",
    version="0.1"
)


class GoalRequest(BaseModel):
    goal: str


class ApprovalRequest(BaseModel):
    tool: str
    arguments: dict


# Temporary in-memory approval storage
pending_approvals = []


@app.get("/")
def root():
    return {
        "name": "Goal2Done",
        "status": "running"
    }


@app.post("/goal")
def process_goal(request: GoalRequest):

    plan = plan_goal(request.goal)
    if plan.get("needs_clarification"):
        return {
        "goal": request.goal,
        "status": "needs_clarification",
        "questions": plan.get("questions", []),
        "actions": [],
        "approvals_required": []
    }

    actions = []
    approvals = []

    for planned_action in plan["actions"]:

        tool_name = planned_action["tool"]
        arguments = planned_action["arguments"]

        result = execute_tool(
            tool_name,
            arguments
        )

        action = {
            "tool": tool_name,
            "arguments": arguments,
            "result": result
        }

        actions.append(action)

        if result.get("status") == "approval_required":

            approvals.append(action)

            pending_approvals.append({
                "tool": tool_name,
                "arguments": arguments
            })

    return {
        "goal": request.goal,
        "status": (
            "waiting_for_approval"
            if approvals
            else "completed"
        ),
        "actions": actions,
        "approvals_required": approvals
    }

@app.post("/approve")
def approve_action(request: ApprovalRequest):

    approval = None

    # Find matching approval request
    for item in pending_approvals:

        if (
            item["tool"] == request.tool
            and item["arguments"] == request.arguments
        ):
            approval = item
            break

    if approval is None:
        raise HTTPException(
            status_code=404,
            detail="Approval request not found"
        )

    # Remove approved request
    pending_approvals.remove(approval)

    # Execute AFTER user approval
    result = execute_approved_tool(
        request.tool,
        request.arguments
    )

    return {
        "status": "completed",
        "message": "Action approved and executed.",
        "action": {
            "tool": request.tool,
            "arguments": request.arguments,
            "result": result
        }
    }


def execute_approved_tool(tool_name, arguments):

    from tools import (
        search_web,
        create_task,
        create_reminder,
        browser_open
    )

    if tool_name == "search_web":
        return search_web(**arguments)

    if tool_name == "create_task":
        return create_task(**arguments)

    if tool_name == "create_reminder":
        return create_reminder(**arguments)

    if tool_name == "browser_open":
        return browser_open(**arguments)

    raise HTTPException(
        status_code=400,
        detail=f"Unknown tool: {tool_name}"
    )