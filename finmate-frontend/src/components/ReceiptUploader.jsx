import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import api from "../api/axios";

const CATEGORY_OPTIONS = [
  "Food",
  "Transport",
  "Rent",
  "Bills",
  "Shopping",
  "Health",
  "Entertainment",
  "Salary",
  "Other",
];

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function formatDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export default function ReceiptUploader({ onConverted }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewType, setPreviewType] = useState("image");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState("idle");
  const [receipt, setReceipt] = useState(null);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      merchant: "",
      amount: "",
      date: formatDateInput(new Date().toISOString()),
      category: "",
      note: "",
    },
  });

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    setPreviewType(selectedFile.type.startsWith("image/") ? "image" : "pdf");

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  useEffect(() => {
    if (!receipt) return;

    setValue("merchant", receipt.ocr.vendor || "");
    setValue("amount", receipt.ocr.totalAmount ? Number(receipt.ocr.totalAmount).toFixed(2) : "");
    setValue("date", formatDateInput(receipt.ocr.receiptDate || new Date().toISOString()));
    setValue("category", "");
    setValue("note", "");
  }, [receipt, setValue]);

  function resetUploader() {
    setSelectedFile(null);
    setReceipt(null);
    setStatus("idle");
    setUploadProgress(0);
    setServerError("");
    setSuccessMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    reset({
      merchant: "",
      amount: "",
      date: formatDateInput(new Date().toISOString()),
      category: "",
      note: "",
    });
  }

  function handleFile(file) {
    if (!file) return;
    setServerError("");
    setSuccessMessage("");
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setServerError("Only JPEG, PNG, and PDF files are allowed.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setServerError("Receipt must be 5 MB or smaller.");
      return;
    }

    setSelectedFile(file);
    setReceipt(null);
    setStatus("ready");
    setUploadProgress(0);
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] ?? null;
    if (file) {
      handleFile(file);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0] ?? null;
    if (file) {
      handleFile(file);
    }
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleDropKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  }

  async function handleUpload() {
    if (!selectedFile) {
      setServerError("Select a receipt file first.");
      return;
    }

    setServerError("");
    setSuccessMessage("");
    setStatus("uploading");
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("receiptImage", selectedFile);

    try {
      const { data } = await api.post("/receipts", formData, {
        onUploadProgress(event) {
          if (event.total) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        },
      });

      setReceipt(data);
      setStatus("review");
      setUploadProgress(100);
    } catch (err) {
      setStatus("idle");
      setReceipt(null);
      if (err.response?.status === 401) {
        setServerError("Session expired. Please sign in again.");
      } else if (err.response?.data?.error) {
        setServerError(err.response.data.error);
      } else if (err.message) {
        setServerError(err.message);
      } else {
        setServerError("Could not upload receipt. Try again.");
      }
    }
  }

  async function handleCreateTransaction(values) {
    setServerError("");
    setSuccessMessage("");

    if (!receipt) {
      setServerError("No receipt to convert. Upload a receipt first.");
      return;
    }

    try {
      const payload = {
        merchant: values.merchant?.trim() || undefined,
        amount: Number(values.amount),
        category: values.category,
        date: values.date,
        note: values.note || null,
      };

      const { data } = await api.post(`/receipts/${receipt.receipt.id}/convert`, payload);
      setSuccessMessage("Transaction created successfully.");
      setStatus("success");
      setReceipt(null);
      setSelectedFile(null);
      setUploadProgress(0);
      reset({
        merchant: "",
        amount: "",
        date: formatDateInput(new Date().toISOString()),
        category: "",
        note: "",
      });
      onConverted?.(data.transaction);
    } catch (err) {
      if (err.response?.status === 401) {
        setServerError("Session expired. Please sign in again.");
      } else if (err.response?.status === 409) {
        setServerError(err.response.data.error || "This receipt has already been converted.");
      } else if (err.response?.data?.error) {
        setServerError(err.response.data.error);
      } else {
        setServerError("Could not create transaction. Try again.");
      }
    }
  }

  return (
    <section className="border border-hairline rounded-xl p-5 animate-in card-surface">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-sm text-bone/65 uppercase tracking-wide">Scan receipt</p>
        <h2 className="font-display text-bone text-2xl">Upload and review your receipt</h2>
        <p className="font-body text-bone/65 text-sm">Scan a receipt image or PDF, review the OCR results, and convert it into a transaction.</p>
      </div>

      <div
        className="mt-5 rounded-3xl border border-dashed border-hairline bg-white/10 p-4 text-center transition-colors hover:border-signal/70 hover:bg-white/20"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onKeyDown={handleDropKeyDown}
        role="button"
        tabIndex={0}
        aria-label="Upload receipt file"
      >
        <label className="cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <span className="text-5xl">📄</span>
            <div className="space-y-1">
              <p className="font-display text-bone text-sm">Select or drop a receipt</p>
              <p className="font-body text-bone/65 text-xs">JPEG, PNG, or PDF up to 5 MB</p>
            </div>
            <button type="button" className="mt-3 inline-flex items-center justify-center rounded-full bg-ledger hover:bg-ledger-light px-4 py-2 text-sm font-semibold text-white transition-colors fun-hover">
              Choose file
            </button>
          </div>
        </label>
      </div>

      {selectedFile && (
        <div className="mt-4 rounded-2xl border border-hairline bg-ink/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-sm text-bone/75">Selected file</p>
              <p className="font-display text-bone text-sm truncate">{selectedFile.name}</p>
            </div>
            <button
              type="button"
              onClick={resetUploader}
              className="text-sm text-bone/70 hover:text-signal transition-colors"
            >
              Remove
            </button>
          </div>
          {previewUrl && previewType === "image" && (
            <img
              src={previewUrl}
              alt="Receipt preview"
              className="mt-4 max-h-52 w-full rounded-2xl object-contain"
            />
          )}
          {previewType === "pdf" && (
            <div className="mt-4 rounded-2xl bg-ink/70 p-4 text-left text-sm text-bone/70">
              <p className="font-display text-bone text-sm">PDF receipt selected</p>
              <p>{selectedFile.name}</p>
            </div>
          )}
        </div>
      )}

      {serverError && (
        <div className="mt-4 rounded-xl bg-signal/10 border border-signal/30 px-4 py-3 text-sm text-signal" role="alert" aria-live="assertive">
          {serverError}
        </div>
      )}

      {successMessage && (
        <div className="mt-4 rounded-xl bg-ledger/10 border border-ledger-light px-4 py-3 text-sm text-ledger-light" role="status" aria-live="polite">
          {successMessage}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || status === "uploading" || status === "review" || status === "success"}
          aria-busy={status === "uploading"}
          className="w-full bg-signal hover:bg-signal/90 disabled:opacity-50 transition-colors text-white font-display tracking-wide fun-hover text-sm font-semibold rounded-xl py-2.5"
        >
          {status === "uploading" ? "Uploading…" : "Upload receipt"}
        </button>
        {status === "uploading" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-bone/65">
              <span>Uploading and OCR processing</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-ink/30">
              <div
                className="h-full rounded-full bg-signal transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {status === "review" && receipt && (
        <form onSubmit={handleSubmit(handleCreateTransaction)} className="mt-6 space-y-4 border-t border-hairline pt-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="font-mono text-sm text-bone/75 uppercase tracking-wide">Merchant</label>
              <input
                type="text"
                className="mt-1.5 w-full bg-transparent border border-hairline rounded-xl px-3 py-2 text-bone font-mono text-sm focus:border-signal transition-colors"
                {...register("merchant")}
              />
            </div>
            <div>
              <label className="font-mono text-sm text-bone/75 uppercase tracking-wide">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                className="mt-1.5 w-full bg-transparent border border-hairline rounded-xl px-3 py-2 text-bone font-mono text-sm focus:border-signal transition-colors"
                {...register("amount", {
                  required: "Required",
                  valueAsNumber: true,
                  validate: (value) => value > 0 || "Must be greater than 0",
                })}
              />
              {errors.amount && <p className="text-signal text-xs mt-1">{errors.amount.message}</p>}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="font-mono text-sm text-bone/75 uppercase tracking-wide">Date</label>
              <input
                type="date"
                className="mt-1.5 w-full bg-transparent border border-hairline rounded-xl px-3 py-2 text-bone font-mono text-sm focus:border-signal transition-colors"
                {...register("date", { required: "Required" })}
              />
              {errors.date && <p className="text-signal text-xs mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <label className="font-mono text-sm text-bone/75 uppercase tracking-wide">Category</label>
              <select
                className="mt-1.5 w-full bg-ink border border-hairline rounded-xl px-3 py-2 text-bone font-body text-sm focus:border-signal transition-colors"
                {...register("category", { required: "Pick a category" })}
              >
                <option value="">Select…</option>
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && <p className="text-signal text-xs mt-1">{errors.category.message}</p>}
            </div>
          </div>

          <div>
            <label className="font-mono text-sm text-bone/75 uppercase tracking-wide">Note (optional)</label>
            <input
              type="text"
              maxLength={280}
              className="mt-1.5 w-full bg-transparent border border-hairline rounded-xl px-3 py-2 text-bone font-body text-sm focus:border-signal transition-colors"
              {...register("note")}
            />
          </div>

          <div className="rounded-2xl bg-ink/80 p-4 text-sm text-bone/65">
            <p className="font-display text-bone text-sm">OCR preview</p>
            <p className="mt-2">Merchant: {receipt.ocr.vendor || "Unknown"}</p>
            <p>Total: {receipt.ocr.totalAmount ? `₹${Number(receipt.ocr.totalAmount).toFixed(2)}` : "Unknown"}</p>
            <p>Date: {receipt.ocr.receiptDate ? formatDateInput(receipt.ocr.receiptDate) : "Unknown"}</p>
            {receipt.ocr.currency && <p>Currency: {receipt.ocr.currency}</p>}
          </div>

          {serverError && (
            <div className="rounded-xl bg-signal/10 border border-signal/30 px-4 py-3 text-sm text-signal">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-ledger hover:bg-ledger-light disabled:opacity-50 transition-colors text-white font-display tracking-wide fun-hover text-sm font-semibold rounded-xl py-2.5"
          >
            {isSubmitting ? "Creating transaction…" : "Create transaction"}
          </button>
        </form>
      )}
    </section>
  );
}
