import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar: React.FC = () => {
  return (
    <nav className="h-screen w-56 bg-slate-900 text-white flex flex-col py-6 px-3 fixed top-0 left-0 z-10">
      <div className="mb-8 text-2xl font-bold tracking-wide text-center text-cyan-400">Zentra</div>
      <div className="flex-1 flex flex-col gap-6">
        <div>
          <div className="text-xs uppercase text-slate-400 mb-2 pl-2">Main</div>
          <ul className="space-y-1">
            <li><NavLink to="/dashboard" className={({ isActive }) => isActive ? "block rounded bg-cyan-700 px-4 py-2 font-semibold" : "block rounded hover:bg-slate-800 px-4 py-2"}>Dashboard</NavLink></li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase text-slate-400 mb-2 pl-2">Management</div>
          <ul className="space-y-1">
            <li><NavLink to="/customers" className={({ isActive }) => isActive ? "block rounded bg-cyan-700 px-4 py-2 font-semibold" : "block rounded hover:bg-slate-800 px-4 py-2"}>Customers</NavLink></li>
            <li><NavLink to="/plan-managers" className={({ isActive }) => isActive ? "block rounded bg-cyan-700 px-4 py-2 font-semibold" : "block rounded hover:bg-slate-800 px-4 py-2"}>Plan Managers</NavLink></li>
            <li><NavLink to="/subscriptions" className={({ isActive }) => isActive ? "block rounded bg-cyan-700 px-4 py-2 font-semibold" : "block rounded hover:bg-slate-800 px-4 py-2"}>Subscriptions</NavLink></li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase text-slate-400 mb-2 pl-2">Finance</div>
          <ul className="space-y-1">
            <li><NavLink to="/payments" className={({ isActive }) => isActive ? "block rounded bg-cyan-700 px-4 py-2 font-semibold" : "block rounded hover:bg-slate-800 px-4 py-2"}>Payments</NavLink></li>
            <li><NavLink to="/bank-accounts" className={({ isActive }) => isActive ? "block rounded bg-cyan-700 px-4 py-2 font-semibold" : "block rounded hover:bg-slate-800 px-4 py-2"}>Bank Accounts</NavLink></li>
            <li><NavLink to="/profit-expenses" className={({ isActive }) => isActive ? "block rounded bg-cyan-700 px-4 py-2 font-semibold" : "block rounded hover:bg-slate-800 px-4 py-2"}>Profit & Expenses</NavLink></li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase text-slate-400 mb-2 pl-2">Settings</div>
          <ul className="space-y-1">
            <li><NavLink to="/settings" className={({ isActive }) => isActive ? "block rounded bg-cyan-700 px-4 py-2 font-semibold" : "block rounded hover:bg-slate-800 px-4 py-2"}>Settings</NavLink></li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar; 