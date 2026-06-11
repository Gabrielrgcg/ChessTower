# Existing Game Merge

Use existing-game merge mode when a game repo already has code, assets, workflows, docs, or local resource folders. Do not use new-project mode on an established repo unless you are intentionally replacing its scaffold files.

## Safe Workflow

1. Start from a clean worktree.
2. Create a branch such as `codex/adopt-hlever`.
3. Run the bootstrapper with adoption mode `existing`.
4. Review `HLEVER_MERGE_REPORT.md`.
5. Merge only the useful candidates from `docs/hlever/merge-candidates/` into existing game-owned files.
6. Run the game repo's validation and targeted runtime checks.
7. Commit and open a PR through the game repo's normal process.

## What Existing Mode Preserves

Existing mode does not overwrite root game files or runtime code. These are preserved and receive candidates instead:

- `README.md`
- `PROCESS_LOG.md`
- `.gitignore`
- `package.json`
- `AGENTS.md`
- `.github/ISSUE_TEMPLATE/`
- `.github/workflows/`
- `public/brand/`
- `public-site/`

Candidates are written under `docs/hlever/merge-candidates/` so the owner can merge them deliberately.

## What Existing Mode Refreshes

Existing mode treats these as HLever-owned and may archive prior copies before refreshing them:

- `docs/hlever/`
- `scripts/hlever/`
- `studio/typescript-reference-kit/` when the TypeScript adapter is selected
- `HLEVER_ADOPTION.md`
- `HLEVER_MERGE_REPORT.md`

Prior copies move to `.codex-local/hlever-deprecated/<timestamp>/`. That location is local scratch space and should not be used as a committed archive.

## Resources Handling

`resources/` is handled separately because it may contain local packs, extracted assets, or tracked game assets.

- Missing `resources/`: create the HLever default folder.
- Empty `resources/`, or only HLever `README.md` and `.gitignore`: refresh the default folder.
- Untracked/local-only content: move the old folder to `.codex-local/hlever-deprecated/<timestamp>/resources/`, then create a fresh HLever default folder.
- Tracked files under `resources/`: do not move the folder. Write the HLever resources template under `docs/hlever/merge-candidates/resources/` and record a manual migration step in `HLEVER_MERGE_REPORT.md`.

Tracked resource files require a human decision because they may be imported by game code, referenced by build scripts, or covered by asset permissions.

## Command Shape

When running interactively, choose:

```text
Adoption mode (new/existing) [new]: existing
```

For scripted local testing from a cloned HLever repo:

```powershell
powershell -ExecutionPolicy Bypass -File .\bootstrap\HLEVER_BOOTSTRAP.ps1 `
  -AdoptionMode existing `
  -GameTitle "Existing Game" `
  -GameId "existing-game" `
  -RepoOwner "frizas" `
  -RepoName "existing-game" `
  -RuntimeMode hybrid `
  -StarterAdapter docs-only `
  -IncludeAccountsDocs yes `
  -IncludePublicDocs no `
  -SkinResourceBase none `
  -LocalSourcePath . `
  -TargetPath C:\path\to\existing-game `
  -SkipGitHubRepoCreate `
  -SkipAdoptionReport
```

Passing the setup answers as parameters keeps existing-game adoption non-interactive and avoids local prompt shims.

Review the generated report before committing:

```powershell
Get-Content .\HLEVER_MERGE_REPORT.md
```
