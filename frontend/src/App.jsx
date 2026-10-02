import { useEffect, useMemo, useRef, useState } from "react";

import {

 ArrowUp,
 ArrowRight,

 Bell,

 CalendarDays,

 CheckCircle2,

 ChevronLeft,

 ChevronRight,

 Clock3,

 History,

 Menu,


 Plus,

 ShieldCheck,

 Sparkles,


 X,

} from "lucide-react";
import Privacy from "./components/Privacy";
import Terms from "./components/Terms";


import ReminderCard from "./components/ReminderCard";



const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function apiFetch(path, options = {}) {
 return fetch(`${API}${path}`, {
 ...options,
 credentials: "include",
 });
}



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





function getApprovalLabel(action) {

 const tool = action?.tool || "this action";

 const args = action?.arguments || {};



 if (tool === "docs_create_document") {

 return `Create Google Doc “${args.title || "Untitled document"}”`;

 }

 if (tool === "docs_append_text") {

 return `Update Google Doc “${args.document_id || "document"}”`;

 }

 if (tool === "sheets_create_spreadsheet") {

 return `Create Google Sheet “${args.title || "Untitled spreadsheet"}”`;

 }

 if (tool === "calendar_create_event") {

 return `Create calendar event “${args.title || "Untitled event"}”`;

 }

 if (tool === "calendar_update_event") return "Update a calendar event";

 if (tool === "calendar_delete_event") return "Delete a calendar event";

 if (tool === "create_reminder") return `Create reminder “${args.title || "Reminder"}”`;

 if (tool === "update_reminder") return `Reschedule reminder “${args.title || "Reminder"}”`;

 if (tool === "delete_reminder") return `Delete reminder “${args.title || "Reminder"}”`;

 if (tool === "send_email") return `Send email to ${args.to || "the recipient"}`;

 if (tool === "send_message") return `Send a message to ${args.recipient || "the recipient"}`;

 if (tool === "browser_action") return "Make the requested website change";

 return `Run ${tool.replaceAll("_", " ")}`;

}



function getCompletionMessage(action) {

 const result = action?.result || {};

 const tool = action?.tool || "";



 if (tool === "docs_create_document" && result?.document) {

 return {

 text: `Done. I created “${result.document.title || "your Google Doc"}” and verified it successfully.`,

 url: result.document.url,

 linkLabel: "Open Google Doc",

 };

 }



 if (tool === "sheets_create_spreadsheet" && result?.spreadsheet) {

 return {

 text: `Done. I created “${result.spreadsheet.title || "your Google Sheet"}” and verified it successfully.`,

 url: result.spreadsheet.url,

 linkLabel: "Open Google Sheet",

 };

 }



 if (tool === "calendar_create_event" && result?.event) {

 return { text: `Done. I created “${result.event.title || "the calendar event"}” and verified it successfully.` };

 }



 if (tool === "create_reminder" && result?.reminder) {

 return { text: `Done. I created the reminder “${result.reminder.title || "Reminder"}” and verified it successfully.` };

 }



 if (tool === "send_email" && result?.status === "success") {

 return { text: "Done. The email was sent and the result was verified." };

 }



 if (tool === "send_message" && result?.status === "success") {

 return { text: "Done. The message was sent and the result was verified." };

 }



 if (action?.verification?.verified) {

 return { text: "Done — the requested action was completed and verified." };

 }



 return { text: "I completed the action, but I could not verify the requested result." };

}



function getApprovalAction(plan) {

 return (plan?.approvals_required || [])[0] || null;

}



function ApprovalBubble({ action, onApprove, onReject, loading }) {

 if (!action) return null;



 const label = getApprovalLabel(action);

 const isLoading = loading === action.approval_id;



 return (

 <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm ">

 <div className="flex items-start gap-3">

 <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 ">

 <ShieldCheck size={17} />

 </div>

 <div className="min-w-0 flex-1">

 <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 ">

 Approval needed

 </div>

 <div className="mt-1 text-sm font-semibold text-slate-900 ">

 {label}

 </div>

 <p className="mt-1 text-xs leading-5 text-slate-500 ">

 I’ll only perform this action after you approve it.

 </p>

 <div className="mt-3 flex flex-wrap gap-2">

 <button

 type="button"

 disabled={loading !== null}

 onClick={() => onApprove(action)}

 className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"

 >

 {isLoading ? "Working…" : "Approve"}

 </button>

 <button

 type="button"

 disabled={loading !== null}

 onClick={() => onReject(action)}

 className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 "

 >

 Reject

 </button>

 </div>

 </div>

 </div>

 </div>

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

 <span className="text-xs font-bold text-slate-900 ">

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

 <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm leading-7 text-slate-700 shadow-sm ">

 <div className="whitespace-pre-wrap">{message.content}</div>

 {message.link && (

 <a

 href={message.link}

 target="_blank"

 rel="noreferrer"

 className="mt-3 inline-flex items-center rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500"

 >

 {message.linkLabel || "Open"}

 </a>

 )}

 </div>

 )}



 {message.questions?.length > 0 && (

 <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm ">

 <div className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-800 ">

 <Clock3 size={16} />

 I need a little more information

 </div>

 <div className="space-y-2">

 {message.questions.map((question, index) => (

 <div

 key={index}

 className="flex gap-3 rounded-xl border border-amber-200/70 bg-white/70 px-3 py-2.5 text-sm text-amber-900 "

 >

 <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-[10px] font-bold text-amber-700 ">

 {index + 1}

 </span>

 <span>{question}</span>

 </div>

 ))}

 </div>

 <p className="mt-3 text-xs text-amber-700/80 ">

 You can answer naturally in your next message. You don't need to

 leave this chat.

 </p>

 </div>

 )}



 {plan?.status === "waiting_for_approval" && (

 <ApprovalBubble

 action={getApprovalAction(plan)}

 onApprove={onApprove}

 onReject={onReject}

 loading={approvalLoading}

 />

 )}



 </div>

 )}

 </div>



 {isUser && (

 <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-600 ">

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



function CalendarPanel({ reminders, onReminderChanged, onHide }) {

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

 if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return "All day";

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



 const response = await apiFetch(`/calendar/events?${params.toString()}`);

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

 <aside className="flex h-full min-h-0 w-[380px] shrink-0 flex-col border-l border-slate-200 bg-white/95 ">

 <div className="shrink-0 border-b border-slate-200 px-5 py-4 ">

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

 <div className="flex items-center gap-2">
 <button type="button" onClick={loadCalendarEvents} className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-500 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600">
 {calendarLoading ? "Syncing…" : "Refresh"}
 </button>
 {onHide && (
 <button type="button" onClick={onHide} className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-500 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600" aria-label="Hide calendar">
 Hide
 </button>
 )}
 </div>

 </div>

 </div>



 <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">

 <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm ">

 <div className="mb-4 flex items-center justify-between">

 <button type="button" onClick={() => shiftMonth(-1)} className="rounded-xl p-2 text-slate-500 hover:bg-white hover:text-indigo-600 " aria-label="Previous month">

 <ChevronLeft size={17} />

 </button>

 <div className="text-center">

 <div className="text-sm font-extrabold">{monthLabel}</div>

 <button type="button" onClick={goToday} className="mt-0.5 text-[10px] font-bold text-indigo-500 hover:text-indigo-600">Jump to today</button>

 </div>

 <button type="button" onClick={() => shiftMonth(1)} className="rounded-xl p-2 text-slate-500 hover:bg-white hover:text-indigo-600 " aria-label="Next month">

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

 ? "border border-indigo-300 bg-indigo-50 text-indigo-700 "

 : cell.inMonth

 ? "text-slate-700 hover:bg-white "

 : "text-slate-300 "

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

 <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-5 text-amber-800 ">

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

 <div className="flex h-7 min-w-7 items-center justify-center rounded-full bg-indigo-50 px-2 text-[10px] font-bold text-indigo-600 ">

 {selectedItems.length}

 </div>

 </div>



 {selectedItems.length > 0 ? (

 <div className="space-y-2">

 {selectedItems.map((item) => (

 <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm ">

 <div className="flex items-start gap-3">

 <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm ${item.kind === "event" ? "bg-indigo-50 text-indigo-600 " : "bg-violet-50 text-violet-600 "}`}>

 {item.kind === "event" ? <CalendarDays size={14} /> : <Bell size={14} />}

 </div>

 <div className="min-w-0 flex-1">

 <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{item.kind === "event" ? "Calendar event" : "Goal2Done reminder"}</div>

 <div className="mt-0.5 text-xs font-bold text-slate-800 ">{item.title}</div>

 <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500 ">

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

 <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400 ">

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

 className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md "

 >

 <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.kind === "event" ? "bg-indigo-50 text-indigo-600 " : "bg-violet-50 text-violet-600 "}`}>

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

 <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center ">

 <CalendarDays size={24} className="mx-auto text-slate-300 " />

 <p className="mt-2 text-xs font-semibold text-slate-500 ">No dated items yet</p>

 <p className="mt-1 text-[10px] text-slate-400">Create a calendar event or reminder from the chat.</p>

 </div>

 )}

 </div>



 <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[10px] leading-5 text-slate-500 ">

 <div className="flex items-center gap-2 font-bold text-slate-700 ">

 <ShieldCheck size={13} className="text-emerald-500" />

 Your control stays on

 </div>

 <p className="mt-1">Creating, rescheduling, or deleting calendar events still goes through Goal2Done’s approval flow.</p>

 </div>

 </div>

 </aside>

 );

}



function LandingPage() {
 const [mobileNavOpen, setMobileNavOpen] = useState(false);
 const goLogin = () => { window.location.href = `${API}/auth/google/login`; };
 const closeMobileNav = () => setMobileNavOpen(false);

 return (
 <div className="min-h-screen overflow-x-hidden bg-[#07090b] text-white selection:bg-amber-300/30">
 <style>{`\n @keyframes gd-float { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(0,-22px,0) scale(1.04); } }\n @keyframes gd-pulse { 0%,100% { opacity:.22; transform: scale(.92); } 50% { opacity:.72; transform: scale(1.08); } }\n @keyframes gd-grid { from { transform: translateY(0); } to { transform: translateY(42px); } }\n @keyframes gd-shine { 0% { transform: translateX(-120%) rotate(12deg); } 55%,100% { transform: translateX(160%) rotate(12deg); } }\n .gd-grid { background-image: linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px); background-size: 42px 42px; animation: gd-grid 10s linear infinite; }\n .gd-float { animation: gd-float 8s ease-in-out infinite; }\n .gd-pulse { animation: gd-pulse 5s ease-in-out infinite; }\n .gd-shine { animation: gd-shine 6s ease-in-out infinite; }\n `}</style>
 <div className="pointer-events-none fixed inset-0 overflow-hidden">
 <div className="gd-grid absolute -inset-20 opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />
 <div className="gd-float absolute -left-24 top-24 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
 <div className="gd-float absolute right-[-100px] top-[-70px] h-96 w-96 rounded-full bg-amber-400/20 blur-3xl [animation-delay:-2s]" />
 <div className="gd-pulse absolute left-[35%] top-[24%] h-44 w-44 rounded-full bg-violet-500/15 blur-3xl" />
 {Array.from({ length: 18 }).map((_, i) => <span key={i} className="absolute h-1 w-1 rounded-full bg-white/60" style={{left:`${(i*37)%100}%`,top:`${12+((i*29)%78)}%`,animation:`gd-pulse ${3+(i%4)}s ease-in-out ${i*.12}s infinite`}} />)}
 </div>

 <nav className="relative z-30 border-b border-white/10 bg-black/20 backdrop-blur-xl">
 <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
 <a href="#top" onClick={closeMobileNav} className="flex items-center gap-2.5">
 <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25"><Sparkles size={18} /></span>
 <span><span className="block text-sm font-extrabold tracking-tight">Goal2Done</span><span className="block text-[8px] font-bold uppercase tracking-[0.22em] text-white/45">Personal operations agent</span></span>
 </a>
 <div className={`${mobileNavOpen ? "absolute left-4 right-4 top-[72px] flex" : "hidden"} flex-col gap-1 rounded-2xl border border-white/10 bg-[#0c0f13]/95 p-2 shadow-2xl backdrop-blur-xl sm:static sm:flex sm:flex-row sm:items-center sm:gap-1 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none`}>
 <a href="#about" onClick={closeMobileNav} className="rounded-xl px-3 py-2 text-xs font-semibold text-white/65 hover:bg-white/5 hover:text-white">About</a>
 <a href="#how-it-works" onClick={closeMobileNav} className="rounded-xl px-3 py-2 text-xs font-semibold text-white/65 hover:bg-white/5 hover:text-white">How it works</a>
 <a href="#contact" onClick={closeMobileNav} className="rounded-xl px-3 py-2 text-xs font-semibold text-white/65 hover:bg-white/5 hover:text-white">Contact</a>
 <a href="/privacy" onClick={closeMobileNav} className="rounded-xl px-3 py-2 text-xs font-semibold text-white/65 hover:bg-white/5 hover:text-white">Privacy</a>
 <a href="/terms" onClick={closeMobileNav} className="rounded-xl px-3 py-2 text-xs font-semibold text-white/65 hover:bg-white/5 hover:text-white">Terms</a>
 </div>
 <div className="flex items-center gap-2"><button onClick={goLogin} className="hidden rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10 sm:inline-flex">Login</button><button onClick={() => setMobileNavOpen(v=>!v)} className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 sm:hidden" aria-label="Open navigation"><Menu size={18} /></button></div>
 </div>
 </nav>

 <main id="top" className="relative z-10">
 <section className="mx-auto grid min-h-[calc(100vh-64px)] max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
 <div>
 <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.9)]" />Autonomous agents for everyday apps</div>
 <h1 className="max-w-4xl text-5xl font-black leading-[.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">Tell it the outcome.<span className="mt-2 block bg-gradient-to-r from-amber-200 via-amber-400 to-orange-300 bg-clip-text text-transparent">Let it get it done.</span></h1>
 <p className="mt-6 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">Goal2Done turns everyday goals into executable workflows across connected apps — then checks the result before it says “done.”</p>
 <div className="mt-8 flex flex-col gap-3 sm:flex-row"><button onClick={goLogin} className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-extrabold text-slate-950 shadow-xl shadow-white/10 transition hover:-translate-y-0.5 hover:bg-amber-100">Get started with Google <ArrowRight size={17} className="transition group-hover:translate-x-1" /></button><a href="#how-it-works" className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold text-white/80 transition hover:bg-white/10 hover:text-white">Explore how it works</a></div>
 <div className="mt-8 flex flex-wrap gap-2 text-[10px] font-bold text-white/45">{['Goal → Plan','Risk check','Execute','Verify'].map(item => <span key={item} className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5">{item}</span>)}</div>
 </div>

 <div className="relative mx-auto w-full max-w-xl"><div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-amber-400/15 blur-3xl" /><div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[.055] p-3 shadow-2xl shadow-black/40 backdrop-blur-xl"><div className="gd-shine pointer-events-none absolute left-[-40%] top-[-20%] h-[150%] w-24 bg-white/10 blur-xl" /><div className="rounded-[1.5rem] border border-white/10 bg-[#0b0e13] p-5 sm:p-6">
 <div className="flex items-center justify-between border-b border-white/10 pb-4"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /><span className="text-xs font-bold text-white/80">Agent workspace</span></div><span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-bold text-emerald-300">ONLINE</span></div>
 <div className="mt-5 rounded-2xl border border-amber-300/15 bg-amber-300/5 p-4"><div className="text-[9px] font-bold uppercase tracking-[.18em] text-amber-200/70">GOAL</div><div className="mt-2 text-sm font-semibold text-white">“Prepare everything for my interview Friday.”</div></div>
 <div className="mt-4 space-y-2.5">{[['01','PLAN','Understand goal and create ordered actions.'],['02','RISK CHECK','Pause sensitive actions for approval.'],['03','EXECUTE','Use connected apps and store results.'],['04','VERIFY','Check the actual outcome before completion.']].map(([n,title,desc],i)=><div key={n} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3.5"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[9px] font-black ${i>2?'border border-emerald-400/40 bg-emerald-400/10 text-emerald-300':'border border-amber-300/30 bg-amber-300/10 text-amber-200'}`}>{n}</span><div><div className="text-[10px] font-extrabold tracking-wide text-white/85">{title}</div><div className="mt-1 text-[10px] leading-5 text-white/45">{desc}</div></div></div>)}</div>
 </div></div></div>
 </section>

 <section id="about" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20 sm:px-8"><div className="max-w-3xl"><div className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-300">Why Goal2Done</div><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">AI should help finish the work, not just explain it.</h2><p className="mt-4 text-sm leading-7 text-white/55 sm:text-base">The project is designed around the gap between knowing what to do and actually completing a multi-step task across email, calendars, documents, search and reminders.</p></div><div className="mt-10 grid gap-4 md:grid-cols-3">{[['THE PROBLEM','Too many context switches, forgotten steps and results that need manual checking.'],['THE CHANGE','Give the agent the outcome instead of a step-by-step checklist.'],['THE PRINCIPLE','The agent can act, but the user stays the decision-maker for sensitive actions.']].map(([title,desc])=><div key={title} className="rounded-3xl border border-white/10 bg-white/[.04] p-6"><div className="text-xs font-extrabold text-white/85">{title}</div><p className="mt-3 text-sm leading-6 text-white/50">{desc}</p></div>)}</div></section>

 <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20 sm:px-8"><div className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-300">From intent to completion</div><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">One request → executable workflow → verified result</h2><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[['01','GOAL','Describe the outcome in natural language.'],['02','PLAN','The LLM decomposes it into ordered actions.'],['03','SELECT TOOLS','Choose connected Google, web, maps or browser tools.'],['04','RISK CHECK','Sensitive actions pause for approval.'],['05','EXECUTE','Run actions and persist their results.'],['06','VERIFY','Check the actual result before completion.']].map(([n,title,desc],i)=><div key={n} className="rounded-3xl border border-white/10 bg-white/[.035] p-5"><span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-[10px] font-black ${i>=4?'border-emerald-400/50 text-emerald-300':'border-amber-300/40 text-amber-200'}`}>{n}</span><h3 className="mt-5 text-sm font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-white/45">{desc}</p></div>)}</div></section>

 <section id="contact" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20 sm:px-8"><div className="rounded-[2rem] border border-amber-300/15 bg-gradient-to-br from-amber-300/[.08] via-white/[.035] to-indigo-500/[.08] p-7 sm:p-10"><div className="max-w-3xl"><div className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-300">Contact / demo</div><h2 className="mt-3 text-3xl font-black sm:text-4xl">Explore the working prototype.</h2><p className="mt-3 text-sm leading-6 text-white/55">Goal2Done is presented as a working multi-app prototype with Google Calendar, Gmail, Drive, Docs, Sheets, maps, web search, browser actions, approvals and verification.</p><button onClick={goLogin} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-amber-300 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-amber-200">Login and explore <ArrowRight size={16} /></button></div></div><footer className="flex flex-col gap-3 border-t border-white/10 py-8 text-[10px] text-white/35 sm:flex-row sm:items-center sm:justify-between"><span>Goal2Done · Autonomous Agents for Everyday Apps</span><span>Built by Mounika Bhupani · VIT-AP · Track 01</span></footer></section>
 </main>
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
 const [authLoading, setAuthLoading] = useState(true);
 const [user, setUser] = useState(null);

 const [history, setHistory] = useState([]);

 const [reminders, setReminders] = useState([]);

 const [approvalLoading, setApprovalLoading] = useState(null);

 const [sidebarOpen, setSidebarOpen] = useState(true);
 const [scheduleOpen, setScheduleOpen] = useState(false);
 const [calendarPanelOpen, setCalendarPanelOpen] = useState(true);



 const [conversationId, setConversationId] = useState(() => makeId("conversation"));

 const [savedConversations, setSavedConversations] = useState(() => readSavedConversations());



 const bottomRef = useRef(null);

 const inputRef = useRef(null);



useEffect(() => {
 let active = true;
 apiFetch("/auth/me")
 .then(async (response) => {
 if (!active) return;
 if (!response.ok) {
 setUser(null);
 return;
 }
 const data = await response.json();
 setUser(data.user || null);
 })
 .catch(() => { if (active) setUser(null); })
 .finally(() => { if (active) setAuthLoading(false); });
 return () => { active = false; };
 }, []);

 useEffect(() => {
 if (!authLoading && user) {
 loadHistory();
 loadReminders();
 }
 }, [authLoading, user]);

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

 const response = await apiFetch(`/history`);

 if (!response.ok) return;

 const data = await response.json();

 setHistory(data.history || []);

 } catch (error) {

 console.error("Could not load history:", error);

 }

 }



 async function loadReminders() {

 try {

 const response = await apiFetch(`/reminders`);

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




function getUserFacingResult(action) {
 const result = action?.result;
 if (!result) return null;

 if (result.answer) return String(result.answer);

 if (Array.isArray(result.events)) {
 if (!result.events.length) {
 return "You have no calendar events for the requested period.";
 }

 return result.events.map((event) => {
 const title = event.summary || event.title || "Untitled event";
 const start =
 event.start?.dateTime ||
 event.start?.date ||
 event.start_time ||
 "";

 let when = "";
 if (start) {
 const date = new Date(start);
 when = Number.isNaN(date.getTime())
 ? String(start)
 : date.toLocaleString([], {
 dateStyle: "medium",
 timeStyle: "short",
 });
 }

 return `• ${title}${when ? ` — ${when}` : ""}`;
 }).join("\n");
 }

 if (Array.isArray(result.emails)) {
 if (!result.emails.length) {
 return "You don't have any emails matching that request.";
 }

 return result.emails.map((email) => {
 const subject =
 email.subject ||
 email.Subject ||
 "(No subject)";
 const from = email.from || email.sender || "";
 return `• ${subject}${from ? ` — ${from}` : ""}`;
 }).join("\n");
 }

 if (Array.isArray(result.files)) {
 if (!result.files.length) {
 return "I couldn't find any matching files.";
 }

 return result.files.map((file) => {
 const name = file.name || file.title || "Unnamed file";
 const url = file.webViewLink || file.url || "";
 return `${name}${url ? `\n${url}` : ""}`;
 }).join("\n\n");
 }

 const document =
 result.document ||
 (result.type === "google_doc" ? result : null);

 if (document) {
 const title = document.title || document.name || "Google Doc";
 const url = document.url || document.webViewLink || "";
 return `Created ${title}${url ? `\n${url}` : ""}`;
 }

 const spreadsheet =
 result.spreadsheet ||
 (result.type === "google_sheet" ? result : null);

 if (spreadsheet) {
 const title =
 spreadsheet.title ||
 spreadsheet.name ||
 "Google Sheet";
 const url =
 spreadsheet.url ||
 spreadsheet.webViewLink ||
 "";
 return `Created ${title}${url ? `\n${url}` : ""}`;
 }

 if (result.message) return String(result.message);

 return null;
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



 const response = await apiFetch(`/goal`, {

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

 data.message || "I need a little more information before I continue.",

 { questions: data.questions || [], plan: data }

 );

 } else if (data.status === "waiting_for_approval") {

 // Keep the conversation natural. The approval control is rendered

 // inline, while the internal plan/actions stay hidden.

 addAssistantMessage(

 answer || "I’m ready for the next step. I just need your approval before I make the change.",

 { plan: data }

 );

 } else if (data.status === "completed") {

 // Show the actual result whenever one exists.
 if (answer) {

 addAssistantMessage(answer, { plan: data });

 } else {

 const completedAction = [...(data.actions || [])]
 .reverse()
 .find(
 (action) =>
 action?.verification?.verified &&
 action?.result
 );

 const directResult =
 getUserFacingResult(completedAction);

 if (directResult) {

 addAssistantMessage(directResult, {
 plan: data,
 });

 } else {

 const completion =
 getCompletionMessage(completedAction);

 addAssistantMessage(completion.text, {
 plan: data,
 link: completion.url,
 linkLabel: completion.linkLabel,
 });
 }
 }

 } else if (data.status === "verification_failed") {

 addAssistantMessage(

 "I couldn’t confirm that the requested result was completed. I won’t claim it was done when it wasn’t verified.",

 { plan: data }

 );

 } else if (answer) {

 addAssistantMessage(answer, { plan: data });

 } else {

 addAssistantMessage(

 data.message || "I’ve processed your request.",

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

 const response = await apiFetch(`/approve`, {

 method: "POST",

 headers: { "Content-Type": "application/json" },

 body: JSON.stringify({ approval_id: approval.approval_id }),

 });



 const data = await response.json();



 if (!response.ok) {

 throw new Error(data.detail || "Approval failed.");

 }



 const directResult = getUserFacingResult(data.action);

 const completion = getCompletionMessage(data.action);



 setMessages((previous) => [

 ...previous,

 {

 id: makeId(),

 role: "assistant",

 content:

 data.status === "completed"

 ? completion.text

 : "The action was approved and processed.",

 time: new Date().toISOString(),

 link: completion.url,

 linkLabel: completion.linkLabel,

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

 const response = await apiFetch(`/reject`, {

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

 const pathname = window.location.pathname;

 if (pathname === "/privacy") {
 return <Privacy />;
 }

 if (pathname === "/terms") {
 return <Terms />;
 }

 if (authLoading) {
 return (
 <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
 <div className="text-sm font-semibold">Checking your Goal2Done account…</div>
 </div>
 );
 }

 if (!user) {
 return <LandingPage />;
 }

 return (

 <div className="h-screen overflow-hidden bg-[#f8fafc] text-slate-900">

 <div className="flex h-full min-h-0">

 {/* SIDEBAR */}

 {sidebarOpen && (
 <aside className="fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-slate-200 bg-white shadow-2xl shadow-slate-900/5 lg:static lg:z-20 lg:shadow-none">

 <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 ">

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
 type="button"
 onClick={() => setSidebarOpen(false)}
 className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
 aria-label="Hide chat history"
 >
 <X size={14} />
 Hide
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

 ? "border border-indigo-200 bg-indigo-50 text-indigo-700 "

 : "border border-transparent text-slate-600 hover:bg-slate-100 "

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

 <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400 ">

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

 className="rounded-xl px-3 py-2 transition hover:bg-slate-100 "

 >

 <div className="flex items-center gap-2">

 <History size={13} className="shrink-0 text-slate-400" />

 <span className="truncate text-[10px] font-medium text-slate-500 ">

 {item.goal || item.arguments?.title || item.arguments?.query || "Agent activity"}

 </span>

 </div>

 </div>

 ))}

 </div>

 </div>

 )}

 </div>



 <div className="border-t border-slate-200 p-3">
 <div className="mb-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
 <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-xs font-black text-white">{(user?.email || "G").charAt(0).toUpperCase()}</div>
 <div className="min-w-0 flex-1"><div className="truncate text-[10px] font-bold text-slate-700">{user?.email || "Signed in"}</div><div className="mt-0.5 text-[9px] text-slate-400">Google account</div></div>
 <button type="button" onClick={async () => { await apiFetch("/auth/logout"); window.location.reload(); }} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-extrabold text-slate-600 hover:border-rose-200 hover:text-rose-600">Logout</button>
 </div>
 <div className="flex items-center gap-2 px-2 py-2 text-[10px] text-slate-400"><ShieldCheck size={13} />Human approval at critical actions</div>
 </div>
 </aside>
 )}

 {sidebarOpen && (

 <button

 className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm lg:hidden"

 onClick={() => setSidebarOpen(false)}

 aria-label="Close menu"

 />

 )}



 {/* MAIN */}

 <main className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col">

 <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-6">

 <div className="flex items-center gap-3">

 <button onClick={() => setSidebarOpen(value => !value)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600" aria-label={sidebarOpen ? "Hide chat history" : "Show chat history"}>
 {sidebarOpen ? <ChevronLeft size={18} /> : <History size={18} />}
 </button>
 {!sidebarOpen && <button type="button" onClick={() => setSidebarOpen(true)} className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm hover:border-indigo-200 hover:text-indigo-600 sm:inline-flex">History</button>}



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

 <button onClick={() => setScheduleOpen(value => !value)} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 xl:hidden" aria-label="Open calendar"><CalendarDays size={17} /></button>
 {!calendarPanelOpen && <button type="button" onClick={() => setCalendarPanelOpen(true)} className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm hover:border-indigo-200 hover:text-indigo-600 xl:inline-flex"><CalendarDays size={15} className="mr-1.5" />Calendar</button>}



 <div className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-500 sm:flex">

 <span className="h-2 w-2 rounded-full bg-emerald-500" />

 Agent online

 </div>

 </div>

 </header>



 <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">

 <div className="mx-auto w-full max-w-5xl px-4 pb-40 pt-8 sm:px-6 lg:px-8">

 {/* HERO */}

 <div className="mb-8">

 <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600 ">

 <Sparkles size={12} />

 Autonomous workspace

 </div>



 <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">

 Tell me what you want{" "}

 <span className="text-indigo-600 ">

 done.

 </span>

 </h2>



 <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 ">

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

 <div className="rounded-2xl rounded-tl-md border border-slate-200 bg-white px-5 py-4 shadow-sm ">

 <div className="flex items-center gap-2 text-sm text-slate-500 ">

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

 <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-slate-200/80 bg-slate-50/90 p-3 backdrop-blur-xl ">

 <form

 onSubmit={sendMessage}

 className="mx-auto max-w-5xl"

 >

 <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/30 ">

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

 className="max-h-32 min-h-[44px] flex-1 resize-none border-0 bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-50 "

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

 onReminderChanged={async () => { await loadReminders(); setScheduleOpen(false); }}
 onHide={() => setScheduleOpen(false)}

 />

 </div>

 </div>

 )}

 </main>



 {/* DESKTOP CALENDAR / REMINDER CENTER */}

 {calendarPanelOpen && (
 <div className="hidden h-full xl:block">
 <CalendarPanel reminders={reminders} onReminderChanged={loadReminders} onHide={() => setCalendarPanelOpen(false)} />
 </div>
 )}

 </div>

 </div>

 );

}



export default App;