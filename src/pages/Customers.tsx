import React, { useEffect, useState } from 'react';
import { supabase } from '../service/supabaseClient';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [managerFilter, setManagerFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [renewalDate, setRenewalDate] = useState('');
  const [showThisWeek, setShowThisWeek] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [renewMonths, setRenewMonths] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: customerData } = await supabase.from('customers').select('*');
      const { data: managerData } = await supabase.from('plan_managers').select('id, display_name, platform');
      setCustomers(customerData || []);
      setManagers(managerData || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Map for quick lookup
  const managerMap = Object.fromEntries(managers.map((m: any) => [m.id, m]));
  const uniquePlatforms = Array.from(new Set(managers.map((m: any) => m.platform))).filter(Boolean);
  const navigate = useNavigate();

  // Filtering logic
  const today = new Date();
  const weekFromNow = new Date();
  weekFromNow.setDate(today.getDate() + 7);
  const filtered = customers.filter((c) => {
    const matchesManager = managerFilter === 'all' || c.manager_plan_id === managerFilter;
    const matchesPlatform = platformFilter === 'all' || managerMap[c.manager_plan_id]?.platform === platformFilter;
    let matchesRenewal = true;
    if (showThisWeek) {
      if (!c.renewal_date) return false;
      const d = new Date(c.renewal_date);
      matchesRenewal = d >= today && d <= weekFromNow;
    } else if (renewalDate) {
      if (!c.renewal_date) return false;
      matchesRenewal = c.renewal_date === renewalDate;
    }
    const q = search.toLowerCase();
    const matchesSearch =
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.notes?.toLowerCase().includes(q);
    return matchesManager && matchesPlatform && matchesRenewal && (!search || matchesSearch);
  });

  // Edit modal logic
  const openEditModal = (customer: any) => {
    setEditCustomer(customer);
    setEditForm({ ...customer });
    setRenewMonths(1);
    setEditModal(true);
    setEditError(null);
  };
  const closeEditModal = () => setEditModal(false);
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm((prev: any) => ({ ...prev, [name]: value }));
  };
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);
    const { error } = await supabase.from('customers').update(editForm).eq('id', editCustomer.id);
    if (error) {
      setEditError(error.message);
      setEditLoading(false);
      return;
    }
    // Refresh customers
    const { data: customerData } = await supabase.from('customers').select('*');
    setCustomers(customerData || []);
    setEditLoading(false);
    setEditModal(false);
  };
  const handleMarkAsRenewed = async () => {
    if (!editForm.renewal_date) return;
    setEditLoading(true);
    setEditError(null);
    const current = new Date(editForm.renewal_date);
    current.setMonth(current.getMonth() + Number(renewMonths));
    const nextRenewal = current.toISOString().slice(0, 10);
    const { error } = await supabase.from('customers').update({ ...editForm, renewal_date: nextRenewal }).eq('id', editCustomer.id);
    if (error) {
      setEditError(error.message);
      setEditLoading(false);
      return;
    }
    // Refresh customers
    const { data: customerData } = await supabase.from('customers').select('*');
    setCustomers(customerData || []);
    setEditLoading(false);
    setEditModal(false);
    setRenewMonths(1);
  };

  return (
    <div className="w-full px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">Customers</h1>
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, phone, notes..."
          className="border rounded px-3 py-2 w-64"
        />
        <select
          value={managerFilter}
          onChange={e => setManagerFilter(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Plan Managers</option>
          {managers.map((m: any) => (
            <option key={m.id} value={m.id}>{m.display_name || m.platform}</option>
          ))}
        </select>
        <select
          value={platformFilter}
          onChange={e => setPlatformFilter(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Platforms</option>
          {uniquePlatforms.map((p: string) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
        <button
          className={`px-3 py-2 rounded ${showThisWeek ? 'bg-cyan-700 text-white' : 'bg-white text-cyan-700 border'}`}
          onClick={() => { setShowThisWeek(!showThisWeek); setRenewalDate(''); }}
        >
          This Week
        </button>
        <input
          type="date"
          value={renewalDate}
          onChange={e => { setRenewalDate(e.target.value); setShowThisWeek(false); }}
          className="border rounded px-3 py-2"
        />
        <button
          className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 shadow"
          onClick={() => {
            const exportData = filtered.map(c => ({
              Name: c.name,
              Email: c.email,
              Phone: c.phone,
              'Plan Manager': managerMap[c.manager_plan_id]?.display_name || managerMap[c.manager_plan_id]?.platform || '-',
              Platform: managerMap[c.manager_plan_id]?.platform || '-',
              'Renewal Date': c.renewal_date ? new Date(c.renewal_date).toLocaleDateString() : '-',
              Income: c.income,
              Expense: c.expense,
              Profit: c.profit,
              Notes: c.notes,
              Flagged: c.is_flagged ? 'Yes' : 'No',
            }));
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Customers');
            XLSX.writeFile(wb, `customers_export.xlsx`);
          }}
        >
          Export to Excel
        </button>
      </div>
      {/* Table wrapper with horizontal scroll always visible */}
      <div className="w-full rounded-xl shadow-md bg-white overflow-x-scroll">
        <table className="min-w-[900px] w-full border-separate border-spacing-0 text-sm rounded-xl">
          <thead className="bg-slate-100 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Name</th>
              <th className="px-4 py-3 text-left font-semibold">Email</th>
              <th className="px-4 py-3 text-left font-semibold">Phone</th>
              <th className="px-4 py-3 text-left font-semibold">Plan Manager</th>
              <th className="px-4 py-3 text-left font-semibold">Platform</th>
              <th className="px-4 py-3 text-left font-semibold">Renewal Date</th>
              <th className="px-4 py-3 text-left font-semibold">Income</th>
              <th className="px-4 py-3 text-left font-semibold">Expense</th>
              <th className="px-4 py-3 text-left font-semibold">Profit</th>
              <th className="px-4 py-3 text-left font-semibold">Notes</th>
              <th className="px-4 py-3 text-left font-semibold">Flagged</th>
              <th className="px-4 py-3 text-left font-semibold">View</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} className="text-center text-slate-400 py-4">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={11} className="text-center text-slate-400 py-4">No customers found.</td></tr>
            ) : filtered.map((c, idx) => {
              let highlight = '';
              if (c.renewal_date) {
                const today = new Date();
                const renewal = new Date(c.renewal_date);
                const diffDays = Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays >= 0 && diffDays <= 7) {
                  highlight = 'bg-red-100';
                }
              }
              return (
                <tr
                  key={c.id}
                  className={`${idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50 hover:bg-slate-100'} cursor-pointer ${highlight}`}
                  onClick={() => openEditModal(c)}
                >
                  <td className="px-4 py-2 font-medium text-cyan-700 whitespace-nowrap max-w-[140px] truncate" title={c.name}>{c.name}</td>
                  <td className="px-4 py-2 whitespace-nowrap max-w-[180px] truncate" title={c.email}>{c.email}</td>
                  <td className="px-4 py-2 whitespace-nowrap max-w-[120px] truncate" title={c.phone}>{c.phone}</td>
                  <td className="px-4 py-2 whitespace-nowrap max-w-[180px] truncate" title={managerMap[c.manager_plan_id]?.display_name || managerMap[c.manager_plan_id]?.platform || '-'}>{managerMap[c.manager_plan_id]?.display_name || managerMap[c.manager_plan_id]?.platform || '-'}</td>
                  <td className="px-4 py-2 whitespace-nowrap max-w-[120px] truncate" title={managerMap[c.manager_plan_id]?.platform || '-'}>{managerMap[c.manager_plan_id]?.platform || '-'}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{c.renewal_date ? new Date(c.renewal_date).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-2 whitespace-nowrap">Rs.{Number(c.income).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className="px-4 py-2 whitespace-nowrap">Rs.{Number(c.expense).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className="px-4 py-2 whitespace-nowrap">Rs.{Number(c.profit).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className="px-4 py-2 max-w-[300px] whitespace-pre-line break-words" title={c.notes}>{c.notes}</td>
                  <td className="px-4 py-2 text-center">
                    {c.is_flagged ? <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Flagged</span> : ''}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <button
                      className="bg-cyan-700 text-white px-3 py-1 rounded hover:bg-cyan-800 text-xs font-semibold"
                      onClick={() => navigate(`/customers/${c.id}`)}
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
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-8 relative animate-fadeIn">
            <button
              onClick={closeEditModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-2xl font-bold"
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-lg font-semibold mb-4">Edit Customer</h2>
            {editError && <div className="mb-2 text-red-600">{editError}</div>}
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input name="name" value={editForm.name || ''} onChange={handleEditFormChange} required className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input name="email" type="email" value={editForm.email || ''} onChange={handleEditFormChange} required className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input name="phone" value={editForm.phone || ''} onChange={handleEditFormChange} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Renewal Date</label>
                  <input name="renewal_date" type="date" value={editForm.renewal_date || ''} onChange={handleEditFormChange} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Income</label>
                  <input name="income" type="number" value={editForm.income || ''} onChange={handleEditFormChange} required className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Expense</label>
                  <input name="expense" type="number" value={editForm.expense || ''} onChange={handleEditFormChange} required className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Profit</label>
                  <input name="profit" type="number" value={editForm.profit || ''} onChange={handleEditFormChange} required className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              {managerMap[editForm.manager_plan_id]?.platform === 'spotify' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Spotify Username</label>
                  <input name="username" value={editForm.username || ''} onChange={handleEditFormChange} className="w-full border rounded-lg px-3 py-2" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea name="notes" value={editForm.notes || ''} onChange={handleEditFormChange} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="flex justify-between gap-2 mt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={renewMonths}
                    onChange={e => setRenewMonths(Number(e.target.value))}
                    className="border rounded px-2 py-1 w-16"
                    style={{ minWidth: 60 }}
                  />
                  <span className="text-sm">months</span>
                  <button type="button" onClick={handleMarkAsRenewed} disabled={editLoading} className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 shadow disabled:opacity-60">{editLoading ? 'Updating...' : 'Mark as Renewed'}</button>
                </div>
                <button type="submit" disabled={editLoading} className="bg-cyan-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-cyan-800 shadow disabled:opacity-60">{editLoading ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers; 