import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import ApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { Plus, RefreshCw } from 'lucide-react';
import SearchFilterBar from '../FrameworkComponent/SearchFilterBar';
import Tabs from '../FrameworkComponent/Tabs';
import ImportExport from '../FrameworkComponent/ImportExport';
import DataTable from '../FrameworkComponent/DataTable';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select';

export const universeSchema = z.object({
  UniverseName: z.string().min(1, 'Universe name is required'),
  Description: z.string().optional(),
  IsActive: z.boolean().default(true)
});

const companySchema = z.object({
  CompanyCode: z.string().min(1, 'Company code is required').max(50),

  CompanyName: z.string().min(1, 'Company name is required').max(200),

  Address: z
    .string()
    .max(300)
    .optional()
    .transform((val) => val ?? ''),

  CityID: z.number().int().positive('City ID must be a positive number').nullable().default(null),

  CityName: z
    .string()
    .min(1, 'City name is required')
    .max(100)
    .optional()
    .transform((val) => val ?? ''),
  UniverseID: z.string().uuid(),
  UniverseName: z.string().min(1, 'Universe name is required'),

  Email: z
    .string()
    .email('Invalid email format')
    .optional()
    .transform((val) => val ?? ''),

  Website: z
    .string()
    .optional()
    .transform((val) => val ?? ''),

  IsActive: z.boolean().default(true)
});
type CompanyFormValues = z.infer<typeof companySchema>;

const divisionSchema = z.object({
  DivisionID: z.number().optional(),
  CompanyID: z.number().min(1, 'Please select a company'),
  DivisionName: z.string().min(1, 'Division name is required').max(100),
  DivisionCode: z.string().min(1, 'Division code is required').max(20),
  Description: z.string().max(500).optional().or(z.literal('')),
  IsActive: z.boolean().default(true)
});

const departmentSchema = z.object({
  CompanyID: z.number().min(1, 'Company is required'),
  DivisionID: z.number().optional(),
  DepartmentName: z.string().min(1, 'Department name is required'),
  Description: z.string().optional(),
  IsActive: z.boolean()
});

export const workTeamSchema = z.object({
  WorkTeamName: z.string().min(1, 'Team name is required'),
  DepartmentName: z.string().min(1, 'DepartmentName is required'),
  CompanyID: z.number().min(1, 'Company is required'),
  DivisionID: z.number().optional(),
  DepartmentID: z.number().optional(),
  Description: z.string().optional(),
  IsActive: z.boolean().default(true)
});
export type WorkTeamFormValues = z.infer<typeof workTeamSchema>;
// types
type City = {
  CityID: number;
  CityName: string;
};

interface Universe {
  UniverseID: string;
  UniverseName: string;
  Description?: string;
  IsActive: boolean;
  IsMaster?: number;
}

interface Company {
  UniverseID: string;
  CompanyID: number;
  CompanyCode: string;
  CompanyName: string;
  CityID?: number;
  CityName?: string;
  Address?: string;
  Email?: string;
  Website?: string;
  IsActive: boolean;
  CreatedDate: string;
  UpdatedDate?: string;
  UniverseName: string;
}

interface Division {
  DivisionID?: number;
  CompanyID: number;
  DivisionName: string;
  DivisionCode: string;
  Description?: string;
  IsActive: boolean;
  CreatedDate: string;
  UpdatedDate?: string;
}

interface Department {
  IsActive: boolean;
  CompanyID: number;
  DivisionID: number;
  DepartmentName: string;
  DepartmentCode: string;
  Description?: string;
  DepartmentID?: number;
  CreatedDate?: string;
  UpdatedDate?: string;
}

interface WorkTeam {
  WorkTeamID: number;
  WorkTeamName: string;
  DepartmentID?: number;
  DivisionID?: number;
  CompanyID?: number;
  Description?: string;
  IsActive: boolean;
  CreatedAt?: string;
  UpdatedAt?: string;
  DepartmentName?: string;
  DivisionName?: string;
  CompanyName?: string;
  WorkTeamCode?: string;
}

export default function OrganizationalManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [localWorkTeams, setLocalWorkTeams] = useState<WorkTeam[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tableLoading,setTableLoading] = useState(false)

  const queryClient = useQueryClient();
  type TabKey = 'universes' | 'companies' | 'divisions' | 'departments' | 'workTeams';
  const [activeTab, setActiveTab] = useState<TabKey>('universes');
  const [importedTabs, setImportedTabs] = useState<Record<TabKey, ImportedFileData | null>>({
    universes: null,
    companies: null,
    divisions: null,
    departments: null,
    workTeams: null
  });
  const [isParsing, setIsParsing] = useState(false); //  gets the same client
  // const selectedUniverse = queryClient.getQueryData(['selectedUniverse']);
  const { data: selectedUniverse } = useQuery({
    queryKey: ['selectedUniverse'],
    initialData: null
  });

  console.log('Selected Universe from Header:', selectedUniverse);

  // Forms
  type UniverseFormValues = {
    UniverseName: string;
    Description?: string;
    IsActive: boolean;
  };

  const universeForm = useForm<UniverseFormValues>({
    resolver: zodResolver(universeSchema) as any,
    defaultValues: {
      UniverseName: '',
      Description: '',
      IsActive: true
    }
  });

  const companyForm = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema) as any,
    defaultValues: {
      CompanyCode: '',
      CompanyName: '',
      Address: '',
      Email: '',
      Website: '',
      CityID: null, 
      CityName: '', 
      UniverseID: '', 
      UniverseName: '', 
      IsActive: true
    }
  });

  const divisionForm = useForm<z.infer<typeof divisionSchema>>({
    resolver: zodResolver(divisionSchema) as any,
    defaultValues: {
      CompanyID: 0,
      DivisionName: '',
      DivisionCode: '',
      Description: '',
      IsActive: true
    }
  });

  const departmentForm = useForm<z.infer<typeof departmentSchema>>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      CompanyID: 0,
      DivisionID: 0,
      DepartmentName: '',
      Description: '',
      IsActive: true
    }
  });

  const workTeamForm = useForm<WorkTeamFormValues>({
    defaultValues: {
      CompanyID: undefined,
      DivisionID: undefined,
      DepartmentID: undefined,
      DepartmentName: '',
      WorkTeamName: '',
      Description: '',
      IsActive: true
    }
  });

  // get table values
  const { data: universes = [], isLoading: universesLoading } = useQuery({
    queryKey: ['universes'], // a simple key for caching
    queryFn: async () => {
      const response = await fetch('/api/framework/universes');
      if (!response.ok) {
        throw new Error('Failed to fetch universes');
      }
      return response.json();
    }
  });

  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['companies'], 
    queryFn: async () => {
      const response = await fetch('/api/framework/companies');
      if (!response.ok) throw new Error('Failed to fetch companies');
      return response.json();
    }
  });
  console.log(companies);

  const { data: divisions = [], isLoading: divisionsLoading } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const response = await fetch('/api/framework/divisions');
      if (!response.ok) throw new Error('Failed to fetch divisions');
      return response.json();
    }
  });
  console.log(divisions);

  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await fetch('/api/framework/departments');
      if (!response.ok) throw new Error('Failed to fetch departments');
      return response.json();
    }
  });
  console.log(departments);

  const { data: workTeams = [], isLoading: workTeamsLoading } = useQuery({
    queryKey: ['work-teams'],
    queryFn: async () => {
      const response = await fetch('/api/framework/work-teams');
      if (!response.ok) throw new Error('Failed to fetch work teams');
      return response.json();
    }
  });
  console.log(workTeams);

  const { data: cities = [] } = useQuery({
    queryKey: ['/api/framework/cities'],
    queryFn: async () => {
      const response = await fetch('/api/framework/cities');
      if (!response.ok) throw new Error('Failed to fetch cities');
      return response.json();
    }
  });

  // Mutations
  const createUniverseMutation = useMutation({
    mutationFn: async (data: Omit<Universe, 'UniverseID'>) => {
      const response = await fetch('/api/framework/universes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Failed to create universe');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Universe created successfully');
      setIsCreateDialogOpen(false);
      universeForm.reset();
      queryClient.invalidateQueries({ queryKey: ['universes'] });
    },
    onError: (error: any) => {
      toast.error('Duplicate Universe');
    }
  });

  const updateUniverseMutation = useMutation({
    // Accept the universe id as string and allow partial/unified payload
    mutationFn: async ({ id, data }: { id: string; data: Omit<Universe, 'UniverseID'> }) => {
      const response = await fetch(`/api/framework/universes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update universe');
      return response.json();
    },
    onSuccess: () => {
      toast.success('universe updated successfully');
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['universes'] });
    },
    onError: (error: any) => {
      toast.error('Duplicate Universe');
    }
  });

  const deleteUniverseMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/framework/universes/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete universe');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['universes'] });
      toast.success('Universe deleted successfully');
    },
    onError: () => {
      toast.error('Failed to Delete Universe');
    }
  });

  const handleUniverseEdit = (item: Universe) => {
    console.log('Opening edit dialog for Universe', item);
    setEditingItem({ ...item, type: 'universe' });
    universeForm.reset({
      UniverseName: item.UniverseName || '',
      Description: item.Description || '',
      IsActive: item.IsActive ?? true
    });
    setIsEditDialogOpen(true);
  };

  const createCompanyMutation = useMutation({
    mutationFn: async (data: z.infer<typeof companySchema>) => {
      const response = await fetch('/api/framework/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      // Parse and throw error message if the response is not OK
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData?.error || 'duplicate email or phonenumber or company name create company'
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setIsCreateDialogOpen(false);
      companyForm.reset();
      toast.success('Company created successfully');
    },
    onError: (error: any) => {
      // Show specific error message from the backend
      toast.error('Duplicate Company');
    }
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof companySchema> }) => {
      const response = await fetch(`/api/framework/companies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || 'Failed to update company');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Company updated successfully');
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error('Duplicate Company');
    }
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/framework/companies/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete company');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Company deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete company');
    }
  });

  const createDivisionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof divisionSchema>) => {
      const response = await fetch('/api/framework/divisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create division');
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['divisions'] });
      setIsCreateDialogOpen(false);
      divisionForm.reset();
      toast.success('Division created successfully');
    },
    onError: (error: any) => {
      toast.error('Duplicate Division');
    }
  });

  const updateDivisionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof divisionSchema> }) => {
      const response = await fetch(`/api/framework/divisions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || 'Failed to update division');
      }

      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['divisions'] }); 
      toast.success('Division updated successfully');
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error('Duplicate Division');
    }
  });

  //  Delete Division
  const deleteDivisionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/framework/divisions/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete division');
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['divisions'] });
      toast.success('Division deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete Division');
    }
  });

  const createDepartmentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof departmentSchema>) => {
      const response = await fetch('/api/framework/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error('Failed to create department');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department created successfully');
      setIsCreateDialogOpen(false);
    },
    onError: () => {
      toast.error('Duplicate Department');
    }
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Department> }) => {
      const response = await fetch(`/api/framework/departments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error('Failed to update department');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsEditDialogOpen(false); // <--- Close modal
      setEditingItem(null); // <--- Optional, to reset state
      toast.success('Department updated successfully');
    },

    onError: () => {
      toast.error('Duplicate Department');
    }
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/framework/departments/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete department');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete Deparment');
    }
  });

  const createWorkTeamMutation = useMutation({
    mutationFn: async (data: z.infer<typeof workTeamSchema>) => {
      const response = await fetch('/api/framework/work-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create work team');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-teams'] });
      setIsCreateDialogOpen(false);
      workTeamForm.reset();
      toast.success('Work team created successfully');
    },
    onError: () => {
      toast.error('Duplicate Work Team');
    }
  });

  const updateWorkTeamMutation = useMutation({
    mutationFn: async (data: z.infer<typeof workTeamSchema> & { WorkTeamID: number }) => {
      const response = await fetch(`/api/framework/work-teams/${data.WorkTeamID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update work team');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-teams'] });
      setIsEditDialogOpen(false);
      workTeamForm.reset();
      toast.success('Work team updated successfully');
    },
    onError: () => {
      toast.error('Duplicate Work Team');
    }
  });
  const deleteWorkTeamMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/framework/work-teams/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete work team');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-teams'] });
      toast.success('WorkTeam deleted successfully');
    },
    onError: () => {
      toast.error('failed to delete Workteam');
    }
  });
  // const deleteWorkTeamMutation = useMutation({
  //   mutationFn: async (id: number) => {
  //     const response = await fetch(`/api/framework/workteams/${id}`, {
  //       method: 'DELETE'
  //     });

  //     if (!response.ok) throw new Error('Failed to delete work team');
  //     return response.json();
  //   },
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['work-teams'] });
  //     toast.success('WorkTeam deleted successfully');
  //   },
  //   onError: () => {
  //     toast.error('Falied to Delete WorkTeam');
  //   }
  // });

  const handleEdit = (item: any, type: string) => {
    setEditingItem({ ...item, type });

    if (type === 'companies') {
      // const matchedCity = cities.find((c) => c.CityID === item.CityID);
      // const matchedUniverse = universes.find((u) => u.UniverseID === item.UniverseID);
      const matchedCity = cities.find((c: City) => c.CityID === item.CityID);
      const matchedUniverse = universes.find((u: Universe) => u.UniverseID === item.UniverseID);

      companyForm.reset({
        CompanyCode: item.CompanyCode || '',
        CompanyName: item.CompanyName || '',
        Address: item.Address || '',
        Email: item.Email || '',
        Website: item.Website || '',
        IsActive: item.IsActive ?? true,

        //  set both CityID and CityName
        CityID: item.CityID ?? null,
        CityName: matchedCity?.CityName || item.CityName || '',

        //  set both UniverseID and UniverseName
        UniverseID: item.UniverseID || '',
        UniverseName: matchedUniverse?.UniverseName || item.UniverseName || ''
      });
    }

    setIsEditDialogOpen(true); //  Open dialog after reset
  };

  const handleDivisionEdit = (item: any, type: string) => {
    setEditingItem({ ...item, type });

    if (type === 'divisions') {
      divisionForm.reset({
        CompanyID: item.CompanyID ?? 0,
        DivisionName: item.DivisionName || '',
        DivisionCode: item.DivisionCode || '',
        Description: item.Description || '',
        IsActive: item.IsActive ?? true
      });
    }
    setIsEditDialogOpen(true);
  };

  const handleWorkTeamEdit = (item: any) => {
    console.log('Editing WorkTeam:', item);

    // Find matching Company and Division IDs (with types)
    const selectedCompany = companies.find(
      (company: { CompanyID: number; CompanyName: string }) =>
        company.CompanyName === item.CompanyName
    );

    const selectedDivision = divisions.find(
      (division: { DivisionID: number; DivisionName: string }) =>
        division.DivisionName === item.DivisionName
    );

    const selectedDepartment = departments.find(
      (dept: { DepartmentID: number; DepartmentName: string }) =>
        dept.DepartmentName === item.DepartmentName
    );

    // Reset the form with the correct data
    workTeamForm.reset({
      CompanyID: selectedCompany?.CompanyID ?? '',
      DivisionID: selectedDivision?.DivisionID ?? '',
      DepartmentID: selectedDepartment?.DepartmentID ?? '',
      DepartmentName: selectedDepartment?.DepartmentName ?? '',
      WorkTeamName: item.WorkTeamName || '',
      Description: item.Description || '',
      IsActive: item.IsActive ?? true
    });

    setEditingItem({ ...item, type: 'workteams' });
    setIsEditDialogOpen(true);

    console.log('Form after reset:', workTeamForm.getValues());
  };

  useEffect(() => {
    if (editingItem?.type === 'departments' && isEditDialogOpen) {
      console.log('Resetting departmentForm with:', editingItem);
      departmentForm.reset({
        CompanyID: editingItem.CompanyID ?? 0,
        DivisionID: editingItem.DivisionID ?? 0,
        DepartmentName: editingItem.DepartmentName ?? '',
        Description: editingItem.Description ?? '',
        IsActive: editingItem.IsActive ?? true
      });
    }
  }, [editingItem, isEditDialogOpen]);

  const handleDepartmentEdit = (item: Department) => {
    setEditingItem({ ...item, type: 'departments' });
    setIsEditDialogOpen(true);
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // export and import
  const handleExport = () => {
    let exportData: object[] = [];

    if (activeTab === 'companies') exportData = companies;
    if (activeTab === 'departments') exportData = departments;
    if (activeTab === 'divisions') exportData = divisions;
    if (activeTab === 'workTeams') exportData = workTeams;

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `Exported_${activeTab}.xlsx`);
  };

  type ImportedFileData = {
    file: File;
    content: string[][];
  };

  const parseCSV = (text: string): string[][] => {
    return text
      .trim()
      .split('\n')
      .map((line) => line.split(','));
  };

  // filter
  const filteredUniverses = universes.filter((universe: Universe) => {
    const matchesSearch = universe.UniverseName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && universe.IsActive) || // assuming `IsActive` exists
      (statusFilter === 'inactive' && !universe.IsActive);

    return matchesSearch && matchesStatus;
  });

  const [selectedLevel, setSelectedLevel] = useState<'company' | 'division' | 'department' | null>(
    null
  );
  const [selectedCompanies, setSelectedCompanies] = useState<Set<number>>(new Set());
  const [selectedDivisions, setSelectedDivisions] = useState<Set<number>>(new Set());
  const [selectedDepartments, setSelectedDepartments] = useState<Set<number>>(new Set());
  const selectedCompanyID =
    selectedCompanies.size > 0 ? (selectedCompanies.values().next().value ?? null) : null;
  const [selectedWorkTeams, setSelectedWorkTeams] = useState<Set<number>>(new Set());

  //  Universe filter for Add Form
  const filteredUniversesForForm = useMemo(() => {
    // If a specific universe is selected
    if (selectedUniverse) {
      return universes.filter((u: Universe) => u.UniverseID === selectedUniverse);
    }

    //  If companies are selected → show universes those companies belong to
    if (selectedCompanies.size > 0) {
      const selectedUniverseIDs = new Set<string>(
        companies
          .filter((c: Company) => c.CompanyID !== undefined && selectedCompanies.has(c.CompanyID))
          .map((c: Company) => c.UniverseID)
          .filter((id: string | undefined): id is string => id !== undefined)
      );
      return universes.filter(
        (u: Universe) => u.UniverseID !== undefined && selectedUniverseIDs.has(u.UniverseID)
      );
    }

    // If divisions are selected → find companies → then universes
    if (selectedDivisions.size > 0) {
      const relatedCompanyIDs = new Set<number>(
        divisions
          .filter(
            (d: Division) => d.DivisionID !== undefined && selectedDivisions.has(d.DivisionID)
          )
          .map((d: Division) => d.CompanyID)
          .filter((id: number | undefined): id is number => id !== undefined)
      );

      const selectedUniverseIDs = new Set<string>(
        companies
          .filter((c: Company) => c.CompanyID !== undefined && relatedCompanyIDs.has(c.CompanyID))
          .map((c: Company) => c.UniverseID)
          .filter((id: string | undefined): id is string => id !== undefined)
      );

      return universes.filter(
        (u: Universe) => u.UniverseID !== undefined && selectedUniverseIDs.has(u.UniverseID)
      );
    }

    //  If departments are selected → derive from divisions → companies → universes
    if (selectedDepartments.size > 0) {
      const relatedDivisionIDs = new Set<number>(
        departments
          .filter(
            (dep: Department) =>
              dep.DepartmentID !== undefined && selectedDepartments.has(dep.DepartmentID)
          )
          .map((dep: Department) => dep.DivisionID)
          .filter((id: number | undefined): id is number => id !== undefined)
      );

      const relatedCompanyIDs = new Set<number>(
        divisions
          .filter(
            (div: Division) =>
              div.DivisionID !== undefined && relatedDivisionIDs.has(div.DivisionID)
          )
          .map((div: Division) => div.CompanyID)
          .filter((id: number | undefined): id is number => id !== undefined)
      );

      const selectedUniverseIDs = new Set<string>(
        companies
          .filter((c: Company) => c.CompanyID !== undefined && relatedCompanyIDs.has(c.CompanyID))
          .map((c: Company) => c.UniverseID)
          .filter((id: string | undefined): id is string => id !== undefined)
      );

      return universes.filter(
        (u: Universe) => u.UniverseID !== undefined && selectedUniverseIDs.has(u.UniverseID)
      );
    }

    //  Default → all universes
    return universes;
  }, [
    universes,
    selectedUniverse,
    selectedCompanies,
    selectedDivisions,
    selectedDepartments,
    divisions,
    departments,
    companies
  ]);

  //  Company checkbox
  function handleCompanyCheckbox(companyId: number) {
    setSelectedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) next.delete(companyId);
      else next.add(companyId);
      return next;
    });
  }

  // Division checkbox
  const handleDivisionCheckbox = (divisionID: number) => {
    setSelectedLevel('division');
    setSelectedDivisions((prev) => {
      const newSet = new Set(prev);
      newSet.has(divisionID) ? newSet.delete(divisionID) : newSet.add(divisionID);
      return newSet;
    });

    // Clear higher/lower selections
    setSelectedCompanies(new Set());
    setSelectedDepartments(new Set());
  };

  //  Department checkbox
  const handleDepartmentCheckbox = (departmentID: number) => {
    setSelectedLevel('department');
    setSelectedDepartments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(departmentID)) newSet.delete(departmentID);
      else newSet.add(departmentID);
      return newSet;
    });

    // Clear higher-level selections
    setSelectedCompanies(new Set());
    setSelectedDivisions(new Set());
  };

  // Tab Change Handler
  const handleTabChange = (tab: TabKey): void => {
    setActiveTab(tab);

    if (tab === 'companies') setSelectedLevel('company');
    else if (tab === 'divisions') setSelectedLevel('division');
    else if (tab === 'departments') setSelectedLevel('department');
    else if (tab === 'workTeams') setSelectedLevel('department');
  };

  // 1Companies
  const filteredCompanies = companies.filter((company: Company) => {
    // UniverseID in DB is GUID (string), so convert both sides to string for equality
    const matchesUniverse =
      !selectedUniverse ||
      String(company.UniverseID).toLowerCase() === String(selectedUniverse).toLowerCase();

    const matchesSearch =
      company.CompanyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.CompanyCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && company.IsActive) ||
      (statusFilter === 'inactive' && !company.IsActive);

    return matchesUniverse && matchesSearch && matchesStatus;
  });

  //  Divisions
  const filteredDivisions = divisions.filter((division: Division) => {
    const company = companies.find((c: Company) => c.CompanyID === division?.CompanyID);
    if (!company) return false;

    const matchesUniverse =
      !selectedUniverse ||
      String(company.UniverseID).toLowerCase() === String(selectedUniverse).toLowerCase();

    const matchesSearch =
      division.DivisionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      division.DivisionCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && division.IsActive) ||
      (statusFilter === 'inactive' && !division.IsActive);

    const matchesCompany =
      selectedCompanies.size === 0 ||
      (division.CompanyID !== undefined && selectedCompanies.has(division.CompanyID));

    return matchesUniverse && matchesSearch && matchesStatus && matchesCompany;
  });

  //  Departments
  const filteredDepartments = departments
    .filter((department: Department | undefined) => {
      if (!department || department.DivisionID == null) return false;

      const division = divisions.find((d: Division) => d && d.DivisionID === department.DivisionID);

      const company = division
        ? companies.find((c: Company) => c && c.CompanyID === division.CompanyID)
        : undefined;

      const matchesUniverse =
        !selectedUniverse ||
        String(company?.UniverseID).toLowerCase() === String(selectedUniverse).toLowerCase();

      const matchesSearch =
        department.DepartmentName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && department.IsActive) ||
        (statusFilter === 'inactive' && !department.IsActive);

      const matchesDivision =
        selectedDivisions.size === 0 || selectedDivisions.has(department.DivisionID);

      return matchesUniverse && matchesSearch && matchesStatus && matchesDivision;
    })
    .filter(Boolean);

  //  Work Teams
  const filteredWorkTeams = workTeams.filter((team: WorkTeam) => {
    const department = departments.find(
      (d: Department) => d.DepartmentName === team.DepartmentName
    );
    const division = divisions.find((dv: Division) => dv.DivisionName === team.DivisionName);
    const company = companies.find((c: Company) => c.CompanyName === team.CompanyName);

    const matchesUniverse =
      !selectedUniverse ||
      String(company?.UniverseID).toLowerCase() === String(selectedUniverse).toLowerCase();

    const matchesSearch = (team.WorkTeamName || '')
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && team.IsActive) ||
      (statusFilter === 'inactive' && !team.IsActive);

    const matchesCompany =
      selectedCompanies.size === 0 || (company && selectedCompanies.has(company.CompanyID));

    const matchesDivision =
      selectedDivisions.size === 0 || (division && selectedDivisions.has(division.DivisionID));

    const matchesDepartment =
      selectedDepartments.size === 0 ||
      (department && selectedDepartments.has(department.DepartmentID));

    if (selectedLevel === 'company') {
      return matchesUniverse && matchesSearch && matchesStatus && matchesCompany;
    } else if (selectedLevel === 'division') {
      return matchesUniverse && matchesSearch && matchesStatus && matchesDivision;
    } else if (selectedLevel === 'department') {
      return matchesUniverse && matchesSearch && matchesStatus && matchesDepartment;
    } else {
      return matchesUniverse && matchesSearch && matchesStatus;
    }
  });

  const selectedCompanyId = workTeamForm.watch('CompanyID') || departmentForm.watch('CompanyID');

  const filteredCompaniesForForm = useMemo(() => {
    //  If specific companies are selected → show only those
    if (selectedCompanies.size > 0) {
      return companies.filter(
        (c: Company) => c.CompanyID !== undefined && selectedCompanies.has(c.CompanyID)
      );
    }

    //  If specific divisions are selected → show only the companies of those divisions
    if (selectedDivisions.size > 0) {
      const companyIDs = new Set<number>(
        divisions
          .filter(
            (div: Division) => div.DivisionID !== undefined && selectedDivisions.has(div.DivisionID)
          )
          .map((div: Division) => div.CompanyID)
          .filter((id: number | undefined): id is number => id !== undefined)
      );
      return companies.filter(
        (c: Company) => c.CompanyID !== undefined && companyIDs.has(c.CompanyID)
      );
    }

    //  If specific departments are selected → show companies from those departments
    if (selectedDepartments.size > 0) {
      const companyIDs = new Set<number>(
        departments
          .filter(
            (dep: Department) =>
              dep.DepartmentID !== undefined && selectedDepartments.has(dep.DepartmentID)
          )
          .map((dep: Department) => {
            const div = divisions.find(
              (d: Division) => d.DivisionID !== undefined && d.DivisionID === dep.DivisionID
            );
            return div?.CompanyID;
          })
          .filter((id: number | undefined): id is number => id !== undefined)
      );
      return companies.filter(
        (c: Company) => c.CompanyID !== undefined && companyIDs.has(c.CompanyID)
      );
    }

    //  Default → show all companies
    return companies;
  }, [
    companies,
    divisions,
    departments,
    selectedCompanies,
    selectedDivisions,
    selectedDepartments
  ]);

  const filteredDivisionsForForm = divisions.filter(
    (div: Division) => !selectedCompanyId || div.CompanyID === Number(selectedCompanyId)
  );

  const filteredDivisionsForWorkTeam = useMemo(() => {
    if (!selectedCompanyId) return divisions;
    return divisions.filter((div: Division) => div.CompanyID === selectedCompanyId);
  }, [divisions, selectedCompanyId]);

  const filteredWorkTeamsForForm = useMemo(() => {
    //  If department selected → only show work teams from those departments
    if (selectedDepartments.size > 0) {
      return workTeams.filter(
        (w: WorkTeam) => w.DepartmentID !== undefined && selectedDepartments.has(w.DepartmentID)
      );
    }

    //  If division selected → teams from departments under that division
    if (selectedDivisions.size > 0) {
      const selectedDeptIDs = new Set<number>(
        departments
          .filter(
            (dep: Department) =>
              dep.DivisionID !== undefined && selectedDivisions.has(dep.DivisionID)
          )
          .map((dep: Department) => dep.DepartmentID)
          .filter((id: number | undefined): id is number => id !== undefined)
      );

      return workTeams.filter(
        (w: WorkTeam) => w.DepartmentID !== undefined && selectedDeptIDs.has(w.DepartmentID)
      );
    }

    //  If company selected → teams from company’s divisions
    if (selectedCompanies.size > 0) {
      const selectedDeptIDs = new Set<number>(
        departments
          .filter((dep: Department) => {
            const division = divisions.find(
              (div: Division) => div.DivisionID !== undefined && div.DivisionID === dep.DivisionID
            );
            return (
              division !== undefined &&
              division.CompanyID !== undefined &&
              selectedCompanies.has(division.CompanyID)
            );
          })
          .map((dep: Department) => dep.DepartmentID)
          .filter((id: number | undefined): id is number => id !== undefined)
      );

      return workTeams.filter(
        (w: WorkTeam) => w.DepartmentID !== undefined && selectedDeptIDs.has(w.DepartmentID)
      );
    }

    //  Default → show all work teams
    return workTeams;
  }, [
    workTeams,
    selectedDepartments,
    selectedDivisions,
    selectedCompanies,
    divisions,
    departments
  ]);
  const filteredDepartmentsForForm = useMemo(() => {
    const selectedCompanyID = workTeamForm.watch('CompanyID');

    //  1. If specific Department(s) selected → show only them
    if (selectedDepartments.size > 0) {
      return departments.filter(
        (d: Department) => d.DepartmentID !== undefined && selectedDepartments.has(d.DepartmentID)
      );
    }

    //  2. If specific Division(s) selected → show only departments under those divisions
    if (selectedDivisions.size > 0) {
      return departments.filter(
        (d: Department) => d.DivisionID !== undefined && selectedDivisions.has(d.DivisionID)
      );
    }

    //  3. If specific Company selected (from WorkTeam form) → show only that company's departments
    if (selectedCompanyID) {
      // find all divisions that belong to that company
      const divisionIDsForCompany = divisions
        .filter(
          (div: Division) =>
            div.CompanyID !== undefined && div.CompanyID === Number(selectedCompanyID)
        )
        .map((div: Division) => div.DivisionID)
        .filter((id: number | undefined): id is number => id !== undefined);

      return departments.filter(
        (dep: Department) =>
          dep.DivisionID !== undefined && divisionIDsForCompany.includes(dep.DivisionID)
      );
    }

    //  4. Default → show all departments
    return departments;
  }, [
    departments,
    divisions,
    selectedDepartments,
    selectedDivisions,
    workTeamForm.watch('CompanyID')
  ]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (!data) {
        setIsParsing(false);
        return;
      }
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.csv')) {
        if (typeof data === 'string') {
          const content = parseCSV(data);
          setImportedTabs((prev) => ({
            ...prev,
            [activeTab]: { file, content }
          }));
          setIsParsing(false);
        } else {
          setIsParsing(false);
        }
      } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
        try {
          // If data is ArrayBuffer or binary string
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const content: string[][] = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: ''
          });
          setImportedTabs((prev) => ({
            ...prev,
            [activeTab]: { file, content }
          }));
        } catch (error) {
          console.error('Error parsing Excel file:', error);
        } finally {
          setIsParsing(false);
        }
      } else {
        // unsupported file type
        setIsParsing(false);
      }
    };

    if (file.name.toLowerCase().endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

const openCreate = () => {
  //  Must clear editing item first
  setEditingItem(null);

  //  Must close edit dialog before opening add dialog
  setIsEditDialogOpen(false);

  // 3 Open Add dialog
  setIsCreateDialogOpen(true);

  //  Reset all forms with proper default values
  universeForm.reset({
    UniverseName: '',
    Description: '',
    IsActive: true,
  });

  companyForm.reset({
    CompanyCode: '',
    CompanyName: '',
    Address: '',
    Email: '',
    Website: '',
    CityID: null,
    CityName: '',
    UniverseID: '',
    UniverseName: '',
    IsActive: true,
  });

  divisionForm.reset({
    CompanyID: 0,
    DivisionName: '',
    DivisionCode: '',
    Description: '',
    IsActive: true,
  });

  departmentForm.reset({
    CompanyID: 0,
    DivisionID: 0,
    DepartmentName: '',
    Description: '',
    IsActive: true,
  });

  workTeamForm.reset({
    CompanyID: undefined,
    DivisionID: undefined,
    DepartmentID: undefined,
    DepartmentName: '',
    WorkTeamName: '',
    Description: '',
    IsActive: true,
  });
};

  function capitalizeFirstLetter(str: string | null | undefined): string {
    if (!str) return 'Unknown';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  const Total_tables: number[] = [
    universes.length,
    companies.length,
    divisions.length,
    departments.length,
    workTeams.length
  ];
  const labels: string[] = ['universes', 'companies', 'divisions', 'departments', 'Workteams'];
  const colors: string[] = [
    'var(--tw-primary)',
    'var(--tw-success)',
    'var(--tw-purpleCustom)',
    'var(--tw-warning)',
    'var(--tw-danger)'
  ];
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

  //Universe Table Values
  const universeColumns = [
    { key: 'UniverseName', label: 'Universe Name' },

    {
      key: 'Description',
      label: 'Description',
      render: (u: any) => u.Description || '-'
    },

    {
      key: 'IsActive',
      label: 'IsActive',
      render: (u: any) => (
        <span
          className={`px-2 py-1 rounded-full ${
            u.IsActive ? 'bg-success text-white' : 'bg-danger text-white'
          }`}
        >
          {u.IsActive ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ];
  // Company Table values
  const companyColumns = [
    // SELECT CHECKBOX
    {
      key: 'Select',
      label: 'Select',
      render: (company: any) => (
        <input
          type="checkbox"
          checked={selectedCompanies.has(company.CompanyID)}
          onChange={() => handleCompanyCheckbox(company.CompanyID)}
        />
      )
    },

    // CITY NAME
    {
      key: 'CityName',
      label: 'City Name',
      render: (c: any) => capitalizeFirstLetter(c.CityName || '-')
    },

    // COMPANY CODE
    { key: 'CompanyCode', label: 'Company Code' },

    // COMPANY TYPE (CompanyName)
    {
      key: 'CompanyName',
      label: 'Company Type',
      render: (c: any) => capitalizeFirstLetter(c.CompanyName)
    },

    // ADDRESS
    {
      key: 'Address',
      label: 'Address',
      render: (c: any) => capitalizeFirstLetter(c.Address || '-')
    },

    // EMAIL
    {
      key: 'Email',
      label: 'Email',
      render: (c: any) => c.Email || '-'
    },

    // WEBSITE COLUMN (Visit link)
    {
      key: 'Website',
      label: 'Website',
      render: (c: any) =>
        c.Website ? (
          <a
            href={c.Website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            Visit
          </a>
        ) : (
          '-'
        )
    },

    // UNIVERSE
    {
      key: 'UniverseName',
      label: 'Universe',
      render: (c: any) => c.UniverseName || c.UniverseID || '-'
    },

    // STATUS
    {
      key: 'IsActive',
      label: 'Status',
      render: (c: any) => (
        <span
          className={`px-2 py-1 rounded-full ${
            c.IsActive ? 'bg-success text-white' : 'bg-danger text-white'
          }`}
        >
          {c.IsActive ? 'Active' : 'Inactive'}
        </span>
      )
    },

    // CREATED DATE
    {
      key: 'CreatedDate',
      label: 'Created Date',
      render: (c: any) => (c.CreatedDate ? new Date(c.CreatedDate).toLocaleDateString() : '-')
    },

    // UPDATED DATE
    {
      key: 'UpdatedDate',
      label: 'Updated Date',
      render: (c: any) => (c.UpdatedDate ? new Date(c.UpdatedDate).toLocaleDateString() : '-')
    }
  ];
  // division Table Values
  const divisionColumns = [
    // SELECT CHECKBOX
    {
      key: 'Select',
      label: 'Select',
      render: (division: any) => (
        <input
          type="checkbox"
          checked={division.DivisionID !== undefined && selectedDivisions.has(division.DivisionID)}
          onChange={() => {
            if (division.DivisionID !== undefined) {
              handleDivisionCheckbox(division.DivisionID);
            }
          }}
        />
      )
    },

    // DIVISION CODE
    {
      key: 'DivisionCode',
      label: 'Division Code',
      render: (d: any) => d.DivisionCode || '-'
    },

    // DIVISION NAME
    {
      key: 'DivisionName',
      label: 'Division Name',
      render: (d: any) => capitalizeFirstLetter(d.DivisionName || '-')
    },

    // COMPANY NAME (lookup from companies list)
    {
      key: 'CompanyName',
      label: 'Company Name',
      render: (d: any) => {
        const company = companies.find((c: any) => c.CompanyID === d.CompanyID);
        return capitalizeFirstLetter(company?.CompanyName || '-');
      }
    },

    // DESCRIPTION
    {
      key: 'Description',
      label: 'Description',
      render: (d: any) => capitalizeFirstLetter(d.Description || '-')
    },

    // STATUS
    {
      key: 'IsActive',
      label: 'Status',
      render: (d: any) => (
        <span
          className={`px-2 py-1 rounded-full ${
            d.IsActive ? 'bg-success text-white' : 'bg-danger text-white'
          }`}
        >
          {d.IsActive ? 'Active' : 'Inactive'}
        </span>
      )
    },

    // CREATED DATE
    {
      key: 'CreatedDate',
      label: 'Created Date',
      render: (d: any) => (d.CreatedDate ? new Date(d.CreatedDate).toLocaleDateString() : '-')
    },

    // UPDATED DATE
    {
      key: 'UpdatedDate',
      label: 'Updated Date',
      render: (d: any) => (d.UpdatedDate ? new Date(d.UpdatedDate).toLocaleDateString() : '-')
    }
  ];
  // Department Table Values

  const departmentColumns = [
    // SELECT CHECKBOX
    {
      key: 'Select',
      label: 'Select',
      render: (department: any) => {
        const division = divisions.find((d: any) => d.DivisionID === department.DivisionID);

        return (
          <input
            type="checkbox"
            checked={
              division?.DivisionID !== undefined && selectedDivisions.has(division.DivisionID)
            }
            onChange={() => {
              if (division?.DivisionID !== undefined) {
                handleDivisionCheckbox(division.DivisionID);
              }
            }}
          />
        );
      }
    },

    // DEPARTMENT NAME
    {
      key: 'DepartmentName',
      label: 'Department Name',
      render: (d: any) => capitalizeFirstLetter(d.DepartmentName)
    },

    // COMPANY NAME (lookup from divisions -> companies)
    {
      key: 'CompanyName',
      label: 'Company Name',
      render: (department: any) => {
        const division = divisions.find((d: any) => d.DivisionID === department.DivisionID);
        const company = companies.find((c: any) => c.CompanyID === division?.CompanyID);
        return capitalizeFirstLetter(company?.CompanyName || '-');
      }
    },

    // DIVISION NAME
    {
      key: 'DivisionName',
      label: 'Division Name',
      render: (department: any) => {
        const division = divisions.find((d: any) => d.DivisionID === department.DivisionID);
        return capitalizeFirstLetter(division?.DivisionName || '-');
      }
    },

    // DESCRIPTION
    {
      key: 'Description',
      label: 'Description',
      render: (d: any) => capitalizeFirstLetter(d.Description || '-')
    },

    // STATUS
    {
      key: 'IsActive',
      label: 'Status',
      render: (d: any) => (
        <span
          className={`px-2 py-1 rounded-full ${
            d.IsActive ? 'bg-success text-white' : 'bg-danger text-white'
          }`}
        >
          {d.IsActive ? 'Active' : 'Inactive'}
        </span>
      )
    },

    // CREATED DATE
    {
      key: 'CreatedDate',
      label: 'Created Date',
      render: (d: any) => (d.CreatedDate ? new Date(d.CreatedDate).toLocaleDateString() : '-')
    },

    // UPDATED DATE
    {
      key: 'UpdatedDate',
      label: 'Updated Date',
      render: (d: any) => (d.UpdatedDate ? new Date(d.UpdatedDate).toLocaleDateString() : '-')
    }
  ];

  // WorkTeam Table Values

  const workTeamColumns = [
    // TEAM NAME
    {
      key: 'WorkTeamName',
      label: 'Team Name',
      render: (t: any) => capitalizeFirstLetter(t.WorkTeamName)
    },

    // COMPANY NAME (you are already storing CompanyName inside team)
    {
      key: 'CompanyName',
      label: 'Company',
      render: (t: any) => capitalizeFirstLetter(t.CompanyName || '-')
    },

    // DIVISION NAME (comes directly from workTeam)
    {
      key: 'DivisionName',
      label: 'Division',
      render: (t: any) => capitalizeFirstLetter(t.DivisionName || '-')
    },

    // DEPARTMENT NAME (comes directly from workTeam)
    {
      key: 'DepartmentName',
      label: 'Department',
      render: (t: any) => capitalizeFirstLetter(t.DepartmentName || '-')
    },

    // DESCRIPTION
    {
      key: 'Description',
      label: 'Description',
      render: (t: any) => capitalizeFirstLetter(t.Description || '-')
    },

    // CREATED AT
    {
      key: 'CreatedAt',
      label: 'CreatedAt',
      render: (t: any) => t.CreatedAt?.slice(0, 10) || '-'
    },

    // UPDATED AT
    {
      key: 'UpdatedAt',
      label: 'UpdatedAt',
      render: (t: any) => t.UpdatedAt?.slice(0, 10) || '-'
    },

    // STATUS
    {
      key: 'IsActive',
      label: 'Status',
      render: (t: any) => (
        <span
          className={`px-2 py-1 rounded-full ${
            t.IsActive ? 'bg-success text-white' : 'bg-danger text-white'
          }`}
        >
          {t.IsActive ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ];

  const renderImportView = () => {
    const fileData = importedTabs[activeTab];
    if (!fileData || !fileData.content.length) return null;

    const [headers, ...allRows] = fileData.content;
    const rowsToDisplay = allRows.slice(0, 500);

    return (
      <div className="card-table scrollable-x-auto">
        <table className="table min-w-full table-auto">
          <thead>
            <tr className="text-left">
              {headers.map((header: string, idx: number) => (
                <th key={idx} className="px-3 py-7">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowsToDisplay.map((row: string[], rowIdx: number) => (
              <tr
                key={rowIdx}
                className={`text-left ${rowIdx % 2 === 0 ? '' : 'bg-gray-100'} hover:bg-gray-100`}
              >
                {row.map((cell: string, colIdx: number) => (
                  <td key={colIdx} className="px-3 py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}

            {allRows.length > 500 && (
              <tr>
                <td colSpan={headers.length} className="px-3 py-3">
                  …displaying first 500 of {allRows.length} rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };
  return (
    <div className="w-full p-6 space-y-6 card ">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold dark:text-white">Organizational Management</h1>
            <p className="text-md text-gray-500 dark:text-gray-600 ">
              Manage companies, divisions, departments, and work teams with Azure SQL Server
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ImportExport onExport={handleExport} onImport={handleFileChange} />
        </div>
      </div>
      {/* Top row: 4 solid color panels — responsive: 1 → 2 → 3 → 4 */}
      <div className="p-4 pb-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 3xl:grid-cols-6 gap-6">
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
        {/* Universe */}
        <div className="card p-6 flex items-center justify-center  text-white bg-primary">
          {/* Top Icon */}
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <i className="ki-solid ki-design-1 xl:text-3xl text-3xl text-bold"></i>
          </div>

          {/* Bottom Content */}
          <div className="text-left">
            <h1 className="xl:text-2xl text-lg font-bold dark:text-white">
              {universes.length} Universe
            </h1>
          </div>
        </div>

        {/*Company */}
        <div className="card p-6 flex items-center justify-center text-white bg-success">
          {/* Top Icon */}
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <i className="ki-solid ki-office-bag text-3x  xl:text-3xl text-3xl text-bold"></i>
          </div>

          {/* Bottom Content */}
          <div className="text-left">
            <h1 className="xl:text-2xl text-lg font-bold dark:text-white">
              {companies.length} companies
            </h1>
          </div>
        </div>

        {/*Division*/}

        <div className="card p-6 flex items-center justify-center text-white bg-[#BF55EC]">
          {/* Top Icon */}
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <i className="ki-solid ki-abstract-26 xl:text-3xl text-3xl text-bold"></i>
          </div>

          {/* Bottom Content */}
          <div className="text-left">
            <h1 className="xl:text-2xl text-lg font-bold dark:text-white">
              {divisions.length} Divisions
            </h1>
          </div>
        </div>

        {/* Department */}
        <div className="card p-6 flex items-center justify-center text-white bg-warning ">
          {/* Top Icon */}
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <i className="ki-solid ki-abstract-44 xl:text-3xl text-3xl text-bold"></i>
          </div>

          {/* Bottom Content */}
          <div className="text-left">
            <h1 className="xl:text-2xl text-lg font-bold dark:text-white">
              {departments.length} departments
            </h1>
          </div>
        </div>

        {/* workteam */}
        <div className="card p-6 flex items-center justify-center text-white bg-danger ">
          {/* Top Icon */}
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <i className="ki-solid ki-users xl:text-3xl text-3xl text-bold"></i>
          </div>

          {/* Bottom Content */}
          <div className="flex gap-2 text-white text-2xl font-bold mt-auto">
            <h1 className="xl:text-2xl text-lg font-bold dark:text-white">
              {workTeams.length} workTeams
            </h1>
          </div>
        </div>
      </div>
      {/* Filters row */}
      <div className="p-4 ">
        <div className="card p-4">
          <div className="grid grid-cols-1 w-full md:grid-cols-3 xl:grid-cols-5 gap-4">
            <Tabs
              tabs={[
                { label: 'Universes', value: 'universes' },
                { label: 'Companies', value: 'companies' },
                { label: 'Divisions', value: 'divisions' },
                { label: 'Departments', value: 'departments' },
                { label: 'Work Teams', value: 'workTeams' }
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
          </div>
        </div>
      </div>
      {/* Tabs */}
      <div className="p-4 pt-0">
        <div className="card p-4">
          <div className="w-full">
            {activeTab === 'universes' && (
              <div className="mb-8 2xl:mb-0">
                <h1 className="text-2xl font-bold dark:text-white">Universe Management</h1>
                <p className="text-md text-gray-500 dark:text-gray-700 ">
                  Manage Universe information with company details
                </p>
              </div>
            )}
            {activeTab === 'companies' && (
              <div className="mb-8 2xl:mb-0">
                <h1 className="text-2xl font-bold dark:text-white">Company Management</h1>
                <p className="text-md text-gray-500 dark:text-gray-700 ">
                  Manage Company information with Contact details and Location
                </p>
              </div>
            )}
            {activeTab === 'divisions' && (
              <div className="mb-8 2xl:mb-0">
                <h1 className="text-2xl font-bold dark:text-white">Divisions Management</h1>
                <p className="text-md text-gray-500 dark:text-gray-700 ">
                  Manage Divisions Within Companies
                </p>
              </div>
            )}
            {activeTab === 'departments' && (
              <div className="mb-8 2xl:mb-0">
                <h1 className="text-2xl font-bold dark:text-white">Departments Management</h1>
                <p className="text-md text-gray-500 dark:text-gray-700 ">
                  Manage Departments within division
                </p>
              </div>
            )}
            {activeTab === 'workTeams' && (
              <div className="mb-8 2xl:mb-0">
                <h1 className="text-2xl font-bold dark:text-white">WorkTeam Management</h1>
                <p className="text-md text-gray-500 dark:text-gray-700 ">
                  Manage Work Teams within Departments
                </p>
              </div>
            )}
            <div className="flex gap-3 md:gap-10 justify-between  md:gap-10  mt-4">
              <div className="input input-md w-32 xl:flex-1 md:w-48 2xl:w-60 border hover:border-blue-400 border-blue-300 md:text-md text-xs">
                <i className="ki-filled ki-magnifier"></i>
                <input
                  placeholder="Search Teams"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2 2xl:gap-10">
                <SearchFilterBar statusFilter={statusFilter} onStatusChange={setStatusFilter} />
                <button
                  className="btn btn-outline btn-primary text-xs flex items-center gap-2"
                  onClick={async () => {
                    setTableLoading(true);

                    await Promise.all([
                      queryClient.invalidateQueries({ queryKey: ['universes'] }),
                      queryClient.invalidateQueries({ queryKey: ['companies'] }),
                      queryClient.invalidateQueries({ queryKey: ['divisions'] }),
                      queryClient.invalidateQueries({ queryKey: ['departments'] }),
                      queryClient.invalidateQueries({ queryKey: ['work-teams'] })
                    ]);

                    setTimeout(() => {
                      setTableLoading(false);
                      toast.success('Tables refreshed');
                    }, 350);
                  }}
                >
                  <RefreshCw className={`md:h-5 md:w-5 h-3 w-3 ${tableLoading ? 'animate-spin' : ''}`} />
                  {tableLoading ? 'Refreshing...' : 'Refresh'}
                </button>

                <button
                  className="btn btn-primary btn-outline flex items-center gap-2 text-xs"
                  onClick={openCreate}
                >
                  <i className='ki-solid ki-plus'></i>
                  Add New
                </button>
              </div>
            </div>
          </div>
          {/* Tab content */}
          <div className="p-0 mt-5">
            {/* Countries */}
            {activeTab === 'universes' && (
              <div className="grid">
                {importedTabs.universes ? (
                  <div className="card p-4 min-w-full">
                    {/* Close icon */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => setImportedTabs((prev) => ({ ...prev, universes: null }))}
                        className="btn-outline btn-danger px-4 text-md"
                      >
                        &times;
                      </button>
                    </div>
                    <div className="card min-w-full mt-1">
                      {/* Show the imported preview table */}
                      {renderImportView()}
                    </div>
                  </div>
                ) : (
                  <div className="card min-w-full">
                    <div className="card-table scrollable-x-auto ">
                      {tableLoading || universesLoading ? (
                        <div className="p-10 text-center">
                          <RefreshCw className="h-6 w-6 animate-spin inline-block" />
                        </div>
                      ) : (
                        <DataTable
                          data={filteredUniverses}
                          columns={universeColumns}
                          rowKey={(u) => u.UniverseID}
                          onEdit={(row) => handleUniverseEdit(row)}
                          onDelete={(row) => deleteUniverseMutation.mutate(row.UniverseID)}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* States */}
            {activeTab === 'companies' && (
              <div className="grid">
                {importedTabs.companies ? (
                  <div className="card p-4 min-w-full">
                    {/* Close icon */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => setImportedTabs((prev) => ({ ...prev, companies: null }))}
                        className="btn-outline btn-danger px-4 text-md"
                      >
                        &times;
                      </button>
                    </div>
                    <div className="card min-w-full mt-1">
                      {/* Show the imported preview table */}
                      {renderImportView()}
                    </div>
                  </div>
                ) : (
                  <div className="card min-w-full">
                    <div className="card-table scrollable-x-auto">
                      {tableLoading || companiesLoading ? (
                        <div className="p-10 text-center">
                          <RefreshCw className="h-6 w-6 animate-spin inline-block" />
                        </div>
                      ) : (
                        <DataTable
                          data={filteredCompanies}
                          columns={companyColumns}
                          rowKey={(c) => c.CompanyID}
                          onEdit={(row) => handleEdit(row, 'companies')}
                          onDelete={(row) => {
                            if (row.CompanyID) deleteCompanyMutation.mutate(row.CompanyID);
                            else console.error('Company ID is undefined');
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Cities */}
            {activeTab === 'divisions' && (
              <div className="grid">
                {importedTabs.divisions ? (
                  <div className="card p-4 min-w-full">
                    {/* Close icon */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => setImportedTabs((prev) => ({ ...prev, divisions: null }))}
                        className="btn-outline btn-danger px-4 text-md"
                      >
                        &times;
                      </button>
                    </div>
                    <div className="card min-w-full mt-1">
                      {/* Show the imported preview table */}
                      {renderImportView()}
                    </div>
                  </div>
                ) : (
                  <div className="card min-w-full">
                    <div className="card-table scrollable-x-auto">
                      {tableLoading || divisionsLoading ? (
                        <div className="p-10 text-center">
                          <RefreshCw className="h-6 w-6 animate-spin inline-block" />
                        </div>
                      ) : (
                        <DataTable
                          data={filteredDivisions}
                          columns={divisionColumns}
                          rowKey={(d) => d.DivisionID}
                          onEdit={(row) => handleDivisionEdit(row, 'divisions')}
                          onDelete={(row) => deleteDivisionMutation.mutate(row.DivisionID)}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'departments' && (
              <div className="grid">
                {importedTabs.departments ? (
                  <div className="card p-4 min-w-full">
                    {/* Close icon */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => setImportedTabs((prev) => ({ ...prev, departments: null }))}
                        className="btn-outline btn-danger px-4 text-md"
                      >
                        &times;
                      </button>
                    </div>
                    <div className="card min-w-full mt-1">
                      {/* Show the imported preview table */}
                      {renderImportView()}
                    </div>
                  </div>
                ) : (
                  <div className="card min-w-full">
                    <div className="card-table scrollable-x-auto">
                      {tableLoading || departmentsLoading ? (
                        <div className="p-10 text-center">
                          <RefreshCw className="h-6 w-6 animate-spin inline-block" />
                        </div>
                      ) : (
                        <DataTable
                          data={filteredDepartments}
                          columns={departmentColumns}
                          rowKey={(d) => d.DepartmentID}
                          onEdit={(row) => handleDepartmentEdit(row)}
                          onDelete={(row) => deleteDepartmentMutation.mutate(row.DepartmentID)}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Cities */}
            {activeTab === 'workTeams' && (
              <div className="grid">
                {importedTabs.workTeams ? (
                  <div className="card p-4 min-w-full">
                    {/* Close icon */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => setImportedTabs((prev) => ({ ...prev, workTeams: null }))}
                        className="btn-outline btn-danger px-4 text-md"
                      >
                        &times;
                      </button>
                    </div>
                    <div className="card min-w-full mt-1">
                      {/* Show the imported preview table */}
                      {renderImportView()}
                    </div>
                  </div>
                ) : (
                  <div className="card min-w-full">
                    <div className="card-table scrollable-x-auto">
                      {tableLoading || workTeamsLoading ? (
                        <div className="p-10 text-center">
                          <RefreshCw className="h-6 w-6 animate-spin inline-block" />
                        </div>
                      ) : (
                        <DataTable
                          data={filteredWorkTeams}
                          columns={workTeamColumns}
                          rowKey={(t) => t.WorkTeamID}
                          onEdit={(row) => handleWorkTeamEdit(row)}
                          onDelete={(row) => deleteWorkTeamMutation.mutate(row.WorkTeamID)}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Create Modal */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 p-6 pt-60 md:pt-0 flex items-start  md:items-center justify-center">
          <div
            className="fixed inset-0 dark:bg-white/30 bg-black/60 "
            onClick={() => setIsCreateDialogOpen(false)}
          />
          <div className="bg-white dark:bg-black rounded-xl shadow-2xl w-full lg:w-3/4 xl:w-1/4 z-10 p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold dark:text-white">
                Add New {activeTab.replace('-', ' ')}
              </h3>
              <button
                className="btn btn-outline btn-danger"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                <i className="ki-filled ki-cross"></i>
              </button>
            </div>
            {/* Universe */}
            {activeTab === 'universes' && (
              <form
                {...universeForm}
                onSubmit={universeForm.handleSubmit((data) => {
                  createUniverseMutation.mutate(data);
                })}
                className="space-y-4"
              >
                <div className="dark:text-white flex flex-col gap-4 ">
                  <label className="flex flex-col">
                    <span className="text-md font-semibold ">Universe Name *</span>

                    <Controller
                      control={universeForm.control}
                      name="UniverseName"
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value)}
                          disabled={createUniverseMutation.status === 'pending'}
                          placeholder="Enter Universe Name..."
                        />
                      )}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Description</span>
                    <Controller
                      name="Description"
                      control={universeForm.control}
                      render={({ field }) => (
                        <textarea
                          className="textarea mt-1"
                          placeholder="Enter Description..."
                          {...field}
                          disabled={createUniverseMutation.status === 'pending'}
                          rows={3}
                        />
                      )}
                    />
                  </label>
                  <div className="flex items-center justify-between border p-3 rounded-md ">
                    <span className="text-md font-semibold">Active Status</span>
                    <Controller
                      control={universeForm.control}
                      name="IsActive"
                      render={({ field }) => (
                        <label className="switch mb-0">
                          <input
                            type="checkbox"
                            checked={field.value}
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
                    disabled={createUniverseMutation.status === 'pending'}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-outline btn-primary px-4 py-2 text-md"
                    disabled={createUniverseMutation.status === 'pending'}
                  >
                    {createUniverseMutation.status === 'pending'
                      ? 'Creating...'
                      : 'Create Universe'}
                  </button>
                </div>
              </form>
            )}
            {activeTab === 'companies' && (
              <form
                onSubmit={companyForm.handleSubmit((data) => {
                  console.log('Submitting Company Form:', data);
                  createCompanyMutation.mutate(data);
                })}
                className="space-y-4  dark:text-white"
              >
                <div className="flex flex-col gap-4">
                  <Controller
                    control={companyForm.control}
                    name="UniverseID"
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Universe *</span>

                        <Select
                          value={field.value || ''}
                          onValueChange={(value) => {
                            field.onChange(value);
                            const selectedUniverse = universes.find(
                              (u: Universe) => u.UniverseID === value
                            );
                            companyForm.setValue(
                              'UniverseName',
                              selectedUniverse?.UniverseName || ''
                            );
                          }}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select a universe" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:bg-black dark:text-white">
                            {filteredUniversesForForm.map((universe: Universe) => (
                              <SelectItem key={universe.UniverseID} value={universe.UniverseID}>
                                {universe.UniverseName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Company Code *</span>
                    <Controller
                      control={companyForm.control}
                      name="CompanyCode"
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="ABC, XYZ..." {...field} />
                      )}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Company Name *</span>

                    <Controller
                      control={companyForm.control}
                      name="CompanyName"
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="ABC Corporation..." {...field} />
                      )}
                    />
                  </label>
                  <Controller
                    control={companyForm.control}
                    name="CityID"
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">City Name *</span>

                        <Select
                          value={field.value ? String(field.value) : ''}
                          onValueChange={(value) => {
                            const selectedCity = cities.find(
                              (city: City) => city.CityID === Number(value)
                            );
                            field.onChange(Number(value)); //  set CityID
                            companyForm.setValue('CityName', selectedCity?.CityName || ''); // set CityName automatically
                          }}
                        >
                          <SelectTrigger className="input mt-1 ">
                            <SelectValue placeholder="Select a city" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:bg-black dark:text-white ">
                            {cities.map((city: City) => (
                              <SelectItem key={city.CityID} value={String(city.CityID)}>
                                {city.CityName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />
                  {/* <label className="flex flex-col">
                    <span className="text-md font-semibold">City ID</span>

                    <Controller
                      control={companyForm.control}
                      name="CityID"
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          value={cities.find((c: City) => c.CityID === field.value)?.CityID ?? ''}
                          disabled
                        />
                      )}
                    />
                  </label> */}

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Address</span>

                    <Controller
                      name="Address"
                      control={companyForm.control}
                      render={({ field }) => (
                        <textarea
                          placeholder="Company address..."
                          {...field}
                          className="textarea mt-1"
                          rows={3}
                        />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Email *</span>
                    <Controller
                      name="Email"
                      control={companyForm.control}
                      render={({ field }) => (
                        <input
                          type="email"
                          className="input mt-1"
                          placeholder="contact@company.com"
                          {...field}
                        />
                      )}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Website *</span>

                    <Controller
                      name="Website"
                      control={companyForm.control}
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          placeholder="https://www.company.com"
                          {...field}
                        />
                      )}
                    />
                  </label>
                  <div className="flex items-center justify-between border p-3 rounded-md gap-3">
                    <span className="text-md font-semibold">Enable this company</span>

                    <Controller
                      name="IsActive"
                      control={companyForm.control}
                      render={({ field }) => (
                        <label className="switch mb-0">
                          <input
                            type="checkbox"
                            checked={field.value}
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
                    disabled={createCompanyMutation.isPending}
                  >
                    {createCompanyMutation.isPending ? 'Creating...' : 'Create Company'}
                  </button>
                </div>
              </form>
            )}
            {activeTab === 'divisions' && (
              <form
                {...divisionForm}
                onSubmit={divisionForm.handleSubmit((data) => createDivisionMutation.mutate(data))}
                className="space-y-4 dark:text-white"
              >
                <div className="flex flex-col gap-4">
                  <Controller
                    name="CompanyID"
                    control={divisionForm.control}
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Company *</span>
                        <Select
                          value={field.value ? field.value.toString() : undefined}
                          onValueChange={(value) => field.onChange(parseInt(value, 10))}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select a company" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:bg-black dark:text-white">
                            {filteredCompaniesForForm.map((company: Company) => (
                              <SelectItem
                                key={company.CompanyID}
                                value={company.CompanyID.toString()}
                              >
                                {company.CompanyName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Division Code *</span>
                    <Controller
                      name="DivisionCode"
                      control={divisionForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="IT, HR, FIN..." {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Division Name *</span>

                    <Controller
                      name="DivisionName"
                      control={divisionForm.control}
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          placeholder="Information Technology..."
                          {...field}
                        />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Description</span>

                    <Controller
                      name="Description"
                      control={divisionForm.control}
                      render={({ field }) => (
                        <textarea
                          className="textarea mt-1"
                          placeholder="Division description..."
                          {...field}
                        />
                      )}
                    />
                  </label>

                  <div className="flex items-center justify-between border p-3 rounded-md gap-3">
                    <span className="text-md font-semibold">Enable this division</span>

                    <Controller
                      name="IsActive"
                      control={divisionForm.control}
                      render={({ field }) => (
                        <label className="switch mb-0">
                          <input
                            type="checkbox"
                            checked={field.value}
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
                    disabled={createDivisionMutation.isPending}
                  >
                    {createDivisionMutation.isPending ? 'Creating...' : 'Create Division'}
                  </button>
                </div>
              </form>
            )}
            {activeTab === 'departments' && (
              <form
                onSubmit={departmentForm.handleSubmit((data) => {
                  const selectedCompany = companies.find(
                    (c: Company) => c.CompanyID === data.CompanyID
                  );
                  const selectedDivision = divisions.find(
                    (d: Division) => d.DivisionID === data.DivisionID
                  );

                  const enrichedData = {
                    ...data,
                    CompanyName: selectedCompany?.CompanyName ?? '',
                    DivisionName: selectedDivision?.DivisionName ?? ''
                  };

                  createDepartmentMutation.mutate(enrichedData);
                })}
                className="space-y-4 dark:text-white"
              >
                <div className="flex flex-col gap-4">
                  <Controller
                    name="CompanyID"
                    control={departmentForm.control}
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Company *</span>

                        <Select
                          value={field.value ? field.value.toString() : undefined}
                          onValueChange={(value) => {
                            field.onChange(parseInt(value, 10));
                            departmentForm.setValue('DivisionID', undefined); // reset division on company change
                          }}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select a company" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:bg-black dark:text-white">
                            {filteredCompaniesForForm.map((company: Company) => (
                              <SelectItem
                                key={company.CompanyID}
                                value={company.CompanyID.toString()}
                              >
                                {company.CompanyName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />

                  <Controller
                    name="DivisionID"
                    control={departmentForm.control}
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Division *</span>

                        <Select
                          // value={field.value?.toString() || ""}
                          value={field.value ? field.value.toString() : undefined}
                          onValueChange={(value) => field.onChange(parseInt(value, 10))}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select a division" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:bg-black dark:text-white">
                            {filteredDivisionsForForm.map((div: Division) => (
                              <SelectItem key={div.DivisionID} value={div.DivisionID!.toString()}>
                                {div.DivisionName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Department Name *</span>

                    <Controller
                      name="DepartmentName"
                      control={departmentForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="Human Resources..." {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Description</span>

                    <Controller
                      name="Description"
                      control={departmentForm.control}
                      render={({ field }) => (
                        <textarea
                          className="textarea mt-1"
                          placeholder="Department description..."
                          {...field}
                          rows={3}
                        />
                      )}
                    />
                  </label>
                  <div className="flex items-center justify-between border p-3 rounded-md gap-3">
                    <span className="text-md font-semibold">Enable this department</span>

                    <Controller
                      name="IsActive"
                      control={departmentForm.control}
                      render={({ field }) => (
                        <label className="switch mb-0">
                          <input
                            type="checkbox"
                            checked={field.value}
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
                    disabled={createDepartmentMutation.isPending}
                  >
                    {createDepartmentMutation.isPending ? 'Creating...' : 'Create Department'}
                  </button>
                </div>
              </form>
            )}
            {activeTab === 'workTeams' && (
              <form
                {...workTeamForm}
                onSubmit={workTeamForm.handleSubmit((data) => {
                  // 🔹 If only department selected, auto-fill company & division
                  const selectedDepartment = departments.find(
                    (d: Department) => d.DepartmentID === data.DepartmentID
                  );
                  const selectedDivision = divisions.find(
                    (div: Division) => div.DivisionID === selectedDepartment?.DivisionID
                  );
                  const selectedCompany = companies.find(
                    (c: Company) => c.CompanyID === selectedDivision?.CompanyID
                  );

                  data.DivisionID = data.DivisionID ?? selectedDivision?.DivisionID ?? null;
                  data.CompanyID = data.CompanyID ?? selectedCompany?.CompanyID ?? null;

                  const enrichedData = {
                    ...data,
                    DepartmentName: selectedDepartment?.DepartmentName || '',
                    DivisionName: selectedDivision?.DivisionName || '',
                    CompanyName: selectedCompany?.CompanyName || ''
                  };

                  setLocalWorkTeams((prev) => [...prev, enrichedData as WorkTeam]);

                  createWorkTeamMutation.mutate({
                    CompanyID: data.CompanyID,
                    DivisionID: data.DivisionID,
                    DepartmentID: data.DepartmentID!,
                    DepartmentName: selectedDepartment?.DepartmentName || '',
                    WorkTeamName: data.WorkTeamName,
                    Description: data.Description,
                    IsActive: data.IsActive
                  });
                })}
                className="space-y-4 dark:text-white"
              >
                <div className="grid grid-cols-1 gap-4">
                  <Controller
                    name="CompanyID"
                    control={workTeamForm.control}
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Company</span>

                        <Select
                          value={field.value?.toString() || ''}
                          onValueChange={(value) => {
                            field.onChange(parseInt(value, 10));
                            workTeamForm.setValue('DivisionID', undefined);
                            workTeamForm.setValue('DepartmentID', undefined);
                          }}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select a company" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:bg-black dark:text-white">
                            {filteredCompaniesForForm.map((company: Company) => (
                              <SelectItem
                                key={company.CompanyID}
                                value={company.CompanyID.toString()}
                              >
                                {company.CompanyName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />

                  <Controller
                    name="DivisionID"
                    control={workTeamForm.control}
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Division</span>

                        <Select
                          value={field.value?.toString() || ''}
                          onValueChange={(value) => {
                            field.onChange(parseInt(value, 10));
                            workTeamForm.setValue('DepartmentID', undefined);
                          }}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select a division" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:bg-black dark:text-white">
                            {filteredDivisionsForForm.map((div: Division) => (
                              <SelectItem key={div.DivisionID} value={div.DivisionID!.toString()}>
                                {div.DivisionName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />

                  <div className="fv-row">
                    <label className="required fw-semibold fs-6 mb-2">Department</label>
                    <select
                      {...workTeamForm.register('DepartmentID', {
                        required: true
                      })}
                      className="select"
                      value={workTeamForm.watch('DepartmentID') || ''}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        workTeamForm.setValue('DepartmentID', value);
                        const dept = filteredDepartmentsForForm.find(
                          (d: any) => d.DepartmentID === value
                        );
                        workTeamForm.setValue('DepartmentName', dept?.DepartmentName || '');
                      }}
                    >
                      <option value="">Select Department</option>
                      {filteredDepartmentsForForm.map((d: any) => (
                        <option key={d.DepartmentID} value={d.DepartmentID}>
                          {d.DepartmentName}
                        </option>
                      ))}
                    </select>
                    {workTeamForm.formState.errors.DepartmentID && (
                      <span className="text-danger small">Department is required</span>
                    )}
                  </div>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Team Name *</span>

                    <Controller
                      name="WorkTeamName"
                      control={workTeamForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="e.g., Support Team" {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Description</span>

                    <Controller
                      name="Description"
                      control={workTeamForm.control}
                      render={({ field }) => (
                        <textarea
                          className="textarea mt-1"
                          placeholder="Team responsibilities..."
                          {...field}
                        />
                      )}
                    />
                  </label>
                  <div className="flex items-center justify-between border p-3 rounded-md gap-3">
                    <span className="text-md font-semibold ">Status</span>

                    <Controller
                      name="IsActive"
                      control={workTeamForm.control}
                      render={({ field }) => (
                        <label className="switch mb-0">
                          <input
                            type="checkbox"
                            checked={field.value}
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
                    disabled={createWorkTeamMutation.isPending}
                  >
                    {createWorkTeamMutation.isPending ? 'Creating...' : 'Create Team'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {isEditDialogOpen && editingItem && (
        <div className="fixed inset-0 z-50 p-6 pt-60 md:pt-0 flex items-start  md:items-center justify-center">
          <div
            className="fixed inset-0 bg-black/40 dark:bg-white/30"
            onClick={() => {
              setIsEditDialogOpen(false);
              setEditingItem(null);
            }}
          />
          <div className="bg-white dark:bg-black rounded-xl shadow-2xl w-full lg:w-3/4 xl:w-1/4 z-10 p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold dark:text-white">Edit {editingItem.type}</h3>
              <button
                className="btn btn-outline btn-danger"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingItem(null);
                }}
              >
                <i className="ki-filled ki-cross"></i>
              </button>
            </div>

            {editingItem?.type === 'universe' && (
              <form
                onSubmit={universeForm.handleSubmit((data) => {
                  if (!editingItem?.UniverseID) return; // safety check
                  updateUniverseMutation.mutate({
                    id: editingItem.UniverseID,
                    data
                  });
                })}
                className="space-y-4"
              >
                <div className="dark:text-white flex flex-col gap-4 ">
                  <label className="flex flex-col">
                    <span className="text-md font-semibold ">Universe Name *</span>

                    <Controller
                      control={universeForm.control}
                      name="UniverseName"
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value)}
                          disabled={createUniverseMutation.status === 'pending'}
                          placeholder="Enter Universe Name..."
                        />
                      )}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Description</span>
                    <Controller
                      name="Description"
                      control={universeForm.control}
                      render={({ field }) => (
                        <textarea
                          className="textarea mt-1"
                          placeholder="Enter Description..."
                          {...field}
                          disabled={createUniverseMutation.status === 'pending'}
                          rows={3}
                        />
                      )}
                    />
                  </label>
                  <div className="flex items-center justify-between border p-3 rounded-md ">
                    <span className="text-md font-semibold">Active Status</span>
                    <Controller
                      control={universeForm.control}
                      name="IsActive"
                      render={({ field }) => (
                        <label className="switch mb-0">
                          <input
                            type="checkbox"
                            checked={field.value}
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
                    disabled={updateUniverseMutation.isPending}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-outline btn-primary px-4 py-2 text-md"
                    disabled={updateUniverseMutation.status === 'pending'}
                  >
                    {updateUniverseMutation.status === 'pending'
                      ? 'Updating...'
                      : 'Update Universe'}
                  </button>
                </div>
              </form>
            )}
            {editingItem?.type === 'companies' && (
              <form
                onSubmit={companyForm.handleSubmit((data) => {
                  console.log('Submitting update payload:', data); // check CityName here
                  updateCompanyMutation.mutate({
                    id: editingItem.CompanyID,
                    data
                  });
                })}
                className="space-y-4 dark:text-white"
              >
                <div className="flex flex-col gap-4">
                  <Controller
                    control={companyForm.control}
                    name="UniverseID"
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Universe *</span>

                        <Select
                          value={field.value || ''}
                          onValueChange={(value) => {
                            field.onChange(value);
                            const selectedUniverse = universes.find(
                              (u: Universe) => u.UniverseID === value
                            );
                            companyForm.setValue(
                              'UniverseName',
                              selectedUniverse?.UniverseName || ''
                            );
                          }}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select a universe" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:bg-black dark:text-white">
                            {filteredUniversesForForm.map((universe: Universe) => (
                              <SelectItem key={universe.UniverseID} value={universe.UniverseID}>
                                {universe.UniverseName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Company Code *</span>
                    <Controller
                      control={companyForm.control}
                      name="CompanyCode"
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="ABC, XYZ..." {...field} />
                      )}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Company Name *</span>

                    <Controller
                      control={companyForm.control}
                      name="CompanyName"
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="ABC Corporation..." {...field} />
                      )}
                    />
                  </label>
                  <Controller
                    control={companyForm.control}
                    name="CityID"
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">City Name *</span>

                        <Select
                          value={field.value ? String(field.value) : ''}
                          onValueChange={(value) => {
                            const selectedCity = cities.find(
                              (city: City) => city.CityID === Number(value)
                            );
                            field.onChange(Number(value)); 
                            companyForm.setValue('CityName', selectedCity?.CityName || ''); 
                          }}
                        >
                          <SelectTrigger className="input mt-1 ">
                            <SelectValue placeholder="Select a city" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:bg-black dark:text-white ">
                            {cities.map((city: City) => (
                              <SelectItem key={city.CityID} value={String(city.CityID)}>
                                {city.CityName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />
              

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Address</span>

                    <Controller
                      name="Address"
                      control={companyForm.control}
                      render={({ field }) => (
                        <textarea
                          placeholder="Company address..."
                          {...field}
                          className="textarea mt-1"
                          rows={3}
                        />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Email *</span>
                    <Controller
                      name="Email"
                      control={companyForm.control}
                      render={({ field }) => (
                        <input
                          type="email"
                          className="input mt-1"
                          placeholder="contact@company.com"
                          {...field}
                        />
                      )}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Website *</span>

                    <Controller
                      name="Website"
                      control={companyForm.control}
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          placeholder="https://www.company.com"
                          {...field}
                        />
                      )}
                    />
                  </label>
                  <div className="flex items-center justify-between border p-3 rounded-md gap-3">
                    <span className="text-md font-semibold">Enable this company</span>

                    <Controller
                      name="IsActive"
                      control={companyForm.control}
                      render={({ field }) => (
                        <label className="switch mb-0">
                          <input
                            type="checkbox"
                            checked={field.value}
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
                    disabled={updateCompanyMutation.isPending}
                  >
                    {updateCompanyMutation.isPending ? 'Updating...' : 'Update Country'}
                  </button>
                </div>
              </form>
            )}
            {editingItem?.type === 'divisions' && (
              <form
                {...divisionForm}
                onSubmit={divisionForm.handleSubmit((data) =>
                  updateDivisionMutation.mutate({
                    id: editingItem.DivisionID,
                    data
                  })
                )}
                className="space-y-4 dark:text-white"
              >
                <div className="flex flex-col gap-4">
                  <Controller
                    name="CompanyID"
                    control={divisionForm.control}
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Company *</span>
                        <Select
                          value={field.value ? field.value.toString() : undefined}
                          onValueChange={(value) => field.onChange(parseInt(value, 10))}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select a company" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:bg-black dark:text-white">
                            {filteredCompaniesForForm.map((company: Company) => (
                              <SelectItem
                                key={company.CompanyID}
                                value={company.CompanyID.toString()}
                              >
                                {company.CompanyName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Division Code *</span>
                    <Controller
                      name="DivisionCode"
                      control={divisionForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="IT, HR, FIN..." {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Division Name *</span>

                    <Controller
                      name="DivisionName"
                      control={divisionForm.control}
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          placeholder="Information Technology..."
                          {...field}
                        />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Description</span>

                    <Controller
                      name="Description"
                      control={divisionForm.control}
                      render={({ field }) => (
                        <textarea
                          className="textarea mt-1"
                          placeholder="Division description..."
                          {...field}
                        />
                      )}
                    />
                  </label>

                  <div className="flex items-center justify-between border p-3 rounded-md gap-3">
                    <span className="text-md font-semibold">Enable this division</span>

                    <Controller
                      name="IsActive"
                      control={divisionForm.control}
                      render={({ field }) => (
                        <label className="switch mb-0">
                          <input
                            type="checkbox"
                            checked={field.value}
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
                    disabled={updateDivisionMutation.isPending}
                  >
                    {updateDivisionMutation.isPending ? 'Updating...' : 'Update Division'}
                  </button>
                </div>
              </form>
            )}
            {editingItem?.type === 'departments' && (
              <form
                onSubmit={departmentForm.handleSubmit((data) => {
                  const selectedCompany = companies.find(
                    (c: Company) => c.CompanyID === data.CompanyID
                  );
                  const selectedDivision = divisions.find(
                    (d: Division) => d.DivisionID === data.DivisionID
                  );

                  const enrichedData = {
                    ...data,
                    CompanyName: selectedCompany?.CompanyName ?? '',
                    DivisionName: selectedDivision?.DivisionName ?? ''
                  };

                  updateDepartmentMutation.mutate({
                    id: editingItem.DepartmentID,
                    data: enrichedData
                  });
                })}
                className="space-y-4 dark:text-white"
              >
                <div className="flex flex-col gap-4">
                  <Controller
                    name="CompanyID"
                    control={departmentForm.control}
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Company *</span>

                        <Select
                          value={field.value ? field.value.toString() : undefined}
                          onValueChange={(value) => {
                            field.onChange(parseInt(value, 10));
                            departmentForm.setValue('DivisionID', undefined); // reset division on company change
                          }}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select a company" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:bg-black dark:text-white">
                            {filteredCompaniesForForm.map((company: Company) => (
                              <SelectItem
                                key={company.CompanyID}
                                value={company.CompanyID.toString()}
                              >
                                {company.CompanyName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />

                  <Controller
                    name="DivisionID"
                    control={departmentForm.control}
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Division *</span>

                        <Select
                          // value={field.value?.toString() || ""}
                          value={field.value ? field.value.toString() : undefined}
                          onValueChange={(value) => field.onChange(parseInt(value, 10))}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select a division" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:bg-black dark:text-white">
                            {filteredDivisionsForForm.map((div: Division) => (
                              <SelectItem key={div.DivisionID} value={div.DivisionID!.toString()}>
                                {div.DivisionName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Department Name *</span>

                    <Controller
                      name="DepartmentName"
                      control={departmentForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="Human Resources..." {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Description</span>

                    <Controller
                      name="Description"
                      control={departmentForm.control}
                      render={({ field }) => (
                        <textarea
                          className="textarea mt-1"
                          placeholder="Department description..."
                          {...field}
                          rows={3}
                        />
                      )}
                    />
                  </label>
                  <div className="flex items-center justify-between border p-3 rounded-md gap-3">
                    <span className="text-md font-semibold">Enable this department</span>

                    <Controller
                      name="IsActive"
                      control={departmentForm.control}
                      render={({ field }) => (
                        <label className="switch mb-0">
                          <input
                            type="checkbox"
                            checked={field.value}
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
                    disabled={updateDepartmentMutation.isPending}
                  >
                    {updateDepartmentMutation.isPending ? 'Updating...' : 'Update Department'}
                  </button>
                </div>
              </form>
            )}
            {editingItem?.type === 'workteams' && (
              <form
                {...workTeamForm}
                onSubmit={workTeamForm.handleSubmit((data) =>
                  updateWorkTeamMutation.mutate({
                    WorkTeamID: editingItem.WorkTeamID,
                    ...data
                  })
                )}
                className="space-y-4 dark:text-white"
              >
                <div className="grid grid-cols-1 gap-4">
                  <Controller
                    name="CompanyID"
                    control={workTeamForm.control}
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Company</span>

                        <Select
                          value={field.value?.toString() || ''}
                          onValueChange={(value) => {
                            field.onChange(parseInt(value, 10));
                            workTeamForm.setValue('DivisionID', undefined);
                            workTeamForm.setValue('DepartmentID', undefined);
                          }}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select a company" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:bg-black dark:text-white">
                            {filteredCompaniesForForm.map((company: Company) => (
                              <SelectItem
                                key={company.CompanyID}
                                value={company.CompanyID.toString()}
                              >
                                {company.CompanyName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />

                  <Controller
                    name="DivisionID"
                    control={workTeamForm.control}
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Division</span>

                        <Select
                          value={field.value?.toString() || ''}
                          onValueChange={(value) => {
                            field.onChange(parseInt(value, 10));
                            workTeamForm.setValue('DepartmentID', undefined);
                          }}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select a division" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:bg-black dark:text-white">
                            {filteredDivisionsForForm.map((div: Division) => (
                              <SelectItem key={div.DivisionID} value={div.DivisionID!.toString()}>
                                {div.DivisionName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />

                  <div className="fv-row">
                    <label className="required fw-semibold fs-6 mb-2">Department</label>
                    <select
                      {...workTeamForm.register('DepartmentID', {
                        required: true
                      })}
                      className="select"
                      value={workTeamForm.watch('DepartmentID') || ''}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        workTeamForm.setValue('DepartmentID', value);
                        // auto set DepartmentName based on ID
                        const dept = filteredDepartmentsForForm.find(
                          (d: any) => d.DepartmentID === value
                        );
                        workTeamForm.setValue('DepartmentName', dept?.DepartmentName || '');
                      }}
                    >
                      <option value="">Select Department</option>
                      {filteredDepartmentsForForm.map((d: any) => (
                        <option key={d.DepartmentID} value={d.DepartmentID}>
                          {d.DepartmentName}
                        </option>
                      ))}
                    </select>
                    {workTeamForm.formState.errors.DepartmentID && (
                      <span className="text-danger small">Department is required</span>
                    )}
                  </div>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Team Name *</span>

                    <Controller
                      name="WorkTeamName"
                      control={workTeamForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="e.g., Support Team" {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Description</span>

                    <Controller
                      name="Description"
                      control={workTeamForm.control}
                      render={({ field }) => (
                        <textarea
                          className="textarea mt-1"
                          placeholder="Team responsibilities..."
                          {...field}
                        />
                      )}
                    />
                  </label>
                  <div className="flex items-center justify-between border p-3 rounded-md gap-3">
                    <span className="text-md font-semibold ">Status</span>

                    <Controller
                      name="IsActive"
                      control={workTeamForm.control}
                      render={({ field }) => (
                        <label className="switch mb-0">
                          <input
                            type="checkbox"
                            checked={field.value}
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
                    disabled={updateWorkTeamMutation.isPending}
                  >
                    {updateWorkTeamMutation.isPending ? 'Updating...' : 'Update Work Team'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
