# AGENTS.md

Living instruction file for Codex and all AI agents working in this repository.

Project: **MediFind — Find Medicine Nearby Instantly**
Category: **HealthTech / Medicine Locator**

All agents must read this file before starting any task.

---

# 🏥 Product Context — MediFind

MediFind is a location-aware medicine search platform that allows users to quickly find nearby pharmacies with a specific medicine in stock.

The platform connects patients and pharmacies through a real-time medicine availability system and supports reservation or home delivery requests.

Primary goal:
Allow users to locate required medicines within seconds instead of visiting multiple pharmacies.

---

## Core User Flow

### Patient Flow

1. User searches for a medicine
2. Platform checks pharmacy inventories
3. Nearby pharmacies with stock are displayed
4. User selects a pharmacy
5. User can:

   * reserve the medicine
   * request home delivery
   * upload prescription if required

### Pharmacy Flow

1. Pharmacy registers on the platform
2. Adds medicines to inventory
3. Updates stock availability
4. Receives delivery/reservation requests
5. Accepts or rejects requests

---

## Target Users

Patients searching for prescribed medicines
Elderly or mobility-impaired individuals
Caregivers managing prescriptions
Local pharmacies wanting to increase reach

---

## Core Domain Entities

The platform revolves around the following core entities:

users
pharmacies
medicines
inventory
orders
delivery_requests
prescriptions
notifications

All database schema and APIs must revolve around these entities.

---

## Core Features

Medicine search with real-time stock availability
Nearby pharmacy locator with map view
Distance-based filtering
Medicine reservation
Home delivery requests
Pharmacy dashboard for inventory management
Prescription upload support
Stock availability notifications

---

## Monetization Strategy

Delivery commission per successful order

Pharmacy subscription for premium tools

Featured pharmacy listings in search results

---

# 🗂 Context Management — `/doc` Folder (Read First)

Before starting any task, agents must read the following files:

| File                | Purpose                                |
| ------------------- | -------------------------------------- |
| `/doc/PRD.md`       | Product requirements and feature specs |
| `/doc/TASKS.md`     | Master task list with status           |
| `/doc/PROGRESS.md`  | Session progress log                   |
| `/doc/BLOCKERS.md`  | Issues requiring human input           |
| `/doc/CHANGELOG.md` | Code and schema changes                |
| `/doc/DECISIONS.md` | Architecture decisions                 |
| `/doc/SCHEMA.md`    | Database schema and migration history  |

Task statuses:

```
[ ] TODO
[x] DONE
[~] IN PROGRESS
[!] BLOCKED
```

After completing a task:

1. Mark task `[x]` in `TASKS.md`
2. Add entry to `PROGRESS.md`
3. Update `CHANGELOG.md`
4. Record architecture decisions in `DECISIONS.md`

If the /doc folder does not exist, create it with the following files:

/doc/PRD.md
/doc/TASKS.md
/doc/PROGRESS.md
/doc/BLOCKERS.md
/doc/CHANGELOG.md
/doc/DECISIONS.md
/doc/SCHEMA.md

Each file must include basic starter content relevant to the MediFind project.
---

## New Session Start Rule

At the start of every new Codex session:

1. Read `/doc/TASKS.md`
2. Read `/doc/PROGRESS.md`
3. Read `/doc/BLOCKERS.md`

Summarize:
• what is completed
• what is in progress
• what is blocked

Then continue working on the next incomplete task in `TASKS.md`.

# 🤖 Multi-Agent Architecture

The root Codex session acts as **Project Coordinator**.

The coordinator:

* Reads project context
* Decomposes tasks
* Spawns specialist agents
* Verifies results
* Logs progress

Agents specialize in different areas such as frontend, backend, testing, and code review.

---

# 👥 Agent Roles

Defined inside `.codex/config.toml`.

Frontend Agent
Handles UI, layouts, and components.

Backend Agent
Handles APIs, database logic, and server actions.

Tester Agent
Runs unit tests and end-to-end tests.

Reviewer Agent
Reviews code for correctness, security, and conventions.

---

# 🧩 Skills System

Reusable workflows live in:

```
.agents/skills/
```

Example skills:

frontend-design
db-migration
api-endpoint
agent-browser
pr-review
new-session

Each skill contains a `SKILL.md` describing when it should be triggered.

Skills load instructions only when invoked to keep context small.

---

# 📋 Coordinator Workflow

Coordinator follows this order:

1. READ `/doc/TASKS.md` and `/doc/BLOCKERS.md`
2. PLAN next tasks
3. SPAWN specialist agents
4. VERIFY deliverables exist
5. TEST the changes
6. REVIEW code
7. LOG progress
8. COMMIT changes

---

## Dependency Order

Tasks must complete in this order:

```
db-migration → api-endpoint → frontend-design → testing → review
```

---

# 📁 Project Structure

```
/
├── .agents/
│   └── skills/
├── .codex/
│   └── config.toml
├── app/
│   ├── (auth)/
│   ├── (dashboard)/
│   └── api/
├── components/
│   └── ui/
├── lib/
│   ├── supabase/
│   ├── validations/
│   └── utils.ts
├── hooks/
├── types/
├── middleware.ts
├── supabase/
│   └── migrations/
├── tests/
│   └── e2e/
└── doc/
```

---

# 🏗 Tech Stack (Canonical)

Framework: Next.js (App Router)

Language: TypeScript (strict mode)

Database: Supabase (Postgres)

Authentication: Supabase Auth

Styling: Tailwind CSS

Components: shadcn/ui

Forms: React Hook Form + Zod

Server State: TanStack Query

Package Manager: pnpm

Hosting: Vercel

Testing: Vitest + Playwright

---

# ⚛️ Next.js Standards

Default to **Server Components**.

Use `"use client"` only when required.

Use Server Actions for mutations when possible.

Use API routes for complex operations.

All pages must export metadata.

Images must use `next/image`.

---

# 🔐 Supabase Standards

Use Supabase for database and authentication.

RLS must be enabled for every table.

Never expose `SUPABASE_SERVICE_ROLE_KEY` to client code.

All schema changes must go through migrations.

All schema changes must be documented in `/doc/SCHEMA.md`.

---
Agents are allowed to:

• design database schemas
• create new tables
• add indexes
• create RLS policies
• write migration files

All schema changes must:

1. be written to `supabase/migrations/`
2. be documented in `/doc/SCHEMA.md`
3. never break existing tables

# 🔎 Medicine Search Optimization

Medicine search is the most critical feature of MediFind.

Agents must:

Create indexes on medicine names.

Support case-insensitive search.

Prefer server-side filtering.

Optimize queries for fast response time (<500ms).

Preferred search strategies:

• ILIKE search for medicine names
• Postgres trigram similarity if dataset grows
• Indexed search on medicine_name column

---

# 📍 Location Handling

Pharmacies must store:

latitude
longitude

Distance calculation should prioritize nearby pharmacies.

Search results should prioritize:

1. Medicine availability
2. Distance from user
3. Pharmacy rating (future feature)

---

# 🎨 UI Guidelines

The interface must be:

Simple
Fast
Mobile-friendly
Accessible

Users must be able to find a medicine within seconds.

Use Tailwind for styling.

Prefer shadcn/ui components.

Loading states must always show skeletons.

Error states must always render user-friendly messages.

---

# 🧪 Testing Standards

Unit tests: Vitest

End-to-end tests: Playwright

Test critical flows:

Authentication
Medicine search
Delivery requests
Inventory updates

All tests must pass before committing code.

---

# 🌿 Git Conventions

Use Conventional Commits.

Examples:

```
feat(ui): add medicine search page
fix(db): correct pharmacy RLS policy
docs(doc): update PRD
chore(agents): update AGENTS.md
```

---

# 🔒 Security Rules

Never commit secrets.

Environment variables must be stored in `.env.local`.

Validate all inputs using Zod.

Never expose database service keys to client code.

---

# 🔑 Environment Variables

Environment variables must be stored in `.env.local`.

Required variables may include:

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_MAPS_API_KEY

Agents must never hardcode secrets in source code.

If a required environment variable is missing, log a blocker in `/doc/BLOCKERS.md`.

# 🚫 Anti-Patterns

Avoid:

Using `any` in TypeScript

Fetching data inside `useEffect` for initial loads

Disabling RLS on tables

Hardcoding secrets

Skipping testing

---

# 🆘 Escalation Rules

Agents must stop and log to `/doc/BLOCKERS.md` if:

Requirements are unclear

Database schema conflicts occur

A required environment variable is missing

Tests cannot pass

Human input is required

Blocker entry format:

```
[YYYY-MM-DD] BLOCKER
Problem:
Attempted:
Needs:
```

Never guess past a blocker.
Log it and wait for human input.

---

Project: **MediFind**
Document: **AGENTS.md**
Version: **1.0**
