// // import { Fragment, useState } from 'react';
// // import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
// // import { Input } from '@/components/ui/input';
// // import { Button } from '@/components/ui/button';
// // import { Textarea } from '@/components/ui/textarea';
// // import { Loader2, ShieldAlert, Database, Plus, Trash2 } from 'lucide-react';
// // import DataTable from '@/pages/FrameworkComponent/DataTable';

// // export default function TBMLScreening() {
// //   const userID = localStorage.getItem('userID');

// //   const [loading, setLoading] = useState(false);
// //   const [tableLoading, setTableLoading] = useState(false);

// //   // Transaction level
// //   const [exporterName, setExporterName] = useState('');
// //   const [exporterCountry, setExporterCountry] = useState('');
// //   const [importerName, setImporterName] = useState('');
// //   const [importerCountry, setImporterCountry] = useState('');
// //   const [totalValue, setTotalValue] = useState('');
// //   const [currency, setCurrency] = useState('USD');
// //   const [shippingRoute, setShippingRoute] = useState('');

// //   // Items
// //   const [items, setItems] = useState([
// //     { goodCode: '', description: '', quantity: '', unitPrice: '' }
// //   ]);

// //   // Results
// //   const [serial, setSerial] = useState('');
// //   const [tableData, setTableData] = useState<any[]>([]);
// //   const UserID = localStorage.getItem('UserID');

// //   const columns = [
// //     { key: 'rule', accessorKey: 'rule', MenuLabel: 'Rule Triggered' },
// //     { key: 'risk', accessorKey: 'risk', MenuLabel: 'Risk Level' },
// //     { key: 'reason', accessorKey: 'reason', MenuLabel: 'Reason' },
// //     { key: 'matched', accessorKey: 'matched', MenuLabel: 'Matched Entity / Goods' },
// //     { key: 'source', accessorKey: 'source', MenuLabel: 'Source' }
// //   ];

// //   const addItem = () => {
// //     setItems([...items, { goodCode: '', description: '', quantity: '', unitPrice: '' }]);
// //   };

// //   const removeItem = (idx: number) => {
// //     setItems(items.filter((_, i) => i !== idx));
// //   };

// //   const updateItem = (idx: number, field: string, value: string) => {
// //     const copy = [...items];
// //     // @ts-ignore
// //     copy[idx][field] = value;
// //     setItems(copy);
// //   };

// //   const runTBML = async () => {
// //     if (!exporterName || !importerName || !totalValue) {
// //       alert('Mandatory fields missing');
// //       return;
// //     }

// //     setLoading(true);
// //     setTableLoading(true);

// //     try {
// //       const response = await fetch('http://127.0.0.1:8000/tbml/run', {
// //         method: 'POST',
// //         headers: { 'Content-Type': 'application/json' },
// //         body: JSON.stringify({
// //           user_id: Number(UserID), // send user ID
// //           transaction: {
// //             exporter_name: exporterName,
// //             exporter_country: exporterCountry,
// //             importer_name: importerName,
// //             importer_country: importerCountry,
// //             total_value: Number(totalValue),
// //             currency,
// //             shipping_route: shippingRoute
// //           },
// //           items: items.map((i) => ({
// //             good_code: i.goodCode,
// //             description: i.description,
// //             quantity: Number(i.quantity),
// //             unit_price: Number(i.unitPrice)
// //           }))
// //         })
// //       });

// //       if (!response.ok) throw new Error('TBML API error');

// //       const data = await response.json();

// //       setSerial(data.transaction_ref);
// //       setTableData(
// //         data.flags.map((f: any, idx: number) => ({
// //           id: idx + 1,
// //           rule: f.rule,
// //           risk: f.risk_level,
// //           reason: f.reason,
// //           matched: f.matched_entity,
// //           source: f.source
// //         }))
// //       );
// //     } catch (err) {
// //       console.error(err);
// //       alert('TBML analysis failed');
// //     }

// //     setLoading(false);
// //     setTableLoading(false);
// //   };

// //   return (
// //     <Fragment>
// //       <div className="w-full p-6 space-y-6">
// //         <h1 className="text-4xl font-bold">New TBML Screening</h1>

// //         <Card className="border border-primary/50 bg-primary/5 text-center">
// //           <CardHeader>
// //             <CardTitle className="flex items-center justify-center gap-2">
// //               <Database /> Transaction Reference
// //             </CardTitle>
// //           </CardHeader>
// //           <CardContent className="text-xl">{serial || 'Generated after analysis'}</CardContent>
// //         </Card>

// //         <Card className="border border-primary/50 bg-primary/5">
// //           <CardHeader>
// //             <CardTitle>Trade Transaction Details</CardTitle>
// //           </CardHeader>
// //           <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
// //             <Input
// //               placeholder="Exporter Name"
// //               value={exporterName}
// //               onChange={(e) => setExporterName(e.target.value)}
// //             />
// //             <Input
// //               placeholder="Exporter Country"
// //               value={exporterCountry}
// //               onChange={(e) => setExporterCountry(e.target.value)}
// //             />
// //             <Input
// //               placeholder="Importer Name"
// //               value={importerName}
// //               onChange={(e) => setImporterName(e.target.value)}
// //             />
// //             <Input
// //               placeholder="Importer Country"
// //               value={importerCountry}
// //               onChange={(e) => setImporterCountry(e.target.value)}
// //             />
// //             <Input
// //               placeholder="Total Value"
// //               value={totalValue}
// //               onChange={(e) => setTotalValue(e.target.value)}
// //             />
// //             <Input
// //               placeholder="Currency"
// //               value={currency}
// //               onChange={(e) => setCurrency(e.target.value)}
// //             />
// //             <Textarea
// //               className="md:col-span-2"
// //               placeholder="Shipping Route"
// //               value={shippingRoute}
// //               onChange={(e) => setShippingRoute(e.target.value)}
// //             />
// //           </CardContent>
// //         </Card>

// //         <Card className="border border-primary/50 bg-primary/5">
// //           <CardHeader className="flex flex-row items-center justify-between">
// //             <CardTitle>Goods / Items</CardTitle>
// //             <Button variant="outline" onClick={addItem}>
// //               <Plus className="w-4 h-4" />
// //             </Button>
// //           </CardHeader>
// //           <CardContent className="space-y-4">
// //             {items.map((item, idx) => (
// //               <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
// //                 <Input
// //                   placeholder="Good Code"
// //                   value={item.goodCode}
// //                   onChange={(e) => updateItem(idx, 'goodCode', e.target.value)}
// //                 />
// //                 <Input
// //                   placeholder="Description"
// //                   value={item.description}
// //                   onChange={(e) => updateItem(idx, 'description', e.target.value)}
// //                 />
// //                 <Input
// //                   placeholder="Qty"
// //                   value={item.quantity}
// //                   onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
// //                 />
// //                 <Input
// //                   placeholder="Unit Price"
// //                   value={item.unitPrice}
// //                   onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
// //                 />
// //                 <Button variant="destructive" onClick={() => removeItem(idx)}>
// //                   <Trash2 className="w-4 h-4" />
// //                 </Button>
// //               </div>
// //             ))}
// //           </CardContent>
// //         </Card>

// //         <div className="flex justify-center">
// //           <Button className="w-full md:w-1/2" onClick={runTBML} disabled={loading}>
// //             {loading ? <Loader2 className="animate-spin" /> : 'Run TBML Analysis'}
// //           </Button>
// //         </div>

// //         <Card className="border border-primary/50 bg-primary/5">
// //           <CardHeader>
// //             <CardTitle>TBML Results</CardTitle>
// //           </CardHeader>
// //           <CardContent>
// //             {!loading && tableData.length > 0 && (
// //               <div className="mb-4 p-4 bg-red-900/20 border border-red-600 rounded flex gap-3 items-center">
// //                 <ShieldAlert className="text-red-600" />
// //                 <span className="text-red-300 text-lg font-semibold">
// //                   HIGH RISK — {tableData.length} Flags
// //                 </span>
// //               </div>
// //             )}
// //             <DataTable
// //               data={tableData}
// //               columns={columns}
// //               isLoading={tableLoading}
// //               page={1}
// //               limit={10}
// //               total={tableData.length}
// //               disableActions
// //             />
// //           </CardContent>
// //         </Card>
// //       </div>
// //     </Fragment>
// //   );
// // }
// import { Fragment, useState } from 'react';
// import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
// import { Input } from '@/components/ui/input';
// import { Button } from '@/components/ui/button';
// import { Textarea } from '@/components/ui/textarea';
// import { Loader2, ShieldAlert, Database, Plus, Trash2 } from 'lucide-react';
// import DataTable from '@/pages/FrameworkComponent/DataTable';

// export default function TBMLScreening() {
//   const userID = localStorage.getItem('userID');
//   const [loading, setLoading] = useState(false);
//   const [tableLoading, setTableLoading] = useState(false);

//   // Transaction level
//   const [exporterName, setExporterName] = useState('');
//   const [exporterCountry, setExporterCountry] = useState('');
//   const [importerName, setImporterName] = useState('');
//   const [importerCountry, setImporterCountry] = useState('');
//   const [totalValue, setTotalValue] = useState('');
//   const [currency, setCurrency] = useState('USD');
//   const [shippingRoute, setShippingRoute] = useState('');

//   // Items
//   const [items, setItems] = useState([
//     { goodCode: '', description: '', quantity: '', unitPrice: '' }
//   ]);

//   // Results
//   const [serial, setSerial] = useState('');
//   const [tableData, setTableData] = useState<any[]>([]);

//   // Sample datasets
//   const SAMPLE_DATA = {
//     low: {
//       exporterName: 'ABC Textiles Pvt Ltd',
//       exporterCountry: 'India',
//       importerName: 'Global Garments LLC',
//       importerCountry: 'UAE',
//       totalValue: '45000',
//       currency: 'USD',
//       shippingRoute: 'Chennai → Dubai',
//       items: [
//         {
//           goodCode: '5208',
//           description: 'Cotton fabric',
//           quantity: '1000',
//           unitPrice: '45'
//         }
//       ]
//     },
//     high: {
//       exporterName: 'Al Noor Trading',
//       exporterCountry: 'Turkey',
//       importerName: 'Golden Falcon FZE',
//       importerCountry: 'Iran',
//       totalValue: '950000',
//       currency: 'USD',
//       shippingRoute: 'Mersin → Bandar Abbas',
//       items: [
//         {
//           goodCode: '9306',
//           description: 'Explosive detonators',
//           quantity: '500',
//           unitPrice: '1900'
//         },
//         {
//           goodCode: '8419',
//           description: 'Industrial heat treatment equipment',
//           quantity: '2',
//           unitPrice: '120000'
//         }
//       ]
//     }
//   };

//   const loadSample = (type: 'low' | 'high') => {
//     const sample = SAMPLE_DATA[type];

//     setExporterName(sample.exporterName);
//     setExporterCountry(sample.exporterCountry);
//     setImporterName(sample.importerName);
//     setImporterCountry(sample.importerCountry);
//     setTotalValue(sample.totalValue);
//     setCurrency(sample.currency);
//     setShippingRoute(sample.shippingRoute);
//     setItems(sample.items);

//     // Reset previous results
//     setSerial('');
//     setTableData([]);
//   };

//   const columns = [
//     { key: 'rule', accessorKey: 'rule', MenuLabel: 'Rule Triggered' },
//     { key: 'risk', accessorKey: 'risk', MenuLabel: 'Risk Level' },
//     { key: 'reason', accessorKey: 'reason', MenuLabel: 'Reason' },
//     { key: 'matched', accessorKey: 'matched', MenuLabel: 'Matched Entity / Goods' },
//     { key: 'source', accessorKey: 'source', MenuLabel: 'Source' }
//   ];

//   const addItem = () => {
//     setItems([...items, { goodCode: '', description: '', quantity: '', unitPrice: '' }]);
//   };

//   const removeItem = (idx: number) => {
//     setItems(items.filter((_, i) => i !== idx));
//   };

//   const updateItem = (idx: number, field: string, value: string) => {
//     const copy = [...items];
//     // @ts-ignore
//     copy[idx][field] = value;
//     setItems(copy);
//   };

//   const runTBML = async () => {
//     if (!userID) {
//       alert('User not logged in');
//       return;
//     }
//     if (!exporterName || !importerName || !totalValue) {
//       alert('Mandatory fields missing');
//       return;
//     }

//     setLoading(true);
//     setTableLoading(true);

//     try {
//       const response = await fetch('http://127.0.0.1:8000/tbml/run', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           user_id: Number(userID),
//           transaction: {
//             exporter_name: exporterName,
//             exporter_country: exporterCountry,
//             importer_name: importerName,
//             importer_country: importerCountry,
//             total_value: Number(totalValue),
//             currency,
//             shipping_route: shippingRoute
//           },
//           items: items.map((i) => ({
//             good_code: i.goodCode,
//             description: i.description,
//             quantity: Number(i.quantity),
//             unit_price: Number(i.unitPrice)
//           }))
//         })
//       });

//       if (!response.ok) throw new Error('TBML API error');

//       const data = await response.json();

//       // Backend now returns transaction_no string
//       setSerial(data.transaction_ref);

//       // Map flags correctly
//       setTableData(
//         data.flags.map((f: any, idx: number) => ({
//           id: idx + 1,
//           rule: f.RuleName,
//           risk: f.RiskLevel,
//           reason: f.Reason,
//           matched: f.MatchedValue,
//           source: f.Source
//         }))
//       );
//     } catch (err) {
//       console.error(err);
//       alert('TBML analysis failed');
//     }

//     setLoading(false);
//     setTableLoading(false);
//   };

//   return (
//     <Fragment>
//       <div className="w-full p-6 space-y-6">
//         <h1 className="text-4xl font-bold">New TBML Screening</h1>

//         <Card className="border border-primary/50 bg-primary/5 text-center">
//           <CardHeader>
//             <CardTitle className="flex items-center justify-center gap-2">
//               <Database /> Transaction Reference
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="text-xl">{serial || 'Generated after analysis'}</CardContent>
//         </Card>

//         <Card className="border border-primary/50 bg-primary/5">
//           <CardHeader>
//             <CardTitle>Trade Transaction Details</CardTitle>
//           </CardHeader>
//           <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">

//             <Input
//               placeholder="Exporter Name"
//               value={exporterName}
//               onChange={(e) => setExporterName(e.target.value)}
//             />
//             <Input
//               placeholder="Exporter Country"
//               value={exporterCountry}
//               onChange={(e) => setExporterCountry(e.target.value)}
//             />
//             <Input
//               placeholder="Importer Name"
//               value={importerName}
//               onChange={(e) => setImporterName(e.target.value)}
//             />
//             <Input
//               placeholder="Importer Country"
//               value={importerCountry}
//               onChange={(e) => setImporterCountry(e.target.value)}
//             />
//             <Input
//               placeholder="Total Value"
//               value={totalValue}
//               onChange={(e) => setTotalValue(e.target.value)}
//             />
//             <Input
//               placeholder="Currency"
//               value={currency}
//               onChange={(e) => setCurrency(e.target.value)}
//             />
//             <Textarea
//               className="md:col-span-2"
//               placeholder="Shipping Route"
//               value={shippingRoute}
//               onChange={(e) => setShippingRoute(e.target.value)}
//             />
//           </CardContent>
//         </Card>

//         <Card className="border border-primary/50 bg-primary/5">
//           <CardHeader className="flex flex-row items-center justify-between">
//             <CardTitle>Goods / Items</CardTitle>
//             <Button variant="outline" onClick={addItem}>
//               <Plus className="w-4 h-4" />
//             </Button>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             {items.map((item, idx) => (
//               <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
//                 <Input
//                   placeholder="Good Code"
//                   value={item.goodCode}
//                   onChange={(e) => updateItem(idx, 'goodCode', e.target.value)}
//                 />
//                 <Input
//                   placeholder="Description"
//                   value={item.description}
//                   onChange={(e) => updateItem(idx, 'description', e.target.value)}
//                 />
//                 <Input
//                   placeholder="Qty"
//                   value={item.quantity}
//                   onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
//                 />
//                 <Input
//                   placeholder="Unit Price"
//                   value={item.unitPrice}
//                   onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
//                 />
//                 <Button variant="destructive" onClick={() => removeItem(idx)}>
//                   <Trash2 className="w-4 h-4" />
//                 </Button>
//               </div>
//             ))}
//           </CardContent>
//         </Card>

//         <div className="flex justify-center">
//           <Button
//             className="w-full md:w-1/2"
//             onClick={runTBML}
//             disabled={loading || !userID} // disable if user not set
//           >
//             {loading ? <Loader2 className="animate-spin" /> : 'Run TBML Analysis'}
//           </Button>
//         </div>

//         <Card className="border border-primary/50 bg-primary/5">
//           <CardHeader>
//             <CardTitle>TBML Results</CardTitle>
//           </CardHeader>
//           <CardContent>
//             {!loading && tableData.length > 0 && (
//               <div className="mb-4 p-4 bg-red-900/20 border border-red-600 rounded flex gap-3 items-center">
//                 <ShieldAlert className="text-red-600" />
//                 <span className="text-red-300 text-lg font-semibold">
//                   HIGH RISK — {tableData.length} Flags
//                 </span>
//               </div>
//             )}
//             <DataTable
//               data={tableData}
//               columns={columns}
//               isLoading={tableLoading}
//               page={1}
//               limit={10}
//               total={tableData.length}
//               disableActions
//             />
//           </CardContent>
//         </Card>
//       </div>
//     </Fragment>
//   );
// }

import { Fragment, useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { Loader2, ShieldAlert, Database, Plus, Trash2 } from 'lucide-react';
import DataTable from '@/pages/FrameworkComponent/DataTable';
import { MenuLabel } from '@/components';
import { toAbsoluteUrl } from '@/utils';
import { Toaster, toast } from 'sonner';

export default function TBMLScreening() {
  const userID = localStorage.getItem('userID');

  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);

  // Transaction level
  const [exporterName, setExporterName] = useState('');
  const [exporterCountry, setExporterCountry] = useState('');
  const [importerName, setImporterName] = useState('');
  const [importerCountry, setImporterCountry] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [shippingRoute, setShippingRoute] = useState('');
  const [status, setStatus] = useState<'' | 'HIGH RISK' | 'CLEARED'>('');
  const [clearReason, setClearReason] = useState('');

  // Items
  const [items, setItems] = useState([
    { goodCode: '', description: '', quantity: '', unitPrice: '' }
  ]);

  // Results
  const [serial, setSerial] = useState('');
  const [tableData, setTableData] = useState<any[]>([]);

  // Sample Data
  const SAMPLE_DATA = {
    low: {
      exporterName: 'ABC Textiles Pvt Ltd',
      exporterCountry: 'India',
      importerName: 'Global Garments LLC',
      importerCountry: 'UAE',
      totalValue: '45000',
      currency: 'USD',
      shippingRoute: 'Chennai → Dubai',
      items: [{ goodCode: '5208', description: 'Cotton fabric', quantity: '1000', unitPrice: '45' }]
    },
    high: {
      exporterName: 'Al Noor Trading',
      exporterCountry: 'Turkey',
      importerName: 'Golden Falcon FZE',
      importerCountry: 'Iran',
      totalValue: '950000',
      currency: 'USD',
      shippingRoute: 'Mersin → Bandar Abbas',
      items: [
        {
          goodCode: '9306',
          description: 'Explosive detonators',
          quantity: '500',
          unitPrice: '1900'
        },
        {
          goodCode: '8419',
          description: 'Industrial heat equipment',
          quantity: '2',
          unitPrice: '120000'
        }
      ]
    }
  };

  const loadSample = (type: 'low' | 'high') => {
    const s = SAMPLE_DATA[type];
    setExporterName(s.exporterName);
    setExporterCountry(s.exporterCountry);
    setImporterName(s.importerName);
    setImporterCountry(s.importerCountry);
    setTotalValue(s.totalValue);
    setCurrency(s.currency);
    setShippingRoute(s.shippingRoute);
    setItems(s.items);
    setSerial('');
    setTableData([]);
  };

  // const columns = [
  //   { accessorKey: 'rule', MenuLabel: 'Rule Triggered' },
  //   { accessorKey: 'risk', MenuLabel: 'Risk Level' },
  //   { accessorKey: 'reason', MenuLabel: 'Reason' },
  //   { accessorKey: 'matched', MenuLabel: 'Matched Entity / Goods' },
  //   { accessorKey: 'source', MenuLabel: 'Source' }
  // ];
  const columns = [
    {
      key: 'rule',
      label: 'Rule Triggered',
      accessorKey: 'rule'
    },
    {
      key: 'risk',
      label: 'Risk Level',
      accessorKey: 'risk'
    },
    {
      key: 'reason',
      label: 'Reason',
      accessorKey: 'reason'
    },
    {
      key: 'matched',
      label: 'Matched Entity / Goods',
      accessorKey: 'matched'
    },
    {
      key: 'source',
      label: 'Source',
      accessorKey: 'source'
    }
  ];

  const addItem = () => {
    setItems([...items, { goodCode: '', description: '', quantity: '', unitPrice: '' }]);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, value: string) => {
    const copy = [...items];
    // @ts-ignore
    copy[idx][field] = value;
    setItems(copy);
  };

  const runTBML = async () => {
    if (!userID) return alert('User not logged in');
    if (!exporterName || !importerName || !totalValue) return alert('Mandatory fields missing');

    setLoading(true);
    setTableLoading(true);
    setTableData([]);
    setStatus('');
    setClearReason('');

    try {
      const res = await fetch('http://127.0.0.1:8000/api/lc/tbml/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: Number(userID),
          transaction: {
            exporter_name: exporterName,
            exporter_country: exporterCountry,
            importer_name: importerName,
            importer_country: importerCountry,
            total_value: Number(totalValue),
            currency,
            shipping_route: shippingRoute
          },
          items: items.map((i) => ({
            good_code: i.goodCode,
            description: i.description,
            quantity: Number(i.quantity),
            unit_price: Number(i.unitPrice)
          }))
        })
      });

      if (!res.ok) throw new Error('API Error');

      const data = await res.json();

      setSerial(data.transaction_ref);
      setStatus(data.status);

      if (data.status === 'HIGH RISK') {
        setTableData(
          data.flags.map((f: any, i: number) => ({
            id: i + 1,
            rule: f.RuleName,
            risk: f.RiskLevel,
            reason: f.Reason,
            matched: f.MatchedValue,
            source: f.Source
          }))
        );
        console.log('TBML FLAGS TABLE DATA', tableData);
      } else {
        setClearReason(data.clear_reason);
      }
    } catch (err) {
      toast.error('TBML Analysis Failed');
    }
    setLoading(false);
    setTableLoading(false);
  };

  // const runTBML = async () => {
  //   if (!userID) return alert("User not logged in");
  //   if (!exporterName || !importerName || !totalValue)
  //     return alert("Mandatory fields missing");

  //   setLoading(true);
  //   setTableLoading(true);

  //   try {
  //     const res = await fetch("http://127.0.0.1:8000/tbml/run", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         user_id: Number(userID),
  //         transaction: {
  //           exporter_name: exporterName,
  //           exporter_country: exporterCountry,
  //           importer_name: importerName,
  //           importer_country: importerCountry,
  //           total_value: Number(totalValue),
  //           currency,
  //           shipping_route: shippingRoute
  //         },
  //         items: items.map(i => ({
  //           good_code: i.goodCode,
  //           description: i.description,
  //           quantity: Number(i.quantity),
  //           unit_price: Number(i.unitPrice)
  //         }))
  //       })
  //     });

  //     if (!res.ok) throw new Error("API Error");

  //     const data = await res.json();
  //     setSerial(data.transaction_ref);

  //     setTableData(
  //       data.flags.map((f: any, i: number) => ({
  //         id: i + 1,
  //         rule: f.RuleName,
  //         risk: f.RiskLevel,
  //         reason: f.Reason,
  //         matched: f.MatchedValue,
  //         source: f.Source
  //       }))
  //     );
  //   } catch {
  //     alert("TBML Analysis Failed");
  //   }

  //   setLoading(false);
  //   setTableLoading(false);
  // };

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
        <h1 className="text-4xl font-bold text-primary-active text-center ">New TBML Screening</h1>

        {/* Transaction Ref */}
        <Card className="border border-primary/50 bg-primary/5 conn-bg bg-cover  shadow-sm text-center items-center flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database /> Transaction Reference
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl">{serial || 'Generated after analysis'}</CardContent>
        </Card>

        {/* Transaction Details */}
        <Card className="border border-primary/50 bg-primary/5">
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Trade Transaction Details</CardTitle>
            <select
              className="border rounded px-3 py-2 text-sm dark:bg-primary-clarity dark:border-primary"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) loadSample(e.target.value as 'low' | 'high');
                e.target.value = '';
              }}
            >
              <option value="" disabled>
                Load Sample Data
              </option>
              <option value="low">Low Risk Sample</option>
              <option value="high">High Risk Sample</option>
            </select>
          </CardHeader>

          <CardContent className="space-y-14">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <MenuLabel>Beneficiary Name *</MenuLabel>
                <Input value={exporterName} onChange={(e) => setExporterName(e.target.value)} />
              </div>

              <div>
                <MenuLabel>Source Country</MenuLabel>
                <Input
                  value={exporterCountry}
                  onChange={(e) => setExporterCountry(e.target.value)}
                />
              </div>

              <div>
                <MenuLabel>Buyer Name *</MenuLabel>
                <Input value={importerName} onChange={(e) => setImporterName(e.target.value)} />
              </div>

              <div>
                <MenuLabel>Destination Country</MenuLabel>
                <Input
                  value={importerCountry}
                  onChange={(e) => setImporterCountry(e.target.value)}
                />
              </div>

              <div>
                <MenuLabel>Invoice Amount *</MenuLabel>
                <Input
                  type="number"
                  value={totalValue}
                  onChange={(e) => setTotalValue(e.target.value)}
                />
              </div>

              <div>
                <MenuLabel>Currency</MenuLabel>
                <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
              </div>

              <div className="md:col-span-2">
                <MenuLabel>Port of Discharge</MenuLabel>
                <Textarea
                  value={shippingRoute}
                  onChange={(e) => setShippingRoute(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goods */}
        <Card className="border border-primary/50 bg-primary/5">
          <CardHeader className="flex justify-between ">
            <CardTitle>Goods / Items</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-6 gap-2">
                <div>
                  {idx === 0 && <MenuLabel>HS Code</MenuLabel>}
                  <Input
                    value={item.goodCode}
                    onChange={(e) => updateItem(idx, 'goodCode', e.target.value)}
                  />
                </div>
                <div>
                  {idx === 0 && <MenuLabel>Description</MenuLabel>}
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                  />
                </div>
                <div>
                  {idx === 0 && <MenuLabel>Quantity</MenuLabel>}
                  <Input value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                  />
                </div>
                <div>
                  {idx === 0 && <MenuLabel>Unit Price</MenuLabel>}
                  <Input
                    value={item.unitPrice}
                    onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                  />
                </div>

                

                <div className="flex items-end">
                  <Button variant="destructive" onClick={() => removeItem(idx)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-end">
                  <Button variant="outline" onClick={addItem}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Run */}
        <Button
          className="w-full md:w-1/2 mx-auto items-center flex btn btn-primary btn-outline"
          onClick={runTBML}
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin" /> : 'Run TBML Analysis'}
        </Button>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>TBML Results</CardTitle>
          </CardHeader>
          {/* <CardContent>
            {tableData.length > 0 && (
              <div className="mb-4 flex items-center gap-3 border border-red-600 p-4 rounded">
                <ShieldAlert className="text-red-600" />
                <span className="font-semibold text-red-600">
                  HIGH RISK — {tableData.length} Flags
                </span>
              </div>
            )}

            <DataTable
              data={tableData}
              columns={columns}
              isLoading={tableLoading}
              page={1}
              limit={10}
              total={tableData.length}
              disableActions
            />
          </CardContent> */}

          <CardContent>
            {/* 🔴 HIGH RISK */}
            {status === 'HIGH RISK' && (
              <div className="mb-4 flex items-center gap-3 border border-red-600 p-4 rounded bg-red-50">
                <ShieldAlert className="text-red-600" />
                <span className="font-semibold text-red-600">
                  HIGH RISK — {tableData.length} Flags Identified
                </span>
              </div>
            )}

            {/* 🟢 CLEARED */}
            {status === 'CLEARED' && (
              <div className="mb-4 flex items-center gap-3 border border-green-600 p-4 rounded bg-green-50">
                <ShieldAlert className="text-green-700" />
                <span className="font-semibold text-green-700">CLEARED — No TBML risk indicators detected.</span>
              </div>
            )}

            {/* 📊 TABLE */}
            {status === 'HIGH RISK' && tableData.length > 0 && (
              <DataTable
                data={tableData}
                columns={columns}
                isLoading={tableLoading}
                page={1}
                limit={10}
                total={tableData.length}
                disableActions
              />
            )}
          </CardContent>
        </Card>
      </div>
    </Fragment>
  );
}
