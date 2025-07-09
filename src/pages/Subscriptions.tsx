import React, { useEffect, useState } from 'react';
import { supabase } from '../service/supabaseClient';

const Subscriptions: React.FC = () => {
  const [managers, setManagers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [renewalDate, setRenewalDate] = useState('');
  const [showThisWeek, setShowThisWeek] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editManager, setEditManager] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [renewMonths, setRenewMonths] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: managerData } = await supabase.from('plan_managers').select('*');
      setManagers(managerData || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const uniquePlatforms = Array.from(new Set(managers.map((m: any) => m.platform))).filter(Boolean);

  // Filtering logic
  const today = new Date();
  const weekFromNow = new Date();
  weekFromNow.setDate(today.getDate() + 7);
  const filtered = managers.filter((m) => {
    const matchesPlatform = platformFilter === 'all' || m.platform === platformFilter;
    let matchesRenewal = true;
    if (showThisWeek) {
      if (!m.renewal_date) return false;
      const d = new Date(m.renewal_date);
      matchesRenewal = d >= today && d <= weekFromNow;
    } else if (renewalDate) {
      if (!m.renewal_date) return false;
      matchesRenewal = m.renewal_date === renewalDate;
    }
    const q = search.toLowerCase();
    const matchesSearch =
      m.display_name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.phone?.toLowerCase().includes(q) ||
      m.notes?.toLowerCase().includes(q);
    return matchesPlatform && matchesRenewal && (!search || matchesSearch);
  });

  // Edit modal logic
  const openEditModal = (manager: any) => {
    setEditManager(manager);
    setEditForm({ ...manager });
    setRenewMonths(1);
    setEditModal(true);
    setEditError(null);
  };
  const closeEditModal = () => setEditModal(false);
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let newValue: string | boolean = value;
    if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
      newValue = e.target.checked;
    }
    setEditForm((prev: any) => ({ ...prev, [name]: newValue }));
  };
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);
    const updateData = {
      display_name: editForm.display_name,
      email: editForm.email,
      phone: editForm.phone,
      platform: editForm.platform,
      monthly_cost: editForm.monthly_cost ? Number(editForm.monthly_cost) : null,
      slots_total: editForm.slots_total ? Number(editForm.slots_total) : 5,
      renewal_date: editForm.renewal_date || null,
      renewal_period: editForm.renewal_period,
      is_active: editForm.is_active,
      notes: editForm.notes,
    };
    const { error } = await supabase.from('plan_managers').update(updateData).eq('id', editManager.id);
    if (error) {
      setEditError(error.message);
      setEditLoading(false);
      return;
    }
    // Refresh managers
    const { data: managerData } = await supabase.from('plan_managers').select('*');
    setManagers(managerData || []);
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
    const { error } = await supabase.from('plan_managers').update({ ...editForm, renewal_date: nextRenewal }).eq('id', editManager.id);
    if (error) {
      setEditError(error.message);
      setEditLoading(false);
      return;
    }
    // Refresh managers
    const { data: managerData } = await supabase.from('plan_managers').select('*');
    setManagers(managerData || []);
    setEditLoading(false);
    setEditModal(false);
    setRenewMonths(1);
  };

  return (
    <div className="w-full px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">Subscriptions</h1>
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, phone, notes..."
          className="border rounded px-3 py-2 w-64"
        />
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
      </div>
      <div className="w-full rounded-xl shadow-md bg-white">
        <table className="w-full border-separate border-spacing-0 text-sm rounded-xl">
          <thead className="bg-slate-100 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Name</th>
              <th className="px-4 py-3 text-left font-semibold">Email</th>
              <th className="px-4 py-3 text-left font-semibold">Phone</th>
              <th className="px-4 py-3 text-left font-semibold">Platform</th>
              <th className="px-4 py-3 text-left font-semibold">Renewal Date</th>
              <th className="px-4 py-3 text-left font-semibold">Monthly Cost</th>
              <th className="px-4 py-3 text-left font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center text-slate-400 py-4">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-slate-400 py-4">No plan managers found.</td></tr>
            ) : filtered.map((m, idx) => (
              <tr
                key={m.id}
                className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50 cursor-pointer' : 'bg-slate-50 hover:bg-slate-100 cursor-pointer'}
                onClick={() => openEditModal(m)}
              >
                <td className="px-4 py-2 font-medium text-cyan-700 whitespace-nowrap max-w-[140px] truncate" title={m.display_name}>{m.display_name}</td>
                <td className="px-4 py-2 whitespace-nowrap max-w-[180px] truncate" title={m.email}>{m.email}</td>
                <td className="px-4 py-2 whitespace-nowrap max-w-[120px] truncate" title={m.phone}>{m.phone}</td>
                <td className="px-4 py-2 whitespace-nowrap max-w-[120px] truncate" title={m.platform}>{m.platform}</td>
                <td className="px-4 py-2 whitespace-nowrap">{m.renewal_date ? new Date(m.renewal_date).toLocaleDateString() : '-'}</td>
                <td className="px-4 py-2 whitespace-nowrap">Rs.{Number(m.monthly_cost).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td className="px-4 py-2 max-w-[300px] whitespace-pre-line break-words" title={m.notes}>{m.notes}</td>
              </tr>
            ))}
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
            <h2 className="text-lg font-semibold mb-4">Edit Plan Manager</h2>
            {editError && <div className="mb-2 text-red-600">{editError}</div>}
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Display Name</label>
                  <input name="display_name" value={editForm.display_name || ''} onChange={handleEditFormChange} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input name="email" type="email" value={editForm.email || ''} onChange={handleEditFormChange} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input name="phone" value={editForm.phone || ''} onChange={handleEditFormChange} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Platform</label>
                  <input name="platform" value={editForm.platform || ''} onChange={handleEditFormChange} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Plan Price</label>
                  <input name="monthly_cost" type="number" value={editForm.monthly_cost || ''} onChange={handleEditFormChange} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Slots Total</label>
                  <input name="slots_total" type="number" value={editForm.slots_total || ''} onChange={handleEditFormChange} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Renewal Date</label>
                  <input name="renewal_date" type="date" value={editForm.renewal_date || ''} onChange={handleEditFormChange} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Renewal Period</label>
                  <input name="renewal_period" value={editForm.renewal_period || ''} onChange={handleEditFormChange} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea name="notes" value={editForm.notes || ''} onChange={handleEditFormChange} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="flex items-center gap-2">
                <input name="is_active" type="checkbox" checked={!!editForm.is_active} onChange={handleEditFormChange} />
                <label className="text-sm">Active</label>
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

export default Subscriptions; 