/* ===========================================================
   CLARIFICATION CARD
=========================================================== */

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  X,
  Sparkles,
} from "lucide-react";

import { API, apiFetch } from "../api";

function ClarificationCard({
  plan,
  goal,
  setGoal,
  setPlan,
  setLoading,
}) {
  const [answers, setAnswers] = useState(
    plan.questions?.map(() => "") || []
  );

  const [submitting, setSubmitting] = useState(false);

  function updateAnswer(index, value) {
    setAnswers((previous) => {
      const updated = [...previous];
      updated[index] = value;
      return updated;
    });
  }

  async function continueGoal() {
    const unanswered = answers.some(
      (answer) => !answer.trim()
    );

    if (unanswered) {
      alert("Please answer all questions.");
      return;
    }

    const additionalInformation = plan.questions
      .map(
        (question, index) =>
          `Question: ${question}\nAnswer: ${answers[index]}`
      )
      .join("\n\n");

    const updatedGoal = `
Original goal:
${goal}

Additional information provided by the user:
${additionalInformation}
`;

    setSubmitting(true);
    setLoading(true);
    setPlan(null);

    try {
      const response = await apiFetch(`${API}/goal`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          goal: updatedGoal,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to update goal"
        );
      }

      setPlan(data);
    } catch (error) {
      console.error(error);

      setPlan({
        status: "error",
        goal: updatedGoal,
        actions: [],
        approvals_required: [],
        error:
          error.message ||
          "Could not connect to Goal2Done backend.",
      });
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-xl shadow-amber-100/30 dark:border-amber-500/20 dark:bg-slate-900 dark:shadow-black/20">

      {/* TOP ACCENT */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400" />

      {/* SOFT BACKGROUND GLOW */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-amber-400/10 blur-3xl" />

      {/* HEADER */}
      <div className="relative border-b border-amber-100 bg-gradient-to-br from-amber-50 via-orange-50/50 to-white px-6 py-7 sm:px-8 dark:border-amber-500/10 dark:from-amber-500/10 dark:via-orange-500/5 dark:to-slate-900">

        <div className="flex items-start gap-4">

          {/* ICON */}
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-600 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400">
            <AlertTriangle size={23} />

            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-white dark:border-slate-900 dark:bg-slate-900">
              <Sparkles
                size={9}
                className="text-amber-500"
              />
            </span>
          </div>

          {/* TITLE */}
          <div className="min-w-0">

            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
              More Information Needed
            </div>

            <h3 className="mt-1.5 text-lg font-bold tracking-tight text-slate-900 sm:text-xl dark:text-white">
              I need a few details before I
              can execute this goal.
            </h3>

            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
              Answer the questions below so I can
              create a more accurate execution plan.
            </p>

          </div>
        </div>
      </div>

      {/* QUESTIONS */}
      <div className="relative px-5 py-6 sm:px-8">

        <div className="space-y-4">

          {plan.questions?.map(
            (question, index) => (
              <div
                className="group flex gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition-all duration-200 hover:border-indigo-200 hover:bg-white hover:shadow-md hover:shadow-indigo-100/20 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-indigo-500/30 dark:hover:bg-slate-900"
                key={index}
              >

                {/* NUMBER */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-500 shadow-sm transition-colors group-focus-within:border-indigo-200 group-focus-within:bg-indigo-50 group-focus-within:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:group-focus-within:border-indigo-500/30 dark:group-focus-within:bg-indigo-500/10 dark:group-focus-within:text-indigo-400">
                  {index + 1}
                </div>

                {/* QUESTION BODY */}
                <div className="min-w-0 flex-1">

                  <label className="mb-2.5 block text-sm font-semibold leading-5 text-slate-800 dark:text-slate-200">
                    {question}
                  </label>

                  <div className="relative">

                    <input
                      type="text"
                      value={answers[index]}
                      onChange={(e) =>
                        updateAnswer(
                          index,
                          e.target.value
                        )
                      }
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          index ===
                            plan.questions.length - 1
                        ) {
                          continueGoal();
                        }
                      }}
                      placeholder="Type your answer..."
                      disabled={submitting}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-600 dark:focus:border-indigo-500"
                    />

                    {answers[index]?.trim() && (
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400">
                          ✓
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              </div>
            )
          )}

        </div>
      </div>

      {/* ACTIONS */}
      <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-8 dark:border-slate-800 dark:bg-slate-950/30">

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">

          {/* CANCEL */}
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            onClick={() => {
              setPlan(null);
              setGoal("");
            }}
            disabled={submitting}
          >
            <X size={16} />
            Cancel
          </button>

          {/* CONTINUE */}
          <button
            type="button"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:from-indigo-500 hover:to-violet-500 hover:shadow-xl hover:shadow-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            onClick={continueGoal}
            disabled={submitting}
          >

            {submitting ? (
              <>
                <Loader2
                  size={17}
                  className="animate-spin"
                />
                Updating goal...
              </>
            ) : (
              <>
                Continue
                <ArrowRight
                  size={17}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </>
            )}

          </button>

        </div>

        {/* QUESTION COUNT */}
        <div className="mt-4 text-center text-[10px] font-medium text-slate-400 sm:text-right">
          {answers.filter((answer) => answer.trim()).length}{" "}
          of {plan.questions?.length || 0} questions answered
        </div>

      </div>
    </div>
  );
}

export default ClarificationCard;