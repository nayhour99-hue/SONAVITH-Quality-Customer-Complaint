---
name: coding
description: Comprehensive coding standards, development workflows, architecture guidelines, and code quality practices for implementing, refactoring, and maintaining applications in this repository. Activate this skill whenever writing, modifying, debugging, testing, or reviewing code.
---

# Coding Skill & Development Guidelines

This skill defines the technical standards, architectural practices, and engineering workflows for developing software in this repository. Follow these guidelines to ensure maintainability, visual excellence, robust error handling, and high-quality code.

---

## 1. Quick Reference & Core Principles

| Principle | Guideline |
| :--- | :--- |
| **Simplicity & Readability** | Write self-documenting code with clear variable and function names. Keep functions focused on a single responsibility. |
| **Defensive Programming** | Validate inputs, handle unexpected states gracefully, and prevent crashes with proper error boundaries. |
| **Modern Aesthetics** | Web interfaces must feel premium: curated color palettes, clear hierarchy, subtle transitions, and responsive layouts. |
| **Progressive Disclosure** | Keep modules modular and decoupled. Detailed standards are organized in the `references/` directory. |
| **Verification First** | Never declare work complete without verifying functionality (browser testing, automated tests, or lint checks). |

---

## 2. Detailed References

For specific domain guidelines, consult the offline sub-documents in `references/`:

- **Coding Standards & Conventions**: [references/standards.md](references/standards.md)
  - Code organization, naming conventions, modern syntax, error handling patterns, and clean code rules.
- **Development & Verification Workflow**: [references/workflow.md](references/workflow.md)
  - Step-by-step execution playbook: planning, incremental implementation, local testing, and verification.
- **Project Domain & Context**: [references/project-context.md](references/project-context.md)
  - Project architecture for the SONAVITH Defective Product Report system (4-stage workflow: Sales, QA, CEO, Warehouse), data models, and UI layout specifications.

---

## 3. Standard Execution Checklist

Whenever tasked with coding or modifying features in this repository:

1. **Review Context**:
   - Check [project-context.md](references/project-context.md) to understand existing business rules, status stages, and UI specs.
   - Inspect existing files before editing to maintain architectural consistency.

2. **Follow Coding Standards**:
   - Adhere strictly to the guidelines in [standards.md](references/standards.md).
   - Use semantic HTML, responsive CSS with design tokens, and modular JavaScript/TypeScript.
   - Avoid hardcoded values; use constants, enums, and structured state models.

3. **Verify and Test**:
   - Follow the verification procedures in [workflow.md](references/workflow.md).
   - Test UI responsiveness, form validation, error states, and edge cases.
   - Ensure clean console logs without unhandled exceptions.
