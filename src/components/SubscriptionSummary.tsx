import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Chip, 
  Divider,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';

interface SubscriptionSummaryProps {
  managerName: string;
  platform: string;
  accounts: any[];
  subscriptions: any[];
  emptySlots: number;
  totalSlots: number;
  renewalDate: string | null;
}

const SubscriptionSummary: React.FC<SubscriptionSummaryProps> = ({
  managerName,
  platform,
  accounts,
  subscriptions,
  emptySlots,
  totalSlots,
  renewalDate
}) => {
  const getRenewalStatus = (renewalDate: string | null) => {
    if (!renewalDate) return { status: 'No subscriptions', color: 'default', icon: <ScheduleIcon /> };
    
    const daysUntilRenewal = dayjs(renewalDate).diff(dayjs(), 'day');
    
    if (daysUntilRenewal < 0) {
      return { status: 'Overdue', color: 'error', icon: <ErrorIcon /> };
    } else if (daysUntilRenewal <= 7) {
      return { status: 'Due Soon', color: 'warning', icon: <WarningIcon /> };
    } else if (daysUntilRenewal <= 30) {
      return { status: 'Due This Month', color: 'info', icon: <ScheduleIcon /> };
    } else {
      return { status: 'Active', color: 'success', icon: <CheckCircleIcon /> };
    }
  };

  const renewalStatus = getRenewalStatus(renewalDate);
  const utilizationRate = totalSlots > 0 ? ((totalSlots - emptySlots) / totalSlots) * 100 : 0;

  return (
    <Card sx={{ mb: 2, bgcolor: '#f8f9fa' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={600}>
            {managerName} - {platform}
          </Typography>
          <Chip 
            label={renewalStatus.status}
            color={renewalStatus.color as any}
            icon={renewalStatus.icon}
            size="small"
          />
        </Box>

        <Box display="flex" gap={4} mb={2}>
          <Box>
            <Typography variant="body2" color="text.secondary">Total Accounts</Typography>
            <Typography variant="h6">{accounts.length}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Active Subscriptions</Typography>
            <Typography variant="h6">{subscriptions.length}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Total Slots</Typography>
            <Typography variant="h6">{totalSlots}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Empty Slots</Typography>
            <Typography 
              variant="h6" 
              color={emptySlots === 0 ? 'error.main' : 'success.main'}
            >
              {emptySlots}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Utilization</Typography>
            <Typography variant="h6">{utilizationRate.toFixed(1)}%</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {renewalDate && (
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Next Renewal Date
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {dayjs(renewalDate).format('MMM DD, YYYY')}
              {renewalStatus.color === 'error' && (
                <Tooltip title="Subscription is overdue">
                  <IconButton size="small" color="error" sx={{ ml: 1 }}>
                    <ErrorIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {renewalStatus.color === 'warning' && (
                <Tooltip title="Renewal due within 7 days">
                  <IconButton size="small" color="warning" sx={{ ml: 1 }}>
                    <WarningIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Typography>
          </Box>
        )}

        {emptySlots === 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            No empty slots available. Consider upgrading the plan or removing inactive subscriptions.
          </Alert>
        )}

        {renewalStatus.color === 'error' && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Subscription is overdue. Please renew immediately to avoid service interruption.
          </Alert>
        )}

        {renewalStatus.color === 'warning' && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Renewal is due within 7 days. Please process the renewal to maintain service.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionSummary; 