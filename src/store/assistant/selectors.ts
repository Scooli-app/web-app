import type { RootState } from "@/store/store";
import { createSelector } from "@reduxjs/toolkit";

/** Select the entire assistant state */
const selectAssistantState = (state: RootState) => state.assistant;

/** Is the assistant panel open? */
export const selectIsOpen = createSelector(
  selectAssistantState,
  (assistant) => assistant.isOpen
);

/** Is the assistant currently processing a message? */
export const selectIsProcessing = createSelector(
  selectAssistantState,
  (assistant) => assistant.isProcessing
);

/** Get all messages in the conversation */
export const selectMessages = createSelector(
  selectAssistantState,
  (assistant) => assistant.messages
);

/** Get the current streaming content (partial response) */
export const selectStreamingContent = createSelector(
  selectAssistantState,
  (assistant) => assistant.streamingContent
);

/** Are there unread messages from the assistant? */
export const selectHasUnreadMessages = createSelector(
  selectAssistantState,
  (assistant) => assistant.hasUnreadMessages
);

/** Get the current input value */
export const selectInputValue = createSelector(
  selectAssistantState,
  (assistant) => assistant.inputValue
);

/** Get the current error message */
export const selectError = createSelector(
  selectAssistantState,
  (assistant) => assistant.error
);

/** Is the conversation empty? */
export const selectIsEmpty = createSelector(
  selectMessages,
  (messages) => messages.length === 0
);

/** Get the message count */
export const selectMessageCount = createSelector(
  selectMessages,
  (messages) => messages.length
);
