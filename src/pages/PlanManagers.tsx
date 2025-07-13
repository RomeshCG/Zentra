import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../service/supabaseClient';

const platforms = [
  { label: 'Spotify', value: 'spotify' },
  { label: 'YouTube', value: 'youtube' },
  // Add more platforms as needed
];

const renewalPeriods = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

const PlanManagers: React.FC = () => {
  const navigate = useNavigate();
  // Modal state
  const [showModal, setShowModal] = useState(false);
  // Form state
  const [form, setForm] = useState({
    username: '',
    email: '',
    phone: '',
    platform: '',
    plan_price: '',
    display_name: '',
    notes: '',
    slots_total: 5,
    renewal_date: '',
    renewal_period: '',
    is_active: true,
    address: '', // new field
    bank_card: '', // new field
  });
  // Managers state
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [slotFilter, setSlotFilter] = useState<string>('all');
  const [customerCounts, setCustomerCounts] = useState<{ [managerId: string]: number }>({});

  // Fetch managers
  const fetchManagers = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('plan_managers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    setManagers(data || []);
    setLoading(false);
  };

  // Fetch customer counts for each manager
  useEffect(() => {
    const fetchCounts = async () => {
      const { data } = await supabase.from('customers').select('manager_plan_id', { count: 'exact', head: false });
      const counts: { [managerId: string]: number } = {};
      if (data) {
        data.forEach((c: any) => {
          counts[c.manager_plan_id] = (counts[c.manager_plan_id] || 0) + 1;
        });
      }
      setCustomerCounts(counts);
    };
    fetchCounts();
  }, [managers]);

  useEffect(() => {
    fetchManagers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let newValue: string | boolean = value;
    if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
      newValue = e.target.checked;
    }
    setForm((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // Prepare data for insert
    const insertData = {
      username: form.username,
      email: form.email,
      phone: form.phone,
      platform: form.platform,
      monthly_cost: form.plan_price ? Number(form.plan_price) : null,
      display_name: form.display_name,
      notes: form.notes,
      slots_total: form.slots_total ? Number(form.slots_total) : 5,
      renewal_date: form.renewal_date || null,
      renewal_period: form.renewal_period,
      is_active: form.is_active,
      address: form.platform === 'spotify' ? form.address : null,
      bank_card: form.bank_card || null, // new field
    };
    const { error } = await supabase.from('plan_managers').insert([insertData]);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setShowModal(false);
    setForm({
      username: '',
      email: '',
      phone: '',
      platform: '',
      plan_price: '',
      display_name: '',
      notes: '',
      slots_total: 5,
      renewal_date: '',
      renewal_period: '',
      is_active: true,
      address: '',
      bank_card: '',
    });
    await fetchManagers();
    setLoading(false);
  };

  const handleOpenModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);

  // Redirect to manager detail page
  const handleManagerClick = (manager: any) => {
    navigate(`/plan-managers/${manager.id}`);
  };

  // Filtering logic
  const filteredManagers = managers.filter((m) => {
    const platformOk = platformFilter === 'all' || m.platform === platformFilter;
    const slotsUsed = customerCounts[m.id] || 0;
    const slotsLeft = m.slots_total - slotsUsed;
    let slotOk = true;
    if (slotFilter === 'full') slotOk = slotsLeft === 0;
    if (slotFilter === 'has') slotOk = slotsLeft > 0;
    return platformOk && slotOk;
  });

  // Sort: managers with remaining slots at the top, full at the bottom
  const sortedManagers = [...filteredManagers].sort((a, b) => {
    const slotsLeftA = a.slots_total - (customerCounts[a.id] || 0);
    const slotsLeftB = b.slots_total - (customerCounts[b.id] || 0);
    if (slotsLeftA > 0 && slotsLeftB === 0) return -1;
    if (slotsLeftA === 0 && slotsLeftB > 0) return 1;
    // If both have slots or both are full, keep original order
    return 0;
  });

  return (
    <div className="max-w-5xl mx-auto relative">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Plan Managers</h1>
        <button
          onClick={handleOpenModal}
          className="bg-cyan-700 hover:bg-cyan-800 text-white px-6 py-2 rounded-lg font-semibold shadow transition"
        >
          + Add Manager
        </button>
      </div>

      {/* Add Manager Modal */}
      {showModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 transition">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 relative animate-fadeIn">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-2xl font-bold"
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-xl font-semibold mb-6 text-cyan-800">Add Plan Manager</h2>
            {error && <div className="mb-4 text-red-600">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Username</label>
                  <input name="username" value={form.username} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </div>
                {/* Remove Username field for manager */}
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input name="phone" value={form.phone} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Platform</label>
                  <select name="platform" value={form.platform} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400">
                    <option value="">Select platform</option>
                    {platforms.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                {form.platform === 'spotify' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Address</label>
                    <input name="address" value={form.address} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Plan Price</label>
                  <input name="plan_price" type="number" value={form.plan_price} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Display Name</label>
                  <input name="display_name" value={form.display_name} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Slots Total</label>
                  <input name="slots_total" type="number" value={form.slots_total} onChange={handleChange} min={1} max={10} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Renewal Date</label>
                  <input name="renewal_date" type="date" value={form.renewal_date} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Renewal Period</label>
                  <select name="renewal_period" value={form.renewal_period} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400">
                    <option value="">Select period</option>
                    {renewalPeriods.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bank Card</label>
                  <input name="bank_card" value={form.bank_card} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
              </div>
              <div className="flex items-center gap-2">
                <input name="is_active" type="checkbox" checked={form.is_active} onChange={handleChange} />
                <label className="text-sm">Active</label>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={loading} className="bg-cyan-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-cyan-800 shadow disabled:opacity-60">{loading ? 'Adding...' : 'Add Manager'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add filter controls above the manager cards */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex gap-2 items-center">
          <span className="font-medium">Platform:</span>
          <button onClick={() => setPlatformFilter('all')} className={`px-3 py-1 rounded-full border ${platformFilter === 'all' ? 'bg-cyan-700 text-white' : 'bg-white text-cyan-700'}`}>All</button>
          {platforms.map((p) => (
            <button key={p.value} onClick={() => setPlatformFilter(p.value)} className={`px-3 py-1 rounded-full border ${platformFilter === p.value ? 'bg-cyan-700 text-white' : 'bg-white text-cyan-700'}`}>{p.label}</button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <span className="font-medium">Slots:</span>
          <select value={slotFilter} onChange={e => setSlotFilter(e.target.value)} className="border rounded px-2 py-1">
            <option value="all">All</option>
            <option value="has">Has Slots</option>
            <option value="full">Full</option>
          </select>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Managers</h2>
        {loading && <div className="text-slate-500 mb-4">Loading...</div>}
        {error && <div className="text-red-600 mb-4">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedManagers.length === 0 && !loading ? (
            <div className="border rounded-xl shadow p-8 text-center text-slate-400 bg-white">No managers yet.</div>
          ) : (
            sortedManagers.map((m) => {
              // Platform color logic
              let platformColor = '';
              let cardBorder = 'border-slate-200';
              let cardShadow = 'shadow';
              let slotsColor = '';
              let bankCardColor = '';
              // Remove logoBg and logoSvg
              if (m.platform === 'spotify' || m.platform === 'Spotify') {
                platformColor = 'text-green-600 font-bold';
                cardBorder = 'border-green-400';
                cardShadow = 'shadow-green-200';
                slotsColor = 'text-green-700 font-bold';
                bankCardColor = 'text-green-700 font-bold';
              } else if (m.platform === 'youtube' || m.platform === 'YouTube') {
                platformColor = 'text-red-600 font-bold';
                cardBorder = 'border-red-400';
                cardShadow = 'shadow-red-200';
                slotsColor = 'text-red-700 font-bold';
                bankCardColor = 'text-red-700 font-bold';
              }
              const slotsUsed = customerCounts[m.id] || 0;
              const slotsLeft = m.slots_total - slotsUsed;
              return (
                <div
                  key={m.id}
                  className={`relative border-2 rounded-xl ${cardBorder} ${cardShadow} p-6 bg-white flex flex-col gap-2 hover:shadow-lg transition cursor-pointer`}
                  onClick={() => handleManagerClick(m)}
                >
                  {/* Platform logo removed */}
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold text-cyan-800">{m.display_name || m.username}</div>
                    <span className="text-xs px-2 py-1 rounded bg-cyan-100 text-cyan-700">{m.platform}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm mt-2">
                    <div><span className="font-medium">Slots:</span> {m.slots_total} (<span className={slotsLeft > 0 ? 'text-blue-700 font-bold' : slotsColor}>{slotsLeft > 0 ? `${slotsLeft} remaining` : 'Full'}</span>)</div>
                    <div><span className="font-medium">Price:</span> {m.monthly_cost ? `Rs.${m.monthly_cost}` : '-'}</div>
                    <div><span className="font-medium">Renewal:</span> {m.renewal_period ? m.renewal_period.charAt(0).toUpperCase() + m.renewal_period.slice(1) : '-'}</div>
                    <div><span className="font-medium">Active:</span> {m.is_active ? 'Yes' : 'No'}</div>
                    <div><span className="font-medium">Bank Card:</span> <span className={bankCardColor}>{m.bank_card || '-'}</span></div>
                  </div>
                  {m.notes && <div className="text-xs text-slate-500 mt-2">{m.notes}</div>}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanManagers; 