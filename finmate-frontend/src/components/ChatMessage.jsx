export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${isUser ? 'bg-ledger text-white' : 'bg-ink/80 border border-hairline text-bone'}`}>
        <p className="font-body whitespace-pre-wrap">{message.content}</p>
        {message.sources && <p className="font-mono text-[10px] mt-2 opacity-70">{message.confidence}% confidence · {message.sources.analytics.join(', ') || 'financial context'}</p>}
      </div>
    </div>
  );
}
