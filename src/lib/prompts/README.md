# Prompts System

This folder contains all prompt templates and builders for the Scooli application.

## Philosophy

Our prompts follow a **hybrid approach**:

- **RAG Context as Priority**: Curriculum information from the RAG system is treated as the most current and accurate source
- **Model Knowledge as Enhancement**: The model can use its own knowledge to complement and enrich responses
- **Flexible Generation**: For pedagogical suggestions, methodologies, and activities, the model can leverage its full capabilities

## Architecture

### Base Prompt System

We use a **base prompt system** to eliminate duplication and ensure consistency:

```
src/lib/prompts/
├── base-prompts.ts        # Common templates and utilities
├── lesson-plan-prompts.ts # Lesson plan specific prompts
├── test-quiz-prompts.ts   # Test/quiz specific prompts
├── presentation-prompts.ts # Presentation specific prompts
├── rag-prompts.ts         # RAG system prompts
├── index.ts              # Main exports
└── README.md            # This file
```

### Common Components

All document types share these common elements:

- **Safety Limitations**: Jailbreak prevention and scope restrictions
- **JSON Format**: Standard response structure
- **Common Rules**: Portuguese language, curriculum alignment
- **Chat Template**: Standard conversation format

## Usage

### Basic RAG Query

```typescript
import { PromptBuilder } from "@/lib/prompts";

// Build a RAG query prompt
const prompt = PromptBuilder.buildRagQuery(context, question);

// Get system prompt
const systemPrompt = PromptBuilder.getSystemPrompt();
```

### Document-Specific Prompts

```typescript
import { LessonPlanPromptBuilder, TestQuizPromptBuilder } from "@/lib/prompts";

// Lesson plan prompts
const lessonPlanSystem = LessonPlanPromptBuilder.getSystemPrompt();
const lessonPlanChat = LessonPlanPromptBuilder.buildChatPrompt(
  content,
  message
);

// Test/quiz prompts
const testSystem = TestQuizPromptBuilder.getSystemPrompt();
const testChat = TestQuizPromptBuilder.buildChatPrompt(content, message);
```

## Adding New Document Types

### 1. Create Specific Instructions

```typescript
// presentation-prompts.ts
const PRESENTATION_SPECIFIC_INSTRUCTIONS = `ESTRUTURA DA APRESENTAÇÃO:
- **Título**: tema, disciplina, público-alvo
- **Objetivos**: o que se pretende transmitir
- **Slides**: organizados por tópicos
  - Introdução e contexto
  - Desenvolvimento dos conceitos
  - Exemplos práticos
  - Conclusões e síntese

INSTRUÇÕES ESPECÍFICAS:
- Inclui sempre elementos visuais e interativos
- Se a pergunta não for sobre apresentações, responde: "Só posso ajudar com apresentações."`;
```

### 2. Use Base Prompt Builder

```typescript
export const PRESENTATION_PROMPTS = {
  SYSTEM_PROMPT: BasePromptBuilder.buildSystemPrompt(
    "apresentações educativas",
    "Só posso ajudar com apresentações.",
    PRESENTATION_SPECIFIC_INSTRUCTIONS
  ),

  CHAT_PROMPT: (currentContent: string, userMessage: string) =>
    BasePromptBuilder.buildChatPrompt(
      "apresentação",
      currentContent,
      userMessage
    ),
};
```

### 3. Create Builder Class

```typescript
export class PresentationPromptBuilder {
  static getSystemPrompt(): string {
    return PRESENTATION_PROMPTS.SYSTEM_PROMPT;
  }

  static buildChatPrompt(currentContent: string, userMessage: string): string {
    return PRESENTATION_PROMPTS.CHAT_PROMPT(currentContent, userMessage);
  }
}
```

### 4. Export from Index

```typescript
// index.ts
export * from "./presentation-prompts";
```

## Benefits of Base System

### ✅ **Reduced Duplication**

- Common safety limitations shared across all types
- Standard JSON format and rules
- Consistent chat template

### ✅ **Easy Maintenance**

- Update safety rules in one place
- Add new common features to base system
- Consistent behavior across all document types

### ✅ **Quick Development**

- New document types require only specific instructions
- Automatic inclusion of all safety features
- Standardized structure and formatting

### ✅ **Consistent Quality**

- All document types have same safety protections
- Standardized response format
- Consistent Portuguese language and curriculum alignment

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

## Best Practices

- Keep specific instructions focused and clear
- Use template literals for dynamic content
- Maintain consistent formatting
- Test prompts with different inputs
- Document any special instructions or constraints
- Balance RAG context priority with model knowledge enhancement
- Leverage base system for common functionality
