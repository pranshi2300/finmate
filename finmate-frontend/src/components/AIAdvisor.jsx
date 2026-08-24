import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import ChatMessage from './ChatMessage';
import SuggestionChip from './SuggestionChip';
import TypingIndicator from './TypingIndicator';
import ConversationSidebar from './ConversationSidebar';

const INITIAL_SUGGESTIONS = ['How can I reduce my expenses?', 'What is my biggest spending category?', 'Can I afford a ₹20,000 laptop?', 'How much can I save next month?', 'Which subscriptions are unnecessary?', 'Explain my forecast.'];

export default function AIAdvisor() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [suggestions, setSuggestions] = useState(INITIAL_SUGGESTIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  async function sendMessage(value = draft) {
    const message = value.trim();
    if (!message || loading) return;
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, { role: 'user', content: message }]);
    setDraft(''); setError(''); setLoading(true);
    try {
      const { data } = await api.post('/ai/chat', { message, conversationHistory: history });
      setMessages((current) => [...current, { role: 'assistant', content: data.reply, confidence: data.confidence, sources: data.sources }]);
      setSuggestions(data.suggestions || INITIAL_SUGGESTIONS);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'I could not load your financial advice. Please try again.');
    } finally { setLoading(false); }
  }

  return <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-5">
    <ConversationSidebar messages={messages} onClear={() => { setMessages([]); setError(''); }} />
    <section className="border border-hairline rounded-xl p-5 card-surface flex flex-col min-h-[600px]">
      <div><p className="font-mono text-xs text-ledger-light uppercase">AI financial advisor</p><h1 className="font-display text-3xl text-bone mt-1">Ask about your money</h1><p className="font-body text-sm text-bone/70 mt-1">Answers use your FinMate analytics, forecasts, budgets, merchants, and subscriptions.</p></div>
      <div className="flex-1 mt-6 space-y-3 overflow-y-auto max-h-[460px] pr-1">
        {!messages.length && <p className="font-body text-sm text-bone/65">Start with one of the suggested questions below.</p>}
        {messages.map((message, index) => <ChatMessage key={`${message.role}-${index}`} message={message} />)}
        {loading && <TypingIndicator />}<div ref={bottomRef} />
      </div>
      {error && <p className="mt-3 rounded-xl border border-signal/30 bg-signal/10 px-3 py-2 font-body text-sm text-signal">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">{suggestions.slice(0, 6).map((suggestion) => <SuggestionChip key={suggestion} onClick={() => sendMessage(suggestion)}>{suggestion}</SuggestionChip>)}</div>
      <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}><input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000} placeholder="Ask about spending, a purchase, or your forecast…" className="min-w-0 flex-1 rounded-xl border border-hairline bg-ink/80 px-3 py-2 text-sm text-bone" /><button disabled={loading || !draft.trim()} className="rounded-xl bg-ledger px-4 py-2 font-display text-sm text-white disabled:opacity-50">Send</button></form>
    </section>
  </div>;
}
