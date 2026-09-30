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
  AlertTriangle,
  ListChecks,
  ShieldCheck,
  Loader2,
  XCircle,
  Sun,
  Moon,
}
from "lucide-react";
import "./App.css";
const API = "http://127.0.0.1:8000";

function App() {
const [goal, setGoal] = useState("");
const [loading, setLoading] = useState(false);
const [plan, setPlan] = useState(null);
const [approvalLoading, setApprovalLoading] = useState(false);
const [history, setHistory] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem("goal2done-theme") || "dark");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("goal2done-theme", theme);
  }, [theme]);

  // Load execution history when app starts
  useEffect(() => {
  loadHistory();
  loadReminders();
}, []);

  // =========================================================
  // RUN GOAL
  // =========================================================

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
          goal,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to process goal");
      }

      setPlan(data);

      // Refresh history after execution
      await loadHistory();
      await loadReminders();
    } catch (error) {
      console.error(error);

      setPlan({
        status: "error",
        goal,
        actions: [],
        approvals_required: [],
        error: error.message || "Could not connect to Goal2Done backend.",
      });
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // LOAD HISTORY
  // =========================================================

  async function loadHistory() {
    try {
      const response = await fetch(`${API}/history`);

      if (!response.ok) {
        throw new Error("Failed to load history");
      }

      const data = await response.json();

      setHistory(data.history || []);
    } catch (error) {
      console.error("Could not load history:", error);
    }
  }

  async function loadReminders() {
  try {
    const response = await fetch(`${API}/reminders`);

    if (!response.ok) {
      throw new Error("Failed to load reminders");
    }

    const data = await response.json();

    setReminders(data.reminders || []);
  } catch (error) {
    console.error("Could not load reminders:", error);
  }
}

  // =========================================================
  // APPROVE ACTION
  // =========================================================

  async function approveAction(approval) {
    if (!approval?.approval_id) {
      alert("Approval ID is missing.");
      return;
    }

    setApprovalLoading(true);

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
        throw new Error(data.detail || "Approval failed");
      }

      // Update the current plan
      setPlan((previous) => {
        if (!previous) return previous;

        return {
          ...previous,

          status: data.status,

          approvals_required: (
            previous.approvals_required || []
          ).filter(
            (item) => item.approval_id !== approval.approval_id
          ),

          actions: (previous.actions || []).map((action) => {
            if (
              action.approval_id === approval.approval_id ||
              action.execution_id === data.action?.execution_id
            ) {
              return {
                ...action,

                result: data.action?.result,

                verification: data.action?.verification,

                status: data.action?.status || "completed",
              };
            }

            return action;
          }),
        };
      });

      // Refresh history
      await loadHistory();
      await loadReminders();
    } catch (error) {
      console.error("Approval error:", error);
      alert(error.message || "Approval failed.");
    } finally {
      setApprovalLoading(false);
    }
  }

  // =========================================================
  // REJECT ACTION
  // =========================================================

  async function rejectAction(approval) {
    if (!approval?.approval_id) {
      alert("Approval ID is missing.");
      return;
    }

    setApprovalLoading(true);

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
        throw new Error(data.detail || "Rejection failed");
      }

      setPlan((previous) => {
        if (!previous) return previous;

        return {
          ...previous,

          status: "rejected",

          approvals_required: (
            previous.approvals_required || []
          ).filter(
            (item) => item.approval_id !== approval.approval_id
          ),

          actions: (previous.actions || []).map((action) => {
            if (
              action.approval_id === approval.approval_id ||
              action.execution_id === data.action?.execution_id
            ) {
              return {
                ...action,

                result: {
                  status: "rejected",
                },

                verification: {
                  verified: false,
                  status: "rejected",
                  message: "Action was rejected by the user.",
                },

                status: "rejected",
              };
            }

            return action;
          }),
        };
      });

      // Refresh history
      await loadHistory();
      await loadReminders();
    } catch (error) {
      console.error("Rejection error:", error);
      alert(error.message || "Rejection failed.");
    } finally {
      setApprovalLoading(false);
    }
  }

  // =========================================================
  // START NEW GOAL
  // =========================================================

  function startNewGoal() {
    setPlan(null);
    setGoal("");
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="app">

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <nav className="navbar">

        <div className="brand">

          <div className="brand-icon">
            <Sparkles size={20} />
          </div>

          <div>
            <div className="brand-name">
              Goal2Done
            </div>

            <div className="brand-subtitle">
              Autonomous Personal Operations
            </div>
          </div>

        </div>

        <div className="nav-actions">
          <div className="nav-status">
            <span className="status-dot"></span>
            Agent Online
          </div>
          <button className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>

      </nav>


      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="container">

        {/* ===================================================
            HERO
        =================================================== */}

        {!plan && !loading && (
          <section className="hero">

            <div className="hero-badge">
              <Sparkles size={15} />
              AI AGENT
            </div>

            <h1>
              Tell it what you want.
              <br />
              <span>
                It figures out how to get it done.
              </span>
            </h1>

            <p className="hero-description">
              Goal2Done turns natural-language goals into
              executable plans, uses tools to complete them,
              and asks for your approval before risky actions.
            </p>


            {/* GOAL INPUT */}

            <div className="goal-box">

              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="What do you want to get done?"
                rows={4}
              />

              <button
                className="run-button"
                onClick={runGoal}
                disabled={!goal.trim()}
              >
                Run Goal
                <ArrowRight size={18} />
              </button>

            </div>


            {/* =================================================
                EXAMPLES
            ================================================= */}

            <div className="examples">

              <div className="examples-label">
                TRY A GOAL
              </div>

              <div className="example-grid">

                <button
                  onClick={() =>
                    setGoal(
                      "Prepare everything I need for an important meeting tomorrow"
                    )
                  }
                >
                  💼 Work
                  <span>
                    Prepare for a meeting
                  </span>
                </button>


                <button
                  onClick={() =>
                    setGoal(
                      "Plan everything I need for a weekend trip to Hyderabad"
                    )
                  }
                >
                  ✈️ Travel
                  <span>
                    Plan a trip
                  </span>
                </button>


                <button
                  onClick={() =>
                    setGoal(
                      "Organize the tasks I need to complete before Friday"
                    )
                  }
                >
                  📅 Productivity
                  <span>
                    Organize tasks
                  </span>
                </button>


                <button
                  onClick={() =>
                    setGoal(
                      "Find the official application page for a software engineering internship and open it"
                    )
                  }
                >
                  🌐 Online
                  <span>
                    Complete a web task
                  </span>
                </button>

              </div>

            </div>

          </section>
        )}


        {/* ===================================================
            LOADING
        =================================================== */}

        {loading && (
          <section className="working-card">

            <div className="loader-icon">
              <Loader2
                size={30}
                className="spin"
              />
            </div>

            <h2>
              Goal2Done is working...
            </h2>

            <p>
              Planning your goal and deciding which
              actions are required.
            </p>

            <div className="working-steps">

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

          </section>
        )}


        {/* ===================================================
            RESULTS
        =================================================== */}

        {plan && !loading && (
          <section className="results">

            {/* RESULT HEADER */}

            <div className="result-header">

              <div>

                <div className="section-label">
                  EXECUTION PLAN
                </div>

                <h2>
                  Your goal is being handled
                </h2>

                <p className="goal-display">
                  "{plan.goal || goal}"
                </p>

              </div>

              <StatusBadge
                status={plan.status}
              />

            </div>


            {/* =================================================
                ERROR
            ================================================= */}

            {plan.status === "error" && (
              <div className="error-card">

                <XCircle size={22} />

                <div>
                  <strong>
                    Something went wrong
                  </strong>

                  <p>
                    {plan.error ||
                      "Unable to process your goal."}
                  </p>
                </div>

              </div>
            )}


            {/* =================================================
                CLARIFICATION
            ================================================= */}

            {plan.status === "needs_clarification" && (
              <ClarificationCard
                plan={plan}
                goal={goal}
                setGoal={setGoal}
                setPlan={setPlan}
                setLoading={setLoading}
              />
            )}


            {/* =================================================
                ACTIONS
            ================================================= */}

            {plan.status !== "needs_clarification" &&
              plan.status !== "error" && (
                <div className="actions-card">

                  <div className="card-title">

                    <ListChecks size={19} />

                    Agent Actions

                  </div>

                  <div className="actions">

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
                      <div className="empty-actions">
                        No actions were generated.
                      </div>
                    )}

                  </div>

                </div>
              )}


            {/* =================================================
                APPROVAL FIREWALL
            ================================================= */}

            {plan.approvals_required?.length > 0 && (
              <div className="approval-card">

                <div className="approval-header">

                  <div className="approval-icon">
                    <ShieldCheck size={23} />
                  </div>

                  <div>

                    <div className="approval-label">
                      APPROVAL FIREWALL
                    </div>

                    <h3>
                      Human approval required
                    </h3>

                  </div>

                </div>


                {plan.approvals_required.map(
                  (approval, index) => (

                    <div
                      className="approval-content"
                      key={
                        approval.approval_id ||
                        index
                      }
                    >

                      {/* APPROVAL ID */}

                      <div className="approval-id">
                        Approval ID:{" "}
                        {approval.approval_id}
                      </div>


                      {/* WARNING */}

                      <div className="approval-warning">

                        <AlertTriangle size={18} />

                        <span>
                          Goal2Done wants to perform
                          a potentially consequential
                          action.
                        </span>

                      </div>


                      {/* ACTION */}

                      <div className="approval-action">

                        <div>

                          <span className="tool-label">
                            ACTION
                          </span>

                          <strong>
                            {approval.arguments?.title ||
                              approval.tool}
                          </strong>

                          {approval.arguments?.time && (
                            <span className="action-time">
                              {
                                approval.arguments.time
                              }
                            </span>
                          )}

                        </div>

                      </div>


                      {/* BUTTONS */}

                      <div className="approval-buttons">

                        {/* APPROVE */}

                        <button
                          className="approve-button"
                          disabled={
                            approvalLoading
                          }
                          onClick={() =>
                            approveAction(
                              approval
                            )
                          }
                        >

                          {approvalLoading ? (
                            <>
                              <Loader2
                                size={17}
                                className="spin"
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


                        {/* REJECT */}

                        <button
                          className="reject-button"
                          disabled={
                            approvalLoading
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

                  )
                )}

              </div>
            )}


            {/* =================================================
                REJECTED
            ================================================= */}

            {plan.status === "rejected" && (
              <div className="rejected-card">

                <div className="rejected-icon">
                  <XCircle size={28} />
                </div>

                <div>

                  <div className="rejected-label">
                    ACTION REJECTED
                  </div>

                  <h2>
                    Goal execution was stopped.
                  </h2>

                  <p>
                    Goal2Done respected your decision
                    and did not execute the rejected
                    action.
                  </p>

                </div>

              </div>
            )}


            {/* =================================================
                COMPLETION
            ================================================= */}

            {plan.status === "completed" && (
              <div className="success-card">

                <div className="success-icon">
                  <CheckCircle2 size={30} />
                </div>

                <div>

                  <div className="success-label">
                    GOAL COMPLETED
                  </div>

                  <h2>
                    Your goal was successfully
                    completed.
                  </h2>

                  <p>
                    Goal2Done executed the required
                    actions and verified their results.
                  </p>

                </div>

              </div>
            )}


            {/* =================================================
                NEW GOAL
            ================================================= */}

            {plan.status !==
              "needs_clarification" && (
              <button
                className="new-goal-button"
                onClick={startNewGoal}
              >
                ← Start another goal
              </button>
            )}

          </section>
        )}


        {/* ===================================================
            HISTORY
        =================================================== */}

        <ReminderSection
  reminders={reminders}
/>
<ExecutionHistory
  history={history}
/>

      </main>


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer>

        <span>
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

      </footer>

    </div>
  );
}


 
 


 

 
 
 

export default App;
