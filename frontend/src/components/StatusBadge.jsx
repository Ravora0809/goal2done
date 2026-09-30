/* ===========================================================
   STATUS BADGE
=========================================================== */
import { AlertTriangle } from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import { Clock3 } from "lucide-react";
import { XCircle } from "lucide-react";
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
export default StatusBadge;