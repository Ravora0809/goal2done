import { useEffect, useState } from "react";
import ReminderSection from "./components/ReminderSection";
import ExecutionHistory from "./components/ExecutionHistory";
import ClarificationCard from "./components/ClarificationCard";
import ActionCard from "./components/ActionCard";
import StatusBadge from "./components/StatusBadge";
import WorkingStep from "./components/WorkingStep";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  ListChecks,
  ShieldCheck,
  Loader2,
  XCircle,
  Circle,
} from "lucide-react";

const API = "http://127.0.0.1:8000";

/* =========================================================
   HELPERS
========================================================= */

function formatDateTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getActionProgress(actions = []) {
  const total = actions.length;

  const completed = actions.filter(
    (action) =>
      action.status === "completed" ||
      action.verification?.verified === true ||
      action.verification?.status === "verified"
  ).length;

  const waiting = actions.filter(
    (action) =>
      action.status === "approval_required" ||
      action.status === "pending_approval" ||
      action.verification?.status === "awaiting_approval"
  ).length;

  const failed = actions.filter(
    (action) =>
      action.status === "failed" ||
      action.verification?.status === "failed" ||
      action.verification?.status === "verification_failed"
  ).length;

  const rejected = actions.filter(
    (action) =>
      action.status === "rejected" ||
      action.verification?.status === "rejected"
  ).length;

  return {
    total,
    completed,
    waiting,
    failed,
    rejected,
    percentage: total
      ? Math.round((completed / total) * 100)
      : 0,
  };
}

/* =========================================================
   APP
========================================================= */

function App() {
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);

  // Stores the approval_id currently being processed.
  // This is better than a boolean because multiple approvals
  // can exist at the same time.
  const [approvalLoading, setApprovalLoading] = useState(null);

  const [history, setHistory] = useState([]);
  const [reminders, setReminders] = useState([]);

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    loadHistory();
    loadReminders();
  }, []);

  /* =========================================================
     RUN GOAL
  ========================================================= */

  async function runGoal() {
    if (!goal.trim()) return;

    setLoading(true);
    setPlan(null);

    try {
      const response = await fetch(`${API}/goal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          goal: goal.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to process goal"
        );
      }

      setPlan(data);

      await loadHistory();
      await loadReminders();
    } catch (error) {
      console.error(error);

      setPlan({
        status: "error",
        goal,
        actions: [],
        approvals_required: [],
        error:
          error.message ||
          "Could not connect to Goal2Done backend.",
      });
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     LOAD HISTORY
  ========================================================= */

  async function loadHistory() {
    try {
      const response = await fetch(`${API}/history`);

      if (!response.ok) {
        throw new Error("Failed to load history");
      }

      const data = await response.json();

      setHistory(data.history || []);
    } catch (error) {
      console.error(
        "Could not load history:",
        error
      );
    }
  }

  /* =========================================================
     LOAD REMINDERS
  ========================================================= */

  async function loadReminders() {
    try {
      const response = await fetch(`${API}/reminders`);

      if (!response.ok) {
        throw new Error("Failed to load reminders");
      }

      const data = await response.json();

      setReminders(data.reminders || []);
    } catch (error) {
      console.error(
        "Could not load reminders:",
        error
      );
    }
  }

  /* =========================================================
     APPROVE ACTION
  ========================================================= */

  async function approveAction(approval) {
    if (!approval?.approval_id) {
      alert("Approval ID is missing.");
      return;
    }

    setApprovalLoading(approval.approval_id);

    try {
      const response = await fetch(`${API}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          approval_id: approval.approval_id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Approval failed"
        );
      }

      setPlan((previous) => {
        if (!previous) return previous;

        return {
          ...previous,

          status: data.status,

          approvals_required: (
            previous.approvals_required || []
          ).filter(
            (item) =>
              item.approval_id !==
              approval.approval_id
          ),

          actions: (previous.actions || []).map(
            (action) => {
              if (
                action.approval_id ===
                  approval.approval_id ||
                action.execution_id ===
                  data.action?.execution_id
              ) {
                return {
                  ...action,
                  result: data.action?.result,
                  verification:
                    data.action?.verification,
                  status:
                    data.action?.status ||
                    "completed",
                };
              }

              return action;
            }
          ),
        };
      });

      await loadHistory();
      await loadReminders();
    } catch (error) {
      console.error(
        "Approval error:",
        error
      );

      alert(
        error.message ||
          "Approval failed."
      );
    } finally {
      setApprovalLoading(null);
    }
  }

  /* =========================================================
     REJECT ACTION
  ========================================================= */

  async function rejectAction(approval) {
    if (!approval?.approval_id) {
      alert("Approval ID is missing.");
      return;
    }

    setApprovalLoading(approval.approval_id);

    try {
      const response = await fetch(`${API}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          approval_id: approval.approval_id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Rejection failed"
        );
      }

      setPlan((previous) => {
        if (!previous) return previous;

        return {
          ...previous,

          status: "rejected",

          approvals_required: (
            previous.approvals_required || []
          ).filter(
            (item) =>
              item.approval_id !==
              approval.approval_id
          ),

          actions: (previous.actions || []).map(
            (action) => {
              if (
                action.approval_id ===
                  approval.approval_id ||
                action.execution_id ===
                  data.action?.execution_id
              ) {
                return {
                  ...action,

                  result: {
                    status: "rejected",
                  },

                  verification: {
                    verified: false,
                    status: "rejected",
                    message:
                      "Action was rejected by the user.",
                  },

                  status: "rejected",
                };
              }

              return action;
            }
          ),
        };
      });

      await loadHistory();
      await loadReminders();
    } catch (error) {
      console.error(
        "Rejection error:",
        error
      );

      alert(
        error.message ||
          "Rejection failed."
      );
    } finally {
      setApprovalLoading(null);
    }
  }

  /* =========================================================
     START NEW GOAL
  ========================================================= */

  function startNewGoal() {
    setPlan(null);
    setGoal("");
    setApprovalLoading(null);
  }

  /* =========================================================
     EXAMPLES
  ========================================================= */

  const examples = [
    {
      emoji: "💼",
      label: "Work",
      text:
        "Prepare everything I need for an important meeting tomorrow",
      description:
        "Prepare for a meeting",
    },
    {
      emoji: "✈️",
      label: "Travel",
      text:
        "Plan everything I need for a weekend trip to Hyderabad",
      description:
        "Plan a trip",
    },
    {
      emoji: "📅",
      label: "Productivity",
      text:
        "Organize the tasks I need to complete before Friday",
      description:
        "Organize tasks",
    },
    {
      emoji: "🌐",
      label: "Online",
      text:
        "Find the official application page for a software engineering internship and open it",
      description:
        "Complete a web task",
    },
  ];

  /* =========================================================
     DERIVED STATE
  ========================================================= */

  const progress = getActionProgress(
    plan?.actions || []
  );

  const isCompleted =
    plan?.status === "completed";

  const isWaitingForApproval =
    plan?.status === "waiting_for_approval";

  const isRejected =
    plan?.status === "rejected";

  const isError =
    plan?.status === "error";

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8fafc] text-slate-900 selection:bg-indigo-100 selection:text-indigo-700 dark:bg-[#070b14] dark:text-white">

      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-300px] h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[120px]" />

        <div className="absolute bottom-[-250px] left-[-200px] h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[120px]" />

        <div className="absolute right-[-200px] top-[35%] h-[400px] w-[400px] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl dark:border-slate-800/70 dark:bg-[#070b14]/75">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">

          <div className="flex items-center gap-3">

            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25">

              <Sparkles size={19} />

              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400 dark:border-[#070b14]" />

            </div>

            <div>
              <div className="bg-gradient-to-r from-slate-950 via-indigo-700 to-violet-600 bg-clip-text text-lg font-extrabold tracking-tight text-transparent dark:from-white dark:via-indigo-300 dark:to-violet-300">
                Goal2Done
              </div>

              <div className="hidden text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400 sm:block">
                Autonomous Personal Operations
              </div>
            </div>

          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">

            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />

              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>

            Agent Online
          </div>

        </div>
      </nav>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="mx-auto w-full max-w-7xl px-5 pb-20 pt-10 sm:px-8 lg:pt-16">

        {/* ===================================================
            HERO
        =================================================== */}

        {!plan && !loading && (
          <section className="mx-auto max-w-5xl text-center">

            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/80 px-3.5 py-1.5 text-[11px] font-bold tracking-[0.16em] text-indigo-600 shadow-sm backdrop-blur dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">

              <Sparkles size={14} />

              AI AGENT
            </div>

            <h1 className="text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl dark:text-white">

              Tell it what you want.

              <br />

              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                It gets it done.
              </span>

            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base dark:text-slate-400">
              Goal2Done turns natural-language goals into
              executable plans, uses tools to complete them,
              and asks for your approval before consequential
              actions.
            </p>

            {/* GOAL INPUT */}

            <div className="mx-auto mt-10 max-w-3xl">

              <div className="group relative rounded-3xl bg-gradient-to-r from-indigo-500/30 via-violet-500/20 to-fuchsia-500/30 p-[1px] shadow-2xl shadow-indigo-500/10">

                <div className="rounded-[23px] bg-white p-3 dark:bg-slate-950">

                  <textarea
                    value={goal}
                    onChange={(e) =>
                      setGoal(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (
                        (e.metaKey || e.ctrlKey) &&
                        e.key === "Enter"
                      ) {
                        runGoal();
                      }
                    }}
                    placeholder="What do you want to get done?"
                    rows={4}
                    className="w-full resize-none border-0 bg-transparent px-4 py-3 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0 dark:text-white dark:placeholder:text-slate-600"
                  />

                  <div className="flex items-center justify-between border-t border-slate-100 px-2 pt-3 dark:border-slate-800">

                    <span className="hidden text-[11px] text-slate-400 sm:block">
                      Press ⌘ + Enter to run
                    </span>

                    <button
                      onClick={runGoal}
                      disabled={!goal.trim()}
                      className="ml-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                    >
                      Run Goal

                      <ArrowRight size={17} />
                    </button>

                  </div>
                </div>

              </div>
            </div>

            {/* EXAMPLES */}

            <div className="mx-auto mt-10 max-w-4xl text-left">

              <div className="mb-3 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Try a goal
              </div>

              <div className="grid gap-3 sm:grid-cols-2">

                {examples.map((example) => (
                  <button
                    key={example.label}
                    onClick={() =>
                      setGoal(example.text)
                    }
                    className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/40 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-indigo-500/30"
                  >

                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-lg transition-transform group-hover:scale-110 dark:bg-slate-800">
                      {example.emoji}
                    </span>

                    <span className="min-w-0">

                      <span className="block text-xs font-semibold text-slate-400">
                        {example.label}
                      </span>

                      <span className="mt-0.5 block truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                        {example.description}
                      </span>

                    </span>

                    <ArrowRight
                      size={15}
                      className="ml-auto text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-indigo-500"
                    />

                  </button>
                ))}

              </div>
            </div>

            {/* TRUST STRIP */}

            <div className="mx-auto mt-12 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[11px] font-medium text-slate-400">

              <span className="flex items-center gap-1.5">
                <ShieldCheck
                  size={14}
                  className="text-indigo-500"
                />
                Human approval
              </span>

              <span className="hidden h-3 w-px bg-slate-200 sm:block dark:bg-slate-800" />

              <span className="flex items-center gap-1.5">
                <CheckCircle2
                  size={14}
                  className="text-emerald-500"
                />
                Result verification
              </span>

              <span className="hidden h-3 w-px bg-slate-200 sm:block dark:bg-slate-800" />

              <span className="flex items-center gap-1.5">
                <ListChecks
                  size={14}
                  className="text-violet-500"
                />
                Autonomous execution
              </span>

            </div>

          </section>
        )}

        {/* ===================================================
            LOADING
        =================================================== */}

        {loading && (
          <section className="mx-auto max-w-2xl">

            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-indigo-100/30 sm:p-12 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">

              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner dark:bg-indigo-500/10 dark:text-indigo-400">

                <Loader2
                  size={30}
                  className="animate-spin"
                />

              </div>

              <h2 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
                Goal2Done is working...
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                Planning your goal and deciding which
                actions are required.
              </p>

              <div className="mx-auto mt-8 max-w-md space-y-2 text-left">

                <WorkingStep
                  icon={<Sparkles size={17} />}
                  text="Understanding your goal"
                />

                <WorkingStep
                  icon={<ListChecks size={17} />}
                  text="Creating execution plan"
                />

                <WorkingStep
                  icon={<ShieldCheck size={17} />}
                  text="Checking action safety"
                />

              </div>

            </div>
          </section>
        )}

        {/* ===================================================
            RESULTS
        =================================================== */}

        {plan && !loading && (
          <section className="mx-auto max-w-5xl">

            {/* RESULT HEADER */}

            <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">

              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

                <div className="min-w-0 flex-1">

                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500">
                    Execution Plan
                  </div>

                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">

                    {isCompleted
                      ? "Goal completed"
                      : isRejected
                      ? "Goal stopped"
                      : isError
                      ? "Something went wrong"
                      : isWaitingForApproval
                      ? "Waiting for your approval"
                      : "Your goal is being handled"}

                  </h2>

                  <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-slate-500 dark:text-slate-400">
                    "{plan.goal || goal}"
                  </p>

                  {/* PROGRESS */}

                  {plan.actions?.length > 0 && (
                    <div className="mt-5 max-w-xl">

                      <div className="mb-2 flex items-center justify-between text-xs">

                        <span className="font-medium text-slate-500 dark:text-slate-400">
                          Execution progress
                        </span>

                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          {progress.completed} / {progress.total}
                        </span>

                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">

                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                          style={{
                            width: `${progress.percentage}%`,
                          }}
                        />

                      </div>

                      <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-medium">

                        <span className="text-emerald-600 dark:text-emerald-400">
                          {progress.completed} completed
                        </span>

                        {progress.waiting > 0 && (
                          <span className="text-amber-600 dark:text-amber-400">
                            {progress.waiting} waiting for approval
                          </span>
                        )}

                        {progress.failed > 0 && (
                          <span className="text-red-600 dark:text-red-400">
                            {progress.failed} failed
                          </span>
                        )}

                        {progress.rejected > 0 && (
                          <span className="text-red-600 dark:text-red-400">
                            {progress.rejected} rejected
                          </span>
                        )}

                      </div>

                    </div>
                  )}

                </div>

                <div className="shrink-0">
                  <StatusBadge
                    status={plan.status}
                  />
                </div>

              </div>
            </div>

            {/* =================================================
                ERROR
            ================================================= */}

            {plan.status === "error" && (
              <div className="mb-6 flex gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">

                <XCircle
                  size={22}
                  className="mt-0.5 shrink-0"
                />

                <div>

                  <strong className="text-sm font-semibold">
                    Something went wrong
                  </strong>

                  <p className="mt-1 text-sm leading-6 opacity-80">
                    {plan.error ||
                      "Unable to process your goal."}
                  </p>

                </div>

              </div>
            )}

            {/* =================================================
                CLARIFICATION
            ================================================= */}

            {plan.status ===
              "needs_clarification" && (
              <div className="mb-6 overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-lg shadow-amber-100/30 dark:border-amber-500/20 dark:bg-slate-900 dark:shadow-black/20">

                <ClarificationCard
                  plan={plan}
                  goal={goal}
                  setGoal={setGoal}
                  setPlan={setPlan}
                  setLoading={setLoading}
                />

              </div>
            )}

            {/* =================================================
                ACTIONS
            ================================================= */}

            {plan.status !==
              "needs_clarification" &&
              plan.status !== "error" && (
                <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6 dark:border-slate-800">

                    <div className="flex items-center gap-2.5">

                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                        <ListChecks size={17} />
                      </div>

                      <div>

                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          Agent Actions
                        </h3>

                        <p className="text-[11px] text-slate-400">
                          Steps executed by your agent
                        </p>

                      </div>

                    </div>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">

                      {plan.actions?.length || 0}{" "}
                      {plan.actions?.length === 1
                        ? "ACTION"
                        : "ACTIONS"}

                    </span>

                  </div>

                  <div className="space-y-3 bg-slate-50/60 p-4 sm:p-5 dark:bg-slate-950/30">

                    {plan.actions?.length > 0 ? (
                      plan.actions.map(
                        (action, index) => (
                          <ActionCard
                            key={
                              action.execution_id ||
                              action.approval_id ||
                              index
                            }
                            action={action}
                          />
                        )
                      )
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900">
                        No actions were generated.
                      </div>
                    )}

                  </div>

                </div>
              )}

            {/* =================================================
                APPROVAL FIREWALL
            ================================================= */}

            {plan.approvals_required?.length >
              0 && (
              <div className="mb-6 overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-xl shadow-amber-100/30 dark:border-amber-500/20 dark:bg-slate-900 dark:shadow-black/20">

                <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-5 sm:p-6 dark:border-amber-500/10 dark:from-amber-500/10 dark:to-orange-500/5">

                  <div className="flex items-center gap-4">

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                      <ShieldCheck size={23} />
                    </div>

                    <div>

                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
                        Approval Firewall
                      </div>

                      <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                        Human approval required
                      </h3>

                    </div>

                  </div>

                </div>

                <div className="space-y-5 p-5 sm:p-6">

                  {plan.approvals_required.map(
                    (approval, index) => {

                      const isProcessing =
                        approvalLoading ===
                        approval.approval_id;

                      return (
                        <div
                          className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/40"
                          key={
                            approval.approval_id ||
                            index
                          }
                        >

                          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">

                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Approval request
                            </span>

                            <code className="max-w-full truncate rounded-md bg-slate-200/70 px-2 py-1 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              {approval.approval_id}
                            </code>

                          </div>

                          <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">

                            <AlertTriangle
                              size={18}
                              className="mt-0.5 shrink-0"
                            />

                            <span className="text-sm leading-5">
                              Goal2Done wants to perform a
                              potentially consequential
                              action. Please review it before
                              continuing.
                            </span>

                          </div>

                          <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">

                            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Action
                            </span>

                            <strong className="block text-sm font-semibold text-slate-900 dark:text-white">
                              {approval.arguments?.title ||
                                approval.tool}
                            </strong>

                            {approval.arguments?.time && (
                              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">

                                <Clock3 size={13} />

                                {formatDateTime(
                                  approval.arguments.time
                                )}

                              </div>
                            )}

                            {approval.arguments?.url && (
                              <div className="mt-2 truncate rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                {approval.arguments.url}
                              </div>
                            )}

                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row">

                            <button
                              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={
                                approvalLoading !== null
                              }
                              onClick={() =>
                                approveAction(
                                  approval
                                )
                              }
                            >

                              {isProcessing ? (
                                <>
                                  <Loader2
                                    size={17}
                                    className="animate-spin"
                                  />

                                  Executing...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2
                                    size={17}
                                  />

                                  Approve & Execute
                                </>
                              )}

                            </button>

                            <button
                              className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-600 transition-all hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/20 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-500/10"
                              disabled={
                                approvalLoading !== null
                              }
                              onClick={() =>
                                rejectAction(
                                  approval
                                )
                              }
                            >

                              <XCircle size={17} />

                              Reject

                            </button>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>
              </div>
            )}

            {/* =================================================
                WAITING STATE
            ================================================= */}

            {plan.status ===
              "waiting_for_approval" &&
              plan.approvals_required?.length ===
                0 && (
                <div className="mb-6 flex items-center gap-4 rounded-3xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-500/20 dark:bg-amber-500/10">

                  <Clock3
                    size={26}
                    className="shrink-0 text-amber-600 dark:text-amber-400"
                  />

                  <div>

                    <h3 className="font-bold text-slate-900 dark:text-white">
                      Waiting for the next step
                    </h3>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Goal2Done is waiting for an action
                      to become available.
                    </p>

                  </div>

                </div>
              )}

            {/* =================================================
                REJECTED
            ================================================= */}

            {plan.status === "rejected" && (
              <div className="mb-6 flex flex-col gap-5 rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-6 shadow-sm sm:flex-row sm:items-center dark:border-red-500/20 dark:from-red-500/10 dark:to-slate-900">

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
                  <XCircle size={28} />
                </div>

                <div>

                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-500">
                    Action Rejected
                  </div>

                  <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                    Goal execution was stopped.
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Goal2Done respected your decision and
                    did not execute the rejected action.
                  </p>

                </div>

              </div>
            )}

            {/* =================================================
                COMPLETION
            ================================================= */}

            {plan.status === "completed" && (
              <div className="mb-6 flex flex-col gap-5 rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm sm:flex-row sm:items-center dark:border-emerald-500/20 dark:from-emerald-500/10 dark:to-slate-900">

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                  <CheckCircle2 size={30} />
                </div>

                <div>

                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
                    Goal Completed
                  </div>

                  <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                    Your goal was successfully completed.
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Goal2Done executed the required actions
                    and verified their results.
                  </p>

                </div>

              </div>
            )}

            {/* =================================================
                FAILED
            ================================================= */}

            {plan.status ===
              "verification_failed" && (
              <div className="mb-6 flex flex-col gap-5 rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-6 shadow-sm sm:flex-row sm:items-center dark:border-red-500/20 dark:from-red-500/10 dark:to-slate-900">

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
                  <AlertTriangle size={28} />
                </div>

                <div>

                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-600 dark:text-red-400">
                    Verification Failed
                  </div>

                  <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                    The result could not be verified.
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Goal2Done detected that the expected
                    outcome was not confirmed.
                  </p>

                </div>

              </div>
            )}

            {/* =================================================
                NEW GOAL
            ================================================= */}

            {plan.status !==
              "needs_clarification" && (
              <div className="flex justify-center py-5">

                <button
                  className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-indigo-500/30 dark:hover:text-indigo-400"
                  onClick={startNewGoal}
                >

                  <span className="transition-transform group-hover:-translate-x-1">
                    ←
                  </span>

                  Start another goal

                </button>

              </div>
            )}

          </section>
        )}

        {/* =====================================================
            REMINDERS
        ===================================================== */}

        <div className="mt-12">
          <ReminderSection
            reminders={reminders}
          />
        </div>

        {/* =====================================================
            HISTORY
        ===================================================== */}

        <div className="mt-6">
          <ExecutionHistory
            history={history}
          />
        </div>

      </main>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="border-t border-slate-200/70 bg-white/50 px-5 py-8 text-center dark:border-slate-800/70 dark:bg-slate-950/30">

        <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-wider text-slate-400">

          <span className="font-bold text-slate-500 dark:text-slate-300">
            Goal2Done
          </span>

          <span>•</span>

          <span>
            Plan → Execute → Verify
          </span>

          <span>•</span>

          <span>
            Human control at critical decision points
          </span>

        </div>

      </footer>

    </div>
  );
}

export default App;