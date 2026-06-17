# Esiana Governance

## Project stewardship

Esiana is maintained by the project maintainers.

Maintainers are responsible for:

- Reviewing and merging pull requests
- Managing releases
- Maintaining project direction
- Enforcing project policies
- Making final decisions when consensus cannot be reached

## Decision making

Discussion and consensus are preferred.

When consensus cannot be reached, a maintainer may make a final decision to unblock progress.

## Branch model

- `develop` is the primary development branch.
- Feature work targets `develop`.
- `main` represents release-ready code.
- Releases are created by merging `develop` into `main` and creating a version tag.

## Pull requests

All changes must be submitted through pull requests.

Before merge:

- CI must pass.
- A maintainer must review the change.
- Migration and release impacts must be understood.
- Documentation must be updated when applicable.

AI-assisted contributions (Cursor, Cloud Agents, etc.) may open pull requests but must not merge, approve, or tag releases. See [AGENTS.md](./AGENTS.md).

## Agent governance (dual layer)

| Layer | Artifact | Role |
|-------|----------|------|
| Policy | [AGENTS.md](./AGENTS.md) | Product identity, engineering invariants, contribution norms |
| Mechanics | [.github/rulesets/develop-main.json](./.github/rulesets/develop-main.json) | PR-only merges, required approval, CI, no force-push on `develop` / `main` |

Policy states intent; the ruleset enforces git workflow on GitHub. Product and engineering rules are enforced through review, not automation.

### Activating the ruleset (maintainer, post-merge)

After merging a change that updates the ruleset JSON:

1. **GitHub UI:** Settings → Rules → Rulesets → **Import a ruleset** → select `.github/rulesets/develop-main.json`
2. **CLI:** `gh api repos/Esiana-ttrpg/esiana-core/rulesets --method POST --input .github/rulesets/develop-main.json`
3. **Verify:** direct push to `develop` is rejected; a PR without approval cannot merge.

Repository admins may retain ruleset bypass for emergency hotfixes. Bypass is audited in GitHub ruleset history and is not granted to bots.

## Release authority

Only maintainers may create release tags.

A maintainer must complete the release checklist before publishing a release.