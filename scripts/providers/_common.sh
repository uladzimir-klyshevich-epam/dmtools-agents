#!/bin/bash
# Common helpers shared by all run-agent provider subscripts.

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
