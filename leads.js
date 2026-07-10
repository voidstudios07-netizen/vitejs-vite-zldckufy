import supabase from './db-client.js';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
async function requireAdmin(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new Error('Unauthorized');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('Invalid token');
  const { data: profile, error: pError } = await supabase.from('sales_reps').select('*').eq('email', user.email).single();
  if (pError) throw pError;
  if (profile.role !== 'admin') throw new Error('Admin access required');
  return profile;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    await requireAdmin(req);
    if (req.method === 'PUT') {
      const { email, commission_rate } = req.body || {};
      if (!email || commission_rate === undefined) return res.status(400).json({ error: 'Rep email and commission_rate are required.' });
      const rate = Number(commission_rate);
      if (Number.isNaN(rate) || rate < 0 || rate > 100) return res.status(400).json({ error: 'Commission rate must be a number between 0 and 100.' });
      const { data, error } = await supabase.from('sales_reps').update({ commission_rate: rate }).eq('email', email).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const [reps, leads, accounts, contacts, opportunities, activities, maintenance] = await Promise.all([
      supabase.from('sales_reps').select('*').order('role', { ascending: true }),
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('accounts').select('*').order('company_name', { ascending: true }),
      supabase.from('contacts').select('*').order('id', { ascending: true }),
      supabase.from('opportunities').select('*').order('close_date', { ascending: true }),
      supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('monthly_maintenance').select('*').order('next_invoice_date', { ascending: true })
    ]);
    for (const result of [reps, leads, accounts, contacts, opportunities, activities, maintenance]) if (result.error) throw result.error;

    // Commission per rep: sum of (Closed Won deal amount * their commission_rate) they own
    const repsWithCommission = reps.data.map((rep) => {
      const rate = Number(rep.commission_rate ?? 10);
      const wonDeals = opportunities.data.filter((o) => o.stage === 'Closed Won' && o.owner_email === rep.email);
      const commissionEarned = wonDeals.reduce((sum, o) => sum + Number(o.amount || 0) * (rate / 100), 0);
      return { ...rep, commission_rate: rate, commission_earned: commissionEarned, closed_won_count: wonDeals.length };
    });

    // Churn / invoice risk across all active maintenance clients
    const now = new Date();
    const in3Days = new Date(Date.now() + 3 * 86400000);
    const activeMaint = maintenance.data.filter((m) => m.status === 'Active');
    const overdueInvoices = activeMaint.filter((m) => new Date(m.next_invoice_date) < now);
    const upcomingInvoices = activeMaint.filter((m) => { const d = new Date(m.next_invoice_date); return d >= now && d <= in3Days; });

    return res.status(200).json({ reps: repsWithCommission, leads: leads.data, accounts: accounts.data, contacts: contacts.data, opportunities: opportunities.data, activities: activities.data, maintenance: maintenance.data, overdueInvoices, upcomingInvoices });
  } catch (err) {
    console.error('API error:', err);
    const status = err.message === 'Unauthorized' || err.message === 'Invalid token' ? 401 : err.message.includes('Admin') ? 403 : 500;
    res.status(status).json({ error: err.message });
  }
}
