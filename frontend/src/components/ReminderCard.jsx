import { Clock3 } from "lucide-react";
import { CheckCircle2, XCircle } from "lucide-react";
function ReminderCard({ reminder }) {

  const status =
    reminder.status ||
    "scheduled";

  const title =
    reminder.title ||
    reminder.task ||
    reminder.name ||
    "Reminder";

  const time =
    reminder.remind_at ||
    reminder.scheduled_at ||
    reminder.time ||
    reminder.execute_at;

  const isCompleted =
    status === "completed";

  const isPending =
    status === "pending" ||
    status === "scheduled";

  return (
    <div className="reminder-card">

      <div className="reminder-icon">
        <Clock3 size={19} />
      </div>

      <div className="reminder-info">

        <strong>
          {title}
        </strong>

        {time && (
          <span className="reminder-time">
            {time}
          </span>
        )}

      </div>

      <div
        className={`reminder-status ${
          isCompleted
            ? "completed"
            : isPending
            ? "pending"
            : "failed"
        }`}
      >

        {isCompleted && (
          <>
            <CheckCircle2 size={15} />
            Completed
          </>
        )}

        {isPending && (
          <>
            <Clock3 size={15} />
            Scheduled
          </>
        )}

        {!isCompleted && !isPending && (
          <>
            <XCircle size={15} />
            {status}
          </>
        )}

      </div>

    </div>
  );
}
export default ReminderCard;