# Adjustable Columns and Layered Problem Cards

## Purpose

Make the workbench adapt to the space available for navigation, active problems, and project context. Surface each problem's next actions as a readable list while preserving Markdown as the source of truth and keeping layout interactions independent of vault loading.

## Outcomes

- People resize the left navigation and right context columns by dragging the separators. The middle column uses the remaining space.
- Both side columns collapse independently and retain visible restore controls. A focus mode temporarily shows only the middle column.
- Problem cards have a consistent hierarchy: title and status, overview, editable properties, Next Step list, and footer actions.
- Multiple Next Step entries render correctly, including their original completion states and order.
- Layout preferences survive reopening the plugin without carrying personal directory settings into source control.

## Approaches

1. **Compact side-by-side rows.** Place problem information and Next Step in adjacent subcolumns. This exposes more content at wide widths, but requires an additional internal stacking transition and gives long titles and actions less horizontal space.
2. **Layered cards.** Stack the overview, properties, and Next Step inside each problem card. This is the adopted approach. It provides a stable reading order across different pane widths and makes individual actions easier to scan. It uses more vertical space, controlled through a short default preview and an expansion control.

The implementation extends the existing DOM and CSS architecture with native pointer and keyboard events. No layout framework or second data store is required.

## Column Interaction

The workbench header exposes navigation visibility, context-column visibility, and a problems-only focus mode. Header controls remain available when either side column is collapsed. Each visible side column also offers its own collapse control.

Two narrow separators divide the three columns. Dragging a separator changes its adjacent side column's requested width and gives the middle column the remaining space. Constraints keep controls readable and prevent horizontal overflow. The default requested widths remain 220 pixels for navigation and 300 pixels for context; the implementation may refine the exact minimum and maximum widths during visual verification. The middle column retains at least approximately 360 pixels in the desktop arrangement.

Separators support keyboard resizing with the arrow keys. Home or a double click restores that column's default width. Pointer cancellation, lost capture, view closure, and rerendering release all drag state and handlers.

Focus mode remembers the preceding side-column visibility and restores it when toggled off. Individual column controls remain usable while focused. Width preferences remain available when a column is restored.

The context column exists in the project workspace. Inbox, goals, records, the project note, and empty-project surfaces retain their current content and show navigation plus the main column. Their header omits unavailable context-column controls, and visiting them preserves the workspace's context visibility preference.

## Narrow Panes and Mobile

Responsive behavior follows the workbench pane width. Below the width required for readable desktop columns, the middle content occupies the pane and the side columns become drawers opened from the same header controls. Only one drawer opens at a time. Drawers have their own close control, close on Escape or an outside tap, and restore focus to their trigger.

The narrow arrangement does not expose drag handles. Returning to a wide pane restores the preferred widths and visibility; temporary responsive changes do not overwrite desktop preferences.

Cards, properties, actions, and long text wrap within their available width at normal and enlarged font sizes. Current theme and font choices continue to apply.

## Preference Storage and Performance

Store requested widths and side-column visibility in the plugin's local Obsidian settings, alongside existing settings in the active configuration's data.json. Configuration directories already separate desktop and mobile settings when those configurations are used.

Distinguish requested widths from the effective widths constrained to the current pane. Invalid or missing settings receive safe defaults. Resizing the window must not permanently shrink the saved requested widths.

The former right-column appearance selector is replaced by the live column controls. Existing data.json keys remain compatible; missing new layout preferences use the current visible-column defaults.

During a drag, update only column geometry, at most once per animation frame. Persist the completed change on pointer release or cancellation, and persist visibility changes once per action. These operations do not reread notes, rebuild snapshots, or replace the card DOM. Layout-only settings changes propagate to open workbench views without invalidating the data scope. View lifecycle cleanup removes subscriptions, observers, and temporary handlers.

## Problem Cards

Focused problems remain first, preserving order within both focused and other groups. Each card contains:

1. A visible Focus marker when applicable, a wrapping title that opens the problem note, and the editable status.
2. A short overview with readable wrapping.
3. Editable stage, research role, and tag values with field-specific controls.
4. A distinct Next Step section with up to three preview entries and an expand/collapse control for longer lists.
5. The last-organized value and access to the existing material, edit, focus, and archive actions.

Remove the separate fixed-width last-organized column and the redundant per-card record-type label. Keep every existing field and action accessible. Secondary actions may use a labeled menu to reduce clutter.

Card text remains selectable. Property editing, list expansion, and action controls operate independently of the title's open-note action. An expanded list stays expanded during ordinary note refreshes and resets when changing projects; deleted entries release their display state.

The overview prefers an explicit summary field, then prose from the problem's overview section or existing introductory text. Next Step entries are displayed in their own section rather than duplicated as the overview. An absent overview uses a short, unobtrusive empty state.

## Next Step Reading

Read the first level-two section named Next Step, Next Steps, or 下一步, with English headings matched without case sensitivity. Continue until the next level-one or level-two heading or the end of the document. Ignore headings and list syntax inside fenced code blocks.

Support checkbox entries, ordinary bullet entries, and numbered entries. Preserve source order, basic nesting, continuation text, and explicit checked or unchecked state. Checked items remain visible with a completed treatment; ordinary list entries use a bullet and have no checkbox completion state. Section prose is not promoted into fabricated tasks.

Show a total item count. A remaining-item count may be shown when every entry has an explicit checkbox state; mixed or ordinary lists use the total count. An absent or empty list displays a concise empty state with access to its source section.

Next Step is a source preview in this iteration. It does not change completion state or create TaskNotes records. A source action opens the problem note at the relevant heading, falling back to the note itself when the heading is absent or changed.

Retain the existing string-array representation used by CLI/context consumers. Additional structured display information can be additive. Notes, frontmatter, section names, and task identifiers are not migrated.

Default problem search includes the title, overview, and all Next Step entries. Searching other body content retains the existing full-text option.

Parse only notes already loaded through the configured data scope. Card expansion and source navigation do not trigger a vault-wide read. Opening an individual note may perform the targeted read already used by existing navigation.

## Acceptance Evidence

- Resize each column with mouse/pointer and keyboard; clamp widths, restore defaults, and reopen with saved preferences.
- Collapse either side, restore it from the header, enter/leave focus mode, and preserve preferences across panels and project changes.
- Check wide panes, constrained split panes, mobile widths, long CJK/English text, large fonts, and responsive drawer focus/closing behavior.
- Verify that layout-only actions perform no Markdown reads or snapshot rebuilds and do not interrupt active property editing or input composition.
- Exercise actual cards with property editing, Focus ordering, material actions, keyboard navigation, text selection, list expansion, and targeted source navigation.
- Parse multiple checked/unchecked entries, ordinary and numbered lists, nested entries, continuation text, CRLF, code fences, subsequent sections, and missing sections.
- Verify that overview and Next Step remain distinct, source order and completion display survive refreshes, and existing context exports remain compatible.
- Run type checking, the full test suite, production build, fixture bundle consistency, privacy checks, and diff checks before local installation.

## Implementation Discretion

Module boundaries, exact separator hit areas, spacing, preview typography, action-menu presentation, and the precise responsive threshold remain implementation choices. Their final values must satisfy the interaction, accessibility, containment, and performance requirements above.
