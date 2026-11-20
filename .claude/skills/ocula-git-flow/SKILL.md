---
name: ocula-git-flow
description: Use for any git task in this repo: starting a task, committing, pushing, opening or merging a PR, or fixing a branch mix-up.
---

# Git flow

Branches: `develop` (testing), `main` (production). Never commit directly to them; rulesets require a PR.

Start: `git switch develop && git pull && git switch -c <feature|fix|chore>/<name>`, then run `git branch` and confirm the `*` is on the new branch BEFORE `git add`.

Finish:
1. `npm run lint` and `npm run build` in the folder you changed.
2. `git status`: no `.env`, `node_modules` or `dist`.
3. `git add .` then `git commit -m "feat: ..."` (Conventional Commits: feat, fix, chore, docs, refactor).
4. `git push -u origin <branch>`, `gh pr create --base develop --fill`, `gh pr merge --merge`.
5. After merge: `git switch develop && git pull && git fetch --prune && git branch -d <branch>`.

Promote: PR from `develop` into `main`.

Wrong branch: commit or stash first, then `git branch -f <new> develop`, `git reset --hard origin/develop`, `git switch <new>`. Warn that reset --hard deletes uncommitted work.

If a push is rejected, use a new branch name. Commit `package.json` and `package-lock.json` when installing libraries.
