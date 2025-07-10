import React from 'react';

const Settings: React.FC = () => {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
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