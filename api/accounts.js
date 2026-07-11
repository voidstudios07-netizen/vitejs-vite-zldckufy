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
    if (req.method === 'GET') {
      const { data: opportunities, error: oError } = await (profile.role === 'admin' ? supabase.from('opportunities').select('*') : supabase.from('opportunities').select('*').eq('owner_email', profile.email));
      if (oError) throw oError;
      const accountIds = [...new Set((opportunities || []).map((o) => o.account_id).filter(Boolean))];
      let accountsQuery = supabase.from('accounts').select('*').order('company_name', { ascending: true });
      if (profile.role !== 'admin') accountsQuery = accountIds.length ? accountsQuery.in('id', accountIds) : accountsQuery.eq('id', -1);
      const { data: accounts, error: aError } = await accountsQuery;
      if (aError) throw aError;
      const ids = (accounts || []).map((a) => a.id);
      const { data: contacts, error: cError } = ids.length ? await supabase.from('contacts').select('*').in('account_id', ids) : { data: [], error: null };
      if (cError) throw cError;
      const oppIds = (opportunities || []).map((o) => o.id);
      const { data: activities, error: actError } = oppIds.length ? await supabase.from('activities').select('*').in('opportunity_id', oppIds).order('created_at', { ascending: false }) : { data: [], error: null };
      if (actError) throw actError;
      return res.status(200).json({ accounts, contacts, opportunities, activities });
    }
    if (req.method === 'POST') {
      const { company_name, industry, location, contact } = req.body || {};
      if (!company_name || !industry || !location) return res.status(400).json({ error: 'Company, industry, and location are required.' });
      const { data: account, error } = await supabase.from('accounts').insert({ company_name, industry, location }).select().single();
      if (error) throw error;
      let createdContact = null;
      if (contact?.first_name) {
        const { data: cData, error: cError } = await supabase.from('contacts').insert({ ...contact, account_id: account.id }).select().single();
        if (cError) throw cError;
        createdContact = cData;
      }
      return res.status(201).json({ account, contact: createdContact });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    const status = err.message === 'Unauthorized' || err.message === 'Invalid token' ? 401 : 500;
    res.status(status).json({ error: err.message });
  }
}
