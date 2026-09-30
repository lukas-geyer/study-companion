#!/bin/bash
# Claude Code cloud sessions: install dependencies with npm when a session starts (Bun's own installer has
# proxy problems there; Bun still runs, builds and tests). Does nothing on your own computer.
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
[ -f package.json ] || exit 0
# Up to date already? (node_modules/.package-lock.json is written by npm after every install)
if [ -f node_modules/.package-lock.json ] && { [ ! -f package-lock.json ] || [ node_modules/.package-lock.json -nt package-lock.json ]; }; then
  exit 0
fi
log=/tmp/npm-install.log
if [ -f package-lock.json ]; then cmd="npm ci"; else cmd="npm install"; fi
if $cmd --no-audit --no-fund >"$log" 2>&1; then
  echo "Dependencies installed ($cmd)."
else
  echo "$cmd failed – see $log"
fi
exit 0
