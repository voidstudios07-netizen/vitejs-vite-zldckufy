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

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const profile = await requireProfile(req);
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { lead_id, amount, revenue_type, contract_term, close_date } = req.body || {};
    if (!lead_id || !amount || !revenue_type || !contract_term || !close_date) return res.status(400).json({ error: 'Lead, amount, revenue type, term, and close date are required.' });
    const { data: lead, error: leadError } = await supabase.from('leads').select('*').eq('id', lead_id).single();
    if (leadError) throw leadError;
    if (profile.role !== 'admin' && lead.lead_owner !== profile.email) return res.status(403).json({ error: 'Forbidden' });

    const { data: account, error: accError } = await supabase.from('accounts').insert({ company_name: lead.name, industry: 'Local Business', location: 'To qualify' }).select().single();
    if (accError) throw accError;
    const names = (lead.gatekeeper_name || 'Primary Contact').split(' ');
    const { data: contact, error: conError } = await supabase.from('contacts').insert({ account_id: account.id, first_name: names[0], last_name: names.slice(1).join(' ') || 'Contact', email: '', phone: lead.phone, role_title: 'Decision Maker' }).select().single();
    if (conError) throw conError;
    const { data: opportunity, error: oppError } = await supabase.from('opportunities').insert({ account_id: account.id, deal_name: `${lead.name} Website Growth Sprint`, stage: 'Discovery Call', amount, revenue_type, contract_term, close_date, win_probability: 10, owner_email: lead.lead_owner }).select().single();
    if (oppError) throw oppError;
    await supabase.from('leads').update({ status: 'Converted' }).eq('id', lead.id);
    await supabase.from('activities').insert({ lead_id: lead.id, opportunity_id: opportunity.id, rep_email: profile.email, type: 'Booked Discovery', note: 'Converted lead to account, contact, and discovery opportunity.' });
    return res.status(201).json({ account, contact, opportunity });
  } catch (err) {
    console.error('API error:', err);
    const status = err.message === 'Unauthorized' || err.message === 'Invalid token' ? 401 : 500;
    res.status(status).json({ error: err.message });
  }
}
