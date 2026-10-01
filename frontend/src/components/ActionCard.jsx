import React, {
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileText,
  Globe,
  ListTodo,
  Search,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import ReactMarkdown from "react-markdown";


/* ===========================================================
   TOOL NAME
=========================================================== */

function formatToolName(
  tool = ""
) {

  return tool
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase()
    );
}


/* ===========================================================
   DATE FORMAT
=========================================================== */

function formatDateTime(
  value
) {

  if (!value) {
    return null;
  }

  try {

    return new Date(
      value
    ).toLocaleString(
      undefined,
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );

  } catch {

    return value;
  }
}


/* ===========================================================
   TOOL ICON
=========================================================== */

function getToolIcon(
  tool
) {

  switch (tool) {

    case "search_web":
      return (
        <Search
          size={20}
        />
      );

    case "browser_open":
      return (
        <Globe
          size={20}
        />
      );

    case "create_task":
      return (
        <ListTodo
          size={20}
        />
      );

    case "create_reminder":
      return (
        <Clock3
          size={20}
        />
      );

    case "generate_answer":
      return (
        <FileText
          size={20}
        />
      );

    default:
      return (
        <FileText
          size={20}
        />
      );
  }
}


/* ===========================================================
   ACTION STATUS
=========================================================== */

function getActionStatus(
  action
) {

  const verificationStatus =
    action?.verification?.status;

  const actionStatus =
    action?.status;

  /*
   * Approval always takes priority.
   */

  if (
    actionStatus ===
      "waiting_for_approval" ||

    actionStatus ===
      "pending_approval" ||

    actionStatus ===
      "approval_required" ||

    verificationStatus ===
      "awaiting_approval"
  ) {

    return "waiting_for_approval";
  }


  if (
    actionStatus ===
      "rejected" ||

    verificationStatus ===
      "rejected"
  ) {

    return "rejected";
  }


  if (
    actionStatus ===
      "failed" ||

    actionStatus ===
      "verification_failed" ||

    verificationStatus ===
      "failed"
  ) {

    return "failed";
  }


  if (
    actionStatus ===
      "completed" ||

    action?.verification?.verified ===
      true
  ) {

    return "completed";
  }


  return "working";
}


/* ===========================================================
   STATUS CONFIG
=========================================================== */

const STATUS_CONFIG = {

  completed: {

    label: "Completed",

    icon: CheckCircle2,

    className:
      "border-emerald-500/20 " +
      "bg-emerald-500/10 " +
      "text-emerald-400",
  },


  waiting_for_approval: {

    label: "Awaiting approval",

    icon: Clock3,

    className:
      "border-amber-500/30 " +
      "bg-amber-500/10 " +
      "text-amber-400",
  },


  rejected: {

    label: "Rejected",

    icon: XCircle,

    className:
      "border-red-500/20 " +
      "bg-red-500/10 " +
      "text-red-400",
  },


  failed: {

    label: "Failed",

    icon: XCircle,

    className:
      "border-red-500/20 " +
      "bg-red-500/10 " +
      "text-red-400",
  },


  working: {

    label: "Processing",

    icon: Clock3,

    className:
      "border-slate-500/20 " +
      "bg-slate-500/10 " +
      "text-slate-500 dark:text-slate-400",
  },

};


/* ===========================================================
   RESULT CONTENT
=========================================================== */

function ResultContent({
  action,
  status,
}) {

  const result =
    action?.result || {};

  const tool =
    action?.tool;


  /* =======================================================
     APPROVAL
  ======================================================= */

  if (
    status ===
    "waiting_for_approval"
  ) {

    return (

      <div
        className="
          rounded-xl
          border
          border-amber-500/30
          bg-amber-500/10
          p-4
        "
      >

        <div
          className="
            flex
            items-center
            gap-2
            text-sm
            font-bold
            text-amber-400
          "
        >

          <Clock3
            size={16}
          />

          Awaiting approval

        </div>


        <div
          className="
            mt-2
            text-xs
            text-amber-300
          "
        >

          Risk level:{" "}

          <span
            className="font-semibold"
          >
            {result.risk ||
              "medium"}
          </span>

        </div>


        <div
          className="
            mt-3
            text-sm
            text-amber-300
          "
        >

          {result.message ||
            `Goal2Done wants to execute ${formatToolName(tool)}`}

        </div>

      </div>

    );
  }


  /* =======================================================
     ERROR
  ======================================================= */

  if (
    result.status ===
      "error" ||
    status === "failed"
  ) {

    return (

      <div
        className="
          rounded-xl
          border
          border-red-500/20
          bg-red-500/10
          p-4
        "
      >

        <div
          className="
            flex
            items-center
            gap-2
            text-sm
            font-semibold
            text-red-400
          "
        >

          <XCircle
            size={16}
          />

          Execution failed

        </div>


        <p
          className="
            mt-2
            text-sm
            leading-6
            text-slate-500 dark:text-slate-400
          "
        >

          {result.message ||
            "The action could not be completed."}

        </p>

      </div>

    );
  }


  /* =======================================================
     REJECTED
  ======================================================= */

  if (
    status === "rejected"
  ) {

    return (

      <div
        className="
          rounded-xl
          border
          border-red-500/20
          bg-red-500/10
          p-4
        "
      >

        <div
          className="
            flex
            items-center
            gap-2
            text-sm
            font-semibold
            text-red-400
          "
        >

          <XCircle
            size={16}
          />

          Action rejected

        </div>


        <p
          className="
            mt-2
            text-sm
            text-slate-500 dark:text-slate-400
          "
        >

          {result.message ||
            "This action was rejected by the user."}

        </p>

      </div>

    );
  }


  /* =======================================================
     GENERATED ANSWER
  ======================================================= */

  if (
    tool ===
      "generate_answer"
  ) {

    const answer =
      result.answer ||
      result.content ||
      result.message ||
      "";

    return (

      <div
        className="
          prose
          max-w-none
          text-sm
          leading-7
          prose-headings:text-slate-900 dark:text-slate-100
          prose-p:text-slate-700 dark:text-slate-300
          prose-strong:text-white
          prose-li:text-slate-700 dark:text-slate-300
        "
      >

        <ReactMarkdown>
          {answer}
        </ReactMarkdown>

      </div>

    );
  }


  /* =======================================================
     SEARCH
  ======================================================= */

  if (
    tool === "search_web"
  ) {

    const results =
      Array.isArray(
        result.results
      )
        ? result.results
        : [];


    if (!results.length) {

      return (

        <p
          className="
            text-sm
            text-slate-500 dark:text-slate-400
          "
        >
          No search results returned.
        </p>

      );
    }


    return (

      <div
        className="
          space-y-3
        "
      >

        {results.map(
          (
            item,
            index
          ) => (

            <div
              key={
                item.url ||
                index
              }
              className="
                rounded-xl
                border
                border-slate-200 dark:border-slate-800
                bg-slate-50 dark:bg-slate-900/50
                p-4
              "
            >

              <div
                className="
                  flex
                  items-start
                  justify-between
                  gap-4
                "
              >

                <div>

                  <p
                    className="
                      text-sm
                      font-semibold
                      text-slate-800 dark:text-slate-200
                    "
                  >

                    {item.title ||
                      "Search result"}

                  </p>


                  {item.content && (

                    <p
                      className="
                        mt-2
                        line-clamp-3
                        text-xs
                        leading-5
                        text-slate-500 dark:text-slate-400
                      "
                    >

                      {item.content}

                    </p>

                  )}

                </div>


                {item.url && (

                  <a
                    href={
                      item.url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="
                      shrink-0
                      text-indigo-400
                      hover:text-indigo-300
                    "
                  >

                    <ExternalLink
                      size={16}
                    />

                  </a>

                )}

              </div>

            </div>

          )
        )}

      </div>

    );
  }


  /* =======================================================
     REMINDER
  ======================================================= */

  if (
    tool ===
    "create_reminder"
  ) {

    const reminder =
      result.reminder ||
      {};

    return (

      <div
        className="
          rounded-xl
          border
          border-slate-200 dark:border-slate-800
          bg-slate-50 dark:bg-slate-900/50
          p-4
        "
      >

        <div
          className="
            flex
            items-center
            gap-2
            text-sm
            font-semibold
            text-slate-800 dark:text-slate-200
          "
        >

          <Clock3
            size={16}
            className="text-indigo-400"
          />

          {reminder.title ||
            "Reminder created"}

        </div>


        {(reminder.remind_at ||
          reminder.time) && (

          <p
            className="
              mt-2
              text-xs
              text-slate-500 dark:text-slate-400
            "
          >

            {formatDateTime(
              reminder.remind_at
            ) ||
              reminder.time}

          </p>

        )}

      </div>

    );
  }


  /* =======================================================
     TASK
  ======================================================= */

  if (
    tool === "create_task"
  ) {

    const task =
      result.task || {};

    return (

      <div
        className="
          rounded-xl
          border
          border-slate-200 dark:border-slate-800
          bg-slate-50 dark:bg-slate-900/50
          p-4
        "
      >

        <div
          className="
            flex
            items-center
            gap-2
            text-sm
            font-semibold
            text-slate-800 dark:text-slate-200
          "
        >

          <ListTodo
            size={16}
            className="text-indigo-400"
          />

          {task.title ||
            "Task created"}

        </div>

      </div>

    );
  }


  /* =======================================================
     BROWSER
  ======================================================= */

  if (
    tool ===
    "browser_open"
  ) {

    return (

      <div
        className="
          rounded-xl
          border
          border-slate-200 dark:border-slate-800
          bg-slate-50 dark:bg-slate-900/50
          p-4
        "
      >

        <div
          className="
            flex
            items-center
            gap-2
            text-sm
            text-slate-700 dark:text-slate-300
          "
        >

          <Globe
            size={16}
            className="text-indigo-400"
          />

          Browser action completed.

        </div>

      </div>

    );
  }


  /* =======================================================
     GENERIC
  ======================================================= */

  return (

    <pre
      className="
        max-h-96
        overflow-auto
        rounded-xl
        border
        border-slate-200 dark:border-slate-800
        bg-white dark:bg-slate-950
        p-4
        text-xs
        leading-6
        text-slate-700 dark:text-slate-300
      "
    >

      {JSON.stringify(
        result,
        null,
        2
      )}

    </pre>

  );
}


/* ===========================================================
   RESULT PREVIEW
=========================================================== */

function ResultPreview({
  action,
  status,
}) {

  const result =
    action?.result || {};


  if (
    status ===
    "waiting_for_approval"
  ) {

    return (
      <span>
        {result.message ||
          "Waiting for your approval"}
      </span>
    );
  }


  if (
    result.message
  ) {

    return (
      <span>
        {result.message}
      </span>
    );
  }


  if (
    result.answer
  ) {

    return (
      <span>
        {result.answer.slice(
          0,
          120
        )}
        {result.answer.length > 120
          ? "..."
          : ""}
      </span>
    );
  }


  return (
    <span>
      Action completed.
    </span>
  );
}


/* ===========================================================
   ACTION CARD
=========================================================== */

function ActionCard({
  action,
  onApprove,
  onReject,
}) {

  const [
    expanded,
    setExpanded,
  ] = useState(true);


  const status =
    useMemo(
      () =>
        getActionStatus(
          action
        ),
      [action]
    );


  const config =
    STATUS_CONFIG[
      status
    ] ||
    STATUS_CONFIG.working;


  const Icon =
    config.icon;


  const isApproval =
    status ===
    "waiting_for_approval";


  const verification =
    action?.verification ||
    {};


  return (

    <div
      className="
        overflow-hidden
        rounded-2xl
        border
        border-slate-200 bg-white dark:border-slate-200 dark:border-slate-800 dark:bg-white dark:bg-slate-950/40
      "
    >

      {/* =================================================
          HEADER
      ================================================= */}

      <button
        type="button"
        onClick={() =>
          setExpanded(
            (value) =>
              !value
          )
        }
        className="
          flex
          w-full
          items-center
          gap-4
          px-5
          py-4
          text-left
          transition
          hover:bg-slate-50 dark:hover:bg-slate-50 dark:bg-slate-900/50
        "
      >

        {/* Tool icon */}

        <div
          className="
            flex
            h-12
            w-12
            shrink-0
            items-center
            justify-center
            rounded-xl
            border
            border-indigo-500/30
            bg-indigo-500/10
            text-indigo-400
          "
        >

          {getToolIcon(
            action?.tool
          )}

        </div>


        {/* Main information */}

        <div
          className="
            min-w-0
            flex-1
          "
        >

          <div
            className="
              flex
              items-center
              gap-2
            "
          >

            <h3
              className="
                truncate
                text-sm
                font-bold
                text-slate-900 dark:text-slate-100
              "
            >

              {formatToolName(
                action?.tool
              )}

            </h3>


            <ChevronRight
              size={16}
              className="
                shrink-0
                text-slate-500
              "
            />

          </div>


          <div
            className="
              mt-1
              line-clamp-2
              text-xs
              leading-5
              text-slate-500 dark:text-slate-400
            "
          >

            <ResultPreview
              action={action}
              status={status}
            />

          </div>

        </div>


        {/* Status */}

        <div
          className={`
            flex
            shrink-0
            items-center
            gap-1.5
            rounded-full
            border
            px-3
            py-1.5
            text-[10px]
            font-bold
            uppercase
            tracking-wider
            ${config.className}
          `}
        >

          <Icon
            size={14}
          />

          <span>
            {config.label}
          </span>

        </div>


        {expanded ? (
          <ChevronDown
            size={17}
            className="
              shrink-0
              text-slate-500
            "
          />
        ) : (
          <ChevronRight
            size={17}
            className="
              shrink-0
              text-slate-500
            "
          />
        )}

      </button>


      {/* =================================================
          EXPANDED CONTENT
      ================================================= */}

      {expanded && (

        <div
          className="
            border-t
            border-slate-200 dark:border-slate-800
          "
        >

          {/* ===============================================
              APPROVAL BANNER
          =============================================== */}

          {isApproval && (

            <div
              className="
                border-b
                border-amber-500/20
                bg-amber-500/[0.08]
                px-5
                py-4
              "
            >

              <div
                className="
                  flex
                  items-start
                  gap-3
                "
              >

                <div
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    bg-amber-500/15
                    text-amber-400
                  "
                >

                  <AlertTriangle
                    size={18}
                  />

                </div>


                <div
                  className="
                    min-w-0
                    flex-1
                  "
                >

                  <div
                    className="
                      text-sm
                      font-bold
                      text-amber-400
                    "
                  >

                    Human approval required

                  </div>


                  <p
                    className="
                      mt-1
                      text-xs
                      leading-5
                      text-amber-300/90
                    "
                  >

                    Goal2Done is waiting for
                    your approval before
                    executing this action.

                  </p>


                  <div
                    className="
                      mt-3
                      inline-flex
                      rounded-full
                      border
                      border-amber-500/30
                      px-3
                      py-1
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-wider
                      text-amber-400
                    "
                  >

                    Risk:{" "}
                    {action?.result?.risk ||
                      "medium"}

                  </div>

                </div>

              </div>

            </div>

          )}


          {/* ===============================================
              RESULT
          =============================================== */}

          <div
            className="
              px-5
              py-5
            "
          >

            <div
              className="
                mb-4
                flex
                items-center
                gap-2
                text-[10px]
                font-bold
                uppercase
                tracking-[0.18em]
                text-slate-500
              "
            >

              <span
                className="
                  h-1.5
                  w-1.5
                  rounded-full
                  bg-indigo-500
                "
              />

              Result

            </div>


            <ResultContent
              action={action}
              status={status}
            />

          </div>


          {/* ===============================================
              VERIFICATION
          =============================================== */}

          <div
            className="
              border-t
              border-slate-200 dark:border-slate-800
              px-5
              py-3
            "
          >

            <div
              className="
                flex
                items-center
                justify-between
                gap-4
              "
            >

              <span
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-slate-500
                "
              >

                Verification

              </span>


              <span
                className={`
                  text-[11px]
                  font-semibold

                  ${
                    isApproval
                      ? "text-amber-400"
                      : verification.verified ===
                          true
                        ? "text-emerald-400"
                        : verification.status ===
                            "rejected"
                          ? "text-red-400"
                          : verification.status ===
                              "failed"
                            ? "text-red-400"
                            : "text-slate-500 dark:text-slate-400"
                  }
                `}
              >

                {isApproval
                  ? "Awaiting approval"
                  : verification.verified ===
                      true
                    ? "Verified"
                    : verification.status ===
                        "rejected"
                      ? "Rejected"
                      : verification.status ===
                          "failed"
                        ? "Failed"
                        : "Pending"}

              </span>

            </div>

          </div>


          {/* ===============================================
              APPROVAL BUTTONS
          =============================================== */}

          {isApproval && (

            <div
              className="
                flex
                flex-wrap
                items-center
                justify-end
                gap-3
                border-t
                border-slate-200 dark:border-slate-800
                bg-slate-50 dark:bg-slate-900/40
                px-5
                py-4
              "
            >

              {onReject && (

                <button
                  type="button"
                  onClick={() =>
                    onReject(
                      action
                    )
                  }
                  className="
                    inline-flex
                    items-center
                    gap-2
                    rounded-xl
                    border
                    border-red-500/20
                    bg-red-500/10
                    px-4
                    py-2.5
                    text-xs
                    font-bold
                    text-red-400
                    transition
                    hover:bg-red-500/20
                  "
                >

                  <XCircle
                    size={15}
                  />

                  Reject

                </button>

              )}


              {onApprove && (

                <button
                  type="button"
                  onClick={() =>
                    onApprove(
                      action
                    )
                  }
                  className="
                    inline-flex
                    items-center
                    gap-2
                    rounded-xl
                    bg-indigo-500
                    px-5
                    py-2.5
                    text-xs
                    font-bold
                    text-white
                    shadow-lg
                    shadow-indigo-500/20
                    transition
                    hover:bg-indigo-400
                  "
                >

                  <CheckCircle2
                    size={15}
                  />

                  Approve

                </button>

              )}

            </div>

          )}

        </div>

      )}

    </div>

  );
}


export default ActionCard;