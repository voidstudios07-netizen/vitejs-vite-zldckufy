import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';

// --- Types & Interfaces ---
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
// Replace this with your actual fetch implementation
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  return fetch(path, options).then(res => res.json());
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
      setComposeBody(''); setComposeTo(''); 
    } catch { } finally { setSending(false); }
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
          {/* ... Notification contents (Admin controls, messages, reminders) ... */}
          <p className="text-sm text-slate-400">Notifications loaded.</p>
        </div>
      )}
    </div>
  );
}

// --- Main Shell Component ---
// This acts as the wrapper for your entire dashboard
function Shell({ auth, children }: { auth: { profile: SalesRep }, children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-black">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 p-4">
        <NotificationBell profile={auth.profile} align="left" />
      </aside>
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-white/10 px-6">
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <NotificationBell profile={auth.profile} align="right" />
        </header>

        {/* --- PASTE YOUR DASHBOARD CONTENT BELOW --- */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

// --- Main App ---
export default function App() {
  // Replace this with your actual auth state initialization
  const auth = {
    profile: {
      role: 'admin',
      email: 'admin@example.com',
      name: 'Admin User'
    }
  };

  return (
    <Shell auth={auth}>
      {/* 
         PASTE YOUR DASHBOARD/ROUTER CONTENT HERE. 
         Example: <DashboardGrid /> or <Routes>...</Routes> 
      */}
      <div className="text-white">
        Your dashboard components go here!
      </div>
    </Shell>
  );
}
