const PRIORITY_CLASSES = {
  critical: 'border-signal bg-signal/15',
  high: 'border-signal/60 bg-signal/10',
  medium: 'border-hairline bg-ink/80',
  low: 'border-hairline bg-white/20',
};

export default function RecommendationCard({ recommendation, text }) {
  const item = recommendation || (typeof text === 'object' ? text : null);
  if (!item) {
    return <div className="rounded-xl bg-ink/80 p-4 border border-hairline"><p className="font-body text-sm text-bone">{text}</p></div>;
  }

  return (
    <article className={`rounded-xl p-4 border ${PRIORITY_CLASSES[item.priority] || PRIORITY_CLASSES.low}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-base text-bone">{item.title}</p>
        <span className="font-mono text-[10px] uppercase text-bone/65">{item.priority}</span>
      </div>
      <p className="font-body text-sm text-bone/80 mt-1">{item.description}</p>
      {item.confidence !== undefined && <p className="font-mono text-[10px] text-bone/60 mt-2">{item.confidence}% confidence</p>}
    </article>
  );
}
