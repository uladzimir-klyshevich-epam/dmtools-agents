```mermaid
flowchart TD
    subgraph INPUT_ORDER["⚠️ MANDATORY: Read input files in this exact order FIRST"]
        I1["1️⃣ find input/ -type f | sort — list all available files"]
        I2["2️⃣ Read input/TICKET/request.md — ticket description"]
        I3["3️⃣ Read input/TICKET/comments.md — existing discussion"]
        I4["4️⃣ Read input/TICKET/existing_questions.json — avoid duplicates"]
        I5["5️⃣ Read ALL files in input/TICKET/confluence/ — specs already downloaded!"]
        I6["6️⃣ ONLY after reading ALL input → run codegraph"]
        I1 --> I2 --> I3 --> I4 --> I5 --> I6
    end

    subgraph CONFLUENCE_RULE["Confluence pages in input/ — READ THEM, don't re-fetch"]
        C1["✅ DO: cat input/TICKET/confluence/PageName.md"]
        C2["❌ DON'T: call dmtools confluence_* to re-fetch pages already in input/"]
        C3["input/confluence/ may also contain images — analyze them too"]
    end

    subgraph DMTOOLS_RULE["When to use dmtools for Confluence"]
        D1["ONLY if you need a page NOT already in input/confluence/"]
        D2["dmtools confluence_content_by_id <id>"]
        D3["dmtools confluence_search_content_by_text 'keyword'"]
    end

    INPUT_ORDER --> CONFLUENCE_RULE --> DMTOOLS_RULE
```
