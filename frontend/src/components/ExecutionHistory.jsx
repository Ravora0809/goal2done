import { CheckCircle2 } from "lucide-react";
import { Clock3 } from "lucide-react";
 /* ===========================================================
   EXECUTION HISTORY
=========================================================== */

function formatToolName(name) {
  if (!name) return "Unknown";

  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
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

export default ExecutionHistory;