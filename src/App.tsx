import { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, Bell, Building2, Crown, KanbanSquare, LogOut, MessageCircle, PhoneCall, Search, Settings, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { Account, apiFetch, Contact, isDueSoon, isOverdue, Lead, MaintenancePlan, money, Opportunity, SalesRep, tcv, tokenStore } from './api';

type View = 'dashboard' | 'leads' | 'pipeline' | 'accounts' | 'maintenance' | 'admin';
type UserState = { profile: SalesRep; user?: { email?: string } } | null;
const stages = ['Discovery Call', 'Technical Scoping', 'Proposal Sent', 'Closed Won'];
const stageTone: Record<string, string> = { 'Discovery Call': 'border-sky-500/40 bg-sky-500/10', 'Technical Scoping': 'border-violet-500/40 bg-violet-500/10', 'Proposal Sent': 'border-amber-500/40 bg-amber-500/10', 'Closed Won': 'border-emerald-500/40 bg-emerald-500/10' };
const statuses = ['No Website', 'Outdated Design', 'No SSL', 'Not Mobile-Friendly'];

function App() {
  const [view, setView] = useState<View>('dashboard');
  const [auth, setAuth] = useState<UserState>(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => { if (!tokenStore.get()) { setChecking(false); return; } apiFetch<UserState>('/api/me').then(setAuth).catch(() => tokenStore.clear()).finally(() => setChecking(false)); }, []);
  if (checking) return <div className="grid min-h-screen place-items-center bg-[#08090c] text-white"><Sparkles className="animate-pulse text-cyan-300" /></div>;
  if (!auth) return <Login onLogin={setAuth} />;
  return <Shell auth={auth} view={view} setView={setView} onLogout={() => { tokenStore.clear(); setAuth(null); }} />;
}

function Login({ onLogin }: { onLogin: (u: UserState) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (!email.includes('@') || password.length < 6) { setError('Enter a valid email and a password with 6+ characters.'); return; }
    if (mode === 'signup' && name.trim().length < 2) { setError('Please enter your name so the CRM can create your employee profile.'); return; }
    setLoading(true);
    try {
      const data = await apiFetch<any>('/api/auth', { method: 'POST', body: JSON.stringify({ email, password, mode, name }) });
      tokenStore.set(data.session.access_token); onLogin({ profile: data.profile, user: data.user });
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }
  return <main className="min-h-screen overflow-hidden bg-[#08090c] text-white">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.18),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(124,58,237,.16),transparent_28%)]" />
    <section className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-[1.1fr_.9fr]">
      <div><div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300"><ShieldCheck size={16} /> Secure employee entry portal</div><h1 className="text-5xl font-semibold tracking-[-0.06em] md:text-7xl">Void Studios<br /><span className="bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">CRM</span></h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">A clean CRM for leads, deals, monthly maintenance retainers, accounts, and admin oversight.</p><div className="mt-8 grid max-w-xl gap-3 text-sm text-slate-300 sm:grid-cols-3"><Badge>Admin portal</Badge><Badge>Employee signup</Badge><Badge>Maintenance MRR</Badge></div></div>
      <form onSubmit={submit} className="rounded-[2rem] border border-white/10 bg-[#101218]/90 p-6 shadow-2xl backdrop-blur"><div className="mb-4 flex rounded-xl bg-white/5 p-1"><button type="button" onClick={() => setMode('login')} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${mode === 'login' ? 'bg-white text-black' : 'text-slate-400'}`}>Login</button><button type="button" onClick={() => setMode('signup')} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${mode === 'signup' ? 'bg-white text-black' : 'text-slate-400'}`}>Employee Signup</button></div><h2 className="text-2xl font-semibold">{mode === 'login' ? 'Welcome back' : 'Create employee login'}</h2>{mode === 'signup' && <Input label="Full name" value={name} onChange={setName} placeholder="Employee name" />}<Input label="Email / Username" value={email} onChange={setEmail} placeholder="you@voidstudios.dev" /><Input label="Password" type="password" value={password} onChange={setPassword} placeholder="Minimum 6 characters" />{error && <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{error}</div>}<button disabled={loading} className="mt-5 w-full rounded-xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-cyan-100 disabled:opacity-60">{loading ? 'Signing you in...' : mode === 'login' ? 'Enter CRM' : 'Create & Enter CRM'}</button><p className="mt-4 text-center text-xs text-slate-500">Employees can sign up and are automatically added as Sales Employees.</p></form>
    </section>
  </main>;
}

function Shell({ auth, view, setView, onLogout }: { auth: NonNullable<UserState>; view: View; setView: (v: View) => void; onLogout: () => void }) {
  const nav = [{ id: 'dashboard', label: 'Dashboard', icon: BarChart3 }, { id: 'leads', label: 'Outbound Panel', icon: PhoneCall }, { id: 'pipeline', label: 'Pipeline', icon: KanbanSquare }, { id: 'maintenance', label: 'Monthly Maintenance', icon: Wrench }, { id: 'accounts', label: 'Accounts', icon: Building2 }, ...(auth.profile.role === 'admin' ? [{ id: 'admin' as const, label: 'Admin Portal', icon: Crown }] : [])] as const;
  return <div className="flex min-h-screen bg-[#08090c] text-slate-100">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/10 bg-[#0c0e13]/95 p-4 backdrop-blur md:block"><div className="mb-8 flex items-center justify-between px-2"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-violet-500 font-black text-black">V</div><div><div className="font-semibold">Void Studios</div><div className="text-xs text-slate-500">CRM</div></div></div><NotificationBell /></div><nav className="space-y-1">{nav.map((item) => <button key={item.id} onClick={() => setView(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${view === item.id ? 'bg-white text-black' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><item.icon size={18} />{item.label}</button>)}</nav><div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-black" style={{ background: auth.profile.avatar_color }}>{auth.profile.name[0]}</div><div className="min-w-0"><div className="truncate text-sm font-medium">{auth.profile.name}</div><div className="truncate text-xs text-slate-500">{auth.profile.role === 'admin' ? 'Admin / Owner' : 'Sales Employee'}</div></div></div><button onClick={onLogout} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2 text-sm text-slate-400 hover:text-white"><LogOut size={16} /> Sign out</button></div></aside>
    <div className="min-w-0 flex-1 md:ml-72">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#0c0e13]/95 px-4 py-3 backdrop-blur md:hidden"><div className="flex items-center gap-2"><div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-cyan-300 to-violet-500 text-sm font-black text-black">V</div><span className="font-semibold">Void Studios</span></div><div className="flex items-center gap-2"><NotificationBell /><button onClick={onLogout} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"><LogOut size={16} /></button></div></div>
      <main className="min-w-0 p-4 md:p-8"><div className="mb-4 flex gap-2 overflow-x-auto md:hidden">{nav.map((item) => <button key={item.id} onClick={() => setView(item.id)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${view === item.id ? 'bg-white text-black' : 'bg-white/5 text-slate-300'}`}>{item.label}</button>)}</div>{view === 'dashboard' && <Dashboard />}{view === 'leads' && <LeadsPanel profile={auth.profile} />}{view === 'pipeline' && <Pipeline profile={auth.profile} />}{view === 'maintenance' && <MonthlyMaintenance />}{view === 'accounts' && <AccountsContacts />}{view === 'admin' && <AdminPortal />}</main>
    </div>
  </div>;
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [overdue, setOverdue] = useState<MaintenancePlan[]>([]);
  const [upcoming, setUpcoming] = useState<MaintenancePlan[]>([]);
  useEffect(() => { apiFetch<any>('/api/dashboard').then((d) => { setOverdue(d.overdueInvoices || []); setUpcoming(d.upcomingInvoices || []); }).catch(() => {}); }, []);
  const total = overdue.length + upcoming.length;
  return <div className="relative"><button onClick={() => setOpen((o) => !o)} className="relative grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-300 hover:text-white"><Bell size={16} />{total > 0 && <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white">{total}</span>}</button>
    {open && <div className="absolute right-0 top-11 z-40 w-80 max-w-[85vw] rounded-2xl border border-white/10 bg-[#101218] p-3 shadow-2xl">
      <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Invoice reminders</div>
      {total === 0 && <p className="px-1 py-3 text-sm text-slate-500">No invoices due soon. You're all caught up.</p>}
      {overdue.map((m) => <div key={`o-${m.id}`} className="mb-1 flex items-center justify-between gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-sm"><span className="truncate text-rose-100">{m.client_name}</span><span className="whitespace-nowrap text-xs text-rose-300">Overdue</span></div>)}
      {upcoming.map((m) => <div key={`u-${m.id}`} className="mb-1 flex items-center justify-between gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-sm"><span className="truncate text-amber-100">{m.client_name}</span><span className="whitespace-nowrap text-xs text-amber-300">{m.next_invoice_date.slice(0, 10)}</span></div>)}
    </div>}
  </div>;
}

function Dashboard() {
  const [data, setData] = useState<any>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const load = () => { setLoading(true); apiFetch<any>('/api/dashboard').then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false)); };
  useEffect(load, []);
  if (loading) return <Skeleton title="Loading analytics" />;
  if (error) return <ErrorBox message={error} retry={load} />;
  const f = data.financials;
  const overdue: MaintenancePlan[] = data.overdueInvoices || [];
  const upcoming: MaintenancePlan[] = data.upcomingInvoices || [];
  return <section><Header eyebrow="Analytics" title="CRM dashboard" subtitle="Live outbound velocity, deal value, maintenance revenue, and weighted forecast." /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Deal Value" value={f.ownerVisible ? money(f.rawPipeline) : 'Owner-only'} bar="bg-cyan-300" /><Metric label="Monthly Maintenance" value={f.ownerVisible ? money(f.monthlyMaintenance) : 'Owner-only'} bar="bg-emerald-300" /><Metric label="Expected Revenue" value={f.ownerVisible ? money(f.expectedRevenue) : 'Owner-only'} bar="bg-violet-300" /><Metric label="Retainer MRR" value={f.ownerVisible ? money(f.mrr) : 'Owner-only'} bar="bg-amber-300" /></div>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/5 p-5"><div className="mb-1 text-sm text-emerald-200/70">Your Commission Earned</div><div className="text-3xl font-bold text-emerald-100">{money(f.commissionEarned)}</div><div className="mt-1 text-xs text-emerald-200/50">{f.commissionRate}% on Closed Won deals</div></div>
      <div className="rounded-3xl border border-white/10 bg-[#101218] p-5"><div className="mb-3 flex items-center gap-2 text-sm font-semibold"><AlertTriangle size={16} className="text-amber-300" /> Invoice Reminders</div>{overdue.length === 0 && upcoming.length === 0 ? <p className="text-sm text-slate-500">No invoices due within 3 days.</p> : <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">{overdue.map((m) => <div key={`o-${m.id}`} className="flex items-center justify-between rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs"><span className="text-rose-100">{m.client_name}</span><span className="text-rose-300">Overdue — churn risk</span></div>)}{upcoming.map((m) => <div key={`u-${m.id}`} className="flex items-center justify-between rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs"><span className="text-amber-100">{m.client_name}</span><span className="text-amber-300">Due {m.next_invoice_date.slice(0, 10)}</span></div>)}</div>}</div>
    </div>
    <div className="mt-6 rounded-3xl border border-white/10 bg-[#101218] p-5"><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold">Employee Analytics Tracker</h3><span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400">Today</span></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.leaderGrid.map((r: any) => <div key={r.email} className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="mb-5 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full font-bold text-black" style={{ background: r.avatar_color }}>{r.name[0]}</div><div><div className="font-medium">{r.name}</div><div className="text-xs text-slate-500">{r.title}</div></div></div><div className="grid grid-cols-3 gap-2 text-center"><Mini label="Dials" value={r.total_dials_today} /><Mini label="Pitches" value={r.total_pitches} /><Mini label="Pitch %" value={`${r.pitch_success_rate}%`} /></div></div>)}</div></div></section>;
}

function LeadsPanel({ profile }: { profile: SalesRep }) {
  const [leads, setLeads] = useState<Lead[]>([]), [active, setActive] = useState<Lead | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', website_status: 'No Website', source_url: '' });
  const [conversion, setConversion] = useState({ amount: 3500, revenue_type: 'One-Time Project', contract_term: 1, close_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10) });
  const [reps, setReps] = useState<SalesRep[]>([]), [selectedOwner, setSelectedOwner] = useState('');
  const [ownerCounts, setOwnerCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMsg, setBulkMsg] = useState('');
  const [sentIds, setSentIds] = useState<Set<number>>(new Set());
  const toggleSelect = (id: number) => setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toWhatsAppNumber = (phone: string) => { let d = phone.replace(/\D/g, ''); if (d.startsWith('0')) d = d.slice(1); if (d.length === 10) d = '91' + d; return d; };
  useEffect(() => { if (profile.role === 'admin') apiFetch<SalesRep[]>('/api/reps').then(setReps).catch(() => {}); }, [profile.role]);
  useEffect(() => { if (profile.role === 'admin') apiFetch<Lead[]>('/api/leads').then((all) => { const counts: Record<string, number> = {}; all.forEach((l) => { counts[l.lead_owner] = (counts[l.lead_owner] || 0) + 1; }); setOwnerCounts(counts); }).catch(() => {}); }, [profile.role, leads.length]);
  const load = () => { setLoading(true); const q = profile.role === 'admin' && selectedOwner ? `?owner=${encodeURIComponent(selectedOwner)}` : ''; apiFetch<Lead[]>(`/api/leads${q}`).then((d) => { setLeads(d); setActive(d[0] || null); }).catch((e) => setError(e.message)).finally(() => setLoading(false)); };
  useEffect(load, [selectedOwner]);
  const visible = leads.filter((l) => !['Dead/Disqualified', 'Converted'].includes(l.status));
  async function addLead(e: React.FormEvent) { e.preventDefault(); setError(''); if (!form.name || !form.phone) { setError('Business name and phone are required.'); return; } setSaving(true); try { await apiFetch('/api/leads', { method: 'POST', body: JSON.stringify(form) }); setForm({ name: '', phone: '', website_status: 'No Website', source_url: '' }); load(); } catch (e: any) { setError(e.message); } finally { setSaving(false); } }
  async function disposition(action: string) { if (!active) return; let follow_up_date = ''; if (action === 'pitched') { follow_up_date = prompt('Follow-up date (YYYY-MM-DD)', new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)) || ''; if (!follow_up_date) return; } setSaving(true); try { await apiFetch('/api/leads', { method: 'PUT', body: JSON.stringify({ id: active.id, action, follow_up_date }) }); await load(); } catch (e: any) { setError(e.message); } finally { setSaving(false); } }
  async function convert() { if (!active) return; setSaving(true); try { await apiFetch('/api/convert-lead', { method: 'POST', body: JSON.stringify({ lead_id: active.id, ...conversion }) }); await load(); } catch (e: any) { setError(e.message); } finally { setSaving(false); } }
  return <section><Header eyebrow="Outbound" title="Lead sourcing & cold-calling panel" subtitle="Rapidly add map-sourced businesses, dial, dispose, and convert to pipeline." />{profile.role === 'admin' && Object.keys(ownerCounts).length > 0 && <div className="mb-5 flex flex-wrap items-center gap-2"><span className="text-xs text-slate-500 mr-1">Filter by rep:</span><button onClick={() => setSelectedOwner('')} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${!selectedOwner ? 'bg-white text-black' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>All Reps ({Object.values(ownerCounts).reduce((a, b) => a + b, 0)})</button>{Object.entries(ownerCounts).sort((a, b) => b[1] - a[1]).map(([email, count]) => <button key={email} onClick={() => setSelectedOwner(email)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${selectedOwner === email ? 'bg-cyan-300 text-black' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>{email} ({count})</button>)}</div>}<form onSubmit={addLead} className="sticky top-3 z-20 mb-5 grid gap-3 rounded-2xl border border-cyan-300/20 bg-[#101218]/95 p-3 shadow-2xl shadow-cyan-950/20 backdrop-blur lg:grid-cols-[1fr_.8fr_.8fr_1fr_auto]"><input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Business name" /><input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" /><select className="field" value={form.website_status} onChange={(e) => setForm({ ...form, website_status: e.target.value })}>{statuses.map((s) => <option key={s}>{s}</option>)}</select><input className="field" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="Google Maps / Justdial URL" /><button disabled={saving} className="rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-black hover:bg-cyan-200">Quick Add</button></form>{error && <ErrorBox message={error} retry={load} />}{loading ? <Skeleton title="Loading lead queue" /> : <div className="grid gap-5 xl:grid-cols-[1fr_420px]"><div className="rounded-3xl border border-white/10 bg-[#101218] p-3"><div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-2"><div className="flex items-center gap-2 text-sm text-slate-400"><Search size={16} /> Active queue ({visible.length})</div><button disabled={selected.size === 0} onClick={() => setBulkOpen(true)} className="flex items-center gap-2 rounded-xl bg-emerald-400/15 border border-emerald-400/30 px-4 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-400/25"><MessageCircle size={14} /> Message Selected ({selected.size})</button></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="p-3 w-8"></th><th className="p-3">Company</th><th>Phone</th><th>Website</th><th>Calls</th><th>Status</th><th>Owner</th></tr></thead><tbody>{visible.map((l) => <tr key={l.id} onClick={() => setActive(l)} className={`cursor-pointer border-t border-white/5 transition hover:bg-white/[.04] ${active?.id === l.id ? 'bg-cyan-300/10' : ''}`}><td className="p-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSelect(l.id)} className="h-4 w-4 rounded accent-emerald-400" /></td><td className="p-3 font-medium text-white">{l.name}<div className="text-xs text-slate-500">{l.source_url ? <a onClick={(e) => e.stopPropagation()} className="hover:text-cyan-300" href={l.source_url} target="_blank">Source link</a> : 'Manual source'}</div></td><td><a href={`tel:${l.phone}`} className="text-cyan-300">{l.phone}</a></td><td>{l.website_status}</td><td>{l.call_count}</td><td><StatusPill status={l.status} /></td><td className="text-slate-400">{profile.role === 'admin' ? l.lead_owner : 'You'}</td></tr>)}</tbody></table></div></div><aside className="rounded-3xl border border-white/10 bg-[#101218] p-5">{active ? <><div className="text-sm text-slate-500">Active dialing profile</div><h3 className="mt-1 text-2xl font-semibold">{active.name}</h3><a href={`tel:${active.phone}`} className="my-6 block break-all text-5xl font-black tracking-[-0.06em] text-white hover:text-cyan-300">{active.phone}</a><a href={`https://wa.me/${toWhatsAppNumber(active.phone)}`} target="_blank" className="mb-5 flex items-center justify-center gap-2 rounded-xl bg-emerald-400/15 border border-emerald-400/30 py-2.5 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/25"><MessageCircle size={16} /> Message on WhatsApp</a><div className="grid grid-cols-2 gap-3 text-sm"><Info label="Website" value={active.website_status} /><Info label="Call Count" value={String(active.call_count)} /><Info label="Gatekeeper" value={active.gatekeeper_name || 'Unknown'} /><Info label="Status" value={active.status} /></div><div className="mt-5 grid gap-2"><Action onClick={() => disposition('no_answer')} label="No Answer / Busy" tone="bg-slate-700" /><Action onClick={() => disposition('gatekeeper')} label="Gatekeeper Blocked" tone="bg-amber-500" /><Action onClick={() => disposition('not_interested')} label="Not Interested" tone="bg-rose-500" /><Action onClick={() => disposition('pitched')} label="Pitched / Follow-up" tone="bg-violet-500" /></div><div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4"><div className="mb-3 font-semibold text-emerald-100">Booked Discovery Conversion</div><div className="grid gap-2"><input className="field" type="number" value={conversion.amount} onChange={(e) => setConversion({ ...conversion, amount: Number(e.target.value) })} /><select className="field" value={conversion.revenue_type} onChange={(e) => setConversion({ ...conversion, revenue_type: e.target.value })}><option>One-Time Project</option><option>Recurring Retainer</option></select><input className="field" type="number" min="1" value={conversion.contract_term} onChange={(e) => setConversion({ ...conversion, contract_term: Number(e.target.value) })} /><input className="field" type="date" value={conversion.close_date} onChange={(e) => setConversion({ ...conversion, close_date: e.target.value })} /><button disabled={saving} onClick={convert} className="rounded-xl bg-emerald-300 py-3 font-bold text-black">Booked Discovery → Convert</button></div></div></> : <p className="text-slate-400">Select a lead to start dialing.</p>}</aside></div>}
    {bulkOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setBulkOpen(false)}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#101218] p-5">
        <div className="mb-1 flex items-center gap-2 text-lg font-semibold"><MessageCircle size={18} className="text-emerald-300" /> Bulk WhatsApp Message</div>
        <p className="mb-4 text-xs text-slate-500">Free — no SMS provider needed. Write one message, then click each lead below to open WhatsApp with it pre-filled. You still tap Send inside WhatsApp for each one.</p>
        <textarea className="field w-full mb-4" rows={4} value={bulkMsg} onChange={(e) => setBulkMsg(e.target.value)} placeholder="Hi, this is Void Studios reaching out about..." />
        <div className="space-y-2">
          {visible.filter((l) => selected.has(l.id)).map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[.03] p-3">
              <div className="min-w-0"><div className="truncate font-medium text-white">{l.name}</div><div className="text-xs text-slate-500">{l.phone}</div></div>
              <a href={`https://wa.me/${toWhatsAppNumber(l.phone)}${bulkMsg ? `?text=${encodeURIComponent(bulkMsg)}` : ''}`} target="_blank" onClick={() => setSentIds((prev) => new Set(prev).add(l.id))} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${sentIds.has(l.id) ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-300 text-black hover:bg-emerald-200'}`}>{sentIds.has(l.id) ? 'Opened ✓' : 'Open WhatsApp'}</a>
            </div>
          ))}
        </div>
        <button onClick={() => { setBulkOpen(false); setSelected(new Set()); setSentIds(new Set()); setBulkMsg(''); }} className="mt-4 w-full rounded-xl border border-white/10 py-2.5 text-sm text-slate-400 hover:text-white">Done</button>
      </div>
    </div>}
  </section>;
}

function Pipeline({ profile }: { profile: SalesRep }) {
  const [opps, setOpps] = useState<Opportunity[]>([]), [maintenance, setMaintenance] = useState<MaintenancePlan[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [dragId, setDragId] = useState<number | null>(null);
  const [form, setForm] = useState({ deal_name: '', amount: 5000, revenue_type: 'One-Time Project', contract_term: 1, close_date: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10) });
  const [reps, setReps] = useState<SalesRep[]>([]), [selectedOwner, setSelectedOwner] = useState('');
  useEffect(() => { if (profile.role === 'admin') apiFetch<SalesRep[]>('/api/reps').then(setReps).catch(() => {}); }, [profile.role]);
  const load = () => { setLoading(true); const q = profile.role === 'admin' && selectedOwner ? `?owner=${encodeURIComponent(selectedOwner)}` : ''; Promise.all([apiFetch<Opportunity[]>(`/api/opportunities${q}`), apiFetch<MaintenancePlan[]>('/api/maintenance')]).then(([o, m]) => { setOpps(o); setMaintenance(m); }).catch((e) => setError(e.message)).finally(() => setLoading(false)); };
  useEffect(load, [selectedOwner]);
  async function move(id: number, stage: string) { try { await apiFetch('/api/opportunities', { method: 'PUT', body: JSON.stringify({ id, fields: { stage } }) }); load(); } catch (e: any) { setError(e.message); } }
  async function add(e: React.FormEvent) { e.preventDefault(); if (!form.deal_name) { setError('Deal name is required.'); return; } try { await apiFetch('/api/opportunities', { method: 'POST', body: JSON.stringify(form) }); setForm({ ...form, deal_name: '' }); load(); } catch (e: any) { setError(e.message); } }
  async function remove(id: number) { if (!confirm('Delete this opportunity?')) return; try { await apiFetch('/api/opportunities', { method: 'DELETE', body: JSON.stringify({ id }) }); load(); } catch (e: any) { setError(e.message); } }
  if (loading) return <Skeleton title="Loading pipeline" />;
  return <section><Header eyebrow="Pipeline" title="Opportunity Kanban" subtitle="Drag deals across the funnel. Each card shows deal value, monthly maintenance, and TCV." />{profile.role === 'admin' && <RepSelector reps={reps} value={selectedOwner} onChange={setSelectedOwner} />}{profile.role !== 'admin' && <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs text-emerald-200">Your commission rate: {profile.commission_rate ?? 10}% on Closed Won deals</div>}{error && <ErrorBox message={error} retry={load} />}<form onSubmit={add} className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-[#101218] p-3 lg:grid-cols-[1fr_.5fr_.7fr_.4fr_.5fr_auto]"><input className="field" value={form.deal_name} onChange={(e) => setForm({ ...form, deal_name: e.target.value })} placeholder="New deal name" /><input className="field" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /><select className="field" value={form.revenue_type} onChange={(e) => setForm({ ...form, revenue_type: e.target.value })}><option>One-Time Project</option><option>Recurring Retainer</option></select><input className="field" type="number" min="1" value={form.contract_term} onChange={(e) => setForm({ ...form, contract_term: Number(e.target.value) })} /><input className="field" type="date" value={form.close_date} onChange={(e) => setForm({ ...form, close_date: e.target.value })} /><button className="rounded-xl bg-white px-5 font-semibold text-black">Add</button></form><div className="grid gap-4 xl:grid-cols-4">{stages.map((stage) => { const cards = opps.filter((o) => o.stage === stage); const total = cards.reduce((s, o) => s + Number(o.amount), 0); return <div key={stage} onDragOver={(e) => e.preventDefault()} onDrop={() => dragId && move(dragId, stage)} className={`min-h-[520px] rounded-3xl border p-3 ${stageTone[stage]}`}><div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold">{stage}</h3><p className="text-xs text-slate-400">{cards[0]?.win_probability ?? (stage === 'Closed Won' ? 100 : stage === 'Proposal Sent' ? 60 : stage === 'Technical Scoping' ? 30 : 10)}% probability</p></div><div className="text-right"><div className="font-bold">{money(total)}</div><div className="text-xs text-slate-500">deal value</div></div></div><div className="space-y-3">{cards.map((o) => { const plan = maintenance.find((m) => m.opportunity_id === o.id || m.client_name.toLowerCase().includes(o.deal_name.split(' ')[0]?.toLowerCase() || '---')); return <div key={o.id} draggable onDragStart={() => setDragId(o.id)} className="rounded-2xl border border-white/10 bg-[#0c0e13] p-4 shadow-xl"><div className="flex items-start justify-between gap-3"><div className="font-medium">{o.deal_name}</div><button onClick={() => remove(o.id)} className="text-xs text-slate-500 hover:text-rose-300">Delete</button></div><div className="mt-4 grid grid-cols-2 gap-2 text-sm"><Info label="Deal Value" value={money(o.amount)} /><Info label="Monthly Maintenance" value={plan ? money(plan.monthly_fee) : o.revenue_type === 'Recurring Retainer' ? money(o.amount) : '$0'} /><Info label="TCV" value={money(tcv(o))} /><Info label="Close" value={o.close_date.slice(0, 10)} /></div>{o.stage === 'Closed Won' && o.commission_amount != null && <div className="mt-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">Commission: <span className="font-semibold">{money(o.commission_amount)}</span></div>}</div>; })}</div></div>; })}</div></section>;
}

function MonthlyMaintenance() {
  const [items, setItems] = useState<MaintenancePlan[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [form, setForm] = useState({ client_name: '', service_name: 'Website Maintenance', monthly_fee: 300, billing_day: 1, status: 'Active', next_invoice_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) });
  const load = () => { setLoading(true); apiFetch<MaintenancePlan[]>('/api/maintenance').then(setItems).catch((e) => setError(e.message)).finally(() => setLoading(false)); };
  useEffect(load, []);
  const activeTotal = items.filter((i) => i.status === 'Active').reduce((s, i) => s + Number(i.monthly_fee), 0);
  const atRiskCount = items.filter(isOverdue).length;
  async function add(e: React.FormEvent) { e.preventDefault(); if (!form.client_name || !form.monthly_fee) { setError('Client and monthly fee are required.'); return; } try { await apiFetch('/api/maintenance', { method: 'POST', body: JSON.stringify(form) }); setForm({ ...form, client_name: '' }); load(); } catch (e: any) { setError(e.message); } }
  async function toggle(item: MaintenancePlan) { try { await apiFetch('/api/maintenance', { method: 'PUT', body: JSON.stringify({ id: item.id, fields: { status: item.status === 'Active' ? 'Paused' : 'Active' } }) }); load(); } catch (e: any) { setError(e.message); } }
  async function remove(id: number) { if (!confirm('Delete maintenance plan?')) return; try { await apiFetch('/api/maintenance', { method: 'DELETE', body: JSON.stringify({ id }) }); load(); } catch (e: any) { setError(e.message); } }
  if (loading) return <Skeleton title="Loading maintenance plans" />;
  return <section><Header eyebrow="Maintenance" title="Monthly maintenance tab" subtitle="Track ongoing website maintenance, hosting, SEO retainers, and recurring support." />{error && <ErrorBox message={error} retry={load} />}{atRiskCount > 0 && <div className="mb-5 flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"><AlertTriangle size={16} /> {atRiskCount} client{atRiskCount > 1 ? 's are' : ' is'} past their invoice date — flagged as churn risk below.</div>}<div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[.5fr_.5fr_1.3fr]"><Metric label="Active Monthly Maintenance" value={money(activeTotal)} bar="bg-emerald-300" /><Metric label="At-Risk Clients" value={String(atRiskCount)} bar="bg-rose-400" /><form onSubmit={add} className="grid gap-3 rounded-3xl border border-white/10 bg-[#101218] p-4 md:grid-cols-3"><input className="field" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} placeholder="Client name" /><input className="field" value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })} placeholder="Service" /><input className="field" type="number" value={form.monthly_fee} onChange={(e) => setForm({ ...form, monthly_fee: Number(e.target.value) })} placeholder="Monthly fee" /><input className="field" type="number" min="1" max="28" value={form.billing_day} onChange={(e) => setForm({ ...form, billing_day: Number(e.target.value) })} /><input className="field" type="date" value={form.next_invoice_date} onChange={(e) => setForm({ ...form, next_invoice_date: e.target.value })} /><button className="rounded-xl bg-emerald-300 font-bold text-black">Add Plan</button></form></div><div className="overflow-x-auto rounded-3xl border border-white/10 bg-[#101218] p-3"><table className="w-full min-w-[900px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="p-3">Client</th><th>Service</th><th>Monthly Fee</th><th>Billing Day</th><th>Next Invoice</th><th>Status</th><th>Payment</th><th>Owner</th><th></th></tr></thead><tbody>{items.map((i) => <tr key={i.id} className={`border-t border-white/5 ${isOverdue(i) ? 'bg-rose-500/[.04]' : ''}`}><td className="p-3 font-medium text-white">{i.client_name}</td><td>{i.service_name}</td><td className="text-emerald-300">{money(i.monthly_fee)}</td><td>{i.billing_day}</td><td>{i.next_invoice_date.slice(0, 10)}</td><td><StatusPill status={i.status} /></td><td>{isOverdue(i) ? <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-3 py-1 text-xs text-rose-200"><AlertTriangle size={12} /> Churn risk</span> : isDueSoon(i) ? <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-100">Due soon</span> : <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100">On track</span>}</td><td className="text-slate-400">{i.owner_email}</td><td className="space-x-2"><button onClick={() => toggle(i)} className="rounded-lg bg-white/10 px-3 py-1 text-xs">{i.status === 'Active' ? 'Pause' : 'Activate'}</button><button onClick={() => remove(i.id)} className="rounded-lg bg-rose-500/20 px-3 py-1 text-xs text-rose-200">Delete</button></td></tr>)}</tbody></table></div></section>;
}

function AccountsContacts() {
  const [data, setData] = useState<{ accounts: Account[]; contacts: Contact[]; opportunities: Opportunity[] } | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const load = () => { setLoading(true); apiFetch<any>('/api/accounts').then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false)); };
  useEffect(load, []);
  if (loading) return <Skeleton title="Loading accounts" />;
  if (error || !data) return <ErrorBox message={error} retry={load} />;
  return <section><Header eyebrow="Database" title="Accounts & contacts" subtitle="Centralized company records linked to contacts and revenue opportunities." /><div className="grid gap-4">{data.accounts.map((a) => { const contacts = data.contacts.filter((c) => c.account_id === a.id); const opps = data.opportunities.filter((o) => o.account_id === a.id); return <div key={a.id} className="rounded-3xl border border-white/10 bg-[#101218] p-5"><div className="flex flex-col justify-between gap-4 md:flex-row"><div><h3 className="text-xl font-semibold">{a.company_name}</h3><p className="text-sm text-slate-400">{a.industry} • {a.location}</p></div><div className="flex gap-2"><Badge>{contacts.length} contacts</Badge><Badge>{opps.length} deals</Badge></div></div><div className="mt-5 grid gap-4 lg:grid-cols-2"><div><div className="mb-2 text-xs uppercase text-slate-500">Contacts</div>{contacts.map((c) => <div key={c.id} className="mb-2 rounded-xl bg-white/[.03] p-3 text-sm"><div className="font-medium">{c.first_name} {c.last_name} <span className="text-slate-500">— {c.role_title}</span></div><div className="text-slate-400"><a href={`tel:${c.phone}`} className="text-cyan-300">{c.phone}</a> {c.email && `• ${c.email}`}</div></div>)}</div><div><div className="mb-2 text-xs uppercase text-slate-500">Opportunities</div>{opps.map((o) => <div key={o.id} className="mb-2 rounded-xl bg-white/[.03] p-3 text-sm"><div className="font-medium">{o.deal_name}</div><div className="text-slate-400">{o.stage} • {money(o.amount)} • TCV {money(tcv(o))}</div></div>)}</div></div></div>; })}</div></section>;
}

function AdminPortal() {
  const [data, setData] = useState<any>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [selectedRep, setSelectedRep] = useState<any | null>(null);
  const [rateSaving, setRateSaving] = useState<string | null>(null);
  const load = () => { setLoading(true); apiFetch<any>('/api/admin').then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false)); };
  useEffect(load, []);
  async function saveCommission(email: string, rate: number) { setRateSaving(email); try { await apiFetch('/api/admin', { method: 'PUT', body: JSON.stringify({ email, commission_rate: rate }) }); await load(); } catch (e: any) { setError(e.message); } finally { setRateSaving(null); } }
  if (loading) return <Skeleton title="Loading admin portal" />;
  if (error) return <ErrorBox message={error} retry={load} />;

  const totalDeals = data.opportunities.reduce((s: number, o: Opportunity) => s + Number(o.amount), 0);
  const maintenance = data.maintenance.filter((m: MaintenancePlan) => m.status === 'Active').reduce((s: number, m: MaintenancePlan) => s + Number(m.monthly_fee), 0);

  if (selectedRep) {
    const repLeads = data.leads.filter((l: any) => l.lead_owner === selectedRep.name || l.owner_email === selectedRep.email);
    const repOpps = data.opportunities.filter((o: any) => o.owner_email === selectedRep.email);
    const repCalls = data.activities.filter((a: any) => a.rep_email === selectedRep.email && a.type?.toLowerCase() === 'call');
    
    const totalDials = repCalls.length;
    const totalPitches = repOpps.length;
    const totalValue = repOpps.reduce((sum: number, o: any) => sum + Number(o.amount || 0), 0);
    const wonDeals = repOpps.filter((o: any) => o.stage === 'Closed Won').length;
    const winRatio = totalPitches > 0 ? Math.round((wonDeals / totalPitches) * 100) : 0;
    const commissionEarned = repOpps.filter((o: any) => o.stage === 'Closed Won').reduce((sum: number, o: any) => sum + Number(o.amount || 0) * (Number(selectedRep.commission_rate ?? 10) / 100), 0);

    return (
      <section>
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <Header eyebrow="Employee Analytics" title={`${selectedRep.name} — Performance Review`} subtitle={`Deep-dive operational tracking for ${selectedRep.title || 'Sales Rep'}.`} />
          <button onClick={() => setSelectedRep(null)} className="rounded-xl border border-white/10 bg-white/[.04] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[.08]">
            ← Back to Dashboard
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Total Dials" value={String(totalDials)} bar="bg-sky-400" />
          <Metric label="Pitches Made" value={String(totalPitches)} bar="bg-indigo-400" />
          <Metric label="Pipeline Value" value={money(totalValue)} bar="bg-emerald-400" />
          <Metric label="Win Ratio" value={`${winRatio}%`} bar="bg-amber-400" />
          <Metric label="Commission Earned" value={money(commissionEarned)} bar="bg-emerald-300" />
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-[#101218] p-5">
            <div className="mb-4 font-semibold text-base text-slate-200">Whom They Pitched (Leads & Accounts)</div>
            {repLeads.length === 0 ? (
              <p className="text-slate-500 text-sm p-3">No mapped lead records detected for this account role.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {repLeads.map((lead: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl bg-white/[.02] p-3 text-sm border border-white/5">
                    <div>
                      <div className="font-medium text-slate-300">{lead.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{lead.phone}</div>
                    </div>
                    <StatusPill status={lead.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#101218] p-5">
            <div className="mb-4 font-semibold text-base text-slate-200">Deal Pipeline In Funnel</div>
            {repOpps.length === 0 ? (
              <p className="text-slate-500 text-sm p-3">No historical pipeline entries tracked for this record.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {repOpps.map((opp: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl bg-white/[.02] p-3 text-sm border border-white/5">
                    <div>
                      <div className="font-medium text-slate-300">{opp.deal_name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Stage: {opp.stage}</div>
                    </div>
                    <span className="font-bold text-emerald-400">{money(opp.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <Header eyebrow="Admin" title="Admin portal" subtitle="Owner-only command view. Select any active employee card below to audit individual operational closing analytics." />
      
      <div className="grid gap-4 lg:grid-cols-4">
        <Metric label="All Leads" value={String(data.leads.length)} bar="bg-cyan-300" />
        <Metric label="All Deal Value" value={money(totalDeals)} bar="bg-violet-300" />
        <Metric label="Monthly Maintenance" value={money(maintenance)} bar="bg-emerald-300" />
        <Metric label="Employees" value={String(data.reps.length)} bar="bg-amber-300" />
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-[#101218] p-5">
        <div className="mb-4 text-base font-semibold text-slate-200">Team Directory Index</div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.reps.map((rep: any) => (
            <div key={rep.id || rep.email} onClick={() => setSelectedRep(rep)} className="group cursor-pointer rounded-2xl border border-white/10 bg-white/[.02] p-4 transition hover:border-cyan-500/30 hover:bg-white/[.05]">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 font-bold text-black transition group-hover:scale-105">
                  {rep.name ? rep.name[0].toUpperCase() : 'E'}
                </div>
                <div>
                  <div className="font-medium text-slate-200 group-hover:text-cyan-300 transition-colors">{rep.name}</div>
                  <div className="text-xs text-slate-500">{rep.title || 'Account Representative'}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-400/5 border border-emerald-400/10 px-3 py-2 text-xs">
                <span className="text-emerald-200/70">Commission earned</span>
                <span className="font-semibold text-emerald-100">{money(rep.commission_earned || 0)}</span>
              </div>
              <div onClick={(e) => e.stopPropagation()} className="mt-2 flex items-center gap-2">
                <input type="number" min="0" max="100" defaultValue={rep.commission_rate ?? 10} onBlur={(e) => { const v = Number(e.target.value); if (v !== rep.commission_rate) saveCommission(rep.email, v); }} className="field w-16 !py-1.5 !px-2 text-xs" />
                <span className="text-xs text-slate-500">% commission rate {rateSaving === rep.email && '· saving...'}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-white/5 pt-3">
                <span className="truncate max-w-[140px]">{rep.email}</span>
                <span className="text-cyan-400 font-medium group-hover:translate-x-1 transition-transform">Deep-dive performance →</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {(data.overdueInvoices?.length > 0 || data.upcomingInvoices?.length > 0) && <div className="mt-6 rounded-3xl border border-rose-400/20 bg-[#101218] p-5">
        <div className="mb-4 flex items-center gap-2 text-base font-semibold text-rose-200"><AlertTriangle size={18} /> Churn Risk & Invoice Reminders</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><div className="mb-2 text-xs uppercase text-slate-500">Overdue — churn risk ({data.overdueInvoices?.length || 0})</div>{(data.overdueInvoices || []).map((m: MaintenancePlan) => <div key={m.id} className="mb-2 flex items-center justify-between rounded-xl bg-rose-500/10 p-3 text-sm"><span className="text-rose-100">{m.client_name}</span><span className="text-xs text-rose-300">{m.next_invoice_date.slice(0, 10)} · {money(m.monthly_fee)}/mo</span></div>)}{(!data.overdueInvoices || data.overdueInvoices.length === 0) && <p className="text-sm text-slate-500">None — nice.</p>}</div>
          <div><div className="mb-2 text-xs uppercase text-slate-500">Due within 3 days ({data.upcomingInvoices?.length || 0})</div>{(data.upcomingInvoices || []).map((m: MaintenancePlan) => <div key={m.id} className="mb-2 flex items-center justify-between rounded-xl bg-amber-500/10 p-3 text-sm"><span className="text-amber-100">{m.client_name}</span><span className="text-xs text-amber-300">{m.next_invoice_date.slice(0, 10)} · {money(m.monthly_fee)}/mo</span></div>)}{(!data.upcomingInvoices || data.upcomingInvoices.length === 0) && <p className="text-sm text-slate-500">None due soon.</p>}</div>
        </div>
      </div>}

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <AdminTable title="All Leads" rows={data.leads} cols={[['name','Lead'],['phone','Phone'],['status','Status'],['lead_owner','Owner']]} />
        <AdminTable title="All Opportunities" rows={data.opportunities} cols={[['deal_name','Deal'],['stage','Stage'],['amount','Value'],['owner_email','Owner']]} moneyKey="amount" />
        <AdminTable title="Monthly Maintenance" rows={data.maintenance} cols={[['client_name','Client'],['service_name','Service'],['monthly_fee','Monthly'],['status','Status']]} moneyKey="monthly_fee" />
        <AdminTable title="Accounts" rows={data.accounts} cols={[['company_name','Company'],['industry','Industry'],['location','Location']]} />
        <AdminTable title="Recent Activity" rows={data.activities} cols={[['type','Type'],['note','Note'],['rep_email','Rep']]} />
      </div>
    </section>
  );
}

function AdminTable({ title, rows, cols, moneyKey }: { title: string; rows: any[]; cols: [string, string][]; moneyKey?: string }) { return <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#101218]"><div className="border-b border-white/10 p-4 font-semibold">{title}</div><div className="max-h-96 overflow-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="sticky top-0 bg-[#101218] text-xs uppercase text-slate-500"><tr>{cols.map((c) => <th key={c[0]} className="p-3">{c[1]}</th>)}</tr></thead><tbody>{rows.map((row, idx) => <tr key={row.id || idx} className="border-t border-white/5">{cols.map((c) => <td key={c[0]} className="p-3 text-slate-300">{moneyKey === c[0] ? money(row[c[0]]) : String(row[c[0]] ?? '').slice(0, 80)}</td>)}</tr>)}</tbody></table></div></div>; }

function Header({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) { return <div className="mb-6"><div className="mb-2 text-xs font-semibold uppercase tracking-[.22em] text-cyan-300">{eyebrow}</div><h1 className="text-3xl font-semibold tracking-[-0.04em] md:text-5xl">{title}</h1><p className="mt-2 max-w-3xl text-slate-400">{subtitle}</p></div>; }

function RepSelector({ reps, value, onChange }: { reps: SalesRep[]; value: string; onChange: (v: string) => void }) {
  return <div className="mb-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#101218] p-3">
    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 pl-1">Viewing</span>
    <select className="field !py-2 !px-3 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">All Reps (combined)</option>
      {reps.map((r) => <option key={r.email} value={r.email}>{r.name}{r.role === 'admin' ? ' (Admin)' : ''}</option>)}
    </select>
  </div>;
}
function Metric({ label, value, bar }: { label: string; value: string; bar: string }) { return <div className="rounded-3xl border border-white/10 bg-[#101218] p-5"><div className={`mb-8 h-2 w-16 rounded-full ${bar}`} /><div className="text-sm text-slate-500">{label}</div><div className="mt-2 text-3xl font-bold tracking-[-0.04em]">{value}</div></div>; }
function Mini({ label, value }: { label: string; value: any }) { return <div className="rounded-xl bg-white/[.04] p-3"><div className="text-lg font-bold">{value}</div><div className="text-xs text-slate-500">{label}</div></div>; }
function Input({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string }) { return <label className="mt-4 block text-sm text-slate-400"><span className="mb-2 block">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="field w-full" /></label>; }
function Badge({ children }: { children: React.ReactNode }) { return <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-xs text-slate-300">{children}</span>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-white/[.04] p-3"><div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1 break-words text-sm text-slate-200">{value}</div></div>; }
function Action({ label, tone, onClick }: { label: string; tone: string; onClick: () => void }) { return <button onClick={onClick} className={`rounded-xl px-4 py-3 text-left text-sm font-semibold text-white transition hover:brightness-110 ${tone}`}>{label}</button>; }
function StatusPill({ status }: { status: string }) { const cls = status.includes('Dead') ? 'bg-rose-500/15 text-rose-200' : status.includes('Pitched') || status.includes('Retry') || status.includes('Paused') ? 'bg-amber-500/15 text-amber-100' : status.includes('Converted') || status.includes('Active') ? 'bg-emerald-500/15 text-emerald-100' : 'bg-slate-500/15 text-slate-200'; return <span className={`rounded-full px-3 py-1 text-xs ${cls}`}>{status}</span>; }
function Skeleton({ title }: { title: string }) { return <div className="rounded-3xl border border-white/10 bg-[#101218] p-8 text-slate-400"><div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />{title}...</div>; }
function ErrorBox({ message, retry }: { message: string; retry: () => void }) { return <div className="mb-5 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-rose-100"><div className="font-medium">Something needs attention</div><div className="text-sm opacity-80">{message}</div><button onClick={retry} className="mt-3 rounded-lg bg-white px-3 py-1 text-sm font-semibold text-black">Retry</button></div>; }
export default App;
