import {
  Clock3,
  CheckCircle2,
  XCircle,
  Bell,
  Pencil,
  Trash2,
  X,
  Save,
  Loader2,
} from "lucide-react";

import { useEffect, useState } from "react";


const API = "http://127.0.0.1:8000";


/* ===========================================================
   FORMAT DATE
=========================================================== */

function formatReminderTime(value) {
  if (!value) return "No time";

  try {
    return new Date(value).toLocaleString(
      undefined,
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  } catch {
    return value;
  }
}


/* ===========================================================
   CONVERT UTC / ISO TO DATETIME-LOCAL
=========================================================== */

function toDateTimeLocal(value) {
  if (!value) return "";

  try {
    const date = new Date(value);

    const pad = (number) =>
      String(number).padStart(2, "0");

    return (
      `${date.getFullYear()}-` +
      `${pad(date.getMonth() + 1)}-` +
      `${pad(date.getDate())}T` +
      `${pad(date.getHours())}:` +
      `${pad(date.getMinutes())}`
    );
  } catch {
    return "";
  }
}


/* ===========================================================
   REMINDER CARD
=========================================================== */

function ReminderCard({
  reminder,
  onChanged,
}) {

  const status =
    reminder.status ||
    "scheduled";


  const title =
    reminder.title ||
    reminder.task ||
    reminder.name ||
    "Reminder";


  const time =
    reminder.remind_at ||
    reminder.scheduled_at ||
    reminder.time ||
    reminder.execute_at;


  const isCompleted =
    status === "completed" ||
    status === "triggered";


  const isPending =
    status === "pending" ||
    status === "scheduled";


  const canModify =
    isPending;


  const [
    editing,
    setEditing,
  ] = useState(false);


  const [
    editTitle,
    setEditTitle,
  ] = useState(title);


  const [
    editTime,
    setEditTime,
  ] = useState(
    toDateTimeLocal(time)
  );


  const [
    saving,
    setSaving,
  ] = useState(false);


  const [
    deleting,
    setDeleting,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  useEffect(() => {

    setEditTitle(title);

    setEditTime(
      toDateTimeLocal(time)
    );

  }, [title, time]);


  /* =========================================================
     START EDIT
  ========================================================= */

  function startEdit() {

    setError("");

    setEditTitle(title);

    setEditTime(
      toDateTimeLocal(time)
    );

    setEditing(true);
  }


  /* =========================================================
     CANCEL EDIT
  ========================================================= */

  function cancelEdit() {

    setEditing(false);

    setError("");

    setEditTitle(title);

    setEditTime(
      toDateTimeLocal(time)
    );
  }


  /* =========================================================
     UPDATE REMINDER
  ========================================================= */

  async function saveReminder() {

    if (!editTitle.trim()) {

      setError(
        "Reminder title cannot be empty."
      );

      return;
    }


    if (!editTime) {

      setError(
        "Please select a reminder time."
      );

      return;
    }


    setSaving(true);

    setError("");


    try {

      const response =
        await fetch(
          `${API}/reminders/${reminder.id}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              title:
                editTitle.trim(),

              time:
                editTime,
            }),
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Failed to update reminder."
        );

      }


      setEditing(false);


      if (onChanged) {
        await onChanged();
      }

    } catch (err) {

      console.error(
        "Update reminder error:",
        err
      );

      setError(
        err.message ||
        "Could not update reminder."
      );

    } finally {

      setSaving(false);

    }
  }


  /* =========================================================
     DELETE REMINDER
  ========================================================= */

  async function deleteReminder() {

    const confirmed =
      window.confirm(
        `Delete "${title}"?`
      );


    if (!confirmed) {
      return;
    }


    setDeleting(true);

    setError("");


    try {

      const response =
        await fetch(
          `${API}/reminders/${reminder.id}`,
          {
            method: "DELETE",
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Failed to delete reminder."
        );

      }


      if (onChanged) {
        await onChanged();
      }

    } catch (err) {

      console.error(
        "Delete reminder error:",
        err
      );

      setError(
        err.message ||
        "Could not delete reminder."
      );

    } finally {

      setDeleting(false);

    }
  }


  const statusType =
    isCompleted
      ? "completed"
      : isPending
      ? "pending"
      : "failed";


  return (

    <div
      className="
        group
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-4
        shadow-sm
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:border-indigo-200
        hover:shadow-md
        dark:border-slate-800
        dark:bg-slate-900
        dark:hover:border-indigo-500/30
      "
    >

      {/* =====================================================
          NORMAL VIEW
      ===================================================== */}

      {!editing && (

        <div
          className="
            flex
            items-center
            gap-4
          "
        >

          {/* ICON */}

          <div
            className={`
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              transition-transform
              duration-200
              group-hover:scale-105

              ${
                statusType === "completed"
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : statusType === "pending"
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                  : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
              }
            `}
          >

            {statusType === "completed" ? (

              <CheckCircle2
                size={19}
              />

            ) : statusType === "failed" ? (

              <XCircle
                size={19}
              />

            ) : (

              <Bell
                size={19}
              />

            )}

          </div>


          {/* INFO */}

          <div
            className="
              min-w-0
              flex-1
            "
          >

            <strong
              className="
                block
                truncate
                text-sm
                font-semibold
                text-slate-900
                dark:text-white
              "
            >

              {title}

            </strong>


            {time && (

              <div
                className="
                  mt-1
                  flex
                  items-center
                  gap-1.5
                  text-xs
                  text-slate-400
                  dark:text-slate-500
                "
              >

                <Clock3
                  size={13}
                />

                <span>
                  {formatReminderTime(
                    time
                  )}
                </span>

              </div>

            )}

          </div>


          {/* STATUS */}

          <div
            className={`
              hidden
              shrink-0
              items-center
              gap-1.5
              rounded-full
              px-2.5
              py-1.5
              text-[10px]
              font-bold
              uppercase
              tracking-wider
              sm:flex

              ${
                statusType === "completed"
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : statusType === "pending"
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                  : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
              }
            `}
          >

            {isCompleted && (
              <>
                <CheckCircle2
                  size={13}
                />
                Completed
              </>
            )}

            {isPending && (
              <>
                <Clock3
                  size={13}
                />
                Scheduled
              </>
            )}

            {!isCompleted &&
              !isPending && (
                <>
                  <XCircle
                    size={13}
                  />
                  {status}
                </>
              )}

          </div>


          {/* ACTION BUTTONS */}

          {canModify && (

            <div
              className="
                flex
                shrink-0
                items-center
                gap-2
              "
            >

              {/* EDIT */}

              <button
                type="button"
                onClick={startEdit}
                title="Edit reminder"
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-slate-200
                  bg-slate-50
                  text-slate-500
                  transition
                  hover:border-indigo-300
                  hover:bg-indigo-50
                  hover:text-indigo-600
                  dark:border-slate-700
                  dark:bg-slate-800
                  dark:text-slate-400
                  dark:hover:border-indigo-500/40
                  dark:hover:bg-indigo-500/10
                  dark:hover:text-indigo-400
                "
              >

                <Pencil
                  size={15}
                />

              </button>


              {/* DELETE */}

              <button
                type="button"
                onClick={deleteReminder}
                disabled={deleting}
                title="Delete reminder"
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-red-200
                  bg-red-50
                  text-red-500
                  transition
                  hover:bg-red-100
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  dark:border-red-500/20
                  dark:bg-red-500/10
                  dark:text-red-400
                  dark:hover:bg-red-500/20
                "
              >

                {deleting ? (

                  <Loader2
                    size={15}
                    className="animate-spin"
                  />

                ) : (

                  <Trash2
                    size={15}
                  />

                )}

              </button>

            </div>

          )}

        </div>

      )}


      {/* =====================================================
          EDIT MODE
      ===================================================== */}

      {editing && (

        <div
          className="
            space-y-4
          "
        >

          <div
            className="
              flex
              items-center
              justify-between
            "
          >

            <div
              className="
                flex
                items-center
                gap-2
                text-sm
                font-bold
                text-slate-900
                dark:text-white
              "
            >

              <Pencil
                size={16}
                className="text-indigo-500"
              />

              Edit reminder

            </div>


            <button
              type="button"
              onClick={cancelEdit}
              className="
                text-slate-400
                transition
                hover:text-slate-200
              "
            >

              <X
                size={18}
              />

            </button>

          </div>


          {/* TITLE */}

          <div>

            <label
              className="
                mb-1.5
                block
                text-[10px]
                font-bold
                uppercase
                tracking-wider
                text-slate-500
              "
            >

              Reminder

            </label>


            <input
              value={editTitle}
              onChange={(event) =>
                setEditTitle(
                  event.target.value
                )
              }
              className="
                w-full
                rounded-xl
                border
                border-slate-200
                bg-white
                px-4
                py-3
                text-sm
                text-slate-900
                outline-none
                transition
                focus:border-indigo-400
                focus:ring-2
                focus:ring-indigo-500/10
                dark:border-slate-700
                dark:bg-slate-950
                dark:text-white
              "
              placeholder="Reminder title"
            />

          </div>


          {/* TIME */}

          <div>

            <label
              className="
                mb-1.5
                block
                text-[10px]
                font-bold
                uppercase
                tracking-wider
                text-slate-500
              "
            >

              Date & time

            </label>


            <input
              type="datetime-local"
              value={editTime}
              onChange={(event) =>
                setEditTime(
                  event.target.value
                )
              }
              className="
                w-full
                rounded-xl
                border
                border-slate-200
                bg-white
                px-4
                py-3
                text-sm
                text-slate-900
                outline-none
                transition
                focus:border-indigo-400
                focus:ring-2
                focus:ring-indigo-500/10
                dark:border-slate-700
                dark:bg-slate-950
                dark:text-white
              "
            />

          </div>


          {/* ERROR */}

          {error && (

            <div
              className="
                rounded-xl
                border
                border-red-500/20
                bg-red-500/10
                px-4
                py-3
                text-xs
                text-red-400
              "
            >

              {error}

            </div>

          )}


          {/* BUTTONS */}

          <div
            className="
              flex
              justify-end
              gap-2
            "
          >

            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="
                inline-flex
                items-center
                gap-2
                rounded-xl
                border
                border-slate-700
                px-4
                py-2.5
                text-xs
                font-bold
                text-slate-400
                transition
                hover:bg-slate-800
              "
            >

              <X
                size={14}
              />

              Cancel

            </button>


            <button
              type="button"
              onClick={saveReminder}
              disabled={saving}
              className="
                inline-flex
                items-center
                gap-2
                rounded-xl
                bg-indigo-500
                px-4
                py-2.5
                text-xs
                font-bold
                text-white
                transition
                hover:bg-indigo-400
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >

              {saving ? (

                <Loader2
                  size={14}
                  className="animate-spin"
                />

              ) : (

                <Save
                  size={14}
                />

              )}

              {saving
                ? "Saving..."
                : "Save changes"}

            </button>

          </div>

        </div>

      )}

    </div>

  );
}


export default ReminderCard;