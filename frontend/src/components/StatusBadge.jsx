import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  XCircle,
  Loader2,
} from "lucide-react";


/* ===========================================================
   STATUS BADGE
=========================================================== */

function StatusBadge({ status }) {

  /*
   * Normalize backend states.
   *
   * This means the UI will correctly understand:
   *
   * waiting_for_approval
   * pending_approval
   * approval_required
   * awaiting_approval
   *
   */

  const normalizedStatus = (() => {

    if (
      status === "pending_approval" ||
      status === "approval_required" ||
      status === "awaiting_approval"
    ) {
      return "waiting_for_approval";
    }

    return status;

  })();


  const config = {

    /* =====================================================
       COMPLETED
    ===================================================== */

    completed: {

      label: "Completed",

      icon: CheckCircle2,

      className:
        "border-emerald-200 " +
        "bg-emerald-50 " +
        "text-emerald-600 " +
        "dark:border-emerald-500/20 " +
        "dark:bg-emerald-500/10 " +
        "dark:text-emerald-400",
    },


    /* =====================================================
       WAITING FOR APPROVAL
    ===================================================== */

    waiting_for_approval: {

      label: "Awaiting approval",

      icon: Clock3,

      className:
        "border-amber-200 " +
        "bg-amber-50 " +
        "text-amber-600 " +
        "dark:border-amber-500/20 " +
        "dark:bg-amber-500/10 " +
        "dark:text-amber-400",
    },


    /* =====================================================
       CLARIFICATION
    ===================================================== */

    needs_clarification: {

      label: "More information needed",

      icon: AlertTriangle,

      className:
        "border-orange-200 " +
        "bg-orange-50 " +
        "text-orange-600 " +
        "dark:border-orange-500/20 " +
        "dark:bg-orange-500/10 " +
        "dark:text-orange-400",
    },


    /* =====================================================
       REJECTED
    ===================================================== */

    rejected: {

      label: "Rejected",

      icon: XCircle,

      className:
        "border-red-200 " +
        "bg-red-50 " +
        "text-red-600 " +
        "dark:border-red-500/20 " +
        "dark:bg-red-500/10 " +
        "dark:text-red-400",
    },


    /* =====================================================
       VERIFICATION FAILED
    ===================================================== */

    verification_failed: {

      label: "Verification failed",

      icon: XCircle,

      className:
        "border-red-200 " +
        "bg-red-50 " +
        "text-red-600 " +
        "dark:border-red-500/20 " +
        "dark:bg-red-500/10 " +
        "dark:text-red-400",
    },


    /* =====================================================
       ERROR
    ===================================================== */

    error: {

      label: "Error",

      icon: XCircle,

      className:
        "border-red-200 " +
        "bg-red-50 " +
        "text-red-600 " +
        "dark:border-red-500/20 " +
        "dark:bg-red-500/10 " +
        "dark:text-red-400",
    },

  };


  const current =
    config[normalizedStatus];


  /* =======================================================
     KNOWN STATUS
  ======================================================= */

  if (current) {

    const Icon =
      current.icon;

    return (

      <div
        className={`
          inline-flex
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
          shadow-sm
          ${current.className}
        `}
      >

        <Icon
          size={14}
          strokeWidth={2.2}
        />

        <span>
          {current.label}
        </span>

      </div>

    );
  }


  /* =======================================================
     DEFAULT / WORKING
  ======================================================= */

  return (

    <div
      className="
        inline-flex
        items-center
        gap-1.5
        rounded-full
        border
        border-indigo-200
        bg-indigo-50
        px-3
        py-1.5
        text-[10px]
        font-bold
        uppercase
        tracking-wider
        text-indigo-600
        shadow-sm
        dark:border-indigo-500/20
        dark:bg-indigo-500/10
        dark:text-indigo-400
      "
    >

      <Loader2
        size={14}
        className="animate-spin"
      />

      <span>
        Working
      </span>

    </div>

  );
}


export default StatusBadge;