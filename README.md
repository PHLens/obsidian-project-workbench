# Obsidian Project Workbench

Project Workbench is a mobile-compatible Obsidian plugin for project planning, research tracking, and progress review. It keeps Markdown as the source of truth and provides a visual workbench for projects, problems, tasks, notes, and explicitly pending inputs.

## Preview

![Project Workbench desktop preview](docs/assets/project-workbench-preview.svg)

The preview shows the intended three-column workbench: project navigation on the left, the active project and problem list in the center, and focus/timeline/inbox context on the right.

The initial release uses a research-editorial layout:

- left project and navigation sidebar;
- center project summary and problem table;
- right focus panel, timeline, related tasks, and pending inbox;
- responsive stacked layout for narrow screens;
- search, full-text opt-in, multi-select filters, and archived-item toggle;
- create, edit, associate, focus, archive, and open actions;
- conflict-aware Markdown frontmatter writes.

## Data model

Project Workbench reads existing Markdown files. It does not create a database or a second project-state store.

- Projects: `type: project`, `status`, `problems`, `focus_problems`, `current_gate`, `next_milestone`.
- Problems: `type: problem`, `status`, `stage`, `research_role`, `up`, and the `## Next Step` section.
- Tasks: TaskNotes-compatible `status`, `priority`, `due`, `projects`, and `tags` fields.
- Pending inputs: `pending: true` and `processing_status` (`pending`, `linked`, `deferred`, or `reference`).

Existing values are preserved when read. The plugin does not batch-migrate or rename existing notes.

## Development and test Vault

All development is performed in the repository's `test-vault/`. The fixture is intentionally generic and contains a Demo Project; it is safe to reset or delete.

```bash
npm install
npm test
npm run typecheck
npm run build
node scripts/check-device-configs.mjs --vault test-vault
```

The test fixture contains separate `.obsidian-desktop` and `.obsidian-mobile` configurations. Both configurations must contain the same plugin bundle and manifest. The checker compares their bundle hashes.

To try the plugin in Obsidian:

1. Open `test-vault` as a Vault.
2. Install or copy the same `main.js`, `manifest.json`, and `styles.css` into the plugin directory for the active device configuration.
3. Enable **Project Workbench** in Community Plugins.
4. In **Project Workbench → Data scope**, configure `Projects`, `Problems`, `Tasks`, `Inputs`, and `Records` for the respective directory fields.
5. Run **Open project workbench** from the command palette, select a project, and try the create/edit, focus, filter, and association actions.

## Directory configuration

Directory lists are empty on first use. Configure the project, problem, task, pending-input, and progress-record directories in the plugin settings. Paths are relative to the vault; multiple directories are separated by commas, and subdirectories are included. New notes are created in the first configured directory for their type. Empty lists disable that data category.

The workbench reads Markdown only in the configured directories. Search and panel changes use the loaded snapshot; changes outside the configured directories do not schedule a reload.

Settings are stored by Obsidian in `<config-dir>/plugins/research-workbench/data.json`, where `<config-dir>` is the vault's active configuration directory. The same location applies to separate desktop and mobile configuration directories. Keep this file local to the vault; distribute only `main.js`, `manifest.json`, and `styles.css` when updating the plugin. Updates preserve existing settings.

## Build output

`npm run build` produces:

- `dist/main.js` — the Obsidian plugin bundle;
- `dist/cli/export-context.js` — the Node CLI context exporter.

Only the plugin entry bundle is intended for mobile Obsidian. The plugin bundle contains no Node.js or Electron imports.

## Optional formal Vault handoff

The formal Vault is never touched by ordinary tests or builds. Before a handoff, create a readonly baseline outside the Vault:

```bash
node scripts/verify-formal-vault-readonly.mjs \
  --vault /path/to/formal-vault \
  --write-baseline /path/to/backup/formal-baseline.json
```

After the baseline and a separate configuration backup exist, installation requires an explicit apply flag and the baseline:

```bash
node scripts/install-formal-vault.mjs \
  --repo /path/to/project-workbench \
  --vault /path/to/formal-vault \
  --formalVault /path/to/formal-vault \
  --backup /path/to/backup/project-workbench-install \
  --baseline /path/to/backup/formal-baseline.json \
  --apply true
```

The installer accepts the target Vault only when the user supplies it explicitly, requires `--apply true`, keeps backups outside the Vault, copies the same bundle to desktop and mobile configuration directories, and checks that non-target files retain their baseline hashes.

## Privacy and repository hygiene

Do not commit personal Vault content, absolute home-directory paths, usernames, local backups, generated bundles, or Obsidian workspace state. The repository's `.gitignore` excludes generated output and local backups. Replace `/path/to/...` placeholders with local paths only in shell commands; do not write those paths into tracked files.

## License

MIT License. See [LICENSE](LICENSE).
