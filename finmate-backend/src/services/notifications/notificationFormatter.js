function formatNotification({ title, description, priority = 'medium', type, action = { type: 'open-notifications' }, dedupeKey }) {
  return { title, description, priority, type, action, dedupeKey };
}

module.exports = { formatNotification };
