import {
  Search,
  Globe,
  ListChecks,
  Clock3,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";


// ============================================================
// FORMAT TOOL NAME
// ============================================================

function formatToolName(name) {
  if (!name) return "Unknown Action";

  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}


// ============================================================
// ACTION CARD
// ============================================================

function ActionCard({ action }) {
  const verified =
    action.verification?.verified === true;

  const awaiting =
    action.verification?.status === "awaiting_approval";

  const rejected =
    action.verification?.status === "rejected";


  // ----------------------------------------------------------
  // ACTION ICON
  // ----------------------------------------------------------

  const icon =
    action.tool === "search_web" ? (
      <Search size={18} />
    ) : action.tool === "browser_open" ? (
      <Globe size={18} />
    ) : action.tool === "create_task" ? (
      <ListChecks size={18} />
    ) : action.tool === "generate_answer" ? (
      <CheckCircle2 size={18} />
    ) : (
      <Clock3 size={18} />
    );


  const result = action.result;


  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30 dark:hover:shadow-black/20">

      {/* Top accent */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-60" />


      {/* =====================================================
          ACTION HEADER
          ===================================================== */}

      <div className="flex items-center gap-4 px-5 py-4">

        {/* Icon */}
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-600 shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md dark:border-indigo-500/20 dark:from-indigo-500/10 dark:to-violet-500/10 dark:text-indigo-400">
          {icon}
        </div>


        {/* Action information */}
        <div className="min-w-0 flex-1">

          <div className="flex items-center gap-1.5">

            <strong className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {formatToolName(action.tool)}
            </strong>

            <ChevronRight
              size={14}
              className="shrink-0 text-slate-300 transition-transform duration-300 group-hover:translate-x-0.5 dark:text-slate-600"
            />

          </div>


          <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">
            {action.arguments?.query ||
              action.arguments?.title ||
              action.arguments?.url ||
              "Action executed"}
          </span>

        </div>


        {/* Status */}
        <div className="shrink-0">

          {verified && (
            <Status
              icon={<CheckCircle2 size={14} />}
              text="Verified"
              className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
            />
          )}


          {awaiting && (
            <Status
              icon={<Clock3 size={14} />}
              text="Waiting"
              className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400"
            />
          )}


          {rejected && (
            <Status
              icon={<XCircle size={14} />}
              text="Rejected"
              className="border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
            />
          )}


          {!verified && !awaiting && !rejected && (
            <Status
              icon={<Clock3 size={14} />}
              text="Processing"
              className="border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
            />
          )}

        </div>

      </div>


      {/* =====================================================
          RESULT
          ===================================================== */}

      {result && (
        <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-5 py-5 dark:border-slate-800 dark:from-slate-950/60 dark:to-slate-900">

          <div className="mb-4 flex items-center gap-2">

            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />

            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Result
            </span>

          </div>


          <ResultContent result={result} />

        </div>
      )}

    </div>
  );
}


// ============================================================
// STATUS
// ============================================================

function Status({
  icon,
  text,
  className,
}) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm ${className}`}
    >
      {icon}

      <span className="hidden sm:inline">
        {text}
      </span>
    </div>
  );
}


// ============================================================
// MARKDOWN RENDERER
// ============================================================

function MarkdownContent({ content }) {

  if (!content) {
    return null;
  }


  return (
    <div className="answer-content">

      <ReactMarkdown
        remarkPlugins={[remarkGfm]}

        components={{

          // --------------------------------------------------
          // HEADINGS
          // --------------------------------------------------

          h1: ({ children }) => (
            <h1 className="mb-5 mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {children}
            </h1>
          ),

          h2: ({ children }) => (
            <h2 className="mb-3 mt-7 border-b border-slate-200 pb-2 text-xl font-bold text-slate-900 dark:border-slate-700 dark:text-white">
              {children}
            </h2>
          ),

          h3: ({ children }) => (
            <h3 className="mb-2 mt-5 text-base font-bold text-slate-900 dark:text-white sm:text-lg">
              {children}
            </h3>
          ),


          // --------------------------------------------------
          // PARAGRAPH
          // --------------------------------------------------

          p: ({ children }) => (
            <p className="mb-4 text-sm leading-7 text-slate-700 dark:text-slate-300">
              {children}
            </p>
          ),


          // --------------------------------------------------
          // LISTS
          // --------------------------------------------------

          ul: ({ children }) => (
            <ul className="mb-5 ml-5 list-disc space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
              {children}
            </ul>
          ),

          ol: ({ children }) => (
            <ol className="mb-5 ml-5 list-decimal space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
              {children}
            </ol>
          ),

          li: ({ children }) => (
            <li className="pl-1">
              {children}
            </li>
          ),


          // --------------------------------------------------
          // BOLD / ITALIC
          // --------------------------------------------------

          strong: ({ children }) => (
            <strong className="font-bold text-slate-900 dark:text-white">
              {children}
            </strong>
          ),

          em: ({ children }) => (
            <em className="text-slate-600 dark:text-slate-400">
              {children}
            </em>
          ),


          // --------------------------------------------------
          // INLINE CODE
          // --------------------------------------------------

          code: ({ inline, children }) => {

            if (inline) {
              return (
                <code className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-300">
                  {children}
                </code>
              );
            }

            return (
              <code className="font-mono text-sm text-slate-100">
                {children}
              </code>
            );
          },


          // --------------------------------------------------
          // CODE BLOCK
          // --------------------------------------------------

          pre: ({ children }) => (
            <pre className="mb-5 mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 p-4 shadow-sm dark:border-slate-700">
              {children}
            </pre>
          ),


          // --------------------------------------------------
          // TABLE
          // --------------------------------------------------

          table: ({ children }) => (
            <div className="my-6 w-full overflow-x-auto rounded-xl border border-slate-200 shadow-sm dark:border-slate-700">
              <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          ),

          thead: ({ children }) => (
            <thead className="bg-slate-100 dark:bg-slate-800">
              {children}
            </thead>
          ),

          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {children}
            </tbody>
          ),

          tr: ({ children }) => (
            <tr className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
              {children}
            </tr>
          ),

          th: ({ children }) => (
            <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-700 dark:border-slate-700 dark:text-slate-200">
              {children}
            </th>
          ),

          td: ({ children }) => (
            <td className="px-4 py-3 align-top text-sm leading-6 text-slate-700 dark:text-slate-300">
              {children}
            </td>
          ),


          // --------------------------------------------------
          // BLOCKQUOTE
          // --------------------------------------------------

          blockquote: ({ children }) => (
            <blockquote className="my-5 rounded-r-lg border-l-4 border-indigo-500 bg-indigo-50 px-4 py-3 text-sm italic leading-6 text-slate-700 dark:bg-indigo-500/10 dark:text-slate-300">
              {children}
            </blockquote>
          ),


          // --------------------------------------------------
          // LINKS
          // --------------------------------------------------

          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {children}
            </a>
          ),


          // --------------------------------------------------
          // HORIZONTAL RULE
          // --------------------------------------------------

          hr: () => (
            <hr className="my-6 border-slate-200 dark:border-slate-700" />
          ),

        }}
      >
        {content}
      </ReactMarkdown>

    </div>
  );
}


// ============================================================
// RESULT CONTENT
// ============================================================

function ResultContent({ result }) {

  // ==========================================================
  // IMPORTANT:
  // If this is an answer result, ONLY show the answer.
  //
  // Do NOT show:
  // status
  // type
  // internal metadata
  // verification
  // execution details
  // ==========================================================

  if (
    typeof result === "object" &&
    result !== null &&
    typeof result.answer === "string"
  ) {
    return (
      <MarkdownContent
        content={result.answer}
      />
    );
  }


  // ==========================================================
  // STRING RESULT
  // ==========================================================

  if (typeof result === "string") {

    return (
      <MarkdownContent
        content={result}
      />
    );
  }


  // ==========================================================
  // ARRAY RESULT
  // Usually search results
  // ==========================================================

  if (Array.isArray(result)) {

    return (
      <div className="space-y-3">

        {result.map((item, index) => (

          <div
            key={index}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30"
          >

            {typeof item === "object" &&
            item !== null ? (

              <>

                {item.title && (
                  <div className="mb-2 flex items-start gap-2">

                    <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />

                    <strong className="text-sm font-semibold leading-6 text-slate-900 dark:text-white">
                      {item.title}
                    </strong>

                  </div>
                )}


                {item.body && (
                  <p className="mb-3 pl-3.5 text-xs leading-6 text-slate-600 dark:text-slate-400">
                    {item.body}
                  </p>
                )}


                {item.href && (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-3.5 inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition-all hover:bg-indigo-100 hover:text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
                  >
                    Open source
                    <ExternalLink size={13} />
                  </a>
                )}

              </>

            ) : (

              <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                {String(item)}
              </p>

            )}

          </div>

        ))}

      </div>
    );
  }


  // ==========================================================
  // OBJECT RESULT
  // ==========================================================

  if (
    typeof result === "object" &&
    result !== null
  ) {

    // --------------------------------------------------------
    // Search results
    // --------------------------------------------------------

    if (Array.isArray(result.results)) {

      return (
        <ResultContent
          result={result.results}
        />
      );
    }


    // --------------------------------------------------------
    // Task
    // --------------------------------------------------------

    if (result.task) {

      return (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">

          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Task Created
          </div>

          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {result.task.title}
          </div>

        </div>
      );
    }


    // --------------------------------------------------------
    // Reminder
    // --------------------------------------------------------

    if (result.reminder) {

      return (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">

          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Reminder Created
          </div>

          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {result.reminder.title}
          </div>

          {result.reminder.time && (
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {result.reminder.time}
            </div>
          )}

        </div>
      );
    }


    // --------------------------------------------------------
    // Browser
    // --------------------------------------------------------

    if (result.url) {

      return (
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
        >
          Open page
          <ExternalLink size={15} />
        </a>
      );
    }


    // --------------------------------------------------------
    // Fallback
    //
    // IMPORTANT:
    // Do not dump the entire object as JSON.
    // Only display meaningful fields.
    // --------------------------------------------------------

    const entries = Object.entries(result).filter(
      ([key, value]) => {

        const hiddenKeys = [
          "status",
          "type",
          "verified",
          "verification",
          "execution_id",
          "approval_id",
        ];

        return (
          !hiddenKeys.includes(key) &&
          value !== null &&
          value !== undefined &&
          value !== ""
        );
      }
    );


    if (entries.length === 0) {
      return null;
    }


    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

        {entries.map(
          ([key, value], index) => (

            <div
              key={key}
              className={`flex flex-col gap-1.5 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between ${
                index !== 0
                  ? "border-t border-slate-100 dark:border-slate-800"
                  : ""
              }`}
            >

              <span className="text-xs font-medium text-slate-500 dark:text-slate-500">
                {formatToolName(key)}
              </span>


              <div className="max-w-full text-sm leading-6 text-slate-800 sm:max-w-[70%] sm:text-right dark:text-slate-200">

                {typeof value === "object" ? (
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs">
                    {JSON.stringify(
                      value,
                      null,
                      2
                    )}
                  </pre>
                ) : (
                  String(value)
                )}

              </div>

            </div>

          )
        )}

      </div>
    );
  }


  return null;
}


export default ActionCard;