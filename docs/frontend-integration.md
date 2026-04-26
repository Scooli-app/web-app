# Frontend Integration — Resource Generation v2 (Phases 1–3)

## Overview

All backend changes are additive — no existing screens break. The main new surface is a **Sources library** (user-uploaded documents used as RAG context), plus minor additions to the document creation form and document view.

---

## 1. Feature Flag Gating

Before rendering any Sources UI, check which features are enabled for the current user.

**`GET /features`** — returns a map of feature keys to booleans.

```json
{
  "user_sources": true,
  "generation_v2": false,
  "rag_v2": true
}
```

- Render the Sources library only when `user_sources === true`
- Show quality-loop indicators (critic/revision steps) only when `generation_v2 === true`
- `rag_v2` is internal — no UI change needed

---

## 2. Sources Library

### List sources

```
GET /sources
Authorization: Bearer <token>
```

```json
[
  {
    "id": "uuid",
    "name": "Recurso de Teste",
    "subject": "Matemática",
    "schoolYear": 5,
    "fileKind": "pdf",
    "fileSizeBytes": 204800,
    "status": "indexed",
    "createdAt": "2026-04-26T12:00:00Z"
  }
]
```

Status lifecycle: `uploaded` → `processing` → `indexed` | `failed`

### Upload a source

```
POST /sources
Content-Type: multipart/form-data

file        (required, PDF/DOCX/Markdown/.txt, max 25 MB)
name        (optional display name, defaults to filename)
subject     (optional, e.g. "Matemática")
schoolYear  (optional integer, 1–12)
```

Returns `202 Accepted` with the source object at `status: "uploaded"`.

### Get a single source

```
GET /sources/{id}
Authorization: Bearer <token>
```

Returns same shape as list item.

### Delete a source

```
DELETE /sources/{id}
Authorization: Bearer <token>
→ 204 No Content
```

---

## 3. Ingestion Progress Stream (SSE)

After upload, open an SSE connection to show real-time progress.

```
GET /sources/{id}/stream
Accept: text/event-stream
Authorization: Bearer <token>
```

Events (one per second):

```json
{"type": "status", "data": "uploaded"}
{"type": "status", "data": "processing"}
{"type": "status", "data": "indexed"}
```

Terminal states: `indexed`, `failed`, `timeout` (server closes after 60 s).

> **Important:** Native `EventSource` does not support custom headers. Use `fetch` with a `ReadableStream` or a library like `@microsoft/fetch-event-source`.

```js
import { fetchEventSource } from '@microsoft/fetch-event-source';

const controller = new AbortController();

fetchEventSource(`/sources/${sourceId}/stream`, {
  headers: { Authorization: `Bearer ${token}` },
  onmessage(ev) {
    const { type, data } = JSON.parse(ev.data);
    if (type === 'status') {
      updateSourceStatus(sourceId, data);
      if (['indexed', 'failed', 'timeout'].includes(data)) {
        controller.abort();
      }
    }
  },
  signal: controller.signal,
});
```

---

## 4. Updated Document Creation Form

`POST /documents` now accepts three new optional fields:

```json
{
  "documentType": "lessonPlan",
  "prompt": "...",

  "sourceIds": ["uuid1", "uuid2"],
  "includeAe": true,
  "includeMyDefaults": true
}
```

| Field | Type | Default | Behaviour |
|---|---|---|---|
| `sourceIds` | `string[]` | `[]` | Explicit sources to use for RAG. When non-empty, user defaults are ignored. |
| `includeAe` | `boolean` | `true` | Include AE curriculum context. |
| `includeMyDefaults` | `boolean` | `true` | Auto-include user's indexed sources. Ignored when `sourceIds` is non-empty. |

### Source Picker component

Shown only when the `user_sources` feature flag is on. Add a collapsible **"Fontes"** section to the document creation form:

- Toggle: **"Incluir Aprendizagens Essenciais"** → `includeAe` (default: on)
- Toggle: **"Incluir as minhas fontes por defeito"** → `includeMyDefaults` (default: on, disabled when explicit sources are selected)
- Multi-select list of the user's `indexed` sources → `sourceIds`
- When the user picks explicit sources, automatically disable the `includeMyDefaults` toggle — they are mutually exclusive by design

---

## 5. Document View: Source Citations

After generation, sources used for RAG context are returned in two places.

**Sync path** (`POST /documents?stream=false`):

```json
{
  "id": "...",
  "sources": [
    {
      "chunkId": "uuid",
      "documentName": "AE Matemática 5.º Ano",
      "topicKey": "Frações",
      "chunkContent": "O aluno deve...",
      "similarity": 0.87,
      "sourceKind": "ae"
    }
  ]
}
```

**Streaming path** — SSE emits a `sources` event before `done`:

```json
{"type": "sources", "data": "[{\"chunkId\":\"...\",\"sourceKind\":\"user\",...}]"}
```

`sourceKind` is either `"ae"` (curriculum) or `"user"` (uploaded source).

**Suggested UI:** A collapsible **"Fontes utilizadas"** panel below the document showing source name, topic, and similarity score. Visually distinguish AE chunks from user-uploaded sources.

---

## 6. Fix: SSE Stream Triple Reconnection (Bug)

Staging logs showed the document generation stream reconnecting 3 times for the same document. The native `EventSource` API auto-reconnects on any close unless explicitly prevented.

**Fix:** Always call `es.close()` on terminal events:

```js
const es = new EventSource(url);

es.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  if (type === 'done' || type === 'error') {
    es.close(); // prevents auto-reconnect
  }
};

es.onerror = () => {
  es.close(); // also close on network error
};
```

---

## 7. Sources Library Page — Suggested UI Structure

Route: `/sources` (gated behind `user_sources` flag)

```
┌─────────────────────────────────────────────┐
│ As Minhas Fontes                [+ Carregar] │
├─────────────────────────────────────────────┤
│ 📄 Manual de Frações       Matemática 5.º   │
│    indexed  ·  1.2 MB  ·  há 2 dias   [🗑] │
│                                             │
│ 📄 Gramática Básica        Português        │
│    ● processing...                    [🗑]  │
│                                             │
│ 📄 Ciências Naturais PDF   Ciências 6.º     │
│    ✗ failed                           [🗑]  │
└─────────────────────────────────────────────┘
```

Upload flow:

1. Click **"+ Carregar"** → open upload modal
2. File picker (accept `.pdf,.docx,.md,.txt`)
3. Optional fields: name, subject, schoolYear
4. Submit → `POST /sources` → `202 Accepted`
5. New row appears with `uploaded` status
6. Open SSE stream → update status live
7. On `indexed` → green checkmark; source is ready to use in generation

---

## 8. Error Handling for Sources

| HTTP | Situation | User-facing message |
|---|---|---|
| `400` | File > 25 MB | "O ficheiro excede o limite de 25 MB." |
| `400` | Unsupported type | "Tipo de ficheiro não suportado. Usa PDF, DOCX ou Markdown." |
| `400` | > 20 sources or > 500 MB total | "Limite de fontes atingido. Remove uma fonte para continuar." |
| `403` | Not on Pro plan | "Esta funcionalidade requer um plano Pro." |
| `403` | Feature flag off | "O upload de fontes está disponível apenas em planos Pro." |
| `404` | Source not found | "Recurso não encontrado." |

---

## 9. Route and Permission Summary

| Route | Auth | Pro required | Notes |
|---|---|---|---|
| `GET /sources` | ✅ | No | User's own sources only |
| `POST /sources` | ✅ | Yes | 25 MB limit |
| `GET /sources/{id}` | ✅ | No | Ownership enforced |
| `DELETE /sources/{id}` | ✅ | No | Soft-delete |
| `GET /sources/{id}/stream` | ✅ | No | SSE; ownership enforced |
| `POST /documents` | ✅ | No | Three new optional fields |
| `GET /features` | ✅ | No | Feature flag map |