import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../service/supabaseClient';

const PlanManagerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [manager, setManager] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    renewal_date: '',
    income: '',
    expense: '',
    profit: '',
    notes: '',
  });
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [customerMonths, setCustomerMonths] = useState<{ [customerId: string]: any[] }>({});
  const [monthsLoading, setMonthsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [manualRenewalOverride, setManualRenewalOverride] = useState(false);
  const [manualProfitOverride, setManualProfitOverride] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [numMonths, setNumMonths] = useState(1);
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewError, setRenewError] = useState<string | null>(null);
  const [showEditManagerModal, setShowEditManagerModal] = useState(false);
  const [editCustomerModal, setEditCustomerModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<any>(null);
  const [editCustomerForm, setEditCustomerForm] = useState<any>({});
  const [editCustomerLoading, setEditCustomerLoading] = useState(false);
  const [editCustomerError, setEditCustomerError] = useState<string | null>(null);
  const [editRenewMonths, setEditRenewMonths] = useState(1);

  // Auto-calculate renewal date unless manually overridden
  useEffect(() => {
    if (!manualRenewalOverride && startDate && numMonths > 0) {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + Number(numMonths));
      // Set to same day or last day of month if overflow
      if (d.getDate() !== new Date(startDate).getDate()) {
        d.setDate(0);
      }
      setCustomerForm((prev) => ({ ...prev, renewal_date: d.toISOString().slice(0, 10) }));
    }
    // eslint-disable-next-line
  }, [startDate, numMonths]);

  // Fetch manager and customers
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const { data: managerData, error: managerError } = await supabase
        .from('plan_managers')
        .select('*')
        .eq('id', id)
        .single();
      if (managerError) {
        setError(managerError.message);
        setLoading(false);
        return;
      }
      setManager(managerData);
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('manager_plan_id', id)
        .order('created_at', { ascending: false });
      if (customerError) setError(customerError.message);
      setCustomers(customerData || []);
      setLoading(false);
    };
    if (id) fetchData();
  }, [id]);

  // Handle add/edit customer form changes with auto-calc
  const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'renewal_date') setManualRenewalOverride(true);
    if (name === 'profit') setManualProfitOverride(true);
    setCustomerForm((prev) => {
      let updated = { ...prev, [name]: value };
      if ((name === 'income' || name === 'expense') && !manualProfitOverride) {
        const income = name === 'income' ? Number(value) : Number(updated.income);
        const expense = name === 'expense' ? Number(value) : Number(updated.expense);
        if (!isNaN(income) && !isNaN(expense)) {
          updated.profit = (income - expense).toString();
        }
        setManualProfitOverride(false); // reset override if income/expense changes
      }
      return updated;
    });
  };

  // Utility: Get all months between two dates (inclusive, as YYYY-MM-DD)
  function getMonthsBetween(start: string, end: string) {
    const result = [];
    let current = new Date(start);
    const last = new Date(end);
    current.setDate(1); last.setDate(1);
    while (current <= last) {
      result.push(current.toISOString().slice(0, 10));
      current.setMonth(current.getMonth() + 1);
    }
    return result;
  }

  // Utility: Fetch price for a platform for a given month
  async function getPriceForMonth(platform: string, month: string) {
    const { data: priceHistory } = await supabase
      .from('platform_price_history')
      .select('*')
      .eq('platform', platform)
      .order('effective_from', { ascending: true });
    if (!priceHistory || priceHistory.length === 0) return null;
    // Find the latest price effective before or on this month
    const monthDate = new Date(month);
    let price = priceHistory[0].price;
    for (const row of priceHistory) {
      if (new Date(row.effective_from) <= monthDate) price = row.price;
      else break;
    }
    return Number(price);
  }

  // Utility: Check if plan manager is new (<1 month)
  function isManagerNew(manager: any) {
    if (!manager?.created_at) return false;
    const created = new Date(manager.created_at);
    const now = new Date();
    const diff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    return diff < 31;
  }

  // Utility: Fetch per-month breakdown for a customer
  async function fetchCustomerMonths(customerId: string) {
    setMonthsLoading(true);
    const { data, error } = await supabase
      .from('customer_subscription_months')
      .select('*')
      .eq('customer_id', customerId)
      .order('month', { ascending: true });
    setCustomerMonths((prev) => ({ ...prev, [customerId]: data || [] }));
    setMonthsLoading(false);
  }

  // Utility: After adding/updating a customer, create per-month records
  async function createCustomerMonths(customer: any, planManager: any) {
    if (!customer.renewal_date) return;
    // Assume 1 month if no end date
    const start = customer.renewal_date;
    let months = 1;
    let end = start;
    if (customer.end_date) {
      end = customer.end_date;
      months = getMonthsBetween(start, end).length;
    }
    const perMonthIncome = customer.income && months > 0 ? Number(customer.income) / months : 0;
    const monthList = getMonthsBetween(start, end);
    const isTrial = planManager.platform === 'YT' && isManagerNew(planManager);
    const records = [];
    for (let i = 0; i < monthList.length; i++) {
      const month = monthList[i];
      let priceUsed = await getPriceForMonth(planManager.platform, month);
      if (priceUsed == null) priceUsed = planManager.monthly_cost;
      let expense = (isTrial && i === 0) ? 0 : priceUsed;
      if (expense == null || isNaN(expense)) expense = 0;
      const profit = perMonthIncome - expense;
      records.push({
        customer_id: customer.id,
        month,
        income: perMonthIncome,
        expense,
        profit,
        price_used: priceUsed,
        is_trial: isTrial && i === 0,
      });
    }
    if (records.length > 0) {
      await supabase.from('customer_subscription_months').insert(records);
    }
  }

  function validateCustomerForm(form: typeof customerForm) {
    const errors = [];
    if (!form.name.trim()) errors.push('Name is required.');
    if (!form.email.trim()) errors.push('Email is required.');
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.push('Email is invalid.');
    if (!form.renewal_date) errors.push('Renewal Date is required.');
    if (!form.income || isNaN(Number(form.income))) errors.push('Income is required and must be a number.');
    if (!form.expense || isNaN(Number(form.expense))) errors.push('Expense is required and must be a number.');
    if (!form.profit || isNaN(Number(form.profit))) errors.push('Profit is required and must be a number.');
    return errors;
  }

  // Add or update customer
  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerError(null);
    setFormErrors([]);
    const errors = validateCustomerForm(customerForm);
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    setCustomerLoading(true);
    if (!manager) return;
    const income = customerForm.income !== '' ? Number(customerForm.income) : 0;
    let expense = customerForm.expense !== '' ? Number(customerForm.expense) : 0;
    if (expense == null || isNaN(expense)) expense = 0;
    const profit = customerForm.profit !== '' ? Number(customerForm.profit) : (income - expense);
    const customerData = {
      name: customerForm.name,
      email: customerForm.email,
      phone: customerForm.phone,
      renewal_date: customerForm.renewal_date || null,
      income,
      expense,
      profit,
      notes: customerForm.notes,
      platform: manager.platform,
      manager_plan_id: manager.id,
    };
    if (editingCustomerId) {
      // Update
      const { error } = await supabase.from('customers').update(customerData).eq('id', editingCustomerId);
      if (error) {
        setCustomerError(error.message);
        setCustomerLoading(false);
        return;
      }
      setCustomerForm({ name: '', email: '', phone: '', renewal_date: '', income: '', expense: '', profit: '', notes: '' });
      setEditingCustomerId(null);
      // Refresh customers
      const { data: customerDataNew } = await supabase
        .from('customers')
        .select('*')
        .eq('manager_plan_id', id)
        .order('created_at', { ascending: false });
      setCustomers(customerDataNew || []);
      // Create per-month records if new customer
      if (!editingCustomerId && customerDataNew) {
        await createCustomerMonths(customerDataNew.find(c => c.id === editingCustomerId), manager);
        await fetchCustomerMonths(editingCustomerId);
      }
    } else {
      // Insert
      const { data, error: insertError } = await supabase.from('customers').insert([customerData]).select();
      if (insertError) {
        setCustomerError(insertError.message);
        setCustomerLoading(false);
        return;
      }
      const insertedCustomer = data && data[0];
      setCustomerForm({ name: '', email: '', phone: '', renewal_date: '', income: '', expense: '', profit: '', notes: '' });
      setEditingCustomerId(null);
      // Refresh customers
      const { data: customerDataNew } = await supabase
        .from('customers')
        .select('*')
        .eq('manager_plan_id', id)
        .order('created_at', { ascending: false });
      setCustomers(customerDataNew || []);
      // Create per-month records if new customer
      if (insertedCustomer) {
        await createCustomerMonths(insertedCustomer, manager);
        await fetchCustomerMonths(insertedCustomer.id);
      }
    }
    setCustomerLoading(false);
    setShowAddModal(false);
  };

  // Edit customer
  const handleEditCustomer = (customer: any) => {
    setEditingCustomerId(customer.id);
    setCustomerForm({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      renewal_date: customer.renewal_date || '',
      income: customer.income?.toString() || '',
      expense: customer.expense?.toString() || '',
      profit: customer.profit?.toString() || '',
      notes: customer.notes || '',
    });
  };

  // Delete customer
  const handleDeleteCustomer = async (customerId: string) => {
    setCustomerLoading(true);
    await supabase.from('customers').delete().eq('id', customerId);
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    setCustomerLoading(false);
  };

  // Open edit modal for plan manager
  const handleOpenEditModal = () => {
    setEditForm(manager);
    setShowEditManagerModal(true);
    setEditError(null);
  };
  const handleCloseEditManagerModal = () => setShowEditManagerModal(false);

  // Handle edit form changes
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let newValue: string | boolean = value;
    if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
      newValue = e.target.checked;
    }
    setEditForm((prev: any) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  // Submit edit
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
    const { error } = await supabase.from('plan_managers').update(updateData).eq('id', manager.id);
    if (error) {
      setEditError(error.message);
      setEditLoading(false);
      return;
    }
    setShowEditManagerModal(false);
    // Refresh manager info
    const { data: managerData } = await supabase
      .from('plan_managers')
      .select('*')
      .eq('id', manager.id)
      .single();
    setManager(managerData);
    setEditLoading(false);
  };

  // Fetch per-month breakdowns for all customers on load
  useEffect(() => {
    if (customers.length > 0) {
      customers.forEach((c) => fetchCustomerMonths(c.id));
    }
    // eslint-disable-next-line
  }, [customers.length]);

  const handleMarkAsRenewed = async () => {
    if (!manager || !manager.renewal_date) return;
    setRenewLoading(true);
    setRenewError(null);
    const current = new Date(manager.renewal_date);
    current.setMonth(current.getMonth() + 1); // Add one month
    const nextRenewal = current.toISOString().slice(0, 10);
    const { error } = await supabase.from('plan_managers').update({ renewal_date: nextRenewal }).eq('id', manager.id);
    if (error) {
      setRenewError(error.message);
      setRenewLoading(false);
      return;
    }
    // Refresh manager info
    const { data: managerData } = await supabase
      .from('plan_managers')
      .select('*')
      .eq('id', manager.id)
      .single();
    setManager(managerData);
    setRenewLoading(false);
  };

  const openEditCustomerModal = (customer: any) => {
    setEditCustomer(customer);
    setEditCustomerForm({ ...customer });
    setEditRenewMonths(1);
    setEditCustomerModal(true);
    setEditCustomerError(null);
  };
  const closeEditCustomerModal = () => setEditCustomerModal(false);
  const handleEditCustomerFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditCustomerForm((prev: any) => ({ ...prev, [name]: value }));
  };
  const handleEditCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditCustomerLoading(true);
    setEditCustomerError(null);
    const { error } = await supabase.from('customers').update(editCustomerForm).eq('id', editCustomer.id);
    if (error) {
      setEditCustomerError(error.message);
      setEditCustomerLoading(false);
      return;
    }
    // Refresh customers
    const { data: customerDataNew } = await supabase
      .from('customers')
      .select('*')
      .eq('manager_plan_id', id)
      .order('created_at', { ascending: false });
    setCustomers(customerDataNew || []);
    setEditCustomerLoading(false);
    setEditCustomerModal(false);
  };
  const handleEditCustomerMarkAsRenewed = async () => {
    if (!editCustomerForm.renewal_date) return;
    setEditCustomerLoading(true);
    setEditCustomerError(null);
    const current = new Date(editCustomerForm.renewal_date);
    current.setMonth(current.getMonth() + Number(editRenewMonths));
    const nextRenewal = current.toISOString().slice(0, 10);
    const { error } = await supabase.from('customers').update({ ...editCustomerForm, renewal_date: nextRenewal }).eq('id', editCustomer.id);
    if (error) {
      setEditCustomerError(error.message);
      setEditCustomerLoading(false);
      return;
    }
    // Refresh customers
    const { data: customerDataNew } = await supabase
      .from('customers')
      .select('*')
      .eq('manager_plan_id', id)
      .order('created_at', { ascending: false });
    setCustomers(customerDataNew || []);
    setEditCustomerLoading(false);
    setEditCustomerModal(false);
    setEditRenewMonths(1);
  };

  if (loading) return <div className="p-8 text-slate-500">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!manager) return <div className="p-8 text-slate-500">Manager not found.</div>;

  // Calculate remaining slots
  const remainingSlots = manager && manager.slots_total ? manager.slots_total - customers.length : 0;

  return (
    <div className="w-full px-8 py-8">
      <button onClick={() => navigate(-1)} className="mb-6 text-cyan-700 hover:underline">&larr; Back</button>
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="text-2xl font-bold text-cyan-800">{manager.display_name || manager.username}</div>
          <button onClick={handleOpenEditModal} className="text-cyan-700 hover:underline text-base">Edit</button>
        </div>
        <div className="flex flex-wrap gap-4 text-sm mb-2">
          <div><span className="font-medium">Platform:</span> {manager.platform}</div>
          <div><span className="font-medium">Slots:</span> {manager.slots_total} <span className={remainingSlots > 0 ? 'text-green-600' : 'text-red-600'}>({remainingSlots > 0 ? `${remainingSlots} remaining` : 'Full'})</span></div>
          <div><span className="font-medium">Price:</span> Rs.{manager.monthly_cost}</div>
          <div>
            <span className="font-medium">Renewal:</span> {manager.renewal_period}
            <span className="ml-2 font-medium">Renewal Date:</span> {manager.renewal_date ? new Date(manager.renewal_date).toLocaleDateString() : '-'}
            <button
              onClick={handleMarkAsRenewed}
              disabled={renewLoading}
              className="ml-2 px-2 py-1 rounded bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-60"
            >
              {renewLoading ? 'Updating...' : 'Mark as Renewed'}
            </button>
          </div>
          <div><span className="font-medium">Active:</span> {manager.is_active ? 'Yes' : 'No'}</div>
        </div>
        {manager.notes && <div className="text-xs text-slate-500 mt-1">{manager.notes}</div>}
        {renewError && <div className="text-red-600 text-xs mb-2">{renewError}</div>}
      </div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Customers</h2>
        {remainingSlots > 0 ? (
          <button onClick={() => setShowAddModal(true)} className="bg-cyan-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-cyan-800 shadow">Add Customer</button>
        ) : (
          <span className="text-red-600 font-semibold">All slots are filled for this plan manager.</span>
        )}
      </div>
      <div className="mb-10">
        {customers.length === 0 ? (
          <div className="text-slate-400 mb-4">No customers assigned yet.</div>
        ) : (
          <div className="w-full rounded-xl shadow-md bg-white">
            <table className="w-full border-separate border-spacing-0 text-sm rounded-xl">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3 text-left font-semibold">Phone</th>
                  <th className="px-4 py-3 text-left font-semibold">Renewal Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Income</th>
                  <th className="px-4 py-3 text-left font-semibold">Expense</th>
                  <th className="px-4 py-3 text-left font-semibold">Profit</th>
                  <th className="px-4 py-3 text-left font-semibold">Notes</th>
                  <th className="px-4 py-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr><td colSpan={9} className="text-center text-slate-400 py-4">No customers assigned yet.</td></tr>
                ) : customers.map((c, idx) => (
                  <tr
                    key={c.id}
                    className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50 cursor-pointer' : 'bg-slate-50 hover:bg-slate-100 cursor-pointer'}
                    onClick={() => openEditCustomerModal(c)}
                  >
                    <td className="px-4 py-2 font-medium text-cyan-700 whitespace-nowrap max-w-[140px] truncate" title={c.name}>{c.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap max-w-[180px] truncate" title={c.email}>{c.email}</td>
                    <td className="px-4 py-2 whitespace-nowrap max-w-[120px] truncate" title={c.phone}>{c.phone}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{c.renewal_date ? new Date(c.renewal_date).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">Rs.{Number(c.income).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="px-4 py-2 whitespace-nowrap">Rs.{Number(c.expense).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="px-4 py-2 whitespace-nowrap">Rs.{Number(c.profit).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="px-4 py-2 max-w-[300px] whitespace-pre-line break-words" title={c.notes}>{c.notes}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="text-blue-700 hover:underline mr-3">Edit</span>
                      <span className="text-red-600 hover:underline" onClick={e => { e.stopPropagation(); handleDeleteCustomer(c.id); }}>Delete</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-8 relative animate-fadeIn">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-2xl font-bold"
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-lg font-semibold mb-4">Add Customer</h2>
            {customerError && <div className="mb-2 text-red-600">{customerError}</div>}
            {formErrors.length > 0 && (
              <div className="mb-2 text-red-600">
                {formErrors.map((err, idx) => <div key={idx}>{err}</div>)}
              </div>
            )}
            <form onSubmit={handleCustomerSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input name="name" value={customerForm.name} onChange={handleCustomerChange} required className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input name="email" type="email" value={customerForm.email} onChange={handleCustomerChange} required className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input name="phone" value={customerForm.phone} onChange={handleCustomerChange} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input name="start_date" type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setManualRenewalOverride(false); }} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Number of Months</label>
                  <input name="num_months" type="number" min={1} value={numMonths} onChange={e => { setNumMonths(Number(e.target.value)); setManualRenewalOverride(false); }} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Renewal Date</label>
                  <input name="renewal_date" type="date" value={customerForm.renewal_date} onChange={handleCustomerChange} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Income</label>
                  <input name="income" type="number" value={customerForm.income} onChange={handleCustomerChange} required className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Expense</label>
                  <input name="expense" type="number" value={customerForm.expense} onChange={handleCustomerChange} required className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Profit</label>
                  <input name="profit" type="number" value={customerForm.profit} onChange={handleCustomerChange} required className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea name="notes" value={customerForm.notes} onChange={handleCustomerChange} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="bg-slate-200 text-slate-700 px-6 py-2 rounded-lg font-semibold hover:bg-slate-300 shadow">Cancel</button>
                <button type="submit" disabled={customerLoading} className="bg-cyan-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-cyan-800 shadow disabled:opacity-60">
                  {customerLoading ? 'Adding...' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditManagerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 relative animate-fadeIn">
            <button
              onClick={handleCloseEditManagerModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-2xl font-bold"
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-xl font-semibold mb-6 text-cyan-800">Edit Plan Manager</h2>
            {editError && <div className="mb-4 text-red-600">{editError}</div>}
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Display Name</label>
                  <input name="display_name" value={editForm.display_name || ''} onChange={handleEditChange} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input name="email" type="email" value={editForm.email || ''} onChange={handleEditChange} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input name="phone" value={editForm.phone || ''} onChange={handleEditChange} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Platform</label>
                  <input name="platform" value={editForm.platform || ''} onChange={handleEditChange} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Plan Price</label>
                  <input name="monthly_cost" type="number" value={editForm.monthly_cost || ''} onChange={handleEditChange} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Slots Total</label>
                  <input name="slots_total" type="number" value={editForm.slots_total || ''} onChange={handleEditChange} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Renewal Date</label>
                  <input name="renewal_date" type="date" value={editForm.renewal_date || ''} onChange={handleEditChange} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Renewal Period</label>
                  <input name="renewal_period" value={editForm.renewal_period || ''} onChange={handleEditChange} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea name="notes" value={editForm.notes || ''} onChange={handleEditChange} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="flex items-center gap-2">
                <input name="is_active" type="checkbox" checked={!!editForm.is_active} onChange={handleEditChange} />
                <label className="text-sm">Active</label>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={editLoading} className="bg-cyan-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-cyan-800 shadow disabled:opacity-60">{editLoading ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-8 relative animate-fadeIn">
            <button
              onClick={closeEditCustomerModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-2xl font-bold"
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-lg font-semibold mb-4">Edit Customer</h2>
            {editCustomerError && <div className="mb-2 text-red-600">{editCustomerError}</div>}
            <form onSubmit={handleEditCustomerSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input name="name" value={editCustomerForm.name || ''} onChange={handleEditCustomerFormChange} required className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input name="email" type="email" value={editCustomerForm.email || ''} onChange={handleEditCustomerFormChange} required className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input name="phone" value={editCustomerForm.phone || ''} onChange={handleEditCustomerFormChange} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Renewal Date</label>
                  <input name="renewal_date" type="date" value={editCustomerForm.renewal_date || ''} onChange={handleEditCustomerFormChange} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Income</label>
                  <input name="income" type="number" value={editCustomerForm.income || ''} onChange={handleEditCustomerFormChange} required className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Expense</label>
                  <input name="expense" type="number" value={editCustomerForm.expense || ''} onChange={handleEditCustomerFormChange} required className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Profit</label>
                  <input name="profit" type="number" value={editCustomerForm.profit || ''} onChange={handleEditCustomerFormChange} required className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea name="notes" value={editCustomerForm.notes || ''} onChange={handleEditCustomerFormChange} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="flex justify-between gap-2 mt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={editRenewMonths}
                    onChange={e => setEditRenewMonths(Number(e.target.value))}
                    className="border rounded px-2 py-1 w-16"
                    style={{ minWidth: 60 }}
                  />
                  <span className="text-sm">months</span>
                  <button type="button" onClick={handleEditCustomerMarkAsRenewed} disabled={editCustomerLoading} className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 shadow disabled:opacity-60">{editCustomerLoading ? 'Updating...' : 'Mark as Renewed'}</button>
                </div>
                <button type="submit" disabled={editCustomerLoading} className="bg-cyan-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-cyan-800 shadow disabled:opacity-60">{editCustomerLoading ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanManagerDetail; 