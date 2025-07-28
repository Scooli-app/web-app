# Scooli Project Structure Documentation

**Last Updated:** January 2025  
**Status:** Current project organization after recent restructuring

## Overview

This document outlines the current folder structure and architectural organization of the Scooli edtech platform. The project follows a clean, domain-driven architecture with clear separation between frontend, backend, and shared concerns.

## Root Structure

```
web-app/
├── src/                    # Main source code
├── docs/                   # Project documentation
├── public/                 # Static assets
├── scripts/                # Build and utility scripts
├── curriculum-docs/        # Curriculum reference materials
├── .next/                  # Next.js build artifacts
└── node_modules/           # Dependencies
```

## Source Code Organization (`src/`)

### 📁 **App Directory** (`src/app/`)

Next.js 13+ App Router structure for pages and API routes.

```
app/
├── (auth)/
│   ├── login/              # Login page
│   ├── signup/             # Registration page
│   └── account-disabled/   # Disabled account page
├── (dashboard)/
│   ├── dashboard/          # Main dashboard
│   ├── documents/          # Document management
│   ├── lesson-plan/        # Lesson plan creation
│   ├── assays/             # Test/assessment creation
│   ├── quiz/               # Quiz creation
│   └── community/          # Community features
├── api/                    # API endpoints
│   ├── documents/          # Document CRUD operations
│   ├── users/              # User profile management
│   ├── process-curriculum/ # Curriculum processing
│   └── rag-query/          # RAG system queries
├── globals.css             # Global styles
├── layout.tsx              # Root layout component
├── not-found.tsx           # 404 page
└── favicon.ico             # Site icon
```

### 📁 **Frontend Directory** (`src/frontend/`)

Client-side React components, hooks, and state management.

```
frontend/
├── components/
│   ├── document-editor/    # Document editing components
│   │   ├── DocumentEditor.tsx
│   │   ├── AIChatPanel.tsx
│   │   └── DocumentTitle.tsx
│   ├── forms/              # Form components
│   │   ├── Auth.tsx        # Authentication forms
│   │   └── QuestionForm.tsx
│   ├── icons/              # Custom icon components
│   │   ├── google.tsx
│   │   └── microsoft.tsx
│   ├── layout/             # Layout components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── SidebarLayout.tsx
│   ├── providers/          # Context providers
│   │   ├── AuthProvider.tsx
│   │   └── SupabaseProvider.tsx
│   └── ui/                 # Reusable UI components
│       ├── button.tsx      # Styled buttons
│       ├── card.tsx        # Card components
│       ├── input.tsx       # Form inputs
│       ├── document-card.tsx
│       ├── documents-gallery.tsx
│       ├── rich-text-editor.tsx
│       └── [other ui components]
├── hooks/                  # Custom React hooks
│   ├── useAutoSave.ts      # Auto-save functionality
│   ├── useDebounce.ts      # Debounced values
│   ├── useDocumentManager.ts
│   ├── useInitialPrompt.ts
│   ├── useRagQuery.ts      # RAG system integration
│   └── use-mobile.ts       # Mobile detection
└── stores/                 # State management (Zustand)
    ├── auth.store.ts       # Authentication state
    ├── document.store.ts   # Document state
    ├── ui.store.ts         # UI state
    └── index.ts            # Store exports
```

### 📁 **Backend Directory** (`src/backend/`)

Server-side services and business logic.

```
backend/
├── middleware/             # Custom middleware
│   └── middleware.ts       # Request processing
├── services/               # Business logic services
│   ├── auth/               # Authentication services
│   │   ├── auth.service.ts
│   │   ├── auth-init.service.ts
│   │   └── roleManager.ts
│   ├── documents/          # Document management
│   │   ├── document.service.ts
│   │   └── lesson-plan.service.ts
│   ├── users/              # User management
│   │   └── user-profile.service.ts
│   ├── rag/                # RAG system implementation
│   │   └── rag.service.ts
│   ├── client.ts           # API client utilities
│   ├── credit.service.ts   # Credit system
│   └── index.ts            # Service exports
```

### 📁 **Shared Directory** (`src/shared/`)

Code shared between frontend and backend.

```
shared/
├── auth/                   # Authentication utilities
│   ├── apiAuth.ts          # API authentication
│   ├── client.ts           # Auth client setup
│   ├── ProtectedRoute.tsx  # Route protection
│   ├── roleManager.ts      # Role management
│   ├── routeConfig.ts      # Route configuration
│   ├── utils.ts            # Auth utilities
│   └── README.md           # Auth documentation
├── config/                 # Configuration files
│   └── constants.ts        # App constants
├── prompts/                # AI prompt templates
│   ├── base-prompts.ts     # Common prompts
│   ├── lesson-plan-prompts.ts
│   ├── presentation-prompts.ts
│   ├── rag-prompts.ts      # RAG system prompts
│   ├── test-quiz-prompts.ts
│   ├── index.ts            # Prompt exports
│   └── README.md           # Prompt documentation
├── types/                  # TypeScript type definitions
│   ├── api/                # API-related types
│   │   └── document.ts
│   ├── domain/             # Domain model types
│   │   ├── document.ts
│   │   └── lesson-plan.ts
│   ├── api.ts              # General API types
│   ├── auth.ts             # Authentication types
│   ├── community.ts        # Community types
│   ├── documents.ts        # Document types
│   ├── routes.ts           # Route types
│   ├── ui.ts               # UI component types
│   └── index.ts            # Type exports
└── utils/                  # Shared utilities
    ├── markdown.ts         # Markdown processing
    └── utils.ts            # General utilities
```

### 📁 **Other Directories**

```
src/
├── lib/                    # External library configurations
│   └── database/           # Database utilities
├── migrations/             # Database migrations
│   └── create_auth_user_trigger.sql
└── middleware.ts           # Next.js middleware (auth, routing)
```

## Key Architectural Decisions

### 🏗️ **Separation of Concerns**

- **Frontend**: Pure React components and client-side logic
- **Backend**: Server-side services and business logic
- **Shared**: Reusable code, types, and utilities
- **App**: Next.js routing and API endpoints

### 🎯 **Domain-Driven Design**

- Components organized by feature/domain (documents, auth, etc.)
- Services grouped by business capabilities
- Clear boundaries between different areas of concern

### 🔐 **Authentication Architecture**

- Centralized auth configuration in `shared/auth/`
- Role-based access control (RBAC) system
- Protected routes with middleware
- API authentication utilities

### 🎨 **UI/UX Organization**

- Atomic design principles in UI components
- Reusable components in `frontend/components/ui/`
- Feature-specific components grouped by domain
- Consistent styling with Tailwind CSS

### 📊 **State Management**

- Zustand for client-side state
- Separate stores by domain (auth, documents, UI)
- Server state managed through React Query patterns

### 🤖 **AI Integration**

- Structured prompt templates in `shared/prompts/`
- RAG system for curriculum assistance
- AI-powered content generation services

## Benefits of Current Structure

1. **Scalability**: Clear separation allows teams to work independently
2. **Maintainability**: Domain-driven organization makes code easy to find
3. **Reusability**: Shared utilities and components reduce duplication
4. **Type Safety**: Comprehensive TypeScript types across all layers
5. **Testing**: Isolated services and components are easier to test
6. **Performance**: Clear boundaries enable code splitting and optimization

## Migration Notes

This structure represents a recent reorganization from a previous flat structure. Key improvements include:

- Better separation of frontend/backend concerns
- Centralized authentication system
- Improved type organization
- Cleaner component hierarchy
- Structured prompt management

## Development Guidelines

1. **New Features**: Follow the domain-driven approach
2. **Components**: Use the atomic design pattern
3. **Services**: Keep business logic in backend services
4. **Types**: Define types in shared/types with proper organization
5. **Authentication**: Use the centralized auth utilities
6. **API Routes**: Follow RESTful patterns in app/api/

This structure provides a solid foundation for the Scooli platform's continued growth and development.
