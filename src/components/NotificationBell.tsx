import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, BellOff } from 'lucide-react';
import { getNotifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead } from '@/lib/api';
import type { Notification } from '@/types';

export function NotificationBell({ position = 'right' }: { position?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  async function load() {
    const [items, count] = await Promise.all([getNotifications(), getUnreadNotificationCount()]);
    setNotifications(items);
    setUnread(count);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handleOpen() {
    setOpen((v) => {
      if (!v) load();
      return !v;
    });
  }

  async function handleClickItem(n: Notification) {
    if (!n.is_read) {
      await markNotificationRead(n.id);
      setUnread((u) => Math.max(0, u - 1));
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  async function handleMarkAll() {
    await markAllNotificationsRead();
    setUnread(0);
    setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative rounded-lg p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute ${position === 'right' ? 'right-0' : 'left-0'} top-11 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg`}>
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
            {unread > 0 && (
              <button onClick={handleMarkAll} className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-center text-sm text-slate-400">Loading...</p>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-6 text-slate-400">
                <BellOff className="h-6 w-6" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickItem(n)}
                  className={`flex w-full flex-col gap-0.5 border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-800/40 ${n.is_read ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    {!n.is_read && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />}
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{n.title}</span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{n.message}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
