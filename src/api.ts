export type SessionBundle = { token: string; profile: SalesRep };

export type SalesRep = { id: number; name: string; email: string; role: 'admin' | 'employee'; title: string; avatar_color: string };
export type Lead = { id: number; name: string; phone: string; source_url: string; website_status: string; call_count: number; gatekeeper_name: string; lead_owner: string; status: string; follow_up_date?: string; created_at: string };
export type Opportunity = { id: number; account_id?: number; deal_name: string; stage: string; amount: number; revenue_type: string; contract_term: number; close_date: string; win_probability: number; owner_email: string; created_at: string };
export type Account = { id: number; company_name: string; industry: string; location: string; created_at: string };
export type Contact = { id: number; account_id: number; first_name: string; last_name: string; email: string; phone: string; role_title: string };
export type MaintenancePlan = { id: number; opportunity_id?: number; client_name: string; service_name: string; monthly_fee: number; billing_day: number; status: string; owner_email: string; next_invoice_date: string; created_at: string };

export const tokenStore = {
  get: () => localStorage.getItem('void_token') || '',
  set: (token: string) => localStorage.setItem('void_token', token),
  clear: () => localStorage.removeItem('void_token')
};

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  const token = tokenStore.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value || 0));
export const tcv = (opp: Opportunity) => opp.revenue_type === 'Recurring Retainer' ? Number(opp.amount) * Number(opp.contract_term || 1) : Number(opp.amount);
