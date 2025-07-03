import React, { useState } from 'react';
import { Box, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
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
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    if (initialData && initialData.id) {
      // Update
      await supabase.from('customers').update(form).eq('id', initialData.id);
    } else {
      // Insert
      await supabase.from('customers').insert([form]);
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
          <TextField label="Name" name="name" value={form.name} onChange={handleChange} fullWidth required />
          <TextField label="Email" name="email" value={form.email} onChange={handleChange} fullWidth required />
          <TextField label="Phone" name="phone" value={form.phone} onChange={handleChange} fullWidth />
          <TextField label="Platform" name="platform" value={form.platform} onChange={handleChange} fullWidth />
          <TextField label="Notes" name="notes" value={form.notes} onChange={handleChange} fullWidth multiline rows={2} />
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