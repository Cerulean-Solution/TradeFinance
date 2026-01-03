import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {RefreshCw } from 'lucide-react';
import DataTable from './DataTable';
export const assetFormSchema = z.object({
  AssetName: z.string().min(1, 'Asset name is required'),
  Actions: z.string().default(''),
  AssetDescription: z.string().default('')
});
export type AssetFormValues = z.infer<typeof assetFormSchema>;

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
const SystemAssets= () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  // Form for Create
  const createForm = useForm<Asset>({
    defaultValues: {
      AssetName: '',
      AssetType: '',
      AssetDescription: '',
      AssetKey: '',
      PermissionLevel: []
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
  
  const createAssetMutation = useMutation<Asset, Error, Asset>({
    mutationFn: async (asset) => {
      const res = await fetch('/api/framework/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asset)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create asset');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setIsCreateDialogOpen(false);

      createForm.reset({
        AssetName: '',
        AssetDescription: '',
        AssetType: '',
        AssetKey: '',
        PermissionLevel: []
      });

      toast.success('Asset created successfully');
    },
    onError: () => toast.error('Already Exists')
  });

  const updateAssetMutation = useMutation({
    mutationFn: async (asset: Asset) => {
      const res = await fetch(`/api/framework/assets/${asset.AssetID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asset)
      });
      if (!res.ok) throw new Error('Failed to update asset');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setIsEditDialogOpen(false);
      setEditingAsset(null);
      toast.success('Asset updated successfully');
    },
    onError: () => {
      toast.error('Exists Assset');
    }
  });
  const deleteAssetMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/framework/assets/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete asset');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete asset');
    }
  });
  const editForm = useForm<Asset>({
    defaultValues: {
      AssetName: '',
      AssetType: '',
      AssetDescription: '',
      AssetKey: '',
      PermissionLevel: []
    }
  });

  const handleEditAssetClick = (asset: Asset) => {
    setEditingAsset(asset);
    editForm.reset({
      AssetName: asset.AssetName,
      AssetType: asset.AssetType || '',
      AssetDescription: asset.AssetDescription,
      AssetKey: asset.AssetKey || '',
      PermissionLevel: asset.PermissionLevel ?? []
    });

    setIsEditDialogOpen(true); // Then open dialog
  };
  const assetColumns = [
    {
      key: 'AssetName',
      label: 'Asset Name'
    },
    {
      key: 'AssetType',
      label: 'Asset Type'
    },
    {
      key: 'AssetKey',
      label: 'Asset Key'
    },
    {
      key: 'AssetDescription',
      label: 'Description',
      render: (a: any) => a.AssetDescription || '-'
    },
    {
      key: 'PermissionLevel',
      label: 'Permission',
      render: (a: any) => a.PermissionLevel || '-'
    },
    {
      key: 'Created_At',
      label: 'Created Date',
      render: (a: any) => (a.Created_At ? new Date(a.Created_At).toLocaleString() : '-')
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
        </div>
      </div>

      {/* card 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 xl:gap-10 gap-3 w-full p-5 ">
        <div className="card p-6 flex items-center justify-center bg-success text-white">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <i className="ki-solid ki-setting-2 xl:text-5xl text-3xl text-bold"></i>
          </div>
          <div className="text-left">
            <h1 className="xl:text-2xl text-lg font-bold dark:text-white">
              {assets.length} System Assets
            </h1>
          </div>
        </div>
      </div>
      
      <div className="p-4 pt-0">
        <div className="card p-4">
          {/* Tab content */}
          <div className="p-0">
              <>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
                    {/* LEFT: Heading + Paragraph */}
                    <div>
                      <h3 className="text-xl font-bold dark:text-white">System Assets</h3>
                      <p className="text-md text-gray-500 dark:text-gray-600">
                        Manage system assets and their security configurations
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
                        Add Asset
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
                            data={assets.filter((a) =>
                              a.AssetName?.toLowerCase().includes(searchTerm.toLowerCase())
                            )}
                            columns={assetColumns}
                            rowKey={(a) => a.AssetID}
                            onEdit={(row) => handleEditAssetClick(row)}
                            onDelete={(row) => {
                              console.log('Deleting asset:', row);
                              deleteAssetMutation.mutate(Number(row.AssetID));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
     
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
                  Add New Asset
                </h3>
                <p className="text-md text-gray-500 dark:text-gray-700">
                  Create a new Asset entry in SQL Server
                </p>
              </div>
              <button
                className="btn btn-outline btn-danger font-bold"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                <i className="ki-filled ki-cross text-2xl"></i>
              </button>
            </div>
              <form
                {...createForm}
                onSubmit={createForm.handleSubmit((data: Asset) => {
                  createAssetMutation.mutate(data);
                })}
                className="space-y-4 dark:text-white"
              >
                <div className="flex flex-col gap-4">
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Asset Name **</span>

                    <Controller
                      name="AssetName"
                      control={createForm.control}
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          placeholder="Enter asset name..."
                          {...field}
                        />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Asset Key *</span>
                    <Controller
                      name="AssetKey"
                      control={createForm.control}
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          placeholder="e.g. framework, admin, trade_module"
                          {...field}
                        />
                      )}
                    />
                  </label>
                  <div className="text-sm text-muted-foreground">
                    Must match sidebar section key (e.g. <code>framework</code>)
                  </div>
                  <Controller
                    name="AssetType"
                    control={createForm.control}
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Asset Type</span>

                        <Select
                          value={field.value || 'none'}
                          onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select Asset Type" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:text-white dark:bg-black">
                            <SelectItem value="none" disabled>
                              -- Select Asset Type --
                            </SelectItem>
                            <SelectItem value="System Assets">System Assets</SelectItem>
                            <SelectItem value="Trade Instruments Assets">
                              Trade Instruments Assets
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Permissions</span>

                    <Controller
                      name="PermissionLevel"
                      control={createForm.control}
                      render={({ field }) => {
                        const rawVal = field.value as string[] | string | null | undefined;

                        const valueArray = Array.isArray(rawVal)
                          ? rawVal
                          : typeof rawVal === 'string'
                            ? rawVal.split(',').map((s) => s.trim())
                            : [];

                        return (
                          <div className="flex flex-col gap-3 border rounded p-3 mt-1">
                            {/* predefined permissions */}
                            <div className="flex flex-col gap-2">
                              {['allow_all', 'read_only', 'restricted'].map((perm) => (
                                <label key={perm} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    value={perm}
                                    checked={valueArray.includes(perm)}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      const newValue = checked
                                        ? [...valueArray, perm]
                                        : valueArray.filter((p) => p !== perm);

                                      field.onChange(newValue);
                                    }}
                                  />
                                  {perm.replace('_', ' ')}
                                </label>
                              ))}
                            </div>

                            {/* custom permission */}
                            <div className="flex flex-col mt-2">
                              <label className="text-sm font-medium">Add Custom Permission</label>
                              <input
                                type="text"
                                className="border rounded p-2 mt-1"
                                placeholder="e.g. audit_only"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                    const val = e.currentTarget.value.trim();

                                    if (!valueArray.includes(val)) {
                                      field.onChange([...valueArray, val]);
                                    }
                                    e.currentTarget.value = '';
                                    e.preventDefault();
                                  }
                                }}
                              />
                            </div>

                            {/* chips */}
                            {valueArray.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {valueArray.map((perm) => (
                                  <span
                                    key={perm}
                                    className="bg-gray-200 text-gray-700 px-2 py-1 rounded-md text-xs flex items-center gap-1"
                                  >
                                    {perm}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        field.onChange(valueArray.filter((p) => p !== perm))
                                      }
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Description</span>
                    <Controller
                      name="AssetDescription"
                      control={createForm.control}
                      render={({ field }) => (
                        <textarea
                          className="textarea mt-1"
                          placeholder="Enter Description..."
                          {...field}
                          rows={3}
                        />
                      )}
                    />
                  </label>
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
                    disabled={createAssetMutation.isPending}
                    className="btn btn-outline btn-primary px-4 py-2 text-md"
                  >
                    {createAssetMutation.isPending ? 'Saving...' : 'Save Asset'}
                  </button>
                </div>
              </form>
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
                  Edit Asset 
                </h3>
                <p className="text-md text-gray-500 dark:text-gray-700">
                  Update the Asset entry in SQL Server
                </p>
              </div>
              <button
                className="btn btn-outline btn-danger font-bold"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                <i className="ki-filled ki-cross text-2xl"></i>
              </button>
            </div>
              <form
                {...editForm}
                onSubmit={editForm.handleSubmit((data) => {
                  if (editingAsset) {
                    updateAssetMutation.mutate({
                      ...data,
                      AssetID: editingAsset.AssetID
                    });
                  }
                })}
                className="space-y-4 dark:text-white"
              >
                <div className="flex flex-col gap-4">
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Asset Name **</span>

                    <Controller
                      name="AssetName"
                      control={editForm.control}
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          placeholder="Enter asset name..."
                          {...field}
                        />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Asset Key *</span>
                    <Controller
                      name="AssetKey"
                      control={editForm.control}
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          placeholder="e.g. framework, admin, trade_module"
                          {...field}
                        />
                      )}
                    />
                  </label>
                  <div className="text-sm text-muted-foreground">
                    Must match sidebar section key (e.g. <code>framework</code>)
                  </div>
                  <Controller
                    name="AssetType"
                    control={editForm.control}
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Asset Type</span>

                        <Select
                          value={field.value || 'none'}
                          onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select Asset Type" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:text-white dark:bg-black">
                            <SelectItem value="none" disabled>
                              -- Select Asset Type --
                            </SelectItem>
                            <SelectItem value="System Assets">System Assets</SelectItem>
                            <SelectItem value="Trade Instruments Assets">
                              Trade Instruments Assets
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Permissions</span>

                    <Controller
                      name="PermissionLevel"
                      control={createForm.control}
                      render={({ field }) => {
                        const rawVal = field.value as string[] | string | null | undefined;

                        const valueArray = Array.isArray(rawVal)
                          ? rawVal
                          : typeof rawVal === 'string'
                            ? rawVal.split(',').map((s) => s.trim())
                            : [];

                        return (
                          <div className="flex flex-col gap-3 border rounded p-3 mt-1">
                            {/* predefined permissions */}
                            <div className="flex flex-col gap-2">
                              {['allow_all', 'read_only', 'restricted'].map((perm) => (
                                <label key={perm} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    value={perm}
                                    checked={valueArray.includes(perm)}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      const newValue = checked
                                        ? [...valueArray, perm]
                                        : valueArray.filter((p) => p !== perm);

                                      field.onChange(newValue);
                                    }}
                                  />
                                  {perm.replace('_', ' ')}
                                </label>
                              ))}
                            </div>

                            {/* custom permission */}
                            <div className="flex flex-col mt-2">
                              <label className="text-sm font-medium">Add Custom Permission</label>
                              <input
                                type="text"
                                className="border rounded p-2 mt-1"
                                placeholder="e.g. audit_only"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                    const val = e.currentTarget.value.trim();

                                    if (!valueArray.includes(val)) {
                                      field.onChange([...valueArray, val]);
                                    }
                                    e.currentTarget.value = '';
                                    e.preventDefault();
                                  }
                                }}
                              />
                            </div>

                            {/* chips */}
                            {valueArray.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {valueArray.map((perm) => (
                                  <span
                                    key={perm}
                                    className="bg-gray-200 text-gray-700 px-2 py-1 rounded-md text-xs flex items-center gap-1"
                                  >
                                    {perm}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        field.onChange(valueArray.filter((p) => p !== perm))
                                      }
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Description</span>
                    <Controller
                      name="AssetDescription"
                      control={editForm.control}
                      render={({ field }) => (
                        <textarea
                          className="textarea mt-1"
                          placeholder="Enter Description..."
                          {...field}
                          rows={3}
                        />
                      )}
                    />
                  </label>
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
                    disabled={updateAssetMutation.isPending}
                    className="btn btn-outline btn-primary px-4 py-2 text-md"
                  >
                    {updateAssetMutation.isPending ? 'Updating...' : 'Update Asset'}
                  </button>
                </div>
              </form>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemAssets;
