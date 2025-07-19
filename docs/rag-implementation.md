# RAG Implementation for Scooli

## Overview

This document describes the Retrieval-Augmented Generation (RAG) implementation for Scooli, which allows teachers to ask questions about the Portuguese curriculum and get accurate answers based on official documentation.

## Architecture

### 1. Data Processing Pipeline

#### API Endpoint: `/api/process-curriculum`

- **Purpose**: Processes multiple file formats from Supabase bucket and generates embeddings
- **Security**: Protected with `CURRICULUM_PROCESSING_SECRET`
- **Supported File Types**:
  - `.txt` - Plain text files
  - `.docx` - Microsoft Word documents
  - `.pdf` - PDF documents
  - `.md` - Markdown files
- **Features**:
  - Automatically converts different file formats to text
  - Uses LangChain's `RecursiveCharacterTextSplitter` for intelligent text chunking
  - Generates embeddings using OpenAI's `text-embedding-3-small` model
  - Stores chunks with metadata in `curriculum_chunks` table
  - Skips already processed documents

#### Key Improvements:

- ✅ **Multi-format support** - Handles .txt, .docx, .pdf, .md files
- ✅ **Automatic conversion** - Converts Word docs and PDFs to text
- ✅ **Upgraded to `text-embedding-3-small`** (better than `ada-002`)
- ✅ **Added LangChain for better text splitting**
- ✅ **Added metadata extraction from filenames**
- ✅ **Added error handling and retry logic**
- ✅ **Added `processed_at` timestamp**

### 2. Query Pipeline

#### API Endpoint: `/api/rag-query`

- **Purpose**: Handles user questions and returns RAG-based answers
- **Process**:
  1. Generates embedding for user question
  2. Searches similar chunks using Supabase's `match_curriculum_chunks` function
  3. Builds context from top matches
  4. Generates answer using GPT-4 with curriculum context
  5. Returns answer with source citations

### 3. Database Schema

```sql
-- curriculum_chunks table
CREATE TABLE curriculum_chunks (
  id BIGSERIAL PRIMARY KEY,
  document_name TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- for text-embedding-3-small
  chunk_index INTEGER,
  metadata JSONB,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vector similarity function
CREATE OR REPLACE FUNCTION match_curriculum_chunks(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.78,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id BIGINT,
  document_name TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id,
    cc.document_name,
    cc.content,
    1 - (cc.embedding <=> query_embedding) AS similarity
  FROM curriculum_chunks cc
  WHERE 1 - (cc.embedding <=> query_embedding) > match_threshold
  ORDER BY cc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

## Usage

### 1. Uploading Curriculum Documents

**Supported File Types:**

- **`.txt`** - Simple text files (recommended for testing)
- **`.docx`** - Microsoft Word documents (most common)
- **`.pdf`** - PDF documents
- **`.md`** - Markdown files

**File Naming Convention:**

```
area-ciclo.ext
Examples:
- matematica-1ciclo.docx
- portugues-2ciclo.pdf
- ciencias-3ciclo.txt
- historia-1ciclo.md
```

### 2. Processing Documents

```bash
# Add your files to the Supabase bucket "curriculum-documents"
# Then trigger processing:

npx tsx scripts/test-curriculum-processing.ts
```

### 3. Using the RAG Interface

The RAG interface is available in the dashboard at `/dashboard`. Users can:

1. Ask questions about the curriculum
2. Get answers based on official documentation
3. See source citations for transparency

### 4. API Usage

```typescript
// Query the RAG system
const response = await fetch("/api/rag-query", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    question: "Quais são os objetivos de Matemática no 1º ciclo?",
  }),
});

const data = await response.json();
// data.answer - The generated answer
// data.sources - Array of source documents
```

## Configuration

### Environment Variables

```env
# Required for processing
CURRICULUM_PROCESSING_SECRET=your-secret-key

# OpenAI
OPENAI_API_KEY=your-openai-key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Dependencies

```json
{
  "langchain": "^0.1.0",
  "openai": "^4.0.0",
  "@supabase/supabase-js": "^2.0.0",
  "mammoth": "^1.6.0",
  "pdf-parse": "^1.1.1",
  "dotenv": "^17.2.0"
}
```

## Performance Considerations

1. **Chunk Size**: 1000 tokens with 200 token overlap
2. **Similarity Threshold**: 0.78 (configurable)
3. **Max Results**: 5 chunks per query
4. **Model**: `text-embedding-3-small` for embeddings, `gpt-4` for generation
5. **File Size**: Large files are automatically chunked for processing

## File Processing Details

### Text Extraction by File Type

- **`.txt`/`.md`**: Direct text extraction
- **`.docx`**: Uses `mammoth` library to extract raw text
- **`.pdf`**: Uses `pdf-parse` to extract text content

### Metadata Extraction

The system automatically extracts metadata from filenames:

- `matematica-1ciclo.docx` → `{ area: "matematica", ciclo: "1ciclo" }`
- `portugues-2ciclo.pdf` → `{ area: "portugues", ciclo: "2ciclo" }`

## Future Enhancements

- [ ] Add caching for frequently asked questions
- [ ] Implement conversation history
- [ ] Add support for multiple languages
- [ ] Create admin interface for managing curriculum documents
- [ ] Add analytics for query patterns
- [ ] Implement feedback system for answer quality
- [ ] Add support for more file formats (RTF, ODT)
- [ ] Implement OCR for scanned PDFs

## Troubleshooting

### Common Issues

1. **No files found**: Ensure files are uploaded to the bucket with supported extensions
2. **Processing errors**: Check OpenAI API key and quota
3. **No matches**: Lower the similarity threshold or add more documents
4. **Slow responses**: Consider caching or optimizing chunk size
5. **File conversion errors**: Check file format and size

### Debug Commands

```bash
# Check bucket contents
npx supabase storage list curriculum-documents

# Test processing
npx tsx scripts/test-curriculum-processing.ts

# Check database
npx supabase db query "SELECT COUNT(*) FROM curriculum_chunks;"

# Test RAG query
npx tsx scripts/test-rag-query.ts
```

### File Upload Tips

1. **Use `.txt` files for testing** - They're the simplest to work with
2. **Use `.docx` for Word documents** - Better formatting preservation
3. **Use `.pdf` for official documents** - Good for scanned materials
4. **Keep file sizes reasonable** - Large files will be chunked automatically
5. **Use descriptive filenames** - Helps with metadata extraction
