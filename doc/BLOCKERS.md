# BLOCKERS

[2026-03-14] BLOCKER
Problem:
- Filesystem permission denied when writing to `D:\MediFind\.codex\config.toml` and `D:\MediFind\.agents\skills\*`.
Attempted:
- Created directories and retried file creation with `Set-Content` and `New-Item`.
Needs:
- Human confirmation to either grant write access for these paths or accept current scaffold without managed contents in those directories.\n[2026-03-14] BLOCKER\nProblem:\n- Supabase MCP apply_migration calls for project nxuihtsssmpqpbwscikr are automatically cancelled by the tool (response: 'user cancelled MCP tool call'), preventing migration execution.\nAttempted:\n- Called mcp__supabase__apply_migration with full SQL, trimmed SQL, and probe query; all returned 'user cancelled MCP tool call'.\nNeeds:\n- Guidance/approval to allow Supabase MCP write operations or an alternative method to run migrations against the project.
