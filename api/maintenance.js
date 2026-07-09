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
      let query = supabase.from('monthly_maintenance').select('*').order('next_invoice_date', { ascending: true });
      if (profile.role !== 'admin') query = query.eq('owner_email', profile.email);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const body = req.body || {};
      if (!body.client_name || !body.service_name || !body.monthly_fee || !body.next_invoice_date) return res.status(400).json({ error: 'Client, service, monthly fee, and next invoice date are required.' });
      const { data, error } = await supabase.from('monthly_maintenance').insert({ opportunity_id: body.opportunity_id || null, client_name: body.client_name, service_name: body.service_name, monthly_fee: body.monthly_fee, billing_day: body.billing_day || 1, status: body.status || 'Active', owner_email: profile.role === 'admin' && body.owner_email ? body.owner_email : profile.email, next_invoice_date: body.next_invoice_date }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, fields } = req.body || {};
      if (!id || !fields) return res.status(400).json({ error: 'Maintenance id and fields are required.' });
      const { data: item, error: itemError } = await supabase.from('monthly_maintenance').select('*').eq('id', id).single();
      if (itemError) throw itemError;
      if (profile.role !== 'admin' && item.owner_email !== profile.email) return res.status(403).json({ error: 'Forbidden' });
      const { data, error } = await supabase.from('monthly_maintenance').update(fields).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Maintenance id is required.' });
      const { data: item, error: itemError } = await supabase.from('monthly_maintenance').select('*').eq('id', id).single();
      if (itemError) throw itemError;
      if (profile.role !== 'admin' && item.owner_email !== profile.email) return res.status(403).json({ error: 'Forbidden' });
      const { error } = await supabase.from('monthly_maintenance').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    const status = err.message === 'Unauthorized' || err.message === 'Invalid token' ? 401 : 500;
    res.status(status).json({ error: err.message });
  }
}
