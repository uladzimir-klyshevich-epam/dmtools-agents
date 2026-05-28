# CodeGraph — code intelligence tools

CodeGraph builds a semantic knowledge graph of the codebase and makes it available as CLI commands. The index is pre-built during CI setup, so all commands work immediately without any initialization step.

## When to use CodeGraph vs other tools

| Situation | Use |
|-----------|-----|
| Understand how a feature/flow works end-to-end | `codegraph context "<task description>"` |
| Find where a class/function/method is defined | `codegraph query "<name>"` |
| Trace what a method calls (downstream) | `codegraph callees "<Class.method>"` |
| Find who calls a method (upstream) | `codegraph callers "<Class.method>"` |
| Check what breaks if you change something | `codegraph impact "<Class.method>"` |
| Read a single symbol's source | `codegraph node "<ClassName>"` |

**Prefer CodeGraph over `grep` or `cat` for code understanding** — it uses the pre-built semantic index and returns only relevant, structured results.

## Key commands

### Explore a task or feature
```bash
codegraph context "how does the JavaScript runner expose MCP tools"
codegraph context "trace the test case generation flow from JQL to Jira ticket creation"
```

### Find a symbol
```bash
codegraph query "JavaScriptExecutor"
codegraph query "executeJavaScript"
```

### Walk call graph
```bash
codegraph callees "JobJavaScriptBridge.executeJavaScript"   # what it calls
codegraph callers "exposeMCPToolsUsingGenerated"            # who calls it
codegraph impact  "MCPToolExecutor.execute"                 # what changes affect
```

### Read a symbol
```bash
codegraph node "JavaScriptExecutor"
codegraph node "JobJavaScriptBridge.initializeJavaScriptContext"
```

## Sync the index after making code changes

If you edit source files during your session, sync the index before querying:
```bash
codegraph sync
```

## Tips
- Symbol format: `ClassName` or `ClassName.methodName`
- `codegraph context` is the most powerful single command — start there for any "how does X work" question
- Results are Markdown-formatted and safe to include directly in your reasoning
