const bcrypt = require("bcrypt");
const prisma = require("../config/db");
const { registerSchema, loginSchema } = require("../utils/validation");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../utils/token");

const SALT_ROUNDS = 12;

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

async function register(req, res, next) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }
  const { name, email, password } = parsed.data;

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  res.cookie("refreshToken", refreshToken, refreshCookieOptions());
  res.status(201).json({
    accessToken,
    user: { id: user.id, name: user.name, email: user.email, plan: user.plan },
  });
}

async function login(req, res, next) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  // Same error for "no user" and "wrong password" — don't leak which one
  // it was, that tells attackers whether an email is registered.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  res.cookie("refreshToken", refreshToken, refreshCookieOptions());
  res.json({
    accessToken,
    user: { id: user.id, name: user.name, email: user.email, plan: user.plan },
  });
}

async function refresh(req, res, next) {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({ error: "No refresh token provided" });
  }

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }

  // Confirm it hasn't been revoked (logged out) server-side
  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) {
    return res.status(401).json({ error: "Refresh token revoked or expired" });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    return res.status(401).json({ error: "User no longer exists" });
  }

  const accessToken = signAccessToken(user);
  res.json({ accessToken });
}

async function logout(req, res, next) {
  const token = req.cookies?.refreshToken;
  if (token) {
    await prisma.refreshToken.deleteMany({ where: { token } });
  }
  // clearCookie only needs the matching attributes (path/domain/secure/sameSite),
  // not maxAge — passing maxAge here is what triggers the deprecation warning.
  const { maxAge, ...cookieMatchOptions } = refreshCookieOptions();
  res.clearCookie("refreshToken", cookieMatchOptions);
  res.status(204).send();
}

async function me(req, res, next) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, plan: true, role: true, createdAt: true },
  });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({ user });
}

module.exports = { register, login, refresh, logout, me };
