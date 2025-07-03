import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { TextField, Box, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import { supabase } from '../service/supabaseClient';
import { useNavigate } from 'react-router-dom';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  platform: string;
  notes: string;
  created_at: string;
  is_manager?: boolean;
  admin_account_id?: string | null;
  manager_name?: string;
}

interface CustomerListProps {
  onEdit: (customer: Customer) => void;
}

const CustomerList: React.FC<CustomerListProps> = ({ onEdit }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*, manager:admin_account_id(name)')
        .order('created_at', { ascending: false });
      if (!error && data) {
        // Map manager name for each customer
        const mapped = data.map((c: any) => ({
          ...c,
          manager_name: c.admin_account_id && c.manager ? c.manager.name : (c.is_manager ? 'Manager' : '-')
        }));
        setCustomers(mapped);
      }
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
    { field: 'manager_name', headerName: 'Manager Account', flex: 1 },
    { field: 'notes', headerName: 'Notes', flex: 1 },
    { field: 'created_at', headerName: 'Created At', flex: 1 },
    {
      field: 'actions',
      headerName: 'Actions',
      sortable: false,
      renderCell: (params: { row: Customer }) => (
        <Box display="flex" gap={1}>
          <Tooltip title="Edit">
            <IconButton onClick={() => onEdit(params.row)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Manage">
            <IconButton onClick={() => navigate(`/customer/${params.row.id}`)}>
              <ManageAccountsIcon />
            </IconButton>
          </Tooltip>
        </Box>
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