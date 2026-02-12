import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage, ConversationMessage } from "@/types/chat";

export function useChatHistory() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [convHistory, setConvHistory] = useState<ConversationMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 50);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const addToConvHistory = useCallback((role: "user" | "assistant", content: string) => {
    setConvHistory((prev) => {
      const next = [...prev, { role, content }];
      return next.slice(-20);
    });
  }, []);

  return {
    messages,
    setMessages,
    addMessage,
    convHistory,
    setConvHistory,
    addToConvHistory,
    streamingText,
    setStreamingText,
    scrollRef,
    scrollToBottom,
  };
}
