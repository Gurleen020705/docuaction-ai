import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios.js";

const ChatPanel = ({ documentId, initialHistory }) => {
  const [history, setHistory] = useState(initialHistory || []);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    setHistory((prev) => [...prev, { role: "user", content: trimmed }]);
    setMessage("");
    setSending(true);

    try {
      const { data } = await api.post(`/documents/${documentId}/chat`, { message: trimmed });
      setHistory(data.chatHistory);
    } catch (err) {
      toast.error(err.response?.data?.message || "Chat failed.");
      setHistory((prev) => prev.slice(0, -1)); // roll back optimistic user message
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card flex flex-col h-[500px]">
      <div className="p-4 border-b border-slate-100 flex items-center gap-2">
        <MessageSquare size={18} className="text-brand-600" />
        <h3 className="font-semibold text-slate-900">Ask about this document</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 && (
          <p className="text-sm text-slate-400 text-center mt-10">
            Ask anything — e.g. "What's the deadline?" or "Do I qualify for this?"
          </p>
        )}
        {history.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="h-7 w-7 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">
                <Bot size={14} />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-brand-600 text-white rounded-br-sm"
                  : "bg-slate-100 text-slate-800 rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                <User size={14} />
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="flex gap-2 justify-start">
            <div className="h-7 w-7 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">
              <Bot size={14} />
            </div>
            <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3.5 py-2">
              <Loader2 size={14} className="animate-spin text-slate-500" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-slate-100 flex gap-2">
        <input
          className="input"
          placeholder="Type a question…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={sending}
        />
        <button type="submit" disabled={sending || !message.trim()} className="btn-primary shrink-0">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
