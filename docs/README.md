Status: Canonical
Owner: Engineering
Last Updated: 2026-03-23
Source of Truth: This index routes the team to the canonical documentation for each topic and classifies non-canonical material.

# Durania Docs

## Start Here

1. [Canonical] [Architecture overview](./architecture/overview.md)
2. [Canonical] [Setup and commands](./guides/setup.md)
3. [Canonical] [Multi-tenant model](./architecture/multitenancy.md)
4. [Canonical] [Auth and tenant IAM](./architecture/auth-admin.md)
5. [Canonical] [Routing and guards](./architecture/routing.md)
6. [Canonical] [Database reference](./data/database.md)

If you touch HTTP entrypoints or API ownership, also read [src/app/api/README.md](../src/app/api/README.md).

## Architecture

- [Canonical] [Architecture overview](./architecture/overview.md)
- [Canonical] [Routing and guards](./architecture/routing.md)
- [Canonical] [Multi-tenant model](./architecture/multitenancy.md)
- [Canonical] [Auth and tenant IAM](./architecture/auth-admin.md)
- [Canonical] [Tenant IAM catalog](./architecture/tenant-iam.md)
- [Canonical] [UI color system](./architecture/ui-color-system.md)
- [Canonical] [MVZ hierarchy](./architecture/mvz-hierarchy.md)
- [Canonical] [Archived modules policy](./architecture/archived-modules.md)

## Guides

- [Canonical] [Setup and commands](./guides/setup.md)
- [Canonical] [Troubleshooting login](./guides/troubleshooting-login.md)

## Data

- [Canonical] [Database reference](./data/database.md)
- [Canonical] [Prisma from SQL](./data/prisma-from-sql.md)

## Security

- [Canonical] [Current security posture](./security/security.md)
- [Assessment] [Security audit 2026-03-03](./security/audit.md)

## Product and Deep Reference

- [Reference] [Product context](./product/CONTEXT.md)
- [Reference] [Bovinos module technical reference](./reference/modules/bovinos.md)

## History and Archive

- [History] [Documentation changelog](./CHANGELOG.md)
- [Deprecated] [Deprecated docs index](./deprecated/README.md)

## Working Rules

- Update the canonical doc for the area you changed; avoid duplicating long sections across files.
- Keep `docs/CHANGELOG.md` as history of documentation changes, not as operational source of truth.
- Move experiments, transcripts, and replaced material to `docs/deprecated/`.
- If you change API ownership or route families, update [Architecture overview](./architecture/overview.md), [src/app/api/README.md](../src/app/api/README.md), and `docs/CHANGELOG.md` in the same change.
