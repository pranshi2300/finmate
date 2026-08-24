const { createWorker } = require("tesseract.js");

function normalizeText(text) {
  return text
    .replace(/\r/g, "")
    .split(/\n|\r\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseCurrency(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/([₹$€£])?\s*([\d.,]+)/);
  if (!match) return null;
  const currency = match[1] || null;
  let numeric = match[2].replace(/\s/g, "");

  if (numeric.includes(",") && numeric.includes(".")) {
    const lastComma = numeric.lastIndexOf(",");
    const lastDot = numeric.lastIndexOf(".");
    if (lastComma > lastDot) {
      numeric = numeric.replace(/\./g, "").replace(/,/g, ".");
    } else {
      numeric = numeric.replace(/,/g, "");
    }
  } else if (numeric.includes(",")) {
    numeric = numeric.replace(/,/g, ".");
  }

  const amount = Number(numeric);
  if (Number.isNaN(amount)) return null;
  return { amount, currency };
}

function parseTotal(lines) {
  const totalPatterns = [
    /total\s*[:\-]?\s*([₹$€£]?\s*[\d.,]+)/i,
    /amount\s*due\s*[:\-]?\s*([₹$€£]?\s*[\d.,]+)/i,
    /grand\s*total\s*[:\-]?\s*([₹$€£]?\s*[\d.,]+)/i,
    /balance\s*due\s*[:\-]?\s*([₹$€£]?\s*[\d.,]+)/i,
  ];

  for (const line of lines) {
    for (const pattern of totalPatterns) {
      const match = line.match(pattern);
      if (match) {
        const parsed = parseCurrency(match[1]);
        if (parsed) return parsed;
      }
    }
  }

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const parsed = parseCurrency(lines[i]);
    if (parsed) return parsed;
  }

  return null;
}

function parseDate(lines) {
  const patterns = [
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
    /(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/,
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const parsed = Date.parse(match[1]);
        if (!Number.isNaN(parsed)) {
          return new Date(parsed).toISOString();
        }
      }
    }
  }

  return null;
}

function looksLikeAmount(line) {
  return /[₹$€£]?\s*[\d.,]+\s*$/.test(line) && !/[A-Za-z]/.test(line);
}

function parseVendor(lines) {
  if (!lines.length) return null;
  const candidates = lines.filter((line) => {
    const lowered = line.toLowerCase();
    if (!lowered) return false;
    if (/^(receipt|invoice|tax|subtotal|total|balance|amount|due|paid|change|date|card|visa|mastercard|phone?|tel)/.test(lowered)) {
      return false;
    }
    if (/^[\d\s\-\/.,]+$/.test(line)) return false;
    if (looksLikeAmount(line)) return false;
    return true;
  });
  return candidates.length ? candidates[0] : lines[0];
}

function parseItems(lines) {
  const items = [];
  const itemPattern = /^(?<name>.+?)\s+[₹$€£]?\s*(?<price>[\d.,]+)\s*$/;

  for (const line of lines) {
    const match = line.match(itemPattern);
    if (!match || !match.groups) continue;
    const name = match.groups.name.trim();
    const priceData = parseCurrency(match.groups.price);
    if (!name || !priceData) continue;
    if (/total|subtotal|tax|balance|amount due/i.test(name)) continue;
    items.push({ name, price: priceData.amount });
  }

  return items.length ? items : null;
}

/**
 * Perform OCR on a receipt buffer with tesseract.js and parse the text.
 * Returns structured receipt metadata and the raw OCR output.
 */
async function extractReceiptData(buffer) {
  const worker = createWorker({ logger: () => {} });
  await worker.load();
  await worker.loadLanguage("eng");
  await worker.initialize("eng");

  const { data } = await worker.recognize(buffer);
  await worker.terminate();

  const rawText = data.text || "";
  const lines = normalizeText(rawText);
  const vendor = parseVendor(lines);
  const receiptDate = parseDate(lines);
  const totalData = parseTotal(lines);
  const items = parseItems(lines);

  return {
    rawOcrText: rawText,
    vendor,
    receiptDate,
    totalAmount: totalData?.amount ?? null,
    currency: totalData?.currency ?? null,
    taxAmount: null,
    tipAmount: null,
    items,
  };
}

module.exports = { extractReceiptData };
