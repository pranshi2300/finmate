const express = require("express");
const { list, summary, create, update, remove } = require("../controllers/transactionController");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

router.use(requireAuth); // every route below requires a logged-in user

router.get("/", asyncHandler(list));
router.get("/summary", asyncHandler(summary));
router.post("/", asyncHandler(create));
router.put("/:id", asyncHandler(update));
router.delete("/:id", asyncHandler(remove));

module.exports = router;
