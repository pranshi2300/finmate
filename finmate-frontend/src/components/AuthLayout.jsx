import FinanceStickers from "./FinanceStickers";

export default function AuthLayout({ eyebrow, title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-app flex">
      {/* Left panel: ledger texture + identity, hidden on small screens */}
      <div className="hidden lg:flex lg:w-[42%] ledger-bg relative flex-col justify-between p-12 border-r border-hairline">
        <FinanceStickers />
        <div className="relative z-10">
          <span className="font-mono text-signal text-xs tracking-[0.2em] uppercase">FinMate AI</span>
        </div>
        <div className="relative z-10">
          <p className="font-display text-bone text-4xl font-semibold leading-tight">
            Every rupee,<br />accounted for.
          </p>
          <p className="font-body text-bone/75 text-sm mt-4 max-w-xs">
            Track spending, split bills, and let a few quiet agents watch your budget so you don't have to.
          </p>
        </div>
        <p className="relative z-10 font-mono text-bone/75 text-xs">balance · budget · groups</p>
      </div>

      {/* Right panel: the actual form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <span className="font-mono text-signal text-xs tracking-[0.2em] uppercase lg:hidden">
            FinMate AI
          </span>
          <p className="font-mono text-ledger-light text-xs tracking-[0.15em] uppercase mt-6 lg:mt-0">
            {eyebrow}
          </p>
          <h1 className="font-display text-bone text-4xl font-semibold mt-2">{title}</h1>
          {subtitle && <p className="font-body text-bone/70 text-sm mt-2">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
