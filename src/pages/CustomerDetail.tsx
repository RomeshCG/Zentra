import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Box, Toolbar, Typography, Tabs, Tab, Paper, CircularProgress } from '@mui/material';
import { supabase } from '../service/supabaseClient';
import SubscriptionList from '../components/SubscriptionList';

const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const fetchCustomer = async () => {
      setLoading(true);
      const { data } = await supabase.from('customers').select('*').eq('id', id).single();
      setCustomer(data);
      setLoading(false);
    };
    fetchCustomer();
  }, [id]);

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh"><CircularProgress /></Box>;
  }

  if (!customer) {
    return <Box p={4}>Customer not found.</Box>;
  }

  return (
    <Box display="flex">
      <Sidebar />
      <Box component="main" flexGrow={1} bgcolor="#f4f6fa" minHeight="100vh">
        <Toolbar />
        <Box p={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" fontWeight={600}>{customer.name}</Typography>
            <Typography variant="body1" color="text.secondary">{customer.email}</Typography>
            <Typography variant="body2" color="text.secondary">{customer.phone}</Typography>
            <Typography variant="body2" color="text.secondary">Service: {customer.platform}</Typography>
            <Typography variant="body2" color="text.secondary">Notes: {customer.notes}</Typography>
          </Paper>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Subscriptions" />
            <Tab label="Payments" />
          </Tabs>
          {tab === 0 && (
            <Paper sx={{ p: 3 }}>
              <SubscriptionList customerId={customer.id} />
            </Paper>
          )}
          {tab === 1 && (
            <Paper sx={{ p: 3 }}>
              {/* Payments list and add/edit UI will go here */}
              <Typography>Payments section (coming soon)</Typography>
            </Paper>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default CustomerDetail; 