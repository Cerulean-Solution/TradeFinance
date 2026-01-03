import React, { useEffect, useRef, useState } from 'react';
import ApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { z } from 'zod';
import SearchFilterBar from '../FrameworkComponent/SearchFilterBar';
import Tabs from '../FrameworkComponent/Tabs';
import DataTable from '../FrameworkComponent/DataTable';
import ImportExport from '../FrameworkComponent/ImportExport';
import { Plus, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { DataGrid } from '@/components';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

/* ---------------- Schemas ---------------- */
const countrySchema = z.object({
  CountryName: z.string().min(1, 'Country Name is required'),
  CountryCode: z.string().min(1, 'Country Code is required'),
  UniverseID: z.string().uuid('UniverseID must be a valid UUID'),
  ISO2Code: z.string().optional(),
  ISO3Code: z.string().optional(),
  CountryNumeric: z.string().optional(),
  PhoneCode: z.string().optional(),
  Capital: z.string().optional(),
  CurrencyCode: z.string().optional(),
  CurrencyName: z.string().optional(),
  TLD: z.string().optional(),
  Region: z.string().optional(),
  CountryID: z.number().optional(),
  RegionID: z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() !== '') return Number(val);
    if (typeof val === 'number') return val;
    return undefined;
  }, z.number().optional()),
  SubRegion: z.string().optional(),
  SubRegionID: z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() !== '') return Number(val);
    if (typeof val === 'number') return val;
    return undefined;
  }, z.number().optional()),
  Nationality: z.string().optional(),
  Timezones: z.string().optional(),
  Latitude: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() !== '') return Number(val);
      if (typeof val === 'number') return val;
      return undefined;
    },
    z
      .number()
      .optional()
      .refine((val) => val === undefined || !isNaN(val), {
        message: 'Latitude must be a valid number'
      })
  ),
  Longitude: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() !== '') return Number(val);
      if (typeof val === 'number') return val;
      return undefined;
    },
    z
      .number()
      .optional()
      .refine((val) => val === undefined || !isNaN(val), {
        message: 'Longitude must be a valid number'
      })
  ),
  IsActive: z.boolean().optional()
});
const stateSchema = z.object({
  CountryID: z.number({
    message: 'Country is required'
  }),
  CountryCode: z.string().optional(),
  CountryName: z.string().optional(),
  StateCode: z
    .string({
      message: 'State code is required'
    })
    .min(1, 'State code cannot be empty'),
  StateName: z
    .string({
      message: 'State name is required'
    })
    .min(1, 'State name cannot be empty'),
  StateType: z.string().optional(),
  Latitude: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() !== '') return Number(val);
      if (typeof val === 'number') return val;
      return undefined;
    },
    z
      .number()
      .optional()
      .refine((val) => val === undefined || !isNaN(val), {
        message: 'Latitude must be a valid number'
      })
  ),
  Longitude: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() !== '') return Number(val);
      if (typeof val === 'number') return val;
      return undefined;
    },
    z
      .number()
      .optional()
      .refine((val) => val === undefined || !isNaN(val), {
        message: 'Longitude must be a valid number'
      })
  ),
  UniverseID: z
    .string({
      message: 'Universe selection is required'
    })
    .uuid('Universe ID is required'),
  IsActive: z.boolean().optional()
});
const citySchema = z.object({
  CityName: z
    .string({
      message: 'City name is required'
    })
    .min(1, 'City name is required'),
  StateID: z
    .number({
      message: 'State is required'
    })
    .min(1, 'State ID must be greater than 0'),
  StateName: z
    .string({
      message: 'State name is required'
    })
    .min(1, 'State name is required'),
  CountryID: z
    .number({
      message: 'Country is required'
    })
    .min(1, 'Country ID must be greater than 0'),
  CountryName: z
    .string({
      message: 'Country name is required'
    })
    .min(1, 'Country name is required'),
  PostalCode: z.string().optional(),
  Latitude: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() !== '') return Number(val);
      if (typeof val === 'number') return val;
      return undefined;
    },
    z
      .number()
      .optional()
      .refine((val) => val === undefined || !isNaN(val), {
        message: 'Latitude must be a valid number'
      })
  ),
  Longitude: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() !== '') return Number(val);
      if (typeof val === 'number') return val;
      return undefined;
    },
    z
      .number()
      .optional()
      .refine((val) => val === undefined || !isNaN(val), {
        message: 'Longitude must be a valid number'
      })
  ),
  WikiDataID: z.string().optional(),
  UniverseID: z
    .string({
      message: 'Universe selection is required'
    })
    .uuid('Universe ID Required'),
  IsActive: z.boolean({
    message: 'Active status is required'
  })
});
type CityFormValues = z.infer<typeof citySchema>;

interface Universe {
  UniverseID: number;
  UniverseName: string;
  Description?: string;
  IsActive: boolean;
  IsMaster?: number;
}

interface Country {
  CountryID: number;
  CountryName: string;
  CountryCode: string;
  CountryAlpha2?: string; // formerly ISO2Code
  CountryAlpha3?: string; // formerly ISO3Code
  CountryNumeric?: number;
  PhoneCode?: string;
  Capital?: string;
  CurrencyCode?: string;
  CurrencyName?: string;
  TLD?: string;
  Region?: string;
  RegionID?: number;
  SubRegion?: string;
  SubRegionID?: number;
  Nationality?: string;
  Timezones?: string;
  Latitude?: number;
  Longitude?: number;
  IsActive?: boolean;
  UniverseName?: string;
  UniverseID: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

interface State {
  StateID: number;
  StateName: string;
  StateCode: string;
  StateType?: string;
  CountryID: number;
  CountryCode?: string;
  CountryName?: string;
  Latitude?: number;
  Longitude?: number;
  UniverseID?: string;
  UniverseName?: string;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt?: string;
}
interface City {
  CityID?: number;
  StateID: number;
  StateName: string;
  CountryID?: number;
  CountryName: string;
  CityName: string;
  PostalCode?: string;
  WikiDataID?: string;
  UniverseID: string;
  UniverseName?: string;
  IsActive: boolean;
  CreatedAt?: string;
  UpdatedAt?: string;
  Latitude?: number;
  Longitude?: number;
}

/* ---------------- Component ---------------- */
export default function GeographicManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isParsing, setIsParsing] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);

  type TabKey = 'countries' | 'states' | 'cities';
  const [activeTab, setActiveTab] = useState<TabKey>('countries');
  const [importedTabs, setImportedTabs] = useState<Record<TabKey, ImportedFileData | null>>({
    countries: null,
    states: null,
    cities: null
  });
  const { data: selectedUniverse } = useQuery({
    queryKey: ['selectedUniverse'],
    initialData: null
  });

  /* -------- Forms -------- */
  const countryForm = useForm<z.infer<typeof countrySchema>>({
    resolver: zodResolver(countrySchema) as Resolver<z.infer<typeof countrySchema>>,
    defaultValues: {
      CountryName: '',
      CountryCode: '',
      ISO2Code: '',
      ISO3Code: '',
      CountryNumeric: '',
      PhoneCode: '',
      Capital: '',
      CurrencyCode: '',
      CurrencyName: '',
      TLD: '',
      Region: '',
      CountryID: undefined,
      RegionID: undefined,
      SubRegion: '',
      SubRegionID: undefined,
      Nationality: '',
      Timezones: '',
      Latitude: undefined,
      Longitude: undefined,
      UniverseID: '', // IMPORTANT!!!
      IsActive: true
    }
  });
  const stateForm = useForm<z.infer<typeof stateSchema>>({
    resolver: zodResolver(stateSchema) as Resolver<z.infer<typeof stateSchema>>
  });
  const cityForm = useForm<z.infer<typeof citySchema>>({
    resolver: zodResolver(citySchema) as Resolver<z.infer<typeof citySchema>>,
    defaultValues: {
      CityName: '',
      StateID: 0,
      StateName: '',
      CountryID: 0,
      CountryName: '',
      PostalCode: '',
      Latitude: undefined,
      Longitude: undefined,
      WikiDataID: '',
      UniverseID: '',
      IsActive: true
    }
  });
  useEffect(() => {
    if (editingItem?.type === 'city') {
      cityForm.reset({
        CityName: editingItem.CityName,
        StateID: editingItem.StateID,
        StateName: editingItem.StateName,
        CountryID: editingItem.CountryID,
        CountryName: editingItem.CountryName,
        PostalCode: editingItem.PostalCode || '',
        Latitude: editingItem.Latitude,
        Longitude: editingItem.Longitude,
        WikiDataID: editingItem.WikiDataID || '',
        UniverseID: editingItem.UniverseID,
        IsActive: editingItem.IsActive
      });
      setIsEditOpen(true);
    }
  }, [editingItem, cityForm]);
  /* -------- Queries -------- */
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

  const { data: countries = [], isLoading: countriesLoading } = useQuery({
    queryKey: ['/api/framework/countries'],
    queryFn: async () => {
      const response = await fetch('/api/framework/countries');
      if (!response.ok) throw new Error('Failed to fetch countries');
      return response.json();
    }
  });
  console.log(countries);

  const { data: states = [], isLoading: statesLoading } = useQuery({
    queryKey: ['states'],
    queryFn: async () => {
      const response = await fetch('/api/framework/states');
      if (!response.ok) throw new Error('Failed to fetch states');
      return response.json();
    }
  });
  console.log(states);

  const { data: cities = [], isLoading: citiesLoading } = useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const response = await fetch('/api/framework/cities');
      if (!response.ok) throw new Error('Failed to fetch cities');
      return response.json();
    }
  });
  // Mutations
  useEffect(() => {
    console.log('editingItem:', editingItem);
  }, [editingItem]);

  /* -------- Mutations -------- */
  const createCountryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof countrySchema>) => {
      const response = await fetch('/api/framework/countries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create country');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/framework/countries'] });
      toast.success('Country Created Successfully');
      setIsCreateOpen(false);
      countryForm.reset();
    },
    onError: () => {
      toast.error('Duplicate Country');
    }
  });

  const updateCountryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof countrySchema> }) => {
      const response = await fetch(`/api/framework/countries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update country');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/framework/countries'] });
      setIsEditOpen(false);
      setEditingItem(null);
      countryForm.reset();
      toast.success('Country Updated Successfully');
    },
    onError: () => {
      toast.error('Duplicate Country');
    }
  });
  const deleteCountryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/framework/countries/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete country');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/framework/countries'] });
      toast.success('Country Deleted Successfully');
    },
    onError: () => {
      toast.error('Failed to delete Country');
    }
  });

  type StateFormDataType = {
    StateName: string;
    StateCode: string;
    StateType?: string;
    CountryID: number;
    CountryCode?: string;
    CountryName?: string;
    Latitude?: number;
    Longitude?: number;
    UniverseID?: number;
    IsActive?: boolean;
  };

  const createStateMutation = useMutation({
    mutationFn: async (data: StateFormDataType) => {
      const res = await fetch('/api/framework/states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create state');
      }
      return res.json();
    },

    onSuccess: () => {
      // refetch the GET /states
      queryClient.invalidateQueries({ queryKey: ['states'] });
      setIsCreateOpen(false);
      stateForm.reset();
      toast.success('State created successfully');
    },

    onError: (error: any) => {
      const msg =
        error.message === 'DUPLICATE_STATE'
          ? 'This state already exists.'
          : 'Failed to create state.';
      toast.error('Dupliate State');
    }
  });

  const useUpdateStateMutation = (
    setIsEditDialogOpen: (val: boolean) => void,
    setEditingItem: (val: any) => void,
    stateForm: any
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof stateSchema> }) => {
        const response = await fetch(`/api/framework/states/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          throw new Error('Failed to update state');
        }

        return response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['states'] });
        setIsEditDialogOpen(false);
        setEditingItem(null);
        stateForm.reset();
        toast.success('State updated successfully');
      },
      onError: () => {
        toast.error('Duplicate State');
      }
    });
  };

  const UpdateStateMutation = useUpdateStateMutation(setIsEditOpen, setEditingItem, stateForm);
  const deleteStateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/framework/states/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete state');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['states'] });
      toast.success('State deleted successfully');
    },
    onError: () => {
      toast.error('Failed to Delete State');
    }
  });

  const createCityMutation = useMutation({
    mutationFn: async (data: z.infer<typeof citySchema>) => {
      const response = await fetch('/api/framework/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create city');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
      setIsCreateOpen(false);
      cityForm.reset();
      toast.success('City created successfully');
    },
    onError: () => {
      toast.error('Duplicate City');
    }
  });

  const updateCityMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof citySchema> }) => {
      const response = await fetch(`/api/framework/cities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update city');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
      setIsEditOpen(false);
      setEditingItem(null);
      cityForm.reset();
      toast.success('City updated successfully');
    },
    onError: () => {
      toast.error('Duplicate City');
    }
  });

  const deleteCityMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/framework/cities/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete city');
      return response.json();
    },
    onSuccess: () => {
      // invalidate the cities list so it refetches
      queryClient.invalidateQueries({ queryKey: ['cities'] });
      toast.success('City deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete City');
    }
  });

  const handleEdit = (item: Country, type: string) => {
    console.log('Opening edit dialog', item);
    setEditingItem({ ...item, type });

    if (type === 'country') {
      countryForm.reset({
        CountryName: item.CountryName || '',
        CountryCode: item.CountryCode || '',
        ISO2Code: item.CountryAlpha2 || '',
        ISO3Code: item.CountryAlpha3 || '',
        CountryNumeric: item.CountryNumeric?.toString() || '',
        PhoneCode: item.PhoneCode || '',
        Capital: item.Capital || '',
        CurrencyCode: item.CurrencyCode || '',
        CurrencyName: item.CurrencyName || '',
        TLD: item.TLD || '',
        Region: item.Region || '',
        RegionID: item.RegionID,
        SubRegion: item.SubRegion || '',
        SubRegionID: item.SubRegionID,
        Nationality: item.Nationality || '',
        Timezones: item.Timezones || '',
        Latitude: item.Latitude,
        Longitude: item.Longitude,
        IsActive: item.IsActive ?? true,
        UniverseID: item.UniverseID ? String(item.UniverseID) : ''
      });
    }

    setIsEditOpen(true);
  };

  const handleEditState = (item: State) => {
    console.log('Opening edit dialog for state', item);
    setEditingItem({ ...item, type: 'state' });
    stateForm.reset({
      StateName: item.StateName,
      StateCode: item.StateCode,
      StateType: item.StateType || '',
      CountryID: item.CountryID,
      CountryCode: item.CountryCode || '',
      CountryName: item.CountryName || '',
      Latitude: item.Latitude ?? undefined,
      Longitude: item.Longitude ?? undefined,
      UniverseID: item.UniverseID ? String(item.UniverseID) : '',
      IsActive: item.IsActive ?? true
    });

    setIsEditOpen(true);
  };

  const handleEditCity = (item: City) => {
    console.log('Opening edit dialog for city', item);
    setEditingItem({
      ...item,
      type: 'city'
    });
    // Open the dialog
    setIsEditOpen(true);
  };

  const filteredCountries = countries.filter((country: Country) => {
    // ⬅️ NEW: Universe filter
    const matchesUniverse =
      !selectedUniverse || selectedUniverse === 'all' || country.UniverseID == selectedUniverse;

    const matchesSearch =
      country.CountryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.CountryCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && country.IsActive) ||
      (statusFilter === 'inactive' && !country.IsActive);

    return matchesUniverse && matchesSearch && matchesStatus;
  });

  const filteredStates = states.filter((state: State) => {
    const matchesUniverse =
      !selectedUniverse || selectedUniverse === 'all' || state.UniverseID == selectedUniverse;

    const matchesSearch =
      state.StateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      state.StateCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && state.IsActive) ||
      (statusFilter === 'inactive' && !state.IsActive);

    return matchesUniverse && matchesSearch && matchesStatus;
  });

  const filteredCities = cities.filter((city: City) => {
    const matchesUniverse =
      !selectedUniverse || selectedUniverse === 'all' || city.UniverseID == selectedUniverse;

    const matchesSearch = city.CityName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && city.IsActive) ||
      (statusFilter === 'inactive' && !city.IsActive);

    return matchesUniverse && matchesSearch && matchesStatus;
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = () => {
    let exportData: object[] = [];

    if (activeTab === 'countries') exportData = countries;
    if (activeTab === 'states') exportData = states;
    if (activeTab === 'cities') exportData = cities;

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });
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
          setTimeout(() => {
            const content = parseCSV(data);
            setImportedTabs((prev) => ({
              ...prev,
              [activeTab]: { file, content }
            }));
            setIsParsing(false);
          }, 0);
        } else {
          setIsParsing(false);
        }
      } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
        setTimeout(() => {
          // data should be binary string here
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
          setIsParsing(false);
        }, 0);
      } else {
        setIsParsing(false);
      }
    };

    if (file.name.toLowerCase().endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  /* -------- Donut -------- */
  const Total_tables: number[] = [countries.length, states.length, cities.length];
  const labels: string[] = ['Countries', 'States', 'Cities'];
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
  // /* -------- Helpers -------- */
  const openCreate = () => {
    setEditingItem(null);
    setIsEditOpen(false);
    setIsCreateOpen(true);

    // Country defaults
    countryForm.reset({
      CountryName: '',
      CountryCode: '',
      ISO2Code: '',
      ISO3Code: '',
      CountryNumeric: '',
      PhoneCode: '',
      Capital: '',
      CurrencyCode: '',
      CurrencyName: '',
      TLD: '',
      Region: '',
      RegionID: undefined,
      SubRegion: '',
      SubRegionID: undefined,
      Nationality: '',
      Timezones: '',
      Latitude: undefined,
      Longitude: undefined,
      UniverseID: '',
      IsActive: true
    });

    // State defaults
    stateForm.reset({
      StateName: '',
      StateCode: '',
      StateType: '',
      CountryID: undefined,
      CountryCode: '',
      CountryName: '',
      Latitude: undefined,
      Longitude: undefined,
      UniverseID: '',
      IsActive: true
    });

    // City defaults
    cityForm.reset({
      CityName: '',
      StateID: 0,
      StateName: '',
      CountryID: 0,
      CountryName: '',
      PostalCode: '',
      Latitude: undefined,
      Longitude: undefined,
      WikiDataID: '',
      UniverseID: '',
      IsActive: true
    });
  };

  const cityColumns = [
    // { key: 'CityID', label: 'City ID' },
    { key: 'CityName', label: 'City Name' },
    // {
    //   key: 'StateID',
    //   label: 'State ID',
    //   render: (c: any) => c.StateID ?? '-'
    // },
    {
      key: 'StateName',
      label: 'State Name',
      render: (c: any) => {
        const st = states.find((s: any) => s.StateID === c.StateID);
        return st?.StateName || c.StateName || '-';
      }
    },
    // {
    //   key: 'CountryID',
    //   label: 'Country ID',
    //   render: (c: any) => c.CountryID ?? '-'
    // },
    {
      key: 'CountryName',
      label: 'Country Name',
      render: (c: any) => {
        const co = countries.find((x: any) => x.CountryID === c.CountryID);
        return co?.CountryName || c.CountryName || '-';
      }
    },
    { key: 'PostalCode', label: 'Postal Code', render: (c: any) => c.PostalCode ?? '-' },
    { key: 'Latitude', label: 'Latitude', render: (c: any) => c.Latitude ?? '-' },
    { key: 'Longitude', label: 'Longitude', render: (c: any) => c.Longitude ?? '-' },
    { key: 'WikiDataID', label: 'WikiData ID', render: (c: any) => c.WikiDataID ?? '-' },
    // { key: 'UniverseID', label: 'Universe ID', render: (c: any) => c.UniverseID ?? '-' },

    // CreatedAt
    {
      key: 'CreatedAt',
      label: 'Created At',
      render: (c: any) => (c.CreatedAt ? new Date(c.CreatedAt).toLocaleString() : '-')
    },

    // UpdatedAt
    {
      key: 'UpdatedAt',
      label: 'Updated At',
      render: (c: any) => (c.UpdatedAt ? new Date(c.UpdatedAt).toLocaleString() : '-')
    },

    // Status
    {
      key: 'IsActive',
      label: 'Status',
      render: (c: any) => (
        <span
          className={`px-2 py-1 text-white rounded-full ${
            c.IsActive ? 'bg-success ' : 'bg-danger'
          }`}
        >
          {c.IsActive ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ];
  const stateColumns = [
    // { key: 'StateID', label: 'ID' },
    { key: 'StateName', label: 'State Name' },
    { key: 'StateCode', label: 'State Code' },
    {
      key: 'StateType',
      label: 'State Type',
      render: (s: any) => s.StateType || '-'
    },
    // {
    //   key: 'CountryID',
    //   label: 'Country ID',
    //   render: (s: any) => s.CountryID ?? '-'
    // },
    { key: 'CountryCode', label: 'Country Code', render: (s: any) => s.CountryCode || '-' },
    { key: 'CountryName', label: 'Country Name', render: (s: any) => s.CountryName || '-' },

    { key: 'Latitude', label: 'Latitude', render: (s: any) => s.Latitude ?? '-' },
    { key: 'Longitude', label: 'Longitude', render: (s: any) => s.Longitude ?? '-' },

    // { key: 'UniverseID', label: 'Universe ID', render: (s: any) => s.UniverseID ?? '-' },

    {
      key: 'CreatedAt',
      label: 'Created',
      render: (s: any) => (s.CreatedAt ? new Date(s.CreatedAt).toLocaleDateString() : '-')
    },

    {
      key: 'UpdatedAt',
      label: 'Updated',
      render: (s: any) => (s.UpdatedAt ? new Date(s.UpdatedAt).toLocaleDateString() : '-')
    },
    {
      key: 'IsActive',
      label: 'Status',
      render: (s: any) => (
        <span
          className={`px-2 py-1 rounded-full ${
            s.IsActive ? 'bg-success text-white' : 'bg-danger text-white'
          }`}
        >
          {s.IsActive ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ];
  const countryColumns = [
    // { key: 'CountryID', label: 'ID' },
    { key: 'CountryName', label: 'Country Name' },
    { key: 'CountryCode', label: 'Country Code', render: (c: any) => c.CountryCode || '-' },
    { key: 'Capital', label: 'Capital', render: (c: any) => c.Capital || '-' },
    { key: 'Nationality', label: 'Nationality', render: (c: any) => c.Nationality || '-' },
    { key: 'PhoneCode', label: 'Phone Code', render: (c: any) => c.PhoneCode || '-' },

    {
      key: 'ISO2',
      label: 'ISO2',
      render: (c: any) => c.CountryAlpha2 || c.ISO2Code || '-'
    },
    {
      key: 'ISO3',
      label: 'ISO3',
      render: (c: any) => c.CountryAlpha3 || c.ISO3Code || '-'
    },

    { key: 'CountryNumeric', label: 'Numeric', render: (c: any) => c.CountryNumeric || '-' },
    { key: 'CurrencyCode', label: 'Currency Code', render: (c: any) => c.CurrencyCode || '-' },
    { key: 'CurrencyName', label: 'Currency Name', render: (c: any) => c.CurrencyName || '-' },
    { key: 'TLD', label: 'TLD', render: (c: any) => c.TLD || '-' },

    { key: 'RegionID', label: 'Region ID', render: (c: any) => c.RegionID || '-' },
    { key: 'Region', label: 'Region', render: (c: any) => c.Region || '-' },
    { key: 'SubRegionID', label: 'Sub Region ID', render: (c: any) => c.SubRegionID || '-' },
    { key: 'SubRegion', label: 'Sub Region', render: (c: any) => c.SubRegion || '-' },

    { key: 'Timezones', label: 'Time Zones', render: (c: any) => c.Timezones || '-' },

    { key: 'Latitude', label: 'Latitude', render: (c: any) => c.Latitude || '-' },
    { key: 'Longitude', label: 'Longitude', render: (c: any) => c.Longitude || '-' },

    // { key: 'UniverseID', label: 'Universe ID', render: (c: any) => c.UniverseID || '-' },

    {
      key: 'CreatedAt',
      label: 'Created',
      render: (c: any) => (c.CreatedAt ? new Date(c.CreatedAt).toLocaleDateString() : '-')
    },
    {
      key: 'UpdatedAt',
      label: 'Updated',
      render: (c: any) => (c.UpdatedAt ? new Date(c.UpdatedAt).toLocaleDateString() : '-')
    },

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
    }
  ];

  const handleFullRefresh = async () => {
    setIsRefreshing(true);

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/framework/countries'] }),
      queryClient.invalidateQueries({ queryKey: ['states'] }),
      queryClient.invalidateQueries({ queryKey: ['cities'] }),
      queryClient.invalidateQueries({ queryKey: ['universes'] })
    ]);

    // Delay for smooth loader animation (optional)
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Page refreshed successfully');
    }, 400);
  };

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
  /* ---------------- Render ---------------- */
  return (
    <div className="w-full p-6 space-y-6 card ">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold dark:text-white">Geographic Management</h2>
          <p className="text-md text-gray-500 dark:text-gray-600 ">
            Manage countries, states & cities (Azure SQL connected)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ImportExport onExport={handleExport} onImport={handleFileChange} />
        </div>
      </div>

      {/* Top row: 4 solid color panels — responsive: 1 → 2 → 3 → 4 */}
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
        {/* Countries */}
        <div className="card p-6 flex items-center justify-center text-white bg-primary">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <i className="ki-solid ki-flag xl:text-5xl text-3xl text-bold"></i>
          </div>
          <div className="text-left">
            <h1 className="xl:text-2xl text-lg font-bold dark:text-white">
              {countries.length} Countries
            </h1>
          </div>
        </div>

        {/* States */}
        <div className="card p-6 flex items-center justify-center bg-success text-white">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <i className="ki-solid ki-geolocation xl:text-5xl text-3xl text-bold"></i>
          </div>
          <div className="text-left">
            <h1 className="xl:text-2xl text-lg font-bold dark:text-white">
              {states.length} States
            </h1>
          </div>
        </div>

        {/* Cities */}
        <div className="card p-6 flex items-center justify-center text-white bg-[#BF55EC]">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <i className="ki-solid ki-map xl:text-5xl text-3xl text-bold"></i>
          </div>
          <div className="text-left">
            <h1 className="xl:text-2xl text-lg font-bold dark:text-white">
              {cities.length} Cities
            </h1>
          </div>
        </div>
      </div>

      {/* Filters row */}
      <div className="p-4 pt-0">
        <div className="card p-4">
          <div className="grid w-full  grid-cols-1 md:grid-cols-3 gap-4">
            <Tabs
              tabs={[
                { label: 'Countries', value: 'countries' },
                { label: 'States', value: 'states' },
                { label: 'Cities', value: 'cities' }
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
            {activeTab === 'countries' && (
              <div className="mb-8 2xl:mb-0">
                <h1 className="text-xl font-bold dark:text-white">Countries Management</h1>
                <p className="text-md text-gray-500 dark:text-gray-600">
                  Manage country information with ISO codes and Phone codes
                </p>
              </div>
            )}
            {activeTab === 'states' && (
              <div className="mb-8 2xl:mb-0">
                <h1 className="text-xl font-bold dark:text-white">States Management</h1>
                <p className="text-md text-gray-500 dark:text-gray-600">
                  Manage State information with State codes and Country codes
                </p>
              </div>
            )}
            {activeTab === 'cities' && (
              <div className="mb-8 2xl:mb-0">
                <h1 className="text-xl font-bold dark:text-white">Cities Management</h1>
                <p className="text-md text-gray-500 dark:text-gray-600">
                  Manage City information with WikiDataID and Postal code
                </p>
              </div>
            )}
            <div className="flex gap-3 2xl:gap-10 justify-end md:justify-center md:gap-10 xl:justify- mt-4">
              <div className="input input-md w-32 xl:flex-1 2xl:w-60 border hover:border-blue-400 border-blue-300 text-xs">
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
                  className="btn btn-outline btn-primary text-xs md:text-md flex items-center gap-2"
                  onClick={async () => {
                    setTableLoading(true);

                    await Promise.all([
                      queryClient.invalidateQueries({ queryKey: ['/api/framework/countries'] }),
                      queryClient.invalidateQueries({ queryKey: ['states'] }),
                      queryClient.invalidateQueries({ queryKey: ['cities'] })
                    ]);

                    setTimeout(() => setTableLoading(false), 300); // smooth loading animation
                  }}
                >
                  <RefreshCw className={`h-5 w-5 ${tableLoading ? 'animate-spin' : ''}`} />
                  {tableLoading ? 'Refreshing...' : 'Refresh'}
                </button>

                <button
                  className="btn btn-primary btn-outline gap-2 text-xs md:text-md"
                  onClick={openCreate}
                >
                  <i className="ki-filled ki-plus"></i>
                  Add New
                </button>
              </div>
            </div>
          </div>
          {/* Tab content */}
          <div className="p-0 mt-5">
            {/* Countries */}
            {activeTab === 'countries' && (
              <div className="grid">
                {/* If a file was imported, show the Import Preview */}
                {importedTabs.countries ? (
                  <div className="card p-4 min-w-full">
                    {/* Close icon */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => setImportedTabs((prev) => ({ ...prev, countries: null }))}
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
                  /* Else, show the original countries table */
                  <div className="card min-w-full">
                    <div className="card-table scrollable-x-auto">
                      {tableLoading ? (
                        <div className="w-full flex justify-center items-center py-20">
                          <RefreshCw className="h-10 w-10 animate-spin text-primary" />
                        </div>
                      ) : (
                        <DataTable
                          data={filteredCountries}
                          columns={countryColumns}
                          rowKey={(c) => c.CountryID}
                          onEdit={(row) => handleEdit(row, 'country')}
                          onDelete={(row) => {
                            if (row.CountryID) deleteCountryMutation.mutate(row.CountryID);
                            else console.error('Country ID is undefined');
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* States */}
            {activeTab === 'states' && (
              <div className="grid">
                {importedTabs.states ? (
                  <div className="card p-4 min-w-full">
                    {/* Close icon */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => setImportedTabs((prev) => ({ ...prev, states: null }))}
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
                      {tableLoading ? (
                        <div className="w-full flex justify-center items-center py-20">
                          <RefreshCw className="h-10 w-10 animate-spin text-primary" />
                        </div>
                      ) : (
                        <DataTable
                          data={filteredStates}
                          columns={stateColumns}
                          rowKey={(s) => s.StateID}
                          onEdit={(row) => handleEditState(row)}
                          onDelete={(row) => {
                            if (row.StateID) deleteStateMutation.mutate(row.StateID);
                            else console.error('State ID is undefined');
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Cities */}
            {activeTab === 'cities' && (
              <div className="grid">
                {importedTabs.cities ? (
                  <div className="card p-4 min-w-full">
                    {/* Close icon */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => setImportedTabs((prev) => ({ ...prev, cities: null }))}
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
                      {tableLoading ? (
                        <div className="w-full flex justify-center items-center py-20">
                          <RefreshCw className="h-10 w-10 animate-spin text-primary" />
                        </div>
                      ) : (
                        <DataTable
                          data={filteredCities}
                          columns={cityColumns}
                          rowKey={(c) => c.CityID}
                          onEdit={(row) => handleEditCity(row)}
                          onDelete={(row) => {
                            if (row.CityID) deleteCityMutation.mutate(row.CityID);
                            else console.error('City ID is undefined');
                          }}
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

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 p-6 pt-60 md:pt-0 flex items-start  md:items-center justify-center">
          <div
            className="fixed inset-0  dark:bg-white/30 bg-black/60"
            onClick={() => setIsCreateOpen(false)}
          />
          <div className="bg-white dark:bg-black rounded shadow-2xl w-full lg:w-3/4 xl:w-2/4 z-10 p-5 h-1/2 scrollable-y">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold dark:text-white">
                Add New {activeTab.slice(0, -1)}
              </h3>
              <button className="btn btn-outline btn-danger" onClick={() => setIsCreateOpen(false)}>
                <X />
              </button>
            </div>
            {/* Country */}
            {activeTab === 'countries' && (
              <form
                {...countryForm}
                onSubmit={countryForm.handleSubmit((data) => createCountryMutation.mutate(data))}
                className="space-y-4 dark:text-white"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Country Name *</span>
                    <Controller
                      name="CountryName"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="United States..." {...field} />
                      )}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Country Code *</span>

                    <Controller
                      name="CountryCode"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="US, UK, CA..." {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">ISO2 *</span>

                    <Controller
                      name="ISO2Code"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="US" maxLength={2} {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">ISO3 *</span>

                    <Controller
                      name="ISO3Code"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="USA" maxLength={3} {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Country Numeric *</span>

                    <Controller
                      name="CountryNumeric"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input placeholder="840" {...field} className="input mt-1" />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Phone Code *</span>
                    <Controller
                      name="PhoneCode"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="+1" {...field} />
                      )}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Capital *</span>

                    <Controller
                      name="Capital"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="Washington D.C." {...field} />
                      )}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Currency Code *</span>

                    <Controller
                      name="CurrencyCode"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="USD" {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Currency Name *</span>

                    <Controller
                      name="CurrencyName"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          placeholder="United States Dollar"
                          {...field}
                        />
                      )}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">TLD *</span>

                    <Controller
                      name="TLD"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder=".us" {...field} />
                      )}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Region *</span>

                    <Controller
                      name="Region"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="Americas" {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Region ID *</span>
                    <Controller
                      name="RegionID"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" type="number" placeholder="1" {...field} />
                      )}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">SubRegion *</span>

                    <Controller
                      name="SubRegion"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="Northern America" {...field} />
                      )}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">SubRegion ID *</span>

                    <Controller
                      name="SubRegionID"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" type="number" placeholder="1" {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Nationality *</span>

                    <Controller
                      name="Nationality"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="American" {...field} />
                      )}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Timezones *</span>

                    <Controller
                      name="Timezones"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="UTC-05:00" {...field} />
                      )}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Latitude *</span>

                    <Controller
                      name="Latitude"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          type="number"
                          step="0.00000001"
                          placeholder="38.8977"
                          {...field}
                        />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Longitude *</span>
                    <Controller
                      name="Longitude"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input
                          {...field}
                          className="input mt-1"
                          type="number"
                          step="0.00000001"
                          placeholder="-77.0365"
                          {...field}
                        />
                      )}
                    />
                  </label>
                  <div className="flex items-center justify-between border p-3 rounded-md gap-3">
                    <span className="text-md font-semibold">Enable this Country</span>

                    <Controller
                      name="IsActive"
                      control={countryForm.control}
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
                  {/* Universe Dropdown */}
                  <Controller
                    name="UniverseID"
                    control={countryForm.control}
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Universe *</span>

                        <Select
                          onValueChange={field.onChange}
                          value={field.value ? String(field.value) : undefined}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select Universe" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:text-white dark:bg-black">
                            {universes.map((universe: Universe, index: number) => {
                              if (!universe?.UniverseID) return null;
                              return (
                                <SelectItem
                                  key={universe.UniverseID}
                                  value={universe.UniverseID.toString()}
                                >
                                  {universe.UniverseName || `Universe ${index + 1}`}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="btn btn-outline btn-secondary px-4 py-2 text-md"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancel
                  </button>

                  <button type="submit" className="btn btn-outline btn-primary px-4 py-2 text-md">
                    {createCountryMutation.isPending ? 'Creating...' : 'Create Country'}
                  </button>
                </div>
              </form>
            )}
            {/* State */}
            {activeTab === 'states' && (
              <form
                {...stateForm}
                onSubmit={stateForm.handleSubmit((data) => {
                  // Map StateName to name
                  const payload = {
                    ...data,
                    name: data.StateName,
                    IsActive: data.IsActive ?? true,
                    UniverseID: data.UniverseID ? Number(data.UniverseID) : undefined
                  };
                  createStateMutation.mutate(payload);
                })}
                className="space-y-4 dark:text-white"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Controller
                    name="CountryID"
                    control={stateForm.control}
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Country *</span>

                        <Select
                          onValueChange={(value) => {
                            // const selectedCountry = countries.find(c => c.CountryID === parseInt(value));
                            const selectedCountry = countries.find(
                              (c: Country) => c.CountryID === parseInt(value)
                            );

                            stateForm.setValue('CountryCode', selectedCountry?.CountryCode || '');
                            stateForm.setValue('CountryName', selectedCountry?.CountryName || '');
                            field.onChange(parseInt(value));
                          }}
                          value={field.value?.toString()}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select a country" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:text-white dark:bg-black">
                            {countries.map((country: Country) => (
                              <SelectItem
                                key={country.CountryID}
                                value={country.CountryID.toString()}
                              >
                                {country.CountryName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Country Code *</span>
                    <Controller
                      name="CountryCode"
                      control={stateForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="US" {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Country Name *</span>
                    <Controller
                      name="CountryName"
                      control={stateForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="United States" {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">State Code*</span>
                    <Controller
                      name="StateCode"
                      control={stateForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="CA, NY..." {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">State Name *</span>
                    <Controller
                      name="StateName"
                      control={stateForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="California..." {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">State Type *</span>
                    <Controller
                      name="StateType"
                      control={stateForm.control}
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          placeholder="Province, Region, etc."
                          {...field}
                        />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Latitude *</span>
                    <Controller
                      name="Latitude"
                      control={stateForm.control}
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          type="number"
                          step="0.00000001"
                          placeholder="38.8977"
                          {...field}
                        />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Longtitude *</span>
                    <Controller
                      name="Longitude"
                      control={stateForm.control}
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          type="number"
                          step="0.00000001"
                          placeholder="-118.243683"
                          {...field}
                        />
                      )}
                    />
                  </label>
                  <Controller
                    name="UniverseID"
                    control={stateForm.control}
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Universe ID *</span>

                        <Select
                          onValueChange={field.onChange}
                          value={field.value ? field.value.toString() : ''} // fallback to empty string
                          disabled={universesLoading}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue
                              placeholder={universesLoading ? 'Loading...' : 'Select a universe'}
                            />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:text-white dark:bg-black">
                            {universes.map((universe: Universe, index: number) => {
                              if (!universe?.UniverseID) return null;
                              return (
                                <SelectItem
                                  key={universe.UniverseID}
                                  value={universe.UniverseID.toString()}
                                >
                                  {universe.UniverseName || `Universe ${index + 1}`}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />
                  <div className="flex items-center justify-between border p-3 rounded-md gap-3">
                    <span className="text-md font-semibold">Enable this state</span>
                    <Controller
                      name="IsActive"
                      control={stateForm.control}
                      render={({ field }) => (
                        <label className="switch mb-0">
                          <input
                            type="checkbox"
                            checked={field.value ?? true}
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
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-outline px-4 py-2 text-md"
                    disabled={createStateMutation.isPending}
                  >
                    {createStateMutation.isPending ? 'Creating...' : 'Create State'}
                  </button>
                </div>
              </form>
            )}
            {/* City */}
            {activeTab === 'cities' && (
              <form
                onSubmit={cityForm.handleSubmit((data) => createCityMutation.mutate(data))}
                className="space-y-4 dark:text-white"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">City Name *</span>
                    <Controller
                      name="CityName"
                      control={cityForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="Los Angeles..." {...field} />
                      )}
                    />
                  </label>
                  <Controller
                    name="StateName"
                    control={cityForm.control}
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">State Name *</span>

                        <Select
                          onValueChange={(stateIdString) => {
                            // const selected = states.find(s => s.StateID.toString() === stateIdString);
                            const selected = states.find(
                              (s: State) => s.StateID.toString() === stateIdString
                            );
                            if (selected) {
                              cityForm.setValue('StateID', selected.StateID);
                              cityForm.setValue('StateName', selected.StateName);
                              cityForm.setValue('CountryID', selected.CountryID);
                              // const selectedCountry = countries.find(c => c.CountryID === selected.CountryID);
                              const selectedCountry = countries.find(
                                (c: Country) => c.CountryID === selected?.CountryID
                              );
                              if (selectedCountry) {
                                cityForm.setValue('CountryName', selectedCountry.CountryName);
                              }
                            }
                          }}
                          value={
                            cityForm.watch('StateID')
                              ? cityForm.watch('StateID').toString()
                              : undefined
                          }
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select a state" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:text-white dark:bg-black">
                            {states.map((state: State) => (
                              <SelectItem key={state.StateID} value={state.StateID.toString()}>
                                {state.StateName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />
                  <Controller
                    control={cityForm.control}
                    name="CountryName"
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Country *</span>

                        <Select
                          onValueChange={(countryIdString) => {
                            // const selected = countries.find(c => c.CountryID.toString() === countryIdString);
                            const selected = countries.find(
                              (c: Country) => c.CountryID.toString() === countryIdString
                            );

                            if (selected) {
                              cityForm.setValue('CountryID', selected.CountryID);
                              cityForm.setValue('CountryName', selected.CountryName);
                            }
                          }}
                          value={
                            cityForm.watch('CountryID')
                              ? cityForm.watch('CountryID').toString()
                              : undefined
                          }
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select a country" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:text-white dark:bg-black">
                            {countries.map((country: Country) => (
                              <SelectItem
                                key={country.CountryID}
                                value={country.CountryID.toString()}
                              >
                                {country.CountryName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Postal Code *</span>
                    <Controller
                      name="PostalCode"
                      control={cityForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="e.g., 90001" {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Latitude *</span>
                    <Controller
                      name="Latitude"
                      control={cityForm.control}
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          type="number"
                          step="0.00000001"
                          placeholder="34.052235"
                          {...field}
                        />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Longitude *</span>
                    <Controller
                      name="Longitude"
                      control={cityForm.control}
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          type="number"
                          step="0.00000001"
                          placeholder="-118.243683"
                          {...field}
                        />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">WikiData ID *</span>
                    <Controller
                      name="WikiDataID"
                      control={cityForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="e.g., Q65" {...field} />
                      )}
                    />
                  </label>
                  <Controller
                    control={cityForm.control}
                    name="UniverseID"
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Universe ID *</span>

                        <Select
                          onValueChange={field.onChange}
                          value={field.value ? field.value.toString() : ''} // fallback to empty string
                          disabled={universesLoading}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue
                              placeholder={universesLoading ? 'Loading...' : 'Select a universe'}
                            />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:text-white dark:bg-black">
                            {universes.map((universe: Universe, index: number) => {
                              if (!universe?.UniverseID) return null;
                              return (
                                <SelectItem
                                  key={universe.UniverseID}
                                  value={universe.UniverseID.toString()}
                                >
                                  {universe.UniverseName || `Universe ${index + 1}`}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />
                  <div className="flex items-center justify-between border p-3 rounded-md gap-3">
                    <span className="text-md font-semibold">Enable this City</span>

                    <Controller
                      name="IsActive"
                      control={cityForm.control}
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
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-primary px-4 py-2 text-md"
                    disabled={createCityMutation.isPending}
                  >
                    {createCityMutation.isPending ? 'Creating...' : 'Create City'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {isEditOpen && editingItem && (
        <div className="fixed inset-0 z-50 p-6 pt-60 md:pt-0 flex items-start  md:items-center justify-center">
          <div
            className="fixed inset-0  dark:bg-white/30 bg-black/60"
            onClick={() => {
              setIsEditOpen(false);
              setEditingItem(null);
            }}
          />
          <div className="bg-white  dark:bg-black rounded  shadow-2xl w-full lg:w-3/4 xl:w-2/4 z-10 p-5 md:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold dark:text-white">Edit {editingItem.type}</h3>
              <button
                className="btn btn-outline btn-danger"
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingItem(null);
                }}
              >
                <X />
              </button>
            </div>

            {editingItem.type === 'country' && (
              <form
                {...countryForm}
                onSubmit={countryForm.handleSubmit((data) =>
                  updateCountryMutation.mutate({
                    id: editingItem.CountryID,
                    data
                  })
                )}
                className="space-y-4 dark:text-white"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Country Name *</span>
                    <Controller
                      name="CountryName"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="United States..." {...field} />
                      )}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Country Code *</span>

                    <Controller
                      name="CountryCode"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="US, UK, CA..." {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">ISO2 *</span>

                    <Controller
                      name="ISO2Code"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="US" maxLength={2} {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">ISO3 *</span>

                    <Controller
                      name="ISO3Code"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="USA" maxLength={3} {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Country Numeric *</span>

                    <Controller
                      name="CountryNumeric"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input placeholder="840" {...field} className="input mt-1" />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Phone Code *</span>
                    <Controller
                      name="PhoneCode"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="+1" {...field} />
                      )}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Capital *</span>

                    <Controller
                      name="Capital"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="Washington D.C." {...field} />
                      )}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Currency Code *</span>

                    <Controller
                      name="CurrencyCode"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="USD" {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Currency Name *</span>

                    <Controller
                      name="CurrencyName"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          placeholder="United States Dollar"
                          {...field}
                        />
                      )}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">TLD *</span>

                    <Controller
                      name="TLD"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder=".us" {...field} />
                      )}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Region *</span>

                    <Controller
                      name="Region"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="Americas" {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Region ID *</span>
                    <Controller
                      name="RegionID"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" type="number" placeholder="1" {...field} />
                      )}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">SubRegion *</span>

                    <Controller
                      name="SubRegion"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="Northern America" {...field} />
                      )}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">SubRegion ID *</span>

                    <Controller
                      name="SubRegionID"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" type="number" placeholder="1" {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Nationality *</span>

                    <Controller
                      name="Nationality"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="American" {...field} />
                      )}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Timezones *</span>

                    <Controller
                      name="Timezones"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="UTC-05:00" {...field} />
                      )}
                    />
                  </label>

                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Latitude *</span>

                    <Controller
                      name="Latitude"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          type="number"
                          step="0.00000001"
                          placeholder="38.8977"
                          {...field}
                        />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Longitude *</span>
                    <Controller
                      name="Longitude"
                      control={countryForm.control}
                      render={({ field }) => (
                        <input
                          {...field}
                          className="input mt-1"
                          type="number"
                          step="0.00000001"
                          placeholder="-77.0365"
                          {...field}
                        />
                      )}
                    />
                  </label>
                  <div className="flex items-center justify-between border p-3 rounded-md gap-3">
                    <span className="text-md font-semibold">Enable this Country</span>

                    <Controller
                      name="IsActive"
                      control={countryForm.control}
                      render={({ field }) => (
                        <label className="switch mb-0">
                          <input
                            type="checkbox"
                            checked={field.value ?? true}
                            onChange={(e) => field.onChange(e.target.checked)}
                          />
                        </label>
                      )}
                    />
                  </div>
                  {/*  Universe Dropdown */}
                  <Controller
                    name="UniverseID"
                    control={countryForm.control}
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Universe *</span>

                        <Select
                          onValueChange={field.onChange}
                          value={field.value ? String(field.value) : undefined}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select Universe" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:text-white dark:bg-black">
                            {universes.map((universe: Universe, index: number) => {
                              if (!universe?.UniverseID) return null;
                              return (
                                <SelectItem
                                  key={universe.UniverseID}
                                  value={universe.UniverseID.toString()}
                                >
                                  {universe.UniverseName || `Universe ${index + 1}`}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="btn btn-outline btn-secondary px-4 py-2 text-md"
                    onClick={() => setIsEditOpen(false)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary btn-outline px-4 py-2 text-md"
                    disabled={updateCountryMutation.isPending}
                  >
                    {updateCountryMutation.isPending ? 'Updating...' : 'Update Country'}
                  </button>
                </div>
              </form>
            )}

            {editingItem.type === 'state' && (
              <form
                {...stateForm}
                onSubmit={stateForm.handleSubmit((data) =>
                  UpdateStateMutation.mutate({ id: editingItem!.StateID, data })
                )}
                className="space-y-4 dark:text-white"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Controller
                    name="CountryID"
                    control={stateForm.control}
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Country *</span>

                        <Select
                          onValueChange={(value) => {
                            // const selectedCountry = countries.find(c => c.CountryID === parseInt(value));
                            const selectedCountry = countries.find(
                              (c: Country) => c.CountryID === parseInt(value)
                            );

                            stateForm.setValue('CountryCode', selectedCountry?.CountryCode || '');
                            stateForm.setValue('CountryName', selectedCountry?.CountryName || '');
                            field.onChange(parseInt(value));
                          }}
                          value={field.value?.toString()}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select a country" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:text-white dark:bg-black">
                            {countries.map((country: Country) => (
                              <SelectItem
                                key={country.CountryID}
                                value={country.CountryID.toString()}
                              >
                                {country.CountryName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Country Code *</span>
                    <Controller
                      name="CountryCode"
                      control={stateForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="US" {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Country Name *</span>
                    <Controller
                      name="CountryName"
                      control={stateForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="United States" {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">State Code*</span>
                    <Controller
                      name="StateCode"
                      control={stateForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="CA, NY..." {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">State Name *</span>
                    <Controller
                      name="StateName"
                      control={stateForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="California..." {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">State Type *</span>
                    <Controller
                      name="StateType"
                      control={stateForm.control}
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          placeholder="Province, Region, etc."
                          {...field}
                        />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Latitude *</span>
                    <Controller
                      name="Latitude"
                      control={stateForm.control}
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          type="number"
                          step="0.00000001"
                          placeholder="38.8977"
                          {...field}
                        />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Longtitude *</span>
                    <Controller
                      name="Longitude"
                      control={stateForm.control}
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          type="number"
                          step="0.00000001"
                          placeholder="-118.243683"
                          {...field}
                        />
                      )}
                    />
                  </label>
                  <Controller
                    name="UniverseID"
                    control={stateForm.control}
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Universe ID *</span>

                        <Select
                          onValueChange={field.onChange}
                          value={field.value ? field.value.toString() : ''} // fallback to empty string
                          disabled={universesLoading}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue
                              placeholder={universesLoading ? 'Loading...' : 'Select a universe'}
                            />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:text-white dark:bg-black">
                            {universes.map((universe: Universe, index: number) => {
                              if (!universe?.UniverseID) return null;
                              return (
                                <SelectItem
                                  key={universe.UniverseID}
                                  value={universe.UniverseID.toString()}
                                >
                                  {universe.UniverseName || `Universe ${index + 1}`}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />
                  <div className="flex items-center justify-between border p-3 rounded-md gap-3">
                    <span className="text-md font-semibold">Enable this state</span>

                    <Controller
                      name="IsActive"
                      control={stateForm.control} 
                      render={({ field }) => (
                        <label className="switch mb-0">
                          <input
                            type="checkbox"
                            checked={field.value ?? true}
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
                    onClick={() => setIsEditOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-outline px-4 py-2 text-md "
                    disabled={UpdateStateMutation.isPending}
                  >
                    {UpdateStateMutation.isPending ? 'Updating...' : 'Update State'}
                  </button>
                </div>
              </form>
            )}

            {editingItem.type === 'city' && (
              <form
                {...cityForm}
                onSubmit={cityForm.handleSubmit((data) =>
                  updateCityMutation.mutate({ id: editingItem.CityID, data })
                )}
                className="space-y-4 dark:text-white"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">City Name *</span>
                    <Controller
                      name="CityName"
                      control={cityForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="Los Angeles..." {...field} />
                      )}
                    />
                  </label>
                  <Controller
                    name="StateName"
                    control={cityForm.control}
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">State Name *</span>

                        <Select
                          onValueChange={(stateIdString) => {
                            // const selected = states.find(s => s.StateID.toString() === stateIdString);
                            const selected = states.find(
                              (s: State) => s.StateID.toString() === stateIdString
                            );
                            if (selected) {
                              cityForm.setValue('StateID', selected.StateID);
                              cityForm.setValue('StateName', selected.StateName);
                              cityForm.setValue('CountryID', selected.CountryID);
                              // const selectedCountry = countries.find(c => c.CountryID === selected.CountryID);
                              const selectedCountry = countries.find(
                                (c: Country) => c.CountryID === selected?.CountryID
                              );
                              if (selectedCountry) {
                                cityForm.setValue('CountryName', selectedCountry.CountryName);
                              }
                            }
                          }}
                          value={
                            cityForm.watch('StateID')
                              ? cityForm.watch('StateID').toString()
                              : undefined
                          }
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select a state" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:text-white dark:bg-black">
                            {states.map((state: State) => (
                              <SelectItem key={state.StateID} value={state.StateID.toString()}>
                                {state.StateName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />
                  <Controller
                    control={cityForm.control}
                    name="CountryName"
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Country *</span>

                        <Select
                          onValueChange={(countryIdString) => {
                            // const selected = countries.find(c => c.CountryID.toString() === countryIdString);
                            const selected = countries.find(
                              (c: Country) => c.CountryID.toString() === countryIdString
                            );

                            if (selected) {
                              cityForm.setValue('CountryID', selected.CountryID);
                              cityForm.setValue('CountryName', selected.CountryName);
                            }
                          }}
                          value={
                            cityForm.watch('CountryID')
                              ? cityForm.watch('CountryID').toString()
                              : undefined
                          }
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select a country" />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:text-white dark:bg-black">
                            {countries.map((country: Country) => (
                              <SelectItem
                                key={country.CountryID}
                                value={country.CountryID.toString()}
                              >
                                {country.CountryName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Postal Code *</span>
                    <Controller
                      name="PostalCode"
                      control={cityForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="e.g., 90001" {...field} />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Latitude *</span>
                    <Controller
                      name="Latitude"
                      control={cityForm.control}
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          type="number"
                          step="0.00000001"
                          placeholder="34.052235"
                          {...field}
                        />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Longitude *</span>
                    <Controller
                      name="Longitude"
                      control={cityForm.control}
                      render={({ field }) => (
                        <input
                          className="input mt-1"
                          type="number"
                          step="0.00000001"
                          placeholder="-118.243683"
                          {...field}
                        />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">WikiData ID *</span>
                    <Controller
                      name="WikiDataID"
                      control={cityForm.control}
                      render={({ field }) => (
                        <input className="input mt-1" placeholder="e.g., Q65" {...field} />
                      )}
                    />
                  </label>
                  <Controller
                    control={cityForm.control}
                    name="UniverseID"
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Universe ID *</span>

                        <Select
                          onValueChange={field.onChange}
                          value={field.value ? field.value.toString() : ''} // fallback to empty string
                          disabled={universesLoading}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue
                              placeholder={universesLoading ? 'Loading...' : 'Select a universe'}
                            />
                          </SelectTrigger>

                          <SelectContent className="bg-white dark:text-white dark:bg-black">
                            {universes.map((universe: Universe, index: number) => {
                              if (!universe?.UniverseID) return null;
                              return (
                                <SelectItem
                                  key={universe.UniverseID}
                                  value={universe.UniverseID.toString()}
                                >
                                  {universe.UniverseName || `Universe ${index + 1}`}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />
                  <div className="flex items-center justify-between border p-3 rounded-md gap-3">
                    <span className="text-md font-semibold">Enable this City</span>

                    <Controller
                      name="IsActive"
                      control={cityForm.control}
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
                    onClick={() => setIsEditOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-outline px-4 py-2 text-md"
                    disabled={updateCityMutation.isPending}
                  >
                    {updateCityMutation.isPending ? 'Updating...' : 'Update City'}
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
