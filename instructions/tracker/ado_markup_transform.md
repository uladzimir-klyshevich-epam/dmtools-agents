# ADO Markup Transform

When writing output for Azure DevOps tracker fields or comments, transform the generic XML-style formatting tags below into GitHub-flavored Markdown. Do not write literal XML tags in the final output.

| Generic tag | Markdown | Example |
|-------------|----------|---------|
| `<bold>X</bold>` | `**X**` | `**Background:**` |
| `<italic>X</italic>` | `*X*` | `*hint*` |
| `<strike>X</strike>` | `~~X~~` | `~~deprecated~~` |
| `<underline>X</underline>` | `<u>X</u>` | `<u>important</u>` |
| `<code>X</code>` | `` `X` `` | `` `main.dart` `` |
| `<codeblock>X</codeblock>` | ` ```\nX\n``` ` | ` ```\nvoid main() {}\n``` ` |
| `<codeblock:lang>X</codeblock:lang>` | ` ```lang\nX\n``` ` | ` ```dart\nvoid main() {}\n``` ` |
| `<bullet> text` | `- text` | `- Option A` |
| `<numbered> text` | `1. text` | `1. Step one` |
| `<heading1>X</heading1>` | `# X` | `# Title` |
| `<heading2>X</heading2>` | `## X` | `## Section` |
| `<heading3>X</heading3>` | `### X` | `### Subsection` |
| `<link>text\|url</link>` | `[text](url)` | `[TS-24](https://dev.azure.com/.../12345)` |
| `<image>url</image>` | `![image](url)` | `![diagram](https://.../diagram.png)` |
| `<quote>X</quote>` | `> X` | `> cited text` |
| `<panel>X</panel>` | `> X` | `> note` |
| `<color color="red">X</color>` | `<span style="color:red">X</span>` | `<span style="color:red">alert</span>` |
| `<hr>` | `---` | `---` |

**Rules:**
- Replace every `<tag>...</tag>` or self-closing tag with the Markdown shown above.
- Do NOT use Jira wiki markup in ADO output: no `*bold*`, no `* item` bullets, no `h2.` headings, no `{code}...{code}` blocks.
- Use `- item` for bullets and `1. item` for numbered lists.
- For Mermaid diagrams in ADO fields that support them, wrap the diagram in ` ```mermaid\n...\n``` `.
