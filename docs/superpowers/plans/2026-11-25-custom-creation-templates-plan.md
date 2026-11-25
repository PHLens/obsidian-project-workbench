# Custom Creation Templates Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for Native execution. Steps use checkbox tracking.

**Goal:** Let users configure Vault-relative Markdown templates for projects, problems, tasks, papers, ideas, and notes, with strict scalar substitution and safe required-field patches.

**Architecture:** Add a pure template renderer for path validation, variable substitution, and rendered-frontmatter validation. Thread a template-path map through settings and the creation write functions; each write reads its template at submit time, renders it, applies controlled metadata, and preserves custom fields/body. Keep templates outside background data loading.

**Tech Stack:** TypeScript, YAML, Obsidian Vault APIs, Vitest, happy-dom.

**Spec:** docs/superpowers/specs/2026-11-25-custom-creation-templates-design.md

## Global Constraints

- Template paths are Vault-relative Markdown paths and cannot escape the Vault or enter `.obsidian`.
- Empty template paths use existing built-in templates.
- Template reads are explicit creation-time reads and never enter snapshots, search, watchers, or release bundles.
- Required fields and protected associations are controlled by creation flows; custom frontmatter and body content remain intact.
- Existing settings, notes, directory scopes, column preferences, and other plugin data remain compatible.
- Unknown variables, malformed braces, missing files, unreadable files, and invalid YAML stop creation before any file is created.

## Review Focus

- Template frontmatter with duplicate keys, scalar/array values, CRLF, Unicode, and no frontmatter remains valid and preserves body content.
- A template file inside a configured data directory is read explicitly but does not become an indexed record or watcher-triggered refresh source.
- Project bundle failures leave neither the project nor first problem file, including template read and YAML failures.
- Template values containing quotes, wikilinks, newlines, or Markdown punctuation do not corrupt controlled metadata.
- Partial or malformed saved settings preserve directory and column preferences and fall back to empty template paths.

## File Responsibilities

- Create `src/ui/template-renderer.ts` for normalized template paths, variables, render validation, and targeted reads.
- Modify `src/ui/settings-model.ts`, `src/ui/settings.ts`, and `src/main.ts` for template path settings, load normalization, and persistence.
- Modify `src/ui/vault-writes.ts` and `src/ui/inbox-writes.ts` for template-aware project/problem/task/Inbox creation.
- Modify `src/ui/workbench-view.ts` to pass settings template paths to all creation flows.
- Modify generic README and fixtures with template examples and paths.
- Add focused model/write/settings/integration tests; update existing expectations for defaults.

### Task 1: Template renderer and settings model

**Interfaces**

- Produce `TemplateType = 'project' | 'problem' | 'task' | 'paper' | 'idea' | 'note'`.
- Produce `TemplatePaths = Record<TemplateType, string>` and `DEFAULT_TEMPLATE_PATHS` with empty values.
- Produce `normalizeTemplatePaths(value: unknown): TemplatePaths`.
- Produce `validateTemplatePath(path: string): void` and `renderTemplate(raw: string, variables: Record<string, string>): string`.
- Produce `readTemplate(app: App, path: string, variables: Record<string, string>): Promise<string>` with targeted Vault reads and rendered YAML validation.

- [x] Write `tests/ui/template-renderer.test.ts`: empty/default paths, valid relative paths, absolute/parent/.obsidian rejection, all variables, missing optional variables, unknown/malformed variables, quoted Unicode/newline values, YAML validation, and one targeted read.
- [x] Extend settings tests for partial/malformed template maps and preservation of data scope/column settings.
- [x] Run the focused tests and observe missing renderer/settings behavior.
- [x] Implement the pure renderer and settings normalization without touching creation flows.
- [x] Run focused tests and type checking. Expect all passing.
- [x] Commit with an English message and record evidence in the ledger.

### Task 2: Template-aware creation writes

**Interfaces**

- Extend creation options with `templatePaths?: Partial<TemplatePaths>` and typed variable contexts.
- `createProjectBundle` renders project and problem templates independently, applies required metadata, and retains rollback behavior.
- `createProblemForProject`, task creation, and `createInboxEntry` select `problem`, `task`, or `paper`/`idea`/`note` templates respectively.

- [ ] Write `tests/writes/custom-templates.test.ts`: custom project/problem bundle fields and body, custom problem association, task metadata, each Inbox kind, empty-path built-ins, collisions, and template failures before file creation.
- [ ] Add rollback assertions when the second project template or second file creation fails.
- [ ] Run the focused write tests and observe failures against hardcoded creation text.
- [ ] Implement template reads/rendering and controlled frontmatter patches while preserving current paths and rollback.
- [ ] Run write tests, existing CRUD/Inbox tests, and type checking. Expect all passing.
- [ ] Commit and record evidence.

### Task 3: Settings UI and view integration

**Interfaces**

- Add six template path settings under a `Templates` heading, with relative-path and empty-fallback descriptions.
- Plugin loads normalized template paths and passes them to every `ResearchWorkbenchView`.
- `ResearchWorkbenchView` passes the correct template type to project wizard, problem modal, task modal, and Inbox capture callbacks.
- Settings saves preserve directory and column settings and do not invalidate snapshots for template-only changes.

- [ ] Write `tests/ui/template-settings.test.ts`: six labels/keys, save round-trip, malformed input normalization, and preservation of existing settings.
- [ ] Write `tests/ui/template-integration.test.ts`: actual view creation callbacks select the right type, template files are read only on submit, and template paths do not cause background refreshes.
- [ ] Run the focused integration tests and observe missing settings/view wiring.
- [ ] Implement settings UI, plugin normalization, view adapters, and error notices.
- [ ] Run focused tests plus refresh-performance, directory-settings, Inbox, and column tests. Expect all passing.
- [ ] Commit and record evidence.

### Task 4: Documentation, full verification, and local handoff

- [ ] Update README with the six settings, variable table, relative-path rules, example template directory, and empty-path fallback. Keep examples generic.
- [ ] Add generic template fixtures under `test-vault/Templates` only if needed by integration tests; verify they are excluded from data scope and device bundles.
- [ ] Run `npm run check`, device consistency, privacy scans, and diff checks. Expect type checking/build and the full suite to pass.
- [ ] Verify release bundles contain no personal paths, template fixture content, or test-only imports.
- [ ] Run final review against Review Focus, address material findings with failing regressions and a green suite.
- [ ] Back up and install only `main.js`, `manifest.json`, and `styles.css` into both local device configurations. Preserve data/settings/notes/other plugins and verify full-vault hashes.
- [ ] Preserve verification evidence, update the ledger, commit final docs/fixtures, and remove only this plan's completed scratch directory.
