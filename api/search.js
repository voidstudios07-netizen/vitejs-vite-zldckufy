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
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.status(200).json({ leads: [], accounts: [], contacts: [] });
    const like = `%${q}%`;

    let leadsQuery = supabase.from('leads').select('*').or(`name.ilike.${like},phone.ilike.${like}`).limit(20);
    if (profile.role !== 'admin') leadsQuery = leadsQuery.eq('lead_owner', profile.email);
    const { data: leads, error: lError } = await leadsQuery;
    if (lError) throw lError;

    const { data: opportunities, error: oError } = await (profile.role === 'admin' ? supabase.from('opportunities').select('*') : supabase.from('opportunities').select('*').eq('owner_email', profile.email));
    if (oError) throw oError;
    const accountIds = [...new Set((opportunities || []).map((o) => o.account_id).filter(Boolean))];

    let accountsQuery = supabase.from('accounts').select('*').ilike('company_name', like).limit(20);
    if (profile.role !== 'admin') accountsQuery = accountIds.length ? accountsQuery.in('id', accountIds) : accountsQuery.eq('id', -1);
    const { data: accounts, error: aError } = await accountsQuery;
    if (aError) throw aError;

    let contactsQuery = supabase.from('contacts').select('*').or(`first_name.ilike.${like},last_name.ilike.${like},phone.ilike.${like},email.ilike.${like}`).limit(20);
    if (profile.role !== 'admin') contactsQuery = accountIds.length ? contactsQuery.in('account_id', accountIds) : contactsQuery.eq('account_id', -1);
    const { data: contacts, error: cError } = await contactsQuery;
    if (cError) throw cError;

    return res.status(200).json({ leads, accounts, contacts });
  } catch (err) {
    console.error('API error:', err);
    const status = err.message === 'Unauthorized' || err.message === 'Invalid token' ? 401 : 500;
    res.status(status).json({ error: err.message });
  }
}
