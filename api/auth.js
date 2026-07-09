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
    
    const { email, password, mode } = req.body || {};
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
    
    // Grab their pre-configured profile details
    const { data: profile } = await supabase.from('sales_reps').select('*').eq('email', sanitizedEmail).single();
    
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