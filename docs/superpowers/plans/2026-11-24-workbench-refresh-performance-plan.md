# Workbench Refresh Performance Plan

> **For agentic workers:** Use Native execution with superpowers:executing-plans and regression tests before implementation.

**Goal:** Remove repeated YAML work and unnecessary redraws from note-edit and background-view refreshes.

**Architecture:** Reuse parsed notes while their content is unchanged, narrow project indexing before parsing, debounce event bursts with a bounded maximum delay, and defer background work until the view becomes visible. Preserve search focus and selection across necessary redraws.

**Constraints:** Preserve Inbox review semantics, configured directory boundaries, protected writes, and local settings. Use generic fixtures and English development metadata. Measurements on personal vault data remain outside the repository.

## Review Focus

- Content or path changes must invalidate parsed results; timestamps must remain fresh without reparsing unchanged YAML.
- Continuous events must eventually refresh, while close/dispose cancels scheduled work.
- Hidden views must defer data work and refresh on visibility changes; reopening must not duplicate subscriptions.
- Search redraws must preserve typing focus and caret without stealing focus from another editor.
- Model timing comparisons must use the same workload and distinguish warm refreshes from cold initialization.

## Task 1: Parsed note reuse

- [x] Add failing parser-count and freshness regressions using the real parser, plus out-of-scope indexing coverage.
- [x] Cache parsed notes by source identity/content and filter configured project paths before parsing; verify model compatibility and before/after measurements.
- [x] Commit the tested model optimization.

## Task 2: Refresh lifecycle and interaction

- [ ] Add failing trailing-debounce/max-delay, hidden-view, close/reopen, and search-caret tests.
- [ ] Coalesce event bursts, clean subscriptions on close, defer invisible-view refreshes, and preserve search focus/selection and scroll.
- [ ] Run type checking, UI/model tests, and the full suite; commit the tested refresh changes.

## Task 3: Validation and local testing

- [ ] Measure the same scoped data and representative browser editing flows, keeping private data outside the repo.
- [ ] Complete Native final review, full checks, bundle consistency, and privacy scans.
- [ ] Back up and replace only this plugin's desktop/mobile runtime assets; preserve settings and all unrelated vault files.
