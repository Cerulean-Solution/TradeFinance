import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DataTable from '../FrameworkComponent/DataTable';
import type { Column } from '../FrameworkComponent/DataTable';
import Tabs from '../FrameworkComponent/Tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
interface Universe {
  UniverseID: number;
  UniverseName: string;
}

export const languageSchema = z.object({
  LanguageID: z.number().optional(),
  LanguageCode: z.string().min(1, 'Language code is required'),
  LanguageName: z.string().min(1, 'Language name is required'),
  NativeLanguage: z.string().optional(),
  Direction: z.enum(['LTR', 'RTL'], { message: 'Direction is required' }),
  // UniverseID: z.string().min(1, 'Universe is required'),
  UniverseID: z.string().min(1, 'Please select a Universe'),

  IsActive: z.boolean().optional()
});
type LanguageFormValues = z.infer<typeof languageSchema>;

export const translationSchema = z.object({
  translations: z.array(
    z.object({
      key: z.string().min(1, 'Key is required'),
      en: z.string().min(1, 'English is required'),
      ar: z.string().optional(),
      es: z.string().optional()
    })
  )
});
export type TranslationFormValues = z.infer<typeof translationSchema>;

const HeaderComponentSchema = z.object({
  component: z.string().min(1, 'Component key is required'),
  component_name: z.string().min(1, 'Component name is required')
});
type HeaderComponentForm = z.infer<typeof HeaderComponentSchema>;

interface Language {
  LanguageID?: number;
  LanguageCode: string;
  LanguageName: string;
  NativeLanguage?: string;
  Direction: 'LTR' | 'RTL';
  IsActive: boolean;
  CreatedAt?: string;
  UpdatedAt?: string;
  UniverseID: string;
}

export interface Translation {
  TranslationKey: string;
  English: string;
  Arabic?: string;
  Spanish?: string;
  TranslationID: number;
}

type EditingItem =
  | { type: 'languages'; data: Language }
  | { type: 'translations'; data: Translation }
  | { type: 'ui-translation'; data: UITranslation };

type HeaderComponent = {
  ui_component_id: number;
  component: string;
  component_name: string;
  created_at: string;
  updated_at: string;
};

// Multiple component
interface UITranslation {
  UI_Translation_id: number;
  UI_Translation_name: string;
  component?: string;
  ui_component_id: number;
  TranslationID: number;
}

type ComponentRow = {
  ui_component_id: number;
  component: string;
  component_name: string;
};

type ComponentTables = {
  header: ComponentRow[];
  sidebar: ComponentRow[];
};

const Localization = () => {
  const [searchTerm, setSearchTerm] = useState('');
  type TabKey = 'languages' | 'translations' | 'ui-translations';
  const [activeTab, setActiveTab] = useState<TabKey>('languages');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<UITranslation | null>(null);
  const [isCreateWholeDialogOpen, setIsCreateWholeDialogOpen] = useState(false);
  const [WholeComponents, setWholeComponents] = useState<UITranslation[]>([]);
  const [targetTable, setTargetTable] = useState<keyof ComponentTables>('header');
  const [selectedComponentNames, setSelectedComponentNames] = useState<string[]>([]);
  const [showEditNameField, setShowEditNameField] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [componentIdMap, setComponentIdMap] = useState<Record<string, number>>({});
  const queryClient = useQueryClient();
  const [tableLoading, setTableLoading] = useState(false);
  const [dialogData, setDialogData] = useState<{
    component_type: string;
    component_name: string;
    ui_component_id: number;
    ui_translation_name: string;
    component: string;
  } | null>(null);

  // form for content Translation
  const form = useForm({
    resolver: zodResolver(translationSchema),
    defaultValues: {
      translations: [{ key: '', en: '', ar: '', es: '' }]
    }
  });

  // 👉 ADD form (used in Add New Language dialog)
  const languageForm = useForm<LanguageFormValues>({
    resolver: zodResolver(languageSchema),
    defaultValues: {
      LanguageName: '',
      LanguageCode: '',
      NativeLanguage: '',
      Direction: 'LTR',
      IsActive: true,
      UniverseID: ''
    }
  });

  // 👉 EDIT form (used in Edit Language dialog)
  const editLanguageForm = useForm<LanguageFormValues>({
    resolver: zodResolver(languageSchema),
    defaultValues: {
      LanguageID: undefined,
      LanguageName: '',
      LanguageCode: '',
      NativeLanguage: '',
      Direction: 'LTR',
      IsActive: true,
      UniverseID: ''
    }
  });

  // ➤ ADD TRANSLATION FORM
  const translationForm = useForm<TranslationFormValues>({
    resolver: zodResolver(translationSchema),
    defaultValues: {
      translations: [{ key: '', en: '', ar: '', es: '' }]
    }
  });

  // ➤ EDIT TRANSLATION FORM
  const editTranslationForm = useForm<TranslationFormValues>({
    resolver: zodResolver(translationSchema),
    defaultValues: {
      translations: [{ key: '', en: '', ar: '', es: '' }]
    }
  });

  const { control, watch, setValue } = translationForm;

  // form for UI translation
  const UIform = useForm<HeaderComponentForm>({
    resolver: zodResolver(HeaderComponentSchema),
    defaultValues: {
      component: '',
      component_name: ''
    }
  });

  // form in ui translation edit
  const editComponentForm = useForm({
    defaultValues: {
      component_type: '',
      component_name: '',
      edit_name: ''
    }
  });

  // Fetch languages data
  const { data: languages = [], isLoading: languagesLoading } = useQuery({
    queryKey: ['languages'],
    queryFn: async () => {
      const response = await fetch('/api/framework/languages');
      if (!response.ok) throw new Error('Failed to fetch languages');
      return response.json();
    }
  });
  console.log(languages);

  const { fields, append, remove } = useFieldArray({
    control: translationForm.control,
    name: 'translations'
  });

  const { data: universes = [], isLoading: universesLoading } = useQuery({
    queryKey: ['universes'],
    queryFn: async () => {
      const response = await fetch('/api/framework/universes');
      if (!response.ok) throw new Error('Failed to fetch universes');
      return response.json();
    }
  });
  console.log(universes);

  const { data: translations = [], isLoading: translationsLoading } = useQuery({
    queryKey: ['translations'],
    queryFn: async () => {
      const res = await fetch('/api/framework/translations');
      if (!res.ok) throw new Error('Failed to load translations');
      return res.json();
    }
  });
  console.log(translations);

  const { data: headerComponents = [], isLoading: isHeaderLoading } = useQuery<HeaderComponent[]>({
    queryKey: ['components'],
    queryFn: async () => {
      const res = await fetch('/api/framework/header-components');
      if (!res.ok) throw new Error('Failed to load header components');
      return res.json();
    }
  });
  console.log(headerComponents);

  const { data: componentTables = { header: [], sidebar: [] } } = useQuery<ComponentTables>({
    queryKey: ['all-component-tables'],
    queryFn: async () => {
      const res = await fetch('/api/framework/component-tables');
      if (!res.ok) throw new Error('Failed to load component tables');
      return res.json();
    }
  });
  console.log('asf', componentTables);

  // create

  const createLanguageMutation = useMutation({
    mutationFn: async (data: z.infer<typeof languageSchema>) => {
      console.log(' Sending POST request with:', data);
      const response = await fetch('/api/framework/languages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Failed to create language');
      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      toast.success('Language created successfully');
      setIsCreateWholeDialogOpen(false);
      languageForm.reset();
    },

    onError: (error: unknown) => {
      let message = 'Language already exists';
      if (error instanceof Error) {
        message = error.message;
      }

      toast.error('Duplicate');
    }
  });
  const createTranslationMutation = useMutation({
    mutationFn: async (data: { key: string; en: string; ar?: string; es?: string }) => {
      const response = await fetch('/api/framework/translations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const text = await response.text();

      if (!response.ok) {
        let errorMessage = 'Failed to create translation';
        try {
          const errorData = JSON.parse(text);
          if (errorData?.message) errorMessage = errorData.message;
        } catch {}
        throw new Error(errorMessage);
      }

      // Now parse safely
      try {
        return JSON.parse(text); // safe parse
      } catch {
        return { message: 'Translation added ' };
      }
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });

      toast.success('Translation added successfully');
      setIsCreateWholeDialogOpen(false);
      translationForm.reset();
    },

    onError: (error: unknown) => {
      toast.error('Translation already exists');
    }
  });
  const createComponentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof HeaderComponentSchema>) => {
      const response = await fetch('/api/framework/header-components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const text = await response.text();

      if (!response.ok) {
        let errorMessage = 'Failed to add component';
        try {
          const errorData = JSON.parse(text);
          if (errorData?.message) errorMessage = errorData.message;
        } catch {}
        throw new Error(errorMessage);
      }

      try {
        return JSON.parse(text);
      } catch {
        return { message: 'Component added' };
      }
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all-component-tables'] });
      setIsCreateDialogOpen(false);
      toast.success('Component added successfully');
      form.reset();
    },

    onError: (error: unknown) => {
      let message = 'Creation failed or already exists';
      if (error instanceof Error) message = error.message;
      toast.error('Duplicate');
    }
  });
  const createUITranslationMutation = useMutation({
    mutationFn: async (data: { UI_Translation_name: string }) => {
      const response = await fetch('/api/framework/ui-translations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const text = await response.text();

      if (!response.ok) {
        try {
          const error = JSON.parse(text);
          throw new Error('Already exists');
        } catch {
          throw new Error('Failed to save');
        }
      }

      return JSON.parse(text);
    },
    onSuccess: (data) => {
      toast.success('Saved successfully');
      queryClient.invalidateQueries({ queryKey: ['ui-translations'] });

      setWholeComponents((prev) => [...prev, data.newTranslation]);
      UIwholeform.reset(); // Reset form after success
      setIsCreateWholeDialogOpen(false);
    },
    onError: (error: unknown) => {
      toast.error('Duplicate');
    }
  });

  // reset
  // useEffect(() => {
  //   if (isEditDialogOpen && editingItem?.type === 'languages' && editingItem.data) {
  //     editLanguageForm.reset({
  //       ...editingItem.data,
  //       UniverseID: editingItem.data.UniverseID?.toString() ?? ''
  //     });
  //   }
  // }, [isEditDialogOpen, editingItem, editLanguageForm]);
  // useEffect(() => {
  //   if (
  //     isEditDialogOpen &&
  //     editingItem?.type === "languages" &&
  //     editingItem.data &&
  //     universes.length > 0
  //   ) {
  //     editLanguageForm.reset({
  //       ...editingItem.data,
  //       UniverseID: editingItem.data.UniverseID?.toString() ?? "",
  //     });
  //   }
  // }, [isEditDialogOpen, editingItem, universes]);

  useEffect(() => {
    if (editingItem?.type === 'translations' && isEditDialogOpen && editingItem.data) {
      const data = editingItem.data as Translation;
      translationForm.reset({
        translations: [
          {
            key: data.TranslationKey ?? '',
            en: data.English ?? '',
            ar: data.Arabic ?? '',
            es: data.Spanish ?? ''
          }
        ]
      });
    }
  }, [editingItem, isEditDialogOpen]);
  const { data: uiTranslations = [], refetch: refetchUITranslations } = useQuery({
    queryKey: ['ui-translations'],
    queryFn: async () => {
      const res = await fetch('/api/framework/ui-translations');
      if (!res.ok) throw new Error('Failed to fetch UI translations');
      return res.json();
    }
  });
  useEffect(() => {
    setWholeComponents(uiTranslations);
  }, [uiTranslations]);

  useEffect(() => {
    if (selectedComponent) {
      UIform.setValue('component', selectedComponent.UI_Translation_name || '');
    }
  }, [selectedComponent, UIform]);

  // update
  const updateLanguageMutation = useMutation({
    mutationFn: async (data: z.infer<typeof languageSchema>) => {
      const response = await fetch(`/api/framework/languages/${data.LanguageID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        let errorMsg = 'Update failed';
        try {
          const errorData = await response.json();
          if (errorData?.message) errorMsg = errorData.message;
        } catch {}
        throw new Error(errorMsg);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      toast.success('Language updated successfully');
      setIsEditDialogOpen(false);
      editLanguageForm.reset();
      // optionally refetch list
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Update failed';
      toast.error('Duplicate');
    }
  });
  const updateTranslationMutation = useMutation({
    mutationFn: async (data: {
      TranslationID: number;
      key: string;
      en: string;
      ar?: string;
      es?: string;
    }) => {
      const response = await fetch(`/api/framework/translations/${data.TranslationID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const text = await response.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch (e) {
        throw new Error(`Server returned invalid JSON: ${text}`);
      }

      if (!response.ok) {
        const errorMsg = json?.message || 'Update failed';
        throw new Error(errorMsg);
      }

      return json;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });
      toast.success('Translation updated successfully');
      setIsEditDialogOpen(false);
      editTranslationForm.reset();
    },

    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Update failed';
      toast.error('Duplicate');
    }
  });
  const updateComponentMutation = useMutation({
    mutationFn: async ({
      ui_component_id,
      newName,
      componentType,
      component
    }: {
      ui_component_id: number;
      newName: string;
      componentType: string;
      component: string;
    }) => {
      const response = await fetch(`/api/framework/components/${ui_component_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component_name: newName,
          component: component
        })
      });

      const text = await response.text();

      if (!response.ok) {
        let errorMessage = 'Failed to update component';
        try {
          const errorData = JSON.parse(text);
          if (errorData?.message) errorMessage = errorData.message;
        } catch {}
        throw new Error(errorMessage);
      }

      try {
        return JSON.parse(text);
      } catch {
        return { message: 'Component updated' };
      }
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all-component-tables'] });
      toast.success('Component updated successfully');
    },

    onError: (error: unknown) => {
      let message = 'Update failed';
      if (error instanceof Error) message = error.message;
      toast.error('Duplicate');
    }
  });

  // Edit
  const handleEdit = (language: Language) => {
    // Set the editing item with type and data
    console.log(' Editing language:', language);
    setEditingItem({ type: 'languages', data: language });

    // Reset form values for editing
    editLanguageForm.reset({
      LanguageID: language.LanguageID,
      LanguageCode: language.LanguageCode,
      LanguageName: language.LanguageName,
      NativeLanguage: language.NativeLanguage || '',
      Direction: language.Direction,
      UniverseID: language.UniverseID || '',
      // UniverseID: language.UniverseID?.toString() ?? '',

      IsActive: language.IsActive ?? true
    });

    // Open the dialog
    setIsEditDialogOpen(true);
  };
  const handleEditTranslation = (translation: Translation) => {
    setEditingItem({ type: 'translations', data: translation });
    editTranslationForm.reset({
      translations: [
        {
          key: translation.TranslationKey,
          en: translation.English,
          ar: translation.Arabic ?? '',
          es: translation.Spanish ?? ''
        }
      ]
    });

    setIsEditDialogOpen(true);
  };

  // delete
  const deleteLanguageMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`http://localhost:5000/api/framework/languages/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete language');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      toast.success('Language deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete language');
    }
  });
  const deleteTranslationMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/framework/translations/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete translation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });
      toast.success('Translation deleted successfully');
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });
      toast.error('Failed to delete translation');
    }
  });
  const deleteComponentMutation = useMutation({
    mutationFn: async ({
      ui_component_id,
      component_name
    }: {
      ui_component_id: number;
      component_name: string;
    }) => {
      const res = await fetch(
        `/api/framework/components/${ui_component_id}?component_name=${encodeURIComponent(component_name)}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ component_name })
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error('Failed to delete component');
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success('Component deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['all-component-tables'] });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error('Duplicate');
    }
  });
  const deleteUITranslationMutation = useMutation({
    mutationFn: async (translationId: number) => {
      console.log(' Sending DELETE request for ID:', translationId);
      const response = await fetch(`/api/framework/ui-translations/${translationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete UI Translation');
      }
      console.log('response', response);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ui-translations'] });
      toast.success(data.message);
    },
    onError: (error: any) => {
      toast.error('Failed to delete');
    }
  });

  // filter
  const filteredLanguages = languages.filter((language: Language) => {
    const lowerSearch = searchTerm.toLowerCase();
    return (
      language.LanguageName?.toLowerCase().includes(lowerSearch) ||
      language.LanguageCode?.toLowerCase().includes(lowerSearch) ||
      language.NativeLanguage?.toLowerCase().includes(lowerSearch)
    );
  });

  // UIwholeform
  const UIwholeform = useForm<{ UI_Translation_name: string }>({
    defaultValues: { UI_Translation_name: '' }
  });

  // delete form
  const deleteForm = useForm({
    defaultValues: {
      component_name: '',
      ui_translation_name: ''
    }
  });

  // export single and whole table
  const exportToCSV = (data: ComponentRow[], filename: string) => {
    if (!data.length) return;

    const headers = Object.keys(data[0]);
    const rows = data.map((row) =>
      headers.map((field) => `"${String(row[field as keyof ComponentRow] ?? '')}"`).join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.click();
  };
  const CSVToExport = (data: object[], filename: string) => {
    if (!data.length) return;

    const csvContent =
      Object.keys(data[0]).join(',') +
      '\n' +
      data
        .map((row) =>
          Object.values(row)
            .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
            .join(',')
        )
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // translation key

  type LanguageCode = (typeof languages)[number];

  const handleLanguageSelect = async (index: number, lang: LanguageCode) => {
    const englishText = watch(`translations.${index}.en`);

    if (!englishText) {
      alert('Please enter English text first.');
      return;
    }
    try {
      const response = await fetch(
        `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${lang}`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': import.meta.env.VITE_TRANSLATOR_KEY,
            'Ocp-Apim-Subscription-Region': import.meta.env.VITE_TRANSLATOR_REGION,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([{ Text: englishText }])
        }
      );

      const result = await response.json();
      console.log(' API Response:', result);

      const translatedText = result?.[0]?.translations?.[0]?.text;

      if (translatedText) {
        setValue(
          `translations.${index}.${lang}` as
            | `translations.${number}.ar`
            | `translations.${number}.es`,
          translatedText,
          { shouldValidate: true, shouldDirty: true }
        );
      } else {
        alert('⚠️ No translated text found!');
      }
    } catch (error) {
      console.error('Translation Error:', error);
      alert('Translation failed. Check the console.');
    }
  };
  const languageColumns: Column<Language>[] = [
    // { key: 'LanguageID', label: 'Language ID' },
    { key: 'LanguageCode', label: 'Language Code' },
    { key: 'LanguageName', label: 'Language Name' },
    { key: 'NativeLanguage', label: 'Native Language', render: (row) => row.NativeLanguage || '-' },
    { key: 'Direction', label: 'Direction' },
    {
      key: 'CreatedAt',
      label: 'Created Date',
      render: (row) => (row.CreatedAt ? new Date(row.CreatedAt).toLocaleDateString() : '-')
    },
    {
      key: 'UpdatedAt',
      label: 'Updated Date',
      render: (row) => (row.UpdatedAt ? new Date(row.UpdatedAt).toLocaleDateString() : '-')
    },

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
  const translationColumns: Column<Translation>[] = [
    {
      key: 'TranslationKey',
      label: 'Translation Key',
      render: (t) => <span className="font-mono text-sm">{t.TranslationKey}</span>
    },
    {
      key: 'English',
      label: 'English'
    },
    {
      key: 'Arabic',
      label: 'Arabic',
      render: (t) => (
        <span dir="rtl" className="text-right">
          {t.Arabic}
        </span>
      )
    },
    {
      key: 'Spanish',
      label: 'Spanish'
    }
  ];

  return (
    <div className="w-full p-6 space-y-6 card ">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-md md:text-2xl font-bold dark:text-white">
              {' '}
              Localization Management
            </h1>
            <p className="text-sm md:text-md text-gray-500 dark:text-gray-600 ">
              Manage languages, translations, and UI localization for multi-language support
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="btn btn-primary btn-outline px-3 py-1"
            onClick={() => {
              const allData: ComponentRow[] = [];
              Object.keys(componentTables).forEach((key) => {
                const table = componentTables[key as keyof ComponentTables];
                if (Array.isArray(table)) {
                  allData.push(...table);
                }
              });
              CSVToExport(allData, 'All_UI_Translations');
            }}
          >
            <i className="ki-solid ki-exit-up"></i> Export
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3  xl:gap-10 gap-3 w-full ">
        <div className="card p-6 flex items-center justify-center bg-success text-white">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <i className="ki-filled ki-text xl:text-5xl text-3xl text-bold"></i>
          </div>
          <div className="text-left">
            <h1 className="xl:text-2xl text-lg font-bold dark:text-white">
              {languages.length} Active Languages
            </h1>
          </div>
        </div>
        <div className="card btn-outline bg-[#BF55EC] text-white p-6 flex items-center justify-center ">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <i className="ki-filled ki-key xl:text-5xl text-3xl"></i>
          </div>
          <div className="text-left">
            <h1 className="xl:text-2xl text-lg font-bold dark:text-white">
              {translations.length} Translation Key
            </h1>
          </div>
        </div>
        <div className="card btn-outline bg-primary text-white p-6 flex items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <i className="ki-filled ki-screen xl:text-5xl text-3xl"></i>
          </div>
          <div>
            <h1 className="xl:text-2xl text-lg font-bold dark:text-white">
              {headerComponents.length} UI Components
            </h1>
          </div>
        </div>
      </div>
      <div className="card p-4">
        <div className="grid w-full  grid-cols-1 md:grid-cols-3 gap-4">
          <Tabs
            tabs={[
              { label: 'Languages', value: 'languages' },
              { label: 'Translations', value: 'translations' },
              { label: 'UI-translations', value: 'ui-translations' }
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </div>
      </div>
      <div className="pt-0">
        <div className="card p-2">
          <div className="w-full">
            <div className="md:flex md:justify-between p-5">
              {activeTab === 'languages' && (
                <div className=" 2xl:mb-0">
                  <h1 className="text-md md:text-xl font-bold dark:text-white">
                    Languages Management
                  </h1>
                  <p className="text-sm md:text-md text-gray-500 dark:text-gray-600">
                    Manage supported languages and UI directions
                  </p>
                </div>
              )}
              {activeTab === 'translations' && (
                <div className="m2xl:mb-0">
                  <h1 className="text-md md:text-xl font-bold dark:text-white">
                    Content Translations
                  </h1>
                  <p className="text-sm md:text-md text-gray-500 dark:text-gray-600">
                    Manage application content translations and messaging
                  </p>
                </div>
              )}
              {activeTab === 'ui-translations' && (
                <div className="2xl:mb-0">
                  <h1 className="text-md md:text-xl font-bold dark:text-white">
                    UI Component Translations
                  </h1>
                  <p className=" text-sm md:text-md text-gray-500 dark:text-gray-600">
                    Manage user interface element translations for different components
                  </p>
                </div>
              )}
              <button
                className="btn btn-primary btn-outline "
                onClick={() => {
                  setSelectedComponent(null);

                  if (activeTab === 'translations') {
                    translationForm.reset({
                      translations: [{ key: '', en: '', ar: '', es: '' }]
                    });
                  }

                  UIwholeform.reset();
                  setIsCreateWholeDialogOpen(true);
                }}
              >
                {' '}
                <i className="ki-filled ki-plus"></i> Add New
              </button>
            </div>
          </div>
          {/* Tab content */}
          <div className="p-0">
            {activeTab === 'languages' && (
              <div className="grid">
                <div className="card min-w-full">
                  <div className="card-table scrollable-x-auto">
                    {tableLoading ? (
                      <div className="w-full flex justify-center items-center py-20">
                        <RefreshCw className="h-10 w-10 animate-spin text-primary" />
                      </div>
                    ) : (
                      <DataTable
                        data={filteredLanguages}
                        columns={languageColumns}
                        rowKey={(l) => l.LanguageID ?? l.LanguageCode}
                        onEdit={(row) => handleEdit(row)}
                        onDelete={(row) => {
                          if (row.LanguageID) deleteLanguageMutation.mutate(row.LanguageID);
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'translations' && (
              <div className="grid">
                <div className="card min-w-full">
                  <div className="card-table scrollable-x-auto">
                    {tableLoading ? (
                      <div className="w-full flex justify-center items-center py-20">
                        <RefreshCw className="h-10 w-10 animate-spin text-primary" />
                      </div>
                    ) : (
                      <DataTable
                        data={translations}
                        columns={translationColumns}
                        rowKey={(t) => t.TranslationID}
                        onEdit={(row) => handleEditTranslation(row)}
                        onDelete={(row) => deleteTranslationMutation.mutate(row.TranslationID)}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'ui-translations' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {WholeComponents.slice()
                  .sort((a, b) =>
                    a.UI_Translation_name?.toLowerCase().localeCompare(
                      b.UI_Translation_name?.toLowerCase()
                    )
                  )
                  .map((uiTranslation: UITranslation, index: number) => {
                    if (!uiTranslation) return null;
                    const { ui_component_id, UI_Translation_name, component } = uiTranslation;

                    const normalizedComponent =
                      (Object.keys(componentTables) as (keyof ComponentTables)[]).find((key) =>
                        component?.toLowerCase().includes(key)
                      ) ?? 'header';

                    const tableData = componentTables[normalizedComponent] ?? [];
                    const normalizedTranslationName = UI_Translation_name?.toLowerCase().trim();
                    const matchingRows = tableData.filter((row) => {
                      return row.component?.toLowerCase().trim() === normalizedTranslationName;
                    });
                    const componentName = matchingRows[0]?.component_name ?? 'Unknown Component';
                    const translationCount = matchingRows.length;
                    return (
                      <div key={ui_component_id ?? index} className="w-full mb-6 p-3 card">
                        {/* Header */}
                        <div className="flex justify-between border-b pb-2">
                          <h2 className="">{UI_Translation_name}</h2>
                          <span className="badge badge-pill badge-outline badge-primary">
                            {translationCount} keys
                          </span>
                        </div>
                        <div className="p-3">
                          <p>{componentName}</p>
                        </div>
                        {/* Body */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 3xl:gap-5 gap-2">
                          <button
                            className="btn btn-success px-3 py-1 btn-outline "
                            onClick={() => {
                              const normalizedComponent =
                                (Object.keys(componentTables) as (keyof ComponentTables)[]).find(
                                  (key) => uiTranslation.component?.toLowerCase().includes(key)
                                ) ?? 'header';

                              setSelectedComponent(uiTranslation);
                              setTargetTable(normalizedComponent);
                              setIsCreateDialogOpen(true);
                            }}
                          >ADD
                          </button>
                          <button
                            className="btn btn-warning px-3 py-1 btn-outline"
                            onClick={() => {
                              const normalizedComponent =
                                (Object.keys(componentTables) as (keyof ComponentTables)[]).find(
                                  (key) => uiTranslation.component?.toLowerCase().includes(key)
                                ) ?? 'header';

                              const tableData = componentTables[normalizedComponent] ?? [];

                              const normalizedTranslationName =
                                uiTranslation.UI_Translation_name?.toLowerCase().trim();

                              const matchingRows = tableData.filter(
                                (row) =>
                                  row.component?.toLowerCase().trim() === normalizedTranslationName
                              );

                              const matchedNames = matchingRows.map((row) => row.component_name);
                              const matchedName = matchedNames[0] ?? '';

                              // 👇 No need to validate ui_component_id from clicked item anymore

                              setDialogData({
                                component_type: normalizedComponent,
                                component_name: matchedName,
                                component: uiTranslation.component ?? '', // ensures no undefined
                                ui_translation_name: uiTranslation.UI_Translation_name,
                                ui_component_id: uiTranslation.ui_component_id 
                              });
                              setEditingItem({ type: 'ui-translation', data: uiTranslation });
                              setSelectedComponentNames(matchedNames);
                              setShowEditNameField(!!matchedName);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            EDIT
                          </button>
                          <button
                            className="btn btn-danger px-3 py-1 btn-outline"
                            onClick={() => {
                              console.log(' Delete button clicked'); // DEBUG LINE
                              if (!uiTranslation.UI_Translation_id) {
                                toast.error('Translation ID is missing.');
                                return;
                              }

                              deleteUITranslationMutation.mutate(uiTranslation.UI_Translation_id);
                            }}
                          >
                            DELETE
                          </button>
                          <button
                            className="btn btn-primary px-3 py-1 btn-outline"
                            onClick={() => {
                              const normalizedComponent =
                                (Object.keys(componentTables) as (keyof ComponentTables)[]).find(
                                  (key) => uiTranslation.component?.toLowerCase().includes(key)
                                ) ?? 'header';

                              const tableData = componentTables[normalizedComponent] ?? [];

                              const filteredData = tableData.filter(
                                (row) =>
                                  row.component.toLowerCase().trim() ===
                                  uiTranslation.UI_Translation_name?.toLowerCase().trim()
                              );

                              const componentLabel =
                                uiTranslation.UI_Translation_name?.replace(/\s+/g, '_') ??
                                'component';
                              exportToCSV(filteredData, `${componentLabel}-translations`);
                            }}
                          >Export
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
          {isCreateWholeDialogOpen && (
            <div className="fixed inset-0 z-50 p-6 pt-60 md:pt-0 flex items-start  md:items-center justify-center">
              <div
                className="fixed inset-0  dark:bg-white/30 bg-black/60"
                onClick={() => setIsCreateWholeDialogOpen(false)}
              />
              <div className="bg-white dark:bg-black rounded shadow-2xl w-full lg:w-3/4 xl:w-2/4 z-10 p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold dark:text-white">
                    Add New {activeTab.slice(0, -1)}
                  </h3>
                  <button
                    className="btn btn-outline btn-danger"
                    onClick={() => setIsCreateWholeDialogOpen(false)}
                  >
                    <i className="ki-filled ki-cross"></i>
                  </button>
                </div>
                {activeTab === 'languages' && (
                  <form
                    {...languageForm}
                    onSubmit={languageForm.handleSubmit((data) => {
                      console.log('Submitting Language:', data);
                      createLanguageMutation.mutate(data);
                    })}
                    className="space-y-4 dark:text-white"
                  >
                    <Controller
                      name="UniverseID"
                      control={languageForm.control}
                      render={({ field }) => (
                        <div className="flex flex-col">
                          <span className="text-md font-semibold mb-1">Universe *</span>

                          <Select
                            onValueChange={field.onChange}
                            value={field.value?.toString() || ''}
                          >
                            <SelectTrigger className="input mt-1">
                              <SelectValue placeholder="Select Universe" />
                            </SelectTrigger>

                            <SelectContent className="bg-white dark:text-white dark:bg-black">
                              {universes?.map((universe: Universe) => (
                                <SelectItem
                                  key={universe.UniverseID}
                                  value={universe.UniverseID.toString()}
                                >
                                  {universe.UniverseName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {languageForm.formState.errors.UniverseID && (
                            <p className="text-red-500 text-sm mt-1">
                              {languageForm.formState.errors.UniverseID.message as string}
                            </p>
                          )}
                        </div>
                      )}
                    />
                    <label className="flex flex-col">
                      <span className="text-md font-semibold">Language Name *</span>

                      <Controller
                        name="LanguageName"
                        control={languageForm.control}
                        render={({ field }) => (
                          <input
                            className="input mt-1"
                            {...field}
                            placeholder="English, Spanish..."
                          />
                        )}
                      />
                    </label>
                    <label className="flex flex-col">
                      <span className="text-md font-semibold">Language Code *</span>

                      <Controller
                        name="LanguageCode"
                        control={languageForm.control}
                        render={({ field }) => (
                          <input className="input mt-1" {...field} placeholder="en, es, fr..." />
                        )}
                      />
                    </label>
                    <label className="flex flex-col">
                      <span className="text-md font-semibold">Native Language *</span>

                      <Controller
                        name="NativeLanguage"
                        control={languageForm.control}
                        render={({ field }) => (
                          <input
                            className="input mt-1"
                            {...field}
                            placeholder="English, Español..."
                          />
                        )}
                      />
                    </label>
                    <Controller
                      name="Direction"
                      control={languageForm.control}
                      render={({ field }) => (
                        <div className="flex flex-col">
                          <span className="text-md font-semibold mb-1">Direction *</span>

                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <SelectTrigger className="input mt-1">
                              <SelectValue placeholder="Select Direction" />
                            </SelectTrigger>

                            <SelectContent className="bg-white dark:text-white dark:bg-black">
                              <SelectItem value="LTR">LTR (Left to Right)</SelectItem>
                              <SelectItem value="RTL">RTL (Right to Left)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    />
                    <div className="flex items-center justify-between border p-3 rounded-md gap-3">
                      <span className="text-md font-semibold">Enable this language</span>
                      <Controller
                        name="IsActive"
                        control={languageForm.control}
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

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="btn btn-outline btn-secondary px-4 py-2 text-md"
                        onClick={() => setIsCreateWholeDialogOpen(false)}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="btn btn-outline btn-primary px-4 py-2 text-md"
                        disabled={createLanguageMutation.isPending}
                      >
                        {createLanguageMutation.isPending ? 'Creating...' : 'Create Language'}
                      </button>
                    </div>
                  </form>
                )}
                {activeTab === 'translations' && (
                  <form
                    {...translationForm}
                    onSubmit={translationForm.handleSubmit((data) => {
                      console.log('Submitting Translations:', data);
                      data.translations.forEach((t) => {
                        if (t.key && t.en) {
                          createTranslationMutation.mutate(t);
                        }
                      });
                    })}
                    className="space-y-6 dark:text-white"
                  >
                    {fields.map((item, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4 border p-4 rounded"
                      >
                        {/* Translation Key */}
                        <Controller
                          name={`translations.${index}.key`}
                          control={control}
                          render={({ field }) => (
                            <label className="flex flex-col">
                              <span className="text-md font-semibold">Translation Key *</span>
                              <input
                                className="input mt-1"
                                placeholder="e.g. greeting.welcome"
                                {...field}
                              />
                            </label>
                          )}
                        />

                        {/* English */}
                        <Controller
                          name={`translations.${index}.en`}
                          control={control}
                          render={({ field }) => (
                            <label className="flex flex-col">
                              <span className="text-md font-semibold">English *</span>
                              <input className="input mt-1" placeholder="e.g. Welcome" {...field} />
                            </label>
                          )}
                        />

                        {/* Translate to Arabic */}
                        <div className="flex flex-col">
                          <span className="text-md font-semibold mb-1">Translate to Arabic</span>
                          <Select
                            onValueChange={(value) => {
                              if (value === 'ar') handleLanguageSelect(index, 'ar');
                            }}
                          >
                            <SelectTrigger className="input mt-1">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-black">
                              <SelectItem value="none">Select</SelectItem>
                              <SelectItem value="ar">Arabic</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Translate to Spanish */}
                        <div className="flex flex-col">
                          <span className="text-md font-semibold mb-1">Translate to Spanish</span>
                          <Select
                            onValueChange={(value) => {
                              if (value === 'es') handleLanguageSelect(index, 'es');
                            }}
                          >
                            <SelectTrigger className="input mt-1">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-black">
                              <SelectItem value="none">Select</SelectItem>
                              <SelectItem value="es">Spanish</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Arabic Output */}
                        <Controller
                          name={`translations.${index}.ar`}
                          control={control}
                          render={({ field }) => (
                            <label className="flex flex-col">
                              <span className="text-md font-semibold">Arabic</span>
                              <input
                                className="input mt-1"
                                dir="rtl"
                                placeholder="Arabic translation appears here"
                                {...field}
                              />
                            </label>
                          )}
                        />

                        {/* Spanish Output */}
                        <Controller
                          name={`translations.${index}.es`}
                          control={control}
                          render={({ field }) => (
                            <label className="flex flex-col">
                              <span className="text-md font-semibold">Spanish</span>
                              <input
                                className="input mt-1"
                                placeholder="Spanish translation appears here"
                                {...field}
                              />
                            </label>
                          )}
                        />
                      </div>
                    ))}

                    {/* ADD MORE BUTTON */}
                    <button
                      type="button"
                      className="btn btn-outline btn-primary"
                      // className="flex items-center space-x-2"
                      onClick={() => append({ key: '', en: '', ar: '', es: '' })}
                    >
                      <i></i>
                      <span>Add More</span>
                    </button>

                    {/* ACTION BUTTONS */}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="btn btn-secondary btn-outline px-2 py-1"
                        onClick={() => setIsCreateWholeDialogOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary btn-outline px-2 py-1"
                        disabled={createTranslationMutation.isPending}
                      >
                        {createTranslationMutation.isPending ? 'Saving...' : 'Save Translations'}
                      </button>
                    </div>
                  </form>
                )}
                {activeTab === 'ui-translations' && (
                  <form
                    {...UIwholeform}
                    onSubmit={UIwholeform.handleSubmit(async (data) => {
                      try {
                        await createUITranslationMutation.mutateAsync(data);
                        UIwholeform.reset();
                        setIsCreateWholeDialogOpen(false);
                      } catch (error) {
                        console.error('Submit failed:', error);
                      }
                    })}
                    className="space-y-4 dark:text-white"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="flex flex-col">
                        <span className="text-md font-semibold">UI Component Name *</span>
                      </label>

                      <input
                        className="input mt-1"
                        placeholder="Los Angeles..."
                        {...UIwholeform.register('UI_Translation_name', { required: true })}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="btn btn-outline btn-secondary px-4 py-2 text-md"
                        onClick={() => setIsCreateWholeDialogOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary btn-primary px-4 py-2 text-md"
                        disabled={createUITranslationMutation.isPending}
                      >
                        {createUITranslationMutation.isPending ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
          {isCreateDialogOpen && (
            <div className="fixed inset-0 z-50 p-6 pt-60 md:pt-0 flex items-start  md:items-center justify-center">
              <div
                className="fixed inset-0  dark:bg-white/30 bg-black/60"
                onClick={() => setIsCreateDialogOpen(false)}
              />
              <div className="bg-white dark:bg-black rounded shadow-2xl w-full lg:w-3/4 xl:w-2/4 z-10 p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold dark:text-white">Add UI Translation</h3>
                  <button
                    className="btn btn-outline btn-danger"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    <i className="ki-filled ki-cross"></i>
                  </button>
                </div>
                <form
                  {...UIform}
                  onSubmit={UIform.handleSubmit((data) => {
                    const payload = {
                      ...data,
                      targetTable // Used to route to correct database table
                    };
                    console.log('submitting..', payload);
                    createComponentMutation.mutate(payload); // send with table info
                  })}
                  className="space-y-4 dark:text-white"
                >
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Component Key *</span>

                    <Controller
                      name="component"
                      control={UIform.control}
                      render={({ field }) => (
                        <input className="input mt-1" {...field} placeholder="e.g. nav.home" />
                      )}
                    />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-md font-semibold">Component Name</span>

                    <Controller
                      name="component_name"
                      control={UIform.control}
                      render={({ field }) => (
                        <input className="input mt-1" {...field} placeholder="e.g. Home" />
                      )}
                    />
                  </label>
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
                      disabled={createComponentMutation.isPending}
                    >
                      {createComponentMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {isEditDialogOpen && (
            <div className="fixed inset-0 z-50 p-6 pt-60 md:pt-0 flex items-start  md:items-center justify-center">
              <div
                className="fixed inset-0  dark:bg-white/30 bg-black/60"
                onClick={() => {
                  setIsEditDialogOpen(false);
                }}
              />
              <div className="bg-white  dark:bg-black rounded  shadow-2xl w-full lg:w-3/4 xl:w-2/4 z-10 p-5 md:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold dark:text-white">
                    Edit {editingItem?.type}
                  </h3>
                  <p> Update the {editingItem?.type} information in Azure SQL Server</p>
                  <button
                    className="btn btn-outline btn-danger"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                    }}
                  >
                    <i className="ki-cross ki-filled "></i>
                  </button>
                </div>

                {editingItem?.type === 'languages' && (
                  <form
                    {...editLanguageForm}
                    onSubmit={editLanguageForm.handleSubmit((data) => {
                      updateLanguageMutation.mutate(data);
                    })}
                    className="space-y-4 dark:text-white"
                  >
                    <Controller
                      name="UniverseID"
                      control={editLanguageForm.control}
                      render={({ field }) => (
                        <div className="flex flex-col">
                          <span className="text-md font-semibold mb-1">Universe *</span>

                          <Select
                            onValueChange={field.onChange}
                            value={field.value?.toString() || ''}
                          >
                            <SelectTrigger className="input mt-1">
                              <SelectValue placeholder="Select Universe" />
                            </SelectTrigger>

                            <SelectContent className="bg-white dark:text-white dark:bg-black">
                              {universes?.map((universe: Universe) => (
                                <SelectItem
                                  key={universe.UniverseID}
                                  value={universe.UniverseID.toString()}
                                >
                                  {universe.UniverseName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {editLanguageForm.formState.errors.UniverseID && (
                            <p className="text-red-500 text-sm mt-1">
                              {editLanguageForm.formState.errors.UniverseID.message as string}
                            </p>
                          )}
                        </div>
                      )}
                    />
                    <label className="flex flex-col">
                      <span className="text-md font-semibold">Language Name *</span>

                      <Controller
                        name="LanguageName"
                        control={editLanguageForm.control}
                        render={({ field }) => (
                          <input
                            className="input mt-1"
                            {...field}
                            placeholder="English, Spanish..."
                          />
                        )}
                      />
                    </label>
                    <label className="flex flex-col">
                      <span className="text-md font-semibold">Language Code *</span>

                      <Controller
                        name="LanguageCode"
                        control={editLanguageForm.control}
                        render={({ field }) => (
                          <input className="input mt-1" {...field} placeholder="en, es, fr..." />
                        )}
                      />
                    </label>
                    <label className="flex flex-col">
                      <span className="text-md font-semibold">Native Language</span>

                      <Controller
                        name="NativeLanguage"
                        control={editLanguageForm.control}
                        render={({ field }) => (
                          <input
                            className="input mt-1"
                            {...field}
                            placeholder="English, Español..."
                          />
                        )}
                      />
                    </label>
                    <Controller
                      name="Direction"
                      control={editLanguageForm.control}
                      render={({ field }) => (
                        <div className="flex flex-col">
                          <span className="text-md font-semibold mb-1">Direction *</span>

                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <SelectTrigger className="input mt-1">
                              <SelectValue placeholder="Select Direction" />
                            </SelectTrigger>

                            <SelectContent className="bg-white dark:text-white dark:bg-black">
                              <SelectItem value="LTR">LTR (Left to Right)</SelectItem>
                              <SelectItem value="RTL">RTL (Right to Left)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    />
                    <div className="flex items-center justify-between border p-3 rounded-md gap-3">
                      <span className="text-md font-semibold">Enable this language</span>
                      <Controller
                        name="IsActive"
                        control={editLanguageForm.control}
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

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="btn btn-outline btn-secondary px-4 py-2 text-md"
                        onClick={() => {
                          setIsEditDialogOpen(false);
                          editLanguageForm.reset();
                        }}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="btn btn-outline btn-primary px-4 py-2 text-md"
                        disabled={updateLanguageMutation.isPending}
                      >
                        {updateLanguageMutation.isPending ? 'Updating...' : 'Update Language'}
                      </button>
                    </div>
                  </form>
                )}
                {/* State */}
                {editingItem?.type === 'translations' && isEditDialogOpen && (
                  <form
                    {...editTranslationForm}
                    onSubmit={editTranslationForm.handleSubmit((data) => {
                      console.log('Submitting form data:', data);
                      const t = data.translations[0];

                      const updated = {
                        TranslationID: editingItem.data.TranslationID,
                        key: t.key,
                        en: t.en,
                        ar: t.ar,
                        es: t.es
                      };

                      updateTranslationMutation.mutate(updated);
                    })}
                    className="space-y-6 dark:text-white"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border p-4 rounded">
                      <Controller
                        name="translations.0.key"
                        control={editTranslationForm.control}
                        render={({ field }) => (
                          <label className="flex flex-col">
                            <span className="text-md font-semibold">Translation Key *</span>
                            <input
                              className="input mt-1"
                              placeholder="e.g. greeting.welcome"
                              {...field}
                            />
                          </label>
                        )}
                      />

                      {/* English */}
                      <Controller
                        control={editTranslationForm.control}
                        name="translations.0.en"
                        render={({ field }) => (
                          <label className="flex flex-col">
                            <span className="text-md font-semibold">English *</span>
                            <input className="input mt-1" placeholder="e.g. Welcome" {...field} />
                          </label>
                        )}
                      />

                      {/* Translate to Arabic */}
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Translate to Arabic</span>
                        <Select
                          onValueChange={(value) => {
                            if (value === 'ar') handleLanguageSelect(0, 'ar');
                          }}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-black">
                            <SelectItem value="none">Select</SelectItem>
                            <SelectItem value="ar">Arabic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Translate to Spanish */}
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Translate to Spanish</span>
                        <Select
                          onValueChange={(value) => {
                            if (value === 'es') handleLanguageSelect(0, 'es');
                          }}
                        >
                          <SelectTrigger className="input mt-1">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-black">
                            <SelectItem value="none">Select</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Arabic Output */}
                      <Controller
                        control={editTranslationForm.control}
                        name="translations.0.ar"
                        render={({ field }) => (
                          <label className="flex flex-col">
                            <span className="text-md font-semibold">Arabic</span>
                            <input
                              className="input mt-1"
                              dir="rtl"
                              placeholder="Arabic translation appears here"
                              {...field}
                            />
                          </label>
                        )}
                      />

                      {/* Spanish Output */}
                      <Controller
                        control={editTranslationForm.control}
                        name="translations.0.es"
                        render={({ field }) => (
                          <label className="flex flex-col">
                            <span className="text-md font-semibold">Spanish</span>
                            <input
                              className="input mt-1"
                              placeholder="Spanish translation appears here"
                              {...field}
                            />
                          </label>
                        )}
                      />
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="btn btn-secondary btn-outline px-2 py-1"
                        onClick={() => {
                          setIsEditDialogOpen(false);
                          editTranslationForm.reset();
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary btn-outline px-2 py-1"
                        disabled={updateTranslationMutation.isPending}
                      >
                        {updateTranslationMutation.isPending ? 'Updating...' : 'Update Translation'}
                      </button>
                    </div>
                  </form>
                )}

                {/* City */}
                {editingItem?.type === 'ui-translation' &&
                  isEditDialogOpen &&
                  dialogData?.component_type &&
                  dialogData?.ui_translation_name && (
                    <form
                      {...editComponentForm}
                      onSubmit={editComponentForm.handleSubmit((data) => {
                        const normalizedComponent =
                          dialogData.component_type as keyof ComponentTables;
                        const tableData = componentTables[normalizedComponent] ?? [];

                        const selectedComponentRow = tableData.find(
                          (row) => row.component_name === data.component_name
                        );

                        if (!selectedComponentRow?.ui_component_id) {
                          toast.error('Component Name or ID is missing.');
                          return;
                        }

                        updateComponentMutation.mutate({
                          ui_component_id: selectedComponentRow.ui_component_id,
                          component: dialogData.ui_translation_name,
                          newName: data.edit_name,
                          componentType: dialogData.component_type
                        });

                        setIsEditDialogOpen(false);
                        editComponentForm.reset();
                        setSelectedComponentNames([]);
                        setShowEditNameField(false);
                      })}
                      className="space-y-4 dark:text-white"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="flex flex-col">
                          <span className="text-md font-semibold">UI Translation Name *</span>
                          <p> {dialogData.ui_translation_name}</p>
                        </label>

                        <Controller
                          control={editComponentForm.control}
                          name="component_name"
                          render={({ field }) => (
                            <div className="flex flex-col">
                              <span className="text-md font-semibold mb-1">Component Name</span>

                              <Select
                                onValueChange={(selectedName) => {
                                  field.onChange(selectedName);
                                  editComponentForm.setValue('edit_name', selectedName);
                                  setShowEditNameField(!!selectedName);
                                }}
                                value={field.value ? String(field.value) : undefined}
                              >
                                <SelectTrigger className="input mt-1">
                                  <SelectValue placeholder="Select component" />
                                </SelectTrigger>

                                <SelectContent className="bg-white dark:text-white dark:bg-black">
                                  {selectedComponentNames.map((name) => (
                                    <SelectItem key={name} value={name}>
                                      {name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        />
                        <label className="flex flex-col">
                          <span className="text-md font-semibold">Edit Name</span>

                          <Controller
                            control={editComponentForm.control}
                            name="edit_name"
                            render={({ field }) => (
                              <input
                                className="input mt-1"
                                {...field}
                                placeholder="New Component Name..."
                              />
                            )}
                          />
                        </label>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn btn-outline btn-secondary px-4 py-2 text-md"
                          onClick={() => {
                            setIsEditDialogOpen(false);
                            editComponentForm.reset();
                            setSelectedComponentNames([]);
                            setShowEditNameField(false);
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn btn-danger btn-outline"
                          onClick={() => {
                            const normalizedComponent =
                              dialogData?.component_type as keyof ComponentTables;
                            const tableData = componentTables[normalizedComponent] ?? [];

                            const selectedName = editComponentForm.getValues('component_name');

                            const matchingRow = tableData.find(
                              (row) => row.component_name === selectedName
                            );

                            if (!matchingRow?.ui_component_id || !matchingRow.component_name) {
                              toast.error('Component Name or ID not found.');
                              return;
                            }

                            deleteComponentMutation.mutate({
                              ui_component_id: matchingRow.ui_component_id,
                              component_name: matchingRow.component_name
                            });

                            setIsEditDialogOpen(false);
                            editComponentForm.reset();
                            setSelectedComponentNames([]);
                            setShowEditNameField(false);
                          }}
                        >
                          Delete
                        </button>

                        <button
                          type="submit"
                          className="btn btn-primary btn-primary px-4 py-2 text-md"
                        >
                          Update
                        </button>
                      </div>
                    </form>
                  )}
              </div>
            </div>
          )}
          {isDeleteDialogOpen && (
            <div className="fixed inset-0 z-50 p-6 pt-60 md:pt-0 flex items-start md:items-center justify-center">
              <div
                className="fixed inset-0 dark:bg-white/30 bg-black/60"
                onClick={() => setIsDeleteDialogOpen(false)}
              />

              <div className="bg-white dark:bg-black rounded shadow-2xl w-full lg:w-3/4 xl:w-2/4 z-10 p-5 md:p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold dark:text-white">Confirm Delete</h3>

                  <button
                    className="btn btn-outline btn-danger"
                    onClick={() => setIsDeleteDialogOpen(false)}
                  >
                    <i className="ki-cross ki-filled"></i>
                  </button>
                </div>

                {/* Form */}
                <form
                  onSubmit={deleteForm.handleSubmit((data) => {
                    const selectedName = data.component_name;
                    const selectedId = componentIdMap[selectedName];

                    if (!selectedName || !selectedId) {
                      console.log(' Missing required fields');
                      return;
                    }



                    deleteComponentMutation.mutate({
                      ui_component_id: selectedId,
                      component_name: selectedName
                    });
                  })}
                  className="space-y-4 dark:text-white"
                >
                  {/* Hidden Input */}
                  <input
                    type="hidden"
                    {...deleteForm.register('ui_translation_name')}
                    value={dialogData?.ui_translation_name || ''}
                  />

                  {/* UI Translation Name (Static) */}
                  <div className="flex flex-col">
                    <span className="text-md font-semibold mb-1">UI Translation Name</span>
                    <div className="p-2 bg-gray-100 rounded dark:bg-gray-800 dark:text-white">
                      {dialogData?.ui_translation_name}
                    </div>
                  </div>

                  {/* Component Selection */}
                  <Controller
                    name="component_name"
                    control={deleteForm.control}
                    render={({ field }) => (
                      <div className="flex flex-col">
                        <span className="text-md font-semibold mb-1">Component Name</span>

                        <div className="relative w-full">
                          <select
                            {...field}
                            className="w-full border p-2 pr-8 rounded bg-white dark:bg-black text-gray-700 dark:text-white appearance-none"
                          >
                            <option value="">Select Component</option>
                            {selectedComponentNames.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>

                          {/* Dropdown Icon */}
                          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                            <svg
                              className="w-4 h-4 text-gray-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M7 7l3-3 3 3m0 6l-3 3-3-3" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                  />

                  {/* Delete Button */}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="btn btn-outline btn-secondary px-4 py-2 text-md"
                      onClick={() => setIsDeleteDialogOpen(false)}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="btn btn-outline btn-danger px-4 py-2 text-md"
                      disabled={!deleteForm.watch('component_name')}
                    >
                      Delete
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Localization;
