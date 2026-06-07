# ADO Question Description Format

When writing question descriptions for Azure DevOps tracker, render the generic formatting tags as Markdown:

| Generic tag | Markdown |
|-------------|----------|
| `<bold>X</bold>` | `**X**` |
| `<bullet>` | `-` |

Additional formatting rules:
- `**bold**` — double asterisks for bold text
- `- item` — dashes for bullet lists
- `# headers` are allowed if needed

```mermaid
flowchart TD
    subgraph SYNTAX["Markdown Syntax"]
        S1["<bold>X</bold> → **X**"]
        S2["<bullet> → - item"]
        S3["**bold** — double asterisks for bold text"]
        S4["# headers are allowed"]
    end

    subgraph EXAMPLE["Rendered Example"]
        T1["**Background:** 1-2 sentences explaining why this matters"]
        T2["**Question:** clear, specific question"]
        T3["**Options:** 2-3 bullets (omit if only one valid path)"]
        T4["**Recommended Decision:** always provide your best guess even if uncertain"]
    end

    SYNTAX --> EXAMPLE
```
