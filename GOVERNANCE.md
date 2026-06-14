# Esiana governance

Maintainer and contributor process rules for [esiana-core](https://github.com/Esiana-ttrpg/esiana-core).

For local setup, see [CONTRIBUTING.md](./CONTRIBUTING.md). For security reports, see [SECURITY.md](./SECURITY.md).

---

## AI Review Policy

> AI-generated reviews, recommendations, audits, release checklists, and approval suggestions are advisory only.
>
> AI systems must not be treated as code reviewers, approvers, release managers, or quality sign-off authorities.
>
> No pull request may be merged solely on the basis of AI review.
>
> All merges require a human maintainer to verify:
>
> - The stated changes were actually implemented.
> - CI completed successfully.
> - Relevant tests were executed.
> - Release or migration impacts were understood.
>
> AI may assist with:
>
> - Code review suggestions
> - Documentation drafting
> - Architecture discussion
> - Test planning
> - Release checklist generation
>
> AI may not:
>
> - Approve pull requests
> - Sign off releases
> - Override failed checks
> - Act as a required reviewer

### GitHub branch protection

```text
AI reviews are informational and do not satisfy any required-reviewer
branch protection rules.
```

This applies to Cursor agents, ChatGPT, GitHub Copilot review, and any other automated review bot.

### Overriding principle

> Human verification always supersedes AI analysis.

Schema migrations, export/import matrices, Docker packaging, and release automation make “AI said ready” insufficient. AI can identify missing work; only a maintainer grants approval.

---

## Release sign-off

Tagged releases require a human maintainer attestation. Use [docs/release/release-checklist.md](./docs/release/release-checklist.md) before pushing a version tag.

AI-generated release checklists are inputs to maintainer judgment — not substitutes for the attestation checkbox.

---

## Product scope

Core product identity and anti-goals: [philosophy.md](./philosophy.md). Engineering guardrails: [engineeringprinciples.md](./engineeringprinciples.md) and [`.cursor/rules/`](./.cursor/rules/).
