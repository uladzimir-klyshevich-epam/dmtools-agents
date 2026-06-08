Example PR review outputs — keep everything concise:

### outputs/pr_review.json
```json
{
  "recommendation": "BLOCK",
  "summary": "SQL injection vulnerability in UserService.js must be fixed before merge.",
  "prNumber": null,
  "prUrl": null,
  "generalComment": "outputs/pr_review_general.md",
  "resolvedThreadIds": [],
  "inlineComments": [
    {
      "path": "src/auth/UserService.js",
      "line": 45,
      "startLine": 43,
      "side": "RIGHT",
      "body": "🚨 **BLOCKING: SQL Injection** — Use parameterized queries instead of string concatenation.",
      "severity": "BLOCKING"
    },
    {
      "path": "src/auth/LoginController.js",
      "line": 78,
      "side": "RIGHT",
      "body": "⚠️ **IMPORTANT: Weak Password Validation** — Minimum 6 chars is insufficient. Require 8+ with mixed case, numbers, and symbols.",
      "severity": "IMPORTANT"
    },
    {
      "path": "src/utils/validation.js",
      "line": 23,
      "side": "RIGHT",
      "body": "💡 **SUGGESTION: DRY** — Email validation is duplicated in 3 files. Extract to a shared utility.",
      "severity": "SUGGESTION"
    }
  ],
  "issueCounts": { "blocking": 1, "important": 1, "suggestions": 1 }
}
```

### outputs/pr_review_general.md
```markdown
## Automated Code Review — BLOCK

**Summary**: SQL injection vulnerability blocks merge. One important issue (weak password validation) and one suggestion (extract duplicated validation).

**Next Steps**:
1. Fix SQL injection in UserService.js — use parameterized queries
2. Strengthen password validation (8+ chars, mixed case, numbers, symbols)
3. Extract shared email validation utility
```

### outputs/response.md (tracker-agnostic, concise)
```markdown
### Summary
BLOCK — SQL injection vulnerability in UserService.js must be fixed before merge.

### Key Issues
- 🚨 **BLOCKING**: SQL injection (UserService.js:45) — use parameterized queries
- ⚠️ **IMPORTANT**: Weak password validation (LoginController.js:78) — require 8+ chars
- 💡 **SUGGESTION**: Extract duplicated email validation to shared utility

### Next Steps
1. Fix SQL injection
2. Strengthen password validation
3. Extract shared validation utility
```
