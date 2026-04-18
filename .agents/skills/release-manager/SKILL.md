---
name: release-manager
description: Autonomous release cutting — determines version from Conventional Commits, updates CHANGELOG, commits, and tags.
---

# The Release Manager Skill

Cutting a release is a mechanical process, not a creative one. This skill automates the entire flow: version determination from commit history, CHANGELOG formatting, commit, and Git tag — with zero human-in-the-loop by default.

## Trigger

Invoked on-demand when the user requests a release (e.g., "cut a release", "ship it", "prepare a release").

## Release Protocol

### Step 1: Determine Version Number

Analyze all commits on `main` since the last Git tag (or since the initial commit if no tags exist) to auto-determine the [Semantic Versioning](https://semver.org/) bump:

1. **List commits since last tag:** `git log $(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD)..HEAD --oneline`
2. **Scan commit prefixes** using Conventional Commits:
   - If any commit contains `BREAKING CHANGE:` in the body/footer, or uses the `!` modifier (e.g., `feat!:`, `fix!:`), → **MAJOR** bump.
   - If any commit starts with `feat:` or `feat(scope):` → **MINOR** bump.
   - If only `fix:`, `chore:`, `docs:`, `refactor:`, `perf:`, `test:`, `ci:`, or `style:` commits are present → **PATCH** bump.
3. **Calculate the new version:**
   - If no previous tag exists, the first release is `v0.1.0`.
   - Otherwise, increment the appropriate segment of the last tag and reset lower segments to zero (e.g., `v1.2.3` + minor → `v1.3.0`).
4. **Override:** If the user explicitly specifies a version (e.g., "release as v2.0.0"), use their version instead. User intent always overrides auto-detection.

### Step 2: Validate Unreleased Content

Before modifying any files, verify that `CHANGELOG.md` has content under the `[Unreleased]` section.
- If the `[Unreleased]` section is empty (no entries), warn the user: "The [Unreleased] section is empty — there are no changes to release. Are you sure you want to proceed?"
- If the section has entries, proceed automatically.

### Step 3: Update CHANGELOG.md

Perform the following edits to `CHANGELOG.md`:

1. **Rename the Unreleased header:** Replace `## [Unreleased]` with `## [vX.X.X] - YYYY-MM-DD` (using today's date in ISO 8601 format).
2. **Add a new empty Unreleased section** immediately above the newly versioned section:

```markdown
## [Unreleased]

## [vX.X.X] - 2026-04-17

### Added
- ...
```

3. **Preserve all existing content** below the updated section. Do not modify any previous release entries.

### Step 4: Commit and Tag

1. **Stage:** `git add CHANGELOG.md`
2. **Commit:** `git commit -m "chore: release vX.X.X"`
3. **Tag:** `git tag -a vX.X.X -m "Release vX.X.X"`
4. **Push:** `git push origin main --follow-tags`

### Step 5: Confirmation

Report the release summary to the user:

```
Release Complete: vX.X.X
- Changelog: [Unreleased] → [vX.X.X] - YYYY-MM-DD
- Commit: <short-sha>
- Tag: vX.X.X (pushed to origin)
- Bump Type: MINOR (detected 3 feat: commits, 5 fix: commits)
```

## Guardrails

- **Main Branch Only:** This skill must only be executed on `main`. If the current branch is not `main`, abort with an error.
- **Clean Working Tree:** `git status --porcelain` must return empty before proceeding. Uncommitted changes indicate unfinished work — do not release a dirty tree.
- **No Empty Releases:** If zero commits exist since the last tag, abort: "Nothing to release — no commits since vX.X.X."
- **Tag Uniqueness:** If the calculated tag already exists (`git tag -l vX.X.X` returns a result), abort: "Tag vX.X.X already exists. Use a manual override or resolve the conflict."
- **Never Modify History:** This skill creates new commits and tags. It never amends, rebases, or force-pushes existing history.
