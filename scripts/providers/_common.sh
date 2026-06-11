#!/bin/bash
# Common helpers shared by all run-agent provider subscripts.

# Record a *_usage.json file path to outputs/token_usage_files.json so that
# post-action JavaScript can discover usage summaries without relying on fs.
record_usage_file() {
  local usage_file="$1"
  local manifest="outputs/token_usage_files.json"
  mkdir -p outputs
  python3 - "$usage_file" "$manifest" << 'PYEOF'
import json
import os
import sys

usage_file = sys.argv[1]
manifest = sys.argv[2]

entries = []
if os.path.exists(manifest):
    try:
        with open(manifest, 'r', encoding='utf-8') as f:
            entries = json.load(f)
        if not isinstance(entries, list):
            entries = []
    except Exception:
        entries = []

if usage_file not in entries:
    entries.append(usage_file)

with open(manifest, 'w', encoding='utf-8') as f:
    json.dump(entries, f, indent=2)
PYEOF
}

# Record CodeGraph command usage to .dmtools/codegraph-usage.log
record_codegraph_usage() {
  local log_file="$1"
  if [ ! -s "$log_file" ]; then
    return 0
  fi

  local matches
  matches="$(grep -E '(^|[[:space:];|&])codegraph[[:space:]]+(context|query|callees|callers|impact|node|files|sync|affected|status)([[:space:]]|$)' "$log_file" || true)"
  if [ -z "$matches" ]; then
    return 0
  fi

  mkdir -p .dmtools
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    printf '%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$line" >> .dmtools/codegraph-usage.log
  done <<< "$matches"
}
