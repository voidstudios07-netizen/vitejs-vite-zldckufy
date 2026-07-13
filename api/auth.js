import supabase from './db-client.js';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const body = req.body || {};

    // LOGOUT: close out the rep's most recent open session
    if (body.mode === 'logout') {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) return res.status(401).json({ error: 'Invalid token' });
      const { data: openSession } = await supabase.from('login_logs').select('id').eq('rep_email', user.email).is('logout_at', null).order('logged_in_at', { ascending: false }).limit(1).maybeSingle();
      if (openSession) await supabase.from('login_logs').update({ logout_at: new Date().toISOString() }).eq('id', openSession.id);
      return res.status(200).json({ ok: true });
    }

    // HEARTBEAT: mark the rep's open session as still active (called every few minutes while the tab is visible)
    if (body.mode === 'heartbeat') {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) return res.status(401).json({ error: 'Invalid token' });
      const { data: openSession } = await supabase.from('login_logs').select('id').eq('rep_email', user.email).is('logout_at', null).order('logged_in_at', { ascending: false }).limit(1).maybeSingle();
      if (openSession) await supabase.from('login_logs').update({ last_seen: new Date().toISOString() }).eq('id', openSession.id);
      return res.status(200).json({ ok: true });
    }

    const { email, password, mode } = body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const sanitizedEmail = email.trim().toLowerCase();

    // 1. SECURITY CHECK FOR SIGNUPS
    if (mode === 'signup') {
      // Look up if this email was pre-approved by the admin in the sales_reps table
      const { data: approvedMember, error: checkError } = await supabase
        .from('sales_reps')
        .select('*')
        .eq('email', sanitizedEmail)
        .maybeSingle();

      if (checkError) throw checkError;

      // If they aren't on your team list, kick them out!
      if (!approvedMember) {
        return res.status(403).json({ 
          error: 'Access Denied: Your email is not whitelisted. Please request access from your agency administrator.' 
        });
      }

      // Admin accounts must be created directly in Supabase by the owner,
      // never through self-service signup — this prevents anyone who
      // discovers/guesses the admin email from claiming that account.
      if (approvedMember.role === 'admin') {
        return res.status(403).json({
          error: 'This account already exists. Please log in instead of signing up.'
        });
      }

      // Create their credentials securely using your master bypass key
      const { error: createError } = await supabase.auth.admin.createUser({ 
        email: sanitizedEmail, 
        password, 
        email_confirm: true 
      });
      
      if (createError && !createError.message.toLowerCase().includes('already')) throw createError;
    }

    // 2. SIGN IN 
    const { data, error } = await supabase.auth.signInWithPassword({ email: sanitizedEmail, password });
    if (error) return res.status(401).json({ error: 'Invalid login credentials.' });
    
    // Grab their pre-configured profile details — retry once, since Supabase's free-tier
    // database can be briefly asleep right after inactivity, causing the first query to fail.
    async function fetchProfile() {
      for (let attempt = 0; attempt < 2; attempt++) {
        const { data: p, error: pErr } = await supabase.from('sales_reps').select('*').eq('email', sanitizedEmail).single();
        if (p && !pErr) return p;
        if (attempt === 0) await new Promise((r) => setTimeout(r, 1200));
      }
      return null;
    }
    const profile = await fetchProfile();
    if (!profile) return res.status(503).json({ error: 'The server was waking up from idle — please try logging in again, it should work now.' });

    // Log this login for admin visibility (awaited so it actually saves — but never fails the login if it errors)
    try {
      const now = new Date().toISOString();
      const { error: logErr } = await supabase.from('login_logs').insert({ rep_email: sanitizedEmail, last_seen: now });
      if (logErr) console.error('login_logs insert failed:', logErr.message, logErr.details, logErr.hint);
    } catch (e) { console.error('login_logs insert threw:', e.message); }

    return res.status(200).json({ 
      session: data.session, 
      user: data.user, 
      profile, 
      message: mode === 'signup' ? 'Profile activated successfully.' : 'Signed in.' 
    });
    
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message || 'Internal authentication error.' });
  }
}
