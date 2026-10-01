from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager

from planner import plan_goal
from executor import execute_tool, run_tool
from verifier import verify_action
from firewall import requires_approval
from google_calendar import calendar_list_events
from google_drive import drive_list_files, drive_search, drive_read_file
from google_docs import docs_create_document, docs_read_document, docs_append_text
from google_sheets import sheets_create_spreadsheet, sheets_read_values, sheets_write_values, sheets_append_values, sheets_clear_values

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

from reminder_scheduler import (
    start_reminder_scheduler,
    stop_reminder_scheduler,
)


# ==========================================================
# APP LIFESPAN
# ==========================================================

@asynccontextmanager
async def lifespan(app: FastAPI):

    start_reminder_scheduler()

    yield

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
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================================
# GOOGLE DOCS / SHEETS TEST ENDPOINTS
# ==========================================================

@app.post("/docs/create")
def create_google_doc(title: str, content: str = ""):
    return docs_create_document(title=title, content=content)


@app.get("/docs/{document_id}")
def get_google_doc(document_id: str, max_chars: int = 50000):
    return docs_read_document(document_id=document_id, max_chars=max_chars)


@app.post("/docs/{document_id}/append")
def append_google_doc(document_id: str, content: str):
    return docs_append_text(document_id=document_id, content=content)


@app.post("/sheets/create")
def create_google_sheet(title: str):
    return sheets_create_spreadsheet(title=title)


@app.get("/sheets/{spreadsheet_id}/values")
def get_google_sheet_values(spreadsheet_id: str, range_name: str):
    return sheets_read_values(spreadsheet_id=spreadsheet_id, range_name=range_name)


@app.post("/sheets/{spreadsheet_id}/values")
def write_google_sheet_values(spreadsheet_id: str, range_name: str, values: list, input_option: str = "USER_ENTERED"):
    return sheets_write_values(spreadsheet_id=spreadsheet_id, range_name=range_name, values=values, input_option=input_option)


@app.post("/sheets/{spreadsheet_id}/append")
def append_google_sheet_values(spreadsheet_id: str, range_name: str, values: list, input_option: str = "USER_ENTERED"):
    return sheets_append_values(spreadsheet_id=spreadsheet_id, range_name=range_name, values=values, input_option=input_option)


@app.post("/sheets/{spreadsheet_id}/clear")
def clear_google_sheet_values(spreadsheet_id: str, range_name: str):
    return sheets_clear_values(spreadsheet_id=spreadsheet_id, range_name=range_name)




# ==========================================================
# GOOGLE DRIVE READ API
# ==========================================================

@app.get("/drive/files")
def get_drive_files(
    folder_id: str | None = None,
    max_results: int = 20,
):
    return drive_list_files(
        folder_id=folder_id,
        max_results=max_results,
    )


@app.get("/drive/search")
def search_drive_files(
    query: str,
    max_results: int = 20,
):
    return drive_search(
        query=query,
        max_results=max_results,
    )


@app.get("/drive/file/{file_id}")
def read_drive_file(
    file_id: str,
    max_chars: int = 50000,
):
    return drive_read_file(
        file_id=file_id,
        max_chars=max_chars,
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
# CALENDAR EVENTS
# ==========================================================

@app.get("/calendar/events")
def get_calendar_events(
    start_time: str | None = None,
    end_time: str | None = None,
    max_results: int = 100,
):
    """Return Google Calendar events for the frontend calendar view."""

    result = calendar_list_events(
        start_time=start_time,
        end_time=end_time,
        max_results=max_results,
    )

    if result.get("status") != "success":
        raise HTTPException(
            status_code=502,
            detail=result.get("message", "Could not read Google Calendar."),
        )

    return result


# ==========================================================
# CREATE GOAL
# ==========================================================

@app.post("/goal")
def process_goal(request: GoalRequest):

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
        request.goal
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
def history():

    return {
        "history":
            get_history()
    }


# ==========================================================
# SINGLE GOAL HISTORY
# ==========================================================

@app.get("/history/{goal_id}")
def goal_history(
    goal_id: str,
):

    goal = get_goal(
        goal_id
    )

    if not goal:

        raise HTTPException(
            status_code=404,
            detail="Goal not found",
        )

    return {

        "goal":
            goal,

        "executions":
            get_goal_executions(
                goal_id
            ),
    }


# ==========================================================
# REMINDERS
# ==========================================================

@app.get("/reminders")
def reminders():

    return {

        "reminders":
            get_reminders()
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
):

    from tools import update_reminder

    result = update_reminder(
        reminder_id=reminder_id,
        title=request.title,
        time=request.time,
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
):

    from tools import delete_reminder

    result = delete_reminder(
        reminder_id=reminder_id
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