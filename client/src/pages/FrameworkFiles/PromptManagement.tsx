import { useEffect, useState } from "react";
import { Search, Filter, Plus, Database, Settings, Badge, Languages, FileText, Upload, RefreshCw } from "lucide-react";
import { FaCodeBranch, FaDatabase } from 'react-icons/fa';
import Model from "./promptscreen/model";
import OrgStats from "./promptscreen/OrgStats";
import DataTable from '../FrameworkComponent/DataTable';
import type { Column } from "../FrameworkComponent/DataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import Tabs from "../FrameworkComponent/Tabs";

type Prompt = {
    prompt_id: number | string;
    module_name: string;
    instrument_type?: string;
    lifecycle_stage?: string;
    analysis_mode?: string;
    prompt_text?: string;
    description?: string;
    is_active?: boolean;
    version?: string;
    version_desc?: string;
    created_date?: string;
    modified_date?: string;
};

type PromptFilters = {
    search: string;
    is_active: string;
    lifecycle_stage: string;
    instrument_type: string;
    module_name: string;
    sortBy: string;
    sortOrder: "asc" | "desc";
    page: number;
    limit: number;
};

type PromptsResponse = {
    prompts: Prompt[];
    totalCount?: number;
    activeCount?: number;
    page?: number;
    totalPages?: number;
};

export default function PromptManagement() {
    const navigate = useNavigate();

    // ---------------------------
    // Separate filter states
    // ---------------------------
    const [promptFilters, setPromptFilters] = useState<PromptFilters>({
        search: "",
        is_active: "all",
        instrument_type: "all",
        lifecycle_stage: "all",
        module_name: "all",
        sortBy: "created_date",
        sortOrder: "desc",
        page: 1,
        limit: 10,
    });

    const [versionFilters, setVersionFilters] = useState<PromptFilters>({
        search: "",
        is_active: "all",
        instrument_type: "all",
        lifecycle_stage: "all",
        module_name: "all",
        sortBy: "created_date",
        sortOrder: "desc",
        page: 1,
        limit: 10,
    });

    // ---------------------------
    // Data / UI state
    // ---------------------------
    const [data, setData] = useState<PromptsResponse | null>(null); // prompt data + meta
    const [versionData, setVersionData] = useState<any[]>([]); // versions rows
    const [versionMeta, setVersionMeta] = useState({ totalCount: 0, page: 1, totalPages: 1 }); // version pagination meta

    const [isLoading, setIsLoading] = useState(false); // for prompt fetch
    const [tableLoading, setTableLoading] = useState(false); // for version fetch
    const [activeTab, setActiveTab] = useState<"prompt" | "version">("prompt");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [promptToDelete, setPromptToDelete] = useState<Prompt | null>(null);
    const [viewVersionModal, setViewVersionModal] = useState(false);
    const [selectedVersionRow, setSelectedVersionRow] = useState<Prompt | null>(null);

    const [instrumentOptions, setInstrumentOptions] = useState<string[]>([]);
    const [lifecycleOptions, setLifecycleOptions] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    // ---------------------------
    // Columns (unchanged)
    // ---------------------------
    const versionColumns = [
        {
            key: "view",
            label: "View",
            render: (row: any) => (
                <button onClick={() => handleVersionView(row)} className="text-blue-600 hover:text-blue-900">
                    <FileText size={18} />
                </button>
            )
        },
        { key: "old_prompt_id", label: "Old Prompt ID" },
        { key: "module_name", label: "Module" },
        { key: "instrument_type", label: "Instrument Type" },
        { key: "lifecycle_stage", label: "Lifecycle Stage" },
        { key: "analysis_mode", label: "Analysis Mode" },
        {
            key: "old_prompt_text",
            label: "Old Prompt",
            render: (row: any) => <span className="truncate max-w-[260px] inline-block">{row.old_prompt_text}</span>
        },
        {
            key: "prompt_text",
            label: "New Prompt",
            render: (row: any) => <span className="truncate max-w-[260px] inline-block">{row.prompt_text}</span>
        },
        { key: "old_version", label: "Old Version" },
        { key: "new_version", label: "New Version" },
        {
            key: "is_active",
            label: "Active",
            render: (row: any) => <span className={row.is_active ? "text-green-600" : "text-red-600"}>{row.is_active ? "Active" : "Inactive"}</span>
        },
        {
            key: "created_date",
            label: "Created Date",
            render: (row: any) => new Date(row.created_date).toLocaleString()
        },
        {
            key: "modified_date",
            label: "Updated Date",
            render: (row: any) => new Date(row.modified_date).toLocaleString()
        },
    ];

    const promptColumns: Column<Prompt>[] = [
        // {
        //     key: "inherit",
        //     label: "Inherit",
        //     render: (row) => (
        //         <button onClick={() => handleInheritance(row)} className="text-blue-600 hover:text-blue-800">
        //             <FaCodeBranch size={18} />
        //         </button>
        //     )
        // },

        {
            key: "inherit",
            label: "Actions",
            render: (row) => (
                <div className="flex gap-2 items-center">

                    {/* Inherit Button */}
                    <button
                        onClick={() => handleInheritance(row)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Inherit Prompt"
                    >
                        <FaCodeBranch size={18} />
                    </button>

                    {/* View Button */}
                    <button
                        onClick={() => navigate(`/framework/prompt-management/view/${row.prompt_id}`)}
                        className="text-green-600 hover:text-green-800"
                        title="View Prompt"
                    >
                        <FileText size={18} />
                    </button>

                </div>
            )
        },

        
        { key: "module_name", label: "Module" },
        { key: "instrument_type", label: "Instrument" },
        { key: "lifecycle_stage", label: "Lifecycle" },
        { key: "analysis_mode", label: "Analysis" },
        {
            key: "prompt_text",
            label: "Prompt",
            render: (row) => <span className="truncate whitespace-nowrap overflow-hidden text-ellipsis max-w-[240px] inline-block">{row.prompt_text}</span>
        },
        {
            key: "description",
            label: "Description",
            render: (row) => <span className="truncate whitespace-nowrap overflow-hidden text-ellipsis max-w-[240px] inline-block">{row.description}</span>
        },
        {
            key: "is_active",
            label: "Active",
            render: (row) => <span className={row.is_active ? "text-green-600" : "text-red-600"}>{row.is_active ? "Active" : "Inactive"}</span>
        },
        { key: "version", label: "Version" },
        {
            key: "version_desc",
            label: "Version Description",
            render: (row) => <span className="truncate whitespace-nowrap overflow-hidden text-ellipsis max-w-[210px] inline-block">{row.version_desc}</span>
        },
        {
            key: "created_date",
            label: "Created",
            render: (row: any) => new Date(row.created_date).toLocaleDateString()
        },
        {
            key: "modified_date",
            label: "Updated",
            render: (row: any) => new Date(row.modified_date).toLocaleDateString()
        },
    ];

    // ---------------------------
    // Fetch dropdowns once
    // ---------------------------
    useEffect(() => {
        const fetchDropdowns = async () => {
            try {
                const [instRes, lifeRes] = await Promise.all([
                    fetch("http://localhost:5000/api/prompts/instrument-types"),
                    fetch("http://localhost:5000/api/prompts/lifecycle-stages"),
                ]);
                const [instData, lifeData] = await Promise.all([instRes.json(), lifeRes.json()]);
                setInstrumentOptions(instData);
                setLifecycleOptions(lifeData);
            } catch (err) {
                console.error("Failed to fetch dropdowns", err);
            }
        };
        fetchDropdowns();
    }, []);

    // ---------------------------
    // Fetch prompts (runs when promptFilters change AND when tab is 'prompt')
    // ---------------------------
    const fetchPrompts = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const params = new URLSearchParams(promptFilters as any).toString();
            const res = await fetch(`http://localhost:5000/api/prompts?${params}`);
            if (!res.ok) throw new Error("Failed to fetch prompts");
            const json = await res.json();
            setData(json);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === "prompt") {
            fetchPrompts();
        }
        // we only want to re-run fetchPrompts when promptFilters changes OR activeTab changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [promptFilters, activeTab]);

    // ---------------------------
    // Fetch versions (runs when versionFilters change AND when tab is 'version')
    // ---------------------------
    const fetchVersions = async () => {
        try {
            setTableLoading(true);
            setError(null);
            const params = new URLSearchParams(versionFilters as any).toString();
            const res = await fetch(`http://localhost:5000/api/prompt-versions?${params}`);
            if (!res.ok) throw new Error("Failed to fetch version history");
            const json = await res.json();

            // backend returns { versions: rows, totalCount, page, totalPages }
            setVersionData(json.versions ?? []);
            setVersionMeta({
                totalCount: json.totalCount ?? 0,
                page: json.page ?? versionFilters.page,
                totalPages: json.totalPages ?? 1,
            });
        } catch (err: any) {
            console.error("Version fetch error:", err);
            setError(err.message);
        } finally {
            setTableLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === "version") {
            fetchVersions();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [versionFilters, activeTab]);

    // ---------------------------
    // Handlers for UI filter box (Option A: single filter box controls active tab)
    // ---------------------------
    const handleSearch = (value: string) => {
        if (activeTab === "prompt") {
            setPromptFilters(prev => ({ ...prev, search: value, page: 1 }));
        } else {
            setVersionFilters(prev => ({ ...prev, search: value, page: 1 }));
        }
    };

    const handleFilterChange = (key: keyof PromptFilters, value: any) => {
        if (activeTab === "prompt") {
            setPromptFilters(prev => ({ ...prev, [key]: value, page: 1 }));
        } else {
            setVersionFilters(prev => ({ ...prev, [key]: value, page: 1 }));
        }
    };

    const handleLimitChange = (limit: number) => {
        if (activeTab === "prompt") {
            setPromptFilters(prev => ({ ...prev, limit, page: 1 }));
        } else {
            setVersionFilters(prev => ({ ...prev, limit, page: 1 }));
        }
    };

    // pagination handlers separate
    const handlePromptPage = (page: number) => {
        setPromptFilters(prev => ({ ...prev, page }));
    };
    const handleVersionPage = (page: number) => {
        setVersionFilters(prev => ({ ...prev, page }));
    };

    const handleSort = (sortBy: "module_name" | "version" | "created_date") => {
        if (activeTab === "prompt") {
            setPromptFilters(prev => ({ ...prev, sortBy, sortOrder: prev.sortBy === sortBy && prev.sortOrder === "asc" ? "desc" : "asc", page: 1 }));
        } else {
            setVersionFilters(prev => ({ ...prev, sortBy, sortOrder: prev.sortBy === sortBy && prev.sortOrder === "asc" ? "desc" : "asc", page: 1 }));
        }
    };

    // ---------------------------
    // Other actions
    // ---------------------------
    const handleInheritance = (row: any) => {
        navigate(`/framework/prompt-management/inherit/${row.prompt_id}`);
    };

    const handleVersionView = (row: any) => {
        setSelectedVersionRow(row);
        setViewVersionModal(true);
    };

    const handleCreateNew = () => {
        setSelectedPrompt(null);
        setIsModalOpen(true);
    };

    const handleEdit = (prompt: Prompt) => {
        setSelectedPrompt(prompt);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (prompt: Prompt) => {
        setPromptToDelete(prompt);
        setIsDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!promptToDelete) return;
        try {
            await fetch(`http://localhost:5000/api/prompts/${promptToDelete.prompt_id}`, { method: "DELETE" });
            setIsDeleteDialogOpen(false);
            setPromptToDelete(null);

            // after delete, refresh the active tab data
            if (activeTab === "prompt") fetchPrompts();
            else fetchVersions();
        } catch (e) {
            console.error("Failed to delete", e);
        }
    };

    const handleRefresh = async () => {
        if (activeTab === "prompt") {
            setIsLoading(true);
            await fetchPrompts();
            setIsLoading(false);
        } else {
            setTableLoading(true);
            await fetchVersions();
            setTableLoading(false);
        }
    };

    // ---------------------------
    // UI helpers: active tab meta
    // ---------------------------
    const activePage = activeTab === "prompt" ? (data?.page ?? 1) : versionMeta.page;
    const activeTotalPages = activeTab === "prompt" ? (data?.totalPages ?? 1) : versionMeta.totalPages;
    const activeTotal = activeTab === "prompt" ? (data?.totalCount ?? 0) : versionMeta.totalCount;
    const activeLimit = activeTab === "prompt" ? (promptFilters.limit) : versionFilters.limit;

    const totalPrompts = data?.totalCount || 0;
    const activePrompts = data?.activeCount || 0;
    const lifecycleCount = new Set((data?.prompts ?? []).map(p => p.lifecycle_stage)).size;

    const statsItems = [
        {
            icon: "/media/images/FrameworkImages/chip.png",
            info: totalPrompts,
            desc: "Total Prompts",
            bg: "/media/images/2600x1600/bg-3.png",
            color: "bg-primary"
        },
        {
            icon: "/media/images/FrameworkImages/correct.png",
            info: activePrompts,
            desc: "Active Prompts",
            bg: "/media/images/2600x1600/bg-3.png",
            color: "bg-success"
        },
        {
            icon: "/media/images/FrameworkImages/assessment.png",
            info: lifecycleCount,
            desc: "Lifecycle Types",
            bg: "/media/images/2600x1600/bg-3.png",
            color: "bg-danger"
        },
    ];

    // ---------------------------
    // Render
    // ---------------------------
    return (
        <div className="w-full p-6 space-y-6 card">
            <div className="flex justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2 text-blue-600 ">
                        <FaDatabase size={36} color="primary" />Prompt Management
                    </h1>
                    <p className="text-gray-500">TF Genie Database Manager</p>
                </div>

                <div className="flex gap-2">
                    <button type="button" className="btn btn-light hover:bg-gray-100">
                        <FileText className="w-4 h-4" />Export
                    </button>
                    <label className="btn btn-light hover:bg-gray-100 cursor-pointer">
                        <Upload className="h-4 w-4" /> Import
                        <input type="file" accept=".csv" className="hidden" />
                    </label>
                    <div>
                        <button type="button" onClick={() => navigate("/framework/prompt-management/create")} className="btn btn-primary btn-outline hover:bg-blue-600">
                            <Plus className="w-5 h-5" />Add New Prompt
                        </button>

                        <Model
                            open={viewVersionModal}
                            onClose={() => setViewVersionModal(false)}
                            title="Version Details"
                            onSubmit={() => setViewVersionModal(false)}
                            config={{ width: "1500px", height: "1200px", bodyHeight: "1000px", bigTextareas: true }}
                            fields={[
                                { key: "old_prompt_id", label: "Old Prompt ID", type: "text", readonly: true },
                                { key: "module_name", label: "Module", type: "text", readonly: true },
                                { key: "instrument_type", label: "Instrument", type: "text", readonly: true },
                                { key: "lifecycle_stage", label: "Lifecycle Stage", type: "text", readonly: true },
                                { key: "analysis_mode", label: "Analysis Mode", type: "text", readonly: true },
                                { key: "old_prompt_text", label: "Old Prompt", type: "textarea", readonly: true },
                                { key: "prompt_text", label: "New Prompt", type: "textarea", readonly: true },
                                { key: "old_version", label: "Old Version", type: "text", readonly: true },
                                { key: "new_version", label: "New Version", type: "text", readonly: true },
                                { key: "created_date", label: "Created Date", type: "text", readonly: true },
                                { key: "modified_date", label: "Updated Date", type: "text", readonly: true },
                            ]}
                            initialValues={{
                                ...selectedVersionRow,
                                created_date: new Date(selectedVersionRow?.created_date ?? "").toLocaleString(),
                                modified_date: new Date(selectedVersionRow?.modified_date ?? "").toLocaleString(),
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className='mb-6'>
                <OrgStats items={statsItems} />
            </div>

            {/* -------------------------- */}
            {/* SINGLE FILTER BOX (controls active tab) */}
            {/* -------------------------- */}
            <div className="card rounded-xl shadow px-6 p-2 py-4 flex flex-col lg:flex-row items-center gap-4 mb-6 justify-between w-full">
                <div className="input input-sm max-w-lg">
                    <Search className=" left-2 top-3 h-5 w-5 text-gray-400" />
                    <input
                        className="pl-8 pr-3 py-2 border rounded-lg w-full focus:outline-blue-600"
                        type="text"
                        placeholder={activeTab === "prompt" ? "Search prompts..." : "Search versions..."}
                        value={activeTab === "prompt" ? promptFilters.search : versionFilters.search}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>

                <div className='flex gap-2 '>
                    <Select value={activeTab === "prompt" ? promptFilters.is_active : versionFilters.is_active}
                        onValueChange={(value) => handleFilterChange("is_active", value)}>
                        <SelectTrigger className="w-28" size="sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent className="w-32 z-10 ">
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={activeTab === "prompt" ? promptFilters.instrument_type : versionFilters.instrument_type}
                        onValueChange={(value) => handleFilterChange("instrument_type", value)}>
                        <SelectTrigger className="w-40" size="sm"><SelectValue placeholder="Instrument" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Instruments</SelectItem>
                            {instrumentOptions.map((inst) => <SelectItem key={inst} value={inst}>{inst}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={activeTab === "prompt" ? promptFilters.lifecycle_stage : versionFilters.lifecycle_stage}
                        onValueChange={(value) => handleFilterChange("lifecycle_stage", value)}>
                        <SelectTrigger className="w-40" size="sm"><SelectValue placeholder="Lifecycle" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Lifecycle</SelectItem>
                            {lifecycleOptions.map((life) => <SelectItem key={life} value={life}>{life}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <button type="button" onClick={handleRefresh} className="btn btn-primary btn-outline hover:bg-gray-100 h-8">
                        <RefreshCw className="h-4 w-4" />Refresh
                    </button>
                </div>
            </div>

            <div className="card p-4">
                <div className="grid w-full grid-cols-1 md:grid-cols-2 gap-4">
                    <Tabs tabs={[{ label: 'Prompt Management', value: 'prompt' }, { label: 'Version History', value: 'version' }]} activeTab={activeTab} onChange={(v) => setActiveTab(v as any)} />
                </div>
            </div>

            {/* -------------------------- */}
            {/* TABLE AREA */}
            {/* -------------------------- */}
            <div className="pt-0">
                <div className="card p-2">
                    <div className="grid">
                        <div className="card min-w-full">
                            <div className="card-table scrollable-x-auto">
                                { (activeTab === "prompt") ? (
                                    <DataTable
                                        data={data?.prompts ?? []}
                                        columns={promptColumns}
                                        onEdit={(row) => navigate(`/framework/prompt-management/edit/${row.prompt_id}`)}
                                        onDelete={handleDeleteClick}
                                        isLoading={isLoading}
                                        page={promptFilters.page}
                                        limit={promptFilters.limit}
                                        total={data?.totalCount ?? 0}
                                        onPageChange={handlePromptPage}
                                    />
                                ) : (
                                    <DataTable
                                        data={versionData}
                                        columns={versionColumns}
                                        isLoading={tableLoading}
                                        page={versionFilters.page}
                                        limit={versionFilters.limit}
                                        total={versionMeta.totalCount ?? 0}
                                        onPageChange={handleVersionPage}
                                        disableActions
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* toolbar controls use active tab meta */}
                <div className="kt-datatable-toolbar flex justify-between items-center border-t p-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        Show
                        <select className="border rounded-md p-1 w-16" value={activeLimit} onChange={(e) => handleLimitChange(Number(e.target.value))}>
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                        </select>
                        per page
                    </div>

                    <span>Page {activePage} of {activeTotalPages}</span>

                    <div className="kt-datatable-info flex items-center gap-4">
                        <div className="flex gap-2">
                            <button onClick={() => (activeTab === "prompt" ? handlePromptPage(promptFilters.page - 1) : handleVersionPage(versionFilters.page - 1))} disabled={(activeTab === "prompt" ? promptFilters.page <= 1 : versionFilters.page <= 1)} className="px-3 py-1 border rounded-md disabled:opacity-50">Prev</button>

                            <button onClick={() => (activeTab === "prompt" ? handlePromptPage(promptFilters.page + 1) : handleVersionPage(versionFilters.page + 1))} disabled={(activeTab === "prompt" ? promptFilters.page >= (data?.totalPages ?? 1) : versionFilters.page >= (versionMeta.totalPages ?? 1))} className="px-3 py-1 border rounded-md disabled:opacity-50">Next</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* DELETE CONFIRM DIALOG */}
            {isDeleteDialogOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-xl w-[320px] text-center">
                        <h2 className="text-xl font-bold mb-4 text-red-600">Delete Prompt?</h2>
                        <p className="mb-6">Are you sure you want to delete?</p>
                        <div className="flex justify-center gap-3">
                            <button className="px-3 py-1 rounded-md bg-gray-200" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</button>
                            <button className="px-3 py-1 rounded-md bg-red-600 text-white" onClick={handleDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}








// import { useEffect, useState } from "react";
// import { Search, Filter, Plus, Database, Settings, Badge, Languages, FileText, Upload, RefreshCw } from "lucide-react";

// type Prompt = {
//     prompt_id: number | string;
//     module_name: string;
//     instrument_type?: string;
//     lifecycle_stage?: string;
//     analysis_mode?: string;
//     prompt_text?: string;
//     description?: string;
//     is_active?: boolean;
//     version?: string;
//     version_desc?: string;
//     created_date?: string;
//     modified_date?: string;
// };

// type PromptFilters = {
//     search: string;
//     is_active: string;
//     lifecycle_stage: string;
//     instrument_type: string;
//     module_name: string;
//     sortBy: string;
//     sortOrder: "asc" | "desc";
//     page: number;
//     limit: number;
// };

// type PromptsResponse = {
//     prompts: Prompt[];
//     totalCount?: number;
//     activeCount?: number;
//     page?: number;
//     totalPages?: number;
// };
// import { FaCodeBranch, FaDatabase } from 'react-icons/fa';
// import Model from "./promptscreen/model";
// import OrgStats from "./promptscreen/OrgStats";
// import DataTable from '../FrameworkComponent/DataTable';
// import type { Column } from "../FrameworkComponent/DataTable";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// // import { Navigate} from "react-router";
// import { useNavigate } from "react-router-dom";
// import Tabs from "../FrameworkComponent/Tabs";



// // Metronic-inspired colors
// const colors = {
//     primary: "#3699FF",
//     success: "#1BC5BD",
//     warning: "#FFA800",
//     danger: "#F64E60",
//     gray: "#F3F6F9",
//     dark: "#3F4254",
// };


// export default function PromptManagement() {
//     const [filters, setFilters] = useState<PromptFilters>({ search: "", is_active: "all", instrument_type: "all", lifecycle_stage: "all", module_name: "all", sortBy: "created_date", sortOrder: "desc", page: 1, limit: 10, });
//     const [search, setSearch] = useState("");
//     const [isModalOpen, setIsModalOpen] = useState(false);
//     const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
//     const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
//     const [promptToDelete, setPromptToDelete] = useState<Prompt | null>(null);
//     const [data, setData] = useState<PromptsResponse | null>(null);
//     const [isLoading, setIsLoading] = useState(false);
//     const [error, setError] = useState<string | null>(null);
//     const [tableLoading, setTableLoading] = useState(false);
//     const [activeTab, setActiveTab] = useState<"prompt" | "version">("prompt");
//     const [versionData, setVersionData] = useState([]);

//     const [viewVersionModal, setViewVersionModal] = useState(false);
//     const [selectedVersionRow, setSelectedVersionRow] = useState<Prompt | null>(null);
//     const [instrumentOptions, setInstrumentOptions] = useState<string[]>([]);
//     const [lifecycleOptions, setLifecycleOptions] = useState<string[]>([]);



//     const navigate = useNavigate();


//     const fetchPrompts = async () => {
//         try {
//             setIsLoading(true);
//             setError(null);

//             const params = new URLSearchParams(filters as any).toString();
//             const res = await fetch(`http://localhost:5000/api/prompts?${params}`);

//             if (!res.ok) throw new Error("Failed to fetch prompts");

//             const json = await res.json();
//             setData(json);
//         } catch (err: any) {
//             setError(err.message);
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     const fetchVersions = async () => {
//         try {
//             setTableLoading(true);

//             const params = new URLSearchParams(filters as any).toString();
//             const res = await fetch(`http://localhost:5000/api/prompt-versions?${params}`);

//             if (!res.ok) throw new Error("Failed to fetch version history");

//             const json = await res.json();

//             setVersionData(json.versions);
//             setData((prev) => ({
//                 ...prev,
//                 totalCount: json.totalCount,
//                 totalPages: json.totalPages,
//                 page: json.page,
//                 prompts: prev?.prompts ?? [],
//                 activeCount: prev?.activeCount,
//             }));
//         } catch (err: any) {
//             console.error("Version fetch error:", err);
//             setError(err.message);
//         } finally {
//             setTableLoading(false);
//         }
//     };


//     useEffect(() => {
//         const fetchDropdowns = async () => {
//             try {
//                 const [instRes, lifeRes] = await Promise.all([
//                     fetch("http://localhost:5000/api/prompts/instrument-types"),
//                     fetch("http://localhost:5000/api/prompts/lifecycle-stages"),

//                 ]);

//                 const [instData, lifeData] = await Promise.all([
//                     instRes.json(),
//                     lifeRes.json(),

//                 ]);

//                 setInstrumentOptions(instData);
//                 setLifecycleOptions(lifeData);

//             } catch (err) {
//                 console.error("Failed to fetch dropdowns", err);
//             }
//         };

//         fetchDropdowns();
//     }, []);

//     useEffect(() => {
//         if (activeTab === "version") {
//             fetchVersions();
//         }
//     }, [activeTab]);

//     const handleInheritance = (row: any) => {
//         console.log("Inherit clicked:", row);
//         // your logic here
//         navigate(`/framework/prompt-management/inherit/${row.prompt_id}`);
//     };

//     const handleVersionView = (row: any) => {
//         setSelectedVersionRow(row);
//         setViewVersionModal(true);
//     };


//     const versionColumns = [
//         {
//             key: "view",
//             label: "View",
//             render: (row: any) => (
//                 <button
//                     onClick={() => handleVersionView(row)}
//                     className="text-blue-600 hover:text-blue-900"
//                 >
//                     <FileText size={18} />
//                 </button>
//             )
//         },

//         { key: "old_prompt_id", label: "Old Prompt ID" },

//         { key: "module_name", label: "Module" },
//         { key: "instrument_type", label: "Instrument Type" },
//         { key: "lifecycle_stage", label: "Lifecycle Stage" },
//         { key: "analysis_mode", label: "Analysis Mode" },

//         {
//             key: "old_prompt_text",
//             label: "Old Prompt",
//             render: (row: any) => (
//                 <span className="truncate max-w-[260px] inline-block">
//                     {row.old_prompt_text}
//                 </span>
//             )
//         },

//         {
//             key: "prompt_text",
//             label: "New Prompt",
//             render: (row: any) => (
//                 <span className="truncate max-w-[260px] inline-block">
//                     {row.prompt_text}
//                 </span>
//             )
//         },


//         { key: "old_version", label: "Old Version" },
//         { key: "new_version", label: "New Version" },
// {
//             key: "is_active",
//             label: "Active",
//             render: (row: any) => (
//                 <span className={row.is_active ? "text-green-600" : "text-red-600"}>
//                     {row.is_active ? "Active" : "Inactive"}
//                 </span>
//             )
//         },
//         {
//             key: "created_date",
//             label: "Created Date",
//             render: (row: any) => new Date(row.created_date).toLocaleString()
//         },
//         {
//             key: "modified_date",
//             label: "Updated Date",
//             render: (row: any) => new Date(row.modified_date).toLocaleString()
//         },

        
//     ];


//     const promptColumns: Column<Prompt>[] = [
//         // ⭐ ADD THIS LAST
//         {
//             key: "inherit",
//             label: "Inherit",
//             render: (row) => (
//                 <button
//                     onClick={() => handleInheritance(row)}
//                     className="text-blue-600 hover:text-blue-800"
//                 >
//                     <FaCodeBranch size={18} />
//                 </button>
//             )
//         },
//         { key: "module_name", label: "Module" },
//         { key: "instrument_type", label: "Instrument" },
//         { key: "lifecycle_stage", label: "Lifecycle" },
//         { key: "analysis_mode", label: "Analysis" },
//         {
//             key: "prompt_text",
//             label: "Prompt",
//             render: (row) => (
//                 <span className="truncate whitespace-nowrap overflow-hidden text-ellipsis max-w-[240px] inline-block">
//                     {row.prompt_text}
//                 </span>
//             )
//         },
//         {
//             key: "description",
//             label: "Description",
//             render: (row) => (
//                 <span className="truncate whitespace-nowrap overflow-hidden text-ellipsis max-w-[240px] inline-block">
//                     {row.description}
//                 </span>
//             )
//         },
//         {
//             key: "is_active",
//             label: "Active",
//             render: (row) => (
//                 <span className={row.is_active ? "text-green-600" : "text-red-600"}>
//                     {row.is_active ? "Active" : "Inactive"}
//                 </span>
//             )
//         },
//         { key: "version", label: "Version" },
//         {
//             key: "version_desc",
//             label: "Version Description",
//             render: (row) => (
//                 <span className="truncate whitespace-nowrap overflow-hidden text-ellipsis max-w-[210px] inline-block">
//                     {row.version_desc}
//                 </span>
//             )
//         },
//         {
//             key: "created_date",
//             label: "Created",
//             render: (row: any) => new Date(row.created_date).toLocaleDateString()
//         },
//         {
//             key: "modified_date",
//             label: "Updated",
//             render: (row: any) => new Date(row.modified_date).toLocaleDateString()
//         },

//     ];

//     const handleRefresh = async () => {
//         setTableLoading(true);
//         await refetch();
//         setTableLoading(false);
//     };


//     // Fetch whenever filters change (like React Query)
//     useEffect(() => {
//         fetchPrompts();
//     }, [filters]);

//     // Replace refetch handler
//     const refetch = () => fetchPrompts();

//     const totalPrompts = data?.totalCount || 0;   // FULL DB COUNT
//     const activePrompts = data?.activeCount || 0; // FULL ACTIVE COUNT
//     const lifecycleCount = new Set((data?.prompts ?? []).map(p => p.lifecycle_stage)).size;


//     const statsItems = [
//         {
//             icon: "/media/images/FrameworkImages/chip.png",
//             info: totalPrompts,
//             desc: "Total Prompts",
//             bg: "/media/images/2600x1600/bg-3.png",
//             bgDark: "",
//             color: "bg-primary"
//         },
//         {
//             icon: "/media/images/FrameworkImages/correct.png",
//             info: activePrompts,
//             desc: "Active Prompts",
//             bg: "/media/images/2600x1600/bg-3.png",
//             bgDark: "",
//             color: "bg-success"
//         },
//         {
//             icon: "/media/images/FrameworkImages/assessment.png",
//             info: lifecycleCount,
//             desc: "Lifecycle Types",
//             bg: "/media/images/2600x1600/bg-3.png",
//             bgDark: "",
//             color: "bg-danger"
//         },
//     ];


//     const handleSearch = (value: string) => {
//         setFilters((prev) => ({ ...prev, search: value, page: 1 }));
//     };

//     const handleFilterChange = (key: keyof PromptFilters, value: any) => {
//         setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
//     };

//     const handleSort = (sortBy: "module_name" | "version" | "created_date") => {
//         setFilters((prev) => ({
//             ...prev,
//             sortBy,
//             sortOrder: prev.sortBy === sortBy && prev.sortOrder === "asc" ? "desc" : "asc",
//         }));
//     };

//     const handlePageChange = (page: number) => {
//         setFilters((prev) => ({ ...prev, page }));
//     };

//     const handleCreateNew = () => {
//         setSelectedPrompt(null);
//         setIsModalOpen(true);
//     };


//     const handleSubmitPrompt = async (formdata: any) => {
//         try {
//             formdata.is_active = formdata.is_active === "active";

//             if (selectedPrompt) {
//                 // update
//                 await fetch(`http://localhost:5000/api/prompts/${selectedPrompt.prompt_id}`, {
//                     method: "PUT",
//                     headers: { "Content-Type": "application/json" },
//                     body: JSON.stringify(formdata)
//                 });

//             } else {
//                 // create
//                 await fetch("http://localhost:5000/api/prompts", {
//                     method: "POST",
//                     headers: { "Content-Type": "application/json" },
//                     body: JSON.stringify(formdata)
//                 });
//             }

//             handleModalClose();
//             refetch();

//         } catch (e) {
//             console.log("Submit failed", e);
//         }
//     };


//     const handleEdit = (prompt: Prompt) => {
//         setSelectedPrompt(prompt);
//         setIsModalOpen(true);
//     };


//     const handleDeleteClick = (prompt: Prompt) => {
//         setPromptToDelete(prompt);
//         setIsDeleteDialogOpen(true);
//         handleDelete()
//     };

//     const handleModalClose = () => {
//         setIsModalOpen(false);
//         setSelectedPrompt(null);
//     };

//     const handleSuccess = () => {
//         refetch();
//     };

//     const activeFiltersCount = [
//         filters.is_active !== "all",
//         filters.lifecycle_stage !== "all",
//         filters.module_name !== "all",
//     ].filter(Boolean).length;


//     const handleDelete = async () => {
//         if (!promptToDelete) return;

//         try {
//             await fetch(`http://localhost:5000/api/prompts/${promptToDelete.prompt_id}`, {
//                 method: "DELETE",
//             });

//             setIsDeleteDialogOpen(false);
//             setPromptToDelete(null);

//             refetch();   // reload table
//         } catch (e) {
//             console.error("Failed to delete", e);
//         }
//     };


//     return (
//         <div className="w-full p-6 space-y-6 card">
//             <div className="flex justify-between items-start gap-4">
//                 <div><h1 className="text-3xl font-bold flex items-center gap-2 text-blue-600 ">
//                     <FaDatabase size={36} color="primary" />Prompt Management
//                 </h1>
//                     <p className="text-gray-500">TF Genie Database Manager</p></div>

//                 <div className="flex gap-2">
//                     <button type="button" className="btn btn-light hover:bg-gray-100"
//                     //   onClick={""}
//                     >
//                         <FileText className="w-4 h-4" />Export
//                     </button>
//                     <label className="btn btn-light hover:bg-gray-100 cursor-pointer">
//                         <Upload className="h-4 w-4" /> Import
//                         <input type="file" accept=".csv"
//                             className="hidden" />
//                     </label>
//                     <div>
//                         <button type="button"
//                             onClick={() => navigate("/framework/prompt-management/create")}
//                             className="btn btn-primary btn-outline hover:bg-blue-600">
//                             <Plus className="w-5 h-5" />Add New Prompt
//                         </button>
//                         <Model
//                             open={viewVersionModal}
//                             onClose={() => setViewVersionModal(false)}
//                             title="Version Details"
//                             onSubmit={() => setViewVersionModal(false)}   // not saving anything
//                             config={{
//                                 width: "1500px",
//                                 height: "1200px",     // Full modal height
//                                 bodyHeight: "1000px", // Inside scroll height
//                                 bigTextareas: true,
//                             }}
//                             fields={[
//                                 { key: "old_prompt_id", label: "Old Prompt ID", type: "text", readonly: true },
//                                 { key: "module_name", label: "Module", type: "text", readonly: true },
//                                 { key: "instrument_type", label: "Instrument", type: "text", readonly: true },
//                                 { key: "lifecycle_stage", label: "Lifecycle Stage", type: "text", readonly: true },
//                                 { key: "analysis_mode", label: "Analysis Mode", type: "text", readonly: true },

//                                 { key: "old_prompt_text", label: "Old Prompt", type: "textarea", readonly: true },
//                                 { key: "prompt_text", label: "New Prompt", type: "textarea", readonly: true },

//                                 { key: "old_version", label: "Old Version", type: "text", readonly: true },
//                                 { key: "new_version", label: "New Version", type: "text", readonly: true },

//                                 { key: "created_date", label: "Created Date", type: "text", readonly: true },
//                                 { key: "modified_date", label: "Updated Date", type: "text", readonly: true },
//                             ]}
//                             initialValues={{
//                                 ...selectedVersionRow,
//                                 created_date: new Date(selectedVersionRow?.created_date ?? "").toLocaleString(),
//                                 modified_date: new Date(selectedVersionRow?.modified_date ?? "").toLocaleString(),
//                             }}
//                         />
//                     </div>
//                 </div>
//             </div>

//             <div className='mb-6'>
//                 <OrgStats items={statsItems} />
//             </div>


//             {/* Search */}
//             {/* Search and Actions */}
//             <div className="card rounded-xl shadow px-6 p-2 py-4 flex flex-col lg:flex-row items-center gap-4 mb-6 justify-between w-full">
//                 <div className="input input-sm max-w-lg">
//                     <Search className=" left-2 top-3 h-5 w-5 text-gray-400" />
//                     <input
//                         className="pl-8 pr-3 py-2 border rounded-lg w-full focus:outline-blue-600"
//                         type="text"
//                         placeholder="Search by Name or Code..."
//                         value={filters.search}
//                         onChange={(e) => handleSearch(e.target.value)}
//                     // onKeyDown={handleKeyDown}
//                     />
//                 </div>

//                 <div className='flex gap-2 '>
//                     <Select
//                         value={filters.is_active}
//                         onValueChange={(value) => handleFilterChange("is_active", value)}
//                     >
//                         <SelectTrigger className="w-28" size="sm">
//                             <SelectValue placeholder="Select" />
//                         </SelectTrigger>

//                         <SelectContent className="w-32 z-10 ">
//                             <SelectItem value="all">All Status</SelectItem>
//                             <SelectItem value="active">Active</SelectItem>
//                             <SelectItem value="inactive">Inactive</SelectItem>
//                         </SelectContent>
//                     </Select>

//                     {/* ⭐ INSTRUMENT FILTER */}
//                     {/* Instrument Filter */}
//                     <Select
//                         value={filters.instrument_type}
//                         onValueChange={(value) => handleFilterChange("instrument_type", value)}
//                     >
//                         <SelectTrigger className="w-40" size="sm">
//                             <SelectValue placeholder="Instrument" />
//                         </SelectTrigger>
//                         <SelectContent>
//                             <SelectItem value="all">All Instruments</SelectItem>
//                             {instrumentOptions.map((inst) => (
//                                 <SelectItem key={inst} value={inst}>{inst}</SelectItem>
//                             ))}
//                         </SelectContent>
//                     </Select>

//                     {/* Lifecycle Filter */}
//                     <Select
//                         value={filters.lifecycle_stage}
//                         onValueChange={(value) => handleFilterChange("lifecycle_stage", value)}
//                     >
//                         <SelectTrigger className="w-40" size="sm">
//                             <SelectValue placeholder="Lifecycle" />
//                         </SelectTrigger>
//                         <SelectContent>
//                             <SelectItem value="all">All Lifecycle</SelectItem>
//                             {lifecycleOptions.map((life) => (
//                                 <SelectItem key={life} value={life}>{life}</SelectItem>
//                             ))}
//                         </SelectContent>
//                     </Select>

//                     <button type="button"
//                         onClick={handleRefresh}
//                         className="btn btn-primary btn-outline hover:bg-gray-100 h-8">
//                         <RefreshCw className="h-4 w-4" />Refresh</button>
//                 </div>
//             </div>


//             <div className="card p-4">
//                 <div className="grid w-full  grid-cols-1 md:grid-cols-2 gap-4">
//                     <Tabs
//                         tabs={[
//                             { label: 'Prompt Management', value: 'prompt' },
//                             { label: 'Version History', value: 'version' }
//                         ]}
//                         activeTab={activeTab}
//                         onChange={setActiveTab}
//                     />
//                 </div>
//             </div>


//             {/* table */}
//             <div className="pt-0">
//                 <div className="card p-2">
//                     <div className="grid">
//                         <div className="card min-w-full">
//                             <div className="card-table scrollable-x-auto">
//                                 {tableLoading ? (
//                                     <div className="w-full flex justify-center items-center py-20">
//                                         <RefreshCw className="h-10 w-10 animate-spin text-primary" />
//                                     </div>
//                                 ) : (

//                                     <div>{activeTab === "prompt" && (
//                                         <DataTable
//                                             data={data?.prompts ?? []}
//                                             columns={promptColumns}
//                                             onEdit={(row) => navigate(`/framework/prompt-management/edit/${row.prompt_id}`)}
//                                             onDelete={handleDeleteClick}
//                                             isLoading={isLoading}
//                                             page={filters.page}
//                                             limit={filters.limit}
//                                             total={data?.totalCount ?? 0}
//                                             onPageChange={handlePageChange}
//                                         />
//                                     )}

//                                         {activeTab === "version" && (
//                                             <DataTable
//                                                 data={versionData}
//                                                 columns={versionColumns}
//                                                 isLoading={tableLoading}
//                                                 page={filters.page}
//                                                 limit={filters.limit}
//                                                 total={data?.totalCount ?? 0}
//                                                 onPageChange={handlePageChange}
//                                                 disableActions
//                                             />

//                                         )} </div>



//                                 )}
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//                 {/* </div>



//                                 </div> */}


//                 <div className="kt-datatable-toolbar flex justify-between items-center border-t p-4 text-sm text-gray-600">

//                     {/* PAGE SIZE */}
//                     <div className="flex items-center gap-2">
//                         Show
//                         <select
//                             className="border rounded-md p-1 w-16"
//                             value={filters.limit}
//                             onChange={(e) =>
//                                 handleFilterChange("limit", Number(e.target.value))
//                             }
//                         >
//                             <option value={5}>5</option>
//                             <option value={10}>10</option>
//                             <option value={25}>25</option>
//                         </select>
//                         per page
//                     </div>

//                     {/* PAGE INFO */}
//                     <span>
//                         Page {data?.page || 1} of {data?.totalPages || 1}
//                     </span>

//                     {/* PREV / NEXT */}
//                     <div className="kt-datatable-info flex items-center gap-4">
//                         <div className="flex gap-2">
//                             <button
//                                 onClick={() => handlePageChange(filters.page - 1)}
//                                 disabled={filters.page <= 1}
//                                 className="px-3 py-1 border rounded-md disabled:opacity-50"
//                             >
//                                 Prev
//                             </button>

//                             <button
//                                 onClick={() => handlePageChange(filters.page + 1)}
//                                 disabled={filters.page >= (data?.totalPages || 1)}
//                                 className="px-3 py-1 border rounded-md disabled:opacity-50"
//                             >
//                                 Next
//                             </button>
//                         </div>
//                     </div>

//                 </div>


//             </div>
//             {/* </div> */}
//             {/* </div> */}

//             {/* </div> */}
//             {/* </div> */}

//             {/* DELETE CONFIRM DIALOG */}
//             {isDeleteDialogOpen && (
//                 <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
//                     <div className="bg-white p-6 rounded-xl w-[320px] text-center">
//                         <h2 className="text-xl font-bold mb-4 text-red-600">
//                             Delete Prompt?
//                         </h2>

//                         <p className="mb-6">
//                             Are you sure you want to delete?
//                         </p>

//                         <div className="flex justify-center gap-3">
//                             <button
//                                 className="px-3 py-1 rounded-md bg-gray-200"
//                                 onClick={() => setIsDeleteDialogOpen(false)}
//                             >
//                                 Cancel
//                             </button>

//                             <button
//                                 className="px-3 py-1 rounded-md bg-red-600 text-white"
//                                 onClick={handleDelete}
//                             >
//                                 Delete
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}


//         </div>

//     );
// }
