import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage, ConversationMessage } from "@/types/chat";

export function useChatHistory() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [convHistory, setConvHistory] = useState<ConversationMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // ref를 즉시 동기화하여 stale closure 방지 (BUG 2, 8)
  const convHistoryRef = useRef<ConversationMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 50);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  // ref를 먼저 동기적으로 업데이트 → setState는 그 뒤
  const addMessage = useCallback((msg: ChatMessage) => {
    const next = [...messagesRef.current, msg];
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const addToConvHistory = useCallback((role: "user" | "assistant", content: string) => {
    const next = [...convHistoryRef.current, { role, content }].slice(-20);
    convHistoryRef.current = next;
    setConvHistory(next);
  }, []);

  // setMessages/setConvHistory 직접 호출 시에도 ref 동기화
  const setMessagesAndRef = useCallback((updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    const next = typeof updater === "function" ? updater(messagesRef.current) : updater;
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const setConvHistoryAndRef = useCallback((updater: ConversationMessage[] | ((prev: ConversationMessage[]) => ConversationMessage[])) => {
    const next = typeof updater === "function" ? updater(convHistoryRef.current) : updater;
    convHistoryRef.current = next;
    setConvHistory(next);
  }, []);

  return {
    messages,
    setMessages: setMessagesAndRef,
    addMessage,
    convHistory,
    setConvHistory: setConvHistoryAndRef,
    addToConvHistory,
    convHistoryRef,
    messagesRef,
    streamingText,
    setStreamingText,
    scrollRef,
    scrollToBottom,
  };
}
