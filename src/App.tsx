import { useState } from 'react';
import { BarChart3, Crown, LogOut } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('dashboard');

  return (
    <div className="flex min-h-screen bg-[#08090c] text-white">
      {/* Sidebar */}
      <aside className="w-72 border-r border-white/10 p-6 flex flex-col">
        <div className="space-y-4">
          <button 
            onClick={() => setView('dashboard')} 
            className={`w-full p-3 rounded-lg flex items-center gap-3 ${view === 'dashboard' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'}`}
          >
            <BarChart3 size={18} /> Dashboard
          </button>
          <button 
            onClick={() => setView('admin')} 
            className={`w-full p-3 rounded-lg flex items-center gap-3 ${view === 'admin' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'}`}
          >
            <Crown size={18} /> Admin Portal
          </button>
        </div>
        <div className="mt-auto">
          <button className="flex items-center gap-2 text-slate-500 hover:text-white">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {view === 'admin' ? (
          <div className="p-10 border border-white/10 rounded-2xl bg-white/5">
            <h1 className="text-3xl font-bold">Admin Portal</h1>
            <p className="mt-4">You have successfully switched views!</p>
          </div>
        ) : (
          <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        )}
      </main>
    </div>
  );
}