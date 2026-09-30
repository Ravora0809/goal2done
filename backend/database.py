import sqlite3
import json
import uuid
from datetime import datetime, timezone


DB_PATH = "goal2done.db"


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def now():
    return datetime.now(timezone.utc).isoformat()


def init_db():

    connection = get_connection()
    cursor = connection.cursor()

    # -----------------------------
    # Goals
    # -----------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS goals (
            id TEXT PRIMARY KEY,
            goal TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    # -----------------------------
    # Executions
    # -----------------------------

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

    # -----------------------------
    # Approvals
    # -----------------------------

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
    
    #---------------------------------
    # Reminders
    #---------------------------------
    
    cursor.execute(
    """
    CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        remind_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        triggered_at TEXT
    )
    """
)

    connection.commit()
    connection.close()


# ==========================================
# GOALS
# ==========================================

def create_goal(goal: str):

    goal_id = str(uuid.uuid4())
    timestamp = now()

    connection = get_connection()

    connection.execute(
        """
        INSERT INTO goals
        (id, goal, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            goal_id,
            goal,
            "planning",
            timestamp,
            timestamp
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

    return dict(row) if row else None


# ==========================================
# EXECUTIONS
# ==========================================

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
            json.dumps(result) if result is not None else None,
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

    data["arguments"] = json.loads(data["arguments"])

    if data["result"]:
        data["result"] = json.loads(data["result"])

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


# ==========================================
# APPROVALS
# ==========================================

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
            e.tool,
            e.arguments,
            e.status AS execution_status
        FROM approvals a
        JOIN executions e
        ON a.execution_id = e.id
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


# ==========================================
# HISTORY
# ==========================================

def get_history(limit=50):

    connection = get_connection()

    rows = connection.execute(
        """
        SELECT
            g.id AS goal_id,
            g.goal,
            g.status AS goal_status,
            g.created_at,
            e.id AS execution_id,
            e.tool,
            e.arguments,
            e.status AS execution_status,
            e.result,
            e.verification
        FROM goals g
        LEFT JOIN executions e
        ON g.id = e.goal_id
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

# ---------------------------------------------------------
# REMINDERS
# ---------------------------------------------------------

def create_reminder_record(title, remind_at):
    conn = get_connection()

    reminder_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    conn.execute(
        """
        INSERT INTO reminders (
            id,
            title,
            remind_at,
            status,
            created_at,
            triggered_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            reminder_id,
            title,
            remind_at,
            "pending",
            now,
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
        "created_at": now,
        "triggered_at": None
    }


def get_due_reminders(now):
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
        AND remind_at <= ?
        ORDER BY remind_at ASC
        """,
        (now,)
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

    now = datetime.now(timezone.utc).isoformat()

    conn.execute(
        """
        UPDATE reminders
        SET
            status = 'triggered',
            triggered_at = ?
        WHERE id = ?
        """,
        (now, reminder_id)
    )

    conn.commit()
    conn.close()


def get_reminders(limit=50):
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
        ORDER BY remind_at DESC
        LIMIT ?
        """,
        (limit,)
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