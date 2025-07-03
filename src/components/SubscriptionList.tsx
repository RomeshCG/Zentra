import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton, Tooltip, DialogContentText } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import { supabase } from '../service/supabaseClient';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface SubscriptionListProps {
  customerId: string;
}

const SubscriptionList: React.FC<SubscriptionListProps> = ({ customerId }) => {
  const [subs, setSubs] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    start_date: dayjs(),
    duration: 1,
    amount: '',
    platform: '',
  });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const fetchSubsAndPayments = async () => {
      setLoading(true);
      const [{ data: subsData }, { data: paymentsData }] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }),
        supabase
          .from('payments')
          .select('*')
          .eq('customer_id', customerId)
          .order('paid_on', { ascending: false })
      ]);
      setSubs(subsData || []);
      setPayments(paymentsData || []);
      setLoading(false);
    };
    if (customerId) fetchSubsAndPayments();
  }, [customerId]);

  const columns: GridColDef[] = [
    { field: 'plan_type', headerName: 'Plan Type', flex: 1 },
    { field: 'start_date', headerName: 'Start Date', flex: 1 },
    { field: 'end_date', headerName: 'End Date', flex: 1 },
    { field: 'status', headerName: 'Status', flex: 1 },
    { field: 'platform', headerName: 'Platform', flex: 1 },
    { field: 'amount', headerName: 'Payment Amount', flex: 1 },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      sortable: false,
      renderCell: (params: { row: any }) => (
        <Box display="flex" gap={1}>
          <Tooltip title="Edit">
            <IconButton onClick={() => handleEdit(params.row)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton color="error" onClick={() => handleDelete(params.row.id)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const rows = subs.map(sub => {
    const payment = payments.find((p: any) => p.platform === sub.platform) || payments.find((p: any) => p.platform == null);
    return { ...sub, amount: payment ? payment.amount : '-' };
  });

  const handleAddOpen = () => setAddOpen(true);
  const handleAddClose = () => {
    setAddOpen(false);
    setForm({ start_date: dayjs(), duration: 1, amount: '', platform: '' });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePlatformChange = (e: React.ChangeEvent<{ value: string }>) => {
    setForm({ ...form, platform: e.target.value });
  };

  const handleDateChange = (date: Dayjs | null) => {
    setForm({ ...form, start_date: date || dayjs() });
  };

  const handleEdit = (row: any) => {
    setForm({
      start_date: dayjs(row.start_date),
      duration: Number(row.plan_type),
      amount: row.amount || '',
      platform: row.platform || '',
    });
    setEditId(row.id);
    setAddOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deleteId) {
      await supabase.from('subscriptions').delete().eq('id', deleteId);
      setDeleteOpen(false);
      setDeleteId(null);
      // Refresh list
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      setSubs(data || []);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteOpen(false);
    setDeleteId(null);
  };

  const handleAddSubmit = async () => {
    setSaving(true);
    const start = dayjs(form.start_date);
    const end = start.add(Number(form.duration), 'month');
    if (editId) {
      // Update subscription only
      await supabase.from('subscriptions').update({
        plan_type: `${form.duration} month`,
        start_date: start.format('YYYY-MM-DD'),
        end_date: end.format('YYYY-MM-DD'),
        status: 'Paid',
        platform: form.platform,
      }).eq('id', editId);
    } else {
      // Insert subscription
      const { data: subData, error: subError } = await supabase.from('subscriptions').insert([
        {
          customer_id: customerId,
          plan_type: `${form.duration} month`,
          start_date: start.format('YYYY-MM-DD'),
          end_date: end.format('YYYY-MM-DD'),
          status: 'Paid',
          platform: form.platform,
          created_at: new Date().toISOString(),
        },
      ]).select('id');
      // Insert payment if subscription was successful
      if (!subError && subData && form.amount) {
        await supabase.from('payments').insert([
          {
            customer_id: customerId,
            amount: Number(form.amount),
            payment_method: 'manual',
            reference: '',
            paid_on: new Date().toISOString(),
          },
        ]);
      }
    }
    setSaving(false);
    handleAddClose();
    setEditId(null);
    // Refresh list
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    setSubs(data || []);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Subscriptions</Typography>
        <Button variant="contained" onClick={handleAddOpen}>Add Subscription</Button>
      </Box>
      <div style={{ height: 400, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={row => row.id}
          loading={loading}
          paginationModel={{ pageSize: 5, page: 0 }}
        />
      </div>
      <Dialog open={addOpen} onClose={handleAddClose}>
        <DialogTitle>Add Subscription</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1} minWidth={300}>
            <DatePicker
              label="Start Date"
              value={form.start_date}
              onChange={handleDateChange}
              slotProps={{ textField: { fullWidth: true } }}
            />
            <TextField
              select
              label="Duration"
              name="duration"
              value={form.duration}
              onChange={handleFormChange}
              fullWidth
            >
              <MenuItem value={1}>1 month</MenuItem>
              <MenuItem value={3}>3 months</MenuItem>
              <MenuItem value={6}>6 months</MenuItem>
            </TextField>
            <TextField
              label="Payment Amount"
              name="amount"
              type="number"
              value={form.amount}
              onChange={handleFormChange}
              fullWidth
            />
            <TextField
              select
              label="Service Type"
              name="platform"
              value={form.platform}
              onChange={handlePlatformChange}
              fullWidth
              required
            >
              <MenuItem value="YouTube">YouTube</MenuItem>
              <MenuItem value="Spotify">Spotify</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAddClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleAddSubmit} variant="contained" disabled={saving}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={deleteOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Subscription</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this subscription? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SubscriptionList; 