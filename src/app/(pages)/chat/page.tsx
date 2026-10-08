"use client";

import React, { useState, useRef, useEffect } from "react";
import { BotMessageSquare, ArrowRight } from "lucide-react";
import { chatService } from "@/services/chat/chat.service";
import { Button } from "@/components/ui/button";
import { useBreadcrumb } from "@/contexts/breadcrumb.context";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CalendarDays, AlertTriangle } from "lucide-react";
import {
  InlineEditableStatus,
  InlineEditableSeverity,
  InlineEditableQueue,
  InlineEditableTicketType,
  InlineEditableAssignee,
} from "@/app/(pages)/ticket-management/ticket/components/InlineEditableTicketComponents";
import {
  InlineEditableTaskHierarchyLevel,
} from "@/app/(pages)/task-management/task/components/InlineEditableTaskComponents";

// Helper to extract plain text from React nodes
const extractText = (children: any): string => {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (children?.props?.children) return extractText(children.props.children);
  return '';
};

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  isThinking?: boolean;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

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
      // Connect to the NestJS proxy backend which pipes the FastAPI stream via chatService
      const response = await chatService.streamChat(userMessage.content);

      // Setup the initial AI message
      const aiMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: aiMessageId, role: "ai", content: "", isThinking: true },
      ]);

      setIsLoading(false);

      // Read the stream
      const reader = response.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done && reader) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });

          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === aiMessageId) {
                if (chunk.includes("__FINAL__")) {
                  return { ...msg, content: chunk.split("__FINAL__").pop() || "", isThinking: false };
                }
                if (chunk.includes("__REPLACE__")) {
                  return { ...msg, content: chunk.split("__REPLACE__").pop() || "", isThinking: true };
                }
                return { ...msg, content: msg.content + chunk };
              }
              return msg;
            })
          );
        }
      }
    } catch (error) {
      console.error("Error communicating with backend:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: "Oops! Something went wrong communicating with the backend. Please ensure the server is running.",
      };
      setMessages((prev) => [...prev, errorMessage]);
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
              {msg.role === "user" ? (
                <div
                  className="flex max-w-[80%] items-start gap-3 rounded-2xl px-5 py-2 border bg-primary text-primary-foreground flex-row-reverse rounded-tr-xs"
                >
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <div className="flex max-w-4xl items-start gap-3 w-full text-foreground py-1">
                  <div className="flex-1 overflow-hidden">
                    {msg.isThinking ? (
                      <div className="flex items-center gap-2 pt-1 pb-1">
                        <div className="relative flex h-2 w-2 ml-1 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </div>
                        <span className="text-sm text-muted-foreground">{msg.content}</span>
                      </div>
                    ) : (
                      <div className="text-sm leading-relaxed max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            table: ({ node, ...props }) => <div className="overflow-x-auto my-4 rounded-xl border border-border overflow-hidden"><table className="w-full text-sm border-separate border-spacing-0" {...props} /></div>,
                            thead: ({ node, ...props }) => <thead className="bg-muted/50 text-left" {...props} />,
                            tr: ({ node, ...props }) => <tr className="last:[&>td]:border-b-0" {...props} />,
                            th: ({ node, ...props }) => <th className="border-b border-r last:border-r-0 border-border px-4 py-3 font-medium text-foreground bg-muted/50" {...props} />,
                            td: ({ node, children, ...props }) => {
                              const text = extractText(children).trim();
                              
                              const match = text.match(/^\{\{(.*?)::(.*?)::(.*?)::(.*?)\}\}$/);
                              
                              if (text.startsWith('{{') && !match) {
                                return (
                                  <td className="border-b border-r last:border-r-0 border-border px-4 py-3 align-middle" {...props}>
                                    <div className="w-20 h-6 rounded-md bg-muted animate-pulse"></div>
                                  </td>
                                );
                              }

                              const baseProps = {
                                readonly: true,
                                ticketId: 0,
                                taskId: 0,
                              };

                              let component = null;

                              if (match) {
                                const [_, type, name, color, icon] = match;
                                if (type === 'Status') {
                                  component = <InlineEditableStatus status={{ name, color, icon }} statuses={[]} {...baseProps} />;
                                } else if (type === 'Severity' || type === 'Priority') {
                                  component = <InlineEditableSeverity severity={{ name, color, icon }} severities={[]} {...baseProps} />;
                                } else if (type === 'Type') {
                                  component = <InlineEditableTicketType ticketType={{ name, color, icon }} types={[]} getIconComponent={() => null as any} {...baseProps} />;
                                } else if (type === 'Queue') {
                                  component = <InlineEditableQueue queue={{ name, color, icon }} queues={[]} {...baseProps} />;
                                } else if (type === 'Hierarchy') {
                                  component = <InlineEditableTaskHierarchyLevel hierarchyLevel={{ name, color, icon }} hierarchyLevels={[]} {...baseProps} />;
                                }
                              } else {
                                // Fallback heuristics using the SAME inline components
                                const isStatus = ['To Do', 'Open', 'In Progress', 'Completed', 'Finished', 'Processing', 'Closed'].includes(text);
                                if (isStatus) {
                                  let hexColor = "#9ca3af"; // Gray-400
                                  if (['Completed', 'Finished', 'Closed'].includes(text)) hexColor = "#22c55e"; // Green-500
                                  else if (['In Progress', 'Processing'].includes(text)) hexColor = "#3b82f6"; // Blue-500
                                  
                                  component = <InlineEditableStatus status={{ name: text, color: hexColor }} statuses={[]} {...baseProps} />;
                                }
                                
                                const isSeverity = ['Low', 'Medium', 'High', 'Critical'].includes(text) || /^(100|70|50|30)$/.test(text);
                                if (isSeverity && !component) {
                                  let hexColor = "#22c55e"; // Green-500
                                  if (text === 'Medium' || text === '70' || text === '50') hexColor = "#eab308"; // Yellow-500
                                  if (['High', 'Critical', '100'].includes(text)) hexColor = "#ef4444"; // Red-500
                                  
                                  component = <InlineEditableSeverity severity={{ name: text, color: hexColor }} severities={[]} {...baseProps} />;
                                }
                                
                                const isQueue = ['Default', 'Pulse'].includes(text);
                                if (isQueue && !component) {
                                  component = <InlineEditableQueue queue={{ name: text }} queues={[]} {...baseProps} />;
                                }
                                
                                const isName = ['Kasun', 'Reshan', 'Prabash', 'Malith', 'KA', 'RE', 'PB', 'MJ'].includes(text);
                                if (isName && !component) {
                                  const initials = /^[A-Z]{2}$/.test(text) ? text : text.substring(0, 2).toUpperCase();
                                  component = <InlineEditableAssignee assignee={{ first_name: initials, last_name: "" }} members={[]} {...baseProps} />;
                                }
                                
                                const dateMatch = text.match(/^(\d{4}-\d{2}-\d{2})$/);
                                if (dateMatch && !component) {
                                  const dateStr = dateMatch[1];
                                  // Add time to avoid timezone issues parsing YYYY-MM-DD
                                  const dateObj = new Date(dateStr + "T12:00:00Z");
                                  const isOverdue = dateObj < new Date();
                                  
                                  const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
                                  
                                  return (
                                    <td className="border-b border-r last:border-r-0 border-border px-4 py-3 align-middle" {...props}>
                                      <div className="pointer-events-none flex items-center">
                                        <button
                                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-transparent border rounded-md text-xs font-medium whitespace-nowrap cursor-pointer ${isOverdue ? 'border-red-500 text-gray-700 dark:text-gray-300' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
                                        >
                                          {isOverdue ? <AlertTriangle className="w-3 h-3 shrink-0 text-red-500" /> : <CalendarDays className="w-3 h-3 shrink-0" />}
                                          {formattedDate}
                                        </button>
                                      </div>
                                    </td>
                                  );
                                }
                                
                                if (!component && (text === 'N/A' || text === '' || text === 'None' || text === 'null')) {
                                  return (
                                    <td className="border-b border-r last:border-r-0 border-border px-4 py-3 align-middle" {...props}>
                                      <div className="pointer-events-none flex items-center">
                                        <div className="inline-flex items-center justify-center px-2 py-0.5 bg-transparent border border-dashed rounded-md text-xs font-medium whitespace-nowrap border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                                          N/A
                                        </div>
                                      </div>
                                    </td>
                                  );
                                }
                                
                                // Ticket/Task Code Check (e.g. SWT-P8, SSD-50)
                                if (!component && /^[A-Z]+-[A-Z0-9]+(-[A-Z0-9]+)*$/.test(text) && text.length > 3) {
                                  return (
                                    <td className="border-b border-r last:border-r-0 border-border px-4 py-3 align-middle" {...props}>
                                      <span className="text-blue-500 font-medium text-xs">{text}</span>
                                    </td>
                                  );
                                }
                              }

                              if (component) {
                                return (
                                  <td className="border-b border-r last:border-r-0 border-border px-4 py-3 align-middle" {...props}>
                                    <div className="pointer-events-none flex items-center">{component}</div>
                                  </td>
                                );
                              }
                              
                              return <td className="border-b border-r last:border-r-0 border-border px-4 py-3 align-middle" {...props}>{children}</td>;
                            },
                            p: ({ node, ...props }) => <p className="mb-4 last:mb-0 whitespace-pre-wrap" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
                            h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4 text-foreground" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-xl font-semibold mt-6 mb-3 text-foreground" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-lg font-medium mt-5 mb-2 text-foreground" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc list-outside mb-4 pl-5 space-y-2" {...props} />,
                            ol: ({ node, ...props }) => <ol className="list-decimal list-outside mb-4 pl-5 space-y-2" {...props} />,
                            li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                            a: ({ node, ...props }) => <a className="text-primary hover:underline" {...props} />,
                            code: ({ node, inline, ...props }: any) =>
                              inline ? (
                                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary" {...props} />
                              ) : (
                                <code className="block bg-muted p-4 rounded-lg text-sm font-mono my-4 overflow-x-auto text-primary" {...props} />
                              ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex px-0 sm:px-4 md:px-8 lg:px-12 xl:px-16 justify-start">
            <div className="flex max-w-4xl items-start gap-3 w-full text-foreground py-1">
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2 pt-1 pb-1">
                  <div className="relative flex h-2 w-2 ml-1 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </div>
                  <span className="text-sm text-muted-foreground">Synlio is thinking</span>
                </div>
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
          className="max-w-4xl mx-auto relative flex items-end overflow-hidden rounded-[24px] border border-input bg-card focus-within:ring-1 focus-within:ring-primary"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
            placeholder="Ask something..."
            className="w-full min-h-[56px] max-h-[200px] py-[18px] bg-transparent dark:bg-gray-900 px-5 pr-14 text-sm focus:outline-none resize-none overflow-y-auto"
            rows={1}
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
