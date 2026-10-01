import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
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

import ReminderSection from "./components/ReminderSection";
import ExecutionHistory from "./components/ExecutionHistory";
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
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("goal2done-theme") || "dark";
  });

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

  const recentHistory = useMemo(
    () => history.slice(0, 8),
    [history]
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen">
        {/* SIDEBAR */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-950 ${
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
              Recent activity
            </div>

            <div className="space-y-1">
              {recentHistory.length ? (
                recentHistory.map((item, index) => (
                  <div
                    key={item.execution_id || index}
                    className="rounded-xl px-3 py-2.5 transition hover:bg-slate-100 dark:hover:bg-slate-900"
                  >
                    <div className="flex items-center gap-2">
                      <History size={14} className="shrink-0 text-slate-400" />
                      <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {item.goal ||
                          item.arguments?.title ||
                          item.arguments?.query ||
                          "Agent activity"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400 dark:border-slate-800">
                  No activity yet
                </div>
              )}
            </div>
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
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/90 sm:px-6">
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

          <div className="flex-1 overflow-y-auto">
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
          <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200/80 bg-slate-50/90 p-3 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/90 lg:left-[280px]">
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
        </main>
      </div>
    </div>
  );
}

export default App;
