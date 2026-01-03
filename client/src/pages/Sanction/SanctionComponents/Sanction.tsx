// import { Fragment, useState } from "react";
// import {
//     Card,
//     CardHeader,
//     CardContent,
//     CardTitle,
// } from "@/components/ui/card";

// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import {
//     Select,
//     SelectTrigger,
//     SelectValue,
//     SelectItem,
//     SelectContent,
// } from "@/components/ui/select";

// import { Loader2, ShieldAlert, Rocket, Database } from "lucide-react";
// import DataTable from "@/pages/FrameworkComponent/DataTable";
// import { toAbsoluteUrl } from "@/utils";
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

// // Import your project's DataTable component

// export default function Sanction() {

//     // ---------------------------------------------------------
//     // STATES
//     // ---------------------------------------------------------
//     const [loading, setLoading] = useState(false);
//     const [sample, setSample] = useState("");
//     const [name, setName] = useState("");
//     const [lcNo, setLcNo] = useState("");
//     const [serial, setSerial] = useState("");

//     // TABLE DATA STATES (MUST MATCH YOUR DATATABLE)
//     const [tableData, setTableData] = useState<any[]>([]);

//     const [tableLoading, setTableLoading] = useState(false);
//     const [versionFilters, setVersionFilters] = useState({
//         page: 1,
//         limit: 10,
//     });

//     const [versionMeta, setVersionMeta] = useState({
//         totalCount: 0,
//     });

//     // ---------------------------------------------------------
//     // SAMPLE DATA
//     // ---------------------------------------------------------
//     const SAMPLE_DATA: Record<string, { name: string; lcNo: string; serial: string }> = {
//         "John Smith (Low Match)": {
//             name: "John Smith",
//             lcNo: "LC-1001",
//             serial: "SCR-1001",
//         },
//         "Vladimir Putin (High Match)": {
//             name: "Vladimir Putin",
//             lcNo: "LC-9001",
//             serial: "SCR-9001",
//         },
//         "Xi Jinping (High Match)": {
//             name: "Xi Jinping",
//             lcNo: "LC-9500",
//             serial: "SCR-9500",
//         },
//         "No Match Test": {
//             name: "Test Person",
//             lcNo: "",
//             serial: "SCR-0000",
//         },
//     };

//     // ---------------------------------------------------------
//     // COLUMNS for DataTable
//     // ---------------------------------------------------------
//     const versionColumns = [
//         { key: "matching_name", accessorKey: "matching_name", label: "Matching Name", header: "Matching Name" },
//         { key: "country", accessorKey: "country", label: "Country", header: "Country" },
//         { key: "relevancy_score", accessorKey: "relevancy_score", label: "Score", header: "Score" },
//         { key: "techniques_used", accessorKey: "techniques_used", label: "Techniques", header: "Techniques" },
//         { key: "source", accessorKey: "source", label: "Source", header: "Source" },
//     ];

//     // const versionColumns = [
//     //     {
//     //         accessorKey: "matching_name",
//     //         header: "Matching Name",
//     //         cell: ({ row }: any) => <span>{row.original.matching_name}</span>,
//     //     },
//     //     {
//     //         accessorKey: "country",
//     //         header: "Country",
//     //         cell: ({ row }: any) => <span>{row.original.country}</span>,
//     //     },
//     //     {
//     //         accessorKey: "relevancy_score",
//     //         header: "Score",
//     //         cell: ({ row }: any) => <span>{row.original.relevancy_score}</span>,
//     //     },
//     //     {
//     //         accessorKey: "techniques_used",
//     //         header: "Techniques",
//     //         cell: ({ row }: any) => <span>{row.original.techniques_used}</span>,
//     //     },
//     //     {
//     //         accessorKey: "source",
//     //         header: "Source",
//     //         cell: ({ row }: any) => <span>{row.original.source}</span>,
//     //     },
//     // ];

//     // ---------------------------------------------------------
//     // PAGE CHANGE HANDLER
//     // ---------------------------------------------------------
//     const handleVersionPage = (page: number) => {
//         setVersionFilters({ ...versionFilters, page });
//     };

//     // ---------------------------------------------------------
//     // RUN MOCK SCREENING
//     // ---------------------------------------------------------

//     const runScreening = async () => {
//         if (!name) {
//             alert("Please enter a name to screen");
//             return;
//         }

//         setLoading(true);
//         setTableLoading(true);
//         const token = localStorage.getItem("token");

//         try {
//             const response = await fetch("http://127.0.0.1:8000/screening/run", {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                     "Authorization": `Bearer ${token}`, // 👈 MOST IMPORTANT
//                 },
//                 body: JSON.stringify({
//                     name: name,
//                     lc_number: lcNo,
//                 }),
//             });

//             console.log("screening response:", response);

//             if (!response.ok) {
//                 throw new Error("API Error");
//             }

//             const data = await response.json();
//             console.log("RESULTS FROM BACKEND:", data.results);

//             // Backend returns: serial, results[]
//             setSerial(data.serial);
//             setTableData(
//                 data.results.map((item: any, index: number) => ({
//                     id: index + 1,   // 🔴 mandatory
//                     matching_name: item.matching_name,
//                     country: item.country,
//                     relevancy_score: item.relevancy_score,
//                     techniques_used: item.techniques_used,
//                     source: item.source,
//                 }))
//             );

//             setVersionMeta({
//                 totalCount: data.results.length,
//             });

//         } catch (error) {
//             console.error("Screening error:", error);
//             alert("Failed to run screening. Check backend.");
//         }

//         setLoading(false);
//         setTableLoading(false);
//     };

//     //     const runScreening = async () => {
//     //     if (!name) {
//     //         alert("Enter name");
//     //         return;
//     //     }

//     //     setLoading(true);
//     //     setTableLoading(true);

//     //     try {
//     //         const response = await fetch("http://127.0.0.1:8000/screening/run", {
//     //             method: "POST",
//     //             headers: { "Content-Type": "application/json" },
//     //             body: JSON.stringify({ name, lc_number: lcNo })
//     //         });

//     //         const data = await response.json();

//     //         // ---- PRINT RESPONSE IN FRONTEND ----
//     //         console.log("=== Screening Response (Frontend) ===");
//     //         console.log(data);
//     //         console.log("====================================");

//     //         // Table data set
//     //         setTableData(
//     //             data.results.map((item: any, idx: number) => ({
//     //                 id: idx,
//     //                 matching_name: item["Matching Name"],
//     //                 country: item["Country"],
//     //                 relevancy_score: item["Relevancy Score"],
//     //                 techniques_used: item["Techniques Used"],
//     //                 source: item["Source"]
//     //             }))
//     //         );

//     //     } catch (error) {
//     //         console.error("Screening error:", error);
//     //     }

//     //     setLoading(false);
//     //     setTableLoading(false);
//     // };

//     // ---------------------------------------------------------
//     // UI RENDER
//     // ---------------------------------------------------------
//     return (
//         <Fragment>
//             <style>
//                 {`
//                 .conn-bg {
//                   background-image: url('${toAbsoluteUrl("/media/images/2600x1200/bg-5.png")}');
//                 }
//                 .dark .conn-bg {
//                   background-image: url('${toAbsoluteUrl("/media/images/2600x1200/bg-5-dark.png")}');
//                 }
//               `}
//             </style>

//             <div className="w-full p-6 space-y-6 card">

//                 {/* PAGE HEADER */}
//                 <h1 className="text-4xl font-bold flex items-center gap-2">
//                      New Screening Request
//                 </h1>

//                 {/* SERIAL */}
//                 <Card className="border border-primary/50 bg-primary/5 conn-bg bg-cover  shadow-sm text-center items-center flex flex-col ">
//                     <CardHeader className="text-center ">
//                         <CardTitle className="flex items-center gap-2 ">
//                             <Database className="text-primary" />
//                             Last Screening Serial: N/A

//                         </CardTitle>
//                     </CardHeader>
//                     <CardContent>
//                         <p className="font-sans text-xl">{serial || "Reference ID for retrieval."}</p>
//                     </CardContent>
//                 </Card>

//                 {/* INPUT FORM */}
//                 <Card className="border border-primary/50 bg-primary/5" >
//                     <CardHeader>
//                         <CardTitle>Run New Screening</CardTitle>
//                     </CardHeader>
//                     <CardContent className="space-y-14">

//                         <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 ">

//                             <div>
//                                 <label className="font-medium">Load Sample Data (Optional):</label>

//                                 <div className="relative">
//                                     {/* Editable Input */}
//                                     <Input
//                                         value={sample}
//                                         onChange={(e) => {
//                                             setSample(e.target.value);
//                                             setName(e.target.value);
//                                         }}
//                                         placeholder="Type or select sample..."
//                                         className="w-full pr-10"
//                                     />

//                                     {/* Popover Trigger (Only the dropdown icon triggers it) */}
//                                     <Popover>
//                                         <PopoverTrigger asChild>
//                                             <button
//                                                 type="button"
//                                                 className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
//                                             >
//                                                 ▾
//                                             </button>
//                                         </PopoverTrigger>

//                                         <PopoverContent className="p-0 w-[250px]">
//                                             <Command>
//                                                 <CommandInput placeholder="Search sample..." />

//                                                 <CommandList>
//                                                     {Object.keys(SAMPLE_DATA).map((k) => (
//                                                         <CommandItem
//                                                             key={k}
//                                                             value={k}
//                                                             onSelect={() => {
//                                                                 setSample(k);
//                                                                 setName(SAMPLE_DATA[k].name);
//                                                                 setLcNo(SAMPLE_DATA[k].lcNo);
//                                                                 setSerial(SAMPLE_DATA[k].serial);
//                                                             }}
//                                                         >
//                                                             {k}
//                                                         </CommandItem>
//                                                     ))}
//                                                 </CommandList>
//                                             </Command>
//                                         </PopoverContent>
//                                     </Popover>
//                                 </div>
//                             </div>

//                             {/* NAME */}
//                             <div>
//                                 <label className="font-medium">Name *</label>
//                                 <Input
//                                     value={name}
//                                     onChange={(e) => setName(e.target.value)}
//                                     placeholder="Enter name..."
//                                 />
//                             </div>

//                             {/* LC NO */}
//                             <div>
//                                 <label className="font-medium">LC / Ref No</label>
//                                 <Input
//                                     value={lcNo}
//                                     onChange={(e) => setLcNo(e.target.value)}
//                                     placeholder="Optional"
//                                 />
//                             </div>

//                             {/* BUTTON */}

//                         </div>
//                         <div className="flex items-center justify-center ">
//                             <Button
//                                 className="w-full md:w-1/2 btn btn-primary btn-outline"
//                                 disabled={loading}
//                                 onClick={runScreening}
//                             >
//                                 {loading ? <Loader2 className="animate-spin" /> : "Run Screening"}
//                             </Button>
//                         </div>
//                     </CardContent>
//                 </Card>

//                 {/* RESULTS */}
//                 <Card className="border border-primary/50 bg-primary/5">
//                     <CardHeader>
//                         <CardTitle>Results Summary</CardTitle>
//                     </CardHeader>
//                     <CardContent>

//                         {loading && (
//                             <div className="text-center py-10">
//                                 <Loader2 className="animate-spin w-10 h-10 mx-auto" />
//                                 <p className="mt-2 text-gray-400">Processing...</p>
//                             </div>
//                         )}

//                         {!loading && tableData.length > 0 && (
//                             <div className="mb-4 p-4 bg-red-900/20 border border-red-600 rounded flex gap-3 items-center">
//                                 <ShieldAlert className="text-red-600" />
//                                 <span className="text-red-300 text-lg font-semibold">
//                                     HIGH RISK — {tableData.length} Potential Match(es)
//                                 </span>
//                             </div>
//                         )}

//                         <DataTable
//                             data={tableData}   // 👈 slice remove
//                             columns={versionColumns}
//                             isLoading={tableLoading}
//                             page={1}
//                             limit={10}
//                             total={tableData.length}
//                             disableActions
//                         />

//                     </CardContent>
//                 </Card>

//             </div>
//         </Fragment>
//     );
// }

import { Fragment, useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectContent
} from '@/components/ui/select';

import { Loader2, ShieldAlert, Rocket, Database } from 'lucide-react';
import DataTable from '@/pages/FrameworkComponent/DataTable';
import { toAbsoluteUrl } from '@/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

// Import your project's DataTable component

export default function Sanction() {
  const userID = localStorage.getItem('userID');
  console.log('Logged in userID:', userID);

  //  if (!userID) {
  //             alert("User not logged in");
  //             return;
  //         }

  // ---------------------------------------------------------
  // STATES
  // ---------------------------------------------------------
  const [loading, setLoading] = useState(false);
  const [sample, setSample] = useState('');
  const [name, setName] = useState('');
  const [lcNo, setLcNo] = useState('');
  const [serial, setSerial] = useState('');

  // TABLE DATA STATES (MUST MATCH YOUR DATATABLE)
  const [tableData, setTableData] = useState<any[]>([]);

  const [tableLoading, setTableLoading] = useState(false);
  const [versionFilters, setVersionFilters] = useState({
    page: 1,
    limit: 10
  });

  const [versionMeta, setVersionMeta] = useState({
    totalCount: 0
  });

  // ---------------------------------------------------------
  // SAMPLE DATA
  // ---------------------------------------------------------
  const SAMPLE_DATA: Record<string, { name: string; lcNo: string; serial: string }> = {
    'John Smith (Low Match)': {
      name: 'John Smith',
      lcNo: 'LC-1001',
      serial: 'SCR-1001'
    },
    'Vladimir Putin (High Match)': {
      name: 'Vladimir Putin',
      lcNo: 'LC-9001',
      serial: 'SCR-9001'
    },
    'Xi Jinping (High Match)': {
      name: 'Xi Jinping',
      lcNo: 'LC-9500',
      serial: 'SCR-9500'
    },
    'No Match Test': {
      name: 'Test Person',
      lcNo: '',
      serial: 'SCR-0000'
    }
  };

  // ---------------------------------------------------------
  // COLUMNS for DataTable
  // ---------------------------------------------------------
  const versionColumns = [
    {
      key: 'matching_name',
      accessorKey: 'matching_name',
      label: 'Matching Name',
      header: 'Matching Name'
    },
    { key: 'country', accessorKey: 'country', label: 'Country', header: 'Country' },
    { key: 'relevancy_score', accessorKey: 'relevancy_score', label: 'Score', header: 'Score' },
    {
      key: 'techniques_used',
      accessorKey: 'techniques_used',
      label: 'Techniques',
      header: 'Techniques'
    },
    { key: 'source', accessorKey: 'source', label: 'Source', header: 'Source' }
  ];

  // ---------------------------------------------------------
  // PAGE CHANGE HANDLER
  // ---------------------------------------------------------
  const handleVersionPage = (page: number) => {
    setVersionFilters({ ...versionFilters, page });
  };

  // ---------------------------------------------------------
  // RUN MOCK SCREENING
  // ---------------------------------------------------------

  const runScreening = async () => {
    if (!name) {
      alert('Please enter a name to screen');
      return;
    }

    setLoading(true);
    setTableLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/lc/screening/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name,
          lc_number: lcNo,
          user_id: Number(userID) // 👈 pass current loggedin user id
        })
      });

      console.log('screening response:', response);

      if (!response.ok) {
        throw new Error('API Error');
      }

      const data = await response.json();
      console.log('RESULTS FROM BACKEND:', data.results);

      // Backend returns: serial, results[]
      setSerial(data.serial);
      setTableData(
        data.results.map((item: any, index: number) => ({
          id: index + 1, // 🔴 mandatory
          matching_name: item.matching_name,
          country: item.country,
          relevancy_score: item.relevancy_score,
          techniques_used: item.techniques_used,
          source: item.source
        }))
      );

      setVersionMeta({
        totalCount: data.results.length
      });
    } catch (error) {
      console.error('Screening error:', error);
      alert('Failed to run screening. Check backend.');
    }

    setLoading(false);
    setTableLoading(false);
  };

  //     const runScreening = async () => {
  //     if (!name) {
  //         alert("Enter name");
  //         return;
  //     }

  //     setLoading(true);
  //     setTableLoading(true);

  //     try {
  //         const response = await fetch("http://127.0.0.1:8000/screening/run", {
  //             method: "POST",
  //             headers: { "Content-Type": "application/json" },
  //             body: JSON.stringify({ name, lc_number: lcNo })
  //         });

  //         const data = await response.json();

  //         // ---- PRINT RESPONSE IN FRONTEND ----
  //         console.log("=== Screening Response (Frontend) ===");
  //         console.log(data);
  //         console.log("====================================");

  //         // Table data set
  //         setTableData(
  //             data.results.map((item: any, idx: number) => ({
  //                 id: idx,
  //                 matching_name: item["Matching Name"],
  //                 country: item["Country"],
  //                 relevancy_score: item["Relevancy Score"],
  //                 techniques_used: item["Techniques Used"],
  //                 source: item["Source"]
  //             }))
  //         );

  //     } catch (error) {
  //         console.error("Screening error:", error);
  //     }

  //     setLoading(false);
  //     setTableLoading(false);
  // };

  // ---------------------------------------------------------
  // UI RENDER
  // ---------------------------------------------------------

  return (
    <Fragment>
      <style>
        {`
            .conn-bg {
                background-image: url('${toAbsoluteUrl('/media/images/2600x1200/bg-5.png')}');
            }
            .dark .conn-bg {
                background-image: url('${toAbsoluteUrl('/media/images/2600x1200/bg-5-dark.png')}');
            }
        `}
      </style>

      <div className="w-full p-6 space-y-6 card">
        {/* PAGE HEADER */}
        <h1 className="text-4xl font-bold flex items-center gap-2">New Screening Request</h1>

        {/* SERIAL */}
        <Card className="border border-primary/50 bg-primary/5 conn-bg bg-cover  shadow-sm text-center items-center flex flex-col ">
          <CardHeader className="text-center ">
            <CardTitle className="flex items-center gap-2 ">
              <Database className="text-primary" />
              Last Screening Serial: N/A
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-sans text-xl">{serial || 'Reference ID for retrieval.'}</p>
          </CardContent>
        </Card>

        {/* INPUT FORM */}
        <Card className="border border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle>Run New Screening</CardTitle>
          </CardHeader>
          <CardContent className="space-y-14">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 ">
              <div>
                <label className="font-medium">Load Sample Data (Optional):</label>

                <div className="relative">
                  {/* Editable Input */}
                  <Input
                    value={sample}
                    onChange={(e) => {
                      setSample(e.target.value);
                      setName(e.target.value);
                    }}
                    placeholder="Type or select sample..."
                    className="w-full pr-10"
                  />

                  {/* Popover Trigger (Only the dropdown icon triggers it) */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                      >
                        ▾
                      </button>
                    </PopoverTrigger>

                    <PopoverContent className="p-0 w-[250px]">
                      <Command>
                        <CommandInput placeholder="Search sample..." />

                        <CommandList>
                          {Object.keys(SAMPLE_DATA).map((k) => (
                            <CommandItem
                              key={k}
                              value={k}
                              onSelect={() => {
                                setSample(k);
                                setName(SAMPLE_DATA[k].name);
                                setLcNo(SAMPLE_DATA[k].lcNo);
                                setSerial(SAMPLE_DATA[k].serial);
                              }}
                            >
                              {k}
                            </CommandItem>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* NAME */}
              <div>
                <label className="font-medium">Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter name..."
                />
              </div>

              {/* LC NO */}
              <div>
                <label className="font-medium">LC / Ref No</label>
                <Input
                  value={lcNo}
                  onChange={(e) => setLcNo(e.target.value)}
                  placeholder="Optional"
                />
              </div>

              {/* BUTTON */}
            </div>
            <div className="flex items-center justify-center ">
              <Button
                className="w-full md:w-1/2 btn btn-primary btn-outline"
                disabled={loading}
                onClick={runScreening}
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Run Screening'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* RESULTS */}
        <Card className="border border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle>Results Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="text-center py-10">
                <Loader2 className="animate-spin w-10 h-10 mx-auto" />
                <p className="mt-2 text-gray-400">Processing...</p>
              </div>
            )}

            {!loading && tableData.length > 0 && (
              <div className="mb-4 p-4 bg-red-900/20 border border-red-600 rounded flex gap-3 items-center">
                <ShieldAlert className="text-red-600" />
                <span className="text-red-300 text-lg font-semibold">
                  HIGH RISK — {tableData.length} Potential Match(es)
                </span>
              </div>
            )}

            <DataTable
              data={tableData} // 👈 slice remove
              columns={versionColumns}
              isLoading={tableLoading}
              page={1}
              limit={10}
              total={tableData.length}
              disableActions
            />
          </CardContent>
        </Card>
      </div>
    </Fragment>
  );
}
