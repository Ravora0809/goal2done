# Goal2Done

> **Tell it what you want. It figures out how to get it done.**

Goal2Done is an autonomous personal operations agent designed to turn a natural-language goal into a structured, executable workflow.

Instead of simply generating an answer, Goal2Done can **plan actions, choose tools, ask for clarification, pause risky actions for approval, execute approved work, verify results, maintain an execution history, and recover from failures.**

---

## ✨ Why Goal2Done?

Most AI assistants stop after producing text.

Goal2Done is built around a different idea:

```text
                 USER GOAL
                     │
                     ▼
              ┌─────────────┐
              │    PLAN     │
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │ SELECT TOOLS│
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │  RISK CHECK │
              └──────┬──────┘
                     │
             ┌───────┴────────┐
             │                │
          Safe action      Risky action
             │                │
             │           USER APPROVAL
             │                │
             └───────┬────────┘
                     ▼
              ┌─────────────┐
              │   EXECUTE   │
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │   VERIFY    │
              └──────┬──────┘
                     │
              ┌──────┴──────┐
              ▼             ▼
           SUCCESS        FAILURE
              │             │
              ▼             ▼
             DONE        RECOVER /
                         REPLAN
```

The goal is not just **"generate something."**

The goal is **"take a request from intention to verified outcome."**

---

# 🚀 Core Features

### 🧠 Goal → Plan

Give Goal2Done a high-level request in natural language.

Example:

> "Help me prepare for my software engineering interview next week. Research common Java topics, create a study plan, and remind me every evening."

The planner converts this into an ordered sequence of concrete actions.

---

### 🔗 Dependency-Aware Planning

Actions can depend on previous actions.

Example:

```text
Research Java Topics
        ↓
Generate Study Plan
        ↓
Create Day 1 Reminder
        ↓
Create Day 2 Reminder
        ↓
...
```

This prevents later actions from running before their required inputs exist.

---

### 🛠️ Tool Selection

Goal2Done currently supports tools such as:

| Tool | Purpose |
|---|---|
| `search_web` | Research information from the web |
| `generate_answer` | Generate an answer using gathered context |
| `create_task` | Create a task |
| `create_reminder` | Schedule a reminder |
| `update_reminder` | Edit an existing reminder |
| `delete_reminder` | Delete a reminder |
| `browser_open` | Open a web page |

The planner chooses the tool based on the requested goal.

---

### 🔐 Approval Firewall

Not every action should happen automatically.

Actions that can modify user state, such as creating, editing, or deleting reminders, can be paused for explicit approval.

```text
AI PLAN
   │
   ▼
Risk Check
   │
   ├── Safe ───────────────► Execute
   │
   └── Requires Approval
                │
                ▼
         ┌─────────────┐
         │   APPROVE   │
         │      or     │
         │   REJECT    │
         └──────┬──────┘
                │
                ▼
             Execute
```

This gives the user control over consequential actions.

---

### 🔍 Verification

Goal2Done does not treat every successful tool call as automatic goal completion.

It records verification information for individual actions and also supports goal-level verification.

Example:

```text
Action executed
      ↓
Did the tool succeed?
      ↓
Did the result match the expected outcome?
      ↓
Are all required goal actions complete?
      ↓
Goal verified
```

---

### ♻️ Recovery

If an action fails, Goal2Done can identify failed actions and use its recovery workflow to determine whether another approach can be attempted.

Conceptually:

```text
Execute
   ↓
Failure
   ↓
Analyze failure
   ↓
Recovery / Replan
   ↓
Execute alternative
   ↓
Verify
```

---

### 💬 Clarification

If a request does not contain enough information to safely or correctly execute a plan, Goal2Done can ask the user for clarification before continuing.

Example:

> "Create reminders for my study sessions."

The system can ask:

> "What time should the reminders be scheduled?"

The user's answer becomes part of the continuation of the workflow.

---

### ⏰ Reminder Management

Goal2Done supports reminder workflows including:

- Create reminders
- Edit reminders
- Delete reminders
- View active reminders
- Natural-language date/time interpretation
- Approval before consequential reminder changes

Example requests:

```text
"Remind me about my Cisco interview tomorrow at 10 AM."

"Move my Java study reminder to 8 PM."

"Delete my old interview reminder."
```

---

### 📋 Execution History

Goal2Done keeps an execution trail so users can understand what happened.

The UI can show:

- Action
- Tool used
- Arguments
- Status
- Result
- Verification
- Approval state
- Execution history

This makes the agent's workflow more transparent.

---

# 🏗️ Architecture

```text
                         ┌──────────────────┐
                         │    React UI      │
                         │                  │
                         │ Goal Input       │
                         │ Action Cards     │
                         │ Approvals        │
                         │ Reminders        │
                         │ History          │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │    FastAPI       │
                         │     Backend      │
                         └────────┬─────────┘
                                  │
                 ┌────────────────┼────────────────┐
                 │                │                │
                 ▼                ▼                ▼
          ┌────────────┐   ┌────────────┐   ┌────────────┐
          │  Planner   │   │  Firewall  │   │  Executor  │
          └─────┬──────┘   └─────┬──────┘   └─────┬──────┘
                │                │                │
                └────────────────┼────────────────┘
                                 ▼
                         ┌──────────────────┐
                         │      Tools       │
                         │                  │
                         │ Search           │
                         │ Reminders        │
                         │ Tasks            │
                         │ Browser          │
                         │ Answer Generation│
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │     Verifier     │
                         └────────┬─────────┘
                                  │
                         ┌────────┴────────┐
                         ▼                 ▼
                    Goal Success       Recovery
```

---

# 🧩 Backend Components

The backend is organized around separate responsibilities:

```text
backend/
├── main.py          # FastAPI routes and workflow orchestration
├── planner.py       # Goal → structured action plan
├── executor.py      # Tool execution and approval handling
├── tools.py         # Available agent tools
├── verifier.py      # Action and goal verification
├── recovery.py      # Failure recovery / replanning
├── firewall.py      # Risk and approval rules
├── database.py      # SQLite persistence
├── browser.py       # Browser-related operations
└── ...
```

The frontend is organized into reusable React components:

```text
frontend/
├── src/
│   ├── components/
│   │   ├── ActionCard.jsx
│   │   ├── ClarificationCard.jsx
│   │   ├── ExecutionHistory.jsx
│   │   ├── ReminderCard.jsx
│   │   ├── ReminderSection.jsx
│   │   ├── StatusBadge.jsx
│   │   └── WorkingStep.jsx
│   ├── App.jsx
│   └── api.js
└── ...
```

---

# 🔄 Example Workflow

### User

```text
Help me prepare for a software engineering interview.
Research common Java interview topics, create a 7-day
study plan, and create reminders for each day's session.
```

### Goal2Done

```text
1. Understand the goal
        ↓
2. Identify required information
        ↓
3. Research Java interview topics
        ↓
4. Generate a 7-day study plan
        ↓
5. Create reminder actions
        ↓
6. Apply approval firewall
        ↓
7. Wait for user approval
        ↓
8. Execute approved reminders
        ↓
9. Verify executions
        ↓
10. Report the final state
```

The important part is that **one user request can become multiple coordinated actions**.

---

# 🧪 Example API Flow

Start the backend:

```bash
cd backend
source ../venv/bin/activate
uvicorn main:app --reload
```

Create a goal:

```bash
curl -X POST http://127.0.0.1:8000/goal \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "Remind me to prepare for my interview tomorrow at 10 AM"
  }'
```

Approve an action when required:

```bash
curl -X POST http://127.0.0.1:8000/approve \
  -H "Content-Type: application/json" \
  -d '{
    "approval_id": "YOUR_APPROVAL_ID"
  }'
```

Check reminders:

```bash
curl http://127.0.0.1:8000/reminders
```

Verify a goal:

```bash
curl http://127.0.0.1:8000/goals/YOUR_GOAL_ID/verify
```

---

# 🖥️ Frontend

The frontend provides a visual interface for the agent workflow.

It includes:

- Goal input
- Example goals
- Action cards
- Working/progress states
- Approval cards
- Clarification flow
- Reminder management
- Execution history
- Verification status
- Responsive UI

The deployed frontend is available at:

**https://goal2done.vercel.app**

---

# 🔑 Environment Variables

Create a `.env` file inside `backend/`:

```env
GROQ_API_KEY=your_groq_api_key
```

If your configuration uses another provider, add the corresponding API key required by your local implementation.

**Never commit API keys or `.env` files to GitHub.**

---

# ⚙️ Installation

## 1. Clone the repository

```bash
git clone https://github.com/Ravora0809/goal2done.git
cd goal2done
```

## 2. Backend

```bash
python3 -m venv venv
source venv/bin/activate

cd backend
pip install -r requirements.txt

uvicorn main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

---

## 3. Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Then open the local frontend URL shown by Vite.

---

# 🛡️ Safety by Design

Goal2Done follows a human-in-the-loop approach for actions that may have consequences.

The system separates:

```text
Planning
   ≠
Execution
```

and:

```text
Tool Success
   ≠
Goal Success
```

This separation is important because an autonomous system should not blindly execute every action or assume that one successful API call means the user's objective has been achieved.

---

# 🎯 Design Principles

### 1. Goal-driven

The user describes **what they want**, not every individual API call.

### 2. Tool-aware

The planner chooses from available tools rather than pretending unavailable capabilities exist.

### 3. Human-controlled

Risky actions can pause for explicit approval.

### 4. Verifiable

Actions and goals have explicit verification states.

### 5. Recoverable

Failures can trigger a recovery workflow instead of silently ending the task.

### 6. Transparent

Execution history makes the agent's actions inspectable.

### 7. Personalized

The architecture is designed to incorporate user-specific preferences, constraints, history, and context so that different users can receive different execution plans for similar goals.

---

# 🚧 Roadmap

The project is actively evolving.

### Current focus

- [x] Natural-language goal processing
- [x] Structured planning
- [x] Dependency-aware actions
- [x] Tool execution
- [x] Approval firewall
- [x] Clarification workflow
- [x] Reminder creation
- [x] Reminder editing
- [x] Reminder deletion
- [x] Execution history
- [x] Action verification
- [x] Goal-level verification
- [x] Recovery workflow
- [x] React dashboard
- [x] CI workflow

### Next-level agent capabilities

- [ ] Persistent user preferences
- [ ] Constraint memory
- [ ] Persistent workflow state across approvals
- [ ] Automatic recovery and replanning
- [ ] Stronger goal-completion evaluation
- [ ] More integrations such as calendar/email
- [ ] Automated evaluation across diverse scenarios
- [ ] Production deployment of the complete backend

---

# 🧠 What Makes Goal2Done Different?

Goal2Done is not designed as:

```text
Prompt → LLM → Answer
```

It is designed as:

```text
Goal
 ↓
Context
 ↓
Plan
 ↓
Dependencies
 ↓
Risk Check
 ↓
Approval
 ↓
Execution
 ↓
Verification
 ↓
Recovery / Replan
 ↓
Verified Outcome
```

The central idea is simple:

> **AI should not only understand what you want. It should reason about the steps required to accomplish it, execute those steps responsibly, and verify whether the goal was actually achieved.**

---

# 👩‍💻 Project

**Goal2Done**

Built as an autonomous-agent project focused on turning high-level user goals into coordinated, verifiable actions.

GitHub:

https://github.com/Ravora0809/goal2done

---

## 📄 License

No license has been specified yet.
