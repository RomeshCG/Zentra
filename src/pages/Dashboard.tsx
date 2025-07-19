import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../service/supabaseClient';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const [weeklyCustomers, setWeeklyCustomers] = useState<any[]>([]);
  const [weeklyManagers, setWeeklyManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [managers, setManagers] = useState<any[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]); // NEW
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  useEffect(() => {
    const fetchRenewals = async () => {
      setLoading(true);
      const today = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(today.getDate() + 3);
      const todayStr = today.toISOString().slice(0, 10);
      const threeDaysStr = threeDaysFromNow.toISOString().slice(0, 10);
      // Fetch customers with renewal_date up to 3 days from now, and only active
      const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .lte('renewal_date', threeDaysStr)
        .neq('is_active', false)
        .order('renewal_date', { ascending: true });
      setWeeklyCustomers(customers || []);
      // Fetch all active customers for slots calculation
      const { data: allCust } = await supabase
        .from('customers')
        .select('*')
        .neq('is_active', false);
      setAllCustomers(allCust || []);
      // Fetch plan managers for lookup
      const { data: managerData } = await supabase
        .from('plan_managers')
        .select('id, platform');
      setManagers(managerData || []);
      // Fetch plan managers with renewal_date in next 3 days
      const { data: managers } = await supabase
        .from('plan_managers')
        .select('*')
        .gte('renewal_date', todayStr)
        .lte('renewal_date', threeDaysStr)
        .order('renewal_date', { ascending: true });
      setWeeklyManagers(managers || []);
      setLoading(false);
    };
    fetchRenewals();
  }, []);

  // Build managerMap for lookup
  const managerMap = Object.fromEntries(managers.map((m: any) => [m.id, m]));

  // Sort: overdue first, then due today, then upcoming
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to midnight
  const sortedCustomers = [...weeklyCustomers].sort((a, b) => {
    const aDate = new Date(a.renewal_date);
    const bDate = new Date(b.renewal_date);
    aDate.setHours(0, 0, 0, 0);
    bDate.setHours(0, 0, 0, 0);
    const aOverdue = aDate < today;
    const bOverdue = bDate < today;
    const aToday = aDate.getTime() === today.getTime();
    const bToday = bDate.getTime() === today.getTime();
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    if (aToday && !bToday) return -1;
    if (!aToday && bToday) return 1;
    return aDate.getTime() - bDate.getTime();
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-cyan-100 flex justify-center">
      <div className="bg-white/90 shadow-xl rounded-xl p-6 w-[96vw] max-w-[1100px] mx-auto mt-6">
        <h1 className="text-3xl font-extrabold mb-8 text-center text-cyan-800 tracking-tight drop-shadow">Zentra Dashboard</h1>
        <h2 className="text-xl font-semibold mb-4 mt-2 text-cyan-700 flex items-center gap-2">
          <span>Customers Renewing Next 3 Days</span>
          <span className="bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-xs font-bold">{sortedCustomers.length}</span>
        </h2>
        {loading ? <div className="text-center text-cyan-700 font-semibold py-6">Loading...</div> : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
            <table className="min-w-full border-separate border-spacing-0 text-sm rounded-lg bg-white">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold"> </th>
                  <th className="px-3 py-3 text-left font-semibold">Name</th>
                  <th className="px-3 py-3 text-left font-semibold">Phone</th>
                  <th className="px-3 py-3 text-left font-semibold">Renewal Date</th>
                  <th className="px-3 py-3 text-left font-semibold">Status</th>
                  <th className="px-3 py-3 text-left font-semibold">Platform</th>
                  <th className="px-3 py-3 text-left font-semibold">Renewal Fee</th>
                  <th className="px-3 py-3 text-left font-semibold">View</th>
                </tr>
              </thead>
              <tbody>
                {sortedCustomers.length === 0 ? (
                  <tr><td colSpan={8} className="text-center text-slate-400 py-5 text-base">No customers renewing or overdue.</td></tr>
                ) : sortedCustomers.map((c) => {
                  const manager = managerMap[c.manager_plan_id] || {};
                  let renewalFee = '-';
                  if (manager.platform === 'youtube' || manager.platform === 'YouTube') renewalFee = 'Rs.500';
                  else if (manager.platform === 'spotify' || manager.platform === 'Spotify') renewalFee = 'Rs.400';
                  const renewalDate = new Date(c.renewal_date);
                  renewalDate.setHours(0, 0, 0, 0);
                  const tomorrow = new Date();
                  tomorrow.setDate(today.getDate() + 1);
                  tomorrow.setHours(0, 0, 0, 0);
                  const isOverdue = renewalDate < today;
                  const isToday = renewalDate.getTime() === today.getTime();
                  const isTomorrow = renewalDate.getTime() === tomorrow.getTime();
                  // Platform color logic
                  let platformColor = '';
                  if (manager.platform === 'spotify' || manager.platform === 'Spotify') platformColor = 'text-green-600 font-bold';
                  else if (manager.platform === 'youtube' || manager.platform === 'YouTube') platformColor = 'text-red-600 font-bold';
                  return (
                    <tr
                      key={c.id}
                      className={`border-t transition cursor-pointer ${isOverdue ? 'bg-red-50 hover:bg-red-100' : isToday ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-cyan-50'}`}
                      onClick={() => navigate(`/plan-managers/${c.manager_plan_id}?highlight=${c.id}`)}
                    >
                      <td className="px-3 py-2">
                        <div className="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold text-sm shadow">
                          {c.name ? c.name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase() : '?'}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-semibold text-cyan-800 whitespace-nowrap max-w-[130px] truncate" title={c.name}>{c.name}</td>
                      <td className="px-3 py-2 whitespace-nowrap max-w-[140px] text-slate-700" title={c.phone}>
                        <span 
                          className={`cursor-pointer hover:text-cyan-700 transition-colors ${copiedPhone === c.phone ? 'text-green-600 font-semibold' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(c.phone);
                            setCopiedPhone(c.phone);
                            setTimeout(() => setCopiedPhone(null), 2000);
                          }}
                          title="Click to copy phone number"
                        >
                          {c.phone}
                          {copiedPhone === c.phone && <span className="ml-1 animate-pulse">✓</span>}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-sm">
                        {c.renewal_date ? new Date(c.renewal_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {isOverdue ? (
                          <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold text-xs">Overdue</span>
                        ) : isToday ? (
                          <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold text-xs">Due Today</span>
                        ) : isTomorrow ? (
                          <span className="inline-block px-3 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold text-xs">Tomorrow</span>
                        ) : (
                          <span className="inline-block px-3 py-1 rounded-full bg-cyan-100 text-cyan-700 font-semibold text-xs">Upcoming</span>
                        )}
                      </td>
                      <td className={`px-3 py-2 whitespace-nowrap ${platformColor}`}>{manager.platform || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-semibold">{renewalFee}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <button
                          className="bg-cyan-700 text-white px-4 py-1.5 rounded hover:bg-cyan-800 text-xs font-bold shadow"
                          onClick={e => { e.stopPropagation(); navigate(`/customers/${c.id}`); }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <h2 className="text-2xl font-semibold mb-6 mt-12 text-cyan-700 flex items-center gap-2">
          <span>Plan Managers Renewing Next 3 Days</span>
          <span className="bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-xs font-bold">{weeklyManagers.length}</span>
        </h2>
        {loading ? <div className="text-center text-cyan-700 font-semibold py-8">Loading...</div> : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="min-w-full border-separate border-spacing-0 text-base rounded-xl bg-white">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold">Display Name</th>
                  <th className="px-3 py-3 text-left font-semibold">Platform</th>
                  <th className="px-3 py-3 text-left font-semibold">Renewal Date</th>
                  <th className="px-3 py-3 text-left font-semibold">Status</th>
                  <th className="px-3 py-3 text-left font-semibold">Bank Card</th>
                  <th className="px-3 py-3 text-left font-semibold">Slots Left</th>
                  <th className="px-3 py-3 text-left font-semibold">Price</th>
                </tr>
              </thead>
              <tbody>
                {weeklyManagers.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-slate-400 py-5 text-base">No plan managers renewing this week.</td></tr>
                ) : weeklyManagers.map((m) => {
                  // Platform color logic
                  let platformColor = '';
                  if (m.platform === 'spotify' || m.platform === 'Spotify') platformColor = 'text-green-600 font-bold';
                  else if (m.platform === 'youtube' || m.platform === 'YouTube') platformColor = 'text-red-600 font-bold';
                  // Status logic
                  const renewalDate = new Date(m.renewal_date);
                  renewalDate.setHours(0, 0, 0, 0);
                  const todayDate = new Date();
                  todayDate.setHours(0, 0, 0, 0);
                  const isOverdue = renewalDate < todayDate;
                  const isToday = renewalDate.getTime() === todayDate.getTime();
                  let statusBadge = null;
                  if (isOverdue) statusBadge = <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold text-xs">Overdue</span>;
                  else if (isToday) statusBadge = <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold text-xs">Due Today</span>;
                  else statusBadge = <span className="inline-block px-3 py-1 rounded-full bg-cyan-100 text-cyan-700 font-semibold text-xs">Upcoming</span>;
                  // Remaining slots logic
                  const slotsUsed = allCustomers.filter((c) => c.manager_plan_id === m.id).length;
                  const slotsLeft = m.slots_total - slotsUsed;
                  return (
                    <tr key={m.id} className="border-t hover:bg-cyan-50 transition cursor-pointer" onClick={() => navigate(`/plan-managers/${m.id}`)}>
                      <td className="px-3 py-2 font-semibold text-cyan-800 whitespace-nowrap max-w-[130px] truncate" title={m.display_name || m.username}>{m.display_name || m.username}</td>
                      <td className={`px-3 py-2 whitespace-nowrap ${platformColor}`}>{m.platform}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-sm">{m.renewal_date ? new Date(m.renewal_date).toLocaleDateString() : '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{statusBadge}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{m.bank_card || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-semibold">{slotsLeft > 0 ? slotsLeft : 0}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-semibold">{m.monthly_cost ? `Rs.${Number(m.monthly_cost).toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 