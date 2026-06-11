#!/bin/bash
# Kimi provider for run-agent.sh

# Run the Kimi Code CLI agent and report token usage.
# Depends on global variables set by run-agent.sh:
#   PROMPT, PROMPT_BYTES, PASS_ARGS, KIMI_API_KEY, KIMI_BASE_URL, KIMI_MODEL
run_kimi() {
  if ! command -v kimi >/dev/null 2>&1; then
    echo "Error: kimi not found in PATH" >&2
    echo "Install Kimi Code CLI: https://code.kimi.com/kimi-code/install.sh" >&2
    return 127
  fi

  # Kimi can authenticate via OAuth (local installs) or API key (CI).
  # Only require KIMI_API_KEY when OAuth is not configured.
  local kimi_auth_source=""
  kimi_auth_source="$(kimi provider list 2>/dev/null | grep 'managed:kimi-code' | grep -o 'source=[^ ]*' | cut -d'=' -f2 || true)"
  if [ "${kimi_auth_source:-}" != "oauth" ] && [ -z "${KIMI_API_KEY:-}" ]; then
    echo "Error: KIMI_API_KEY environment variable is required for kimi provider" >&2
    echo "Set it in dmtools.env or as an environment variable" >&2
    return 1
  fi

  echo "Kimi Configuration:"
  echo "  Auth source: ${kimi_auth_source:-api_key}"
  if [ -n "${KIMI_BASE_URL:-}" ]; then
    echo "  Base URL: ${KIMI_BASE_URL}"
  fi
  if [ -n "${KIMI_MODEL:-}" ]; then
    echo "  Model: ${KIMI_MODEL}"
  fi
  echo "Working directory: $(pwd)"
  echo ""

  # Build kimi command.
  # PASS_ARGS support: flags like --continue --resume --session are forwarded.
  # By default we do NOT pass --model unless KIMI_MODEL is explicitly set.
  local kimi_model_args=()
  if [ -n "${KIMI_MODEL:-}" ]; then
    kimi_model_args=(--model "${KIMI_MODEL}")
  fi

  # Always use -p (non-interactive prompt mode) when stdin is not a TTY (CI).
  # Stdin mode causes kimi to enter interactive TUI which hangs/does nothing in CI.
  # For local interactive use, stdin is fine but -p is still preferred for reliability.
  local kimi_log
  kimi_log="$(mktemp)"
  echo "Running: kimi ${kimi_model_args[*]:-} ${PASS_ARGS[*]:-} -p <prompt:${PROMPT_BYTES} bytes>"
  echo ""
  set +e
  kimi ${kimi_model_args[@]+"${kimi_model_args[@]}"} ${PASS_ARGS[@]+"${PASS_ARGS[@]}"} --output-format "stream-json" -p "${PROMPT}" 2>&1 | tee "$kimi_log"
  local exit_code=${PIPESTATUS[0]}
  set -e

  record_codegraph_usage "$kimi_log"

  # Extract the session id from Kimi's resume_hint so we can locate the wire file
  # for this specific run. Kimi stores runtime data under KIMI_CODE_HOME.
  local kimi_session_id=""
  kimi_session_id="$(grep -o '"session_id":"[^"]*"' "$kimi_log" | head -1 | cut -d'"' -f4 || true)"

  print_kimi_usage_summary_and_write_json "${kimi_session_id}"

  rm -f "$kimi_log"

  echo ""
  echo "=== Agent completed with exit code: $exit_code ==="
  return $exit_code
}

# Extract token usage from the wire file Kimi CLI wrote during the run and write
# a machine-readable JSON summary to outputs/kimi_usage.json.
# Wire file location: $KIMI_CODE_HOME/sessions/<work-dir-hash>/<session-id>/agents/main/wire.jsonl
print_kimi_usage_summary_and_write_json() {
  local session_id="$1"
  local kimi_code_home="${KIMI_CODE_HOME:-${HOME}/.kimi-code}"
  local wire_file=""

  echo "  KIMI_CODE_HOME: ${kimi_code_home}"
  echo "  Session ID: ${session_id}"

  if [ -n "${session_id}" ]; then
    wire_file="$(find "${kimi_code_home}/sessions" -path "*/${session_id}/agents/main/wire.jsonl" -type f 2>/dev/null | head -1 || true)"
  fi

  if [ -z "${wire_file}" ] || [ ! -f "${wire_file}" ]; then
    echo "⚠️  No Kimi wire file found; cannot report token usage."
    echo "  Sessions tree under ${kimi_code_home}:"
    find "${kimi_code_home}" -maxdepth 4 -type d 2>/dev/null | sed 's/^/    /' || true
    return 0
  fi

  local wire_size
  wire_size="$(wc -c < "${wire_file}" | tr -d ' ')"
  echo "  Wire file: ${wire_file}"
  echo "  Wire file size: ${wire_size} bytes"

  if [ "${KIMI_PRINT_WIRE_FILE:-}" = "1" ]; then
    echo "  Wire file contents:"
    cat "${wire_file}"
  else
    echo "  First 10 lines of wire file:"
    head -n 10 "${wire_file}" | sed 's/^/    /'
  fi

  mkdir -p outputs
  python3 - "$wire_file" << 'PYEOF'
import json
import os
import sys

wire_file = sys.argv[1]

total_input_other = 0
total_output = 0
total_input_cache_read = 0
total_input_cache_creation = 0
count = 0
models = set()

with open(wire_file, 'r', encoding='utf-8') as f:
    for line in f:
        if '"type":"usage.record"' not in line:
            continue
        try:
            obj = json.loads(line)
            if obj.get('type') != 'usage.record':
                continue
            usage = obj.get('usage', {})
            total_input_other += usage.get('inputOther', 0)
            total_output += usage.get('output', 0)
            total_input_cache_read += usage.get('inputCacheRead', 0)
            total_input_cache_creation += usage.get('inputCacheCreation', 0)
            models.add(obj.get('model', 'unknown'))
            count += 1
        except Exception:
            continue

total_input = total_input_other + total_input_cache_read + total_input_cache_creation
total = total_input + total_output

summary = {
    "provider": "kimi",
    "models": sorted(models),
    "usage_records": count,
    "input_other": total_input_other,
    "input_cache_read": total_input_cache_read,
    "input_cache_creation": total_input_cache_creation,
    "output": total_output,
    "total_input": total_input,
    "total_tokens": total
}

out_path = os.path.join('outputs', 'kimi_usage.json')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(summary, f, indent=2)

print("")
print("=== Kimi Token Usage Summary ===")
print(f"  Model(s): {', '.join(sorted(models))}")
print(f"  Usage records: {count}")
print(f"  Input (other):          {total_input_other:,}")
print(f"  Input (cache read):     {total_input_cache_read:,}")
print(f"  Input (cache creation): {total_input_cache_creation:,}")
print(f"  Output:                 {total_output:,}")
print(f"  Total input:            {total_input:,}")
print(f"  Total tokens:           {total:,}")
print(f"  Written to:             {out_path}")
print("================================")
PYEOF
}
