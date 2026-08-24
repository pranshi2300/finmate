const { z } = require('zod');
const service = require('../services/notifications/notificationService');

const preferenceSchema = z.object({ enabled: z.boolean().optional(), budget: z.boolean().optional(), forecasts: z.boolean().optional(), subscriptions: z.boolean().optional(), savings: z.boolean().optional(), aiAdvisor: z.boolean().optional(), achievements: z.boolean().optional() });
const listNumber = (value, fallback, max) => Math.min(max, Math.max(1, Number(value) || fallback));

async function list(req, res) { res.json(await service.listNotifications(req.user.id, { page: listNumber(req.query.page, 1, 100000), limit: listNumber(req.query.limit, 30, 100) })); }
async function unread(req, res) { res.json(await service.listNotifications(req.user.id, { unreadOnly: true, page: listNumber(req.query.page, 1, 100000), limit: listNumber(req.query.limit, 30, 100) })); }
async function markRead(req, res) { if (!(await service.markRead(req.user.id, req.params.id))) return res.status(404).json({ error: 'Notification not found' }); res.status(204).send(); }
async function markAllRead(req, res) { const result = await service.markAllRead(req.user.id); res.json({ updated: result.count }); }
async function remove(req, res) { if (!(await service.deleteNotification(req.user.id, req.params.id))) return res.status(404).json({ error: 'Notification not found' }); res.status(204).send(); }
async function test(req, res) { res.status(201).json({ notification: await service.createTestNotification(req.user.id) }); }
async function preferences(req, res) { res.json({ preferences: await service.getPreferences(req.user.id) }); }
async function updatePreferences(req, res) { const parsed = preferenceSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message }); res.json({ preferences: await service.updatePreferences(req.user.id, parsed.data) }); }

module.exports = { list, unread, markRead, markAllRead, remove, test, preferences, updatePreferences };
