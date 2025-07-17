import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../service/supabaseClient';

const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewValues, setRenewValues] = useState({ income: '', expense: '', profit: '' });
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewError, setRenewError] = useState<string | null>(null);
  // Add state for transfer modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [planManagers, setPlanManagers] = useState<any[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch customer info
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', id)
          .single();
        if (customerError) throw customerError;
        setCustomer(customerData);

        // Fetch financial history
        const { data: historyData, error: historyError } = await supabase
          .from('customer_subscription_months')
          .select('*')
          .eq('customer_id', id)
          .order('month', { ascending: false });
        if (historyError) throw historyError;
        setHistory(historyData || []);

        // Fetch payment history
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .eq('customer_id', id)
          .order('paid_on', { ascending: false });
        if (paymentsError) throw paymentsError;
        setPayments(paymentsData || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      }
      setLoading(false);
    };
    if (id) fetchData();
  }, [id]);

  // Helper to get available slots for a plan manager
  function getAvailableSlots(manager: any, customers: any[]) {
    const activeCount = customers.filter(c => c.manager_plan_id === manager.id && c.is_active !== false && c.is_active !== 0).length;
    return (manager.slots_total || 0) - activeCount;
  }

  // Fetch all plan managers and all customers for transfer dropdown
  useEffect(() => {
    if (!showTransferModal) return;
    async function fetchManagersAndCustomers() {
      const { data: managersData } = await supabase.from('plan_managers').select('id, display_name, platform, slots_total');
      setPlanManagers(managersData || []);
      const { data: customersData } = await supabase.from('customers').select('id, manager_plan_id, is_active');
      setAllCustomers(customersData || []);
    }
    fetchManagersAndCustomers();
  }, [showTransferModal]);

  if (loading) return <div className="p-8 text-slate-500">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!customer) return <div className="p-8 text-slate-500">Customer not found.</div>;

  const openRenewModal = () => {
    setRenewValues({
      income: customer?.income?.toString() || '',
      expense: customer?.expense?.toString() || '',
      profit: customer?.profit?.toString() || '',
    });
    setShowRenewModal(true);
  };

  const handleRenewChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRenewValues((prev) => {
      let updated = { ...prev, [name]: value };
      if ((name === 'income' || name === 'expense')) {
        const income = name === 'income' ? Number(value) : Number(updated.income);
        const expense = name === 'expense' ? Number(value) : Number(updated.expense);
        if (!isNaN(income) && !isNaN(expense)) {
          updated.profit = (income - expense).toString();
        }
      }
      return updated;
    });
  };

  const handleConfirmRenew = async () => {
    if (!customer || !renewValues.income || !renewValues.expense || !renewValues.profit) return;
    setRenewLoading(true);
    setRenewError(null);
    try {
      // Calculate next renewal date
      const current = new Date(customer.renewal_date);
      current.setMonth(current.getMonth() + 1);
      const nextRenewal = current.toISOString().slice(0, 10);
      // Update customer renewal_date
      const { error } = await supabase.from('customers').update({ renewal_date: nextRenewal }).eq('id', customer.id);
      if (error) throw error;
      // Insert new customer_subscription_months record with override values
      await supabase.from('customer_subscription_months').insert({
        customer_id: customer.id,
        month: nextRenewal,
        income: Number(renewValues.income),
        expense: Number(renewValues.expense),
        profit: Number(renewValues.profit),
        is_trial: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      // Refresh data
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customer.id)
        .single();
      setCustomer(customerData);
      const { data: historyData } = await supabase
        .from('customer_subscription_months')
        .select('*')
        .eq('customer_id', customer.id)
        .order('month', { ascending: false });
      setHistory(historyData || []);
      setShowRenewModal(false);
    } catch (err: any) {
      setRenewError(err.message || 'Failed to renew');
    }
    setRenewLoading(false);
  };

  // Calculate total profit from history
  const totalProfit = history.reduce((sum, h) => sum + (Number(h.profit) || 0), 0);

  // Filter plan managers for transfer: same platform (case-insensitive), not current, and has free slots
  const availableManagers = planManagers.filter(m =>
    m.id !== customer.manager_plan_id &&
    String(m.platform).toLowerCase() === String(customer.platform).toLowerCase() &&
    getAvailableSlots(m, allCustomers) > 0
  );

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="mb-6 text-cyan-700 hover:underline">&larr; Back</button>
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <div className="text-2xl font-bold text-cyan-800 mb-2">{customer.name}</div>
        <div className="flex flex-wrap gap-4 text-sm mb-2 items-center">
          <div><span className="font-medium">Email:</span> {customer.email}</div>
          <div><span className="font-medium">Phone:</span> {customer.phone}</div>
          <div><span className="font-medium">Platform:</span> {customer.platform}</div>
          <div><span className="font-medium">Renewal Date:</span> {customer.renewal_date ? new Date(customer.renewal_date).toLocaleDateString() : '-'}</div>
          <div><span className="font-medium">Active:</span> {customer.is_active ? 'Yes' : 'No'}</div>
          <button
            onClick={openRenewModal}
            className="ml-2 px-3 py-1 rounded bg-green-600 text-white text-xs font-semibold hover:bg-green-700"
          >
            Renew
          </button>
          <button
            onClick={() => navigate(`/plan-managers/${customer.manager_plan_id}`)}
            className="ml-2 px-3 py-1 rounded bg-cyan-700 text-white text-xs font-semibold hover:bg-cyan-800"
          >
            View Plan Manager
          </button>
          <button
            onClick={() => setShowTransferModal(true)}
            className="ml-2 px-3 py-1 rounded bg-yellow-500 text-white text-xs font-semibold hover:bg-yellow-600"
          >
            Transfer
          </button>
        </div>
        {customer.notes && <div className="text-xs text-slate-500 mt-1">{customer.notes}</div>}
        {/* Total profit summary */}
        <div className="mt-4 text-base font-semibold text-cyan-900">
          Total Profit: <span className="text-green-700">Rs.{totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Financial History</h2>
        {history.length === 0 ? (
          <div className="text-slate-400 mb-4">No financial history found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full border-separate border-spacing-0 text-sm rounded-xl">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Month</th>
                  <th className="px-4 py-3 text-left font-semibold">Income</th>
                  <th className="px-4 py-3 text-left font-semibold">Expense</th>
                  <th className="px-4 py-3 text-left font-semibold">Profit</th>
                  <th className="px-4 py-3 text-left font-semibold">Is Trial</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b last:border-b-0">
                    <td className="px-4 py-2 whitespace-nowrap">{h.month ? new Date(h.month).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">Rs.{Number(h.income).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 whitespace-nowrap">Rs.{Number(h.expense).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 whitespace-nowrap">Rs.{Number(h.profit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{h.is_trial ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showRenewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative animate-fadeIn">
            <button
              onClick={() => setShowRenewModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-2xl font-bold"
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-lg font-semibold mb-4">Renew Customer - Override Financials</h2>
            {renewError && <div className="mb-2 text-red-600">{renewError}</div>}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Income</label>
              <input name="income" type="number" value={renewValues.income} onChange={handleRenewChange} className="w-full border rounded-lg px-3 py-2 mb-2" />
              <label className="block text-sm font-medium mb-1">Expense</label>
              <input name="expense" type="number" value={renewValues.expense} onChange={handleRenewChange} className="w-full border rounded-lg px-3 py-2 mb-2" />
              <label className="block text-sm font-medium mb-1">Profit</label>
              <input name="profit" type="number" value={renewValues.profit} onChange={handleRenewChange} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowRenewModal(false)} className="bg-slate-200 text-slate-700 px-6 py-2 rounded-lg font-semibold hover:bg-slate-300 shadow">Cancel</button>
              <button onClick={handleConfirmRenew} disabled={renewLoading} className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 shadow disabled:opacity-60">
                {renewLoading ? 'Renewing...' : 'Confirm Renewal'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative animate-fadeIn">
            <button
              onClick={() => setShowTransferModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-2xl font-bold"
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-lg font-semibold mb-4">Transfer Customer</h2>
            {transferError && <div className="mb-2 text-red-600">{transferError}</div>}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Select New Plan Manager</label>
              <select
                value={selectedManagerId}
                onChange={e => setSelectedManagerId(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">-- Select --</option>
                {availableManagers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.display_name || m.platform} (Slots left: {getAvailableSlots(m, allCustomers)})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowTransferModal(false)}
                className="bg-slate-200 text-slate-700 px-6 py-2 rounded-lg font-semibold hover:bg-slate-300 shadow"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!selectedManagerId) return;
                  setTransferLoading(true);
                  setTransferError(null);
                  const { error } = await supabase
                    .from('customers')
                    .update({ manager_plan_id: selectedManagerId })
                    .eq('id', customer.id);
                  setTransferLoading(false);
                  if (error) {
                    setTransferError(error.message);
                  } else {
                    setShowTransferModal(false);
                    // Refresh customer data
                    const { data: customerData } = await supabase
                      .from('customers')
                      .select('*')
                      .eq('id', customer.id)
                      .single();
                    setCustomer(customerData);
                    setSelectedManagerId('');
                  }
                }}
                disabled={transferLoading || !selectedManagerId}
                className="bg-yellow-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-yellow-700 shadow disabled:opacity-60"
              >
                {transferLoading ? 'Transferring...' : 'Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetail; 