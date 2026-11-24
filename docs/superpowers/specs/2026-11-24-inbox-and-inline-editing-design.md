# Inbox Capture, Associations, and Inline Property Editing

## Purpose

Make research capture available throughout the workbench, support collecting material before choosing a project, and let people edit visible properties at the point where they are displayed. Markdown remains the source of truth, and all background loading stays within the configured data directories.

## Outcomes

- The global Inbox works with no selected project and with no project notes present.
- People can create a paper, idea, or note entry and can add a reference to an existing vault note.
- Entries can be associated with multiple projects and research problems during capture or later.
- Project and problem views expose their related material and provide contextual capture actions.
- Clicking an editable property opens a field-specific selector or editor that accepts existing and custom values.
- Recording or updating an item does not cause unrelated vault files to be read.

## Approaches

1. Add more creation buttons while retaining the current project-scoped Inbox. This improves discoverability but cannot support uncategorized collection or a useful Inbox before the first project exists.
2. Introduce a global Inbox model alongside project-scoped projections, and share lightweight property editors across the workbench. This is the selected approach: it supports collection and later organization while preserving the existing Markdown model and directory boundaries.
3. Build a separate library/database and a general property-management interface. This adds another state store and broad configuration work without being necessary for capture or field editing.

## Capture and Navigation

The shared workbench header and Inbox page provide an **Add to Inbox** action. It remains available in project, goals, records, project-note, and Inbox panels. The command palette exposes the same capture flow. The project right rail also provides capture, and each problem row provides **Add material** and **View material** actions.

The Inbox page provides two explicit entry points:

- **New entry**: create a paper, idea, or note record.
- **Add existing note**: select an existing Markdown note and create an Inbox reference to it.

New-entry fields are title (required), kind (paper/idea/note), content or short summary (optional), source URL or note reference (optional), project associations (optional), and problem associations (optional). A title alone is sufficient for quick capture. The existing idea-capture command opens this flow with the idea kind selected.

Global capture begins with no project or problem selected. Capture from a project defaults to that project. Capture from a problem defaults to that problem and its current project context. Defaults remain visible and editable before saving.

Selecting an existing note creates a reference entry in the first configured input directory. The original note is neither copied nor enrolled by editing its frontmatter. The selection uses Obsidian's existing file metadata, and opening or selecting a source may perform a targeted read. The source's directory is not added to background watching.

The shared shell must render navigation and the Inbox independently of the existence of a project snapshot. Project-dependent panels show a clear empty state when no project is available; capture and the global Inbox remain usable when the input directory is configured.

## Inbox Views and Item Actions

The default Inbox view lists pending entries across configured input directories. Additional views expose processed entries and all entries. Existing processing states remain `pending`, `linked`, `deferred`, and `reference`. Search and kind/association filters operate on cached entries.

Each entry shows its title, kind, short summary when available, processing state, source, and project/problem association chips. Its actions are open entry, open source, edit associations, and change processing state.

Association editing uses searchable project/problem pickers with multiple selections and visible removable chips. Existing associations are preselected. Candidate lists contain only projects and problems from their configured directories. Show paths to distinguish duplicate titles. Archived or unresolved existing links remain visible and can be removed explicitly; they are not silently discarded.

Association editing preserves the current processing state. **Mark linked** requires at least one valid project or problem association and opens association selection if none exists. A processing-state change can remove an item from the pending view, but the item remains accessible in processed/all views.

Project views show entries directly associated with that project or any problem in its existing problem scope. Problem views show entries directly associated with that problem. Use the existing project/problem membership model; adding an input association does not change the project's problem membership.

**View material** on a problem opens the Inbox with that problem selected as an association filter; it does not replace the existing open-problem-note action. A visible filter chip can be cleared to return to the global list. The project right rail keeps showing that project's pending entries and links to the same filtered Inbox. The shared Inbox navigation item always opens the global list.

## Markdown Representation and Compatibility

New entries are created in the first configured input directory, using a sanitized title and a collision-safe suffix when necessary. Existing files are never overwritten by capture.

New records use the following conceptual fields:

```yaml
type: inbox
title: Example reading note
input_kind: paper
pending: true
processing_status: pending
projects: []
problems: []
source: ""
```

The Markdown body holds the entered content. `source` stores either a URL or a vault-relative wikilink to the referenced note. Association lists store full vault-relative wikilinks to disambiguate equal basenames.

Reading supports existing `type: idea` entries and existing enrollment markers (`pending`, `processing_status`, `review_status`, and the pending-discussion tag). Recognized processing states remain indexed even after `pending` becomes false. Legacy singular `project` and new plural `projects` links are combined when deriving associations. Existing scalar or array problem links are accepted.

When an association edit is saved, normalize that entry's project associations into `projects` and remove its legacy `project` field so that removing an association cannot leave a stale singular link. Other fields and body content are preserved. Other entries are not migrated.

Explicit `processing_status` takes precedence over older pending markers when deriving the processing view. Unknown legacy processing values remain visible in the all-items view and are preserved until edited. Merely opening the workbench writes nothing.

## Inline Property Editing

Each editable badge or value is an independent keyboard-accessible button. Clicking it opens an editor for that field and suppresses the surrounding row's open-note action.

| Surface | Field | Interaction |
| --- | --- | --- |
| Problem row | `status` | Searchable single-value picker with custom input |
| Problem row | `stage` | Searchable single-value picker with custom input |
| Problem row | `research_role` | Searchable single-value picker with custom input |
| Problem row | `tags` | Multi-value picker with add/remove and custom tags |
| Project header | `status` | Searchable single-value picker with custom input |
| Project header / goals panel | `current_gate` | Field-specific text editor |
| Project header / goals panel | `next_milestone` | Field-specific text editor |

The record-type marker, such as `problem`, remains a labeled type indicator. Actual frontmatter tags are displayed as a separate editable field; type and tags have distinct visual treatment and accessible labels. This change does not expose editing of the record's `type` or file identity.

Picker suggestions combine known choices with distinct existing values from the configured directory for that entity type. The current value is always available, including custom values. Suggestions and filtering use the loaded cache. New custom values are saved on the selected note and become available in later suggestions; no separate schema registry is introduced.

Selecting an option saves that single field. Enter confirms a custom scalar/tag value, Escape cancels, and clicking outside cancels unapplied input. Scalar status/stage/role inputs reject blank strings. Tags may be empty. Goal text supports an explicit save/cancel action and multiline input; clearing one goal field retains the existing rule that at least one of the two goal fields must remain nonempty.

Only one field editor is open at a time. Keep its position within the visible workbench and use a field-specific dialog on a narrow/mobile surface when there is insufficient room. Closing it restores focus to the trigger. A failed save retains the entered value and displays the error.

## Write Boundaries and Freshness

Property editors capture the original note content hash when opening. Saves compare against that original hash through the existing protected write helper. A conflict does not overwrite external changes, silently refresh the expected hash, or close the editor as though the save succeeded.

Capture, association, and property writes target only the note being created or edited. The UI derives reverse project/problem material lists from entry links; associating material does not rewrite every linked project/problem note.

After a successful write, invalidate the affected cached entry/note and update derived views while preserving the active panel, search text, and selection. Coalesce the plugin's write notification with vault events. Navigation, suggestion filtering, and opening a field picker never reread the entire vault.

## Directory Configuration and Privacy

Global Inbox means all configured input directories, not all Markdown in the vault. Input loading and event filtering stay bounded by the existing data scope. External source notes are read only through explicit targeted actions.

If the input directory is empty or missing, display a configuration prompt and do not create a fallback folder. Project/problem association remains optional if those categories have no configured directories. User directory choices remain in local `data.json`; examples, tests, commits, and development documentation use generic names and English descriptions.

## Acceptance Evidence

- Capture works from the shared header, Inbox, project context, problem context, and command palette, including an empty-project vault.
- A title-only uncategorized item appears in the global Inbox and can later be linked to multiple problems.
- Referencing an existing note creates one input entry, preserves the original source, and adds no background reads outside data scope.
- Pending and processed views retain entries across processing-state changes; association and processing status remain independent.
- Legacy project links, processed entries, duplicate basenames, and unresolved associations remain understandable and editable.
- Project/problem material projections update correctly after links are added or removed.
- Clicking each editable property invokes only its own editor; cancellation performs no write, custom values round-trip, and unrelated fields/body remain unchanged.
- Conflict, missing-file, failed-write, duplicate-title, and empty-directory cases retain user input and do not corrupt existing notes.
- Keyboard behavior and narrow/mobile rendering are verified against actual components; scoped-read tests measure the real view/model behavior.
- Type checking, the full test suite, production build, and desktop/mobile bundle checks pass before delivery.

## Implementation Discretion

The implementation may choose the smallest module split that keeps global Inbox indexing, protected writes, shared property editors, and component rendering testable. It may add test-only DOM support where required. Visual spacing and icon choices should follow the existing workbench style. Adding a database, broadening configured directory scopes, and changing note identity are outside this design.
