---
description: Scooli Project Rules & Guidelines
---

# 🎯 Scooli Project Rules

This document is the primary source of truth for development standards, architecture, and UI/UX guidelines for Scooli.

## 🧠 Project Context
**Scooli** is an AI-powered edtech platform for Portuguese teachers.
- **Mission:** Automate lesson planning and material creation to save teachers time.
- **Aesthetic:** Premium, modern, and accessible. Focus on teacher UX.
- **Frontend Stack:** Next.js (React), Tailwind CSS, Lucide Icons, shadcn/ui.
- **Backend:** Custom Java/Quarkus backend located in `C:\PROJECTS\Scooli\chalkboard`.
- **Database:** PostgreSQL hosted on Render.
- **Auth:** Clerk + custom cookie `scooli_token` for backend auth.

---

## 🏗️ Architecture & Development Standards

### 🌐 Backend Integration
- **API Client:** Use the Axios instance in `src/services/api/client.ts`.
- **Services:** Centralize API logic in `src/services/api/[domain].service.ts`.
- **Pagination:** Backend uses **0-based** page indexing. Frontend converts to/from **1-based** for UI.
- **SSE (Streaming):** Use `@microsoft/fetch-event-source` for real-time AI content generation (see `document.service.ts`).

### 📊 State Management (Redux Toolkit)
- **CRITICAL:** Use Redux Toolkit (`src/store`) for global state.
- **Slices:** Organized by domain in `src/store/[domain]/[name]Slice.ts`.
- **Patterns:** Always check if data exists in the store before fetching. Update store after mutations.

### 🗃️ Typing & Shared Logic
- **Centrazlied Types:** All shared interfaces/types are in `src/shared/types/`. 
- **Route Enum:** Always use the `Routes` enum in `src/shared/types/routes.ts` for navigation.
- **Utils:** Common utilities go to `src/shared/utils/`. Use `cn` for Tailwind class merging.

---

## 🎨 UI/UX Styleguide

### 💎 Design System & Tailwind
- **Base Components:** Build strictly on top of **shadcn/ui**.
- **Colors:** Use Tailwind theme tokens (e.g., `text-primary`, `bg-accent`, `border-border`).
- **Roundedness:** Favor `rounded-xl` (md) and `rounded-2xl` (lg).
- **Icons:** Always use **Lucide React**.

### 🧩 Component Structure
- **Feature-based:** Components are grouped by feature (e.g., `src/components/document-creation/`).
- **UI Primitives:** Shared primitive components stay in `src/components/ui/`.
- **Naming:** PascalCase for components, `camelCase` for variables/functions.
- **Props:** Use TypeScript interfaces for all component props.

### ✨ Visual Excellence & A11Y
- **Interactivity:** Add micro-animations using Tailwind classes (e.g., `transition-all`, `hover:scale-[1.02]`, `active:scale-[0.98]`).
- **Transitions:** Use `animate-in fade-in` for new elements.
- **Accessibility:** 
  - `aria-label` is mandatory for interactive elements without visible text.
  - `aria-pressed` for toggle buttons.
  - Visible focus rings: `focus:ring-ring` (or `focus:ring-[#6753FF]`).
  - Use semantic HTML (h1, h2, section, etc.).

---

## 🚀 Workflow Checklist
1. **Routing:** Check/Add routes to `Routes` enum.
2. **State:** Identify necessary Redux slices.
3. **Logic:** Implement API calls in a `.service.ts` file if they don't exist.
4. **UI:** use existing shadcn components; apply responsive `sm:` classes.
5. **Detail:** Add `aria-labels` and hover/active animations.
6. **Backend Sync:** Ensure pagination logic handles 0-based backend indexing correctly.
