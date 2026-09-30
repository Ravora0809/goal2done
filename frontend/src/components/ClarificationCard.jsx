/* ===========================================================
   CLARIFICATION CARD
=========================================================== */
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Loader2,
} from "lucide-react";
const API = "http://127.0.0.1:8000";
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
export default ClarificationCard;
