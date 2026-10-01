import sqlite3
import json
import uuid
import os
from datetime import datetime, timezone
import os

 

# Vercel deployment filesystems are read-only.
# Keep local development persistent, but use /tmp on Vercel.
 
if os.getenv("VERCEL") == "1":
    DB_PATH = "/tmp/goal2done.db"
else:
    DB_PATH = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "goal2done.db"
    )


# ==========================================================
# CONNECTION
# ==========================================================

def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def now():
    return datetime.now(timezone.utc).isoformat()


# ==========================================================
# DATABASE INITIALIZATION
# ==========================================================

def init_db():

    connection = get_connection()
    cursor = connection.cursor()

    # ======================================================
    # GOALS
    # ======================================================

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS goals (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            goal TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    # ------------------------------------------------------
    # Migration for clarification support
    # ------------------------------------------------------

    columns = {
        row["name"]
        for row in cursor.execute(
            "PRAGMA table_info(goals)"
        ).fetchall()
    }

    if "clarification_questions" not in columns:
        cursor.execute("""
            ALTER TABLE goals
            ADD COLUMN clarification_questions TEXT
        """)

    if "clarification_answer" not in columns:
        cursor.execute("""
            ALTER TABLE goals
            ADD COLUMN clarification_answer TEXT
        """)

    if "user_id" not in columns:
        cursor.execute("""
            ALTER TABLE goals
            ADD COLUMN user_id TEXT
        """)

    # ======================================================
    # EXECUTIONS
    # ======================================================

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS executions (
            id TEXT PRIMARY KEY,
            goal_id TEXT NOT NULL,
            tool TEXT NOT NULL,
            arguments TEXT NOT NULL,
            status TEXT NOT NULL,
            result TEXT,
            verification TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,

            FOREIGN KEY (goal_id)
            REFERENCES goals(id)
        )
    """)

    # ======================================================
    # APPROVALS
    # ======================================================

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS approvals (
            id TEXT PRIMARY KEY,
            execution_id TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            resolved_at TEXT,

            FOREIGN KEY (execution_id)
            REFERENCES executions(id)
        )
    """)

    # ======================================================
    # REMINDERS
    # ======================================================

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reminders (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT NOT NULL,
            remind_at TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,
            triggered_at TEXT
        )
    """)

    reminder_columns = {row["name"] for row in cursor.execute("PRAGMA table_info(reminders)").fetchall()}
    if "user_id" not in reminder_columns:
        cursor.execute("ALTER TABLE reminders ADD COLUMN user_id TEXT")

    connection.commit()
    connection.close()


# ==========================================================
# GOALS
# ==========================================================

def create_goal(goal: str, user_id: str | None = None):

    goal_id = str(uuid.uuid4())
    timestamp = now()

    connection = get_connection()

    connection.execute(
        """
        INSERT INTO goals
        (
            id,
            user_id,
            goal,
            status,
            created_at,
            updated_at,
            clarification_questions,
            clarification_answer
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            goal_id,
            user_id,
            goal,
            "planning",
            timestamp,
            timestamp,
            None,
            None
        )
    )

    connection.commit()
    connection.close()

    return goal_id


def update_goal_status(goal_id: str, status: str):

    connection = get_connection()

    connection.execute(
        """
        UPDATE goals
        SET status = ?, updated_at = ?
        WHERE id = ?
        """,
        (
            status,
            now(),
            goal_id
        )
    )

    connection.commit()
    connection.close()


def save_clarification(
    goal_id: str,
    questions: list
):

    connection = get_connection()

    connection.execute(
        """
        UPDATE goals
        SET
            status = ?,
            clarification_questions = ?,
            updated_at = ?
        WHERE id = ?
        """,
        (
            "needs_clarification",
            json.dumps(questions),
            now(),
            goal_id
        )
    )

    connection.commit()
    connection.close()


def save_clarification_answer(
    goal_id: str,
    answer: str
):

    connection = get_connection()

    connection.execute(
        """
        UPDATE goals
        SET
            clarification_answer = ?,
            clarification_questions = NULL,
            status = ?,
            updated_at = ?
        WHERE id = ?
        """,
        (
            answer,
            "planning",
            now(),
            goal_id
        )
    )

    connection.commit()
    connection.close()


def get_goal(goal_id: str):

    connection = get_connection()

    row = connection.execute(
        """
        SELECT *
        FROM goals
        WHERE id = ?
        """,
        (goal_id,)
    ).fetchone()

    connection.close()

    if not row:
        return None

    data = dict(row)

    if data.get("clarification_questions"):
        try:
            data["clarification_questions"] = json.loads(
                data["clarification_questions"]
            )
        except json.JSONDecodeError:
            data["clarification_questions"] = []

    return data


# ==========================================================
# EXECUTIONS
# ==========================================================

def create_execution(
    goal_id: str,
    tool: str,
    arguments: dict,
    status: str
):

    execution_id = str(uuid.uuid4())
    timestamp = now()

    connection = get_connection()

    connection.execute(
        """
        INSERT INTO executions
        (
            id,
            goal_id,
            tool,
            arguments,
            status,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            execution_id,
            goal_id,
            tool,
            json.dumps(arguments),
            status,
            timestamp,
            timestamp
        )
    )

    connection.commit()
    connection.close()

    return execution_id


def update_execution(
    execution_id: str,
    status: str,
    result=None,
    verification=None
):

    connection = get_connection()

    connection.execute(
        """
        UPDATE executions
        SET
            status = ?,
            result = ?,
            verification = ?,
            updated_at = ?
        WHERE id = ?
        """,
        (
            status,
            json.dumps(result)
            if result is not None
            else None,

            json.dumps(verification)
            if verification is not None
            else None,

            now(),
            execution_id
        )
    )

    connection.commit()
    connection.close()


def get_execution(execution_id: str):

    connection = get_connection()

    row = connection.execute(
        """
        SELECT *
        FROM executions
        WHERE id = ?
        """,
        (execution_id,)
    ).fetchone()

    connection.close()

    if not row:
        return None

    data = dict(row)

    data["arguments"] = json.loads(
        data["arguments"]
    )

    if data["result"]:
        data["result"] = json.loads(
            data["result"]
        )

    if data["verification"]:
        data["verification"] = json.loads(
            data["verification"]
        )

    return data


def get_goal_executions(goal_id: str):

    connection = get_connection()

    rows = connection.execute(
        """
        SELECT *
        FROM executions
        WHERE goal_id = ?
        ORDER BY created_at ASC
        """,
        (goal_id,)
    ).fetchall()

    connection.close()

    executions = []

    for row in rows:

        data = dict(row)

        data["arguments"] = json.loads(
            data["arguments"]
        )

        if data["result"]:
            data["result"] = json.loads(
                data["result"]
            )

        if data["verification"]:
            data["verification"] = json.loads(
                data["verification"]
            )

        executions.append(data)

    return executions


# ==========================================================
# APPROVALS
# ==========================================================

def create_approval(execution_id: str):

    approval_id = str(uuid.uuid4())

    connection = get_connection()

    connection.execute(
        """
        INSERT INTO approvals
        (
            id,
            execution_id,
            status,
            created_at
        )
        VALUES (?, ?, ?, ?)
        """,
        (
            approval_id,
            execution_id,
            "pending",
            now()
        )
    )

    connection.commit()
    connection.close()

    return approval_id


def get_approval(approval_id: str):

    connection = get_connection()

    row = connection.execute(
        """
        SELECT
            a.id AS approval_id,
            a.execution_id,
            a.status AS approval_status,
            a.created_at AS approval_created_at,
            e.goal_id,
            g.user_id,
            e.tool,
            e.arguments,
            e.status AS execution_status
        FROM approvals a
        JOIN executions e
        ON a.execution_id = e.id
        LEFT JOIN goals g
        ON e.goal_id = g.id
        WHERE a.id = ?
        """,
        (approval_id,)
    ).fetchone()

    connection.close()

    if not row:
        return None

    data = dict(row)

    data["arguments"] = json.loads(
        data["arguments"]
    )

    return data


def get_approval_for_execution(
    execution_id: str
):

    connection = get_connection()

    row = connection.execute(
        """
        SELECT
            a.id AS approval_id,
            a.execution_id,
            a.status AS approval_status,
            a.created_at AS approval_created_at,
            a.resolved_at,
            e.goal_id,
            g.user_id,
            e.tool,
            e.arguments,
            e.status AS execution_status
        FROM approvals a
        JOIN executions e
        ON a.execution_id = e.id
        LEFT JOIN goals g
        ON e.goal_id = g.id
        WHERE a.execution_id = ?
        ORDER BY a.created_at DESC
        LIMIT 1
        """,
        (execution_id,)
    ).fetchone()

    connection.close()

    if not row:
        return None

    data = dict(row)

    data["arguments"] = json.loads(
        data["arguments"]
    )

    return data

def resolve_approval(
    approval_id: str,
    status: str
):

    connection = get_connection()

    connection.execute(
        """
        UPDATE approvals
        SET
            status = ?,
            resolved_at = ?
        WHERE id = ?
        """,
        (
            status,
            now(),
            approval_id
        )
    )

    connection.commit()
    connection.close()


# ==========================================================
# HISTORY
# ==========================================================

def get_history(limit=50, user_id: str | None = None):

    connection = get_connection()

    if user_id:
        rows = connection.execute(
            """
            SELECT
                g.id AS goal_id, g.goal, g.status AS goal_status, g.created_at,
                e.id AS execution_id, e.tool, e.arguments,
                e.status AS execution_status, e.result, e.verification
            FROM goals g
            LEFT JOIN executions e ON g.id = e.goal_id
            WHERE g.user_id = ?
            ORDER BY g.created_at DESC
            LIMIT ?
            """,
            (user_id, limit)
        ).fetchall()
    else:
        rows = connection.execute(
            """
            SELECT
                g.id AS goal_id, g.goal, g.status AS goal_status, g.created_at,
                e.id AS execution_id, e.tool, e.arguments,
                e.status AS execution_status, e.result, e.verification
            FROM goals g
            LEFT JOIN executions e ON g.id = e.goal_id
            ORDER BY g.created_at DESC
            LIMIT ?
            """,
            (limit,)
        ).fetchall()

    connection.close()

    history = []

    for row in rows:

        data = dict(row)

        data["arguments"] = (
            json.loads(data["arguments"])
            if data["arguments"]
            else {}
        )

        if data["result"]:
            data["result"] = json.loads(
                data["result"]
            )

        if data["verification"]:
            data["verification"] = json.loads(
                data["verification"]
            )

        history.append(data)

    return history


# ==========================================================
# REMINDERS
# ==========================================================

def create_reminder_record(
    title,
    remind_at,
    user_id: str | None = None
):

    conn = get_connection()

    reminder_id = str(uuid.uuid4())
    timestamp = datetime.now(
        timezone.utc
    ).isoformat()

    conn.execute(
        """
        INSERT INTO reminders (
            id,
            user_id,
            title,
            remind_at,
            status,
            created_at,
            triggered_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            reminder_id,
            user_id,
            title,
            remind_at,
            "pending",
            timestamp,
            None
        )
    )

    conn.commit()
    conn.close()

    return {
        "id": reminder_id,
        "title": title,
        "remind_at": remind_at,
        "status": "pending",
        "created_at": timestamp,
        "triggered_at": None
    }


def get_due_reminders(current_time):

    conn = get_connection()

    rows = conn.execute(
        """
        SELECT
            id,
            user_id,
            title,
            remind_at,
            status,
            created_at,
            triggered_at
        FROM reminders
        WHERE status = 'pending'
        AND remind_at <= ?
        ORDER BY remind_at ASC
        """,
        (current_time,)
    ).fetchall()

    conn.close()

    return [
        {
            "id": row["id"],
            "title": row["title"],
            "remind_at": row["remind_at"],
            "status": row["status"],
            "created_at": row["created_at"],
            "triggered_at": row["triggered_at"]
        }
        for row in rows
    ]


def mark_reminder_triggered(reminder_id):

    conn = get_connection()

    timestamp = datetime.now(
        timezone.utc
    ).isoformat()

    conn.execute(
        """
        UPDATE reminders
        SET
            status = 'triggered',
            triggered_at = ?
        WHERE id = ?
        """,
        (
            timestamp,
            reminder_id
        )
    )

    conn.commit()
    conn.close()

# ==========================================================
# GET ALL ACTIVE REMINDERS
# ==========================================================

def get_reminders(user_id: str | None = None):

    conn = get_connection()

    if user_id:
        rows = conn.execute(
            """
            SELECT id, title, remind_at, status, created_at, triggered_at
            FROM reminders
            WHERE status = 'pending' AND user_id = ?
            ORDER BY remind_at ASC
            """,
            (user_id,)
        ).fetchall()
    else:
        rows = conn.execute(
            """
            SELECT id, title, remind_at, status, created_at, triggered_at
            FROM reminders
            WHERE status = 'pending'
            ORDER BY remind_at ASC
            """
        ).fetchall()

    conn.close()

    return [
        {
            "id": row["id"],
            "title": row["title"],
            "remind_at": row["remind_at"],
            "status": row["status"],
            "created_at": row["created_at"],
            "triggered_at": row["triggered_at"]
        }
        for row in rows
    ]

def get_reminder(reminder_id):

    conn = get_connection()

    row = conn.execute(
        """
        SELECT
            id,
            user_id,
            title,
            remind_at,
            status,
            created_at,
            triggered_at
        FROM reminders
        WHERE id = ?
        """,
        (reminder_id,)
    ).fetchone()

    conn.close()

    if not row:
        return None

    return dict(row)


# ==========================================================
# UPDATE REMINDER
# ==========================================================

def update_reminder_record(
    reminder_id,
    title,
    remind_at,
    user_id=None
):

    conn = get_connection()

    conn.execute(
        """
        UPDATE reminders
        SET
            title = ?,
            remind_at = ?,
            status = 'pending',
            triggered_at = NULL
        WHERE id = ?
        AND status = 'pending'
        AND (? IS NULL OR user_id = ?)
        """,
        (
            title,
            remind_at,
            reminder_id,
            user_id,
            user_id,
        )
    )

    changed =  conn.total_changes

    conn.commit()

    conn.close()

    if changed == 0:

        return None

    return {
        "id": reminder_id,
        "title": title,
        "remind_at": remind_at,
        "status": "pending",
    }


# ==========================================================
# DELETE / CANCEL REMINDER
# ==========================================================

def delete_reminder_record(
    reminder_id,
    user_id=None
):

    conn = get_connection()

    conn.execute(
        """
        UPDATE reminders
        SET
            status = 'cancelled'
        WHERE id = ?
        AND status = 'pending'
        AND (? IS NULL OR user_id = ?)
        """,
        (
            reminder_id,
            user_id,
            user_id,
        )
    )

    changed = conn.total_changes

    conn.commit()

    conn.close()

    return changed > 0


# ==========================================================
# FIND REMINDER BY TITLE
# ==========================================================

def find_reminder_by_title(
    title,
    user_id=None
):

    conn = get_connection()

    rows = conn.execute(
        """
        SELECT
            id,
            title,
            remind_at,
            status,
            created_at,
            triggered_at
        FROM reminders
        WHERE status = 'pending'
        AND LOWER(title) LIKE LOWER(?)
        AND (? IS NULL OR user_id = ?)
        ORDER BY remind_at ASC
        """,
        (
            f"%{title}%",
            user_id,
            user_id,
        )
    ).fetchall()

    conn.close()

    return [
        dict(row)
        for row in rows
    ]
