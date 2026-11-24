# Workbench Responsiveness, Forms, and Visual Layering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Project Workbench responsive during search and vault updates, clarify every input form, and prevent search/timeline visual overlap on desktop and mobile.

**Architecture:** Keep the existing Obsidian view and Markdown model, but cache the latest `VaultFile[]`, project index, snapshot, and timeline inputs inside `ResearchWorkbenchView`. Add a small pure refresh scheduler/debounce helper so search renders from cached data and vault events coalesce into one asynchronous reload. Add a shared modal field helper for visible labels and descriptions, then apply constrained layout rules to the search and timeline components.

**Tech Stack:** TypeScript, Obsidian DOM helpers, Vitest, CSS.

**Spec:** `docs/superpowers/specs/2026-11-23-workbench-responsiveness-forms-visual-design.md`

## Global Constraints

- Preserve the existing frontmatter field names, Markdown write protocol, and conflict checks.
- Preserve default summary search; body search remains opt-in through “搜索正文”.
- Keep desktop and mobile support; do not add a UI framework or runtime dependency.
- Existing `npm test`, `npm run typecheck`, and `npm run build` must pass.

## Review Focus

- Rapid search input must not read the vault on every keystroke; the cache test belongs to Task 1.
- Multiple vault events in one debounce window must trigger one reload; the scheduler test belongs to Task 1.
- Empty optional values must remain valid where current behavior permits them, while required fields still reject blanks; modal copy/validation tests belong to Task 2.
- Long titles and dates must remain inside one timeline row; structure and CSS contract tests belong to Task 3.
- Search icon must be a single custom layer with reserved input padding and no native search decoration; header semantics tests belong to Task 3.

---

### Task 1: Cache-backed rendering and coalesced refreshes

**Files:**
- Create: `src/ui/refresh-scheduler.ts`
- Modify: `src/ui/workbench-view.ts`
- Test: `tests/ui/refresh-scheduler.test.ts`

**Interfaces:**
- Produces `createRefreshScheduler(schedule: () => void, delayMs: number): { request(): void; dispose(): void }`, which coalesces requests in one timer window and does not schedule after disposal.
- `ResearchWorkbenchView` keeps `private cachedFiles: VaultFile[] | null`, `private cachedProjects: ProjectSummary[]`, and `private refreshScheduler`; `renderCurrent()` becomes synchronous from cached data and never calls `files()`.

- [ ] **Step 1: Write the failing scheduler/cache tests**

  Add tests proving that three `request()` calls before the timer fires invoke the callback once, `dispose()` prevents a pending callback, and a cache-backed render path can derive filtered results without invoking a file loader.

- [ ] **Step 2: Run the focused tests to verify the expected failures**

  Run: `npm test -- tests/ui/refresh-scheduler.test.ts`

  Expected: FAIL because the scheduler module and cache-backed behavior do not yet exist.

- [ ] **Step 3: Implement the scheduler and view cache**

  Implement the pure scheduler with `window.setTimeout`/`window.clearTimeout` compatible with the test environment. In `ResearchWorkbenchView`, load files only from `refresh()`, store the latest file list and derived project index/snapshot, and have `renderCurrent()` render directly from those cached values. Register create/modify/delete handlers with the scheduler. If a vault event arrives while a load is active, schedule one follow-up load after the current load completes. Keep `includeArchived` changes as a cache-only derivation. Update project selection and panel actions so they render from the cache instead of rereading files.

- [ ] **Step 4: Run focused tests and the existing UI suite**

  Run: `npm test -- tests/ui/refresh-scheduler.test.ts tests/ui/panels-search-settings.test.ts tests/ui/workbench-render-state.test.ts`

  Expected: PASS with no file-read call on cached search/filter operations.

- [ ] **Step 5: Commit the cache change**

  ```bash
  git add src/ui/refresh-scheduler.ts src/ui/workbench-view.ts tests/ui/refresh-scheduler.test.ts
  git commit -m "perf: render workbench from cached vault snapshot"
  ```

### Task 2: Shared, explicit modal fields

**Files:**
- Create: `src/ui/modals/form-fields.ts`
- Modify: `src/ui/modals/edit-problem-modal.ts`
- Modify: `src/ui/modals/edit-task-modal.ts`
- Modify: `src/ui/modals/edit-goals-modal.ts`
- Modify: `src/ui/modals/project-wizard.ts`
- Modify: `src/ui/modals/problem-modal.ts`
- Modify: `src/ui/modals/task-modal.ts`
- Modify: `src/ui/modals/pending-modal.ts`
- Modify: `src/ui/modals/associate-problem-modal.ts`
- Test: `tests/ui/modal-fields.test.ts`

**Interfaces:**
- Produces `createModalField(container: HTMLElement, options: { label: string; description?: string; example?: string; control: 'input' | 'textarea' | 'select'; type?: string; value?: string; placeholder?: string; required?: boolean }): { field: HTMLElement; input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement }`.
- Existing modal result interfaces and submit callbacks remain unchanged.

- [ ] **Step 1: Write failing field-contract tests**

  Add tests for the field helper contract: visible label text, description/example text, `aria-label` or label association, required marker when requested, and correct control type. Add modal-specific copy expectations for status/stage/research role, task status/priority/due date, current gate/next milestone, and creation fields.

- [ ] **Step 2: Run focused tests to verify failure**

  Run: `npm test -- tests/ui/modal-fields.test.ts`

  Expected: FAIL because the helper and explicit modal field structure do not exist.

- [ ] **Step 3: Implement the helper and migrate every input modal**

  Build the helper with Obsidian-compatible DOM APIs and stable classes (`rw-form-field`, `rw-form-label`, `rw-form-description`, `rw-form-example`). Replace placeholder-only controls in all listed modals. Use concise Chinese labels and descriptions: status explains lifecycle state, stage explains research phase, research role explains mainline/probe/parked usage, priority explains urgency, due date specifies `YYYY-MM-DD`, and goal fields explain the decision or milestone expected. Keep existing required/optional validation and submit payloads exactly intact.

- [ ] **Step 4: Add form CSS and verify tests**

  Add field spacing, readable label hierarchy, help text, required marker, and mobile-safe control sizing to `styles.css`. Run: `npm test -- tests/ui/modal-fields.test.ts tests/ui/project-wizard.test.ts`.

  Expected: PASS with all existing payload contracts unchanged.

- [ ] **Step 5: Commit the form change**

  ```bash
  git add src/ui/modals src/ui/modals/form-fields.ts styles.css tests/ui/modal-fields.test.ts tests/ui/project-wizard.test.ts
  git commit -m "feat: clarify workbench form fields"
  ```

### Task 3: Search and timeline layering repair

**Files:**
- Modify: `src/ui/components/main-header.ts`
- Modify: `src/ui/components/recent-timeline.ts`
- Modify: `styles.css`
- Test: `tests/ui/visual-layering.test.ts`

**Interfaces:**
- `renderMainHeader` produces one `input.rw-search[role="searchbox"]` and one `.rw-search-icon` sibling with `pointer-events: none`.
- `renderTimeline` produces each `.rw-timeline-item` with `.rw-timeline-icon`, `.rw-timeline-body`, `.rw-timeline-title`, and `.rw-timeline-date`.

- [ ] **Step 1: Write failing semantic structure tests**

  Add tests using the project DOM test setup to assert the searchbox role, the absence of native search decoration class/markup, a single custom icon, and the timeline body/title/date class structure for long event titles.

- [ ] **Step 2: Run focused tests to verify failure**

  Run: `npm test -- tests/ui/visual-layering.test.ts`

  Expected: FAIL because the current search uses `type="search"` and timeline body/title/date do not have the explicit structure.

- [ ] **Step 3: Implement the semantic structure and CSS constraints**

  Change the search control to a text input with `role="searchbox"`, preserve its placeholder and action callback, and keep one custom icon layer. Update timeline rendering with explicit body/title/date elements. Add `position`, `z-index`, `overflow`, `min-width: 0`, line clamping/ellipsis, and stable row alignment rules so icons never cross row boundaries. Keep the existing mobile breakpoint and make the same constraints apply in narrow layouts.

- [ ] **Step 4: Run focused visual tests and the full suite**

  Run: `npm test -- tests/ui/visual-layering.test.ts tests/ui/visual-semantics.test.ts tests/ui/mobile-layout.test.ts`.

  Expected: PASS with semantic regions unchanged and no row overflow contract failures.

- [ ] **Step 5: Commit the visual change**

  ```bash
  git add src/ui/components/main-header.ts src/ui/components/recent-timeline.ts styles.css tests/ui/visual-layering.test.ts
  git commit -m "fix: stabilize search and timeline layering"
  ```

### Task 4: Full verification and build handoff

**Files:**
- Modify: `docs/superpowers/specs/2026-11-23-workbench-responsiveness-forms-visual-design.md` only if implementation decisions need recording.

- [ ] **Step 1: Run the complete verification suite**

  Run: `npm run typecheck && npm test && npm run build`.

  Expected: TypeScript exits 0, all Vitest tests pass, and `dist/main.js` is generated successfully.

- [ ] **Step 2: Inspect the final diff and worktree state**

  Run: `git diff --check && git status --short && git log --oneline -4`.

  Expected: no whitespace errors; only the planned source, style, test, and documentation files changed.

- [ ] **Step 3: Report the result**

  Include the worktree path, the three user-visible improvements, verification commands and outcomes, and any remaining limitation such as the need to reload the installed vault plugin bundle after building.
