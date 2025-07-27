# Scooli Code Organization

## Directory Structure

```
src/
├── app/                    # Next.js app router pages (remains unchanged)
│   ├── api/               # API route handlers
│   └── ...                # Page components
│
├── backend/               # Backend-specific code
│   ├── services/          # Backend services
│   │   ├── auth/         # Authentication services
│   │   ├── documents/    # Document management
│   │   └── users/        # User management
│   ├── middleware/       # Backend middleware
│   └── utils/           # Backend utilities
│
├── frontend/             # Frontend-specific code
│   ├── components/      # React components
│   │   ├── ui/         # UI components
│   │   └── features/   # Feature components
│   ├── hooks/          # React hooks
│   ├── stores/         # State management
│   └── utils/          # Frontend utilities
│
└── shared/              # Code shared between frontend and backend
    ├── config/         # Shared configuration
    │   ├── constants.ts
    │   └── env.ts
    ├── types/          # TypeScript type definitions
    │   ├── api/       # API types (requests/responses)
    │   ├── domain/    # Domain models
    │   └── index.ts   # Type exports
    └── utils/         # Shared utilities
        ├── date.ts
        └── validation.ts
```

## Code Organization Principles

### Backend (`src/backend/`)
- Contains all server-side logic
- Services that interact with the database
- API implementation details
- Server-side utilities and helpers

### Frontend (`src/frontend/`)
- React components and hooks
- State management (stores)
- UI-specific utilities
- Client-side features

### Shared (`src/shared/`)
- TypeScript interfaces and types
- Constants used across the application
- Utility functions used by both frontend and backend
- Configuration shared between client and server

## Import Rules

1. Backend code can import from:
   - `src/backend/*`
   - `src/shared/*`

2. Frontend code can import from:
   - `src/frontend/*`
   - `src/shared/*`

3. Shared code can ONLY import from:
   - `src/shared/*`

4. App directory can import from:
   - `src/frontend/*`
   - `src/backend/*` (only in API routes)
   - `src/shared/*`

## Type Organization

### API Types (`src/shared/types/api/`)
- Request/Response interfaces
- API error types
- API utility types

### Domain Types (`src/shared/types/domain/`)
- Business model interfaces
- Shared enums
- Domain-specific types

### Frontend Types (`src/frontend/types/`)
- Component prop types
- Store types
- UI-specific types

## Examples

### Backend Service
```typescript
// src/backend/services/documents/document.service.ts
import { Document } from '@/shared/types/domain';
import { CreateDocumentRequest } from '@/shared/types/api';

export class DocumentService {
  async createDocument(data: CreateDocumentRequest): Promise<Document> {
    // Implementation
  }
}
```

### Frontend Component
```typescript
// src/frontend/components/features/documents/DocumentEditor.tsx
import { Document } from '@/shared/types/domain';
import { useDocumentStore } from '@/frontend/stores/document.store';

export function DocumentEditor({ document }: { document: Document }) {
  // Implementation
}
```

### Shared Types
```typescript
// src/shared/types/domain/document.ts
export interface Document {
  id: string;
  title: string;
  content: string;
  // ...
}
```

## Migration Strategy

1. Create the new directory structure
2. Move files to their new locations
3. Update import paths
4. Verify the build works
5. Update documentation 