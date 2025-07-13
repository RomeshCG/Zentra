import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PlanManagerFinancialHistory from '../components/PlanManagerFinancialHistory.tsx';

const PlanManagerHistory: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="mb-6 text-cyan-700 hover:underline">&larr; Back</button>
      <h1 className="text-2xl font-bold mb-6">Plan Manager Financial History</h1>
      {id && <PlanManagerFinancialHistory planManagerId={id} />}
    </div>
  );
};

export default PlanManagerHistory; 