import { type ChatHistoryItem, type ChatStreamCallbacks, streamChatMessage } from "@/services/api";
import { fetchUsage } from "@/store/subscription/subscriptionSlice";
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AppDispatch } from "../store";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantState {
  isOpen: boolean;
  isProcessing: boolean;
  messages: Message[];
  hasUnreadMessages: boolean;
  streamingContent: string;
  inputValue: string;
  error: string | null;
}

const initialState: AssistantState = {
  isOpen: false,
  isProcessing: false,
  messages: [],
  hasUnreadMessages: false,
  streamingContent: "",
  inputValue: "",
  error: null,
};

/**
 * Send a message to the assistant with streaming response.
 * This thunk handles the SSE streaming and dispatches actions for each chunk.
 */
export const sendMessage = createAsyncThunk<
  void,
  { message: string; token: string },
  { dispatch: AppDispatch }
>("assistant/sendMessage", async ({ message, token }, { dispatch, getState }) => {
  // Add user message immediately
  dispatch(addUserMessage(message));
  dispatch(startStreaming());

  // Get history from state (all messages EXCEPT the last one we just added)
  const state = getState() as { assistant: AssistantState };
  const history: ChatHistoryItem[] = state.assistant.messages
    .slice(0, -1) // Exclude the current message to avoid duplication
    .map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))
    .slice(-20); // Limit context to last 20 previous messages

  const callbacks: ChatStreamCallbacks = {
    onChunk: (chunk: string) => {
      dispatch(appendStreamChunk(chunk));
    },
    onComplete: (fullResponse: string) => {
      dispatch(completeStreaming(fullResponse));
      // Refetch usage stats after AI interaction
      dispatch(fetchUsage());
    },
    onError: (error: string) => {
      dispatch(streamError(error));
    },
  };

  // Start streaming
  await streamChatMessage(message, history, callbacks, token);
});

const assistantSlice = createSlice({
  name: "assistant",
  initialState,
  reducers: {
    toggleOpen: (state) => {
      state.isOpen = !state.isOpen;
    },
    openPanel: (state) => {
      state.isOpen = true;
    },
    closePanel: (state) => {
      state.isOpen = false;
    },
    setInputValue: (state, action: PayloadAction<string>) => {
      state.inputValue = action.payload;
    },
    clearInput: (state) => {
      state.inputValue = "";
    },
    addUserMessage: (state, action: PayloadAction<string>) => {
      state.messages.push({
        role: "user",
        content: action.payload,
      });
      state.inputValue = "";
      state.error = null;
    },
    startStreaming: (state) => {
      state.isProcessing = true;
      state.streamingContent = "";
    },
    appendStreamChunk: (state, action: PayloadAction<string>) => {
      state.streamingContent += action.payload;
    },
    completeStreaming: (state, action: PayloadAction<string>) => {
      state.messages.push({
        role: "assistant",
        content: action.payload,
      });
      state.streamingContent = "";
      state.isProcessing = false;
      // Set unread if panel is closed
      if (!state.isOpen) {
        state.hasUnreadMessages = true;
      }
    },
    streamError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isProcessing = false;
      state.streamingContent = "";
    },
    markAsRead: (state) => {
      state.hasUnreadMessages = false;
    },
    clearConversation: (state) => {
      state.messages = [];
      state.streamingContent = "";
      state.error = null;
    },
  },
});

export const {
  toggleOpen,
  openPanel,
  closePanel,
  setInputValue,
  clearInput,
  addUserMessage,
  startStreaming,
  appendStreamChunk,
  completeStreaming,
  streamError,
  markAsRead,
  clearConversation,
} = assistantSlice.actions;

export default assistantSlice.reducer;
