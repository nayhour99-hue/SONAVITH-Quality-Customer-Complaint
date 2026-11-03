# Development & Verification Workflow

This runbook outlines the step-by-step workflow for implementing new features, debugging issues, and verifying code in this repository.

---

## 1. Phase 1: Discovery & Specification

Before writing any code:
1. **Analyze Requirements**:
   - Review UI mockups, issue descriptions, or user requirements thoroughly.
   - For UI tasks, check [project-context.md](project-context.md) and examine sample images in `sample_UI_img/`.
2. **Identify Impacted Components**:
   - Determine which components, state models, or styles will be created or modified.
   - Clarify data flow and state management strategies.

---

## 2. Phase 2: Implementation

Follow an incremental implementation approach:

1. **State & Data Foundation**:
   - Define data types, schemas, and default states first.
   - Implement store or state-management functions (CRUD operations, filtering, sorting).
2. **UI & Component Layer**:
   - Construct semantic HTML layout.
   - Apply design system tokens from CSS.
   - Bind UI events to state actions.
3. **Form Handling & Validation**:
   - Implement client-side validation with real-time feedback.
   - Prevent invalid form submissions.
4. **Interactive Polish**:
   - Add loading indicators, empty states, and feedback toasts/modals.
   - Include subtle transitions and hover effects for a premium feel.

---

## 3. Phase 3: Verification & Quality Assurance

Never consider a task complete without executing verification steps:

### Automated Checks (when test suites exist)
- Run unit/integration tests: `npm test`
- Run linting / type-checking: `npm run lint` or `npx tsc --noEmit`

### Manual & Visual Verification
- **Visual Inspection**: Ensure layout matches design specifications (font sizes, padding, alignment, colors).
- **Interactive Testing**:
  - Test happy path (e.g., submitting a valid complaint, navigating between tabs).
  - Test error path (e.g., submitting empty forms, invalid date formats).
  - Test responsiveness (resize browser window or verify viewport adjustments).
- **Console Monitoring**: Open browser DevTools to ensure zero uncaught errors or unexpected warnings.

---

## 4. Phase 4: Clean-up & Documentation

- Remove any temporary debug statements (`console.log`, commented-out dead code).
- Document new components, functions, or architectural decisions.
- Summarize changes clearly for review.
