const express = require("express");
const {
  uploadReceipt,
  listReceipts,
  getReceipt,
  createTransactionFromReceipt,
  deleteReceipt,
} = require("../controllers/receiptController");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");
const upload = require("../middleware/upload");

const router = express.Router();

router.use(requireAuth); // every route below requires a logged-in user

router.post("/", upload.single("receiptImage"), asyncHandler(uploadReceipt));
router.get("/", asyncHandler(listReceipts));
router.get("/:id", asyncHandler(getReceipt));
router.post("/:id/convert", asyncHandler(createTransactionFromReceipt));
router.delete("/:id", asyncHandler(deleteReceipt));

module.exports = router;
