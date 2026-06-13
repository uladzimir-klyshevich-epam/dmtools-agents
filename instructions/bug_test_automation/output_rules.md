# Bug Test Automation Output Rules

Use the same output schema as Story test automation. Write `outputs/story_test_automation_result.json`:

```json
{
  "storyKey": "TS-123",
  "overall": "passed|failed|mixed|blocked_by_human",
  "summary": "...",
  "results": [
    {
      "testCaseKey": "TS-124",
      "status": "passed|failed|skipped",
      "testPath": "testing/tests/TS-124/...",
      "failedDescriptionFile": "outputs/failed_description_TS-124.md",
      "failureSummary": "..."
    }
  ],
  "blockedReason": "..."
}
```

The `storyKey` field is reused for backward compatibility; put the Bug key here.

- `overall`:
  - `passed` — every result is `passed`.
  - `failed` — at least one result is `failed`.
  - `mixed` — some passed and some skipped, none failed.
  - `blocked_by_human` — missing credentials/data.
- `results` must contain every linked Test Case.
- `failedDescriptionFile` is required for every `failed` result.

Write `outputs/tracker_comment.md` in Jira wiki format and attach `outputs/failed_description_{TC_KEY}.md` for failed Test Cases.
