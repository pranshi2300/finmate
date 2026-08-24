const { PrismaClient } = require("@prisma/client");

// Reuse a single PrismaClient instance across the app instead of creating
// a new one per request (each instance opens its own connection pool).
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

module.exports = prisma;
