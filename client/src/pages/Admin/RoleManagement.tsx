import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useRole } from '../FrameworkFiles/RoleContext';
import DataTable from '../FrameworkComponent/DataTable';
import { KeenIcon } from '@/components';
// role schema
export const roleSchema = z.object({
  Assets: z.string().min(1, 'Asset is required').trim(),
  Role: z.string().min(1, 'Role is required'),
  Description: z.string().nullable().optional(),
  Permissions: z.array(z.string().min(1))
});

export type RoleFormData = z.infer<typeof roleSchema>;

type Asset = {
  AssetID: string;
  AssetName: string;
  AssetDescription: string;
  Created_At?: string;
  AssetType: string;
  AssetKey: string;
  PermissionLevel: string[];
};

interface Role {
  Id: number;
  AssetName: string; // selected asset name
  Role: string; // role name
  Description: string | null;
  Permissions: string[]; 
  CreatedAt?: string;
  UpdatedAt?: string;
}

type TabKey ='role-access' | 'access-logs';

type AccessLogEntry = {
  Timestamp: string;
  Role: string | null;
  Asset: string;
  Action: string;
  Status: 'Success' | 'Denied';
  IPAddress: string;
  Details: string;
};
interface Role {
  id: number;
  name: string; // display name
}

const RoleManagement= () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('role-access');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [allowedPermissions, setAllowedPermissions] = useState<string[]>([]);
  const [showLogPopup, setShowLogPopup] = useState(false);
  const [logPopupContent, setLogPopupContent] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { selectedRole } = useRole();
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState('today');
  const [actionFilter, setActionFilter] = useState('all');
  const [assetFilter, setAssetFilter] = useState('all');
  const {
    data: roles = [],
    isLoading: rolesLoading,
    isError: rolesError
  } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await fetch('/api/framework/permissionroles');
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch roles: ${errorText}`);
      }
      return res.json();
    }
  });
  console.log("yvdh",roles)
  const {
    data: fetchedLogs = [],
    isLoading: logsLoading,
    isError: logsError
  } = useQuery<AccessLogEntry[]>({
    queryKey: ['access-logs'],
    queryFn: async () => {
      const res = await fetch('/api/framework/log-access');
      if (!res.ok) throw new Error('Failed to fetch access logs');
      return res.json();
    }
  });

  const uniqueAssets = Array.from(new Set(fetchedLogs.map((log) => log.Asset))).filter(Boolean);

  const pageSize = 10;
  const filteredLogs = fetchedLogs.filter((log) => {
    const lowerSearch = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      log.Role?.toLowerCase().includes(lowerSearch) ||
      log.Asset?.toLowerCase().includes(lowerSearch) ||
      log.Action?.toLowerCase().includes(lowerSearch) ||
      log.IPAddress?.toLowerCase().includes(lowerSearch);

    const logDate = new Date(log.Timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const logDay = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());

    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = logDay.getTime() === today.getTime();
    } else if (dateFilter === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      matchesDate = logDay.getTime() === yesterday.getTime();
    } else if (dateFilter === 'week') {
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(today.getDate() - 7);
      matchesDate = logDay >= oneWeekAgo && logDay <= today;
    } else if (dateFilter === 'month') {
      const oneMonthAgo = new Date(today);
      oneMonthAgo.setMonth(today.getMonth() - 1);
      matchesDate = logDay >= oneMonthAgo && logDay <= today;
    }
    const matchesAction =
      actionFilter === 'all' || log.Action?.toLowerCase() === actionFilter.toLowerCase();

    const matchesAsset =
      assetFilter === 'all' || log.Asset?.toLowerCase() === assetFilter.toLowerCase();

    return matchesSearch && matchesDate && matchesAction && matchesAsset;
  });
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalAccess = fetchedLogs.length;
  const successfulAccess = fetchedLogs.filter((log) => log.Status === 'Success').length;
  const failedAccess = fetchedLogs.filter((log) => log.Status === 'Denied').length;
  const unauthorizedAccess = fetchedLogs.filter(
    (log) => log.Status === 'Denied' && log.Role === null
  ).length;
 
  useEffect(() => {
    if (selectedRole && roles.length > 0) {
      const matched = roles.find((r) => r.Role === selectedRole);
      const perms =
        typeof matched?.Permissions === 'string'
          ? (matched.Permissions as string).split(',').map((p: string) => p.trim())
          : Array.isArray(matched?.Permissions)
            ? matched.Permissions
            : [];
      setAllowedPermissions(perms);
    }
  }, [selectedRole, roles]);
  

  {
    !selectedRole && (
      <div className="text-center text-yellow-600 bg-yellow-50 border border-yellow-200 p-3 rounded">
        Please select a role in the header to activate permissions.
      </div>
    );
  }

  async function logAccess(log: AccessLogEntry) {
    try {
      await fetch('/api/framework/log-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log)
      });
    } catch (err) {
      console.error('Failed to log access:', err);
    }
  }

  // role form
  const roleForm = useForm<z.infer<typeof roleSchema>>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      Assets: '', // Matches schema
      Role: '',
      Description: '',
      Permissions: []
    }
  });
  const editRoleForm = useForm<z.infer<typeof roleSchema>>({
    defaultValues: {
      Role: '',
      Assets: '',
      Description: '',
      Permissions: [] as string[]
    }
  });

  const {
    data: assets = [],
    isLoading,
    error
  } = useQuery<Asset[]>({
    queryKey: ['assets'],
    queryFn: async () => {
      const res = await fetch('/api/framework/assets');
      if (!res.ok) throw new Error('Failed to fetch assets');
      const json = await res.json();
      return json as Asset[];
    }
  });
  console.log(assets);
 
  const createRoleMutation = useMutation<any, Error, RoleFormData>({
    mutationFn: async (data) => {
      const formattedData = {
        ...data,
        Role: data.Role,
        Permissions: data.Permissions.join(', ')
      }
      const response = await fetch('/api/framework/permissionroles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedData)
      });

      const text = await response.text();

      if (!response.ok) {
        try {
          const errorJson = JSON.parse(text);
          throw new Error(errorJson.error || 'Failed to create role');
        } catch {
          throw new Error(text || 'Failed to create role');
        }
      }

      return text ? JSON.parse(text) : null;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsCreateDialogOpen(false);
      roleForm.reset();
      toast.success('Role created successfully!');
    },
    onError: () => toast.error('Failed to create role')
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (data: any) => {
      const formattedData = {
        ...data,
        Role: Array.isArray(data.Role) ? data.Role.join(', ') : data.Role || '',
        Permissions: Array.isArray(data.Permissions)
          ? data.Permissions.join(', ')
          : data.Permissions || ''
      };

      console.log('Formatted Update Payload:', formattedData);
      console.log(data);
      console.log(data.Id);
      const response = await fetch(`/api/framework/permissionroles/${data.Id}`, {
        method: 'PUT', // Or 'POST' if you handle update via same SP
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update role');
      }

      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] }); // Refresh roles list
      setIsEditDialogOpen(false); // Close the dialog
      toast.success('Role updated successfully!');
    },

    onError: (error: any) => {
      toast.error('Failed to update role');
    }
  });
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      const response = await fetch(`/api/framework/permissionroles/${roleId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete role');
      }

      return await response.json();
    },

    onSuccess: (data) => {
      toast.success('Role deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['roles'] }); // Refresh table
    },

    onError: (error: any) => {
      toast.error('Failed to delete role');
    }
  });

  // filter
  const filteredRoles = roles.filter((role: Role) => {
    const lowerSearch = searchTerm.toLowerCase();
    // Normalize permissions to a string whether it's stored as an array or a string
    const permsString = Array.isArray(role.Permissions)
      ? role.Permissions.join(',')
      : (role.Permissions ?? '');

    return (
      role.Role?.toLowerCase().includes(lowerSearch) ||
      role.Description?.toLowerCase().includes(lowerSearch) ||
      permsString.toLowerCase().includes(lowerSearch)
    );
  });

  // export
  const exportToExcel = (data: object[], filename: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Roles');

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `${filename}.xlsx`);
  };

  const handleASsestLogExport = () => {
    const exportData = filteredLogs.map((log) => ({
      Timestamp: new Date(log.Timestamp).toLocaleString(),
      Role: log.Role,
      Asset: log.Asset,
      Action: log.Action,
      Status: log.Status,
      IPAddress: log.IPAddress,
      Details: log.Details
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Access Logs');

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });
    const fileData = new Blob([excelBuffer], {
      type: 'application/octet-stream'
    });
    saveAs(fileData, 'AccessLogs.xlsx');
  };


  const normalizePermissions = (val: unknown): string[] => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') return val.split(',').map((x) => x.trim());
    return [];
  };

  const handleEditRoleClick = (role: Role) => {
    console.log('Editing role:', role);
    setEditingRole(role); 

    editRoleForm.reset({
      Role: role.Role,
      Assets: role.AssetName,
      Description: role.Description ?? '',
      Permissions: normalizePermissions(role.Permissions)
    });

    setSelectedAsset(assets.find((a) => a.AssetName === role.AssetName) ?? null);
    setIsEditDialogOpen(true);
  };

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/framework/user-roles');
      if (!res.ok) throw new Error('Failed to fetch user roles');
      const data = await res.json();
      console.log(' Raw user role data from backend:', data);
      return Array.isArray(data) ? data : [];
    }
  });

  const roleColumns = [
    // ROLE ID
    {
      key: 'Id',
      label: 'Role ID'
    },

    // ASSET NAME
    {
      key: 'AssetName',
      label: 'Asset Name'
    },

    // ROLE NAME
    {
      key: 'Role',
      label: 'Role'
    },

    // DESCRIPTION
    {
      key: 'Description',
      label: 'Description',
      render: (r: any) => r.Description || '-'
    },

    // PERMISSIONS (Badge list, split by comma)
    {
      key: 'Permissions',
      label: 'Permissions',
      render: (r: any) => (
        <div className="max-w-xs overflow-x-auto text-xs flex flex-wrap gap-2">
          {(r.Permissions ?? '')
            .toString()
            .split(',')
            .filter(Boolean)
            .map((perm: string, idx: number) => (
              <Badge
                key={idx}
                variant="outline"
                className="badge badge-pill badge-outline badge-primary"
              >
                {perm.trim()}
              </Badge>
            ))}
        </div>
      )
    }
  ];
  const auditLogColumns = [
    // TIMESTAMP
    {
      key: 'Timestamp',
      label: 'Timestamp',
      render: (log: any) => new Date(log.Timestamp).toLocaleString()
    },

    // ROLE
    {
      key: 'Role',
      label: 'Role',
      render: (log: any) => log.Role ?? '—'
    },

    // ASSET
    {
      key: 'Asset',
      label: 'Asset'
    },

    // ACTION
    {
      key: 'Action',
      label: 'Action'
    },

    // STATUS
    {
      key: 'Status',
      label: 'Status'
    },

    // IP ADDRESS
    {
      key: 'IPAddress',
      label: 'IP Address'
    },

    // DETAILS BUTTON
    {
      key: 'Details',
      label: 'Details',
      render: (log: any) =>
        log.Status === 'Success' ? (
          <button
            className="text-primary"
            onClick={() => {
              setLogPopupContent(log.Details);
              setShowLogPopup(true);
            }}
          >
            <KeenIcon icon="eye" />
          </button>
        ) : (
          <button
            className="text-red-600"
            onClick={() => {
              setLogPopupContent(log.Details);
              setShowLogPopup(true);
            }}
          >
            <AlertTriangle className="h-3 w-3" />
          </button>
        )
    }
  ];

  
  return (
    <div className="card">
      {/* card 1 */}
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left: Heading + Subtext */}
          <div>
            <h2 className="text-2xl font-bold">System Assets Management</h2>
            <p className="text-md text-gray-500">
              Manage system assets, role-based access control, and asset access logging
            </p>
          </div>

          {/* Right: Buttons */}
          <div className="flex flex-wrap items-center gap-3 sm:justify-end justify-start">
            <button
              className="btn btn-outline btn-success flex items-center gap-2 text-base"
              onClick={() => exportToExcel(filteredRoles, 'Roles_Export')}
            >
              <i className="ki-solid ki-exit-up"></i>
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* card 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 xl:gap-10 gap-3 w-full p-5 ">
        <div className="card btn-outline bg-[#BF55EC] text-white p-6 flex items-center justify-center ">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <i className="ki-solid ki-shield-search xl:text-5xl text-3xl"></i>
          </div>
          <div className="text-left">
            <h1 className="xl:text-2xl text-lg font-bold dark:text-white">
              {roles.length} Role Permissions
            </h1>
          </div>
        </div>
        <div className="card btn-outline bg-primary text-white p-6 flex items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <i className="ki-solid ki-notepad xl:text-5xl text-3xl"></i>
          </div>
          <div>
            <h1 className="xl:text-2xl text-lg font-bold dark:text-white">
              {fetchedLogs.length} Access Logs
            </h1>
          </div>
        </div>
    
      </div>
      <div className="p-5">
        <div className="card p-4">
          <div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              className={`px-6 py-4 rounded-md ${
                activeTab === 'role-access'
                  ? 'bg-blue-400 font-bold text-white text-lg'
                  : 'bg-gray-200 text-gray-700 font-bold'
              }`}
              onClick={() => setActiveTab('role-access')}
            >
              Role Access
            </button>
            <button
              className={`px-6 py-4 rounded-md ${
                activeTab === 'access-logs'
                  ? 'bg-blue-400 font-bold text-white text-lg'
                  : 'bg-gray-200 text-gray-700 font-bold'
              }`}
              onClick={() => setActiveTab('access-logs')}
            >
              Access Logs
            </button>
          </div>
        </div>
      </div>
      <div className="p-4 pt-0">
        <div className="card p-4">
          {/* Tab content */}
          <div className="p-0">
         
            {activeTab === 'role-access' && (
              <>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
                    {/* LEFT: Heading + Paragraph */}
                    <div>
                      <h3 className="text-xl font-bold dark:text-white">Role-Based Asset Access</h3>
                      <p className="text-md text-gray-500 dark:text-gray-600">
                        Configure role-based permissions for system assets
                      </p>
                    </div>

                    {/* RIGHT: Search + Button */}
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-10">
                      <div className="input input-md w-full sm:w-48 2xl:w-60 border hover:border-blue-400 border-blue-300 text-md flex items-center gap-2">
                        <i className="ki-filled ki-magnifier"></i>
                        <input
                          className="w-full outline-none"
                          placeholder="Search Teams"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>

                      <button
                        className="btn btn-outline btn-primary w-full sm:w-auto"
                        onClick={() => setIsCreateDialogOpen(true)}
                      >
                        <i className="ki-solid ki-plus text-xl"></i>
                        Add Role Permission
                      </button>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="flex justify-center p-8">
                      <RefreshCw className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <div className="grid">
                      <div className="card min-w-full">
                        <div className="card-table scrollable-x-auto">
                          <DataTable
                            data={filteredRoles}
                            columns={roleColumns}
                            rowKey={(r) => r.Id}
                            onEdit={(row) => handleEditRoleClick(row)}
                            onDelete={(row) => deleteRoleMutation.mutate(row.Id)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            {activeTab === 'access-logs' && (
              <>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
                    {/* LEFT: Heading + Paragraph */}
                    <div>
                      <h3 className="text-xl font-bold dark:text-white">Asset Access Logs</h3>
                      <p className="text-md text-gray-500 dark:text-gray-600">
                        Monitor and audit access to system assets
                      </p>
                    </div>
                  </div>
                  {/* 🔍 Filters row */}
                  <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center 2xl:justify-between">
                    {/* Left: Search input (full width on small, fixed on md+) */}
                    <div className="input input-md w-full md:w-60 lg:w-40 2xl:w-72 border hover:border-blue-400 border-blue-300 text-md">
                      <i className="ki-filled ki-magnifier"></i>
                      <input
                        placeholder="Search Teams"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                      />
                    </div>

                    {/* Right: selects + export (stacked on small, inline on md+) */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                      <Select
                        value={dateFilter}
                        onValueChange={(val) => {
                          setDateFilter(val);
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger
                          className="w-full md:w-48 lg:w-40 2xl:w-60 btn-outline btn-primary border hover:border-blue-400"
                          size="md"
                        >
                          <SelectValue placeholder="Select Date Range" />
                        </SelectTrigger>
                        <SelectContent className="w-full md:w-48 2xl:w-60 bg-white">
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="yesterday">Yesterday</SelectItem>
                          <SelectItem value="week">Last 7 days</SelectItem>
                          <SelectItem value="month">Last 30 days</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={assetFilter}
                        onValueChange={(val) => {
                          setAssetFilter(val);
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger
                          className="w-full md:w-48 lg:w-40 2xl:w-60 btn-outline btn-primary border hover:border-blue-400"
                          size="md"
                        >
                          <SelectValue placeholder="Select Asset" />
                        </SelectTrigger>
                        <SelectContent className="w-full md:w-48 2xl:w-60 bg-white">
                          <SelectItem value="all">All Assets</SelectItem>
                          {uniqueAssets.map((asset, index) => (
                            <SelectItem key={index} value={asset}>
                              {asset}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <button
                        className="btn btn-outline btn-primary w-full md:w-auto"
                        onClick={handleASsestLogExport}
                      >
                        <i className="ki-solid ki-exit-up text-xl"></i>
                        Export
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-7.5 mt-8">
                    <div className="card p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center justify-center size-[50px] rounded-lg bg-gray-50">
                          <i className="ki-solid ki-arrow-up-refraction text-primary text-3xl font-semibold"></i>
                        </div>
                      </div>

                      <h1 className="text-2xl font-bold dark:text-white mt-2">
                        {totalAccess} Total Access
                      </h1>
                    </div>
                    <div className="card p-3">
                      <div className="flex items-center justify-between ">
                        <div className="flex items-center justify-center size-[50px] rounded-lg bg-gray-100">
                          <i className="ki-solid ki-check-circle text-3xl text-success"></i>
                        </div>
                      </div>
                      <h1 className="text-2xl font-bold dark:text-white mt-2">
                        {successfulAccess} Successful
                      </h1>
                    </div>
                    <div className="card p-3">
                      <div className="flex items-center justify-between ">
                        <div className="flex items-center justify-center size-[50px] rounded-lg bg-gray-100">
                          <i className="ki-solid text-danger ki-cross-circle text-3xl"></i>
                        </div>
                      </div>
                      <h1 className="text-2xl font-bold dark:text-white mt-2">
                        {failedAccess} Failed
                      </h1>
                    </div>
                    <div className="card p-3">
                      <div className="flex items-center justify-between  ">
                        <div className="flex items-center justify-center size-[50px] rounded-lg bg-gray-100">
                          <i className="ki-solid ki-shield-cross text-3xl text-warning"></i>
                        </div>
                      </div>
                      <h1 className="mt-2 text-2xl font-bold dark:text-white">
                        {unauthorizedAccess} Unauthorizedd
                      </h1>
                    </div>
                  </div>

                  <div className="border rounded-lg">
                    <div className="space-y-4 p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Recent Access Activity</h3>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-sm text-gray-500">Live Updates</span>
                        </div>
                      </div>
                    </div>
                    {logsLoading ? (
                      <p>Loading logs</p>
                    ) : logsError ? (
                      <p className="text-danger"> Error Loading Logs</p>
                    ) : (
                      <div className="grid">
                        <div className="card min-w-full">
                          <div className="card-table scrollable-x-auto">
                            <DataTable
                              data={paginatedLogs}
                              columns={auditLogColumns}
                              rowKey={(index: any) => index} // logs have no ID so use index
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-md form-hint">
                      Showing {(currentPage - 1) * pageSize + 1}-
                      {Math.min(currentPage * pageSize, filteredLogs.length)} of{' '}
                      {filteredLogs.length} access logs
                    </p>
                    <div className="flex gap-5">
                      <button
                        className="btn btn-outline btn-secondary"
                        onClick={() => setCurrentPage((prev) => prev - 1)}
                        disabled={currentPage === 1}
                      >
                        previous
                      </button>
                      <button
                        className="btn btn-outline btn-secondary"
                        onClick={() => setCurrentPage((prev) => prev + 1)}
                        disabled={currentPage * pageSize >= filteredLogs.length}
                      >
                        next
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 p-6 pt-60 md:pt-0 flex items-start  md:items-center justify-center">
          <div
            className="fixed inset-0 bg-black/60 dark:bg-white/30 bg-black/60"
            onClick={() => setIsCreateDialogOpen(false)}
          />
          <div className="bg-white dark:bg-black rounded-xl shadow-2xl w-full lg:w-3/4 xl:w-1/4 z-10 p-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold dark:text-white">
                  Add New {activeTab.slice(0, -1)}
                </h3>
                <p className="text-md text-gray-500 dark:text-gray-700">
                  Create a new {activeTab.slice(0, -1)} entry in Azure SQL Server
                </p>
              </div>
              <button
                className="btn btn-outline btn-danger font-bold"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                <i className="ki-filled ki-cross text-2xl"></i>
              </button>
            </div>
         
            {activeTab === 'role-access' && (
              <form
                {...roleForm}
                onSubmit={roleForm.handleSubmit((data) => {
                  console.log('Role Payload:', data); 
                  createRoleMutation.mutate(data);
                })}
                className="space-y-4 dark:text-white"
              >
                <div className="flex flex-col gap-4">
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Role Name *</span>

                    <Controller
                      name="Role"
                      control={roleForm.control}
                      render={({ field }) => (
                        <input
                          type="text"
                          className="input mt-1"
                          placeholder="Enter role name (e.g., Trade Analyst)"
                          {...field}
                          value={field.value ?? ''} // prevents uncontrolled error
                        />
                      )}
                    />
                  </label>

                  <Controller
                    control={roleForm.control}
                    name="Assets"
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Assets *</span>

                        <Select
                          value={field.value || 'none'}
                          onValueChange={(value) => {
                            if (value === 'none') {
                              field.onChange('');
                              setSelectedAsset(null);
                              roleForm.setValue('Permissions', []);
                              return;
                            }

                            const selectedAsset = assets.find((a) => a.AssetName === value);

                            if (selectedAsset) {
                              field.onChange(selectedAsset.AssetName);
                              setSelectedAsset(selectedAsset);

                              // reset permissions
                              roleForm.setValue('Permissions', []);
                            }
                          }}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select an Asset" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:text-white dark:bg-black">
                            <SelectItem value="none" disabled>
                              -- Select an Asset --
                            </SelectItem>

                            {assets.map((asset) => (
                              <SelectItem key={asset.AssetID} value={asset.AssetName}>
                                {asset.AssetName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Description</span>

                    <Controller
                      name="Description"
                      control={roleForm.control}
                      render={({ field }) => (
                        <textarea
                          placeholder="Enter description..."
                          {...field}
                          value={field.value ?? ''}
                          className="textarea "
                          rows={3}
                        />
                      )}
                    />
                  </label>

                  {selectedAsset && (
                    <label className="flex flex-col">
                      <span className="text-md font-semibold">
                        Permissions for {selectedAsset.AssetName}
                      </span>

                      <Controller
                        name="Permissions"
                        control={roleForm.control}
                        render={({ field }) => (
                          <div className="flex flex-wrap gap-3 mt-2 border rounded p-3">
                            {(selectedAsset?.PermissionLevel ?? '')
                              .toString()
                              .split(',')
                              .filter(Boolean)
                              .map((perm: string) => {
                                const trimmed = perm.trim();
                                return (
                                  <label key={trimmed} className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      value={trimmed}
                                      checked={
                                        Array.isArray(field.value) && field.value.includes(trimmed)
                                      }
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        let newValue = Array.isArray(field.value)
                                          ? [...field.value]
                                          : [];

                                        if (checked) newValue.push(trimmed);
                                        else newValue = newValue.filter((v) => v !== trimmed);

                                        field.onChange(newValue);
                                      }}
                                    />
                                    {trimmed.replaceAll('_', ' ')}
                                  </label>
                                );
                              })}
                          </div>
                        )}
                      />
                    </label>
                  )}
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
                    disabled={createRoleMutation.isPending}
                    className="btn btn-outline btn-primary px-4 py-2 text-md"
                  >
                    {createRoleMutation.isPending ? 'Saving...' : 'Save Role'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {isEditDialogOpen && (
        <div className="fixed inset-0 z-50 p-6 pt-60 md:pt-0 flex items-start  md:items-center justify-center">
          <div
            className="fixed inset-0 bg-black/60 dark:bg-white/30 bg-black/60"
            onClick={() => setIsEditDialogOpen(false)}
          />
          <div className="bg-white dark:bg-black rounded-xl shadow-2xl w-full lg:w-3/4 xl:w-1/4 z-10 p-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold dark:text-white">
                  Edit Asset {activeTab.slice(0, -1)}
                </h3>
                <p className="text-md text-gray-500 dark:text-gray-700">
                  Update the {activeTab.slice(0, -1)} entry in Azure SQL Server
                </p>
              </div>
              <button
                className="btn btn-outline btn-danger font-bold"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                <i className="ki-filled ki-cross text-2xl"></i>
              </button>
            </div>
           
            {activeTab === 'role-access' && (
              <form
                {...editRoleForm}
                onSubmit={editRoleForm.handleSubmit((data) => {
                  console.log('Edit Role Payload:', data);
                  updateRoleMutation.mutate({
                    ...data,
                    Id: editingRole?.Id
                  });
                })}
                className="space-y-4 dark:text-white"
              >
                <div className="flex flex-col gap-4">
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Role Name *</span>

                    <Controller
                      name="Role"
                      control={editRoleForm.control}
                      render={({ field }) => (
                        <input
                          type="text"
                          className="input mt-1"
                          placeholder="Enter role name (e.g., Trade Analyst)"
                          {...field}
                          value={field.value ?? ''} // prevents uncontrolled error
                        />
                      )}
                    />
                  </label>

                  <Controller
                    control={editRoleForm.control}
                    name="Assets"
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Assets *</span>

                        <Select
                          value={field.value || 'none'}
                          onValueChange={(value) => {
                            if (value === 'none') {
                              field.onChange('');
                              setSelectedAsset(null);
                              roleForm.setValue('Permissions', []);
                              return;
                            }

                            const selectedAsset = assets.find((a) => a.AssetName === value);

                            if (selectedAsset) {
                              field.onChange(selectedAsset.AssetName);
                              setSelectedAsset(selectedAsset);

                              // reset permissions
                              roleForm.setValue('Permissions', []);
                            }
                          }}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select an Asset" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:text-white dark:bg-black">
                            <SelectItem value="none" disabled>
                              -- Select an Asset --
                            </SelectItem>

                            {assets.map((asset) => (
                              <SelectItem key={asset.AssetID} value={asset.AssetName}>
                                {asset.AssetName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Description</span>

                    <Controller
                      name="Description"
                      control={editRoleForm.control}
                      render={({ field }) => (
                        <textarea
                          placeholder="Enter description..."
                          {...field}
                          value={field.value ?? ''}
                          className="textarea "
                          rows={3}
                        />
                      )}
                    />
                  </label>

                  {selectedAsset && (
                    <label className="flex flex-col">
                      <span className="text-md font-semibold">
                        Permissions for {selectedAsset.AssetName}
                      </span>

                      <Controller
                        name="Permissions"
                        control={editRoleForm.control}
                        render={({ field }) => (
                          <div className="flex flex-wrap gap-3 mt-2 border rounded p-3">
                            {(selectedAsset?.PermissionLevel ?? '')
                              .toString()
                              .split(',')
                              .filter(Boolean)
                              .map((perm: any) => {
                                const trimmed = perm.trim();
                                return (
                                  <label key={trimmed} className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      value={trimmed}
                                      checked={
                                        Array.isArray(field.value) && field.value.includes(trimmed)
                                      }
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        let newValue = Array.isArray(field.value)
                                          ? [...field.value]
                                          : [];

                                        if (checked) newValue.push(trimmed);
                                        else newValue = newValue.filter((v) => v !== trimmed);

                                        field.onChange(newValue);
                                      }}
                                    />
                                    {trimmed.replaceAll('_', ' ')}
                                  </label>
                                );
                              })}
                          </div>
                        )}
                      />
                    </label>
                  )}
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
                    disabled={updateRoleMutation.isPending}
                    className="btn btn-outline btn-primary px-4 py-2 text-md"
                  >
                    {updateRoleMutation.isPending ? 'Updating...' : 'Update Role'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {showAccessDenied && (
        <div className="fixed inset-0 z-50 p-6 pt-60 md:pt-0 flex items-center md:items-center justify-center">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowAccessDenied(false)} />
          <div className="bg-white rounded shadow-2xl w-full md:w-3/4 xl:w-2/4 2xl:w-1/4 z-10 p-5">
            <div className="text-center mb-4">
              <div>
                <h3 className="text-xl font-bold ">Access Denied</h3>
                <p className="text-md text-gray-500">
                  You do not have permission to perform this action.
                </p>
              </div>
              <div className="mt-5">
                <button
                  className="btn btn-secondary px-4 py-2 text-md"
                  onClick={() => setShowAccessDenied(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showLogPopup && (
        <div className="fixed inset-0 z-50 p-6 pt-60 md:pt-0 flex items-start  md:items-center justify-center">
          <div
            className="fixed inset-0 bg-black/60 dark:bg-white/30 bg-black/60"
            onClick={() => setShowLogPopup(false)}
          />
          <div className="bg-white dark:bg-black rounded shadow-2xl w-full lg:w-2/4 xl:w-1/4 z-10 p-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold dark:text-white">Access Log Details</h3>
                <p className="text-md text-gray-500 dark:text-gray-700">{logPopupContent}</p>
              </div>
              <button
                className="btn btn-secondary px-4 py-2 text-md"
                onClick={() => setShowLogPopup(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;
