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

## Release authority

Only maintainers may create release tags.

A maintainer must complete the release checklist before publishing a release.