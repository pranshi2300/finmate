const { z } = require("zod");

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"], { errorMap: () => ({ message: "Type must be INCOME or EXPENSE" }) }),
  amount: z.number().positive("Amount must be greater than 0"),
  category: z.string().min(1, "Category is required").max(50),
  note: z.string().max(280).optional().nullable(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
});

// Same as transactionSchema but every field optional, for PATCH-style updates
const transactionUpdateSchema = transactionSchema.partial();

const receiptQuerySchema = z.object({
  page: z.preprocess((val) => (typeof val === "string" ? Number(val) : val), z.number().int().min(1).default(1)),
  limit: z.preprocess((val) => (typeof val === "string" ? Number(val) : val), z.number().int().min(1).max(100).default(20)),
  merchant: z.string().trim().min(1).max(80).optional(),
  fromDate: z.string().refine((val) => !val || !isNaN(Date.parse(val)), "Invalid fromDate").optional(),
  toDate: z.string().refine((val) => !val || !isNaN(Date.parse(val)), "Invalid toDate").optional(),
  minAmount: z.preprocess((val) => (typeof val === "string" ? Number(val) : val), z.number().positive().optional()),
  maxAmount: z.preprocess((val) => (typeof val === "string" ? Number(val) : val), z.number().positive().optional()),
});

const receiptIdSchema = z.object({
  id: z.string().uuid("Invalid receipt id"),
});

const receiptConvertSchema = z.object({
  type: z.literal("EXPENSE", { errorMap: () => ({ message: "Receipt transactions must be EXPENSE" }) }).optional().default("EXPENSE"),
  merchant: z.string().trim().max(80).optional(),
  amount: z.preprocess((val) => (typeof val === "string" ? Number(val) : val), z.number().positive("Amount must be greater than 0").optional()),
  category: z.string().min(1, "Category is required").max(50).optional(),
  note: z.string().max(280).optional().nullable(),
  date: z.string().refine((val) => !val || !isNaN(Date.parse(val)), "Invalid date").optional(),
});

const budgetSchema = z.object({
  category: z.string().min(1, "Category is required").max(50),
  monthlyLimit: z.number().positive("Limit must be greater than 0"),
});

const createGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(60),
  memberEmails: z
    .array(z.string().email())
    .min(1, "Add at least one other member")
    .max(20),
});

const addGroupExpenseSchema = z.object({
  description: z.string().min(1, "Description is required").max(120),
  amount: z.number().positive("Amount must be greater than 0"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date").optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  transactionSchema,
  transactionUpdateSchema,
  receiptQuerySchema,
  receiptIdSchema,
  receiptConvertSchema,
  budgetSchema,
  createGroupSchema,
  addGroupExpenseSchema,
};
