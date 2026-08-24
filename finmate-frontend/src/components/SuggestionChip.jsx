export default function SuggestionChip({ children, onClick }) {
  return <button type="button" onClick={onClick} className="rounded-full border border-hairline px-3 py-1.5 text-left font-body text-xs text-bone hover:border-signal hover:text-signal transition-colors">{children}</button>;
}
