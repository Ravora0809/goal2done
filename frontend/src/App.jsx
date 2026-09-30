import { useEffect, useState } from "react";

import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Search,
  ListChecks,
  Globe,
  ShieldCheck,
  Loader2,
  XCircle,
} from "lucide-react";

import "./App.css";

const API = "http://127.0.0.1:8000";

function App() {
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [history, setHistory] = useState([]);

  // Load execution history when app starts
  useEffect(() => {
    loadHistory();
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

        <div className="nav-status">
          <span className="status-dot"></span>
          Agent Online
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


/* ===========================================================
   CLARIFICATION CARD
=========================================================== */

function ClarificationCard({
  plan,
  goal,
  setGoal,
  setPlan,
  setLoading,
}) {

  const [answers, setAnswers] =
    useState(
      plan.questions?.map(() => "") || []
    );

  const [submitting, setSubmitting] =
    useState(false);


  function updateAnswer(index, value) {

    setAnswers((previous) => {

      const updated = [...previous];

      updated[index] = value;

      return updated;
    });

  }


  async function continueGoal() {

    const unanswered =
      answers.some(
        (answer) => !answer.trim()
      );

    if (unanswered) {

      alert(
        "Please answer all questions."
      );

      return;
    }


    const additionalInformation =
      plan.questions
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

      const response =
        await fetch(`${API}/goal`, {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            goal: updatedGoal,
          }),
        });


      const data =
        await response.json();


      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to update goal"
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
    <div className="clarification-card">

      <div className="clarification-header">

        <div className="clarification-icon">
          <AlertTriangle size={22} />
        </div>

        <div>

          <div className="clarification-label">
            MORE INFORMATION NEEDED
          </div>

          <h3>
            I need a few details before I
            can execute this goal.
          </h3>

        </div>

      </div>


      <div className="questions">

        {plan.questions?.map(
          (question, index) => (

            <div
              className="question"
              key={index}
            >

              <div className="question-number">
                {index + 1}
              </div>

              <div className="question-body">

                <label>
                  {question}
                </label>

                <input
                  type="text"
                  value={
                    answers[index]
                  }
                  onChange={(e) =>
                    updateAnswer(
                      index,
                      e.target.value
                    )
                  }
                  placeholder="Your answer..."
                />

              </div>

            </div>

          )
        )}

      </div>


      <div className="clarification-actions">

        <button
          className="continue-button"
          onClick={continueGoal}
          disabled={submitting}
        >

          {submitting ? (
            <>
              <Loader2
                size={17}
                className="spin"
              />

              Updating goal...
            </>
          ) : (
            <>
              Continue

              <ArrowRight size={17} />
            </>
          )}

        </button>


        <button
          className="cancel-button"
          onClick={() => {
            setPlan(null);
            setGoal("");
          }}
          disabled={submitting}
        >
          Cancel
        </button>

      </div>

    </div>
  );
}


/* ===========================================================
   WORKING STEP
=========================================================== */

function WorkingStep({
  icon,
  text,
}) {

  return (
    <div className="working-step">

      <div className="working-step-icon">
        {icon}
      </div>

      <span>
        {text}
      </span>

      <CheckCircle2
        size={16}
        className="step-check"
      />

    </div>
  );
}


/* ===========================================================
   STATUS BADGE
=========================================================== */

function StatusBadge({
  status,
}) {

  if (status === "completed") {

    return (
      <div className="status-badge completed">

        <CheckCircle2 size={15} />

        Completed

      </div>
    );
  }


  if (
    status ===
    "waiting_for_approval"
  ) {

    return (
      <div className="status-badge waiting">

        <Clock3 size={15} />

        Awaiting approval

      </div>
    );
  }


  if (
    status ===
    "needs_clarification"
  ) {

    return (
      <div className="status-badge clarification">

        <AlertTriangle size={15} />

        More information needed

      </div>
    );
  }


  if (status === "rejected") {

    return (
      <div className="status-badge rejected">

        <XCircle size={15} />

        Rejected

      </div>
    );
  }


  if (
    status ===
    "verification_failed"
  ) {

    return (
      <div className="status-badge rejected">

        <XCircle size={15} />

        Verification failed

      </div>
    );
  }


  if (status === "error") {

    return (
      <div className="status-badge rejected">

        <XCircle size={15} />

        Error

      </div>
    );
  }


  return (
    <div className="status-badge">
      Working
    </div>
  );
}


/* ===========================================================
   ACTION CARD
=========================================================== */

function ActionCard({
  action,
}) {

  const verified =
    action.verification?.verified === true;


  const awaiting =
    action.verification?.status ===
    "awaiting_approval";


  const rejected =
    action.verification?.status ===
    "rejected";


  const icon =
    action.tool === "search_web"
      ? <Search size={17} />
      : action.tool === "browser_open"
      ? <Globe size={17} />
      : action.tool === "create_task"
      ? <ListChecks size={17} />
      : <Clock3 size={17} />;


  return (
    <div className="action-row">

      <div className="action-icon">
        {icon}
      </div>


      <div className="action-info">

        <strong>
          {formatToolName(
            action.tool
          )}
        </strong>

        <span>

          {action.arguments?.query ||
            action.arguments?.title ||
            action.arguments?.url ||
            ""}

        </span>

      </div>


      <div className="action-status">

        {verified && (
          <>
            <CheckCircle2 size={16} />
            Verified
          </>
        )}


        {awaiting && (
          <>
            <Clock3 size={16} />
            Waiting
          </>
        )}


        {rejected && (
          <>
            <XCircle size={16} />
            Rejected
          </>
        )}


        {!verified &&
          !awaiting &&
          !rejected && (
            <>
              <Clock3 size={16} />
              Processing
            </>
          )}

      </div>

    </div>
  );
}


/* ===========================================================
   EXECUTION HISTORY
=========================================================== */

function ExecutionHistory({
  history,
}) {

  if (!history || history.length === 0) {
    return null;
  }


  return (
    <section className="history-section">

      <div className="section-label">
        EXECUTION HISTORY
      </div>

      <h2>
        Recent activity
      </h2>


      <div className="history-list">

        {history.map(
          (item, index) => {

            const verification =
              item.verification || {};


            const verified =
              verification.verified === true;


            const rejected =
              item.status === "rejected" ||
              verification.status ===
                "rejected";


            return (
              <div
                className="history-item"
                key={
                  item.execution_id ||
                  index
                }
              >

                <div className="history-icon">

                  {verified ? (
                    <CheckCircle2
                      size={18}
                    />
                  ) : rejected ? (
                    <XCircle size={18} />
                  ) : (
                    <Clock3 size={18} />
                  )}

                </div>


                <div className="history-info">

                  <strong>
                    {formatToolName(
                      item.tool ||
                        "Unknown action"
                    )}
                  </strong>

                  <span>
                    {item.goal ||
                      item.arguments?.title ||
                      item.arguments?.query ||
                      ""}
                  </span>

                </div>


                <div
                  className={`history-status ${
                    verified
                      ? "verified"
                      : rejected
                      ? "rejected"
                      : "pending"
                  }`}
                >

                  {verified
                    ? "Verified"
                    : rejected
                    ? "Rejected"
                    : "Pending"}

                </div>

              </div>
            );
          }
        )}

      </div>

    </section>
  );
}


/* ===========================================================
   FORMAT TOOL NAME
=========================================================== */

function formatToolName(tool) {

  if (!tool) {
    return "Unknown action";
  }


  return tool
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}


export default App;