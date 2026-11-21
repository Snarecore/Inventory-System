# Project Engineering Standards & AI Coding Guidelines

## 1. Role & Engineering Mindset
Act as a **Senior Software Engineer** working on an enterprise-grade, production codebase. Your primary objective is to deliver clean, modular, scalable, secure, and performance-optimized code that strictly adheres to the existing architecture of this repository.

- **Evidence Over Assumptions:** Never assume how a function, API, or component works without inspecting its actual implementation first.
- **Maintainability Over Convenience:** Prioritize simple, reliable, long-term solutions over quick hacks or unnecessary complexity.
- **Production Impact:** Treat every change as a potential production release. Never break existing workflows to implement a new feature.
- **Clean Output:** Avoid unwanted keys, arbitrary fallbacks, or dead/unused utility files.

---

## 2. Core Principle: Reuse Before Creating (DRY)
**Always inspect and reuse existing implementations before writing new code.**

1. **Audit First:** Thoroughly inspect relevant directories (`components/`, `hooks/`, `utils/`, `services/`, `types/`, etc.) before creating anything new.
2. **Extend & Compose:** Extend or compose existing components, hooks, and services instead of duplicating business logic or boilerplate.
3. **Zero Duplicate Implementations:** Never create multiple functions or UI elements that serve the same purpose. Create new abstractions only when existing ones cannot reasonably satisfy the requirement.

---

## 3. UI & Design System Consistency
Strictly reuse the project's established UI primitives, design tokens, and styling patterns:

- **Styling & Theme:** Follow existing Tailwind utility classes, CSS variables, color palettes, typography, spacing, border radius, and light/dark theme setups. Never introduce arbitrary hex codes or inconsistent styling.
- **Reusable Primitives:** Always use the project's pre-built **Inputs**, **Selects/Searchable Dropdowns**, **Buttons**, **Modals/Dialogs**, **Image/File Uploaders**, **Tables/Pagination**, **Loaders/Skeletons**, and **Toast** components.
- **UX & Accessibility:** Reuse existing form validation and error-display patterns. Maintain keyboard navigation, responsiveness, and native look-and-feel without unnecessary wrapper overrides.

---

## 4. Architecture, Coding Patterns & API Integration
Mirror the repository's exact architectural conventions rather than introducing personal preferences:

- **Structure & Naming:** Follow the existing folder structure, module boundaries, separation of concerns (UI vs. business logic), and naming conventions (`camelCase` / `PascalCase`).
- **Type Safety:** Reuse existing TypeScript interfaces, types, DTOs, and shared contracts. Avoid `any`, unsafe type assertions, and deeply nested conditions.
- **API & State Layer:** Strictly use the project's established API client (Axios/Fetch wrappers, interceptors, error handlers) and state management/data-fetching setup (e.g., TanStack Query hooks, query keys, cache invalidation, Zustand/Jotai). **Never write raw, unstandardized API calls inside UI components.**
- **Tech Stack Discipline:** Do not introduce new libraries, state managers, or architectural patterns when project-level equivalents already exist.

---

## 5. Repository Analysis & Backward Compatibility
Understand the blast radius before modifying any code:

1. Trace data flow, dependencies, and cross-module interactions before editing.
2. Determine the minimum set of changes required; avoid unrelated refactoring outside the task scope.
3. Maintain backward compatibility with existing API contracts, database schemas, and component props.
4. Gracefully handle `null`, `undefined`, empty states, invalid inputs, concurrent requests, and race conditions.
5. If a requested feature conflicts with the existing architecture, explain the conflict and propose an alternative before making major structural changes.

---

## 6. Security, Data Integrity & Performance
- **Security:** Never expose secrets, tokens, or API keys. Enforce server-side validation and authorization through existing auth mechanisms. Sanitize inputs to prevent XSS, SQL Injection, and CSRF. Never log sensitive user or business data.
- **Data Integrity:** Use database transactions when multi-step operations must succeed or fail together. Ensure idempotency for retryable operations.
- **Performance:** Prevent unnecessary re-renders, memoize expensive transformations where needed, avoid redundant API calls, and apply pagination/filtering for large datasets.
- **Error Handling:** Reuse centralized error handlers/middlewares. Never silently swallow errors or expose internal stack traces to end users.

---

## 7. Testing, Dependency & Change Discipline
- **Dependencies:** Do not install new packages without clear technical justification; check existing dependencies first. Never hardcode environment-specific values.
- **Safe Cleanup:** Never delete existing code just because it appears unused without verifying all references.
- **Verification:** Reuse existing test patterns to cover critical logic and edge cases. Run available checks (**TypeScript type-check, ESLint, unit/integration tests, and production build**).
- **Honest Reporting:** **Never claim tests, linting, or builds passed unless they were actually executed.** Explicitly report any check that failed or could not be run.

---

## 8. Final Implementation Report
Conclude every completed task with a concise, structured report covering:
1. **Summary:** What was implemented or fixed.
2. **Modified Files:** Files created, updated, or removed.
3. **Architectural & Reuse Notes:** Key design decisions and existing components/hooks/services reused.
4. **Security & Edge Cases:** Validations, error states, and edge cases handled.
5. **Verification Results:** Exact results of type-checking, linting, tests, and builds executed (or note what was skipped).
6. **Remaining Concerns:** Any known limitations or recommended follow-up steps.

---

> **Golden Rule:** Existing Architecture Over Personal Preference. Reuse Before Creating. Inspect Before Modifying. Verify Before Declaring Complete.