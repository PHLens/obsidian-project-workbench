# Focus Ordering and Workbench UI Containment

> **For agentic workers:** Use Native execution with superpowers:executing-plans and regression tests before implementation.

**Goal:** Keep focused problems first and contain titles, controls, and actions within their owning cards and panes.

**Architecture:** Apply a stable Focus-first display ordering without mutating model order. Give card actions explicit layout containers, reset control geometry inside plugin-owned surfaces, and use pane-container breakpoints in addition to viewport fallbacks.

## Constraints

- Preserve note content, user font/theme preferences, Inbox semantics, and configured directory boundaries.
- Keep order stable within focused and non-focused groups, including filtered views.
- Long content must wrap or have an intentional readable truncation; interactive targets must remain inside their owning region.
- Generic examples and English development metadata are required. Local compatibility styles remain outside the repository.

## Task 1: Focus display order

- [x] Write failing actual-component tests for Focus-first stable ordering and unmodified source order, plus path-based Focus toggling.
- [x] Implement display partitioning and compatible Focus link updates; run the focused tests and type checking.

## Task 2: Containment and theme geometry

- [x] Reproduce title overflow, touching actions, task/title growth, row-action overlap, and narrow-pane clipping in a browser with native button geometry and long fixtures.
- [x] Add explicit action wrappers, shrink/wrap rules, plugin-scoped button geometry, and container-based layouts; preserve full titles through wrapping or tooltips.
- [x] Verify card/control/text bounds at wide, medium, split-pane, and mobile sizes with normal and enlarged fonts.

## Task 3: Verification and local handoff

- [x] Run all tests, type checking/build, browser regressions, device consistency, privacy and diff checks, and Native final review.
- [x] Back up and install only the plugin's runtime assets in both local device configurations. Preserve settings, notes, and unrelated plugins.
