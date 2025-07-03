import React from 'react';
import Sidebar from '../components/Sidebar';
import { Box, Toolbar, Typography } from '@mui/material';

const Subscriptions: React.FC = () => {
  return (
    <Box display="flex">
      <Sidebar />
      <Box component="main" flexGrow={1} bgcolor="#f4f6fa" minHeight="100vh">
        <Toolbar />
        <Box p={4}>
          <Typography variant="h4" fontWeight={600} mb={2} color="#181c24">
            Subscriptions
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This is where you will manage subscriptions.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Subscriptions; 