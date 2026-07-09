"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
function App() {
    var _a = (0, react_1.useState)('dashboard'), view = _a[0], setView = _a[1];
    return (<div className="flex min-h-screen bg-[#08090c] text-white">
      {/* Sidebar */}
      <aside className="w-72 border-r border-white/10 p-6 flex flex-col">
        <div className="space-y-4">
          <button onClick={function () { return setView('dashboard'); }} className={"w-full p-3 rounded-lg flex items-center gap-3 ".concat(view === 'dashboard' ? 'bg-white text-black' : 'text-slate-400 hover:text-white')}>
            <lucide_react_1.BarChart3 size={18}/> Dashboard
          </button>
          <button onClick={function () { return setView('admin'); }} className={"w-full p-3 rounded-lg flex items-center gap-3 ".concat(view === 'admin' ? 'bg-white text-black' : 'text-slate-400 hover:text-white')}>
            <lucide_react_1.Crown size={18}/> Admin Portal
          </button>
        </div>
        <div className="mt-auto">
          <button className="flex items-center gap-2 text-slate-500 hover:text-white">
            <lucide_react_1.LogOut size={16}/> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {view === 'admin' ? (<div className="p-10 border border-white/10 rounded-2xl bg-white/5">
            <h1 className="text-3xl font-bold">Admin Portal</h1>
            <p className="mt-4">You have successfully switched views!</p>
          </div>) : (<h1 className="text-3xl font-bold">Dashboard Overview</h1>)}
      </main>
    </div>);
}
