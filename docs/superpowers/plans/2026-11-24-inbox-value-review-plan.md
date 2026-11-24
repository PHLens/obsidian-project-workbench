# Inbox Value Review and Attention Indicators

> **For agentic workers:** Use superpowers:executing-plans with Native execution and regression tests before implementation changes.

**Goal:** Define processing as value confirmation and organization, and expose the pending review backlog through persistent Inbox badges.

**Architecture:** Store `pending` and `processed` as independent review states. Derive global counts from the cached non-archived Inbox collection, while showing scoped counts in the Inbox panel and project rail.

**Spec:** `docs/superpowers/specs/2026-11-24-inbox-and-inline-editing-design.md`

## Global Constraints

- Pending means provisionally useful material whose value is not fully confirmed.
- Processed means value has been confirmed and the source organized for traceability.
- Project/problem associations and reading progress do not change review status.
- Processing requires explicit action; opening Inbox does not acknowledge or clear pending counts.
- Legacy association/reference/deferred labels do not establish confirmed value. Derive them as pending while preserving the stored note until an explicit edit.
- Read only configured directories and preserve local plugin settings and unrelated vault files during installation.

## Review Focus

- Existing linked entries must not be falsely classified as confirmed sources.
- A confirmed source may have no project/problem association and must retain source links and content.
- Global badges must not shrink when search, kind, or project filters narrow the visible list.
- Counts must update after state changes, capture, deletion, and archive changes without extra content reads.
- Badge navigation must show the actual pending list, clear stale filters, and remain available on narrow screens.

## Task 1: Value review semantics

- [x] Write failing model/write tests for explicit processed status, non-destructive legacy handling, association-independent completion, rejected unsupported status values, and preserved source content.
- [x] Observe the failures, implement canonical state handling and remove association-completion coupling, then run model/write tests and type checking.
- [x] Update the spec and README to describe value confirmation and traceability; commit with an English message.

## Task 2: Attention indicators and scoped counts

- [x] Write failing actual component/view tests for topbar and sidebar badges, scoped tab counts, zero/99+ display, non-archived global totals, filter-reset navigation, and counts surviving ordinary viewing.
- [x] Implement a shared Inbox notification/badge component, connect counts from cached data, and update the project rail's pending-material label/actions.
- [x] Run UI and full-suite checks and commit with an English message.

## Task 3: Browser checks and local testing handoff

- [ ] Verify wide/narrow browser flows, state-change count updates, and filter-independent global reminders.
- [ ] Run type checking, all tests, build, desktop/mobile bundle consistency, privacy checks, and diff checks; complete the Native final review.
- [ ] Back up and install only the plugin's three runtime assets in both local device configurations. Verify local `data.json` and all other vault files remain unchanged.
