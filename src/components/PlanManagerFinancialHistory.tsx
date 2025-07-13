import React, { useEffect, useState } from 'react';
import { supabase } from '../service/supabaseClient';

const PlanManagerFinancialHistory: React.FC<{ planManagerId: string }> = ({ planManagerId }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('plan_manager_financial_history')
        .select('*')
        .eq('plan_manager_id', planManagerId)
        .order('month', { ascending: false });
      setHistory(data || []);
      setLoading(false);
    };
    if (planManagerId) fetchHistory();
  }, [planManagerId]);

  if (loading) return <div>Loading...</div>;

  return (
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
                <th className="px-4 py-3 text-left font-semibold">Expense</th>
                <th className="px-4 py-3 text-left font-semibold">Profit</th>
                <th className="px-4 py-3 text-left font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2 whitespace-nowrap">{h.month ? new Date(h.month).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : '-'}</td>
                  <td className="px-4 py-2 whitespace-nowrap">Rs.{Number(h.expense).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 whitespace-nowrap">Rs.{Number(h.profit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{h.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PlanManagerFinancialHistory; 