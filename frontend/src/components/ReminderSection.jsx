import {
  Clock3,
  Bell,
  Sparkles,
} from "lucide-react";

import ReminderCard from "./ReminderCard";


/* ===========================================================
   REMINDER SECTION
=========================================================== */

function ReminderSection({
  reminders,
  onReminderChanged,
}) {

  if (
    !reminders ||
    reminders.length === 0
  ) {

    return (

      <section
        className="
          relative
          overflow-hidden
          rounded-3xl
          border
          border-slate-200
          bg-white
          shadow-sm
          dark:border-slate-800
          dark:bg-slate-900
        "
      >

        <div
          className="
            absolute
            inset-x-0
            top-0
            h-1
            bg-gradient-to-r
            from-indigo-500
            via-violet-500
            to-fuchsia-500
          "
        />


        <div
          className="
            flex
            flex-col
            gap-4
            border-b
            border-slate-100
            px-5
            py-5
            sm:flex-row
            sm:items-center
            sm:justify-between
            sm:px-6
            dark:border-slate-800
          "
        >

          <div
            className="
              flex
              items-center
              gap-3
            "
          >

            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-indigo-50
                text-indigo-600
                dark:bg-indigo-500/10
                dark:text-indigo-400
              "
            >

              <Bell
                size={19}
              />

            </div>


            <div>

              <div
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.18em]
                  text-indigo-500
                "
              >

                Reminders

              </div>


              <h2
                className="
                  mt-0.5
                  text-lg
                  font-bold
                  tracking-tight
                  text-slate-900
                  dark:text-white
                "
              >

                Your reminders

              </h2>

            </div>

          </div>


          <div
            className="
              flex
              h-8
              min-w-8
              items-center
              justify-center
              rounded-full
              bg-slate-100
              px-3
              text-xs
              font-bold
              text-slate-500
              dark:bg-slate-800
              dark:text-slate-400
            "
          >

            0

          </div>

        </div>


        <div
          className="
            p-5
            sm:p-6
          "
        >

          <div
            className="
              relative
              overflow-hidden
              rounded-2xl
              border
              border-dashed
              border-slate-300
              bg-slate-50/70
              p-7
              dark:border-slate-700
              dark:bg-slate-950/30
            "
          >

            <div
              className="
                pointer-events-none
                absolute
                -right-10
                -top-10
                h-32
                w-32
                rounded-full
                bg-indigo-500/5
                blur-2xl
              "
            />


            <div
              className="
                relative
                flex
                flex-col
                items-center
                justify-center
                text-center
                sm:flex-row
                sm:text-left
              "
            >

              <div
                className="
                  flex
                  h-12
                  w-12
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  bg-white
                  text-indigo-500
                  shadow-sm
                  dark:bg-slate-900
                  dark:text-indigo-400
                "
              >

                <Clock3
                  size={23}
                />

              </div>


              <div
                className="
                  mt-4
                  sm:ml-4
                  sm:mt-0
                "
              >

                <strong
                  className="
                    block
                    text-sm
                    font-semibold
                    text-slate-800
                    dark:text-slate-200
                  "
                >

                  No reminders yet

                </strong>


                <p
                  className="
                    mt-1
                    text-xs
                    leading-5
                    text-slate-500
                    dark:text-slate-400
                  "
                >

                  Try saying:

                </p>


                <div
                  className="
                    mt-2
                    inline-flex
                    items-center
                    gap-2
                    rounded-lg
                    border
                    border-slate-200
                    bg-white
                    px-3
                    py-2
                    text-xs
                    font-medium
                    text-slate-600
                    shadow-sm
                    dark:border-slate-800
                    dark:bg-slate-900
                    dark:text-slate-400
                  "
                >

                  <Sparkles
                    size={13}
                    className="text-indigo-500"
                  />

                  "Remind me in 1 minute to test the scheduler."

                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

    );
  }


  return (

    <section
      className="
        relative
        overflow-hidden
        rounded-3xl
        border
        border-slate-200
        bg-white
        shadow-sm
        dark:border-slate-800
        dark:bg-slate-900
      "
    >

      <div
        className="
          absolute
          inset-x-0
          top-0
          h-1
          bg-gradient-to-r
          from-indigo-500
          via-violet-500
          to-fuchsia-500
        "
      />


      <div
        className="
          flex
          flex-col
          gap-4
          border-b
          border-slate-100
          px-5
          py-5
          sm:flex-row
          sm:items-center
          sm:justify-between
          sm:px-6
          dark:border-slate-800
        "
      >

        <div
          className="
            flex
            items-center
            gap-3
          "
        >

          <div
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              bg-indigo-50
              text-indigo-600
              dark:bg-indigo-500/10
              dark:text-indigo-400
            "
          >

            <Bell
              size={19}
            />

          </div>


          <div>

            <div
              className="
                text-[10px]
                font-bold
                uppercase
                tracking-[0.18em]
                text-indigo-500
              "
            >

              Reminders

            </div>


            <h2
              className="
                mt-0.5
                text-lg
                font-bold
                tracking-tight
                text-slate-900
                dark:text-white
              "
            >

              Your reminders

            </h2>


            <p
              className="
                mt-1
                text-xs
                text-slate-400
                dark:text-slate-500
              "
            >

              Edit or delete scheduled actions anytime.

            </p>

          </div>

        </div>


        <div
          className="
            flex
            h-8
            min-w-8
            items-center
            justify-center
            rounded-full
            bg-indigo-50
            px-3
            text-xs
            font-bold
            text-indigo-600
            dark:bg-indigo-500/10
            dark:text-indigo-400
          "
        >

          {reminders.length}

        </div>

      </div>


      <div
        className="
          space-y-3
          bg-slate-50/50
          p-4
          sm:p-5
          dark:bg-slate-950/20
        "
      >

        {reminders.map(
          (
            reminder,
            index
          ) => (

            <ReminderCard
              key={
                reminder.id ||
                reminder.reminder_id ||
                index
              }

              reminder={
                reminder
              }

              onChanged={
                onReminderChanged
              }
            />

          )
        )}

      </div>

    </section>

  );
}


export default ReminderSection;