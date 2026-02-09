"use client";

import {
  clearConversation,
  closePanel,
  markAsRead,
  selectHasUnreadMessages,
  selectInputValue,
  selectIsOpen,
  selectIsProcessing,
  selectMessages,
  selectStreamingContent,
  sendMessage,
  setInputValue,
  toggleOpen,
} from "@/store/assistant";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect } from "react";
import { AssistantButton } from "./AssistantButton";
import { AssistantPanel } from "./AssistantPanel";

/**
 * Provider component that renders the floating assistant button and panel.
 * Should be placed in the main layout to be available on all pages.
 */
export function AssistantProvider() {
  const dispatch = useAppDispatch();
  const { getToken } = useAuth();

  // Selectors
  const isOpen = useAppSelector(selectIsOpen);
  const isProcessing = useAppSelector(selectIsProcessing);
  const messages = useAppSelector(selectMessages);
  const streamingContent = useAppSelector(selectStreamingContent);
  const hasUnread = useAppSelector(selectHasUnreadMessages);
  const inputValue = useAppSelector(selectInputValue);

  // Mark messages as read when panel opens
  useEffect(() => {
    if (isOpen && hasUnread) {
      dispatch(markAsRead());
    }
  }, [isOpen, hasUnread, dispatch]);

  const handleToggle = useCallback(() => {
    dispatch(toggleOpen());
  }, [dispatch]);

  const handleClose = useCallback(() => {
    dispatch(closePanel());
  }, [dispatch]);

  const handleClear = useCallback(() => {
    dispatch(clearConversation());
  }, [dispatch]);

  const handleInputChange = useCallback(
    (value: string) => {
      dispatch(setInputValue(value));
    },
    [dispatch]
  );

  const handleSubmit = useCallback(async () => {
    const message = inputValue.trim();
    if (!message || isProcessing) return;

    try {
      const token = await getToken();
      if (!token) {
        console.error("No auth token available");
        return;
      }
      dispatch(sendMessage({ message, token }));
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }, [inputValue, isProcessing, getToken, dispatch]);

  return (
    <>
      <AssistantButton
        onClick={handleToggle}
        isProcessing={isProcessing}
        hasUnread={hasUnread}
      />
      <AssistantPanel
        isOpen={isOpen}
        onClose={handleClose}
        onClear={handleClear}
        messages={messages}
        isProcessing={isProcessing}
        streamingContent={streamingContent}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
      />
    </>
  );
}
