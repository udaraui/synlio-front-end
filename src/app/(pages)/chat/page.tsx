"use client";

import React, { useState, useRef, useEffect } from "react";
import { BotMessageSquare, Loader2, ArrowRight } from "lucide-react";
import axiosInstance from "@/lib/interceptors/axiosInstance";
import { API_ENDPOINTS } from "@/services/API/api";
import { Button } from "@/components/ui/button";
import { useBreadcrumb } from "@/contexts/breadcrumb.context";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { setBreadcrumbs } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumbs([{ label: "Ask Synlio", href: "/chat", isCurrentPage: true }]);
  }, [setBreadcrumbs]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Connect to the Python FastAPI backend which runs LangGraph
      const response = await axiosInstance.post(API_ENDPOINTS.CHAT, {
        message: userMessage.content,
      });

      const data = response.data;
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: data.response || "hello synlio", // fallback just in case
      };
      
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error communicating with backend:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: "Oops! Something went wrong communicating with the backend. Please ensure the python server is running on port 8000.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-1rem)] w-full bg-background pt-8">
      {/* Messages Area */}
      <div className={`flex-1 overflow-y-auto ${messages.length > 0 ? "p-8 space-y-6" : ""}`}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <BotMessageSquare className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg">How can I help you today?</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex px-0 sm:px-4 md:px-8 lg:px-12 xl:px-16 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex max-w-[80%] items-start gap-3 rounded-2xl px-5 py-1 border ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground flex-row-reverse rounded-tr-sm"
                    : "bg-muted text-foreground rounded-tl-sm"
                }`}
              >
                {/* {msg.role !== "user" && (
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-full bg-background flex items-center justify-center"
                  >
                    <BotMessageSquare className="w-5 h-5" />
                  </div>
                )} */}
                <div className={`flex-1 overflow-hidden ${msg.role !== "user" ? "pt-1" : ""}`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-3 rounded-2xl px-5 py-4 bg-muted text-foreground rounded-tl-sm">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-background flex items-center justify-center">
                <BotMessageSquare className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Synlio is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-background border-t">
        <form
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto relative flex items-end overflow-hidden rounded-full border bg-card focus-within:ring-1 focus-within:ring-primary"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something..."
            className="w-full h-14 bg-transparent px-5 pr-12 text-sm focus:outline-none"
            autoComplete="off"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 h-10 w-10 p-0 rounded-full"
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>
        <div className="text-center mt-2">
          <span className="text-xs text-muted-foreground">
            Synlio AI can make mistakes. Consider verifying important information.
          </span>
        </div>
      </div>
    </div>
  );
}
