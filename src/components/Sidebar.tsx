import React from 'react';
import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Box, Toolbar, Divider, Button } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import PaymentIcon from '@mui/icons-material/Payment';
import LogoutIcon from '@mui/icons-material/Logout';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../service/supabaseClient';

const drawerWidth = 220;

const navItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Customers', icon: <PeopleIcon />, path: '/customers' },
  { text: 'Subscriptions', icon: <SubscriptionsIcon />, path: '/subscriptions' },
  { text: 'Payments', icon: <PaymentIcon />, path: '/payments' },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', bgcolor: '#181c24', color: '#fff' },
      }}
    >
      <Toolbar sx={{ minHeight: 64 }}>
        <Box fontWeight="bold" fontSize={22} letterSpacing={1} ml={1}>
          Zentra
        </Box>
      </Toolbar>
      <Divider sx={{ bgcolor: '#232a36' }} />
      <List>
        {navItems.map((item) => (
          <ListItemButton
            key={item.text}
            selected={location.pathname === item.path}
            onClick={() => navigate(item.path)}
            sx={{
              color: location.pathname === item.path ? '#90caf9' : '#fff',
              '&.Mui-selected': { bgcolor: '#232a36' },
              '&:hover': { bgcolor: '#232a36' },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItemButton>
        ))}
      </List>
      <Box flexGrow={1} />
      <Box p={2}>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<LogoutIcon />}
          fullWidth
          onClick={handleLogout}
          sx={{ borderColor: '#90caf9', color: '#90caf9', '&:hover': { borderColor: '#fff', color: '#fff' } }}
        >
          Logout
        </Button>
      </Box>
    </Drawer>
  );
};

export default Sidebar; 