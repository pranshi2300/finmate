export default function ConversationSidebar({ messages, onClear }) {
  const recentQuestions = messages.filter((message) => message.role === 'user').slice(-5).reverse();
  return <aside className="border border-hairline rounded-xl p-4 card-surface h-fit">
    <div className="flex justify-between items-center gap-3"><p className="font-mono text-xs text-bone/65 uppercase">Conversation</p><button type="button" onClick={onClear} className="font-mono text-xs text-signal hover:underline">Clear</button></div>
    <div className="mt-3 space-y-2">{recentQuestions.length ? recentQuestions.map((message, index) => <p key={`${message.content}-${index}`} className="font-body text-xs text-bone/75 line-clamp-2">{message.content}</p>) : <p className="font-body text-xs text-bone/65">Your questions will appear here for this session.</p>}</div>
  </aside>;
}
