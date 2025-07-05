import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { 
  Box, 
  Toolbar, 
  Typography, 
  Card, 
  CardContent, 
  Paper, 
  Breadcrumbs,
  Chip,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Divider,
  Alert,
  CircularProgress,
  Button,
  Avatar
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { supabase } from '../service/supabaseClient';
import PersonIcon from '@mui/icons-material/Person';
import YouTubeIcon from '@mui/icons-material/YouTube';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import dayjs from 'dayjs';
import SubscriptionSummary from '../components/SubscriptionSummary';
import SubscriptionDashboard from '../components/SubscriptionDashboard';
import { calculateSlots } from '../utils/slotCalculator';

const brandBg = '#232a36';
const brandAccent = '#2d3442';

interface ManagerData {
  id: string;
  name: string;
  email: string;
  platforms: {
    [key: string]: {
      accounts: any[];
      subscriptions: any[];
      emptySlots: number;
      renewalDate: string | null;
      totalSlots: number;
    };
  };
}

const Subscriptions: React.FC = () => {
  const [managers, setManagers] = useState<ManagerData[]>([]);
  const [selectedManager, setSelectedManager] = useState<ManagerData | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [filters, setFilters] = useState({ platform: '', status: '' });

  useEffect(() => {
    fetchManagerData();
  }, []);

  const fetchManagerData = async () => {
    setLoading(true);
    try {
      // Fetch all managers
      const { data: managersData } = await supabase
        .from('customers')
        .select('*')
        .eq('is_manager', true);

      if (!managersData) return;

      const managersWithData: ManagerData[] = [];

      for (const manager of managersData) {
        // Fetch accounts for this manager
        const { data: accountsData } = await supabase
          .from('customers')
          .select('*')
          .eq('admin_account_id', manager.id);

        // Fetch subscriptions for all accounts under this manager
        const accountIds = accountsData?.map(acc => acc.id) || [];
        const { data: subscriptionsData } = await supabase
          .from('subscriptions')
          .select('*')
          .in('customer_id', accountIds)
          .order('end_date', { ascending: true });

        // Group by platform
        const platforms: { [key: string]: any } = {};
        
        if (accountsData) {
          for (const account of accountsData) {
            const platform = account.platform || 'Unknown';
            if (!platforms[platform]) {
              platforms[platform] = {
                accounts: [],
                subscriptions: [],
                emptySlots: 0,
                renewalDate: null,
                totalSlots: 0
              };
            }
            platforms[platform].accounts.push(account);
          }
        }

        // Process subscriptions and calculate metrics
        if (subscriptionsData) {
          for (const sub of subscriptionsData) {
            const account = accountsData?.find(acc => acc.id === sub.customer_id);
            if (account) {
              const platform = account.platform || 'Unknown';
              if (platforms[platform]) {
                platforms[platform].subscriptions.push(sub);
                
                // Calculate renewal date (earliest end date for this platform)
                const endDate = dayjs(sub.end_date);
                if (!platforms[platform].renewalDate || endDate.isBefore(platforms[platform].renewalDate)) {
                  platforms[platform].renewalDate = sub.end_date;
                }
              }
            }
          }
        }

        // Calculate empty slots for each platform using the slot calculator
        for (const platform in platforms) {
          const platformData = platforms[platform];
          const slotCalculation = calculateSlots(platform, platformData.subscriptions);
          platformData.totalSlots = slotCalculation.totalSlots;
          platformData.emptySlots = slotCalculation.emptySlots;
        }

        managersWithData.push({
          id: manager.id,
          name: manager.name,
          email: manager.email,
          platforms
        });
      }

      setManagers(managersWithData);
    } catch (error) {
      console.error('Error fetching manager data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return <YouTubeIcon />;
      case 'spotify':
        return <MusicNoteIcon />;
      default:
        return <PersonIcon />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return '#FF0000';
      case 'spotify':
        return '#1DB954';
      default:
        return brandAccent;
    }
  };

  const getRenewalStatus = (renewalDate: string | null) => {
    if (!renewalDate) return { status: 'No subscriptions', color: 'default' };
    
    const daysUntilRenewal = dayjs(renewalDate).diff(dayjs(), 'day');
    
    if (daysUntilRenewal < 0) {
      return { status: 'Overdue', color: 'error' };
    } else if (daysUntilRenewal <= 7) {
      return { status: 'Due Soon', color: 'warning' };
    } else if (daysUntilRenewal <= 30) {
      return { status: 'Due This Month', color: 'info' };
    } else {
      return { status: 'Active', color: 'success' };
    }
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  const getFilteredManagers = () => {
    if (!filters.platform && !filters.status) {
      return managers;
    }

    return managers.filter(manager => {
      const hasPlatform = !filters.platform || Object.keys(manager.platforms).includes(filters.platform);
      
      if (!hasPlatform) return false;
      
      if (filters.status) {
        const hasStatus = Object.values(manager.platforms).some((platform: any) => {
          if (!platform.renewalDate) return false;
          
          const daysUntilRenewal = dayjs(platform.renewalDate).diff(dayjs(), 'day');
          
          switch (filters.status) {
            case 'overdue':
              return daysUntilRenewal < 0;
            case 'due_soon':
              return daysUntilRenewal <= 7 && daysUntilRenewal >= 0;
            case 'active':
              return daysUntilRenewal > 7;
            default:
              return true;
          }
        });
        
        return hasStatus;
      }
      
      return true;
    });
  };

  const columns: GridColDef[] = [
    { field: 'account_name', headerName: 'Account', flex: 1 },
    { field: 'platform', headerName: 'Platform', flex: 1 },
    { field: 'plan_type', headerName: 'Plan Type', flex: 1 },
    { field: 'start_date', headerName: 'Start Date', flex: 1 },
    { field: 'end_date', headerName: 'End Date', flex: 1 },
    { field: 'status', headerName: 'Status', flex: 1 },
    {
      field: 'days_remaining',
      headerName: 'Days Remaining',
      flex: 1,
      renderCell: (params) => {
        const days = dayjs(params.row.end_date).diff(dayjs(), 'day');
        return (
          <Chip 
            label={`${days} days`}
            color={days <= 7 ? 'warning' : days <= 30 ? 'info' : 'success'}
            size="small"
          />
        );
      }
    }
  ];

  if (loading) {
    return (
      <Box display="flex">
        <Sidebar />
        <Box flexGrow={1} bgcolor="#f4f6fa" minHeight="100vh">
          <Toolbar />
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
            <CircularProgress />
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box display="flex">
      <Sidebar />
      <Box flexGrow={1} bgcolor="#f4f6fa" minHeight="100vh">
        <Toolbar />
        <Box p={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Box>
                <Typography variant="h4" fontWeight={600} mb={1}>
                  Manager Subscriptions
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  View and manage subscriptions grouped by manager and platform
                </Typography>
              </Box>
              <Tooltip title="Refresh Data">
                <IconButton onClick={fetchManagerData} color="primary">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>

            {selectedManager ? (
              <>
                <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
                  <Typography 
                    color="text.primary" 
                    sx={{ cursor: 'pointer' }}
                    onClick={() => setSelectedManager(null)}
                  >
                    Managers
                  </Typography>
                  <Typography color="text.primary">{selectedManager.name}</Typography>
                  {selectedPlatform && (
                    <Typography color="text.primary">{selectedPlatform}</Typography>
                  )}
                </Breadcrumbs>

                {!selectedPlatform ? (
                  // Show platforms for selected manager
                  <>
                                         <Typography variant="h5" mb={3}>Platforms for {selectedManager.name}</Typography>
                     <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                       {Object.entries(selectedManager.platforms).map(([platform, data]) => {
                         const renewalStatus = getRenewalStatus(data.renewalDate);
                         return (
                           <Box key={platform} sx={{ flex: '1 1 300px', minWidth: '250px', maxWidth: '350px' }}>
                             <Card 
                               sx={{ 
                                 bgcolor: brandBg, 
                                 color: '#fff', 
                                 borderRadius: 2,
                                 cursor: 'pointer',
                                 '&:hover': { bgcolor: brandAccent }
                               }}
                               onClick={() => setSelectedPlatform(platform)}
                             >
                               <CardContent>
                                                                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                                   <Box sx={{ color: getPlatformColor(platform) }}>
                                     {getPlatformIcon(platform)}
                                   </Box>
                                   <Typography variant="h6">{platform}</Typography>
                                   <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                                     <Tooltip title={`${platform}: 5 slots (unmanaged), 6 slots (managed)`}>
                                       <Typography variant="caption" color="#bbb">
                                         ℹ️
                                       </Typography>
                                     </Tooltip>
                                   </Box>
                                 </Box>
                                 
                                 <Box display="flex" justifyContent="space-between" mb={1}>
                                   <Typography variant="body2" color="#bbb">Accounts:</Typography>
                                   <Typography variant="body2">{data.accounts.length}</Typography>
                                 </Box>
                                 
                                 <Box display="flex" justifyContent="space-between" mb={1}>
                                   <Typography variant="body2" color="#bbb">Active Subscriptions:</Typography>
                                   <Typography variant="body2">{data.subscriptions.length}</Typography>
                                 </Box>
                                 
                                 <Box display="flex" justifyContent="space-between" mb={1}>
                                   <Typography variant="body2" color="#bbb">Total Slots:</Typography>
                                   <Typography variant="body2">{data.totalSlots}</Typography>
                                 </Box>
                                 
                                 <Box display="flex" justifyContent="space-between" mb={1}>
                                   <Typography variant="body2" color="#bbb">Empty Slots:</Typography>
                                   <Typography 
                                     variant="body2" 
                                     color={data.emptySlots === 0 ? '#ff6b6b' : '#4caf50'}
                                   >
                                     {data.emptySlots}
                                   </Typography>
                                 </Box>
                                 
                                 <Divider sx={{ my: 1, borderColor: '#444' }} />
                                 
                                 <Box display="flex" justifyContent="space-between" alignItems="center">
                                   <Typography variant="body2" color="#bbb">Renewal:</Typography>
                                   <Chip 
                                     label={renewalStatus.status}
                                     color={renewalStatus.color as any}
                                     size="small"
                                   />
                                 </Box>
                                 
                                 {data.renewalDate && (
                                   <Typography variant="caption" color="#bbb" display="block" mt={1}>
                                     {dayjs(data.renewalDate).format('MMM DD, YYYY')}
                                   </Typography>
                                 )}
                               </CardContent>
                             </Card>
                           </Box>
                         );
                       })}
                     </Box>
                  </>
                ) : (
                                     // Show subscriptions for selected platform
                   <>
                     <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                       <Typography variant="h5">
                         {selectedPlatform} Subscriptions - {selectedManager.name}
                       </Typography>
                       <Button 
                         variant="outlined" 
                         onClick={() => setSelectedPlatform('')}
                         startIcon={<ArrowBackIcon />}
                       >
                         Back to Platforms
                       </Button>
                     </Box>

                     <SubscriptionSummary
                       managerName={selectedManager.name}
                       platform={selectedPlatform}
                       accounts={selectedManager.platforms[selectedPlatform].accounts}
                       subscriptions={selectedManager.platforms[selectedPlatform].subscriptions}
                       emptySlots={selectedManager.platforms[selectedPlatform].emptySlots}
                       totalSlots={selectedManager.platforms[selectedPlatform].totalSlots}
                       renewalDate={selectedManager.platforms[selectedPlatform].renewalDate}
                     />

                     <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
                       <Tab label="Subscriptions" />
                       <Tab label="Accounts" />
                     </Tabs>

                    {activeTab === 0 && (
                      <div style={{ height: 500, width: '100%' }}>
                        <DataGrid
                          rows={selectedManager.platforms[selectedPlatform].subscriptions.map(sub => ({
                            ...sub,
                            account_name: selectedManager.platforms[selectedPlatform].accounts.find(
                              acc => acc.id === sub.customer_id
                            )?.name || 'Unknown',
                            platform: selectedPlatform
                          }))}
                          columns={columns}
                          getRowId={row => row.id}
                          paginationModel={{ pageSize: 10, page: 0 }}
                        />
                      </div>
                    )}

                                         {activeTab === 1 && (
                       <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                         {selectedManager.platforms[selectedPlatform].accounts.map(account => {
                           const isManaged = account.admin_account_id !== null;
                           const slotInfo = isManaged ? 
                             `${selectedPlatform === 'YouTube' || selectedPlatform === 'Spotify' ? 6 : 3} slots (managed)` :
                             `${selectedPlatform === 'YouTube' || selectedPlatform === 'Spotify' ? 5 : 3} slots (unmanaged)`;
                           
                           return (
                             <Box key={account.id} sx={{ flex: '1 1 300px', minWidth: '250px', maxWidth: '350px' }}>
                               <Card sx={{ bgcolor: brandAccent, color: '#fff', borderRadius: 2 }}>
                                 <CardContent>
                                   <Typography variant="h6" mb={1}>{account.name}</Typography>
                                   <Typography variant="body2" color="#bbb" mb={1}>{account.email}</Typography>
                                   <Typography variant="body2" color="#bbb" mb={1}>{account.phone}</Typography>
                                   <Box display="flex" alignItems="center" gap={1}>
                                     <Chip 
                                       label={slotInfo}
                                       size="small"
                                       color={isManaged ? 'success' : 'warning'}
                                       variant="outlined"
                                     />
                                   </Box>
                                 </CardContent>
                               </Card>
                             </Box>
                           );
                         })}
                       </Box>
                     )}
                  </>
                )}
              </>
                         ) : (
               // Show all managers
               <>
                 <SubscriptionDashboard 
                   managers={managers} 
                   onFilterChange={handleFilterChange} 
                 />
                 
                 <Typography variant="h5" mb={3}>Select a Manager</Typography>
                 <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                   {getFilteredManagers().map((manager) => (
                     <Box key={manager.id} sx={{ flex: '1 1 300px', minWidth: '250px', maxWidth: '350px' }}>
                       <Card 
                         sx={{ 
                           bgcolor: brandBg, 
                           color: '#fff', 
                           borderRadius: 2,
                           cursor: 'pointer',
                           '&:hover': { bgcolor: brandAccent }
                         }}
                         onClick={() => setSelectedManager(manager)}
                       >
                         <CardContent>
                           <Box display="flex" alignItems="center" gap={2} mb={2}>
                             <Avatar sx={{ bgcolor: brandAccent }}>
                               <PersonIcon />
                             </Avatar>
                             <Box>
                               <Typography variant="h6">{manager.name}</Typography>
                               <Typography variant="body2" color="#bbb">{manager.email}</Typography>
                             </Box>
                           </Box>
                           
                           <Box display="flex" justifyContent="space-between" mb={1}>
                             <Typography variant="body2" color="#bbb">Platforms:</Typography>
                             <Typography variant="body2">{Object.keys(manager.platforms).length}</Typography>
                           </Box>
                           
                           <Box display="flex" justifyContent="space-between" mb={1}>
                             <Typography variant="body2" color="#bbb">Total Accounts:</Typography>
                             <Typography variant="body2">
                               {Object.values(manager.platforms).reduce((sum, platform) => 
                                 sum + platform.accounts.length, 0
                               )}
                             </Typography>
                           </Box>
                           
                           <Box display="flex" justifyContent="space-between" mb={1}>
                             <Typography variant="body2" color="#bbb">Total Subscriptions:</Typography>
                             <Typography variant="body2">
                               {Object.values(manager.platforms).reduce((sum, platform) => 
                                 sum + platform.subscriptions.length, 0
                               )}
                             </Typography>
                           </Box>
                           
                           <Divider sx={{ my: 1, borderColor: '#444' }} />
                           
                           <Box display="flex" gap={1} flexWrap="wrap">
                             {Object.entries(manager.platforms).map(([platform, data]) => {
                               const renewalStatus = getRenewalStatus(data.renewalDate);
                               return (
                                 <Chip
                                   key={platform}
                                   icon={getPlatformIcon(platform)}
                                   label={platform}
                                   size="small"
                                   color={renewalStatus.color as any}
                                   variant="outlined"
                                 />
                               );
                             })}
                           </Box>
                         </CardContent>
                       </Card>
                     </Box>
                   ))}
                 </Box>
              </>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default Subscriptions; 