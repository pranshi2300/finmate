import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import NotificationBadge from './NotificationBadge';
import NotificationCard from './NotificationCard';

export default function NotificationDrawer() {
  const [open, setOpen] = useState(false); const [data, setData] = useState({ notifications: [], unreadCount: 0 }); const [error, setError] = useState('');
  const load = async () => { try { const result = await api.get('/notifications', { params: { limit: 5 } }); setData(result.data); } catch { /* bell stays unobtrusive if notifications are unavailable */ } };
  useEffect(() => { load(); }, []);
  async function run(action) { try { await action(); setError(''); await load(); } catch { setError('Could not update this notification.'); } }
  async function markRead(id) { return run(() => api.patch(`/notifications/${id}/read`)); }
  async function remove(id) { return run(() => api.delete(`/notifications/${id}`)); }
  return <div className="relative"><button onClick={() => { setOpen((value) => !value); if (!open) load(); }} className="relative text-bone/75 hover:text-signal" aria-label="Notifications" aria-expanded={open} aria-controls="notification-drawer"><Bell size={18} /><NotificationBadge count={data.unreadCount} /></button>{open && <div id="notification-drawer" className="absolute right-0 top-8 z-30 w-80 rounded-xl border border-hairline bg-app p-3 shadow-xl"><div className="flex justify-between mb-3"><p className="font-mono text-xs text-bone/65 uppercase">Notifications</p><Link to="/notifications" onClick={() => setOpen(false)} className="font-mono text-[10px] text-signal">View all</Link></div>{error && <p role="alert" className="mb-2 text-xs text-signal">{error}</p>}<div className="space-y-2 max-h-96 overflow-y-auto">{data.notifications.length ? data.notifications.map((item) => <NotificationCard key={item.id} notification={item} onRead={markRead} onDelete={remove} />) : <p className="font-body text-sm text-bone/65 py-4 text-center">You’re all caught up.</p>}</div></div>}</div>;
}
