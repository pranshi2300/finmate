const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function normalizeMerchantName(value) {
  if (!value || typeof value !== "string") return "unknown";

  const simplified = value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[‘’“”]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(store|mart|supermarket|shop|outlet|market|pharmacy|bakery|cafe|restaurant|foods|food|ltd|inc|co|pvt)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return simplified || value.toLowerCase().trim();
}

function monthKey(date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date) {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function buildMonthBuckets(months, endDate = new Date()) {
  const labels = [];
  const end = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));
  for (let i = months - 1; i >= 0; i -= 1) {
    const bucket = new Date(end);
    bucket.setUTCMonth(bucket.getUTCMonth() - i);
    labels.push({ key: monthKey(bucket), label: monthLabel(bucket), date: bucket.toISOString() });
  }
  return labels;
}

function buildDayBuckets(days, endDate = new Date()) {
  const buckets = [];
  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(end);
    day.setUTCDate(end.getUTCDate() - i);
    day.setUTCHours(0, 0, 0, 0);
    buckets.push(day);
  }
  return buckets;
}

function median(values) {
  const arr = [...values].sort((a, b) => a - b);
  const len = arr.length;
  if (!len) return 0;
  const mid = Math.floor(len / 2);
  return len % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values) {
  if (!values.length) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, x) => sum + Math.pow(x - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

module.exports = {
  WEEKDAY_LABELS,
  normalizeMerchantName,
  monthKey,
  monthLabel,
  buildMonthBuckets,
  buildDayBuckets,
  median,
  mean,
  stdDev,
  clamp,
};
