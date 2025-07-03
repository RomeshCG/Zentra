import React, { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import CustomerList from '../components/CustomerList';
import CustomerForm from '../components/CustomerForm';

const Customers: React.FC = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [refresh, setRefresh] = useState(false);

  const handleEdit = (customer: any) => {
    setSelected(customer);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setSelected(null);
    setFormOpen(true);
  };

  const handleSaved = () => {
    setRefresh(r => !r);
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Customers</Typography>
        <Button variant="contained" onClick={handleAdd}>Add Customer</Button>
      </Box>
      <CustomerList key={refresh ? 'refresh' : 'no-refresh'} onEdit={handleEdit} />
      <CustomerForm
        open={formOpen}
        initialData={selected}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
    </Box>
  );
};

export default Customers; 