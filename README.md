# 🚀 Goal2Done

> **Tell it what you want. It figures out how to get it done.**

**Goal2Done** is an autonomous personal operations agent designed to turn a user's high-level natural-language goal into a coordinated, executable and verifiable workflow.

Instead of only answering a question, Goal2Done can **understand the goal, plan the required steps, select tools, manage dependencies, perform risk checks, request approval for consequential actions, execute the work, verify the results, and recover when something fails.**

The project is designed around the principle:

> **AI should not only understand what you want. It should help accomplish it responsibly and verify whether it was actually done.**

---



# 🌟 Project Overview

Traditional AI assistants generally follow:

```text
Prompt → LLM → Answer
```

Goal2Done follows:

```text
User Goal
   ↓
Understand Context
   ↓
Create Plan
   ↓
Select Tools
   ↓
Resolve Dependencies
   ↓
Risk / Approval Check
   ↓
Execute Actions
   ↓
Verify Results
   ↓
Recover / Replan if Needed
   ↓
Verified Outcome
```

A single user request can therefore become **multiple coordinated actions across different applications and services**.

---



# 🎯 The Problem

Everyday work is often spread across many applications.

A user may need to:

- Search the web
- Read an email
- Check a calendar
- Find a file in Drive
- Update a document
- Add information to a spreadsheet
- Create a reminder
- Send an email
- Check whether everything actually happened

Traditional assistants can provide instructions, but the user still has to perform these steps manually.

Goal2Done changes the interaction from:

> **"Tell me how to do it."**

to:

> **"Here is what I want. Help me get it done."**

The hackathon prototype demonstrates this idea through a multi-application agent with user-specific Google access, approvals, execution history and verification. fileciteturn40file0

---



# ✨ Complete Feature Set



## 🧠 1. Natural-Language Goal Understanding

Users can describe an outcome instead of manually writing a checklist.

Example:

```text
Help me prepare for my Java interview next week.
Research common interview topics, create a study plan,
save it to Google Docs, and remind me every evening.
```

The planner converts this into a structured workflow.

---



## 📋 2. Autonomous Planning

Goal2Done uses an LLM-powered planner to convert a high-level goal into ordered actions.

Each planned action can contain:

- Action ID
- Tool
- Arguments
- Dependencies
- Expected outcome

Example:

```text
action_1 → Search Java interview topics
action_2 → Generate study plan
action_3 → Create Google Doc
action_4 → Create reminders
```

The planner is designed to plan for the **complete user outcome**, rather than stopping after an intermediate tool call.

---



## 🔗 3. Dependency-Aware Execution

Actions can depend on earlier actions.

Example:

```text
Research Java Topics
        ↓
Generate Study Plan
        ↓
Create Google Doc
        ↓
Create Reminders
```

Independent actions can remain independent instead of being unnecessarily chained.

This prevents actions from running before their required information exists.

---



## 🛠️ 4. Intelligent Tool Selection

Goal2Done has a tool layer that allows the planner to choose appropriate capabilities for the user's goal.

The project includes tools for:

- Web research
- Answer generation
- Tasks
- Reminders
- Gmail
- Google Calendar
- Google Drive
- Google Docs
- Google Sheets
- Local files
- Document generation
- Maps
- Driving directions
- Browser actions
- Messaging through configured providers

---



# 🌐 Integrated Capabilities



## 🔎 Web Search

Goal2Done can search the web when the user asks it to:

- Research
- Find information
- Investigate
- Compare
- Verify
- Learn about a topic

Example:

```text
Find the top Java interview questions for fresh graduates.
```

The search results can then be passed to the answer-generation stage.

---



# 🤖 Answer Generation

`generate_answer` is used when the user needs a final response based on information gathered by previous actions.

Examples:

- Summaries
- Explanations
- Research findings
- Comparisons
- Recommendations
- Reports
- Conclusions

This allows the system to distinguish between:

```text
Search completed
```

and:

```text
User's actual goal completed
```

A successful search is not automatically considered a successful goal.

---



# 📅 Google Calendar

Goal2Done supports user-authorized Google Calendar operations.

### Read

- List upcoming events
- Check availability
- Find meetings
- Check whether a time is free



### Modify

- Create events
- Update events
- Delete events

Creating, updating and deleting calendar events can require user approval.

Example:

```text
Create a Java interview preparation event tomorrow
at 10 AM for 1 hour.
```

Calendar actions preserve the user's requested date, time and timezone.

---



# 📧 Gmail

Goal2Done can work with the user's authenticated Gmail account.

### Available capabilities

- Read recent email metadata
- Send email

Sending email **always requires user approval**.

Example:

```text
Send an email to my friend saying I am sick and
cannot meet today.
```

If required information is missing, such as the recipient, the agent asks for clarification instead of inventing it.

---



# ☁️ Google Drive

Goal2Done supports read-only access to user-authorized Drive content.

### Capabilities

- List Drive files and folders
- Search Drive
- Find documents, PDFs, resumes and other files
- Read file contents when required

Example:

```text
Find my resume in Google Drive and summarize it.
```

The system can search Drive first and then read the relevant file.

---



# 📄 Google Docs

Goal2Done supports Google Docs operations including:

- Create a document
- Read a document
- Append text
- Update/replace content where supported by the integration
- Verify document results

Creating or modifying documents can require approval.

Example:

```text
Create a Google Doc called Interview Preparation
and add my 7-day study plan.
```

The Docs integration also performs read-back verification for important write operations.

---



# 📊 Google Sheets

Goal2Done supports Google Sheets operations including:

- Create a spreadsheet
- Read values
- Write values
- Append rows
- Clear values
- Verify inserted data

Example:

```text
Create a spreadsheet called Job Applications
with columns Company and Status, then add
Google - Applied.
```

For create-and-populate workflows, the planner is designed to avoid unresolved dynamic-ID placeholders and use the spreadsheet creation action correctly.

---



# ⏰ Tasks & Reminders

Goal2Done supports:

### Tasks

- Create tasks
- Track task state



### Reminders

- Create reminders
- Update reminders
- Delete reminders
- View active reminders
- Interpret natural-language date/time
- Run scheduled reminders

Examples:

```text
Create a task to finish my resume.

Remind me about my interview tomorrow at 10 AM.

Move my Java study reminder to 8 PM.

Delete my old interview reminder.
```

Reminder creation, updates and deletion are protected by the approval system.

---



# 🗂️ Local Files & Documents

Goal2Done also provides workspace-level file tools.

### File operations

- List files
- Search files by name
- Read text files



### Document generation

The system can generate local:

- PDF
- DOCX
- Markdown
- TXT

Example:

```text
Create a PDF containing my interview preparation plan.
```

---



# 🗺️ Maps & Travel

Goal2Done includes Maps/Travel capabilities using OpenStreetMap and OSRM.

## Maps Search

Search for:

- Places
- Landmarks
- Businesses
- Addresses

```text
Find the location of VIT-AP.
```



## Driving Directions

Calculate:

- Route
- Driving distance
- Estimated travel time

```text
Give me driving directions from Bangalore
to Vellore.
```

The current public routing integration supports driving routes.

---



# 🌐 Browser Automation

Goal2Done includes browser capabilities using browser automation.

The browser action can support explicit actions such as:

- Open
- Click
- Fill
- Update
- Cancel
- Submit
- Back

Consequential browser actions require approval.

Safety rules include:

- Never invent selectors
- Never invent booking/account IDs
- Never perform consequential actions without approval
- Require the user's authenticated browser profile when login is needed
- Verify the final page state when possible

This provides a foundation for multi-step web workflows.

---



# 💬 Messaging

Goal2Done also includes a messaging tool for configured messaging providers.

The current tool interface supports platforms such as:

- Telegram
- iMessage

Messaging actions require approval and the system must not invent recipients.

---



# 🔐 Approval Firewall

One of the main differentiators of Goal2Done is **autonomy with control**.

Not every action should happen automatically.

The system performs a risk check before consequential actions.

```text
                 AI PLAN
                    ↓
                RISK CHECK
                ↙        ↘
             SAFE        RISKY
               ↓            ↓
           EXECUTE      USER APPROVAL
                           ↙    ↘
                       APPROVE  REJECT
                           ↓
                        EXECUTE
```

Actions such as:

- Sending emails
- Creating calendar events
- Updating calendar events
- Deleting calendar events
- Creating/editing/deleting reminders
- Creating/updating documents
- Writing/clearing spreadsheet data
- Browser submissions or changes
- Sending messages

can be protected by approval.

The user remains the decision-maker for sensitive actions. This approval-and-verification design is a core project differentiator. fileciteturn40file8

---



# ❓ Clarification System

Goal2Done does not invent missing information.

If a request cannot safely or correctly be executed because information is missing, the agent asks the user.

Example:

```text
User:
Create a calendar event for my interview.

Goal2Done:
What date and time is the interview?
```

This prevents the planner from making unsafe assumptions.

---



# 🔍 Verification System

A major design principle is:

```text
Tool Success ≠ Goal Success
```

After an action runs, the verifier can check:

1. Did the tool execute successfully?
2. Did it return the expected result?
3. Does the result satisfy the action?
4. Are all required goal actions complete?

```text
Execute
   ↓
Tool Result
   ↓
Verification
   ↓
Expected Outcome?
   ↓
Goal Complete?
```

The prototype specifically demonstrates verification for areas including Calendar, Sheets, Maps and other tool results. fileciteturn40file0

---



# ♻️ Recovery & Replanning

If an action fails:

```text
Execute
   ↓
Failure
   ↓
Analyze Failure
   ↓
Recovery / Replan
   ↓
Alternative Action
   ↓
Verify
```

The recovery layer allows the agent to avoid treating every failure as the end of the workflow.

---



# 🧾 Execution History & Auditability

Goal2Done maintains an execution trail.

The system can track:

- Goals
- Actions
- Tool calls
- Arguments
- Results
- Status
- Approval state
- Verification state
- Execution history

This makes the agent's behavior inspectable instead of hiding what happened behind a single chatbot response.

The hackathon prototype specifically includes execution history, approvals, action results and verification status. fileciteturn40file1

---



# 👤 Multi-User Google Authentication

Goal2Done supports user-specific Google sign-in.

The flow is:

```text
User
  ↓
Google Sign-In
  ↓
Unique User Identity
  ↓
User's Google Authorization
  ↓
Gmail / Calendar / Drive / Docs / Sheets
```

Each user connects their own Google services instead of sharing one global Google account.

This is an important part of the working prototype. fileciteturn40file0

---



# 🤖 AI Architecture

Goal2Done uses LLMs for planning, recovery and response generation.

The LLM layer supports multiple providers:

- OpenRouter
- Groq

The application can use configured models for different workloads such as:

- Planning
- Final answers
- Fast operations
- Tool reasoning
- Gmail
- Docs
- Sheets
- Drive
- Research
- Safety
- Recovery

---



# 🔄 AI Failover

AI providers can encounter:

- Rate limits
- Token limits
- Quota errors
- Temporary failures
- Timeouts
- Model availability problems

Goal2Done therefore supports provider/model fallback.

```text
Primary Model
     ↓
Fallback Model
     ↓
Another Provider
     ↓
Fallback Model
     ↓
Graceful Failure Response
```

The goal is to prevent a temporary AI provider problem from breaking the entire user workflow.

---



# 🏗️ Complete System Architecture

```text
                         ┌─────────────────────┐
                         │       USER          │
                         │ Natural-Language    │
                         │       Goal          │
                         └──────────┬──────────┘
                                    ↓
                         ┌─────────────────────┐
                         │     React UI        │
                         │ Chat / Cards /      │
                         │ Approvals / History │
                         └──────────┬──────────┘
                                    ↓
                         ┌─────────────────────┐
                         │      FastAPI        │
                         │       Backend       │
                         └──────────┬──────────┘
                                    ↓
                         ┌─────────────────────┐
                         │      Planner        │
                         │ Goal → Action Plan  │
                         └──────────┬──────────┘
                                    ↓
                         ┌─────────────────────┐
                         │ Dependency Manager  │
                         └──────────┬──────────┘
                                    ↓
                         ┌─────────────────────┐
                         │   Risk / Firewall   │
                         └──────────┬──────────┘
                                    ↓
                         ┌─────────────────────┐
                         │      Executor       │
                         └──────────┬──────────┘
                                    ↓
              ┌────────────────────┼─────────────────────┐
              ↓                    ↓                     ↓
        Google Services        Web / Browser       Local Tools
              ↓                    ↓                     ↓
       Gmail / Calendar       Search / Browser     Files / Docs
       Drive / Docs           Maps / Travel        Tasks
       Sheets                 Directions           Reminders
              └────────────────────┼─────────────────────┘
                                   ↓
                         ┌─────────────────────┐
                         │      Verifier       │
                         └──────────┬──────────┘
                                    ↓
                         ┌─────────────────────┐
                         │ Goal Complete?      │
                         └──────────┬──────────┘
                              ┌─────┴─────┐
                              ↓           ↓
                           SUCCESS     FAILURE
                              ↓           ↓
                             DONE     RECOVERY
```

The overall product flow is **Goal → Plan → Tool Selection → Risk Check → Execute → Verify**. fileciteturn40file4

---



# 🧩 Backend Components

The backend separates responsibilities into focused modules.

```text
backend/
├── main.py
├── planner.py
├── executor.py
├── verifier.py
├── recovery.py
├── firewall.py
├── database.py
├── google_auth.py
├── google_calendar.py
├── google_drive.py
├── google_docs.py
├── google_sheets.py
├── gmail.py
├── messaging.py
├── browser.py
├── browser_actions.py
├── maps_travel.py
├── file_tools.py
├── document_tools.py
├── reminder_scheduler.py
├── llm_client.py
├── user_store.py
└── ...
```



### Responsibilities


| Component               | Responsibility                            |
| ----------------------- | ----------------------------------------- |
| `main.py`               | FastAPI routes and workflow orchestration |
| `planner.py`            | Goal → structured action plan             |
| `executor.py`           | Execute planned tools                     |
| `verifier.py`           | Verify action and goal results            |
| `recovery.py`           | Recovery/replanning                       |
| `firewall.py`           | Risk and approval decisions               |
| `database.py`           | Persistence and workflow records          |
| `google_auth.py`        | Google OAuth and user credentials         |
| Google modules          | Google service integrations               |
| `llm_client.py`         | LLM routing and fallback                  |
| `reminder_scheduler.py` | Reminder scheduling                       |
| `browser_actions.py`    | Browser actions                           |
| `maps_travel.py`        | Maps and routing                          |
| `file_tools.py`         | Workspace file operations                 |
| `document_tools.py`     | Local document generation                 |


---



# 🖥️ Frontend

The frontend provides a continuous conversational interface for the agent.

Core UI capabilities include:

- Goal input
- Chat experience
- Example goals
- Action cards
- Working/progress states
- Clarification cards
- Approval cards
- Rejection flow
- Reminder management
- Calendar view
- Execution history
- Verification status
- Responsive interface
- Google authentication

The working prototype is designed around continuous conversation, action cards, reminders, calendar and execution history. fileciteturn40file0

---



# 🔄 Example End-to-End Workflow



### User

```text
Help me prepare for my software engineering interview.

Research common Java interview questions,
create a 7-day study plan,
save it to Google Docs,
and create reminders for each day.
```



### Goal2Done

```text
1. Understand the goal
        ↓
2. Identify required information
        ↓
3. Search the web
        ↓
4. Generate the study plan
        ↓
5. Create Google Doc
        ↓
6. Create reminder actions
        ↓
7. Apply approval firewall
        ↓
8. Ask for approval where required
        ↓
9. Execute approved actions
        ↓
10. Verify results
        ↓
11. Report final state
```

This demonstrates how one natural-language request becomes a coordinated multi-tool workflow.

---



# 🧪 Example API

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

Approve an action:

```bash
curl -X POST http://127.0.0.1:8000/approve \
  -H "Content-Type: application/json" \
  -d '{
    "approval_id": "YOUR_APPROVAL_ID"
  }'
```

Reject an action:

```bash
curl -X POST http://127.0.0.1:8000/reject \
  -H "Content-Type: application/json" \
  -d '{
    "approval_id": "YOUR_APPROVAL_ID"
  }'
```

---



# 🗄️ Data & Persistence

Goal2Done maintains workflow information such as:

- User information
- Goals
- Executions
- Approvals
- Reminders
- Action results
- Verification state
- Execution history

The project uses a database/persistence layer and user-specific authentication to keep workflows associated with the correct user.

---



# 🔑 Authentication & Security

Goal2Done uses:

- Google OAuth 2.0
- User-specific sessions
- User-specific Google authorization
- Approval firewall
- Environment variables for secrets
- Controlled access to Google services
- Verification before reporting completion

Sensitive credentials should never be stored in source code or committed to GitHub.

---



# ⚙️ Environment Variables

Create `backend/.env` using the credentials required by your deployment.

Example:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/auth/google/callback

GROQ_API_KEY=your_groq_api_key
OPENROUTER_API_KEY=your_openrouter_api_key

FRONTEND_URL=http://localhost:5173
```

Never commit:

```text
.env
API keys
OAuth client secrets
User access tokens
Refresh tokens
```

---



# 🚀 Installation



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



## 3. Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Then open the local Vite URL.

---



# 🌐 Deployment

The project includes a deployed frontend:

**[https://goal2done.vercel.app](https://goal2done.vercel.app)**

The repository:

**[https://github.com/Ravora0809/goal2done](https://github.com/Ravora0809/goal2done)**

Production deployment requires the corresponding backend, OAuth, database, AI provider and environment configuration.

---



# 🛡️ Safety Model

Goal2Done is designed around **autonomy with control**.

Three principles are central:

### Planning ≠ Execution

The AI can plan actions without immediately performing every consequential operation.

### Tool Success ≠ Goal Success

A successful API call does not automatically mean that the user's goal has been achieved.

### User Approval ≠ Optional for Sensitive Actions

Sensitive operations can pause until the user explicitly approves them.

The project's safety design emphasizes approval, verification and auditability. fileciteturn40file8

---



# 🎯 Design Principles



### 1. Goal-driven

The user describes the desired outcome.

### 2. Tool-aware

The planner chooses from real available capabilities.

### 3. Dependency-aware

Actions run only when their required inputs are available.

### 4. Human-controlled

Consequential actions can require approval.

### 5. Verifiable

The system checks results before declaring success.

### 6. Recoverable

Failures can trigger recovery or replanning.

### 7. Transparent

Execution history makes the workflow inspectable.

### 8. User-specific

Google services are connected to the signed-in user's account.

---



# 🧠 What Makes Goal2Done Different?

Goal2Done is not just:

```text
Prompt → LLM → Answer
```

It is:

```text
Goal
 ↓
Context
 ↓
Plan
 ↓
Dependencies
 ↓
Tool Selection
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

The project's core differentiator is:

> **Autonomy with control — the agent can act, but the user remains the decision-maker for sensitive actions.**

The working prototype demonstrates real integrations, user-specific Google access, approvals, verification and a continuous chat experience. fileciteturn40file0

---



# 📌 Feature Summary


| Area           | Features                                                        |
| -------------- | --------------------------------------------------------------- |
| AI Agent       | Goal understanding, planning, tool selection, answer generation |
| Planning       | Structured actions, dependencies, expected outcomes             |
| Safety         | Risk checks, approval, rejection, controlled execution          |
| Verification   | Action verification, goal-level verification                    |
| Recovery       | Failure analysis, recovery, replanning                          |
| Web            | Web search, browser opening/actions                             |
| Gmail          | Read recent mail, send email                                    |
| Calendar       | List, create, update, delete events                             |
| Drive          | List, search, read files                                        |
| Docs           | Create, read, append/update content                             |
| Sheets         | Create, read, write, append, clear                              |
| Tasks          | Create tasks                                                    |
| Reminders      | Create, update, delete, schedule                                |
| Files          | List, search, read workspace files                              |
| Documents      | Generate PDF, DOCX, Markdown, TXT                               |
| Maps           | Place search, driving directions                                |
| Messaging      | Configured messaging provider support                           |
| Authentication | Google OAuth, user-specific access                              |
| UI             | Chat, action cards, approvals, history, reminders, calendar     |
| AI Reliability | OpenRouter/Groq provider and model fallback                     |
| Auditability   | Goals, actions, approvals, results, verification                |


---



# 🚧 Future Improvements

Potential next-level improvements include:

- Persistent user preferences
- Stronger long-term context and constraint memory
- More external integrations
- More advanced browser automation
- Stronger goal-completion evaluation
- More sophisticated autonomous recovery
- Larger automated evaluation suite
- Expanded production infrastructure

These are future enhancements rather than requirements for the core agent workflow.

---



# 🏆 Hackathon Value Proposition

Goal2Done demonstrates that an AI assistant can move beyond conversational responses toward **responsible task completion**.

### The key innovation is the combination of:

```text
Natural-Language Goals
        +
Autonomous Planning
        +
Real Tools
        +
Multi-App Integrations
        +
Approval Firewall
        +
Verification
        +
Recovery
```

This creates an agent that does not simply tell users what to do.

It attempts to **help them get the work done while keeping them in control.**

---



# 📄 Project Information

**Project:** Goal2Done  
**Category:** Autonomous AI Agent / Personal Operations Agent  
**Tagline:** *Tell it what you want. It figures out how to get it done.*

### Repository

[https://github.com/Ravora0809/goal2done](https://github.com/Ravora0809/goal2done)

### Live Frontend

[https://goal2done.vercel.app](https://goal2done.vercel.app)

---



# 🧰 Technology Stack



### Frontend

- React
- JavaScript
- Tailwind CSS
- Vite



### Backend

- Python
- FastAPI
- Pydantic



### AI

- OpenRouter
- Groq
- LLM-based planning
- Provider/model failover



### Authentication

- Google OAuth 2.0
- User-specific Google authorization
- Session-based authentication



### Google APIs

- Gmail
- Google Calendar
- Google Drive
- Google Docs
- Google Sheets



### Other Integrations

- OpenStreetMap / Nominatim
- OSRM
- Web search
- Playwright/browser automation



### Data

- Application persistence/database layer
- User-specific workflow and execution records

---



# 📜 License

No license has been specified yet.