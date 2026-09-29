from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from verifier import verify_action
from planner import plan_goal
from executor import execute_tool
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Goal2Done",
    description="Autonomous personal operations agent",
    version="0.1"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# REQUEST MODELS
# ============================================================

class GoalRequest(BaseModel):
    goal: str


class ApprovalRequest(BaseModel):
    tool: str
    arguments: dict
    
    
class RejectRequest(BaseModel):
    tool: str
    arguments: dict


# ============================================================
# TEMPORARY APPROVAL STORAGE
# ============================================================

pending_approvals = []


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "name": "Goal2Done",
        "status": "running"
    }


# ============================================================
# PROCESS USER GOAL
# ============================================================

@app.post("/goal")
def process_goal(request: GoalRequest):

    # --------------------------------------------------------
    # 1. Generate plan using Groq
    # --------------------------------------------------------

    plan = plan_goal(request.goal)

    # --------------------------------------------------------
    # 2. Check whether planner needs more information
    # --------------------------------------------------------

    if plan.get("needs_clarification"):

        return {
            "goal": request.goal,
            "status": "needs_clarification",
            "questions": plan.get("questions", []),
            "actions": [],
            "approvals_required": []
        }

    # --------------------------------------------------------
    # 3. Execute planned actions
    # --------------------------------------------------------

    actions = []
    approvals = []

    for planned_action in plan["actions"]:

        tool_name = planned_action["tool"]
        arguments = planned_action["arguments"]

        # ----------------------------------------------------
        # Execute tool
        # ----------------------------------------------------

        result = execute_tool(
            tool_name,
            arguments
        )

        # ----------------------------------------------------
        # Verify result
        # ----------------------------------------------------

        verification = verify_action(
            tool_name,
            result
        )

        # ----------------------------------------------------
        # Build action result
        # ----------------------------------------------------

        action = {
            "tool": tool_name,
            "arguments": arguments,
            "result": result,
            "verification": verification
        }

        actions.append(action)

        # ----------------------------------------------------
        # Handle approval-required actions
        # ----------------------------------------------------

        if result.get("status") == "approval_required":

            approvals.append(action)

            pending_approvals.append({
                "tool": tool_name,
                "arguments": arguments
            })

    # --------------------------------------------------------
    # 4. Determine overall status
    # --------------------------------------------------------

    if approvals:

        status = "waiting_for_approval"

    else:

        # Check whether all actions were verified
        all_verified = all(
            action["verification"]["verified"]
            for action in actions
        )

        if all_verified:
            status = "completed"
        else:
            status = "verification_failed"

    # --------------------------------------------------------
    # 5. Return response
    # --------------------------------------------------------

    return {
        "goal": request.goal,
        "status": status,
        "actions": actions,
        "approvals_required": approvals
    }


# ============================================================
# APPROVE ACTION
# ============================================================

@app.post("/approve")
def approve_action(request: ApprovalRequest):

    approval = None

    # --------------------------------------------------------
    # Find matching pending approval
    # --------------------------------------------------------

    for item in pending_approvals:

        if (
            item["tool"] == request.tool
            and item["arguments"] == request.arguments
        ):

            approval = item
            break

    # --------------------------------------------------------
    # Approval not found
    # --------------------------------------------------------

    if approval is None:

        raise HTTPException(
            status_code=404,
            detail="Approval request not found"
        )

    # --------------------------------------------------------
    # Remove approval from pending list
    # --------------------------------------------------------

    pending_approvals.remove(approval)

    # --------------------------------------------------------
    # Execute approved action
    # --------------------------------------------------------

    result = execute_approved_tool(
        request.tool,
        request.arguments
    )

    # --------------------------------------------------------
    # Verify approved action
    # --------------------------------------------------------

    verification = verify_action(
        request.tool,
        result
    )

    # --------------------------------------------------------
    # Return final result
    # --------------------------------------------------------

    return {
        "status": (
            "completed"
            if verification["verified"]
            else "verification_failed"
        ),
        "message": "Action approved and executed.",
        "action": {
            "tool": request.tool,
            "arguments": request.arguments,
            "result": result,
            "verification": verification
        }
    }

@app.post("/reject")
def reject_action(request: RejectRequest):

    rejection = None

    for item in pending_approvals:
        if (
            item["tool"] == request.tool
            and item["arguments"] == request.arguments
        ):
            rejection = item
            break

    if rejection is None:
        raise HTTPException(
            status_code=404,
            detail="Approval request not found"
        )

    pending_approvals.remove(rejection)

    return {
        "status": "rejected",
        "message": "Action was rejected by the user.",
        "action": {
            "tool": request.tool,
            "arguments": request.arguments
        }
    }

# ============================================================
# EXECUTE APPROVED TOOL
# ============================================================

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