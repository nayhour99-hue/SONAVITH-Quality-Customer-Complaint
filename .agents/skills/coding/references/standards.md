# Coding Standards & Best Practices

This document outlines the coding standards, code organization principles, and styling rules enforced in this repository.

---

## 1. General Engineering Principles

### Clean Architecture & Separation of Concerns
- **Single Responsibility**: Each module, component, or function must have one clear reason to change.
- **DRY (Don't Repeat Yourself)**: Extract reusable utility functions, shared UI components, and state management logic.
- **KISS (Keep It Simple, Stupid)**: Avoid over-engineering, premature abstractions, or adding unnecessary dependencies when native solutions suffice.

### Naming Conventions
- **Variables & Functions**: Use descriptive `camelCase` (e.g., `calculateTotalDefects`, `isApprovalPending`).
- **Constants & Enums**: Use `UPPER_SNAKE_CASE` (e.g., `DEFECT_STATUS_PENDING_QA`, `DEFAULT_PAGE_SIZE`).
- **Classes & Components**: Use `PascalCase` (e.g., `ComplaintModal`, `MetricsCard`).
- **CSS Classes**: Use `kebab-case` with BEM-like naming (e.g., `.complaint-card`, `.complaint-card__header`, `.complaint-card--active`).
- **Files**: Use descriptive `kebab-case` for general files (e.g., `complaint-store.js`, `date-utils.js`).

---

## 2. Frontend Development Standards

### HTML & Semantic Structure
- Use semantic elements (`<header>`, `<main>`, `<section>`, `<article>`, `<nav>`, `<table>`, `<dialog>`).
- Always provide accessible form labels (`<label for="...">`) and `aria-*` attributes for interactive components.
- Assign unique, descriptive `id` attributes to major interactive controls for easy testing and automation.

### CSS & Styling
- **Design Tokens**: Define theme variables in `:root` for colors, spacing, borders, typography, and elevations:
  ```css
  :root {
    --color-primary: #1b4d3e;
    --color-primary-hover: #153c30;
    --color-background: #f8f9fa;
    --color-surface: #ffffff;
    --color-text: #1e293b;
    --color-text-muted: #64748b;
    --color-border: #e2e8f0;
    --color-warning: #d97706;
    --color-success: #16a34a;
    --color-danger: #dc2626;
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 16px;
    --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.06);
  }
  ```
- **Modern Typography**: Use clean typography hierarchies (e.g., Inter, Outfit, or system-ui) with appropriate font weights and line heights.
- **Micro-Interactions**: Use smooth transitions (`transition: all 0.2s ease`) on interactive elements (buttons, inputs, cards).

### JavaScript / TypeScript
- **Modern Syntax**: Use modern ES6+ features (`const`/`let`, arrow functions, destructuring, template literals, optional chaining `?.`, nullish coalescing `??`).
- **Immutability**: Prefer immutable operations when updating state (e.g., `array.map()`, spread operator `[...items]`).
- **Async Handling**: Always use `async`/`await` over raw promise chains, and wrap with proper `try...catch` blocks.

---

## 3. Defensive Programming & Error Handling

- **Input Validation**: Never trust user input. Validate form inputs on change and submission (e.g., required fields, date formats, positive quantities).
- **Graceful Degradation**: If an image fails to load or an API endpoint fails, show informative fallback UI rather than breaking the application.
- **No Silent Failures**: Log errors meaningfully in development and display user-friendly error banners or toast notifications.

---

## 4. Code Review Checklist

Before finalizing any code change:
- [ ] Are all variables and functions meaningfully named?
- [ ] Are edge cases (empty lists, null values, network latency) handled gracefully?
- [ ] Is the UI responsive across desktop, tablet, and mobile screen sizes?
- [ ] Are there any console errors or warnings when interacting with the feature?
- [ ] Is the code clean, readable, and properly formatted?
