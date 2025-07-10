import React from 'react';
import { useState } from 'react';
import { supabase } from '../service/supabaseClient';

const Settings: React.FC = () => {
  const [backupLoading, setBackupLoading] = useState(false);
  const handleBackup = async () => {
    setBackupLoading(true);
    const { data: customers, error } = await supabase.from('customers').select('*');
    setBackupLoading(false);
    if (error) {
      alert('Failed to fetch customers: ' + error.message);
      return;
    }
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const fileName = `customers_backup_${yyyy}${mm}${dd}.json`;
    const blob = new Blob([JSON.stringify(customers, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="mb-8">
        <button
          onClick={handleBackup}
          disabled={backupLoading}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-800 shadow disabled:opacity-60"
        >
          {backupLoading ? 'Backing up...' : 'Backup All Customer Data'}
        </button>
      </div>
      <h2 className="text-lg font-semibold mb-4">Platform Prices</h2>
      <table className="min-w-full border-separate border-spacing-0 text-sm rounded-xl bg-white">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Platform</th>
            <th className="px-4 py-3 text-left font-semibold">Current Price</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-4 py-2">YouTube</td>
            <td className="px-4 py-2">Rs.500</td>
          </tr>
          <tr>
            <td className="px-4 py-2">Spotify</td>
            <td className="px-4 py-2">Rs.400</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default Settings; 