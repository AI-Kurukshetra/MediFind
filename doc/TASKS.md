# TASKS

Status legend:
- [ ] TODO
- [x] DONE
- [~] IN PROGRESS
- [!] BLOCKED

## Session Summary (2026-03-14)
- Completed: initial repository and Supabase foundation setup, Supabase-backed pharmacy auth flow, and session-driven pharmacy dashboard UX
- In progress: none
- Blocked: write access to `.codex/` and `.agents/skills/` for managed config files

## Dependency Order
1. db-migration
2. api-endpoint
3. frontend-design
4. testing
5. review

## Tasks
- [x] Initialize project structure aligned with AGENTS.md and PRD
- [x] Create initial Supabase schema migration for core entities and RLS
- [x] Document schema baseline in `doc/SCHEMA.md`
- [!] Add role config in `.codex/config.toml` and starter skill notes under `.agents/skills/`
- [x] Build medicine search API endpoint using server-side filtering and distance sorting
- [x] Build pharmacy inventory management API endpoints
- [x] Build user authentication and profile setup flow with Supabase Auth
- [x] Implement medicine search page with loading skeletons and error states
- [x] Implement pharmacy dashboard inventory update UI
- [x] Implement pharmacy registration + login UI with Supabase Auth and auto-session dashboard access
- [x] Add delivery request and reservation workflows
- [x] Add prescription upload flow and storage integration
- [x] Add notification subscription and stock alert workflow
- [x] Add unit tests for validation, API handlers, and DB access wrappers
- [x] Add Playwright e2e tests for auth, medicine search, delivery, and inventory updates
- [x] Run full test suite and fix failures
- [x] Perform code review pass and hardening (security + performance)
- [x] Redesign medicine search page UI (hero, autocomplete, geolocation, animations, dialog, toasts)
- [x] Redesign pharmacy dashboard UI (modern SaaS layout, stat cards, toggle switches, animations, toasts)
- [x] Add global navigation bar and toast notification system
- [x] Update home page with brand identity and modern design
- [x] Redesign auth login/register page with modern split-screen SaaS layout
