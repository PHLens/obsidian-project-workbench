# Repository writing conventions

- Use English for all pull request titles and descriptions, commit messages, issue descriptions, review comments, release notes, and changelog entries.
- Documentation should describe facts and conclusions without conversation transcripts or discussion history.

## Worktree lifecycle

- After a pull request is merged, complete any requested release from the merged main branch and verify its published artifacts.
- Verify that the completed worktree has no required unmerged changes, delete it directly, fetch origin, and create a fresh worktree from the latest `origin/main` for subsequent work.
