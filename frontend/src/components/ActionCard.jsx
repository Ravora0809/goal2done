import {
  Search,
  Globe,
  ListChecks,
  Clock3,
  CheckCircle2,
  XCircle,
} from "lucide-react";

function formatToolName(name) {
  if (!name) return "Unknown Action";

  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function ActionCard({ action }) {
  const verified =
    action.verification?.verified === true;

  const awaiting =
    action.verification?.status === "awaiting_approval";

  const rejected =
    action.verification?.status === "rejected";

  const icon =
    action.tool === "search_web"
      ? <Search size={17} />
      : action.tool === "browser_open"
      ? <Globe size={17} />
      : action.tool === "create_task"
      ? <ListChecks size={17} />
      : <Clock3 size={17} />;

  // Get the actual tool result
  const result = action.result;

  return (
    <div className="action-card">

      {/* ACTION HEADER */}
      <div className="action-row">

        <div className="action-icon">
          {icon}
        </div>

        <div className="action-info">

          <strong>
            {formatToolName(action.tool)}
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


      {/* ACTUAL RESULT */}
      {result && (
        <div className="action-result">

          <div className="result-label">
            RESULT
          </div>

          <ResultContent result={result} />

        </div>
      )}

    </div>
  );
}


/* =========================================================
   RESULT RENDERER
========================================================= */

function ResultContent({ result }) {

  // Search result array
  if (Array.isArray(result)) {
    return (
      <div className="result-list">

        {result.map((item, index) => (
          <div
            className="result-item"
            key={index}
          >

            {typeof item === "object" ? (
              <>
                {item.title && (
                  <strong>
                    {item.title}
                  </strong>
                )}

                {item.body && (
                  <p>
                    {item.body}
                  </p>
                )}

                {item.href && (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open source →
                  </a>
                )}

              </>
            ) : (
              <p>{String(item)}</p>
            )}

          </div>
        ))}

      </div>
    );
  }


  // Object result
  if (
    typeof result === "object" &&
    result !== null
  ) {

    // If backend returns { results: [...] }
    if (Array.isArray(result.results)) {
      return (
        <ResultContent
          result={result.results}
        />
      );
    }

    return (
      <div className="result-object">

        {Object.entries(result).map(
          ([key, value]) => {

            if (
              key === "status" &&
              typeof value === "string"
            ) {
              return null;
            }

            return (
              <div
                className="result-field"
                key={key}
              >

                <span>
                  {formatToolName(key)}
                </span>

                <strong>
                  {typeof value === "object"
                    ? JSON.stringify(
                        value,
                        null,
                        2
                      )
                    : String(value)}
                </strong>

              </div>
            );
          }
        )}

      </div>
    );
  }


  // String result
  return (
    <p className="result-text">
      {String(result)}
    </p>
  );
}

export default ActionCard;