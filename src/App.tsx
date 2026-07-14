import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';

// --- Interfaces ---
interface SalesRep {
  role: 'admin' | 'user';
  email: string;
  name: string;
}

interface MaintenancePlan {
  id: string;
  client_name: string;
  next_invoice_date: string;
}

// --- API Helper ---
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  // Replace this with your actual fetch logic
  return {} as T;
}

// --- Notification Bell Component ---
function NotificationBell({ profile, align = 'right' }: { profile: SalesRep; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const [overdue, setOverdue] = useState<MaintenancePlan[]>([]);
  const [upcoming, setUpcoming] = useState<MaintenancePlan[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [composeBody, setComposeBody] = useState('');
  const [composeTo, setComposeTo] = useState('');
  const [sending, setSending] = useState(false);
  const [badgeCleared, setBadgeCleared] = useState(false);

  const loadAll = () => {
    apiFetch<any>('/api/dashboard').then((d) => { setOverdue(d.overdueInvoices || []); setUpcoming(d.upcomingInvoices || []); }).catch(() => {});
    apiFetch<any[]>('/api/messages').then(setMessages).catch(() => {});
  };
  
  useEffect(loadAll, []);
  useEffect(() => { 
    if (profile.role === 'admin') apiFetch<SalesRep[]>('/api/messages?resource=reps').then(setReps).catch(() => {}); 
  }, [profile.role]);
  
  async function sendMessage() {
    if (!composeBody.trim()) return;
    setSending(true);
    try { 
      await apiFetch('/api/messages', { method: 'POST', body: JSON.stringify({ body: composeBody, to_email: composeTo || null }) }); 
      setComposeBody(''); 
      setComposeTo(''); 
    } catch { /* ignore */ } finally { setSending(false); }
  }
  
  const total = overdue.length + upcoming.length + messages.length;
  
  return (
    <div className="relative">
      <button 
        onClick={() => { const next = !open; setOpen(next); if (next) { loadAll(); setBadgeCleared(true); } }} 
        className="relative grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-300 hover:text-white"
      >
        <Bell size={16} />
        {total > 0 && !badgeCleared && (
          <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
            {total}
          </span>
        )}
      </button>
      {open && (
        <div className={`absolute top-11 z-40 w-80 max-w-[85vw] max-h-[70vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#101218] p-3 shadow-2xl ${align === 'left' ? 'left-0' : 'right-0'}`}>
          {profile.role === 'admin' && (
            <div className="mb-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">Send a message</div>
              <select value={composeTo} onChange={(e) => setComposeTo(e.target.value)} className="field w-full mb-2 !py-1.5 !px-2 text-xs">
                <option value="">All employees</option>
                {reps.filter((r) => r.email !== profile.email).map((r) => <option key={r.email} value={r.email}>{r.name}</option>)}
              </select>
              <textarea value={composeBody} onChange={(e) => setComposeBody(e.target.value)} placeholder="Write an announcement..." rows={2} className="field w-full mb-2 text-xs" />
              <button disabled={sending || !composeBody.trim()} onClick={sendMessage} className="w-full rounded-lg bg-cyan-300 py-1.5 text-xs font-semibold text-black disabled:opacity-50">
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          )}
          {messages.length > 0 && (
            <div className="mb-3">
              <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <span>Messages</span>
                <button onClick={() => setMessages([])} className="text-[10px] text-cyan-300 hover:underline lowercase font-normal">clear</button>
              </div>
              {messages.map((m) => (
                <div key={m.id} className="mb-1.5 rounded-xl bg-violet-500/10 px-3 py-2 text-sm break-words">
                  <div className="text-violet-100">{m.body}</div>
                  <div className="mt-1 text-[10px] text-violet-300/70">{m.from_email} • {new Date(m.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
          <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Invoice reminders</div>
          {overdue.length === 0 && upcoming.length === 0 && <p className="px-1 py-3 text-sm text-slate-500">No invoices due soon. You're all caught up.</p>}
          {overdue.map((m) => (
            <div key={`o-${m.id}`} className="mb-1 flex items-center justify-between gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-sm break-words">
              <span className="truncate text-rose-100">{m.client_name}</span>
              <span className="whitespace-nowrap text-xs text-rose-300">Overdue</span>
            </div>
          ))}
          {upcoming.map((m) => (
            <div key={`u-${m.id}`} className="mb-1 flex items-center justify-between gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-sm break-words">
              <span className="truncate text-amber-100">{m.client_name}</span>
              <span className="whitespace-nowrap text-xs text-amber-300">{m.next_invoice_date.slice(0, 10)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main App ---
export default function App() {
  // 1. Paste your auth state or profile loading logic here
  // const [auth, setAuth] = useState(...)
  
  // 2. REPLACE THIS WITH YOUR ACTUAL DASHBOARD/ROUTING LOGIC
  return (
    <div className="p-10 text-white">
      <h1>Your Application Is Running</h1>
      <p>Replace this content with your actual dashboard or router!</p>
      
      {/* Example of how to use the bell: */}
      {/* <NotificationBell profile={yourAuthProfile} align="left" /> */}
    </div>
  );
}
