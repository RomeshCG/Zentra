import React, { useEffect, useState } from 'react';
import { supabase } from '../service/supabaseClient';

const ProfitExpenses: React.FC = () => {
  const [totals, setTotals] = useState<{income: number, expense: number, profit: number}>({income: 0, expense: 0, profit: 0});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTotals = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('customer_subscription_months')
        .select('income, expense, profit');
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (data && Array.isArray(data)) {
        const totalIncome = data.reduce((sum, row) => sum + (Number(row.income) || 0), 0);
        const totalExpense = data.reduce((sum, row) => sum + (Number(row.expense) || 0), 0);
        const totalProfit = data.reduce((sum, row) => sum + (Number(row.profit) || 0), 0);
        setTotals({ income: totalIncome, expense: totalExpense, profit: totalProfit });
      }
      setLoading(false);
    };
    fetchTotals();
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Profit & Expenses</h1>
      {loading ? (
        <div className="text-slate-500">Loading...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="bg-white rounded-xl shadow p-6 mt-6">
          <div className="mb-2 text-lg font-semibold text-cyan-900">System Totals</div>
          <div className="mb-1">Income: <span className="text-green-700 font-semibold">Rs.{totals.income.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
          <div className="mb-1">Expense: <span className="text-red-700 font-semibold">Rs.{totals.expense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
          <div className="mb-1">Profit: <span className="text-yellow-700 font-semibold">Rs.{totals.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
        </div>
      )}
    </div>
  );
};

export default ProfitExpenses; 