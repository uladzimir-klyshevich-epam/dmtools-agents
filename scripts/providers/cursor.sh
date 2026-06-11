#!/bin/bash
# Cursor provider for run-agent.sh

run_cursor() {
  if ! command -v cursor-agent >/dev/null 2>&1; then
    echo "Error: cursor-agent not found in PATH" >&2
    return 127
  fi

  local cursor_model_value
  cursor_model_value="${CURSOR_MODEL:-auto}"
  echo "Cursor Configuration:"
  echo "  Model: ${cursor_model_value}"

  local cmd
  # Build command with defaults if no options provided
  if [ ${#PASS_ARGS[@]} -eq 0 ]; then
    cmd=(cursor-agent --force --print --model "${cursor_model_value}" --output-format=text "$PROMPT")
  else
    cmd=(cursor-agent "${PASS_ARGS[@]}" --output-format=text "$PROMPT")
  fi

  echo "Working directory: $(pwd)"
  echo ""
  echo "Running: ${cmd[*]}"
  echo ""

  local agent_log
  agent_log="$(mktemp)"
  set +e
  "${cmd[@]}" 2>&1 | tee "$agent_log"
  local exit_code=${PIPESTATUS[0]}
  set -e
  record_codegraph_usage "$agent_log"
  rm -f "$agent_log"

  echo ""
  echo "=== Agent completed with exit code: $exit_code ==="
  return $exit_code
}
