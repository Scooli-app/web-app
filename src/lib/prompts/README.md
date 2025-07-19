# Prompts System

This folder contains all prompt templates and builders for the Scooli application.

## Philosophy

Our prompts follow a **hybrid approach**:

- **RAG Context as Priority**: Curriculum information from the RAG system is treated as the most current and accurate source
- **Model Knowledge as Enhancement**: The model can use its own knowledge to complement and enrich responses
- **Flexible Generation**: For pedagogical suggestions, methodologies, and activities, the model can leverage its full capabilities

## Structure

```
src/lib/prompts/
├── index.ts              # Main exports
├── rag-prompts.ts        # RAG system prompts
├── curriculum-prompts.ts # Curriculum-specific prompts
└── README.md            # This file
```

## Usage

### Basic RAG Query

```typescript
import { PromptBuilder } from "@/lib/prompts";

// Build a RAG query prompt
const prompt = PromptBuilder.buildRagQuery(context, question);

// Get system prompt
const systemPrompt = PromptBuilder.getSystemPrompt();
```

### Curriculum-Specific Prompts

```typescript
import { CurriculumPromptBuilder } from "@/lib/prompts";

// Create a lesson plan
const lessonPlanPrompt = CurriculumPromptBuilder.buildLessonPlan(
  "Matemática",
  "1º ciclo",
  "Adição e subtração",
  context
);

// Create an assessment
const assessmentPrompt = CurriculumPromptBuilder.buildAssessment(
  "Português",
  "2º ciclo",
  "Gramática",
  context
);

// Get activity suggestions
const activitiesPrompt = CurriculumPromptBuilder.buildActivities(
  "Ciências",
  "3º ciclo",
  "Evolução",
  context
);
```

## Prompt Strategy

### RAG Context Priority

- Curriculum information from RAG is treated as **primary source**
- If RAG context is more recent/specific than model knowledge, it takes priority
- For curriculum-specific questions, RAG context is the authoritative source

### Model Knowledge Enhancement

- Model can use its knowledge for:
  - Pedagogical methodologies
  - Activity suggestions
  - Teaching strategies
  - Educational best practices
  - Cross-curricular connections

### Hybrid Responses

- **Curriculum Questions**: RAG context + model knowledge for pedagogy
- **Pedagogical Questions**: Model knowledge + RAG context for curriculum alignment
- **General Questions**: Model knowledge with RAG context as reference

## Adding New Prompts

1. Add your prompt template to the appropriate file
2. Create a builder method in the corresponding builder class
3. Export it from the index file
4. Use it in your service layer

## Best Practices

- Keep prompts clear and specific
- Use template literals for dynamic content
- Maintain consistent formatting
- Test prompts with different inputs
- Document any special instructions or constraints
- Balance RAG context priority with model knowledge enhancement
