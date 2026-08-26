# Working rules for this repo (Noir / Demo 5 work)

## Golden rules
- NEVER switch, create, or delete branches. Stay on the current branch.
- NEVER run destructive git commands (reset --hard, clean -fd, push --force).
- NEVER write to the database or run migrations. Read-only DB access only, and
  only when explicitly asked.
- Inspect and explain BEFORE editing. For any change, first show me the plan and
  the exact files, then wait for my "go" before writing.
- Keep changes surgically scoped to the files I name. No broad refactors, no
  "while I'm here" edits, no touching files outside the stated scope.
- Never touch: shared ProductCard / frontend/components/template/** (V1), the
  Classic/Modern/Editorial/Minimal templates, cart/checkout, backend, CMS schema,
  shared config — unless I explicitly name the file.
- All content stays CMS/props-driven. Never hardcode brand, product, or copy.
- Verify with `pnpm build` and `git diff --stat` after edits. Report the diff scope.
- End every task by stopping and waiting for my review. Do not chain into the
  next task.

## Project context
- This is a commercial multi-demo e-commerce template. Demo 5 "Noir" is a new
  dark-luxury variant on branch noir-rescue-design. Protecting the other four
  demos from regressions is the top priority.
- Verification is done by me via local screenshots (?templatePreview=<id>), not
  by Claude Code. Do not attempt browser automation or screenshots.