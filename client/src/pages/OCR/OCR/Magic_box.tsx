import { useEffect, useMemo, useState } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type Column = {
    key: string;
    label: string;
    render?: (row: any) => JSX.Element | string;
};

export default function MagicBoxTable({
    onEdit,
    onDelete,
}: {
    onEdit?: (row: any) => void;
    onDelete?: (row: any) => void;
}) {
    const [data, setData] = useState<any[]>([]);
    const [filtered, setFiltered] = useState<any[]>([]);
    const [search, setSearch] = useState("");

    const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
    const [selectedLC, setSelectedLC] = useState<string | null>(null);

    const [hoverInstrument, setHoverInstrument] = useState<string | null>(null);
    const [selectedLifecycle, setSelectedLifecycle] = useState<string | null>(null);
    const [instrumentMenuOpen, setInstrumentMenuOpen] = useState(false);
    const [lifecycleMenuOpen, setLifecycleMenuOpen] = useState(false);


    // -----------------------
    // Fetch
    // -----------------------
    useEffect(() => {
        fetch("/api/lc/magic-box")
            .then(res => res.json())
            .then(res => {
                setData(res.data);
                setFiltered(res.data);
            });
    }, []);

    // -----------------------
    // Column Config
    // -----------------------
    const columns: Column[] = [
        { key: "case_id", label: "Case ID" },
        { key: "doc_id", label: "Doc ID" },
        { key: "document_name", label: "Document" },
        { key: "customer_ID", label: "Customer ID" },
        { key: "customer_name", label: "Customer" },
        { key: "lc_number", label: "LC Number" },
        { key: "instrument", label: "Instrument" },
        { key: "lifecycle", label: "Lifecycle" },
    ];

    // -----------------------
    // Filter Values
    // -----------------------
    const customerIds = useMemo(
        () => Array.from(new Set(data.map(d => d.customer_ID).filter(Boolean))),
        [data]
    );

    const lcNumbers = useMemo(() => {
        if (!selectedCustomer) return [];
        return Array.from(
            new Set(
                data
                    .filter(d => d.customer_ID === selectedCustomer)
                    .map(d => d.lc_number)
                    .filter(Boolean)
            )
        );
    }, [selectedCustomer, data]);

    const instruments = useMemo(() => {
        if (!selectedCustomer || !selectedLC) return [];
        return Array.from(
            new Set(
                data
                    .filter(
                        d =>
                            d.customer_ID === selectedCustomer &&
                            d.lc_number === selectedLC
                    )
                    .map(d => d.instrument)
                    .filter(Boolean)
            )
        );
    }, [selectedCustomer, selectedLC, data]);

    const lifecycles = useMemo(() => {
        if (!selectedCustomer || !selectedLC || !hoverInstrument) return [];
        return Array.from(
            new Set(
                data
                    .filter(
                        d =>
                            d.customer_ID === selectedCustomer &&
                            d.lc_number === selectedLC &&
                            d.instrument === hoverInstrument
                    )
                    .map(d => d.lifecycle)
                    .filter(Boolean)
            )
        );
    }, [selectedCustomer, selectedLC, hoverInstrument, data]);

    // -----------------------
    // Apply Filter
    // -----------------------
    useEffect(() => {
        if (!selectedLifecycle) {
            setFiltered(data);
        } else {
            setFiltered(
                data.filter(
                    d =>
                        d.customer_ID === selectedCustomer &&
                        d.lc_number === selectedLC &&
                        d.instrument === hoverInstrument &&
                        d.lifecycle === selectedLifecycle
                )
            );
        }
    }, [selectedLifecycle, data]);

    // -----------------------
    // Global Search
    // -----------------------
    const tableData = useMemo(() => {
        if (!search) return filtered;
        return filtered.filter(row =>
            Object.values(row).some(v =>
                String(v).toLowerCase().includes(search.toLowerCase())
            )
        );
    }, [search, filtered]);

    // -----------------------
    // Render
    // -----------------------


    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
                <input
                    className="input bg-gray-100 w-full sm:w-64 p-2"
                    type="text"
                    placeholder="Search all columns..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />

                {/* Filters */}
                <div className="flex flex-wrap gap-4 w-full">
                    {/* Customer */}
                    <div className="flex flex-col w-full sm:w-48">
                        <label className="text-sm mb-1">Customer ID</label>
                        <Select
                            value={selectedCustomer ?? ""}
                            onValueChange={(value) => {
                                setSelectedCustomer(value);
                                setSelectedLC(null);
                                setSelectedLifecycle(null);
                            }}
                        >
                            <SelectTrigger className="w-full p-2 border">
                                <SelectValue placeholder="Select Customer ID" />
                            </SelectTrigger>
                            <SelectContent>
                                {customerIds.map(id => (
                                    <SelectItem key={id} value={id}>{id}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* LC */}
                    <div className="flex flex-col w-full sm:w-48">
                        <label className="text-sm mb-1">LC Number</label>
                        <Select
                            value={selectedLC ?? ""}
                            onValueChange={(value) => {
                                setSelectedLC(value);
                                setSelectedLifecycle(null);
                            }}
                            disabled={!selectedCustomer}
                        >
                            <SelectTrigger className="w-full p-2 border">
                                <SelectValue placeholder="Select LC Number" />
                            </SelectTrigger>
                            <SelectContent>
                                {lcNumbers.map(lc => (
                                    <SelectItem key={lc} value={lc}>{lc}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Instrument */}
                    <div className="flex flex-col w-full sm:w-48">
                        <label className="text-sm mb-1">Instrument</label>
                        <Select
                            value={hoverInstrument ?? ""}
                            onValueChange={(value) => {
                                setHoverInstrument(value);
                                setSelectedLifecycle(null);
                            }}
                            disabled={!selectedLC}
                        >
                            <SelectTrigger className="w-full p-2 border">
                                <SelectValue placeholder="Select Instrument" />
                            </SelectTrigger>
                            <SelectContent>
                                {instruments.map(inst => (
                                    <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Lifecycle */}
                    <div className="flex flex-col w-full sm:w-48">
                        <label className="text-sm mb-1">Lifecycle</label>
                        <Select
                            value={selectedLifecycle ?? ""}
                            onValueChange={(value) => setSelectedLifecycle(value)}
                            disabled={!hoverInstrument}
                        >
                            <SelectTrigger className="w-full p-2 border">
                                <SelectValue placeholder="Select Lifecycle" />
                            </SelectTrigger>
                            <SelectContent>
                                {lifecycles.map(life => (
                                    <SelectItem key={life} value={life}>{life}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Responsive Table */}
            <div className="overflow-x-auto">
                <table className="table min-w-full table-auto">
                    <thead className="h-16">
                        <tr className="text-left">
                            {(onEdit || onDelete) && <th className="px-3 py-2">Actions</th>}
                            {columns.map(c => (
                                <th key={c.key} className="px-3 py-2 text-sm sm:text-base">
                                    {c.label}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {tableData.map((row, idx) => (
                            <tr
                                key={row.id ?? idx}
                                className={`h-16 ${idx % 2 ? "bg-gray-100" : ""} hover:bg-gray-100`}
                            >
                                {(onEdit || onDelete) && (
                                    <td className="px-3 py-3">
                                        <div className="flex gap-2 sm:gap-4">
                                            {onEdit && (
                                                <button onClick={() => onEdit(row)}>
                                                    <i className="ki-filled ki-notepad-edit text-warning text-lg"></i>
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button onClick={() => onDelete(row)}>
                                                    <i className="ki-filled ki-trash text-danger text-lg"></i>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                )}

                                {columns.map(col => (
                                    <td key={col.key} className="px-3 py-3 text-xs sm:text-sm">
                                        {col.render ? col.render(row) : row[col.key] ?? "-"}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
