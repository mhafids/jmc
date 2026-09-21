---
description: Standard workflow for efficient exploration, code understanding, and context-optimized execution (AIR workflow).
---

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->


# AIR Workflow (Analyze, Inspect, Resolve)

Follow this structured workflow to ensure token efficiency, context accuracy, and high-quality implementation, especially when using lightweight / cost-effective models.

---

## 1. Documentation-First Checking (Check Docs First)
> **Goal**: Understand business requirements, technical specifications, system context, architectural patterns, and conventions before touching any code files.

1. **Check Project-Specific Documentation**:
   - **`docs/requirement/`**: Check feature specs, requirements, user stories, and acceptance criteria before planning or executing tasks.
   - **`docs/context/`**: Inspect system context, domain knowledge, background architecture, and technical constraints.
   - **[README.md](file:///c:/Users/mastr/Documents/projectfreelancer/prototipe-jmc-admin-ui-nuxt/README.md)**: Review general project setup, tech stack details (Nuxt 4, Tabler UI, composables), and coding conventions.
2. **Consult External Documentation (when needed)**:
   - When using unfamiliar third-party libraries or frameworks, refer to official documentation (e.g., Tabler Icons, Nuxt 4 directory standards).

---

## 2. Codegraph & Structured Code Navigation (Codegraph Search)
> **Goal**: Navigate the codebase methodically using symbol relationships instead of blindly reading broad code sections.

1. **Trace Code Graph & Symbol Relationships**:
   - Trace imports, definitions, and data flow (e.g., `app/data/menu.js` -> components -> layouts -> pages).
   - Identify dependencies between components, composables (`useTheme`), and configuration files.
   - Leverage `.codegraph` indexing or ripgrep searches for exact references.
2. **Targeted Search**:
   - Use targeted regex/queries restricted to specific directories rather than running unbounded searches.
   - Pinpoint type definitions, utility functions, and component contracts prior to modifications.

---

## 3. Context & Token Optimization (Low-Cost / Small Model Friendly)
> **Goal**: Minimize context window usage and conserve tokens while ensuring clear, unambiguous instructions for smaller models.

1. **Chunk Reading & Slice Notation**:
   - Never read entire large files at once when only a specific function or section is needed.
   - Always leverage `StartLine` and `EndLine` to inspect only the relevant code range.
2. **Modular & Targeted Edits**:
   - Apply specific, contiguous replacements (`replace_file_content`) instead of full file rewrites.
   - Keep agent outputs concise, avoiding verbose explanations that consume unnecessary tokens.
3. **Step-by-Step Clarity**:
   - Break down complex requirements into distinct, sequential sub-steps.
   - Use direct, unambiguous instructions.

---

## 4. Execution & Verification Flow
> **Goal**: Guarantee code stability, preserve existing functionality, and prevent regressions.

1. **Verify Syntax & Conventions**:
   - Ensure Vue templates, `<script setup>`, and Nuxt composables adhere to Nuxt 4 and project conventions.
2. **Ensure Minimal Side Effects**:
   - Verify that changes do not break dark mode, sidebar navigation, or layout structures.
3. **Succinct Summary**:
   - Provide a concise summary of the applied changes and highlight key verification points.