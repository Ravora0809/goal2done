from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from reminder_scheduler import start_reminder_scheduler
from planner import plan_goal
from executor import execute_tool, run_tool
from verifier import verify_action
from database import get_reminders

from firewall import requires_approval

from database import (
    init_db,
    create_goal,
    update_goal_status,
    get_goal,
    create_execution,
    update_execution,
    get_execution,
    create_approval,
    get_approval,
    resolve_approval,
    get_goal_executions,
    get_history
)
from contextlib import asynccontextmanager

from reminder_scheduler import (
    start_reminder_scheduler,
    stop_reminder_scheduler
)

# ==========================================
# APP
# ==========================================
 
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_reminder_scheduler()

    yield

    stop_reminder_scheduler()


app = FastAPI(
    title="Goal2Done",
    description="Autonomous personal operations agent",
    version="0.2",
    lifespan=lifespan,
)

# ==========================================
# CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# DATABASE
# ==========================================

init_db()
 

# ==========================================
# MODELS
# ==========================================

class GoalRequest(BaseModel):
    goal: str


class ApprovalRequest(BaseModel):
    approval_id: str


class RejectRequest(BaseModel):
    approval_id: str


# ==========================================
# ROOT
# ==========================================

@app.get("/")
def root():

    return {
        "name": "Goal2Done",
        "status": "running",
        "version": "0.2"
    }


# ==========================================
# CREATE GOAL
# ==========================================

@app.post("/goal")
def process_goal(request: GoalRequest):

    # --------------------------------------
    # Ask Groq to create plan
    # --------------------------------------

    plan = plan_goal(request.goal)

    # --------------------------------------
    # Missing information
    # --------------------------------------

    if plan.get("needs_clarification"):

        return {
            "goal": request.goal,
            "status": "needs_clarification",
            "questions": plan.get(
                "questions",
                []
            ),
            "actions": [],
            "approvals_required": []
        }

    # --------------------------------------
    # Create persistent goal
    # --------------------------------------

    goal_id = create_goal(
        request.goal
    )

    actions = []
    approvals = []

    # --------------------------------------
    # Execute plan
    # --------------------------------------

    for planned_action in plan.get(
        "actions",
        []
    ):

        tool_name = planned_action["tool"]

        arguments = planned_action[
            "arguments"
        ]

        # ----------------------------------
        # Risky action
        # ----------------------------------

        if requires_approval(tool_name):

            execution_id = create_execution(
                goal_id=goal_id,
                tool=tool_name,
                arguments=arguments,
                status="pending_approval"
            )

            approval_id = create_approval(
                execution_id
            )

            result = {
                "status": "approval_required",
                "risk": "medium",
                "message": (
                    f"Goal2Done wants to "
                    f"execute {tool_name}"
                ),
                "approval_id": approval_id
            }

            verification = verify_action(
                tool_name,
                result
            )

            update_execution(
                execution_id,
                "pending_approval",
                result,
                verification
            )

            action = {
                "execution_id": execution_id,
                "approval_id": approval_id,
                "tool": tool_name,
                "arguments": arguments,
                "result": result,
                "verification": verification
            }

            actions.append(action)
            approvals.append(action)

            continue

        # ----------------------------------
        # Safe action
        # ----------------------------------

        execution_id = create_execution(
            goal_id=goal_id,
            tool=tool_name,
            arguments=arguments,
            status="executing"
        )

        result = execute_tool(
            tool_name,
            arguments
        )

        verification = verify_action(
            tool_name,
            result
        )

        execution_status = (
            "completed"
            if verification["verified"]
            else "failed"
        )

        update_execution(
            execution_id,
            execution_status,
            result,
            verification
        )

        action = {
            "execution_id": execution_id,
            "tool": tool_name,
            "arguments": arguments,
            "result": result,
            "verification": verification
        }

        actions.append(action)

    # ======================================
    # DETERMINE GOAL STATUS
    # ======================================

    if approvals:

        goal_status = "waiting_for_approval"

    else:

        all_verified = all(
            action["verification"]["verified"]
            for action in actions
        )

        goal_status = (
            "completed"
            if all_verified
            else "verification_failed"
        )

    update_goal_status(
        goal_id,
        goal_status
    )

    return {
        "goal_id": goal_id,
        "goal": request.goal,
        "status": goal_status,
        "actions": actions,
        "approvals_required": approvals
    }


# ==========================================
# APPROVE
# ==========================================

@app.post("/approve")
def approve_action(
    request: ApprovalRequest
):

    approval = get_approval(
        request.approval_id
    )

    if not approval:

        raise HTTPException(
            status_code=404,
            detail="Approval not found"
        )

    if approval["approval_status"] != "pending":

        raise HTTPException(
            status_code=400,
            detail=(
                "This approval has already "
                "been resolved."
            )
        )

    execution_id = approval[
        "execution_id"
    ]

    tool_name = approval["tool"]

    arguments = approval["arguments"]

    # --------------------------------------
    # Mark approval approved
    # --------------------------------------

    resolve_approval(
        request.approval_id,
        "approved"
    )

    # --------------------------------------
    # Execute
    # --------------------------------------

    result = run_tool(
        tool_name,
        arguments
    )

    verification = verify_action(
        tool_name,
        result
    )

    execution_status = (
        "completed"
        if verification["verified"]
        else "failed"
    )

    update_execution(
        execution_id,
        execution_status,
        result,
        verification
    )

    # --------------------------------------
    # Update goal status
    # --------------------------------------

    goal_id = approval["goal_id"]

    executions = get_goal_executions(
        goal_id
    )

    if any(
        execution["status"]
        == "pending_approval"
        for execution in executions
    ):

        goal_status = (
            "waiting_for_approval"
        )

    elif all(
        execution["status"]
        == "completed"
        for execution in executions
    ):

        goal_status = "completed"

    else:

        goal_status = "verification_failed"

    update_goal_status(
        goal_id,
        goal_status
    )

    return {
        "status": goal_status,
        "message": (
            "Action approved and executed."
        ),
        "goal_id": goal_id,
        "action": {
            "execution_id": execution_id,
            "approval_id": request.approval_id,
            "tool": tool_name,
            "arguments": arguments,
            "result": result,
            "verification": verification
        }
    }


# ==========================================
# REJECT
# ==========================================

@app.post("/reject")
def reject_action(
    request: RejectRequest
):

    approval = get_approval(
        request.approval_id
    )

    if not approval:

        raise HTTPException(
            status_code=404,
            detail="Approval not found"
        )

    if approval["approval_status"] != "pending":

        raise HTTPException(
            status_code=400,
            detail=(
                "This approval has already "
                "been resolved."
            )
        )

    # --------------------------------------
    # Reject
    # --------------------------------------

    resolve_approval(
        request.approval_id,
        "rejected"
    )

    update_execution(
        approval["execution_id"],
        "rejected",
        {
            "status": "rejected",
            "message": (
                "Action rejected by user."
            )
        },
        {
            "verified": False,
            "status": "rejected",
            "message": (
                "Action was rejected by the user."
            )
        }
    )

    # --------------------------------------
    # Update goal
    # --------------------------------------

    update_goal_status(
        approval["goal_id"],
        "rejected"
    )

    return {
        "status": "rejected",
        "goal_id": approval["goal_id"],
        "message": (
            "Action was rejected by the user."
        ),
        "action": {
            "execution_id":
                approval["execution_id"],
            "approval_id":
                request.approval_id,
            "tool":
                approval["tool"],
            "arguments":
                approval["arguments"]
        }
    }


# ==========================================
# GOAL HISTORY
# ==========================================

@app.get("/history")
def history():

    return {
        "history": get_history()
    }


# ==========================================
# SINGLE GOAL HISTORY
# ==========================================

@app.get("/history/{goal_id}")
def goal_history(
    goal_id: str
):

    goal = get_goal(goal_id)

    if not goal:

        raise HTTPException(
            status_code=404,
            detail="Goal not found"
        )

    return {
        "goal": goal,
        "executions":
            get_goal_executions(goal_id)
    }
    
@app.get("/reminders")
def reminders():

    return {
        "reminders": get_reminders()
    }
 