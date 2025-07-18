import React, { useState, useEffect } from 'react';
import { supabase } from '../service/supabaseClient';
import * as XLSX from 'xlsx';

const TABLES = [
  { key: 'customers', label: 'Customers' },
  { key: 'customer_subscription_months', label: 'Customer Subscription Months' },
  { key: 'plan_managers', label: 'Plan Managers' },
  { key: 'plan_manager_financial_history', label: 'Plan Manager Financial History' },
  { key: 'platform_price_history', label: 'Platform Price History' },
];

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'backup' | 'price'>('backup');
  // Backup states
  const [backupLoading, setBackupLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState<string | null>(null);
  // Platform price history state
  const [prices, setPrices] = useState<any[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<any>(null);
  const [addRow, setAddRow] = useState<any>({ platform: '', price: '', effective_from: '' });
  const [saving, setSaving] = useState(false);

  // Fetch price history for price tab
  useEffect(() => {
    if (activeTab !== 'price') return;
    async function fetchPrices() {
      setLoadingPrices(true);
      const { data } = await supabase
        .from('platform_price_history')
        .select('*')
        .order('platform', { ascending: true })
        .order('effective_from', { ascending: false });
      setPrices(data || []);
      setLoadingPrices(false);
    }
    fetchPrices();
  }, [activeTab]);

  // --- Backup Tab Logic ---
  const handleTableBackup = async (table: string) => {
    setTableLoading(table);
    const { data, error } = await supabase.from(table).select('*');
    setTableLoading(null);
    if (error) {
      alert(`Failed to fetch ${table}: ` + error.message);
      return;
    }
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const fileName = `${table}_backup_${yyyy}${mm}${dd}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllData = async () => {
    setBackupLoading(true);
    const workbook = XLSX.utils.book_new();
    for (const table of TABLES) {
      const { data, error } = await supabase.from(table.key).select('*');
      if (!error && data) {
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, ws, table.label.replace(/[^A-Za-z0-9]/g, '').slice(0, 31));
      }
    }
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const fileName = `zentrahub_backup_${yyyy}${mm}${dd}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    setBackupLoading(false);
  };

  // --- Price Change Tab Logic (existing) ---
  const handleEdit = (idx: number) => {
    setEditIdx(idx);
    setEditRow({ ...prices[idx] });
  };
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditRow((prev: any) => ({ ...prev, [name]: value }));
  };
  const handleEditSave = async () => {
    setSaving(true);
    await supabase
      .from('platform_price_history')
      .update({ price: editRow.price, effective_from: editRow.effective_from })
      .eq('id', editRow.id);
    setSaving(false);
    setEditIdx(null);
    setEditRow(null);
    // Refresh
    const { data } = await supabase
      .from('platform_price_history')
      .select('*')
      .order('platform', { ascending: true })
      .order('effective_from', { ascending: false });
    setPrices(data || []);
  };
  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddRow((prev: any) => ({ ...prev, [name]: value }));
  };
  const handleAddSave = async () => {
    if (!addRow.platform || !addRow.price || !addRow.effective_from) return;
    setSaving(true);
    await supabase
      .from('platform_price_history')
      .insert([{ platform: addRow.platform.toLowerCase(), price: addRow.price, effective_from: addRow.effective_from }]);
    setSaving(false);
    setAddRow({ platform: '', price: '', effective_from: '' });
    // Refresh
    const { data } = await supabase
      .from('platform_price_history')
      .select('*')
      .order('platform', { ascending: true })
      .order('effective_from', { ascending: false });
    setPrices(data || []);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      {/* Tab Container */}
      <div className="flex gap-4 mb-8 border-b">
        <button
          className={`px-4 py-2 font-semibold border-b-2 transition ${activeTab === 'backup' ? 'border-cyan-700 text-cyan-800' : 'border-transparent text-slate-500 hover:text-cyan-700'}`}
          onClick={() => setActiveTab('backup')}
        >
          Backup
        </button>
        <button
          className={`px-4 py-2 font-semibold border-b-2 transition ${activeTab === 'price' ? 'border-cyan-700 text-cyan-800' : 'border-transparent text-slate-500 hover:text-cyan-700'}`}
          onClick={() => setActiveTab('price')}
        >
          Price Change Settings
        </button>
      </div>
      {/* Tab Content */}
      {activeTab === 'backup' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Backup Data</h2>
          <div className="mb-6 flex flex-wrap gap-4">
            {TABLES.map(table => (
              <button
                key={table.key}
                onClick={() => handleTableBackup(table.key)}
                disabled={!!tableLoading}
                className="bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-800 shadow disabled:opacity-60"
              >
                {tableLoading === table.key ? `Backing up ${table.label}...` : `Backup ${table.label}`}
              </button>
            ))}
          </div>
          <div className="mb-8">
            <button
              onClick={handleDownloadAllData}
              disabled={backupLoading}
              className="bg-green-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-800 shadow disabled:opacity-60"
            >
              {backupLoading ? 'Downloading All Data...' : 'Download All Data (Excel)'}
            </button>
          </div>
        </div>
      )}
      {activeTab === 'price' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Platform Expenses (per month)</h2>
          <div className="mb-6">
            {loadingPrices ? <div>Loading...</div> : (
              <table className="min-w-full border-separate border-spacing-0 text-sm rounded-xl bg-white">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Platform</th>
                    <th className="px-4 py-3 text-left font-semibold">Expense</th>
                    <th className="px-4 py-3 text-left font-semibold">Effective From</th>
                    <th className="px-4 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((row, idx) => (
                    <tr key={row.id}>
                      <td className="px-4 py-2 capitalize">{row.platform}</td>
                      <td className="px-4 py-2">
                        {editIdx === idx ? (
                          <input name="price" type="number" value={editRow.price} onChange={handleEditChange} className="border rounded px-2 py-1 w-24" />
                        ) : (
                          `Rs.${row.price}`
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {editIdx === idx ? (
                          <input name="effective_from" type="date" value={editRow.effective_from} onChange={handleEditChange} className="border rounded px-2 py-1" />
                        ) : (
                          row.effective_from
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {editIdx === idx ? (
                          <button onClick={handleEditSave} disabled={saving} className="bg-green-600 text-white px-3 py-1 rounded mr-2">Save</button>
                        ) : (
                          <button onClick={() => handleEdit(idx)} className="bg-cyan-700 text-white px-3 py-1 rounded">Edit</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="px-4 py-2">
                      <input name="platform" value={addRow.platform} onChange={handleAddChange} className="border rounded px-2 py-1 w-28" placeholder="Platform" />
                    </td>
                    <td className="px-4 py-2">
                      <input name="price" type="number" value={addRow.price} onChange={handleAddChange} className="border rounded px-2 py-1 w-24" placeholder="Expense" />
                    </td>
                    <td className="px-4 py-2">
                      <input name="effective_from" type="date" value={addRow.effective_from} onChange={handleAddChange} className="border rounded px-2 py-1" />
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={handleAddSave} disabled={saving} className="bg-green-700 text-white px-3 py-1 rounded">Add</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings; 