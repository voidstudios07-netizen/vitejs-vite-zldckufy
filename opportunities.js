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
const inDays = (days) => new Date(Date.now() + days * 86400000).toISOString();
async function logActivity(payload) {
  await supabase.from('activities').insert(payload);
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const profile = await requireProfile(req);
    if (req.method === 'GET') {
      let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (profile.role !== 'admin') query = query.eq('lead_owner', profile.email);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const { name, phone, website_status, source_url, lead_owner, gatekeeper_name } = req.body || {};
      if (!name || !phone || !website_status) return res.status(400).json({ error: 'Business name, phone, and website status are required.' });
      const owner = profile.role === 'admin' && lead_owner ? lead_owner : profile.email;
      const { data, error } = await supabase.from('leads').insert({ name, phone, website_status, source_url: source_url || '', gatekeeper_name: gatekeeper_name || '', lead_owner: owner, status: 'New', call_count: 0 }).select().single();
      if (error) throw error;
      await logActivity({ lead_id: data.id, rep_email: owner, type: 'Lead Created', note: `Quick-added ${name}` });
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, action, follow_up_date, fields } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Lead id is required.' });
      const { data: lead, error: leadError } = await supabase.from('leads').select('*').eq('id', id).single();
      if (leadError) throw leadError;
      if (profile.role !== 'admin' && lead.lead_owner !== profile.email) return res.status(403).json({ error: 'Forbidden' });
      let update = fields || {};
      let activity = 'Lead Updated';
      let note = 'Lead details updated';
      if (action === 'no_answer') { update = { call_count: (lead.call_count || 0) + 1, status: 'No Answer - Retry' }; activity = 'No Answer/Busy'; note = 'Call attempt logged; retry needed.'; }
      if (action === 'gatekeeper') { update = { status: 'Gatekeeper Blocked', follow_up_date: inDays(3) }; activity = 'Gatekeeper Blocked'; note = 'Blocked by gatekeeper; soft follow-up scheduled.'; }
      if (action === 'not_interested') { update = { status: 'Dead/Disqualified' }; activity = 'Not Interested'; note = 'Lead disqualified.'; }
      if (action === 'pitched') { update = { status: 'Pitched', follow_up_date }; activity = 'Pitched/Follow-up'; note = `Pitch completed. Follow-up: ${follow_up_date || 'not scheduled'}.`; }
      const { data, error } = await supabase.from('leads').update(update).eq('id', id).select().single();
      if (error) throw error;
      await logActivity({ lead_id: id, rep_email: profile.email, type: activity, note, follow_up_date: update.follow_up_date || null });
      return res.status(200).json(data);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    const status = err.message === 'Unauthorized' || err.message === 'Invalid token' ? 401 : 500;
    res.status(status).json({ error: err.message });
  }
}
