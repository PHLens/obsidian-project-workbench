# Adjustable Columns and Layered Problem Cards Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for Native execution. Steps use checkbox tracking.

**Goal:** Provide adjustable, persistent side columns and layered problem cards with complete Next Step previews.

**Architecture:** Derive structured Next Step entries from cached Markdown while retaining existing string arrays. A small column controller owns geometry, drawers, events, and cleanup; the view and plugin connect it to settings without reloading data. Cards render structured previews and preserve expansion state separately from note data.

**Tech Stack:** TypeScript, native DOM/CSS and Pointer Events, Obsidian settings, Vitest/happy-dom, browser compatibility checks.

**Spec:** docs/superpowers/specs/2026-11-24-adjustable-layout-and-problem-cards-design.md

## Global Constraints

- Preserve configured-directory boundaries, notes, frontmatter, and existing task identifiers.
- Keep title, overview, properties, and Next Step distinct; retain stable Focus-first ordering.
- Store layout preferences in local data.json; keep directory defaults empty and development metadata in English.
- Layout-only interaction must not reread Markdown, rebuild snapshots, or replace card/editor DOM.
- Support pane-based responsiveness, keyboard operation, enlarged fonts, and view lifecycle cleanup.
- Next Step is read-only; retain existing nextSteps string-array consumers.

## Review Focus

- Resizing or closing a view during pointer capture releases handlers and pending animation frames.
- Property drafts and IME composition survive layout changes and settings propagation.
- Multiple views receive layout changes while settings writes retain unrelated values.
- Fenced syntax, CRLF, nesting, and following sections do not corrupt Next Step extraction or source targeting.
- Expanded lists survive ordinary refreshes; project changes and deleted problems release stale state.

## File Responsibilities

- Create src/model/next-steps.ts for section extraction and structured list entries.
- Modify src/model/types.ts and project-snapshot.ts for additive preview data and independent overview extraction.
- Modify src/ui/search/workbench-search.ts for default Next Step search.
- Create src/ui/column-layout.ts for normalized preferences, effective widths, and a DOM controller.
- Modify settings-model.ts, settings.ts, main.ts, and workbench-view.ts for settings, propagation, lifecycle, and source navigation.
- Modify main-header.ts and workbench-shell.ts for persistent column controls and separators.
- Modify problem-row.ts and problem-table.ts for layered cards, preview expansion, and footer actions.
- Modify styles.css, README.md, and generic fixtures for responsive behavior and documentation.

### Task 1: Complete Next Step models and search

**Interfaces**

- Produce NextStepItem { text: string; completed?: boolean; depth: number; line: number }.
- Produce readNextSteps(note: Note): { items: NextStepItem[]; heading?: string; line?: number } and problemOverview(note: Note): string | undefined.
- Extend ProblemSummary with optional nextStepItems and nextStepHeading; keep nextSteps: string[].
- Snapshot builders populate both representations from the same extraction. Default search includes all entries.

- [ ] Write tests/model/next-steps.test.ts against real snapshots: three checklist entries retain order and completion; plain/numbered/nested entries and continuations survive; fenced syntax and a later section are excluded; CRLF line offsets remain accurate; summary uses overview prose rather than an action.
- [ ] Add search assertions for an action after the first entry, plus the existing full-text boundary.
- [ ] Run npm test -- tests/model/next-steps.test.ts and observe the existing first-entry extraction failure.
- [ ] Implement the additive model, bounded line-based parsing, overview derivation, and both search consumers.
- [ ] Run the targeted tests and npm run typecheck. Expect all passing.
- [ ] Commit with an English message and record the command/result in the ledger.

### Task 2: Column geometry and controller

**Interfaces**

- Produce ColumnPreferences { leftWidth: number; rightWidth: number; leftCollapsed: boolean; rightCollapsed: boolean; focusMode: boolean }.
- Produce normalizeColumnPreferences(value: unknown): ColumnPreferences and fitColumns(width: number, preferences: ColumnPreferences, hasRight: boolean): { left: number; right: number; narrow: boolean }.
- Defaults are left 220px, right 300px, both visible, focus mode off. Start with side limits 150–360px and 190–480px, 360px central minimum, 8px separators, and an 840px narrow threshold.
- Produce attachColumnLayout(root: HTMLElement, preferences: ColumnPreferences, commit: (value: ColumnPreferences) => void): { update(value: ColumnPreferences): void; dispose(): void }.
- Controller consumes data-column-toggle, data-column-close, data-column-resize, and named sidebar/main/rail elements in the shell.

- [ ] Write tests/ui/column-layout.test.ts with independent expected geometry for wide/constrained/hidden columns and invalid preferences.
- [ ] Add actual DOM tests for independent collapse, focus restoration, keyboard resize/default reset, pointer-release persistence, cancellation/cleanup, and narrow drawer Escape/outside/focus behavior.
- [ ] Run npm test -- tests/ui/column-layout.test.ts; confirm the missing behavior.
- [ ] Implement constrained effective widths, native controls, animation-frame drag updates, local drawers, resize observation, and cleanup.
- [ ] Run targeted tests and npm run typecheck. Expect passing tests with saved requested widths unchanged by window constraints.
- [ ] Commit and ledger the result.

### Task 3: Settings and live view integration

**Interfaces**

- Add normalized columnLayout preferences to ResearchWorkbenchSettings.
- Extend ResearchWorkbenchView's constructor with an optional layout storage adapter containing preferences and save; existing two-argument construction remains valid.
- Add setColumnPreferences(value: ColumnPreferences): void for geometry-only updates.
- Plugin persists settings changes in order and propagates column preferences to other open views.
- Shell renders header controls, collapse controls, and separators; unavailable right-column controls are omitted.
- View owns and disposes the controller when a root is replaced or the view closes. An IME-preserved root retains its existing controller.

- [ ] Write tests/ui/column-integration.test.ts against the real view: controls exist, layout changes retain the same card/search/editor nodes, no additional reads or snapshot refresh occur, and preferences survive a reload through a local storage adapter.
- [ ] Cover two views sharing preferences and serial settings writes preserving directory values.
- [ ] Cover panel changes with no right rail, narrow-to-wide restoration, and close/rerender while a drag is pending.
- [ ] Run the integration tests and observe failures before wiring the shell and persistence.
- [ ] Implement the view/plugin adapter, ordered saves, settings normalization, live controls, and lifecycle management. Replace the former right-rail dropdown with the header controls.
- [ ] Run column, integration, existing refresh-performance, directory-settings, and composition tests plus type checking. Expect all passing.
- [ ] Commit and ledger the result.

### Task 4: Layered cards and source navigation

**Interfaces**

- Add expandedNextSteps: string[] to WorkbenchViewState, cleared on project selection and pruned against the current snapshot.
- Add actions for expansion-state updates without rerendering and targeted Next Step source navigation.
- renderProblemRow accepts the current expanded state and renders title/status, overview, property controls, up to three items, footer, and secondary actions.
- Source navigation targets the heading in the current note, falling back to opening the note if it has changed.

- [ ] Write tests/ui/problem-cards.test.ts for actual components: source states/order, three-item preview, expand/collapse without note opening, refresh/project/deletion state behavior, property actions, keyboard title/source access, and missing-list placeholders.
- [ ] Add a real-view test for source navigation to the live heading and the no-heading fallback, with exactly one targeted note read.
- [ ] Run the new tests and observe failures against the former table/summary behavior.
- [ ] Implement cards, read-only markers, footer actions, state retention, and guarded source navigation. Update scoped CSS for the column controller, drawers, and cards; preserve theme/font choices.
- [ ] Run the new tests, Focus/property/Inbox regressions, and type checking. Expect all passing.
- [ ] Commit and ledger the result.

### Task 5: Verification and local handoff

- [ ] Update README and generic fixtures with several checklist states and ordinary Next Step entries.
- [ ] Run npm run check and synchronize the desktop/mobile fixture bundles. Run scripts/check-device-configs.mjs --vault test-vault and git diff --check. Expect passing tests/build and identical bundles.
- [ ] Exercise actual components in a browser at wide, split-pane, 390px, and 320px widths with enlarged fonts. Check both separators, drawers, selection, expansion, and action containment.
- [ ] Run one fresh whole-branch review covering the Review Focus cases. Address material findings with regression tests and a green full suite.
- [ ] Preserve verification evidence outside the plan scratch directory. Back up the local plugin, install only its runtime assets into both authorized configurations, and verify hashes against a vault baseline.
- [ ] Commit the final documentation/fixtures, record the verified state, and remove only this plan's completed scratch directory.
