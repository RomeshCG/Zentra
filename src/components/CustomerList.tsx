import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { TextField, Box, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { supabase } from '../service/supabaseClient';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  platform: string;
  notes: string;
  created_at: string;
}

interface CustomerListProps {
  onEdit: (customer: Customer) => void;
}

const CustomerList: React.FC<CustomerListProps> = ({ onEdit }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) setCustomers(data);
    };
    fetchCustomers();
  }, []);

  const filtered = customers.filter(
    c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1 },
    { field: 'phone', headerName: 'Phone', flex: 1 },
    { field: 'platform', headerName: 'Platform', flex: 1 },
    { field: 'notes', headerName: 'Notes', flex: 1 },
    { field: 'created_at', headerName: 'Created At', flex: 1 },
    {
      field: 'actions',
      headerName: 'Actions',
      sortable: false,
      renderCell: (params: { row: Customer }) => (
        <IconButton onClick={() => onEdit(params.row)}>
          <EditIcon />
        </IconButton>
      ),
    },
  ];

  return (
    <Box>
      <TextField
        label="Search by name or email"
        value={search}
        onChange={e => setSearch(e.target.value)}
        fullWidth
        margin="normal"
      />
      <div style={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={filtered}
          columns={columns}
          getRowId={(row: Customer) => row.id}
          paginationModel={{ pageSize: 10, page: 0 }}
        />
      </div>
    </Box>
  );
};

export default CustomerList; 