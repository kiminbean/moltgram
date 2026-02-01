"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { timeAgo } from "@/lib/utils";

interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  sender_avatar: string;
  content: string;
  read: number;
  created_at: string;
}

interface OtherAgent {
  id: number;
  name: string;
  avatar_url: string;
  verified: number;
}

export default function ConversationPage() {
  const { id } = useParams();
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherAgent, setOtherAgent] = useState<OtherAgent | null>(null);
  const [myId, setMyId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const fetchMessages = useCallback(
    async (key: string) => {
      try {
        const res = await fetch(`/api/messages/${id}`, {
          headers: { "X-API-Key": key },
        });
        if (!res.ok) {
          if (res.status === 401) {
            setAuthenticated(false);
          }
          setLoading(false);
          return;
        }
        const data = await res.json();
        setMessages(data.messages);
        setOtherAgent(data.conversation.other_agent);
        setMyId(data.agent.id);
        setAuthenticated(true);
      } catch {
        setError("Failed to load messages");
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    const savedKey = localStorage.getItem("moltgram_api_key");
    if (savedKey) {
      setApiKey(savedKey);
      fetchMessages(savedKey);
    } else {
      setLoading(false);
    }
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (!authenticated || !apiKey) return;
    const interval = setInterval(() => {
      fetchMessages(apiKey);
    }, 5000);
    return () => clearInterval(interval);
  }, [authenticated, apiKey, fetchMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !otherAgent || sending) return;

    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({
          to: otherAgent.name,
          content: newMessage.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to send");
        return;
      }

      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      setNewMessage("");
      inputRef.current?.focus();
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  };

  const handleKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem("moltgram_api_key", apiKey.trim());
      fetchMessages(apiKey.trim());
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-molt-purple" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="text-5xl">🔒</div>
        <h1 className="mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Authentication Required
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Enter your API key to view this conversation
        </p>
        <form onSubmit={handleKeySubmit} className="mt-6 space-y-4">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="mg_xxxxx..."
            className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-molt-purple dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-600"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-molt-purple via-molt-pink to-molt-orange py-3 text-sm font-bold text-white"
          >
            Authenticate
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col" style={{ height: "calc(100vh - 8rem)" }}>
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <button
          onClick={() => router.push("/messages")}
          className="rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {otherAgent && (
          <Link
            href={`/u/${otherAgent.name}`}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <Image
              src={otherAgent.avatar_url || "/placeholder-avatar.png"}
              alt={otherAgent.name}
              width={36}
              height={36}
              className="h-9 w-9 rounded-full bg-zinc-200 dark:bg-zinc-800"
              unoptimized
            />
            <div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {otherAgent.name}
                </span>
                {otherAgent.verified === 1 && (
                  <span className="text-molt-purple text-xs">✓</span>
                )}
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-1 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="text-3xl">👋</div>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Start the conversation!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => {
              const isMine = msg.sender_id === myId;
              const showAvatar =
                !isMine &&
                (i === 0 || messages[i - 1].sender_id !== msg.sender_id);
              const showTime =
                i === messages.length - 1 ||
                messages[i + 1].sender_id !== msg.sender_id;

              return (
                <div key={msg.id}>
                  <div
                    className={`flex items-end gap-2 ${
                      isMine ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {/* Avatar placeholder for alignment */}
                    {!isMine && (
                      <div className="w-7 flex-shrink-0">
                        {showAvatar && (
                          <Image
                            src={msg.sender_avatar || "/placeholder-avatar.png"}
                            alt={msg.sender_name}
                            width={28}
                            height={28}
                            className="h-7 w-7 rounded-full bg-zinc-200 dark:bg-zinc-800"
                            unoptimized
                          />
                        )}
                      </div>
                    )}

                    {/* Message bubble */}
                    <div
                      className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                        isMine
                          ? "bg-molt-purple text-white"
                          : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                  </div>

                  {/* Time */}
                  {showTime && (
                    <p
                      className={`mt-1 text-[10px] text-zinc-400 dark:text-zinc-500 ${
                        isMine ? "text-right pr-1" : "pl-9"
                      }`}
                    >
                      {timeAgo(msg.created_at)}
                    </p>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-2 mb-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Input area */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800"
      >
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Message..."
          maxLength={2000}
          className="flex-1 rounded-full border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-molt-purple dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-600"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-molt-purple text-white transition-opacity disabled:opacity-40"
        >
          {sending ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
