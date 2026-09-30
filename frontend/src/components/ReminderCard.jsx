import {
  Clock3,
  CheckCircle2,
  XCircle,
  Bell,
} from "lucide-react";

/* ===========================================================
   REMINDER CARD
=========================================================== */

function ReminderCard({ reminder }) {
  const status =
    reminder.status || "scheduled";

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
    status === "completed";

  const isPending =
    status === "pending" ||
    status === "scheduled";

  const statusType = isCompleted
    ? "completed"
    : isPending
    ? "pending"
    : "failed";

  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-100/20 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30">

      {/* ICON */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${
          statusType === "completed"
            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
            : statusType === "pending"
            ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
            : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
        }`}
      >
        {statusType === "completed" ? (
          <CheckCircle2 size={19} />
        ) : statusType === "failed" ? (
          <XCircle size={19} />
        ) : (
          <Bell size={19} />
        )}
      </div>

      {/* REMINDER INFO */}
      <div className="min-w-0 flex-1">

        <strong className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
          {title}
        </strong>

        {time && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <Clock3 size={13} />
            <span className="truncate">
              {time}
            </span>
          </div>
        )}

      </div>

      {/* STATUS */}
      <div
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
          statusType === "completed"
            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
            : statusType === "pending"
            ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
            : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
        }`}
      >

        {isCompleted && (
          <>
            <CheckCircle2 size={13} />
            Completed
          </>
        )}

        {isPending && (
          <>
            <Clock3 size={13} />
            Scheduled
          </>
        )}

        {!isCompleted && !isPending && (
          <>
            <XCircle size={13} />
            {status}
          </>
        )}

      </div>

    </div>
  );
}

export default ReminderCard;