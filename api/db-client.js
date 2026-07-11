import { createClient } from '@supabase/supabase-js';

const PROJECT_REF = process.env.FULLSTACK_PROJECT_REF || '';
const RESTORE_URL = process.env.FULLSTACK_RESTORE_API_URL || '';
let _restoreTriggered = false;
function triggerRestore() {
  if (_restoreTriggered || !PROJECT_REF || !RESTORE_URL) return;
  _restoreTriggered = true;
  fetch(RESTORE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_ref: PROJECT_REF }),
  }).catch(() => {});
  setTimeout(() => { _restoreTriggered = false; }, 60000);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    global: {
      fetch: async (url, options) => {
        const res = await fetch(url, options);
        if (!res.ok && res.status >= 500) triggerRestore();
        return res;
      },
    },
  }
);

export default supabase;
