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
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`to_email.eq.${profile.email},to_email.is.null`)
        .neq('from_email', profile.email)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      if (profile.role !== 'admin') return res.status(403).json({ error: 'Only admins can send messages.' });
      const { body, to_email } = req.body || {};
      if (!body || !body.trim()) return res.status(400).json({ error: 'Message body is required.' });
      const { data, error } = await supabase.from('messages').insert({ from_email: profile.email, to_email: to_email || null, body: body.trim() }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    const status = err.message === 'Unauthorized' || err.message === 'Invalid token' ? 401 : 500;
    res.status(status).json({ error: err.message });
  }
}
