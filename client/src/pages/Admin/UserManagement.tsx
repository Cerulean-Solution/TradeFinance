import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { Plus, RefreshCw, User } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import type { ApexOptions } from 'apexcharts';
import DataTable, { Column } from '../FrameworkComponent/DataTable';
import ApexChart from 'react-apexcharts';
dayjs.extend(utc);
dayjs.extend(timezone);

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select';
const userSchema = z.object({
  UserID: z.number().optional(),
  UniverseID: z.string().optional(),
  UserType: z.string().optional(),
  Username: z.string().min(1, 'Username is required'),
  Email: z.string().email('Invalid email'),
  PasswordHash: z.string().optional(),
  PasswordUpdatedAt: z.string().optional(),
  PrimaryRole: z.string().optional(),
  RoleTags: z.string().optional(),
  Department: z.string().optional(),
  Designation: z.string().optional(),
  FirstName: z.string().optional(),
  LastName: z.string().optional(),
  DisplayName: z.string().optional(),
  Gender: z.string().optional(),
  DateOfBirth: z.string().optional(),
  PhoneNumber: z.string().optional(),
  AlternatePhone: z.string().optional(),
  AddressLine1: z.string().optional(),
  AddressLine2: z.string().optional(),
  City: z.string().optional(),
  State: z.string().optional(),
  Country: z.string().optional(),
  PostalCode: z.string().optional(),
  AuthType: z.string().optional(),
  ExternalAuthProvider: z.string().optional(),
  ExternalAuthID: z.string().optional(),
  AuthMetadata: z.string().optional(),
  IsSupervisor: z.boolean().optional(),
  IsManager: z.boolean().optional(),
  ManagementLevel: z.string().optional(),
  SupervisorUserID: z.string().optional(),
  ManagerUserID: z.string().optional(),
  DirectReportsCount: z.number().optional(),
  IsDelegated: z.boolean().optional(),
  DelegatedToUserID: z.string().optional(),
  DelegatedByUserID: z.string().optional(),
  DelegationStartDate: z.string().optional(),
  DelegationEndDate: z.string().optional(),
  DelegationReason: z.string().optional(),
  HireDate: z.string().optional(),
  TerminationDate: z.string().optional(),
  EmploymentType: z.string().optional(),
  EmploymentStatus: z.string().optional(),
  LastLoginAt: z.string().optional(),
  IsActive: z.boolean().optional(),
  IsDeleted: z.boolean().optional()
});

type UserFormData = z.infer<typeof userSchema>;

type Universe = {
  UniverseID: string;
  UniverseName: string;
};

export interface User {
  UserID: number;
  Username: string;
  Email: string;
  PhoneNumber?: string;
  RoleTags: string;
  FullName?: string; // :white_tick: add this if used
}
const UserManagement = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUniverseID, setSelectedUniverseID] = useState(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);

  const queryClient = useQueryClient();
  const todayDate = () => {
    const d = new Date();
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  };
  const todayDateTime = () => {
    const d = new Date();
    return d.toISOString().slice(0, 19).replace('T', ' '); // YYYY-MM-DD HH:mm:ss
  };

  const createDefaults = {
    UniverseID: selectedUniverseID ?? '',
    UserType: 'Employee',
    Username: 'NewUser',
    Email: 'newuser@example.com',
    PasswordHash: '',
    PasswordUpdatedAt: todayDateTime(),
    DelegationStartDate: todayDateTime(),
    DelegationEndDate: todayDateTime(),
    LastLoginAt: todayDateTime(),
    DateOfBirth: todayDate(),
    HireDate: todayDate(),
    TerminationDate: todayDate(),
    PrimaryRole: 'Employee',
    RoleTags: 'Employee',
    FirstName: 'New',
    LastName: 'User',
    DisplayName: 'New User',
    Gender: 'Female',
    Department: 'IT',
    Designation: 'Staff',
    PhoneNumber: '9452589645',
    AlternatePhone: '7598334251',
    AddressLine1: '4th',
    AddressLine2: 'kannanathal',
    City: 'madurai',
    State: 'tamilnadu',
    Country: 'IN',
    PostalCode: '765432',
    AuthType: 'Local',
    ExternalAuthProvider: 'Local',
    ExternalAuthID: '0',
    AuthMetadata: 'user details',
    IsSupervisor: false,
    IsManager: false,
    ManagementLevel: 'L1',
    SupervisorUserID: '0',
    ManagerUserID: '1',
    DirectReportsCount: 0,
    IsDelegated: false,
    DelegatedToUserID: '0',
    DelegatedByUserID: '0',
    DelegationReason: 'Leave',
    EmploymentType: 'Full Time',
    EmploymentStatus: 'Active',
    IsActive: true,
    IsDeleted: false
  };
  const createUserForm = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: createDefaults
  });
  const editUserForm = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {}
  });

  const { data: universes = [], isLoading: universesLoading } = useQuery({
    queryKey: ['universes'],
    queryFn: async () => {
      const response = await fetch('/api/framework/universes');
      if (!response.ok) {
        throw new Error('Failed to fetch universes');
      }
      return response.json();
    }
  });
  console.log(universes);

  const { data: users = [], refetch } = useQuery({
    queryKey: ['register-user'],
    queryFn: async () => {
      console.log("**********")
      const response = await fetch('/api/admin_users');
      console.log('response', response);
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    }
  });
  console.log("user",users);
    const { data: userrole = [], isLoading: loadingUsers } = useQuery({
      queryKey: ['user-roles'],
      queryFn: async () => {
        const res = await fetch('/api/framework/user-roles');
        if (!res.ok) throw new Error('Failed to fetch user roles');
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      }
    });
  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof userSchema>) => {
      const response = await fetch('/api/admin_users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create user: ${errorText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['register-user'] });
      refetch();
      setIsCreateDialogOpen(false);
      createUserForm.reset();
      toast.success('User created successfully');
    },
    onError: (error) => {
      toast.error('Duplicate User');
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({
      userId,
      data
    }: {
      userId: number; // Assuming your backend uses numeric IDs
      data: z.infer<typeof userSchema>;
    }) => {
      console.log('Calling update API for userId:', userId, 'payload:', data);

      const res = await fetch(`/api/admin_users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        // Attempt to parse JSON error if available
        let errorMessage = `Failed to update user ${userId}`;
        try {
          const errData = await res.json();
          if (errData?.error) errorMessage = errData.error;
        } catch {
          // fallback to text if JSON fails
          const text = await res.text().catch(() => '');
          if (text) errorMessage = text;
        }

        console.error('Update failed:', res.status, errorMessage);
        throw new Error(errorMessage);
      }

      return res.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['register-user'] });
      refetch(); // Make sure refetch is defined in your component
      setIsEditDialogOpen(false);
      setEditingUser(null);
      toast.success('User updated successfully');
    },

    onError: (error: unknown) => {
      toast.error('Duplicate User');
    }
  });

  const isUpdating = updateUserMutation.status === 'pending';

  // Delete user mutation

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/admin_users/${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || 'Failed to delete user from Azure SQL Server');
      }

      try {
        return await response.json(); // Most DELETE responses are empty, so fallback is good
      } catch {
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['register-user'] });
      refetch();
      toast.success('User deleted Successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete user');
    }
  });

  const handleDeleteUser = (userId: number, username: string) => {
    deleteUserMutation.mutate(userId);
  };

  const handleEditUser = (user: any) => {
    // Set the editingUser for submit
    setEditingUser(user);

    const formatDate = (dateStr: string | null | undefined) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
    };

    const formatDateTime = (dateStr: string | null | undefined) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 16); // for datetime-local
    };

    const safeNumber = (value: any) => {
      const n = Number(value);
      return isNaN(n) ? 0 : n;
    };

    const numToStr = (value: number | string | null | undefined) =>
      value != null ? value.toString() : '';

    editUserForm.reset({
      UserID: user.UserID, // <-- important!
      UniverseID: numToStr(user.UniverseID),
      Username: user.Username || '',
      UserType: user.UserType || '',
      Email: user.Email || '',
      PasswordHash: user.PasswordHash || '',
      PrimaryRole: user.PrimaryRole || '',
      RoleTags: user.RoleTags || '',
      Department: user.Department || '',
      Designation: user.Designation || '',
      FirstName: user.FirstName || '',
      LastName: user.LastName || '',
      DisplayName: user.DisplayName || '',
      Gender: user.Gender || '',
      DateOfBirth: formatDate(user.DateOfBirth),
      PhoneNumber: user.PhoneNumber || '',
      AlternatePhone: user.AlternatePhone || '',
      AddressLine1: user.AddressLine1 || '',
      AddressLine2: user.AddressLine2 || '',
      City: user.City || '',
      State: user.State || '',
      Country: user.Country || '',
      PostalCode: user.PostalCode || '',
      AuthType: user.AuthType || 'Local',
      ExternalAuthProvider: user.ExternalAuthProvider || '',
      ExternalAuthID: user.ExternalAuthID || '',
      AuthMetadata: user.AuthMetadata || '',
      IsSupervisor: Boolean(user.IsSupervisor),
      IsManager: Boolean(user.IsManager),
      ManagementLevel: user.ManagementLevel || '',
      SupervisorUserID: numToStr(user.SupervisorUserID),
      ManagerUserID: numToStr(user.ManagerUserID),
      DirectReportsCount: safeNumber(user.DirectReportsCount),
      IsDelegated: Boolean(user.IsDelegated),
      DelegatedToUserID: numToStr(user.DelegatedToUserID),
      DelegatedByUserID: numToStr(user.DelegatedByUserID),
      DelegationStartDate: formatDateTime(user.DelegationStartDate),
      DelegationEndDate: formatDateTime(user.DelegationEndDate),
      DelegationReason: user.DelegationReason || '',
      HireDate: formatDate(user.HireDate),
      TerminationDate: formatDate(user.TerminationDate),
      EmploymentType: user.EmploymentType || '',
      EmploymentStatus: user.EmploymentStatus || '',
      LastLoginAt: formatDateTime(user.LastLoginAt),
      IsActive: Boolean(user.IsActive),
      IsDeleted: Boolean(user.IsDeleted)
    });

    setIsEditDialogOpen(true);
  };

  const onSubmit = (data: z.infer<typeof userSchema>) => {
    createUserMutation.mutate(data);
  };

  const onUpdateSubmit = (data: z.infer<typeof userSchema>) => {
    if (!editingUser) {
      toast.error('No user selected');
      return;
    }

    const userId = editingUser.UserID ?? editingUser.id ?? editingUser.ID;
    if (!userId) {
      toast.error('Missing UserID');
      return;
    }

    const payload = { ...data };
    if (!payload.PasswordHash || payload.PasswordHash.trim() === '') {
      delete payload.PasswordHash;
    }

    updateUserMutation.mutate({ userId: Number(userId), data: payload });
  };

  useEffect(() => {
    const allRoles = users.flatMap((user: User) => {
      if (!user.RoleTags) return [];
      return user.RoleTags.split(',').map((role) => role.trim());
    });

    const uniqueRoles: string[] = Array.from(new Set(allRoles));
    setRoles(uniqueRoles);
  }, [users]);

  useEffect(() => {
    if (!users || users.length === 0) {
      setFilteredUsers([]);
      return;
    }

    const filtered = users.filter((user: User) => {
      const roleTags = user.RoleTags ?? '';
      const fullName = user.FullName ?? '';
      const username = user.Username ?? '';
      const email = user.Email ?? '';
      const term = searchTerm.toLowerCase();

      const roleMatch =
        roleFilter === 'all' || roleTags.toLowerCase().includes(roleFilter.toLowerCase());

      const searchMatch =
        fullName.toLowerCase().includes(term) ||
        username.toLowerCase().includes(term) ||
        email.toLowerCase().includes(term);

      return roleMatch && searchMatch;
    });

    setFilteredUsers(filtered);
  }, [users, roleFilter, searchTerm]);

  /* -------- Donut -------- */
  const Total_tables: number[] = [
    users.length, // Total Users
    users.filter((u: any) => u.IsActive === true).length, // Active Users
    users.filter((u: any) => u.RoleTags?.toLowerCase().includes('admin')).length // Admins
  ];

  const labels: string[] = ['Total Users', 'Active Users', 'Admins'];
  const colors: string[] = ['var(--tw-primary)', 'var(--tw-brand)', 'var(--tw-success)'];
  const options: ApexOptions = {
    series: Total_tables,
    labels: labels,
    colors: colors,
    fill: {
      colors: colors
    },
    chart: {
      type: 'donut'
    },
    stroke: {
      show: true,
      width: 2
    },
    dataLabels: {
      enabled: false
    },
    plotOptions: {
      pie: {
        expandOnClick: false
      }
    },
    legend: {
      offsetY: -10,
      offsetX: -10,
      fontSize: '13px',
      fontWeight: '500',
      itemMargin: {
        vertical: 1
      },
      labels: {
        colors: 'var(--tw-gray-700)',
        useSeriesColors: false
      }
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: {
            width: 200
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    ]
  };

  const userColumns: Column<any>[] = [
    { key: 'UserID', label: 'User ID' },
    { key: 'UniverseID', label: 'Universe ID' },
    { key: 'UserType', label: 'User Type' },
    { key: 'Username', label: 'Username' },
    { key: 'Email', label: 'Email' },
    { key: 'PrimaryRole', label: 'Primary Role' },
    { key: 'RoleTags', label: 'Role Tags' },
    { key: 'Department', label: 'Department' },
    { key: 'Designation', label: 'Designation' },
    { key: 'FirstName', label: 'First Name' },
    { key: 'LastName', label: 'Last Name' },
    { key: 'DisplayName', label: 'Display Name' },
    { key: 'Gender', label: 'Gender' },

    {
      key: 'DateOfBirth',
      label: 'Date of Birth',
      render: (row) => (row.DateOfBirth ? dayjs(row.DateOfBirth).format('DD/MM/YYYY') : 'N/A')
    },

    { key: 'PhoneNumber', label: 'Phone Number' },
    { key: 'AlternatePhone', label: 'Alt Phone' },
    { key: 'AddressLine1', label: 'Address Line 1' },
    { key: 'AddressLine2', label: 'Address Line 2' },
    { key: 'City', label: 'City' },
    { key: 'State', label: 'State' },
    { key: 'Country', label: 'Country' },
    { key: 'PostalCode', label: 'Postal Code' },
    { key: 'AuthType', label: 'Auth Type' },

    {
      key: 'PasswordUpdatedAt',
      label: 'Password Updated',
      render: (row) =>
        row.PasswordUpdatedAt ? new Date(row.PasswordUpdatedAt).toLocaleString() : 'N/A'
    },

    { key: 'ExternalAuthProvider', label: 'External Provider' },
    { key: 'ExternalAuthID', label: 'External Auth ID' },
    { key: 'AuthMetadata', label: 'Auth Metadata' },

    {
      key: 'IsSupervisor',
      label: 'Supervisor',
      render: (row) => (row.IsSupervisor ? 'Yes' : 'No')
    },

    {
      key: 'IsManager',
      label: 'Manager',
      render: (row) => (row.IsManager ? 'Yes' : 'No')
    },

    { key: 'ManagementLevel', label: 'Management Level' },

    { key: 'SupervisorUserID', label: 'Supervisor ID' },
    { key: 'ManagerUserID', label: 'Manager ID' },
    { key: 'DirectReportsCount', label: 'Reports Count' },

    {
      key: 'IsDelegated',
      label: 'Delegated?',
      render: (row) => (row.IsDelegated ? 'Yes' : 'No')
    },

    { key: 'DelegatedToUserID', label: 'Delegated To' },
    { key: 'DelegatedByUserID', label: 'Delegated By' },

    {
      key: 'DelegationStartDate',
      label: 'Delegation Start',
      render: (row) =>
        row.DelegationStartDate ? dayjs(row.DelegationStartDate).format('DD/MM/YYYY') : 'N/A'
    },

    {
      key: 'DelegationEndDate',
      label: 'Delegation End',
      render: (row) =>
        row.DelegationEndDate ? dayjs(row.DelegationEndDate).format('DD/MM/YYYY') : 'N/A'
    },

    { key: 'DelegationReason', label: 'Reason' },

    { key: 'EmploymentType', label: 'Employment Type' },
    { key: 'EmploymentStatus', label: 'Employment Status' },

    {
      key: 'HireDate',
      label: 'Hire Date',
      render: (row) => (row.HireDate ? dayjs(row.HireDate).format('DD-MM-YYYY') : 'N/A')
    },

    {
      key: 'TerminationDate',
      label: 'Termination Date',
      render: (row) =>
        row.TerminationDate ? dayjs(row.TerminationDate).format('DD/MM/YYYY') : 'N/A'
    },

    {
      key: 'LastLoginAt',
      label: 'Last Login',
      render: (row) =>
        row.LastLoginAt
          ? dayjs.utc(row.LastLoginAt).tz('Asia/Kolkata').format('DD-MM-YYYY hh:mm A')
          : 'N/A'
    },

    {
      key: 'IsDeleted',
      label: 'Deleted?',
      render: (row) => (row.IsDeleted ? 'Yes' : 'No')
    },

    { key: 'CreatedBy', label: 'Created By' },

    {
      key: 'CreatedAt',
      label: 'Created At',
      render: (row) => (row.CreatedAt ? new Date(row.CreatedAt).toLocaleString() : 'N/A')
    },

    { key: 'UpdatedBy', label: 'Updated By' },

    {
      key: 'UpdatedAt',
      label: 'Updated At',
      render: (row) => (row.UpdatedAt ? new Date(row.UpdatedAt).toLocaleString() : 'N/A')
    },
    {
      key: 'IsActive',
      label: 'Status',
      render: (row) => (
        <span
          className={`px-2 py-1 rounded-full ${
            row.IsActive ? 'bg-success text-white' : 'bg-danger text-white'
          }`}
        >
          {row.IsActive ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ];

  return (
    <div className="w-full p-6 space-y-6 card ">
      <div>
        <h2 className="text-2xl font-bold dark:text-white">User Management</h2>
        <p className="text-md text-gray-500 dark:text-gray-700">
          Manage users and employees with Azure SQL Server stored procedures
        </p>
      </div>
      <div className="p-4 pb-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4 gap-6">
        <div className="card flex justify-center gap-3 text-white">
          <div className="flex justify-center px-3">
            <ApexChart
              id="contributions_chart"
              options={options}
              series={options.series}
              type="donut"
              height="100"
            />
          </div>
        </div>
        <div className="card p-5 md:p-6 text-white bg-primary shadow-sm ">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-white/20">
              <i className="ki-solid ki-user text-3xl font-bold"></i>
            </div>
            <div>
              <div className="text-4xl font-bold leading-none">{users.length}</div>
              <div className="text-xl opacity-95 font-bold">Total Users</div>
            </div>
          </div>
        </div>
        <div className="card p-5 md:p-6 text-white bg-success shadow-sm ">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-white/20">
              <i className="ki-solid ki-user-tick text-3xl font-bold"></i>
            </div>
            <div>
              <div className="text-4xl font-bold leading-none">
                {users.filter((u: any) => u.IsActive === true).length}
              </div>
              <div className="text-xl font-bold opacity-95">Active Users</div>
            </div>
          </div>
        </div>
        <div className="card p-5 md:p-6 text-white bg-[#BF55EC] shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-white/20">
              <i className="ki-solid ki-user-square text-3xl "></i>
            </div>
            <div>
              <div className="text-4xl font-bold leading-none">
                {/* {users.filter((u: any) => u.RoleTags?.includes('admin')).length} */}
                {users.filter((u: any) => u.RoleTags?.toLowerCase().includes('admin')).length}
              </div>
              <div className="text-xl font-bold opacity-95">Admins</div>
            </div>
          </div>
        </div>
      </div>
      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center  p-6">
          <div
            className="fixed inset-0 bg-black/60 dark:bg-white/30"
            onClick={() => setIsCreateDialogOpen(false)}
          />
          <div className="bg-white dark:bg-black dark:text-white rounded shadow-2xl w-full lg:w-3/4 xl:w-2/4 z-10 p-5 h-full h:3/4 scrollable-y">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Add New User</h3>
              <button
                className="btn btn-outline btn-danger"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                <i className="ki-filled ki-cross"></i>
              </button>
            </div>
            <form
              {...createUserForm}
              onSubmit={createUserForm.handleSubmit(onSubmit)}
              className="space-y-4 mt-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Controller
                  control={createUserForm.control}
                  name="UniverseID"
                  render={({ field }) => (
                    <div className="flex flex-col">
                      <span className="text-md font-semibold mb-1">Universe ID</span>

                      <Select
                        value={field.value ? field.value.toString() : undefined}
                        disabled={universesLoading}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="input mt-1">
                          <SelectValue placeholder="Select a universe" />
                        </SelectTrigger>

                        <SelectContent className="bg-white dark:bg-black dark:text-white">
                          {universes.map((u: Universe, index: number) => (
                            <SelectItem key={u.UniverseID} value={u.UniverseID.toString()}>
                              {u.UniverseName || `Universe ${index + 1}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
                <label className="flex flex-col">
                  <span className="text-md font-semibold">User Type *</span>
                  <Controller
                    name="UserType"
                    control={createUserForm.control}
                    render={({ field }) => (
                      <input
                        className="input mt-1"
                        placeholder="Employee / Contractor"
                        {...field}
                      />
                    )}
                  />
                </label>
                <label className="flex flex-col">
                  <span className="text-md font-semibold">Username *</span>
                  <Controller
                    control={createUserForm.control}
                    name="Username"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="johndoe" {...field} />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Email *</span>

                  <Controller
                    control={createUserForm.control}
                    name="Email"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="john@example.com" {...field} />
                    )}
                  />
                </label>
                <Controller
                  control={createUserForm.control}
                  name="PrimaryRole"
                  render={({ field }) => (
                    <div className="flex flex-col">
                      <span className="text-md font-semibold mb-1">Primary Role</span>

                      <Select
                        value={field.value ? field.value : undefined}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="input mt-1">
                          <SelectValue placeholder="Select primary role" />
                        </SelectTrigger>

                        <SelectContent className="bg-white dark:bg-black dark:text-white">
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Business Admin">Business Admin</SelectItem>
                          <SelectItem value="Employee">Employee</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
                <label className="flex flex-col">
                  <span className="text-md font-semibold">Roles Tags *</span>
                  <Controller
                    control={createUserForm.control}
                    name="RoleTags"
                    render={({ field }) => (
                      <input
                        className="input mt-1"
                        placeholder='["Editor", "Reviewer"]'
                        {...field}
                      />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Department</span>
                  <Controller
                    control={createUserForm.control}
                    name="Department"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="Finance / HR / IT" {...field} />
                    )}
                  />
                </label>
                <label className="flex flex-col">
                  <span className="text-md font-semibold">Designation</span>

                  <Controller
                    control={createUserForm.control}
                    name="Designation"
                    render={({ field }) => (
                      <input
                        placeholder="Senior Analyst / Manager"
                        {...field}
                        className="input mt-1"
                      />
                    )}
                  />
                </label>
                <label className="flex flex-col">
                  <span className="text-md font-semibold">First Name</span>
                  <Controller
                    control={createUserForm.control}
                    name="FirstName"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="Enter first name" {...field} />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Last Name</span>

                  <Controller
                    control={createUserForm.control}
                    name="LastName"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="Enter last name" {...field} />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Display Name *</span>

                  <Controller
                    control={createUserForm.control}
                    name="DisplayName"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="Enter display name" {...field} />
                    )}
                  />
                </label>

                <Controller
                  control={createUserForm.control}
                  name="Gender"
                  render={({ field }) => (
                    <div className="flex flex-col">
                      <span className="text-md font-semibold mb-1">Gender</span>

                      <Select
                        value={field.value ? field.value : undefined}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="input mt-1">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>

                        <SelectContent className="bg-white dark:bg-black dark:text-white">
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
                <label className="flex flex-col">
                  <span className="text-md font-semibold">Date of Birth</span>

                  <Controller
                    control={createUserForm.control}
                    name="DateOfBirth"
                    render={({ field }) => (
                      <input
                        className="input mt-1"
                        placeholder="Enter your Date of Birth"
                        type="date"
                        {...field}
                      />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Phone Number</span>

                  <Controller
                    control={createUserForm.control}
                    name="PhoneNumber"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="+91 9876543210" {...field} />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Alternate Phone</span>

                  <Controller
                    control={createUserForm.control}
                    name="AlternatePhone"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="+91 9999999999" {...field} />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Address Line 1</span>
                  <Controller
                    control={createUserForm.control}
                    name="AddressLine1"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="Street, Area" {...field} />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Address Line 2</span>

                  <Controller
                    control={createUserForm.control}
                    name="AddressLine2"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="Apartment, Landmark" />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">City</span>

                  <Controller
                    control={createUserForm.control}
                    name="City"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="City" {...field} />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">State</span>

                  <Controller
                    control={createUserForm.control}
                    name="State"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="State" {...field} />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Country</span>

                  <Controller
                    control={createUserForm.control}
                    name="Country"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="Country" {...field} />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Postal Code</span>

                  <Controller
                    control={createUserForm.control}
                    name="PostalCode"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="ZIP / PIN Code" {...field} />
                    )}
                  />
                </label>

                <Controller
                  control={createUserForm.control}
                  name="AuthType"
                  render={({ field }) => (
                    <div className="flex flex-col">
                      <span className="text-md font-semibold mb-1">Authentication Type</span>

                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="input mt-1">
                          <SelectValue placeholder="Select Auth Type" />
                        </SelectTrigger>

                        <SelectContent className="bg-white dark:bg-black dark:text-white">
                          <SelectItem value="Local">Local</SelectItem>
                          <SelectItem value="SSO">SSO</SelectItem>
                          <SelectItem value="OAuth">OAuth</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
                <label className="flex flex-col">
                  <span className="text-md font-semibold">Password</span>

                  <Controller
                    control={createUserForm.control}
                    name="PasswordHash"
                    render={({ field }) => (
                      <input
                        className="input mt-1"
                        type="password"
                        placeholder="Enter password"
                        {...field}
                      />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Password Updated At</span>

                  <Controller
                    control={createUserForm.control}
                    name="PasswordUpdatedAt"
                    render={({ field }) => (
                      <input type="datetime-local" className="input mt-1" {...field} />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">External Auth Provider</span>

                  <Controller
                    control={createUserForm.control}
                    name="ExternalAuthProvider"
                    render={({ field }) => (
                      <input
                        className="input mt-1"
                        placeholder="Google / AzureAD / Okta"
                        {...field}
                      />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">External Auth ID</span>

                  <Controller
                    control={createUserForm.control}
                    name="ExternalAuthID"
                    render={({ field }) => (
                      <input placeholder="External User ID" className="input mt-1" {...field} />
                    )}
                  />
                </label>

                <Controller
                  control={createUserForm.control}
                  name="IsSupervisor"
                  render={({ field }) => (
                    <div className="flex flex-col">
                      <span className="text-md font-semibold mb-1">Is Supervisor?</span>

                      <Select
                        onValueChange={(val) => field.onChange(val === 'true')}
                        value={field.value ? 'true' : 'false'}
                      >
                        <SelectTrigger className="input mt-1">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>

                        <SelectContent className="bg-white dark:bg-black dark:text-white">
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />

                <Controller
                  control={createUserForm.control}
                  name="IsManager"
                  render={({ field }) => (
                    <div className="flex flex-col">
                      <span className="text-md font-semibold mb-1">Is Manager?</span>

                      <Select
                        onValueChange={(val) => field.onChange(val === 'true')}
                        value={field.value ? 'true' : 'false'}
                      >
                        <SelectTrigger className="input mt-1">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>

                        <SelectContent className="bg-white dark:bg-black dark:text-white">
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Management Level</span>

                  <Controller
                    control={createUserForm.control}
                    name="ManagementLevel"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="L1 / L2 / L3" {...field} />
                    )}
                  />
                </label>

                <Controller
                  control={createUserForm.control}
                  name="IsDelegated"
                  render={({ field }) => (
                    <div className="flex flex-col">
                      <span className="text-md font-semibold mb-1">Is Delegated?</span>

                      <Select
                        onValueChange={(val) => field.onChange(val === 'true')}
                        value={field.value ? 'true' : 'false'}
                      >
                        <SelectTrigger className="input mt-1">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>

                        <SelectContent className="bg-white dark:bg-black dark:text-white">
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Delegation Reason</span>

                  <Controller
                    control={createUserForm.control}
                    name="DelegationReason"
                    render={({ field }) => (
                      <input
                        className="input mt-1"
                        placeholder="On leave / Backup assignment"
                        {...field}
                      />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Hire Date</span>

                  <Controller
                    control={createUserForm.control}
                    name="HireDate"
                    render={({ field }) => (
                      <input
                        className="input mt-1"
                        type="date"
                        placeholder="Choose Hire Date"
                        {...field}
                      />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Termination Date</span>

                  <Controller
                    control={createUserForm.control}
                    name="TerminationDate"
                    render={({ field }) => (
                      <input
                        className="input mt-1"
                        type="date"
                        placeholder="Choose Termination Date"
                        {...field}
                      />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Authentication Metadata (JSON)</span>

                  <Controller
                    control={createUserForm.control}
                    name="AuthMetadata"
                    render={({ field }) => (
                      <textarea
                        className="textarea mt-1"
                        rows={3}
                        placeholder='{"token": "...", "claims": "..."}'
                        {...field}
                      />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Supervisor User ID</span>

                  <Controller
                    control={createUserForm.control}
                    name="SupervisorUserID"
                    render={({ field }) => (
                      <input
                        className="input mt-1"
                        placeholder="Enter Supervisor User ID"
                        {...field}
                      />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Manager User ID</span>
                  <Controller
                    control={createUserForm.control}
                    name="ManagerUserID"
                    render={({ field }) => (
                      <input
                        className="input mt-1"
                        placeholder="Enter Manager User ID"
                        {...field}
                      />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Direct Reports Count</span>
                  <Controller
                    control={createUserForm.control}
                    name="DirectReportsCount"
                    render={({ field }) => (
                      <input
                        className="input mt-1"
                        type="number"
                        placeholder="Enter number of direct reports"
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Delegated To User ID</span>

                  <Controller
                    control={createUserForm.control}
                    name="DelegatedByUserID"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="Enter User ID" {...field} />
                    )}
                  />
                </label>
                <label className="flex flex-col">
                  <span className="text-md font-semibold">Delegated By User ID</span>

                  <Controller
                    control={createUserForm.control}
                    name="DelegatedByUserID"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="Enter User ID" {...field} />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Delegation Start Date</span>

                  <Controller
                    control={createUserForm.control}
                    name="DelegationStartDate"
                    render={({ field }) => (
                      <input className="input mt-1" type="datetime-local" {...field} />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Delegation End Date</span>
                  <Controller
                    control={createUserForm.control}
                    name="DelegationEndDate"
                    render={({ field }) => (
                      <input type="datetime-local" className="input mt-1" {...field} />
                    )}
                  />
                </label>

                <Controller
                  control={createUserForm.control}
                  name="EmploymentType"
                  render={({ field }) => (
                    <div className="flex flex-col">
                      <span className="text-md font-semibold mb-1">Employment Type</span>

                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="input mt-1">
                          <SelectValue placeholder="Select Type" />
                        </SelectTrigger>

                        <SelectContent className="bg-white dark:bg-black dark:text-white">
                          <SelectItem value="FullTime">Full Time</SelectItem>
                          <SelectItem value="PartTime">Part Time</SelectItem>
                          <SelectItem value="Contract">Contract</SelectItem>
                          <SelectItem value="Intern">Intern</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />

                <Controller
                  control={createUserForm.control}
                  name="EmploymentStatus"
                  render={({ field }) => (
                    <div className="flex flex-col">
                      <span className="text-md font-semibold mb-1">Employment Status</span>

                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="input mt-1">
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>

                        <SelectContent className="bg-white dark:bg-black dark:text-white">
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                          <SelectItem value="OnLeave">On Leave</SelectItem>
                          <SelectItem value="Terminated">Terminated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Last Login At</span>
                  <Controller
                    control={createUserForm.control}
                    name="LastLoginAt"
                    render={({ field }) => (
                      <input className="input mt-1" type="datetime-local" {...field} />
                    )}
                  />
                </label>

                <div className="flex items-center justify-between border p-3 rounded-md gap-3">
                  <span className="text-md font-semibold ">Active</span>

                  <Controller
                    control={createUserForm.control}
                    name="IsActive"
                    render={({ field }) => (
                      <label className="switch mb-0">
                        <input
                          type="checkbox"
                          checked={field.value || false}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      </label>
                    )}
                  />
                </div>
                <div className="flex items-center justify-between border p-3 rounded-md gap-3">
                  <span className="text-md font-semibold ">Deleted</span>

                  <Controller
                    control={createUserForm.control}
                    name="IsDeleted"
                    render={({ field }) => (
                      <label className="switch mb-0">
                        <input
                          type="checkbox"
                          checked={field.value || false}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      </label>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline btn-secondary px-4 py-2 text-md"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-outline btn-primary px-4 py-2 text-md"
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? 'Creating User...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center  p-6">
          <div
            className="fixed inset-0 bg-black/60 dark:bg-white/30"
            onClick={() => setIsEditDialogOpen(false)}
          />
          <div className="bg-white dark:bg-black dark:text-white rounded shadow-2xl w-full lg:w-3/4 xl:w-2/4 z-10 p-5 h-full h:3/4 scrollable-y">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Edit User</h3>
              <button
                className="btn btn-outline btn-danger"
                onClick={() => setIsEditDialogOpen(false)}
              >
                <i className="ki-filled ki-cross"></i>
              </button>
            </div>
            <form
              {...editUserForm}
              onSubmit={(e) => {
                e.preventDefault();
                editUserForm.handleSubmit(onUpdateSubmit, (errors) => {
                  console.log('Validation errors:', errors);
                })();
              }}
              className="space-y-4 mt-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Controller
                  control={editUserForm.control}
                  name="UniverseID"
                  render={({ field }) => (
                    <div className="flex flex-col">
                      <span className="text-md font-semibold mb-1">Universe ID</span>

                      <Select
                        value={field.value ? field.value.toString() : undefined}
                        disabled={universesLoading}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="input mt-1">
                          <SelectValue placeholder="Select a universe" />
                        </SelectTrigger>

                        <SelectContent className="bg-white dark:bg-black dark:text-white">
                          {universes.map((u: Universe, index: number) => (
                            <SelectItem key={u.UniverseID} value={u.UniverseID.toString()}>
                              {u.UniverseName || `Universe ${index + 1}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
                <label className="flex flex-col">
                  <span className="text-md font-semibold">User Type *</span>
                  <Controller
                    name="UserType"
                    control={editUserForm.control}
                    render={({ field }) => (
                      <input
                        className="input mt-1"
                        placeholder="Employee / Contractor"
                        {...field}
                      />
                    )}
                  />
                </label>
                <label className="flex flex-col">
                  <span className="text-md font-semibold">Username *</span>
                  <Controller
                    control={editUserForm.control}
                    name="Username"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="johndoe" {...field} />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Email *</span>

                  <Controller
                    control={editUserForm.control}
                    name="Email"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="john@example.com" {...field} />
                    )}
                  />
                </label>
                <Controller
                  control={editUserForm.control}
                  name="PrimaryRole"
                  render={({ field }) => (
                    <div className="flex flex-col">
                      <span className="text-md font-semibold mb-1">Primary Role</span>

                      <Select
                        value={field.value ? field.value : undefined}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="input mt-1">
                          <SelectValue placeholder="Select primary role" />
                        </SelectTrigger>

                        <SelectContent className="bg-white dark:bg-black dark:text-white">
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Business Admin">Business Admin</SelectItem>
                          <SelectItem value="Employee">Employee</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
                <label className="flex flex-col">
                  <span className="text-md font-semibold">Roles Tags *</span>
                  <Controller
                    control={editUserForm.control}
                    name="RoleTags"
                    render={({ field }) => (
                      <input
                        className="input mt-1"
                        placeholder='["Editor", "Reviewer"]'
                        {...field}
                      />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Department</span>
                  <Controller
                    control={editUserForm.control}
                    name="Department"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="Finance / HR / IT" {...field} />
                    )}
                  />
                </label>
                <label className="flex flex-col">
                  <span className="text-md font-semibold">Designation</span>

                  <Controller
                    control={editUserForm.control}
                    name="Designation"
                    render={({ field }) => (
                      <input
                        placeholder="Senior Analyst / Manager"
                        {...field}
                        className="input mt-1"
                      />
                    )}
                  />
                </label>
                <label className="flex flex-col">
                  <span className="text-md font-semibold">First Name</span>
                  <Controller
                    control={editUserForm.control}
                    name="FirstName"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="Enter first name" {...field} />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Last Name</span>

                  <Controller
                    control={editUserForm.control}
                    name="LastName"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="Enter last name" {...field} />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Display Name *</span>

                  <Controller
                    control={editUserForm.control}
                    name="DisplayName"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="Enter display name" {...field} />
                    )}
                  />
                </label>

                <Controller
                  control={editUserForm.control}
                  name="Gender"
                  render={({ field }) => (
                    <div className="flex flex-col">
                      <span className="text-md font-semibold mb-1">Gender</span>

                      <Select
                        value={field.value ? field.value : undefined}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="input mt-1">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>

                        <SelectContent className="bg-white dark:bg-black dark:text-white">
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
                <label className="flex flex-col">
                  <span className="text-md font-semibold">Date of Birth</span>

                  <Controller
                    control={editUserForm.control}
                    name="DateOfBirth"
                    render={({ field }) => (
                      <input
                        className="input mt-1"
                        placeholder="Enter your Date of Birth"
                        type="date"
                        {...field}
                      />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Phone Number</span>

                  <Controller
                    control={editUserForm.control}
                    name="PhoneNumber"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="+91 9876543210" {...field} />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Alternate Phone</span>

                  <Controller
                    control={editUserForm.control}
                    name="AlternatePhone"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="+91 9999999999" {...field} />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Address Line 1</span>
                  <Controller
                    control={editUserForm.control}
                    name="AddressLine1"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="Street, Area" {...field} />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Address Line 2</span>

                  <Controller
                    control={editUserForm.control}
                    name="AddressLine2"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="Apartment, Landmark" />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">City</span>

                  <Controller
                    control={editUserForm.control}
                    name="City"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="City" {...field} />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">State</span>

                  <Controller
                    control={editUserForm.control}
                    name="State"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="State" {...field} />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Country</span>

                  <Controller
                    control={editUserForm.control}
                    name="Country"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="Country" {...field} />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Postal Code</span>

                  <Controller
                    control={editUserForm.control}
                    name="PostalCode"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="ZIP / PIN Code" {...field} />
                    )}
                  />
                </label>

                <Controller
                  control={editUserForm.control}
                  name="AuthType"
                  render={({ field }) => (
                    <div className="flex flex-col">
                      <span className="text-md font-semibold mb-1">Authentication Type</span>

                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="input mt-1">
                          <SelectValue placeholder="Select Auth Type" />
                        </SelectTrigger>

                        <SelectContent className="bg-white dark:bg-black dark:text-white">
                          <SelectItem value="Local">Local</SelectItem>
                          <SelectItem value="SSO">SSO</SelectItem>
                          <SelectItem value="OAuth">OAuth</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
                <label className="flex flex-col">
                  <span className="text-md font-semibold">Password</span>

                  <Controller
                    control={editUserForm.control}
                    name="PasswordHash"
                    render={({ field }) => (
                      <input
                        className="input mt-1"
                        type="password"
                        placeholder="Enter password"
                        {...field}
                      />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Password Updated At</span>

                  <Controller
                    control={editUserForm.control}
                    name="PasswordUpdatedAt"
                    render={({ field }) => (
                      <input type="datetime-local" className="input mt-1" {...field} />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">External Auth Provider</span>

                  <Controller
                    control={editUserForm.control}
                    name="ExternalAuthProvider"
                    render={({ field }) => (
                      <input
                        className="input mt-1"
                        placeholder="Google / AzureAD / Okta"
                        {...field}
                      />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">External Auth ID</span>

                  <Controller
                    control={editUserForm.control}
                    name="ExternalAuthID"
                    render={({ field }) => (
                      <input placeholder="External User ID" className="input mt-1" {...field} />
                    )}
                  />
                </label>

                <Controller
                  control={editUserForm.control}
                  name="IsSupervisor"
                  render={({ field }) => (
                    <div className="flex flex-col">
                      <span className="text-md font-semibold mb-1">Is Supervisor?</span>

                      <Select
                        onValueChange={(val) => field.onChange(val === 'true')}
                        value={field.value ? 'true' : 'false'}
                      >
                        <SelectTrigger className="input mt-1">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>

                        <SelectContent className="bg-white dark:bg-black dark:text-white">
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />

                <Controller
                  control={editUserForm.control}
                  name="IsManager"
                  render={({ field }) => (
                    <div className="flex flex-col">
                      <span className="text-md font-semibold mb-1">Is Manager?</span>

                      <Select
                        onValueChange={(val) => field.onChange(val === 'true')}
                        value={field.value ? 'true' : 'false'}
                      >
                        <SelectTrigger className="input mt-1">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>

                        <SelectContent className="bg-white dark:bg-black dark:text-white">
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Management Level</span>

                  <Controller
                    control={editUserForm.control}
                    name="ManagementLevel"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="L1 / L2 / L3" {...field} />
                    )}
                  />
                </label>

                <Controller
                  control={editUserForm.control}
                  name="IsDelegated"
                  render={({ field }) => (
                    <div className="flex flex-col">
                      <span className="text-md font-semibold mb-1">Is Delegated?</span>

                      <Select
                        onValueChange={(val) => field.onChange(val === 'true')}
                        value={field.value ? 'true' : 'false'}
                      >
                        <SelectTrigger className="input mt-1">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>

                        <SelectContent className="bg-white dark:bg-black dark:text-white">
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Delegation Reason</span>

                  <Controller
                    control={editUserForm.control}
                    name="DelegationReason"
                    render={({ field }) => (
                      <input
                        className="input mt-1"
                        placeholder="On leave / Backup assignment"
                        {...field}
                      />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Hire Date</span>

                  <Controller
                    control={editUserForm.control}
                    name="HireDate"
                    render={({ field }) => (
                      <input
                        className="input mt-1"
                        type="date"
                        placeholder="Choose Hire Date"
                        {...field}
                      />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Termination Date</span>

                  <Controller
                    control={editUserForm.control}
                    name="TerminationDate"
                    render={({ field }) => (
                      <input
                        className="input mt-1"
                        type="date"
                        placeholder="Choose Termination Date"
                        {...field}
                      />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Authentication Metadata (JSON)</span>

                  <Controller
                    control={editUserForm.control}
                    name="AuthMetadata"
                    render={({ field }) => (
                      <textarea
                        className="textarea mt-1"
                        rows={3}
                        placeholder='{"token": "...", "claims": "..."}'
                        {...field}
                      />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Supervisor User ID</span>

                  <Controller
                    control={editUserForm.control}
                    name="SupervisorUserID"
                    render={({ field }) => (
                      <input
                        className="input mt-1"
                        placeholder="Enter Supervisor User ID"
                        {...field}
                      />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Manager User ID</span>
                  <Controller
                    control={editUserForm.control}
                    name="ManagerUserID"
                    render={({ field }) => (
                      <input
                        className="input mt-1"
                        placeholder="Enter Manager User ID"
                        {...field}
                      />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Direct Reports Count</span>
                  <Controller
                    control={editUserForm.control}
                    name="DirectReportsCount"
                    render={({ field }) => (
                      <input
                        className="input mt-1"
                        type="number"
                        placeholder="Enter number of direct reports"
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Delegated To User ID</span>

                  <Controller
                    control={editUserForm.control}
                    name="DelegatedByUserID"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="Enter User ID" {...field} />
                    )}
                  />
                </label>
                <label className="flex flex-col">
                  <span className="text-md font-semibold">Delegated By User ID</span>

                  <Controller
                    control={editUserForm.control}
                    name="DelegatedByUserID"
                    render={({ field }) => (
                      <input className="input mt-1" placeholder="Enter User ID" {...field} />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Delegation Start Date</span>

                  <Controller
                    control={editUserForm.control}
                    name="DelegationStartDate"
                    render={({ field }) => (
                      <input className="input mt-1" type="datetime-local" {...field} />
                    )}
                  />
                </label>

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Delegation End Date</span>
                  <Controller
                    control={editUserForm.control}
                    name="DelegationEndDate"
                    render={({ field }) => (
                      <input type="datetime-local" className="input mt-1" {...field} />
                    )}
                  />
                </label>

                <Controller
                  control={editUserForm.control}
                  name="EmploymentType"
                  render={({ field }) => (
                    <div className="flex flex-col">
                      <span className="text-md font-semibold mb-1">Employment Type</span>

                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="input mt-1">
                          <SelectValue placeholder="Select Type" />
                        </SelectTrigger>

                        <SelectContent className="bg-white dark:bg-black dark:text-white">
                          <SelectItem value="FullTime">Full Time</SelectItem>
                          <SelectItem value="PartTime">Part Time</SelectItem>
                          <SelectItem value="Contract">Contract</SelectItem>
                          <SelectItem value="Intern">Intern</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />

                <Controller
                  control={editUserForm.control}
                  name="EmploymentStatus"
                  render={({ field }) => (
                    <div className="flex flex-col">
                      <span className="text-md font-semibold mb-1">Employment Status</span>

                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="input mt-1">
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>

                        <SelectContent className="bg-white dark:bg-black dark:text-white">
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                          <SelectItem value="OnLeave">On Leave</SelectItem>
                          <SelectItem value="Terminated">Terminated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />

                <label className="flex flex-col">
                  <span className="text-md font-semibold">Last Login At</span>
                  <Controller
                    control={editUserForm.control}
                    name="LastLoginAt"
                    render={({ field }) => (
                      <input className="input mt-1" type="datetime-local" {...field} />
                    )}
                  />
                </label>

                <div className="flex items-center justify-between border p-3 rounded-md gap-3">
                  <span className="text-md font-semibold ">Active</span>

                  <Controller
                    control={editUserForm.control}
                    name="IsActive"
                    render={({ field }) => (
                      <label className="switch mb-0">
                        <input
                          type="checkbox"
                          checked={field.value || false}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      </label>
                    )}
                  />
                </div>
                <div className="flex items-center justify-between border p-3 rounded-md gap-3">
                  <span className="text-md font-semibold ">Deleted</span>

                  <Controller
                    control={editUserForm.control}
                    name="IsDeleted"
                    render={({ field }) => (
                      <label className="switch mb-0">
                        <input
                          type="checkbox"
                          checked={field.value || false}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      </label>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline btn-secondary px-4 py-2 text-md"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-outline btn-primary px-4 py-2 text-md"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Updating...' : 'Update User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="card p-5">
        <div className="flex gap-3 2xl:gap-10 justify-end md:justify-center md:gap-10 xl:justify-between">
          <div className="input input-md w-48 xl:flex-1 2xl:w-60 border hover:border-blue-400 border-blue-300 text-md">
            <i className="ki-filled ki-magnifier"></i>
            <input
              placeholder="Search Teams"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 2xl:gap-10">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="sm:size-sm w-32 2xl:w-60 btn-outline btn-primary border hover:border-blue-400">
                <SelectValue placeholder="Filter by Role" />
              </SelectTrigger>
              <SelectContent className="w-32 2xl:w-60 bg-white dark:text-white dark:bg-black">
                <SelectItem value="all">All Roles</SelectItem>

                {/* Dynamically load roles */}
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              className="btn btn-outline btn-primary text-base flex items-center gap-2"
              onClick={async () => {
                setTableLoading(true);

                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ['register-user'] }),
                  queryClient.invalidateQueries({ queryKey: ['universes'] })
                ]);

                setTimeout(() => {
                  setTableLoading(false);
                  toast.success('Users refreshed');
                }, 350);
              }}
            >
              <RefreshCw className={`h-5 w-5 ${tableLoading ? 'animate-spin' : ''}`} />
              {tableLoading ? 'Refreshing...' : 'Refresh'}
            </button>

            <button
              className="btn btn-primary btn-outline flex items-center gap-2 text-base"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-5 w-5" />
              Add New
            </button>
          </div>
        </div>
      </div>
      <div className="grid mt-6">
        <div className="card min-w-full p-5 pt-0">
          <div className="card-header">
            <h3 className="card-title">Framework Database Users ({filteredUsers.length})</h3>
          </div>
          <div className="card-table scrollable-x-auto">
            <DataTable
              data={filteredUsers}
              columns={userColumns}
              rowKey={(row: any) => row.UserID}
              onEdit={(row) => handleEditUser(row)}
              onDelete={(row) => handleDeleteUser(row.UserID, row.Username)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
