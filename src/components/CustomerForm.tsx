import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Checkbox, FormControlLabel, MenuItem, Select, InputLabel, FormControl, CircularProgress } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { supabase } from '../service/supabaseClient';

interface CustomerFormProps {
  open: boolean;
  initialData?: any;
  onClose: () => void;
  onSaved: () => void;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ open, initialData, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    platform: initialData?.platform || '',
    notes: initialData?.notes || '',
    is_manager: initialData?.is_manager || false,
    admin_account_id: initialData?.admin_account_id || '',
  });
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState<any[]>([]);
  const [fetchingManagers, setFetchingManagers] = useState(false);

  useEffect(() => {
    if (!form.is_manager && open) {
      setFetchingManagers(true);
      supabase
        .from('customers')
        .select('id, name')
        .eq('is_manager', true)
        .then(({ data }) => {
          setManagers(data || []);
          setFetchingManagers(false);
        });
    }
  }, [form.is_manager, open]);

  useEffect(() => {
    setForm({
      name: initialData?.name || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      platform: initialData?.platform || '',
      notes: initialData?.notes || '',
      is_manager: initialData?.is_manager || false,
      admin_account_id: initialData?.admin_account_id || '',
    });
  }, [initialData, open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePlatformChange = (e: SelectChangeEvent<string>) => {
    setForm({ ...form, platform: e.target.value });
  };

  const handleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, is_manager: e.target.checked, admin_account_id: '' });
  };

  const handleSelect = (e: SelectChangeEvent<string>) => {
    setForm({ ...form, admin_account_id: e.target.value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    const payload = { ...form };
    if (form.is_manager) payload.admin_account_id = null;
    if (initialData && initialData.id) {
      // Update
      await supabase.from('customers').update(payload).eq('id', initialData.id);
    } else {
      // Insert
      await supabase.from('customers').insert([payload]);
    }
    setLoading(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{initialData ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <TextField label="Name" name="name" value={form.name} onChange={handleInputChange} fullWidth required />
          <TextField label="Email" name="email" value={form.email} onChange={handleInputChange} fullWidth required />
          <TextField label="Phone" name="phone" value={form.phone} onChange={handleInputChange} fullWidth />
          <FormControl fullWidth required>
            <InputLabel id="platform-label">Service Type</InputLabel>
            <Select
              labelId="platform-label"
              name="platform"
              value={form.platform}
              label="Service Type"
              onChange={handlePlatformChange}
            >
              <MenuItem value="YouTube">YouTube</MenuItem>
              <MenuItem value="Spotify">Spotify</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Notes" name="notes" value={form.notes} onChange={handleInputChange} fullWidth multiline rows={2} />
          <FormControlLabel
            control={<Checkbox checked={form.is_manager} onChange={handleCheckbox} />}
            label="Is this a manager account?"
          />
          {!form.is_manager && (
            <FormControl fullWidth required>
              <InputLabel id="admin-account-label">Admin Account</InputLabel>
              {fetchingManagers ? (
                <Box display="flex" alignItems="center" p={2}><CircularProgress size={20} /></Box>
              ) : (
                <Select
                  labelId="admin-account-label"
                  value={form.admin_account_id}
                  label="Admin Account"
                  onChange={handleSelect}
                >
                  {managers.map((m) => (
                    <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                  ))}
                </Select>
              )}
            </FormControl>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {initialData ? 'Update' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomerForm; 