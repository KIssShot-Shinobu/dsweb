<!-- BEGIN:nextjs-agent-rules -->

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
# AGENTS.md — AI Agent Rules for Next.js + Prisma + Auth
This document defines the operational rules for AI coding agents working in this repository.

The stack used in this project:

* Next.js (App Router)
* Prisma ORM
* PostgreSQL / Mysql 
* Authentication (Auth.js / NextAuth)
* TypeScript

Agents must follow these rules to maintain **security, scalability, and maintainability**.

---

# Next.js: ALWAYS read docs before coding

Before any Next.js work, check the installed Next.js source and types in `node_modules/next/dist/` first. If local bundled docs are unavailable in the installed version, use the official Next.js documentation as the source of truth.


# 1. General Principles

AI agents must:

* follow the existing architecture
* prefer simple solutions
* reuse existing utilities
* avoid unnecessary dependencies
* maintain consistent code style

Never introduce breaking architectural changes without human approval.

---

# 2. Next.js Development Rules

This project uses **Next.js App Router**.

Directory structure:

```
src/
 ├ app/
 ├ components/
 ├ features/
 ├ lib/
 ├ services/
 ├ hooks/
 ├ utils/
 ├ types/
 └ middleware.ts
```

Rules:

* UI components → `/components`
* Business logic → `/services`
* Database logic → `/lib`
* Feature modules → `/features`
* Shared utilities → `/utils`

Avoid placing business logic directly in React components.

For frontend and UI work in this repository:

* use DaisyUI components and variants as the default design system
* prefer DaisyUI classes over hand-crafted Tailwind-only controls
* only fall back to custom styling when a feature cannot be expressed cleanly with DaisyUI

---

# 3. Server vs Client Components

Default to **Server Components**.

Use Client Components only when needed.

Allowed reasons for `"use client"`:

* state management
* event handlers
* browser APIs
* interactive UI

Never mark large layout trees as client components.

---

# 4. API Route Standards

All server endpoints must be placed in:

```
app/api/
```

Example:

```
app/api/users/route.ts
```

API rules:

* validate input
* return typed responses
* use proper HTTP status codes

Example response format:

```ts
{
  success: true,
  data: {...}
}
```

Error format:

```ts
{
  success: false,
  error: "message"
}
```

---

# 5. Prisma Rules

Database access must always go through Prisma.

Prisma client location:

```
src/lib/prisma.ts
```

Example:

```ts
import { prisma } from "@/lib/prisma"
```

Never create multiple Prisma clients.

Bad example:

```
new PrismaClient()
```

Use the shared instance instead.

---

# 6. Database Query Best Practices

Always:

* select only required fields
* avoid N+1 queries
* use pagination
* use indexes when needed

Example:

Bad:

```
prisma.user.findMany()
```

Better:

```
prisma.user.findMany({
  select: {
    id: true,
    name: true
  },
  take: 20
})
```

---

# 7. Prisma Schema Changes

Any schema change requires:

1. Update `schema.prisma`
2. Generate migration

Command:

```
npx prisma migrate dev
```

Agents must never delete migrations without human approval.

---

# 8. Authentication Rules

Authentication is handled via **Auth.js / NextAuth**.

Auth config location:

```
src/lib/auth.ts
```

Session access:

```
import { auth } from "@/lib/auth"
```

Server usage:

```
const session = await auth()
```

Rules:

* Never expose sensitive user data
* Always check authentication before protected operations
* Always verify user ownership of resources

Example:

```
if (!session?.user?.id) {
  return unauthorized
}
```

---

# 9. Authorization Rules

Authentication ≠ Authorization.

Always verify:

* user role
* ownership
* permissions

Example:

```
if (post.authorId !== session.user.id) {
  return forbidden
}
```

---

# 10. Environment Variables

All secrets must be stored in environment variables.

Allowed usage:

```
process.env.DATABASE_URL
process.env.AUTH_SECRET
```

Never:

* hardcode secrets
* log sensitive values

Files used:

```
.env.local
.env.production
```

`.env` must never be committed.

---

# 11. Security Best Practices

Always protect against:

* XSS
* SQL injection
* CSRF
* SSRF

Rules:

* validate inputs
* sanitize outputs
* use parameterized queries (Prisma already does this)

Never trust user input.

---

# 12. Input Validation

All API inputs must be validated.

Use schema validation.

Recommended:

* Zod

Example:

```
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})
```

---

# 13. Error Handling

Never expose internal errors.

Bad:

```
return error.message
```

Good:

```
return {
  success: false,
  error: "Internal server error"
}
```

Log detailed errors internally.

---

# 14. Performance Guidelines

Agents should prioritize:

* server components
* caching
* streaming
* optimized queries

Use built-in Next.js features:

* `next/image`
* `next/link`
* `revalidate`
* `cache`

Avoid unnecessary client-side fetching.

---

# 15. Data Fetching Strategy

Preferred order:

1. Server Components
2. Server Actions
3. API Routes
4. Client Fetch

Example server fetch:

```
const users = await prisma.user.findMany()
```

Avoid `useEffect` for data fetching when possible.

---

# 16. Logging Rules

Critical events must be logged:

* login attempts
* account changes
* failed API calls

Log format:

```
timestamp
user_id
action
status
```

Never log passwords or tokens.

---

# 17. Testing Rules

All new features must include tests.

Types:

Unit Tests

* business logic

Integration Tests

* API routes

Recommended tools:

* Vitest
* Jest
* Playwright

Tests must pass before merge.

---

# 18. Commit Rules

Use structured commits:

```
type(scope): description
```

Examples:

```
feat(auth): add OAuth login
fix(api): resolve pagination bug
refactor(db): simplify user queries
```

---

# 19. Pull Request Checklist

Before creating PR:

* run lint
* run tests
* verify build

Checklist:

* security verified
* no secrets exposed
* queries optimized
* tests included

---

# 20. Human Approval Required

The agent must request human review for:

* database schema changes
* authentication logic
* payment logic
* environment configuration
* dependency upgrades

---

# 21. Documentation Updates

If behavior changes, update:

* README.md
* API docs
* code comments

---

# 22. AI Agent Safety Rule

If uncertain about implementation:

* stop
* request clarification
* do not guess

Correctness is more important than speed.

---

<!-- END:nextjs-agent-rules -->

