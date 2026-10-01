import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  Menu,
  Moon,
  Plus,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
} from "lucide-react";

import ReminderCard from "./components/ReminderCard";
import ActionCard from "./components/ActionCard";

const API = "http://127.0.0.1:8000";

function makeId(prefix = "msg") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function extractAnswer(plan) {
  const answerAction = (plan?.actions || []).find(
    (action) =>
      action?.tool === "generate_answer" &&
      (action?.result?.answer ||
        action?.result?.content ||
        action?.result?.message)
  );

  return (
    answerAction?.result?.answer ||
    answerAction?.result?.content ||
    answerAction?.result?.message ||
    plan?.answer ||
    plan?.message ||
    ""
  );
}

function getConversationText(messages) {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-12)
    .map((message) => {
      const content =
        typeof message.content === "string"
          ? message.content
          : message.content?.text || "";
      return `${message.role === "user" ? "User" : "Goal2Done"}: ${content}`;
    })
    .join("\n");
}

function ChatBubble({ message, onApprove, onReject, approvalLoading }) {
  const isUser = message.role === "user";
  const plan = message.plan;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-3`}>
      {!isUser && (
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
          <Sparkles size={17} />
        </div>
      )}

      <div
        className={`min-w-0 max-w-[860px] ${
          isUser
            ? "rounded-2xl rounded-br-md bg-indigo-600 px-4 py-3 text-white shadow-lg shadow-indigo-500/10"
            : "w-full"
        }`}
      >
        {!isUser && (
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Goal2Done
            </span>
            {message.time && (
              <span className="text-[10px] text-slate-400">
                {formatTime(message.time)}
              </span>
            )}
          </div>
        )}

        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
        ) : (
          <div className="space-y-4">
            {message.content && (
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm leading-7 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                {message.content}
              </div>
            )}

            {message.questions?.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300">
                  <Clock3 size={16} />
                  I need a little more information
                </div>
                <div className="space-y-2">
                  {message.questions.map((question, index) => (
                    <div
                      key={index}
                      className="flex gap-3 rounded-xl border border-amber-200/70 bg-white/70 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-500/10 dark:bg-slate-900/40 dark:text-amber-200"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                        {index + 1}
                      </span>
                      <span>{question}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-amber-700/80 dark:text-amber-300/70">
                  You can answer naturally in your next message. You don't need to
                  leave this chat.
                </p>
              </div>
            )}

            {plan?.actions?.length > 0 && (
              <div className="space-y-3">
                {plan.actions.map((action, index) => {
                  const approval =
                    (plan.approvals_required || []).find(
                      (item) =>
                        item.approval_id === action.approval_id ||
                        item.execution_id === action.execution_id
                    ) || action;

                  const approvalId =
                    approval?.approval_id || action?.approval_id;

                  return (
                    <ActionCard
                      key={action.execution_id || action.approval_id || index}
                      action={action}
                      onApprove={
                        approvalId
                          ? () => onApprove(approval)
                          : undefined
                      }
                      onReject={
                        approvalId
                          ? () => onReject(approval)
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            )}

            {message.plan?.status === "completed" && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                <CheckCircle2 size={18} />
                Completed and verified. You can continue the conversation.
              </div>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          You
        </div>
      )}
    </div>
  );
}

const CONVERSATIONS_KEY = "goal2done-conversations";

function getConversationTitle(messages) {
  const firstUser = messages.find((message) => message.role === "user");
  const text = typeof firstUser?.content === "string" ? firstUser.content.trim() : "";
  if (!text) return "New conversation";
  return text.length > 42 ? `${text.slice(0, 42)}…` : text;
}

function readSavedConversations() {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveConversationSnapshot(conversation) {
  try {
    const existing = readSavedConversations().filter(
      (item) => item.id !== conversation.id
    );
    const next = [conversation, ...existing].slice(0, 30);
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(next));
    return next;
  } catch (error) {
    console.error("Could not save conversation:", error);
    return readSavedConversations();
  }
}


function reminderTimeValue(reminder) {
  return reminder?.remind_at || reminder?.scheduled_at || reminder?.time || reminder?.execute_at;
}

function reminderTitleValue(reminder) {
  return reminder?.title || reminder?.task || reminder?.name || "Reminder";
}

function CalendarPanel({ reminders, onReminderChanged }) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState("");

  const monthLabel = month.toLocaleDateString([], {
    month: "long",
    year: "numeric",
  });

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const selectedKey = selectedDate.toISOString().slice(0, 10);

  function dateKey(value) {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  }

  function eventTimeValue(event) {
    return event?.start || event?.start_time || event?.dateTime || event?.date;
  }

  function eventTitleValue(event) {
    return event?.title || event?.summary || "Calendar event";
  }

  function formatEventTime(value) {
    if (!value) return "All day";
    if (/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return "All day";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function loadCalendarEvents() {
    setCalendarLoading(true);
    setCalendarError("");

    try {
      const start = new Date(month.getFullYear(), month.getMonth(), 1, 0, 0, 0);
      const end = new Date(month.getFullYear(), month.getMonth() + 1, 1, 0, 0, 0);
      const params = new URLSearchParams({
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        max_results: "100",
      });

      const response = await fetch(`${API}/calendar/events?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not load Google Calendar events.");
      }

      setEvents(data.events || []);
    } catch (error) {
      console.error("Could not load calendar events:", error);
      setEvents([]);
      setCalendarError(error.message || "Could not load calendar events.");
    } finally {
      setCalendarLoading(false);
    }
  }

  useEffect(() => {
    loadCalendarEvents();
  }, [month]);

  const combinedItems = useMemo(() => {
    const items = [
      ...(events || []).map((event) => ({
        kind: "event",
        id: `event-${event.id}`,
        title: eventTitleValue(event),
        time: eventTimeValue(event),
        location: event.location || "",
        description: event.description || "",
        link: event.html_link || "",
        raw: event,
      })),
      ...(reminders || []).map((reminder) => ({
        kind: "reminder",
        id: `reminder-${reminder.id}`,
        title: reminderTitleValue(reminder),
        time: reminderTimeValue(reminder),
        location: "",
        description: "Goal2Done reminder",
        link: "",
        raw: reminder,
      })),
    ];

    return items
      .filter((item) => item.time && dateKey(item.time))
      .sort((a, b) => new Date(a.time) - new Date(b.time));
  }, [events, reminders]);

  const itemsByDate = useMemo(() => {
    const map = {};
    for (const item of combinedItems) {
      const key = dateKey(item.time);
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return map;
  }, [combinedItems]);

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = dateKey(date);
      return {
        date,
        key,
        inMonth: date.getMonth() === month.getMonth(),
        items: itemsByDate[key] || [],
      };
    });
  }, [month, itemsByDate]);

  const selectedItems = itemsByDate[selectedKey] || [];

  function shiftMonth(offset) {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(next);
    setSelectedDate(next);
  }

  function goToday() {
    const now = new Date();
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  }

  return (
    <aside className="flex h-full min-h-0 w-[380px] shrink-0 flex-col border-l border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-[#0b1120]/95">
      <div className="shrink-0 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
              <CalendarDays size={19} />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">Schedule</div>
              <h2 className="text-base font-extrabold tracking-tight">Calendar & reminders</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={loadCalendarEvents}
            className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-500 hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-500/30 dark:hover:text-indigo-300"
          >
            {calendarLoading ? "Syncing…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
          <div className="mb-4 flex items-center justify-between">
            <button type="button" onClick={() => shiftMonth(-1)} className="rounded-xl p-2 text-slate-500 hover:bg-white hover:text-indigo-600 dark:hover:bg-slate-800" aria-label="Previous month">
              <ChevronLeft size={17} />
            </button>
            <div className="text-center">
              <div className="text-sm font-extrabold">{monthLabel}</div>
              <button type="button" onClick={goToday} className="mt-0.5 text-[10px] font-bold text-indigo-500 hover:text-indigo-600">Jump to today</button>
            </div>
            <button type="button" onClick={() => shiftMonth(1)} className="rounded-xl p-2 text-slate-500 hover:bg-white hover:text-indigo-600 dark:hover:bg-slate-800" aria-label="Next month">
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 text-center text-[9px] font-bold uppercase tracking-wider text-slate-400">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => <span key={day}>{day.slice(0, 2)}</span>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell) => {
              const isToday = cell.key === todayKey;
              const isSelected = cell.key === selectedKey;
              const hasItems = cell.items.length > 0;
              const eventCount = cell.items.filter((item) => item.kind === "event").length;
              const reminderCount = cell.items.filter((item) => item.kind === "reminder").length;

              return (
                <button
                  type="button"
                  key={cell.key}
                  onClick={() => setSelectedDate(cell.date)}
                  className={`relative flex h-12 flex-col items-center justify-center rounded-xl text-xs font-semibold transition ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                      : isToday
                      ? "border border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
                      : cell.inMonth
                      ? "text-slate-700 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
                      : "text-slate-300 dark:text-slate-700"
                  }`}
                >
                  <span>{cell.date.getDate()}</span>
                  {hasItems && (
                    <span className="mt-1 flex items-center gap-0.5">
                      {eventCount > 0 && <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-indigo-500"}`} />}
                      {reminderCount > 0 && <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-indigo-200" : "bg-violet-400"}`} />}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-center gap-4 text-[9px] font-semibold text-slate-400">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Calendar</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-violet-400" /> Reminder</span>
          </div>
        </div>

        {calendarError && (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-5 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            <div className="font-bold">Calendar sync needs attention</div>
            <div className="mt-0.5">{calendarError}</div>
          </div>
        )}

        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Selected day</div>
              <h3 className="mt-0.5 text-sm font-extrabold">
                {selectedDate.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
              </h3>
            </div>
            <div className="flex h-7 min-w-7 items-center justify-center rounded-full bg-indigo-50 px-2 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
              {selectedItems.length}
            </div>
          </div>

          {selectedItems.length > 0 ? (
            <div className="space-y-2">
              {selectedItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm ${item.kind === "event" ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300" : "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"}`}>
                      {item.kind === "event" ? <CalendarDays size={14} /> : <Bell size={14} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{item.kind === "event" ? "Calendar event" : "Goal2Done reminder"}</div>
                      <div className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-100">{item.title}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                        <Clock3 size={11} />
                        {formatEventTime(item.time)}
                      </div>
                      {item.location && <div className="mt-1 truncate text-[10px] text-slate-400">{item.location}</div>}
                      {item.description && <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-400">{item.description}</div>}
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-[10px] font-bold text-indigo-500 hover:text-indigo-600">
                          Open in Google Calendar ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400 dark:border-slate-800">
              No events or reminders on this day.
            </div>
          )}
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Upcoming</div>
              <h3 className="mt-0.5 text-sm font-extrabold">Your next items</h3>
            </div>
            <span className="text-[10px] font-semibold text-slate-400">{combinedItems.length} loaded</span>
          </div>

          <div className="space-y-2">
            {combinedItems.slice(0, 8).map((item) => (
              <button
                type="button"
                key={`upcoming-${item.id}`}
                onClick={() => {
                  const date = new Date(item.time);
                  setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                  setSelectedDate(date);
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30"
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.kind === "event" ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300" : "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"}`}>
                  {item.kind === "event" ? <CalendarDays size={14} /> : <Bell size={14} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold">{item.title}</div>
                  <div className="mt-0.5 text-[10px] text-slate-400">
                    {new Date(item.time).toLocaleDateString([], { month: "short", day: "numeric" })} · {formatEventTime(item.time)}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {combinedItems.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center dark:border-slate-800">
              <CalendarDays size={24} className="mx-auto text-slate-300 dark:text-slate-600" />
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">No dated items yet</p>
              <p className="mt-1 text-[10px] text-slate-400">Create a calendar event or reminder from the chat.</p>
            </div>
          )}
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[10px] leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
            <ShieldCheck size={13} className="text-emerald-500" />
            Your control stays on
          </div>
          <p className="mt-1">Creating, rescheduling, or deleting calendar events still goes through Goal2Done’s approval flow.</p>
        </div>
      </div>
    </aside>
  );
}

function App() {
  const [messages, setMessages] = useState([
    {
      id: makeId(),
      role: "assistant",
      content:
        "Hi! I'm Goal2Done. Ask me a question, give me a goal, or continue something we were already working on.",
      time: new Date().toISOString(),
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [approvalLoading, setApprovalLoading] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("goal2done-theme") || "dark";
  });

  const [conversationId, setConversationId] = useState(() => makeId("conversation"));
  const [savedConversations, setSavedConversations] = useState(() => readSavedConversations());

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("goal2done-theme", theme);
  }, [theme]);

  useEffect(() => {
    loadHistory();
    loadReminders();
  }, []);

  useEffect(() => {
    if (messages.some((message) => message.role === "user")) {
      const snapshot = {
        id: conversationId,
        title: getConversationTitle(messages),
        messages,
        updatedAt: new Date().toISOString(),
      };
      setSavedConversations(saveConversationSnapshot(snapshot));
    }
  }, [messages, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function loadHistory() {
    try {
      const response = await fetch(`${API}/history`);
      if (!response.ok) return;
      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error("Could not load history:", error);
    }
  }

  async function loadReminders() {
    try {
      const response = await fetch(`${API}/reminders`);
      if (!response.ok) return;
      const data = await response.json();
      setReminders(data.reminders || []);
    } catch (error) {
      console.error("Could not load reminders:", error);
    }
  }

  function addAssistantMessage(content, extra = {}) {
    setMessages((previous) => [
      ...previous,
      {
        id: makeId(),
        role: "assistant",
        content,
        time: new Date().toISOString(),
        ...extra,
      },
    ]);
  }

  async function sendMessage(event) {
    event?.preventDefault();

    const value = input.trim();
    if (!value || loading) return;

    const nextUserMessage = {
      id: makeId(),
      role: "user",
      content: value,
      time: new Date().toISOString(),
    };

    const nextMessages = [...messages, nextUserMessage];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      /*
       * The backend currently exposes /goal rather than a dedicated /chat
       * endpoint. We preserve the conversation on the frontend and send the
       * recent transcript as context so a follow-up stays in the same flow.
       */
      const conversationContext = getConversationText(nextMessages);

      const goal = `
You are continuing an existing conversation with the user.

Recent conversation:
${conversationContext}

Latest user message:
${value}

Treat the latest message as a continuation when it answers a previous clarification.
Do not invent missing information. If a critical detail is missing, ask for it
instead of executing the goal.
`.trim();

      const response = await fetch(`${API}/goal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ goal }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to process your request.");
      }

      const answer = extractAnswer(data);

      if (data.status === "needs_clarification") {
        addAssistantMessage(
          data.message ||
            "I understand what you want to do. I need a few details before I can safely continue.",
          {
            questions: data.questions || [],
            plan: data,
          }
        );
      } else if (answer) {
        addAssistantMessage(answer, { plan: data });
      } else if (data.status === "waiting_for_approval") {
        addAssistantMessage(
          "I have prepared the next step. Please review the action below and approve it when you're ready.",
          { plan: data }
        );
      } else if (data.status === "completed") {
        addAssistantMessage(
          "Done. I completed the requested actions and verified the result.",
          { plan: data }
        );
      } else if (data.status === "verification_failed") {
        addAssistantMessage(
          "I couldn't verify the requested result. I’ve kept the execution details below so we can decide what to do next.",
          { plan: data }
        );
      } else {
        addAssistantMessage(
          data.message ||
            "I processed that request. Here's what happened.",
          { plan: data }
        );
      }

      await Promise.all([loadHistory(), loadReminders()]);
    } catch (error) {
      console.error(error);
      addAssistantMessage(
        error.message || "I couldn't connect to the Goal2Done backend."
      );
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function approveAction(approval) {
    if (!approval?.approval_id) return;

    setApprovalLoading(approval.approval_id);

    try {
      const response = await fetch(`${API}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approval_id: approval.approval_id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Approval failed.");
      }

      setMessages((previous) => [
        ...previous,
        {
          id: makeId(),
          role: "assistant",
          content:
            data.status === "completed"
              ? "Approved. The action has been executed and verified."
              : "Approved. The action has been processed.",
          time: new Date().toISOString(),
          plan: {
            ...data,
            status: data.status,
            actions: data.action ? [data.action] : [],
          },
        },
      ]);

      await Promise.all([loadHistory(), loadReminders()]);
    } catch (error) {
      addAssistantMessage(error.message || "Approval failed.");
    } finally {
      setApprovalLoading(null);
    }
  }

  async function rejectAction(approval) {
    if (!approval?.approval_id) return;

    setApprovalLoading(approval.approval_id);

    try {
      const response = await fetch(`${API}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approval_id: approval.approval_id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Rejection failed.");
      }

      setMessages((previous) => [
        ...previous,
        {
          id: makeId(),
          role: "assistant",
          content:
            "Understood. I rejected that action and did not execute it.",
          time: new Date().toISOString(),
          plan: {
            ...data,
            status: "rejected",
            actions: data.action ? [data.action] : [],
          },
        },
      ]);

      await Promise.all([loadHistory(), loadReminders()]);
    } catch (error) {
      addAssistantMessage(error.message || "Rejection failed.");
    } finally {
      setApprovalLoading(null);
    }
  }

  function startNewChat() {
    const nextId = makeId("conversation");
    setConversationId(nextId);
    setMessages([
      {
        id: makeId(),
        role: "assistant",
        content:
          "New conversation started. What would you like me to help you get done?",
        time: new Date().toISOString(),
      },
    ]);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function openConversation(conversation) {
    if (!conversation?.messages?.length) return;
    setConversationId(conversation.id);
    setMessages(conversation.messages);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const conversationList = useMemo(() => {
    return savedConversations
      .filter((conversation) => conversation.messages?.some((message) => message.role === "user"))
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  }, [savedConversations]);

  const recentHistory = useMemo(
    () => history.slice(0, 8),
    [history]
  );

  return (
    <div className="h-screen overflow-hidden bg-[#f8fafc] text-slate-900 transition-colors duration-200 dark:bg-[#0b1120] dark:text-slate-100">
      <div className="flex h-full min-h-0">
        {/* SIDEBAR */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-[#0b1120] ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:static lg:translate-x-0`}
        >
          <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="text-sm font-extrabold tracking-tight">
                  Goal2Done
                </div>
                <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Personal Agent
                </div>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 lg:hidden"
              aria-label="Close sidebar"
            >
              <X size={17} />
            </button>
          </div>

          <div className="p-3">
            <button
              onClick={startNewChat}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-500"
            >
              <Plus size={17} />
              New conversation
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-4">
            <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Conversations
            </div>

            <div className="space-y-1.5">
              {conversationList.length ? (
                conversationList.map((conversation) => {
                  const active = conversation.id === conversationId;
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => openConversation(conversation)}
                      className={`group flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition ${
                        active
                          ? "border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300"
                          : "border border-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
                      }`}
                    >
                      <History size={14} className={`mt-0.5 shrink-0 ${active ? "text-indigo-500" : "text-slate-400"}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold">
                          {conversation.title}
                        </span>
                        <span className="mt-0.5 block text-[9px] text-slate-400">
                          {new Date(conversation.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400 dark:border-slate-800">
                  Your past conversations will appear here.
                </div>
              )}
            </div>

            {recentHistory.length > 0 && (
              <div className="mt-6">
                <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Recent activity
                </div>
                <div className="space-y-1">
                  {recentHistory.slice(0, 5).map((item, index) => (
                    <div
                      key={item.execution_id || index}
                      className="rounded-xl px-3 py-2 transition hover:bg-slate-100 dark:hover:bg-slate-900"
                    >
                      <div className="flex items-center gap-2">
                        <History size={13} className="shrink-0 text-slate-400" />
                        <span className="truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          {item.goal || item.arguments?.title || item.arguments?.query || "Agent activity"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 p-3 dark:border-slate-800">
            <div className="mb-2 flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2.5 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
                <span className="text-xs font-semibold">
                  {theme === "dark" ? "Dark mode" : "Light mode"}
                </span>
              </div>

              <button
                onClick={() =>
                  setTheme((value) => (value === "dark" ? "light" : "dark"))
                }
                className="relative h-6 w-11 rounded-full bg-slate-300 transition dark:bg-indigo-600"
                aria-label="Toggle theme"
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
                    theme === "dark" ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-2 px-2 py-2 text-[10px] text-slate-400">
              <ShieldCheck size={13} />
              Human approval at critical actions
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <button
            className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          />
        )}

        {/* MAIN */}
        <main className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#0b1120]/90 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen((value) => !value)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                aria-label="Toggle sidebar"
              >
                {sidebarOpen ? (
                  <ChevronLeft size={18} />
                ) : (
                  <Menu size={18} />
                )}
              </button>

              <div>
                <h1 className="text-sm font-bold sm:text-base">
                  Agent workspace
                </h1>
                <p className="hidden text-[10px] text-slate-400 sm:block">
                  Chat naturally. Goal2Done plans, executes, verifies.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setScheduleOpen((value) => !value)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 xl:hidden"
                aria-label="Open calendar"
              >
                <CalendarDays size={17} />
              </button>

              <button
                onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
              </button>

              <div className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Agent online
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto w-full max-w-5xl px-4 pb-40 pt-8 sm:px-6 lg:px-8">
              {/* HERO */}
              <div className="mb-8">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <Sparkles size={12} />
                  Autonomous workspace
                </div>

                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Tell me what you want{" "}
                  <span className="text-indigo-600 dark:text-indigo-400">
                    done.
                  </span>
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Ask a normal question or give me a goal. If I need more
                  information, I'll ask you here instead of sending you to another
                  page.
                </p>
              </div>

              {/* CHAT */}
              <section className="space-y-7">
                {messages.map((message) => (
                  <ChatBubble
                    key={message.id}
                    message={message}
                    onApprove={approveAction}
                    onReject={rejectAction}
                    approvalLoading={approvalLoading}
                  />
                ))}

                {loading && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
                      <Sparkles size={17} />
                    </div>
                    <div className="rounded-2xl rounded-tl-md border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <span className="flex gap-1">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500 [animation-delay:-0.3s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500 [animation-delay:-0.15s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500" />
                        </span>
                        Thinking and planning…
                      </div>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </section>
            </div>
          </div>

          {/* COMPOSER */}
          <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-slate-200/80 bg-slate-50/90 p-3 backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#0b1120]/90">
            <form
              onSubmit={sendMessage}
              className="mx-auto max-w-5xl"
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/30 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage(event);
                      }
                    }}
                    rows={1}
                    disabled={loading}
                    placeholder="Ask anything or tell me what you want done…"
                    className="max-h-32 min-h-[44px] flex-1 resize-none border-0 bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-50 dark:text-white"
                  />

                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Send message"
                  >
                    <ArrowUp size={19} />
                  </button>
                </div>

                <div className="flex items-center justify-between px-3 pb-1 pt-1">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <ShieldCheck size={12} />
                    Critical actions require your approval
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Enter to send · Shift+Enter for new line
                  </span>
                </div>
              </div>
            </form>
          </div>

          {/* MOBILE / TABLET CALENDAR DRAWER */}
          {scheduleOpen && (
            <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm xl:hidden">
              <button
                type="button"
                className="absolute inset-0 cursor-default"
                onClick={() => setScheduleOpen(false)}
                aria-label="Close calendar"
              />
              <div className="relative z-10 h-full max-w-[92vw] shadow-2xl">
                <CalendarPanel
                  reminders={reminders}
                  onReminderChanged={async () => {
                    await loadReminders();
                    setScheduleOpen(false);
                  }}
                />
              </div>
            </div>
          )}
        </main>

        {/* DESKTOP CALENDAR / REMINDER CENTER */}
        <div className="hidden h-full xl:block">
          <CalendarPanel
            reminders={reminders}
            onReminderChanged={loadReminders}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
