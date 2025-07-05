import React, { useState } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid
} from '@mui/material';
import { 
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';

interface SubscriptionDashboardProps {
  managers: any[];
  onFilterChange: (filters: any) => void;
}

const SubscriptionDashboard: React.FC<SubscriptionDashboardProps> = ({ 
  managers, 
  onFilterChange 
}) => {
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const calculateOverallStats = () => {
    let totalAccounts = 0;
    let totalSubscriptions = 0;
    let totalSlots = 0;
    let totalEmptySlots = 0;
    let overdueCount = 0;
    let dueSoonCount = 0;

    managers.forEach(manager => {
      Object.values(manager.platforms).forEach((platform: any) => {
        totalAccounts += platform.accounts.length;
        totalSubscriptions += platform.subscriptions.length;
        totalSlots += platform.totalSlots;
        totalEmptySlots += platform.emptySlots;

        if (platform.renewalDate) {
          const daysUntilRenewal = dayjs(platform.renewalDate).diff(dayjs(), 'day');
          if (daysUntilRenewal < 0) {
            overdueCount++;
          } else if (daysUntilRenewal <= 7) {
            dueSoonCount++;
          }
        }
      });
    });

    return {
      totalAccounts,
      totalSubscriptions,
      totalSlots,
      totalEmptySlots,
      overdueCount,
      dueSoonCount,
      utilizationRate: totalSlots > 0 ? ((totalSlots - totalEmptySlots) / totalSlots) * 100 : 0
    };
  };

  const stats = calculateOverallStats();

  const handlePlatformFilterChange = (event: any) => {
    const value = event.target.value;
    setPlatformFilter(value);
    onFilterChange({ platform: value, status: statusFilter });
  };

  const handleStatusFilterChange = (event: any) => {
    const value = event.target.value;
    setStatusFilter(value);
    onFilterChange({ platform: platformFilter, status: value });
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" mb={3}>Subscription Overview</Typography>
      
      {/* Statistics Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Card sx={{ minWidth: 200, flex: '1 1 200px' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <TrendingUpIcon color="primary" />
              <Typography variant="h6">{stats.totalSubscriptions}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">Active Subscriptions</Typography>
          </CardContent>
        </Card>

        <Card sx={{ minWidth: 200, flex: '1 1 200px' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <CheckCircleIcon color="success" />
              <Typography variant="h6">{stats.totalAccounts}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">Total Accounts</Typography>
          </CardContent>
        </Card>

        <Card sx={{ minWidth: 200, flex: '1 1 200px' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Typography variant="h6" color={stats.totalEmptySlots === 0 ? 'error.main' : 'success.main'}>
                {stats.totalEmptySlots}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">Empty Slots</Typography>
          </CardContent>
        </Card>

        <Card sx={{ minWidth: 200, flex: '1 1 200px' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Typography variant="h6">{stats.utilizationRate.toFixed(1)}%</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">Utilization Rate</Typography>
          </CardContent>
        </Card>

        {stats.overdueCount > 0 && (
          <Card sx={{ minWidth: 200, flex: '1 1 200px', bgcolor: 'error.light' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <WarningIcon color="error" />
                <Typography variant="h6" color="error.main">{stats.overdueCount}</Typography>
              </Box>
              <Typography variant="body2" color="error.main">Overdue Renewals</Typography>
            </CardContent>
          </Card>
        )}

        {stats.dueSoonCount > 0 && (
          <Card sx={{ minWidth: 200, flex: '1 1 200px', bgcolor: 'warning.light' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <ScheduleIcon color="warning" />
                <Typography variant="h6" color="warning.main">{stats.dueSoonCount}</Typography>
              </Box>
              <Typography variant="body2" color="warning.main">Due Soon</Typography>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Platform</InputLabel>
          <Select
            value={platformFilter}
            label="Filter by Platform"
            onChange={handlePlatformFilterChange}
          >
            <MenuItem value="">All Platforms</MenuItem>
            <MenuItem value="YouTube">YouTube</MenuItem>
            <MenuItem value="Spotify">Spotify</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={statusFilter}
            label="Filter by Status"
            onChange={handleStatusFilterChange}
          >
            <MenuItem value="">All Status</MenuItem>
            <MenuItem value="overdue">Overdue</MenuItem>
            <MenuItem value="due_soon">Due Soon</MenuItem>
            <MenuItem value="active">Active</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};

export default SubscriptionDashboard; 