"use client";

import { ChatBubble } from "@/components/ChatBubble";

type ErrorBubbleProps = {
  message: string;
};

export function ErrorBubble({ message }: ErrorBubbleProps) {
  return <ChatBubble role="assistant" content={message} error />;
}
