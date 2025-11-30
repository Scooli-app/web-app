# Document Creation System

This system provides a reusable way to create new document types with consistent behavior and minimal code duplication.

## Adding a New Document Type

To add a new document type (e.g., "worksheet"), follow these steps:

### 1. Add to Document Type Union

Update `src/shared/types/domain/document.ts`:

```typescript
export type DocumentType =
  | "lessonPlan"
  | "quiz"
  | "presentation"
  | "assay"
  | "worksheet";
```

### 2. Add Routes

Update `src/shared/types/routes.ts`:

```typescript
export enum Routes {
  // ... existing routes
  WORKSHEET = "/worksheet",
  WORKSHEET_EDITOR = "/worksheet/:id",
}
```

### 3. Configure Document Type

Add to `src/components/document-creation/documentTypes.ts`:

```typescript
export const documentTypes: Record<string, DocumentTypeConfig> = {
  // ... existing types
  worksheet: {
    id: "worksheet",
    title: "Ficha de Trabalho",
    description:
      "Descreva os exercícios e o Scooli irá gerar uma ficha completa",
    placeholder:
      "Ex: Ficha de trabalho sobre verbos para o 5º ano, com 15 exercícios",
    redirectPath: Routes.WORKSHEET_EDITOR,
    generateTitlePrefix: "Ficha de Trabalho",
  },
};
```

### 4. Create Pages

Create `src/app/worksheet/page.tsx`:

```typescript
"use client";

import {
  DocumentCreationPage,
  documentTypes,
} from "@/components/document-creation";

export default function WorksheetPage() {
  return <DocumentCreationPage documentType={documentTypes.worksheet} />;
}
```

Create `src/app/worksheet/[id]/page.tsx`:

```typescript
"use client";

import DocumentEditor from "@/components/document-editor/DocumentEditor";
import { use } from "react";

interface WorksheetEditorPageProps {
  params: Promise<{ id: string }>;
}

export default function WorksheetEditorPage({
  params,
}: WorksheetEditorPageProps) {
  const { id } = use(params);

  return (
    <DocumentEditor
      documentId={id}
      defaultTitle="Nova Ficha de Trabalho"
      loadingMessage="A carregar ficha..."
      generateMessage="Gerar ficha"
      chatTitle="Assistente de Fichas"
      chatPlaceholder="Faça uma pergunta sobre a ficha ou peça para modificar algo..."
    />
  );
}
```

### 5. Add to Navigation (Optional)

Add links to your sidebar or navigation components.

## Features Included

Each document type automatically gets:

- ✅ Consistent UI/UX
- ✅ Initial prompt handling
- ✅ Chat integration
- ✅ Authentication checks
- ✅ Error handling
- ✅ Loading states
- ✅ Proper routing
- ✅ Document creation via Zustand store

## Components

- **`DocumentCreationPage`**: Reusable creation page component
- **`DocumentEditor`**: Reusable editor with AI chat
- **`documentTypes`**: Configuration for all document types
