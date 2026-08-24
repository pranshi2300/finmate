const express = require("express");
const {
  createGroup,
  listGroups,
  getGroup,
  addExpense,
  getBalances,
  getSettlement,
  deleteGroup,
} = require("../controllers/groupController");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

router.use(requireAuth);

router.post("/", asyncHandler(createGroup));
router.get("/", asyncHandler(listGroups));
router.get("/:id", asyncHandler(getGroup));
router.post("/:id/expenses", asyncHandler(addExpense));
router.get("/:id/balances", asyncHandler(getBalances));
router.get("/:id/settlement", asyncHandler(getSettlement));
router.delete("/:id", asyncHandler(deleteGroup));

module.exports = router;
