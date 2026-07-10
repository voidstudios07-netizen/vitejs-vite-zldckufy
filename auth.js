import supabase from './db-client.js';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
async function requireProfile(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new Error('Unauthorized');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('Invalid token');
  const { data: profile, error: pError } = await supabase.from('sales_reps').select('*').eq('email', user.email).single();
  if (pError) throw pError;
  return profile;
}
const todayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); };

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const profile = await requireProfile(req);
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const { data: reps, error: rError } = await supabase.from('sales_reps').select('*').order('role', { ascending: true });
    if (rError) throw rError;
    let oppQuery = supabase.from('opportunities').select('*');
    let actQuery = supabase.from('activities').select('*').gte('created_at', todayStart());
    let mainQuery = supabase.from('monthly_maintenance').select('*');
    if (profile.role !== 'admin') { oppQuery = oppQuery.eq('owner_email', profile.email); actQuery = actQuery.eq('rep_email', profile.email); mainQuery = mainQuery.eq('owner_email', profile.email); }
    const { data: opportunities, error: oError } = await oppQuery;
    if (oError) throw oError;
    const { data: activities, error: aError } = await actQuery;
    if (aError) throw aError;
    const { data: maintenance, error: mError } = await mainQuery;
    if (mError) throw mError;
    const visibleReps = profile.role === 'admin' ? reps : reps.filter((r) => r.email === profile.email);
    const leaderGrid = visibleReps.map((rep) => {
      const repActs = activities.filter((a) => a.rep_email === rep.email);
      const dials = repActs.filter((a) => ['No Answer/Busy', 'Gatekeeper Blocked', 'Not Interested', 'Pitched/Follow-up', 'Booked Discovery'].includes(a.type)).length;
      const pitches = repActs.filter((a) => ['Pitched/Follow-up', 'Booked Discovery'].includes(a.type)).length;
      return { ...rep, total_dials_today: dials, total_pitches: pitches, pitch_success_rate: dials ? Math.round((pitches / dials) * 100) : 0 };
    });
    const activeOpps = opportunities.filter((o) => o.stage !== 'Closed Lost');
    const rawPipeline = activeOpps.reduce((sum, o) => sum + Number(o.amount || 0), 0);
    const expectedRevenue = activeOpps.reduce((sum, o) => sum + Number(o.amount || 0) * (Number(o.win_probability || 0) / 100), 0);
    const mrr = opportunities.filter((o) => o.stage === 'Closed Won' && o.revenue_type === 'Recurring Retainer').reduce((sum, o) => sum + Number(o.amount || 0), 0);
    const monthlyMaintenance = maintenance.filter((m) => m.status === 'Active').reduce((sum, m) => sum + Number(m.monthly_fee || 0), 0);

    // Commission: this rep's commission on their own Closed Won deals
    const repRate = Number(profile.commission_rate ?? 10);
    const ownClosedWon = opportunities.filter((o) => o.stage === 'Closed Won' && o.owner_email === profile.email);
    const commissionEarned = ownClosedWon.reduce((sum, o) => sum + Number(o.amount || 0) * (repRate / 100), 0);

    // Invoice reminders / churn risk: computed from next_invoice_date on active maintenance plans
    const now = new Date();
    const in3Days = new Date(Date.now() + 3 * 86400000);
    const activeMaint = maintenance.filter((m) => m.status === 'Active');
    const overdueInvoices = activeMaint.filter((m) => new Date(m.next_invoice_date) < now);
    const upcomingInvoices = activeMaint.filter((m) => { const d = new Date(m.next_invoice_date); return d >= now && d <= in3Days; });

    return res.status(200).json({ profile, leaderGrid, financials: { rawPipeline, expectedRevenue, mrr, monthlyMaintenance, commissionEarned, commissionRate: repRate, ownerVisible: profile.role === 'admin' }, opportunities, maintenance, overdueInvoices, upcomingInvoices });
  } catch (err) {
    console.error('API error:', err);
    const status = err.message === 'Unauthorized' || err.message === 'Invalid token' ? 401 : 500;
    res.status(status).json({ error: err.message });
  }
}
