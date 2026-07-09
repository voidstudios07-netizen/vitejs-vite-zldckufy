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
    return res.status(200).json({ reps: reps.data, leads: leads.data, accounts: accounts.data, contacts: contacts.data, opportunities: opportunities.data, activities: activities.data, maintenance: maintenance.data });
  } catch (err) {
    console.error('API error:', err);
    const status = err.message === 'Unauthorized' || err.message === 'Invalid token' ? 401 : err.message.includes('Admin') ? 403 : 500;
    res.status(status).json({ error: err.message });
  }
}
