"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import MarkdownViewer from '../_components/MarkdownViewer'

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
        console.log(userMessage.content)
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMessage.content }),
      });

      const data = await res.json();

      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.answer ?? "No response from backend.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 2, role: "assistant", content: "⚠️ Error fetching response." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-gray-100">
      {/* Header */}
      <header className="p-4 border-b border-neutral-800 bg-neutral-950 shadow-md">
        <h1 className="text-xl font-bold text-center text-gray-200">
          RAG Chat Assistant
        </h1>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
  <div
    key={m.id}
    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
  >
    <div
      className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-md ${
        m.role === "user"
          ? "bg-purple-600 text-white rounded-br-none"
          : "bg-gray-800 text-gray-200 rounded-bl-none"
      }`}
    >
      <MarkdownViewer content={m.content} />
    </div>
  </div>
))}


        {loading && (
          <p className="text-gray-500 animate-pulse">Assistant is thinking...</p>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-gray-800 bg-gray-900 flex items-center space-x-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          className="flex-1 p-3 rounded-xl bg-neutral-900 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-gray-100 text-gray-900 hover:bg-gray-300 disabled:opacity-50 transition"
        >
          Query
        </button>
      </form>
    </div>
  );
}
