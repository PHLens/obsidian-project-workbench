# Inbox and Inline Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver global Inbox capture and real material associations, plus field-specific project/problem editing.

**Architecture:** Index Inbox entries independently of project snapshots and project the cached global collection into project/problem views. Keep capture and association writes in dedicated helpers using the existing content-hash guard. Share accessible property editors and a persistent workbench shell across panels; cache file contents to restrict rereads to changed notes.

**Tech Stack:** TypeScript, Obsidian API, YAML, Vitest, test-only DOM support, CSS.

**Spec:** `docs/superpowers/specs/2026-11-24-inbox-and-inline-editing-design.md`

## Global Constraints

- Markdown is the source of truth; directory lists remain local `data.json` settings and default to empty.
- Global Inbox loading remains bounded by configured input directories.
- Reference capture preserves the source note; association edits update only the Inbox entry.
- Capture needs a title, while associations are optional; pending and processed views remain accessible without a project.
- Development metadata, tests, and new documentation use English and generic examples.
- Desktop/mobile, scoped-read behavior, and existing write conflict checks remain supported.

## Review Focus

- Legacy scalar links, duplicate basenames, and unresolved associations must survive opening and editing (Tasks 1–2).
- Processed and unknown-status entries must remain discoverable after pending flags change (Tasks 1 and 4).
- Capture with no projects or input directory must keep navigation usable and avoid fallback writes (Tasks 2 and 4).
- A stale editor must preserve entered text and external note changes (Tasks 2–3).
- Mobile/keyboard interaction, event propagation, and cached navigation must work in actual components (Tasks 3–5).

---

## Task 1: Global Inbox indexing and scoped content caching

**Files:** Create `src/model/inbox.ts`, `src/ui/scoped-file-cache.ts`; modify `src/model/types.ts`, `src/model/project-snapshot.ts`, `src/ui/reader-context.ts`; add `tests/model/inbox.test.ts`, `tests/ui/scoped-file-cache.test.ts`.

**Interfaces:**
- `InboxEntry` extends the existing pending-input shape with `kind`, `projects`, `problems`, `sourceValue`, and `summary`.
- `buildInboxIndex(files: VaultFile[], options?: { inputDirectories?: string[]; includeArchived?: boolean }): InboxEntry[]` includes pending and processed entries and combines legacy project links.
- `resolveAssociationPath(link: string, files: Array<{ path: string }>): string | undefined` prefers full paths and resolves unique basenames only.
- `filterInbox(entries: InboxEntry[], filters: InboxFilters, files: Array<{ path: string }>): InboxEntry[]` supports view, kind, text, and explicit project/problem filters.
- `inboxForProject(entries: InboxEntry[], projectPath: string, problemPaths: string[], files: Array<{ path: string }>): InboxEntry[]` derives reverse material lists.
- `ScopedFileCache.load(files, read, forcePaths)` reuses unchanged content by path/mtime/size and removes files no longer present.

- [x] Write tests: title-only uncategorized capture data is indexed; legacy `project`/`projects` combine; processed and unknown values remain indexed; exact-path links beat duplicate basenames; project/problem filters select correct entries; absent associations do not exclude an entry globally. Cache tests assert unrelated notes are not read on a single-file change and deletion/scope changes evict cached notes.
- [x] Run `npm test -- tests/model/inbox.test.ts tests/ui/scoped-file-cache.test.ts`; expect the new behavior to fail before implementation.
- [x] Implement the interfaces and project projections. Keep existing `pendingInputs` consumers compatible while allowing the global index to exist independently.
- [x] Run the focused tests and all existing model tests; expect PASS.
- [x] Commit: `feat: index global inbox entries within configured scope`.

## Task 2: Protected capture and association writes

**Files:** Create `src/ui/inbox-writes.ts`, `src/ui/property-model.ts`; modify `src/ui/vault-writes.ts` only to expose needed helpers; add `tests/writes/inbox-writes.test.ts`, `tests/writes/inline-properties.test.ts`.

**Interfaces:**
- `InboxCaptureInput` contains `title`, `kind`, `content`, `sourceValue`, `projects`, and `problems`.
- `createInboxEntry(app: App, input: InboxCaptureInput, directory: string): Promise<string>` validates an existing configured folder, creates one collision-safe record, and preserves source notes.
- `updateInboxAssociations(app, path, expectedHash, associations): Promise<WriteResult>` normalizes only that entry's project/problem links and removes its legacy singular project field.
- `changeInboxState(app, path, expectedHash, status, validTargets): Promise<WriteResult>` requires a real valid target for `linked`.
- `getPropertySuggestions(files, entity, field): string[]` derives suggestions from cached matching entity notes.
- `saveInlineProperty(app, path, expectedHash, field, value): Promise<WriteResult>` validates field-specific values and changes one frontmatter field.

- [x] Write tests: title-only creation, filename collisions, empty/missing directory rejection, reference preservation, full-path link serialization, association changes independent of processing state, stale singular-link removal, unresolved-link retention, linked-without-target rejection, unsupported/blank scalar rejection, empty tags, the two-goal invariant, and stale-hash rejection with no write.
- [x] Run `npm test -- tests/writes/inbox-writes.test.ts tests/writes/inline-properties.test.ts`; expect the new behavior to fail before implementation.
- [x] Implement writes using YAML serialization and the existing protected helper. Validate the expected hash captured on editor opening, rather than replacing it at submit time.
- [x] Run focused write tests and the existing write suite; expect PASS.
- [x] Commit: `feat: protect inbox associations and inline property writes`.

## Task 3: Capture, association, and property editor components

**Files:** Create `src/ui/modals/inbox-capture-modal.ts`, `src/ui/modals/inbox-associations-modal.ts`, `src/ui/components/association-picker.ts`, `src/ui/components/property-editor.ts`, and `src/ui/components/property-button.ts`; extend `src/ui/modals/form-fields.ts`, `styles.css`; add DOM test helpers and tests under `tests/ui/`.

**Interfaces:**
- `CaptureContext` carries optional project/problem defaults; the capture modal accepts mode, context, cached candidates, and a submit callback.
- Association pickers expose selected raw links, show resolved paths, preserve unresolved selections, and support searchable multiple selection.
- `openPropertyEditor(anchor, options)` provides scalar, tags, and multiline text modes, with cached suggestions and an async save callback.
- `renderPropertyButton(container, options)` renders an accessible, individually labeled trigger with a stable focus identity.

- [x] Add test-only DOM support. Write real component tests for title-only capture, reference selection, context defaults, multi-association changes, unresolved chips, single-field invocation, custom values, empty tags, Escape/outside cancellation, save failures retaining input, focus restoration, keyboard navigation, and narrow-screen dialog behavior.
- [x] Run the new component tests; expect failures before implementing the components.
- [x] Implement components with readable labels, bounded candidate result lists, and local validation. Capture and association dialogs close only after successful saves. Property editors retain entered values on errors and apply no write on cancellation.
- [x] Run component tests and type checking; expect PASS.
- [x] Commit: `feat: add capture and inline property editors`.

## Task 4: Persistent shell and complete workbench flows

**Files:** Modify `src/ui/workbench-view.ts`, `src/model/view-state.ts`, `src/ui/components/workbench-shell.ts`, `main-header.ts`, `project-sidebar.ts`, `problem-row.ts`, `pending-inbox.ts`, `focus-panel.ts`, `src/ui/panels/inbox-panel.ts`, `goals-panel.ts`, and `src/main.ts`; add or extend view/DOM integration tests.

**Interfaces:**
- Render context accepts a nullable project snapshot and a global Inbox collection.
- View state adds Inbox view/kind/association filters; global navigation clears association filters, while contextual material actions apply a visible filter.
- Actions expose global/context capture, reference capture, real association editing, source opening, Inbox filtering, and field-specific property editing.
- The view captures content hashes at editor opening, uses Task 2 writes, and invalidates affected cached files after successful writes.

- [ ] Write integration tests: global Inbox and capture remain available with no projects; the shared header remains present on every panel; global/project/problem contexts set correct defaults; association and state updates refresh correct lists; each status/stage/tag trigger does not open the row's note; custom values update only their field; cached search and scope-excluded events cause no unrelated reads.
- [ ] Run those tests and observe the expected failure of the current project-dependent flow.
- [ ] Connect the model, writes, and components. Show a configured-directory prompt instead of creating fallback folders. Add command-palette access and keep existing command IDs usable. Render project material summaries and problem-filtered Inbox links, and expose inline project status/goals and problem status/stage/role/tags.
- [ ] Run all UI/model/write tests and type checking; expect PASS.
- [ ] Commit: `feat: connect global inbox and direct property editing`.

## Task 5: End-to-end verification and delivery

**Files:** Update generic demo fixtures, both test-vault bundles, and README usage instructions; add any missing integration coverage.

- [ ] Exercise the real components in a browser preview on wide and narrow layouts: uncategorized capture, reference capture, multi-problem linking, pending/processed navigation, and scalar/tag/goal editing. Inspect clipping, focus, and readable labels.
- [ ] Run `npm run check`, synchronize the two test-vault plugin bundles, run `node scripts/check-device-configs.mjs --vault test-vault`, and run `git diff --check`. Expect all checks to pass.
- [ ] Commit documentation/fixture changes with an English message and perform the Native workflow's independent final review. Address important findings with failing regression tests before changes and rerun the suite.
- [ ] Report actual verification results and remaining limitations. Keep the feature in the development worktree for review.
