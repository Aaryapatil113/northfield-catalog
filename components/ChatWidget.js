'use client';

import { useEffect, useRef, useState } from 'react';
import { trackEvent } from '@/lib/analytics';

const GREETING = {
  role: 'assistant',
  content: 'Hi! Ask me anything about our products, like “what’s good for a cold overnight?”',
  local: true, // display-only; never sent to the API
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, loading]);

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setError('');
    setLoading(true);

    // Send length/turn, never the message text itself (avoid putting PII in GA).
    trackEvent('chat_message_sent', {
      message_length: text.length,
      turn: next.filter((m) => m.role === 'user').length,
    });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.filter((m) => !m.local).map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setMode(data.mode);
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div
          role="dialog"
          aria-label="Product assistant"
          className="mb-3 flex h-[28rem] w-[min(22rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-lg border border-pine/20 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between bg-pine px-4 py-3 text-birch">
            <span className="font-display font-semibold">Ask about our gear</span>
            <button onClick={() => setOpen(false)} aria-label="Close assistant" className="px-1 text-xl leading-none">
              ×
            </button>
          </div>
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm" aria-live="polite">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === 'user'
                    ? 'ml-8 rounded-md bg-pine px-3 py-2 text-birch'
                    : 'mr-8 whitespace-pre-wrap rounded-md bg-birch px-3 py-2'
                }
              >
                {m.content}
              </div>
            ))}
            {loading && <div className="mr-8 rounded-md bg-birch px-3 py-2 text-stone">Thinking…</div>}
            {error && <div className="rounded-md bg-red-50 px-3 py-2 text-red-800">{error}</div>}
          </div>
          {mode && (
            <p className="border-t border-pine/10 px-4 py-1.5 text-xs text-stone">
              {mode === 'claude' ? 'Answers by Claude, using our catalog' : 'Answers from catalog search'}
            </p>
          )}
          <form onSubmit={send} className="flex gap-2 border-t border-pine/15 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1000}
              placeholder="Type a question"
              aria-label="Your question"
              className="flex-1 rounded-md border border-pine/30 px-3 py-2 text-sm focus:outline-none focus-visible:border-pine"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-md bg-pine px-4 py-2 text-sm font-semibold text-birch disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="ml-auto block rounded-full bg-signal px-5 py-3 font-semibold text-ink shadow-lg"
      >
        {open ? 'Close' : 'Ask a question'}
      </button>
    </div>
  );
}
