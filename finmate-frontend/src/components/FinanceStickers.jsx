import { Coins, Wallet, PiggyBank, TrendingUp, IndianRupee, Receipt } from "lucide-react";

// Purely decorative — scattered, rotated finance icons sitting behind the
// real content, like stickers on a laptop lid. aria-hidden + pointer-events
// none so they never interfere with layout, clicks, or screen readers.
const STICKERS = [
  { Icon: Coins, top: "6%", left: "3%", rotate: -16, size: 68, colorClass: "text-signal/15" },
  { Icon: Wallet, top: "72%", left: "90%", rotate: 14, size: 76, colorClass: "text-ledger/15" },
  { Icon: PiggyBank, top: "38%", left: "94%", rotate: -10, size: 58, colorClass: "text-bone/10" },
  { Icon: TrendingUp, top: "86%", left: "8%", rotate: 18, size: 62, colorClass: "text-ledger/15" },
  { Icon: IndianRupee, top: "12%", left: "88%", rotate: 22, size: 50, colorClass: "text-signal/15" },
  { Icon: Receipt, top: "58%", left: "1%", rotate: -14, size: 54, colorClass: "text-bone/10" },
];

export default function FinanceStickers() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {STICKERS.map(({ Icon, top, left, rotate, size, colorClass }, idx) => (
        <Icon
          key={idx}
          className={colorClass}
          strokeWidth={1.5}
          style={{
            position: "absolute",
            top,
            left,
            width: size,
            height: size,
            transform: `rotate(${rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
