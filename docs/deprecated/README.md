Status: Deprecated
Owner: Engineering
Last Updated: 2026-03-19
Source of Truth: Index of deprecated documentation retained only for historical or debugging context.

# Deprecated Docs

## Criteria

- Keep only material that was replaced by canonical documentation, repository migrations, or stable runtime behavior.
- Do not use files in this directory as implementation guidance unless a canonical doc explicitly points here for history.
- When deprecating a document, add a short reason and point to the replacement source of truth.

## Archived Items

- [Deprecated] [`policies_possible_fix/fix_rls_infinite_recursion.sql`](./policies_possible_fix/fix_rls_infinite_recursion.sql)
  Replaced by `sql/migration_003_fix_rls_politicies.sql` and the troubleshooting flow in `docs/guides/troubleshooting-login.md`.
- [Deprecated] [`policies_possible_fix/rls-debug-transcript.md`](./policies_possible_fix/rls-debug-transcript.md)
  Historical debug transcript retained for context; current guidance lives in `docs/guides/troubleshooting-login.md` and `docs/security/security.md`.
