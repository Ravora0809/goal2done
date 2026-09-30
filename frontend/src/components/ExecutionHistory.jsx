import {
  CheckCircle2,
  Clock3,
  XCircle,
  History,
  ShieldCheck,
} from "lucide-react";

/* ===========================================================
   EXECUTION HISTORY
=========================================================== */

function formatToolName(name) {
  if (!name) return "Unknown";

  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function ExecutionHistory({ history }) {
  if (!history || history.length === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

      {/* TOP ACCENT */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />

      {/* HEADER */}
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-slate-800">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <History size={19} />
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">
              Execution History
            </div>

            <h2 className="mt-0.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Recent activity
            </h2>
          </div>

        </div>

        <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <ShieldCheck size={12} />
          {history.length}{" "}
          {history.length === 1 ? "Activity" : "Activities"}
        </div>

      </div>

      {/* HISTORY LIST */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">

        {history.map((item, index) => {
          const verification =
            item.verification || {};

          const verified =
            verification.verified === true;

          const rejected =
            item.status === "rejected" ||
            verification.status === "rejected";

          const status = verified
            ? "verified"
            : rejected
            ? "rejected"
            : "pending";

          const title = formatToolName(
            item.tool || "Unknown action"
          );

          const description =
            item.goal ||
            item.arguments?.title ||
            item.arguments?.query ||
            "";

          return (
            <div
              className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/80 sm:px-6 dark:hover:bg-slate-800/40"
              key={
                item.execution_id ||
                index
              }
            >

              {/* STATUS ICON */}
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${
                  status === "verified"
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : status === "rejected"
                    ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                    : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                }`}
              >
                {status === "verified" ? (
                  <CheckCircle2 size={19} />
                ) : status === "rejected" ? (
                  <XCircle size={19} />
                ) : (
                  <Clock3 size={19} />
                )}
              </div>

              {/* INFORMATION */}
              <div className="min-w-0 flex-1">

                <div className="flex flex-wrap items-center gap-2">

                  <strong className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {title}
                  </strong>

                  {item.execution_id && (
                    <code className="hidden rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-400 sm:inline dark:bg-slate-800 dark:text-slate-500">
                      {item.execution_id}
                    </code>
                  )}

                </div>

                {description && (
                  <p className="mt-1 truncate text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {description}
                  </p>
                )}

              </div>

              {/* STATUS */}
              <div
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  status === "verified"
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : status === "rejected"
                    ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                    : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                }`}
              >
                {status === "verified"
                  ? "Verified"
                  : status === "rejected"
                  ? "Rejected"
                  : "Pending"}
              </div>

            </div>
          );
        })}

      </div>

    </section>
  );
}

export default ExecutionHistory;