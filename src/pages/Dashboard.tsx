import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../service/supabaseClient';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const [weeklyCustomers, setWeeklyCustomers] = useState<any[]>([]);
  const [weeklyManagers, setWeeklyManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [managers, setManagers] = useState<any[]>([]);

  useEffect(() => {
    const fetchRenewals = async () => {
      setLoading(true);
      const today = new Date();
      const weekFromNow = new Date();
      weekFromNow.setDate(today.getDate() + 7);
      const todayStr = today.toISOString().slice(0, 10);
      const weekStr = weekFromNow.toISOString().slice(0, 10);
      // Fetch customers with renewal_date in next 7 days
      const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .gte('renewal_date', todayStr)
        .lte('renewal_date', weekStr)
        .order('renewal_date', { ascending: true });
      setWeeklyCustomers(customers || []);
      // Fetch plan managers for lookup
      const { data: managerData } = await supabase
        .from('plan_managers')
        .select('id, platform');
      setManagers(managerData || []);
      // Fetch plan managers with renewal_date in next 7 days
      const { data: managers } = await supabase
        .from('plan_managers')
        .select('*')
        .gte('renewal_date', todayStr)
        .lte('renewal_date', weekStr)
        .order('renewal_date', { ascending: true });
      setWeeklyManagers(managers || []);
      setLoading(false);
    };
    fetchRenewals();
  }, []);

  // Build managerMap for lookup
  const managerMap = Object.fromEntries(managers.map((m: any) => [m.id, m]));

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center">
      <div className="bg-white rounded-xl p-8 w-[90vw] max-w-[1400px] mx-auto mt-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Zentra Dashboard</h1>
        {/* Logout button removed, now in sidebar */}
        <h2 className="text-lg font-semibold mb-4 mt-2">Customers Renewing This Week</h2>
        {loading ? <div>Loading...</div> : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm rounded-xl bg-white">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold"> </th>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3 text-left font-semibold">Renewal Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Platform</th>
                  <th className="px-4 py-3 text-left font-semibold">Renewal Fee</th>
                </tr>
              </thead>
              <tbody>
                {weeklyCustomers.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-slate-400 py-4">No customers renewing this week.</td></tr>
                ) : weeklyCustomers.map((c) => {
                  const manager = managerMap[c.manager_plan_id] || {};
                  let renewalFee = '-';
                  if (manager.platform === 'youtube' || manager.platform === 'YouTube') renewalFee = 'Rs.500';
                  else if (manager.platform === 'spotify' || manager.platform === 'Spotify') renewalFee = 'Rs.400';
                  return (
                    <tr
                      key={c.id}
                      className="border-t hover:bg-cyan-50 transition cursor-pointer"
                      onClick={() => navigate(`/plan-managers/${c.manager_plan_id}?highlight=${c.id}`)}
                    >
                      <td className="px-4 py-2">
                        <div className="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold text-base">
                          {c.name ? c.name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase() : '?'}
                        </div>
                      </td>
                      <td className="px-4 py-2 font-medium text-cyan-700 whitespace-nowrap max-w-[140px] truncate" title={c.name}>{c.name}</td>
                      <td className="px-4 py-2 whitespace-nowrap max-w-[180px] truncate" title={c.email}>{c.email}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{c.renewal_date ? new Date(c.renewal_date).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{manager.platform || '-'}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{renewalFee}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <h2 className="text-lg font-semibold mb-4 mt-8">Plan Managers Renewing This Week</h2>
        {loading ? <div>Loading...</div> : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm rounded-xl bg-white">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Display Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Platform</th>
                  <th className="px-4 py-3 text-left font-semibold">Renewal Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Slots</th>
                  <th className="px-4 py-3 text-left font-semibold">Price</th>
                </tr>
              </thead>
              <tbody>
                {weeklyManagers.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-slate-400 py-4">No plan managers renewing this week.</td></tr>
                ) : weeklyManagers.map((m) => (
                  <tr key={m.id} className="border-t hover:bg-cyan-50 transition cursor-pointer">
                    <td className="px-4 py-2 font-medium text-cyan-700 whitespace-nowrap max-w-[140px] truncate" title={m.display_name || m.username}>{m.display_name || m.username}</td>
                    <td className="px-4 py-2 whitespace-nowrap max-w-[120px] truncate" title={m.platform}>{m.platform}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{m.renewal_date ? new Date(m.renewal_date).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{m.slots_total}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{m.monthly_cost ? `Rs.${Number(m.monthly_cost).toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 