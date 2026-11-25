# Custom Creation Templates

## Purpose

Allow each created record type to start from a user-maintained Markdown template while preserving the existing data scope, protected associations, and local settings model.

## Outcomes

- Configure a Vault-relative Markdown template path for projects, problems, tasks, papers, ideas, and notes.
- Use the configured template only when creating that type. Empty paths retain the current built-in template.
- Replace documented scalar variables with creation context, then apply required frontmatter fields without discarding custom template fields or body sections.
- Read templates on demand without indexing or watching template files in the background.
- Keep template errors visible and actionable; never silently create a malformed note.

## Approach

Use one shared template renderer and a per-type path map in the existing Obsidian `data.json` settings. Each creation function supplies a typed context, reads its configured template through a targeted Vault read, performs strict scalar substitution, and applies the existing required frontmatter/association patch before creating the note. This keeps template behavior consistent across project bundles, problem creation, tasks, and Inbox paper/idea/note capture.

Template paths are Vault-relative Markdown paths. They cannot be absolute, escape the Vault, enter `.obsidian`, or point outside the configured template file. Template files are not part of any data directory and are never included in snapshots, search, event watching, or generated context exports.

## Supported Types and Settings

Add `templatePaths` to the plugin settings with these keys:

- `project`
- `problem`
- `task`
- `paper`
- `idea`
- `note`

The settings UI presents one text field per type, with a description explaining that the path is relative to the Vault and must end in `.md`. Empty values use built-in templates. Existing settings load safely when the new map is absent or contains malformed values; invalid entries are treated as empty and reported when the settings screen is displayed.

## Variables

Templates support these exact scalar variables. Replacement is literal and single-pass; unknown variables and malformed braces are errors.

| Variable | Meaning |
| --- | --- |
| `{{title}}` | New record title or safe display name |
| `{{name}}` | Project name when creating a project |
| `{{goal}}` | Project goal |
| `{{question}}` | Problem question/overview |
| `{{content}}` | Captured paper, idea, or note content |
| `{{kind}}` | `paper`, `idea`, or `note` |
| `{{date}}` | Local creation date as `YYYY-MM-DD` |
| `{{project}}` | Display title of the associated project |
| `{{projectPath}}` | Vault-relative project path without a leading slash |
| `{{problem}}` | Display title of the associated problem |
| `{{problemPath}}` | Vault-relative problem path without a leading slash |
| `{{source}}` | Captured source URL or source wikilink |
| `{{status}}` | Initial status |
| `{{stage}}` | Initial stage |
| `{{researchRole}}` | Initial research role |

Missing optional values become empty strings. Values containing Markdown or YAML punctuation are inserted as text; templates should quote variables used as YAML scalars. The renderer does not evaluate code, expressions, loops, includes, or nested templates.

## Rendering and Required Fields

The renderer returns Markdown text and metadata about the source template. It validates the rendered output before creation:

- A template must be readable and produce valid Markdown text.
- If frontmatter is present, it must parse as a YAML object.
- Unknown variables, invalid template paths, missing template files, read failures, and YAML parse failures stop creation with a message naming the type and path.

After rendering, each creation flow applies required fields while preserving all other frontmatter and body content:

- Project: `type: project`, title/name, status and goal context, problem and focus links.
- Problem: `type: problem`, project link, initial status/stage/role, and the project association update.
- Task: task status, task tag, and project link.
- Paper/idea/note: `type: inbox`, title, `input_kind`, pending/processing state, associations, and source.

Template frontmatter values for fields controlled by the creation flow are replaced with the actual submitted context. Custom fields remain untouched. Existing collision checks and project-bundle rollback behavior remain in force. A template cannot change the destination directory or filename; those continue to derive from the configured data directories and submitted title.

For a project bundle, project and first-problem templates are rendered independently. If either template fails or either file creation fails, no partial record remains. Problem creation continues to update the project association with the existing protected write and rolls back the new problem if that update fails.

## Error and Compatibility Behavior

- Empty template path: built-in behavior.
- Missing or invalid configured template: show an error before any file is created.
- Template source changed while a modal is open: the creation uses the content read at submit time; no stale template is cached.
- Template path is itself within a configured data directory: it remains excluded from background indexing only by its file type/content rules; template reads are explicit and are not treated as a project/problem/input record unless the user separately stores a record-shaped copy in a configured directory.
- Existing notes and existing `data.json` values remain unchanged. No migration writes template paths or changes existing files.

## Verification

- Unit tests cover variable substitution, unknown variables, malformed braces, YAML parsing, path validation, missing templates, and empty-path built-ins.
- Write tests cover each type's required-field patch, custom frontmatter/body preservation, project-bundle rollback, collision handling, and template read timing.
- Settings tests cover malformed/partial maps, all six path fields, save/load round trips, and preservation of directory and column settings.
- Integration tests assert template files are read only at creation, excluded from snapshot reads and watchers, and never bundled with release assets.
- Run type checking, the full test suite, production build, device-config consistency, privacy scans, and diff checks before local installation.

## Implementation Discretion

The renderer's module split, settings descriptions, exact built-in template constants, and modal error presentation remain implementation choices. The variable names, path boundaries, required-field ownership, and no-background-read behavior above are fixed.
