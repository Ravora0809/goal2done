from fastapi import FastAPI, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
import os
import uuid

from planner import plan_goal
from executor import execute_tool, run_tool
from verifier import verify_action
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
    get_history,
    get_reminders,
    update_reminder_record,
    delete_reminder_record,
)

from google_auth import (
    authorization_url,
    exchange_code,
    google_user,
    make_state,
    verify_state,
    create_session,
    verify_session,
    save_connection,
)
from user_store import upsert_user, get_user

from reminder_scheduler import (
    start_reminder_scheduler,
    stop_reminder_scheduler,
)


# ==========================================================
# APP LIFESPAN
# ==========================================================

@asynccontextmanager
async def lifespan(app: FastAPI):

    if os.getenv("VERCEL") != "1":
        start_reminder_scheduler()

    yield

    if os.getenv("VERCEL") != "1":
        stop_reminder_scheduler()


# ==========================================================
# APP
# ==========================================================

app = FastAPI(
    title="Goal2Done",
    description="Autonomous personal operations agent",
    version="0.4",
    lifespan=lifespan,
)


# ==========================================================
# CORS
# ==========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
    "http://localhost:5173",
    "https://goal2done.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================================
# DATABASE
# ==========================================================

init_db()


# ==========================================================
# MODELS
# ==========================================================

class GoalRequest(BaseModel):
    goal: str


class ApprovalRequest(BaseModel):
    approval_id: str


class RejectRequest(BaseModel):
    approval_id: str


# ==========================================================
# ROOT
# ==========================================================

@app.get("/")
def root():

    return {
        "name": "Goal2Done",
        "status": "running",
        "version": "0.4",
    }


# ==========================================================
# AUTHENTICATION / GOOGLE CONNECTION
# ==========================================================

def get_current_user(request: Request):
    token = request.cookies.get("goal2done_session")
    user_id = verify_session(token) if token else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Please sign in with Google first.")
    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User session is no longer valid. Please sign in again.")
    return user


@app.get("/auth/google/login")
def google_login():
    try:
        response = Response(status_code=307)
        response.headers["Location"] = authorization_url(make_state())
        return response
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Google login configuration failed: {exc}",
        )


@app.get("/auth/google/callback")
def google_callback(code: str, state: str):
    if not verify_state(state):
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state.")

    try:
        credentials = exchange_code(code)
        profile = google_user(credentials)
        google_sub = profile.get("id")
        email = profile.get("email", "")
        name = profile.get("name", email)
        if not google_sub:
            raise RuntimeError("Google did not return a unique user ID.")

        user_id = "usr_" + uuid.uuid5(uuid.NAMESPACE_URL, "goal2done:google:" + google_sub).hex
        upsert_user(user_id, google_sub, email, name)
        save_connection(user_id, credentials)

        frontend_url = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")

        # Keep local frontend/backend on the same host so the session
        # cookie can be sent correctly by the browser.
        if frontend_url.startswith("http://localhost:"):
            frontend_url = frontend_url.replace(
                "http://localhost:",
                "http://127.0.0.1:",
                1,
            )

        response = Response(status_code=307)
        response.headers["Location"] = frontend_url
        response.set_cookie(
            key="goal2done_session",
            value=create_session(user_id),
            httponly=True,
            secure=os.getenv("COOKIE_SECURE", "0") == "1",
            samesite="none" if os.getenv("COOKIE_SAMESITE_NONE", "0") == "1" else "lax",
            max_age=60 * 60 * 24 * 7,
            path="/",
        )
        return response
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Google authentication failed: {exc}")


@app.get("/auth/me")
def auth_me(user=Depends(get_current_user)):
    return {"authenticated": True, "user": user}


@app.get("/auth/logout")
def auth_logout():
    response = Response(status_code=204)
    response.delete_cookie("goal2done_session", path="/")
    return response


@app.get("/auth/google/state")
def google_state():
    return {"state": make_state()}


# ==========================================================
# CREATE GOAL
# ==========================================================

@app.post("/goal")
def process_goal(request: GoalRequest, user=Depends(get_current_user)):

    # ======================================================
    # 1. ASK PLANNER TO CREATE PLAN
    # ======================================================

    plan = plan_goal(request.goal)

    # ======================================================
    # 2. MISSING INFORMATION
    # ======================================================

    if plan.get("needs_clarification"):

        return {
            "goal": request.goal,
            "status": "needs_clarification",
            "questions": plan.get(
                "questions",
                []
            ),
            "actions": [],
            "approvals_required": [],
        }

    # ======================================================
    # 3. CREATE PERSISTENT GOAL
    # ======================================================

    goal_id = create_goal(
        request.goal,
        user_id=user["id"],
    )

    actions = []
    approvals = []

    # ======================================================
    # 4. RUNTIME EXECUTION CONTEXT
    # ======================================================

    execution_context = {
        "goal": request.goal,

        "constraints": {},

        "results": [],

        "completed_actions": [],

        "failed_actions": [],
    }

    # ======================================================
    # 5. GET PLANNED ACTIONS
    # ======================================================

    planned_actions = plan.get(
        "actions",
        []
    )

    # ======================================================
    # 6. EXECUTE PLAN
    # ======================================================

    for planned_action in planned_actions:

        tool_name = planned_action["tool"]

        arguments = planned_action.get(
            "arguments",
            {}
        )

        # Never modify planner output directly.
        tool_arguments = arguments.copy()

        # ==================================================
        # RISK CHECK
        # ==================================================

        if requires_approval(tool_name):

            # ------------------------------------------------
            # Create execution record
            # ------------------------------------------------

            execution_id = create_execution(
                goal_id=goal_id,
                tool=tool_name,
                arguments=arguments,
                status="pending_approval",
            )

            # ------------------------------------------------
            # Create approval record
            # ------------------------------------------------

            approval_id = create_approval(
                execution_id
            )

            # ------------------------------------------------
            # IMPORTANT
            #
            # The tool has NOT executed yet.
            #
            # Therefore we must NOT call:
            #
            # verify_action(tool_name, result)
            #
            # because the reminder does not exist yet.
            # ------------------------------------------------

            result = {
                "status": "approval_required",
                "risk": "medium",
                "message": (
                    f"Goal2Done wants to "
                    f"execute {tool_name}"
                ),
                "approval_id": approval_id,
            }

            # ------------------------------------------------
            # Approval is a WAITING state.
            #
            # It is NOT a failure.
            # ------------------------------------------------

            verification = {
                "verified": False,
                "status": "awaiting_approval",
                "category": "APPROVAL",
                "message": (
                    "Action is waiting for user approval."
                ),
            }

            # ------------------------------------------------
            # Save pending execution
            # ------------------------------------------------

            update_execution(
                execution_id,
                "pending_approval",
                result,
                verification,
            )

            # ------------------------------------------------
            # Build frontend action
            # ------------------------------------------------

            action = {
                "action_id": planned_action.get(
                    "id"
                ),

                "execution_id": execution_id,

                "approval_id": approval_id,

                "tool": tool_name,

                "arguments": arguments,

                "depends_on": planned_action.get(
                    "depends_on",
                    []
                ),

                "expected_outcome":
                    planned_action.get(
                        "expected_outcome"
                    ),

                "result": result,

                "verification": verification,

                "status": "waiting_for_approval",
            }

            actions.append(action)

            approvals.append(action)

            # ------------------------------------------------
            # Store approval state in context
            # ------------------------------------------------

            execution_context[
                "results"
            ].append(action)

            # ------------------------------------------------
            # IMPORTANT:
            #
            # Do NOT add this to completed_actions.
            #
            # Do NOT add this to failed_actions.
            #
            # It is simply waiting for the user.
            # ------------------------------------------------

            continue

        # ==================================================
        # NORMAL / SAFE ACTION
        # ==================================================

        execution_id = create_execution(
            goal_id=goal_id,
            tool=tool_name,
            arguments=arguments,
            status="executing",
        )

        # ==================================================
        # PASS CONTEXT TO generate_answer
        # ==================================================

        if tool_name == "generate_answer":

            tool_arguments[
                "context"
            ] = execution_context

        # ==================================================
        # EXECUTE TOOL
        # ==================================================

        try:

            result = execute_tool(
                tool_name,
                tool_arguments,
                user_id=user["id"],
            )

        except Exception as e:

            result = {
                "status": "error",
                "message": str(e),
            }

        # ==================================================
        # VERIFY RESULT
        # ==================================================

        verification = verify_action(
            tool_name,
            result,
        )

        # ==================================================
        # DETERMINE EXECUTION STATUS
        # ==================================================

        if verification.get("verified"):

            execution_status = "completed"

        else:

            execution_status = "failed"

        # ==================================================
        # UPDATE EXECUTION
        # ==================================================

        update_execution(
            execution_id,
            execution_status,
            result,
            verification,
        )

        # ==================================================
        # STORE RESULT IN CONTEXT
        # ==================================================

        context_result = {
            "tool": tool_name,

            "arguments": arguments,

            "result": result,

            "verification": verification,
        }

        execution_context[
            "results"
        ].append(
            context_result
        )

        # ==================================================
        # TRACK SUCCESS / FAILURE
        # ==================================================

        if verification.get("verified"):

            execution_context[
                "completed_actions"
            ].append(
                context_result
            )

        else:

            execution_context[
                "failed_actions"
            ].append(
                context_result
            )

        # ==================================================
        # BUILD ACTION RESPONSE
        # ==================================================

        action = {
            "action_id": planned_action.get(
                "id"
            ),

            "execution_id": execution_id,

            "tool": tool_name,

            "arguments": arguments,

            "depends_on": planned_action.get(
                "depends_on",
                []
            ),

            "expected_outcome":
                planned_action.get(
                    "expected_outcome"
                ),

            "result": result,

            "verification": verification,

            "status": execution_status,
        }

        actions.append(action)

    # ======================================================
    # 7. DETERMINE GOAL STATUS
    # ======================================================

    completed_count = 0
    failed_count = 0

    for action in actions:

        status = action.get(
            "status"
        )

        if status == "completed":

            completed_count += 1

        elif status in [
            "failed",
            "error",
            "verification_failed",
        ]:

            failed_count += 1

    # ------------------------------------------------------
    # Approval takes priority over completed state.
    # ------------------------------------------------------

    if approvals:

        goal_status = (
            "waiting_for_approval"
        )

    elif failed_count > 0:

        goal_status = (
            "verification_failed"
        )

    elif completed_count == len(actions) and actions:

        goal_status = "completed"

    else:

        goal_status = (
            "verification_failed"
        )

    # ======================================================
    # 8. UPDATE GOAL
    # ======================================================

    update_goal_status(
        goal_id,
        goal_status,
    )

    # ======================================================
    # 9. EXECUTION SUMMARY
    # ======================================================

    execution_summary = {

        "total_actions":
            len(actions),

        "completed_actions":
            completed_count,

        "failed_actions":
            failed_count,

        "blocked_actions":
            0,

        "waiting_for_approval":
            len(approvals),
    }

    # ======================================================
    # 10. RETURN RESULT
    # ======================================================

    return {

        "goal_id":
            goal_id,

        "goal":
            request.goal,

        "status":
            goal_status,

        "actions":
            actions,

        "approvals_required":
            approvals,

        "execution_summary":
            execution_summary,
    }


# ==========================================================
# APPROVE
# ==========================================================

@app.post("/approve")
def approve_action(
    request: ApprovalRequest,
    user=Depends(get_current_user),
):

    # ======================================================
    # 1. GET APPROVAL
    # ======================================================

    approval = get_approval(
        request.approval_id
    )

    if not approval:

        raise HTTPException(
            status_code=404,
            detail="Approval not found",
        )

    if approval.get("user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="This approval does not belong to the signed-in user.")

    # ======================================================
    # 2. CHECK APPROVAL STATUS
    # ======================================================

    if approval[
        "approval_status"
    ] != "pending":

        raise HTTPException(
            status_code=400,
            detail=(
                "This approval has already "
                "been resolved."
            ),
        )

    execution_id = approval[
        "execution_id"
    ]

    tool_name = approval[
        "tool"
    ]

    arguments = approval[
        "arguments"
    ]

    # ======================================================
    # 3. MARK APPROVAL AS APPROVED
    # ======================================================

    resolve_approval(
        request.approval_id,
        "approved",
    )

    # ======================================================
    # 4. EXECUTE APPROVED ACTION
    # ======================================================

    try:

        result = run_tool(
            tool_name,
            arguments,
            user_id=user["id"],
        )

    except Exception as e:

        result = {
            "status": "error",
            "message": str(e),
        }

    # ======================================================
    # 5. NOW VERIFY THE ACTION
    #
    # IMPORTANT:
    #
    # Verification happens AFTER approval and execution.
    # ======================================================

    verification = verify_action(
        tool_name,
        result,
    )

    if verification.get("verified"):

        execution_status = "completed"

    else:

        execution_status = "failed"

    # ======================================================
    # 6. UPDATE EXECUTION
    # ======================================================

    update_execution(
        execution_id,
        execution_status,
        result,
        verification,
    )

    # ======================================================
    # 7. UPDATE GOAL STATUS
    # ======================================================

    goal_id = approval[
        "goal_id"
    ]

    executions = get_goal_executions(
        goal_id
    )

    # ------------------------------------------------------
    # Check pending approvals
    # ------------------------------------------------------

    pending_approvals = any(
        execution.get("status")
        == "pending_approval"
        for execution in executions
    )

    # ------------------------------------------------------
    # Check failures
    # ------------------------------------------------------

    failed_executions = any(
        execution.get("status")
        in [
            "failed",
            "error",
            "verification_failed",
        ]
        for execution in executions
    )

    # ------------------------------------------------------
    # Determine final goal state
    # ------------------------------------------------------

    if pending_approvals:

        goal_status = (
            "waiting_for_approval"
        )

    elif failed_executions:

        goal_status = (
            "verification_failed"
        )

    elif executions and all(
        execution.get("status")
        == "completed"
        for execution in executions
    ):

        goal_status = "completed"

    else:

        goal_status = (
            "verification_failed"
        )

    update_goal_status(
        goal_id,
        goal_status,
    )

    # ======================================================
    # 8. RETURN
    # ======================================================

    return {

        "status":
            goal_status,

        "message":
            "Action approved and executed.",

        "goal_id":
            goal_id,

        "action": {

            "execution_id":
                execution_id,

            "approval_id":
                request.approval_id,

            "tool":
                tool_name,

            "arguments":
                arguments,

            "result":
                result,

            "verification":
                verification,
        },
    }


# ==========================================================
# REJECT
# ==========================================================

@app.post("/reject")
def reject_action(
    request: RejectRequest,
    user=Depends(get_current_user),
):

    # ======================================================
    # 1. GET APPROVAL
    # ======================================================

    approval = get_approval(
        request.approval_id
    )

    if not approval:

        raise HTTPException(
            status_code=404,
            detail="Approval not found",
        )


    if approval.get("user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="This approval does not belong to the signed-in user.")

    # ======================================================
    # 2. CHECK APPROVAL STATUS
    # ======================================================

    if approval[
        "approval_status"
    ] != "pending":

        raise HTTPException(
            status_code=400,
            detail=(
                "This approval has already "
                "been resolved."
            ),
        )

    # ======================================================
    # 3. REJECT APPROVAL
    # ======================================================

    resolve_approval(
        request.approval_id,
        "rejected",
    )

    # ======================================================
    # 4. UPDATE EXECUTION
    # ======================================================

    update_execution(
        approval["execution_id"],
        "rejected",
        {
            "status": "rejected",
            "message": (
                "Action rejected by user."
            ),
        },
        {
            "verified": False,
            "status": "rejected",
            "category": "APPROVAL",
            "message": (
                "Action was rejected by the user."
            ),
        },
    )

    # ======================================================
    # 5. UPDATE GOAL
    # ======================================================

    update_goal_status(
        approval["goal_id"],
        "rejected",
    )

    # ======================================================
    # 6. RETURN
    # ======================================================

    return {

        "status":
            "rejected",

        "goal_id":
            approval["goal_id"],

        "message":
            "Action was rejected by the user.",

        "action": {

            "execution_id":
                approval["execution_id"],

            "approval_id":
                request.approval_id,

            "tool":
                approval["tool"],

            "arguments":
                approval["arguments"],
        },
    }


# ==========================================================
# GOAL HISTORY
# ==========================================================

@app.get("/history")
def history(user=Depends(get_current_user)):

    return {
        "history":
            get_history(user_id=user["id"])
    }


# ==========================================================
# SINGLE GOAL HISTORY
# ==========================================================

@app.get("/history/{goal_id}")
def goal_history(
    goal_id: str,
    user=Depends(get_current_user),
):

    goal = get_goal(
        goal_id
    )

    if not goal:

        raise HTTPException(
            status_code=404,
            detail="Goal not found",
        )

    if goal.get("user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="This goal does not belong to the signed-in user.")

    return {

        "goal":
            goal,

        "executions":
            get_goal_executions(
                goal_id
            ),
    }


# ==========================================================
# GOOGLE CALENDAR API
# ==========================================================

@app.get("/calendar/events")
def calendar_events(
    start_time: str | None = None,
    end_time: str | None = None,
    max_results: int = 100,
    user=Depends(get_current_user),
):
    from tools import calendar_list_events_tool
    result = calendar_list_events_tool(
        start_time=start_time,
        end_time=end_time,
        max_results=max_results,
        user_id=user["id"],
    )
    if result.get("status") != "success":
        raise HTTPException(status_code=502, detail=result.get("message", "Calendar request failed."))
    return {"status": "success", "events": result.get("events", [])}


# ==========================================================
# REMINDERS
# ==========================================================

@app.get("/reminders")
def reminders(user=Depends(get_current_user)):

    return {

        "reminders":
            get_reminders(user_id=user["id"])
    }
# ==========================================================
# UPDATE REMINDER
# ==========================================================

class ReminderUpdateRequest(BaseModel):

    title: str

    time: str


@app.put("/reminders/{reminder_id}")
def update_reminder_endpoint(
    reminder_id: str,
    request: ReminderUpdateRequest,
    user=Depends(get_current_user),
):

    existing = __import__("database").get_reminder(reminder_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Reminder not found")
    if existing.get("user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="This reminder does not belong to the signed-in user.")

    from tools import update_reminder

    result = update_reminder(
        reminder_id=reminder_id,
        title=request.title,
        time=request.time,
        user_id=user["id"],
    )

    if result.get("status") != "success":

        raise HTTPException(
            status_code=400,
            detail=result.get(
                "message",
                "Failed to update reminder.",
            ),
        )

    return result


# ==========================================================
# DELETE REMINDER
# ==========================================================

@app.delete("/reminders/{reminder_id}")
def delete_reminder_endpoint(
    reminder_id: str,
    user=Depends(get_current_user),
):

    existing = __import__("database").get_reminder(reminder_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Reminder not found")
    if existing.get("user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="This reminder does not belong to the signed-in user.")

    from tools import delete_reminder

    result = delete_reminder(
        reminder_id=reminder_id,
        user_id=user["id"]
    )

    if result.get("status") != "success":

        raise HTTPException(
            status_code=400,
            detail=result.get(
                "message",
                "Failed to delete reminder.",
            ),
        )

    return result
