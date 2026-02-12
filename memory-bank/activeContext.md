# Active Context

## Current Focus
The current focus is on the **C# Class Extractor** tool.
- Location: `dev/csharp-class-extractor/index.html`
- Goal: Maintain, improve, or extend functionality as needed.

## Recent Changes
- Initial analysis of the C# Class Extractor implementation.
- Creation of Memory Bank documentation.

## Active Decisions
- **Layout Architecture**:
    - **Header**: Split into `header-home.html` (absolute overlay for main page) and `header.html` (relative block for tools) to prevent content overlap in tools.
    - **Footer**: Split into `footer-big.html` (full content for main page) and `footer.html` (minimal for tools).
    - **Tool Layouts**: Complex tools (e.g., Kanban, Dialogue Tree) use a flex-column body with a wrapper div to ensure the footer sits correctly at the bottom.
- The C# Class Extractor tool currently parses C# code using Regex. This is lightweight but potentially fragile. We will stick with this approach unless it proves insufficient for user needs.
- The tool is contained in a single HTML file.
