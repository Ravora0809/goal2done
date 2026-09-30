/* ===========================================================
   WORKING STEP
=========================================================== */
import { CheckCircle2 } from "lucide-react";
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
export default WorkingStep;