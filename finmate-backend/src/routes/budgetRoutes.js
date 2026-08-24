const express = require("express");
const { list, upsert, remove } = require("../controllers/budgetController");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

router.use(requireAuth);

router.get("/", asyncHandler(list));
router.post("/", asyncHandler(upsert));
router.delete("/:id", asyncHandler(remove));

module.exports = router;
