import {
  CheckCircle2,
  Loader2,
} from "lucide-react";

/* ===========================================================
   WORKING STEP
=========================================================== */

function WorkingStep({ icon, text }) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-100/20 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30">

      {/* ICON */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
        {icon}
      </div>

      {/* TEXT */}
      <span className="flex-1 text-xs font-medium text-slate-600 dark:text-slate-300">
        {text}
      </span>

      {/* COMPLETED INDICATOR */}
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400">
        <CheckCircle2 size={15} />
      </div>

    </div>
  );
}

export default WorkingStep;