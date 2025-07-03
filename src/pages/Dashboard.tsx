import React from 'react';
import Sidebar from '../components/Sidebar';
import { Box, Toolbar, Typography } from '@mui/material';

const Dashboard: React.FC = () => {
  return (
    <Box display="flex">
      <Sidebar />
      <Box component="main" flexGrow={1} bgcolor="#f4f6fa" minHeight="100vh">
        <Toolbar />
        <Box p={4}>
          <Typography variant="h4" fontWeight={600} mb={2} color="#181c24">
            Welcome to Zentra Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Here you can manage customers, subscriptions, payments, and more.
          </Typography>
          {/* Future: Add dashboard widgets, stats, reminders, etc. */}
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard; 