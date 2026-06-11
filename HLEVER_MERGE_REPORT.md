# HLever Merge Report

Generated at: $timestamp

Game: $gameTitle
Target repo: $RepoOwner/ChessTower
Source: $SourceRepo at $sourceCommit
Adoption mode: $adoptionModeChoice

## Actions

- Kept existing .codex-local/.gitignore; verify it ignores hlever-deprecated/ if you track .codex-local metadata.
- Deprecated 'docs/hlever' to '.codex-local/hlever-deprecated/2026-06-09T08-08-43-629Z/docs/hlever'. Refreshing HLever-owned docs for existing-game merge mode.
- Deprecated 'scripts/hlever' to '.codex-local/hlever-deprecated/2026-06-09T08-08-43-629Z/scripts/hlever'. Refreshing HLever-owned validation scripts for existing-game merge mode.
- Deprecated 'studio/typescript-reference-kit' to '.codex-local/hlever-deprecated/2026-06-09T08-08-43-629Z/studio/typescript-reference-kit'. Refreshing HLever-owned TypeScript reference kit.
- Copied HLever TypeScript reference kit to studio/typescript-reference-kit/.
- Refreshed existing resources/ folder because it was empty or contained only HLever README/.gitignore.
- Wrote merge candidate 'docs/hlever/merge-candidates/root/AGENTS.md'.
- Wrote merge candidate 'docs/hlever/merge-candidates/.github/ISSUE_TEMPLATE'.
- Wrote merge candidate 'docs/hlever/merge-candidates/.github/workflows'.
- Wrote merge candidate 'docs/hlever/merge-candidates/public/brand'.
- Copied HLever-owned docs and scripts under docs/hlever/ and scripts/hlever/ without overwriting root game files.
- Preserved root game files. Candidate README.md, PROCESS_LOG.md, .gitignore, and package.json were written under docs/hlever/merge-candidates/root/.
- Added hlever Git remote pointing to https://github.com/hileverage/hlever.git.
- Wrote HLEVER_ADOPTION.md with source commit and setup choices.
- Automatic npm install, validation, git add, git commit, and GitHub repo creation were skipped in existing mode. Review this report, merge candidates, run the game repo validation, then commit through the game's normal PR flow.

## Manual Review

- Review files under docs/hlever/merge-candidates/ and merge the useful parts into existing game-owned files.
- If esources/ was skipped because tracked files exist, decide whether to migrate those assets, keep the current loader, or move them to a project-specific resource path before adopting the HLever default.
- Add or adapt package scripts for scripts/hlever/validate-json.mjs, scripts/hlever/validate-links.mjs, and scripts/hlever/scan-secret-placeholders.mjs only after checking the existing toolchain.
- Run the game repo validation and targeted runtime checks before opening a PR.