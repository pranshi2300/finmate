const prisma = require("../config/db");
const {
  receiptQuerySchema,
  receiptIdSchema,
  receiptConvertSchema,
} = require("../utils/validation");
const {
  uploadReceiptImage,
  getDerivedImageBuffer,
  deleteResource,
} = require("../services/cloudinaryService");
const { extractReceiptData } = require("../services/ocrService");
const logger = require('../utils/logger');

function createHttpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Load a receipt and verify ownership.
 * Throws a 404 if the receipt does not exist or does not belong to the current user.
 */
async function findOwnedReceipt(id, userId) {
  const receipt = await prisma.receipt.findUnique({ where: { id } });
  if (!receipt || receipt.userId !== userId) {
    throw createHttpError(404, "Receipt not found");
  }
  return receipt;
}

async function uploadReceipt(req, res) {
  if (!req.file) {
    throw createHttpError(400, "Receipt image is required");
  }

  let uploadResult;
  try {
    uploadResult = await uploadReceiptImage(req.file.buffer, `receipt_${Date.now()}`);
  } catch (uploadError) {
    uploadError.status = uploadError.status || 502;
    uploadError.message = uploadError.message || "Cloudinary upload failed";
    throw uploadError;
  }

  let ocrBuffer = req.file.buffer;
  if (req.file.mimetype === "application/pdf") {
    try {
      ocrBuffer = await getDerivedImageBuffer(uploadResult.public_id);
    } catch (deriveError) {
      try {
        await deleteResource(uploadResult.public_id);
      } catch (cleanupError) {
        logger.warn('Cloudinary PDF cleanup failed', { message: cleanupError.message });
      }
      throw createHttpError(502, "Could not convert PDF to image for OCR");
    }
  }

  let receiptData;
  try {
    receiptData = await extractReceiptData(ocrBuffer);
  } catch (ocrError) {
    try {
      await deleteResource(uploadResult.public_id);
    } catch (cleanupError) {
        logger.warn('Cloudinary cleanup after OCR failure failed', { message: cleanupError.message });
    }
    const err = createHttpError(502, "OCR processing failed");
    logger.error('OCR processing failed', { userId: req.user.id, message: ocrError.message });
    err.details = ocrError.message;
    throw err;
  }

  let receipt;
  try {
    receipt = await prisma.receipt.create({
      data: {
        userId: req.user.id,
        imageUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        vendor: receiptData.vendor || null,
        receiptDate: receiptData.receiptDate ? new Date(receiptData.receiptDate) : null,
        totalAmount: receiptData.totalAmount ?? 0,
        taxAmount: receiptData.taxAmount ?? null,
        tipAmount: receiptData.tipAmount ?? null,
        items: receiptData.items,
        rawOcrText: receiptData.rawOcrText,
      },
    });
  } catch (dbError) {
    try {
      await deleteResource(uploadResult.public_id);
    } catch (cleanupError) {
      logger.warn('Cloudinary cleanup after receipt persistence failure failed', { message: cleanupError.message });
    }
    throw dbError;
  }

  res.status(201).json({
    receipt,
    ocr: {
      vendor: receiptData.vendor,
      totalAmount: receiptData.totalAmount,
      receiptDate: receiptData.receiptDate,
      currency: receiptData.currency,
      rawText: receiptData.rawOcrText,
      items: receiptData.items,
    },
  });
}

async function listReceipts(req, res) {
  const parsed = receiptQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw createHttpError(400, parsed.error.errors[0].message);
  }

  const { page, limit, merchant, fromDate, toDate, minAmount, maxAmount } = parsed.data;

  if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
    throw createHttpError(400, "fromDate must be earlier than or equal to toDate");
  }

  if (minAmount && maxAmount && minAmount > maxAmount) {
    throw createHttpError(400, "minAmount must be less than or equal to maxAmount");
  }

  const where = { userId: req.user.id };

  if (merchant) {
    where.vendor = { contains: merchant, mode: "insensitive" };
  }

  if (fromDate || toDate) {
    where.receiptDate = {};
    if (fromDate) where.receiptDate.gte = new Date(fromDate);
    if (toDate) where.receiptDate.lte = new Date(toDate);
  }

  if (minAmount || maxAmount) {
    where.totalAmount = {};
    if (minAmount) where.totalAmount.gte = minAmount;
    if (maxAmount) where.totalAmount.lte = maxAmount;
  }

  const [receipts, total] = await Promise.all([
    prisma.receipt.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.receipt.count({ where }),
  ]);

  res.json({
    receipts,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

async function getReceipt(req, res) {
  const parsed = receiptIdSchema.safeParse(req.params);
  if (!parsed.success) {
    throw createHttpError(400, parsed.error.errors[0].message);
  }

  const receipt = await findOwnedReceipt(parsed.data.id, req.user.id);
  res.json({ receipt });
}

/**
 * Convert a receipt into a personal transaction.
 * Ensures the receipt belongs to the current user and has not already
 * been converted, then creates a transaction linked by receiptId.
 */
async function createTransactionFromReceipt(req, res) {
  const parsedId = receiptIdSchema.safeParse(req.params);
  if (!parsedId.success) {
    throw createHttpError(400, parsedId.error.errors[0].message);
  }

  const parsedBody = receiptConvertSchema.safeParse(req.body);
  if (!parsedBody.success) {
    throw createHttpError(400, parsedBody.error.errors[0].message);
  }

  const receipt = await prisma.receipt.findUnique({
    where: { id: parsedId.data.id },
    include: { transaction: true },
  });

  if (!receipt || receipt.userId !== req.user.id) {
    throw createHttpError(404, "Receipt not found");
  }

  if (receipt.transaction) {
    throw createHttpError(409, "This receipt has already been converted to a transaction");
  }

  const {
    merchant: overrideMerchant,
    amount: overrideAmount,
    category: overrideCategory,
    note,
    date: overrideDate,
    type,
  } = parsedBody.data;

  const amount = overrideAmount ?? Number(receipt.totalAmount ?? 0);
  if (!amount || amount <= 0) {
    throw createHttpError(400, "Receipt amount is missing or invalid. Provide a valid amount to convert this receipt.");
  }

  const category = overrideCategory?.trim() || "Uncategorized";
  if (!category) {
    throw createHttpError(400, "Category is required to convert a receipt to a transaction.");
  }

  const transactionDate = overrideDate
    ? new Date(overrideDate)
    : receipt.receiptDate
    ? new Date(receipt.receiptDate)
    : new Date();

  const merchant = overrideMerchant?.trim();
  const receiptUpdate = merchant ? { vendor: merchant } : undefined;

  try {
    let transaction;

    if (receiptUpdate) {
      const [_, tx] = await prisma.$transaction([
        prisma.receipt.update({ where: { id: receipt.id }, data: receiptUpdate }),
        prisma.transaction.create({
          data: {
            userId: req.user.id,
            type,
            amount,
            category,
            note: note ?? null,
            date: transactionDate,
            receiptId: receipt.id,
          },
        }),
      ]);
      transaction = tx;
    } else {
      transaction = await prisma.transaction.create({
        data: {
          userId: req.user.id,
          type,
          amount,
          category,
          note: note ?? null,
          date: transactionDate,
          receiptId: receipt.id,
        },
      });
    }

    res.status(201).json({ transaction });
  } catch (error) {
    if (error.code === "P2002" && error.meta?.target?.includes("receiptId")) {
      throw createHttpError(409, "This receipt has already been converted to a transaction");
    }
    throw error;
  }
}

async function deleteReceipt(req, res) {
  const parsed = receiptIdSchema.safeParse(req.params);
  if (!parsed.success) {
    throw createHttpError(400, parsed.error.errors[0].message);
  }

  const receipt = await findOwnedReceipt(parsed.data.id, req.user.id);
  if (receipt.publicId) {
    try {
      await deleteResource(receipt.publicId);
    } catch (cleanupError) {
      logger.warn('Cloudinary cleanup after receipt deletion failed', { message: cleanupError.message });
    }
  }

  await prisma.receipt.delete({ where: { id: parsed.data.id } });
  res.status(204).send();
}

module.exports = {
  uploadReceipt,
  listReceipts,
  getReceipt,
  createTransactionFromReceipt,
  deleteReceipt,
};
