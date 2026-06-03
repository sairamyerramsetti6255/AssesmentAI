import { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { Button } from './ui/Button';
import { api } from '@/lib/api';

interface ChatbotProps {
  assessmentId?: string;
}

export function Chatbot({ assessmentId }: ChatbotProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const res = await api.chat(userMsg, assessmentId);
      setMessages((m) => [...m, { role: 'assistant', content: res.message.content }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, I could not process that request.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg hover:opacity-90"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[420px] w-[360px] flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="font-semibold">AI Assistant</span>
            <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-slate-500">Ask me about assessments, sessions, or proposals.</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`rounded-lg px-3 py-2 text-sm ${m.role === 'user' ? 'ml-8 bg-brand-soft-light text-brand-navy' : 'mr-8 bg-brand-cream text-brand-navy'}`}>
                {m.content}
              </div>
            ))}
            {loading && <div className="text-sm text-slate-400">Thinking...</div>}
          </div>
          <div className="flex gap-2 border-t p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Type a message..."
              className="flex-1 rounded-lg border px-3 py-2 text-sm"
            />
            <Button size="sm" onClick={send} disabled={loading}><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </>
  );
}
