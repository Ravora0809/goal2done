import { Clock3 } from "lucide-react";
import ReminderCard from "./ReminderCard";
function ReminderSection({ reminders }) {
  if (!reminders || reminders.length === 0) {
    return (
      <section className="reminders-section">
        <div className="section-label">
          REMINDERS
        </div>

        <div className="reminders-header">
          <div>
            <h2>Your reminders</h2>
            <p>
              Goal2Done will handle scheduled actions for you.
            </p>
          </div>

          <div className="reminder-count">
            0
          </div>
        </div>

        <div className="empty-reminders">
          <Clock3 size={24} />

          <div>
            <strong>No reminders yet</strong>
            <p>
              Try saying: "Remind me in 1 minute to test the scheduler."
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="reminders-section">

      <div className="section-label">
        REMINDERS
      </div>

      <div className="reminders-header">

        <div>
          <h2>Your reminders</h2>

          <p>
            Scheduled actions managed by Goal2Done.
          </p>
        </div>

        <div className="reminder-count">
          {reminders.length}
        </div>

      </div>

      <div className="reminders-list">

        {reminders.map((reminder, index) => (

          <ReminderCard
            key={
              reminder.id ||
              reminder.reminder_id ||
              index
            }
            reminder={reminder}
          />

        ))}

      </div>

    </section>
  );
}
export default ReminderSection;