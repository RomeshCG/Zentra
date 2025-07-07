import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../service/supabaseClient';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white rounded shadow p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome to Zentra Dashboard</h1>
        <p className="text-gray-600 mb-6">You are logged in. Start building your app from here!</p>
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Dashboard; 