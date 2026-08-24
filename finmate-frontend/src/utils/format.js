// Centralized so every amount in the app formats the same way.
// Currency is hardcoded to INR for now — will become a user setting
// when multi-currency support is added later in the roadmap.
export function formatMoney(value) {
  const num = Number(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
