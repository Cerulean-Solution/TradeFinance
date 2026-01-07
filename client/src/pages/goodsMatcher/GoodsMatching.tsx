import { Fragment, useEffect, useState } from 'react';
import axios from 'axios';
import { KeenIcon } from '@/components';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { toAbsoluteUrl } from '@/utils';
import DataTable, { Column } from '../FrameworkComponent/DataTable';

const API_BASE = 'http://localhost:8000/api/lc';

/* ---------------- SAMPLE DEMO DATA ---------------- */
const SAMPLE_GOODS = [
  {
    label: 'Aluminum Tubes (Aerospace)',
    value: 'high strength aluminum tubes for aerospace applications'
  },
  {
    label: 'Hydrogen Fluoride',
    value: 'hydrogen fluoride chemical compound used in industrial processing'
  },
  {
    label: 'Electronic Components',
    value: 'high frequency electronic components for military radar systems'
  },
  {
    label: 'Nuclear Materials',
    value: 'uranium based nuclear materials for reactor applications'
  }
];

export default function GoodsMatching() {
  const [description, setDescription] = useState('');
  const [threshold, setThreshold] = useState(80);
  const [dbStatus, setDbStatus] = useState('Checking...');
  const [loading, setLoading] = useState(false);

  // const [runId, setRunId] = useState<number | null>(null);
  const [runId, setRunId] = useState<string>('');

  const [matchCount, setMatchCount] = useState(0);
  const [matches, setMatches] = useState<any[]>([]);
  const [reasoning, setReasoning] = useState<any>(null);

  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [testName, setTestName] = useState('');
  const [testAddress, setTestAddress] = useState('');

  /* ---------------- HEALTH CHECK ---------------- */
  useEffect(() => {
    axios
      .get(`${API_BASE}/health`)
      .then(() => {
        setDbStatus('Connected');
        addLog('Database connected successfully');
      })
      .catch(() => {
        setDbStatus('Disconnected');
        addLog('Database connection failed');
      });
  }, []);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  /* ---------------- SEARCH ---------------- */
  const handleSearch = async () => {
    if (!description.trim()) {
      alert('Please enter goods description');
      return;
    }

    setLoading(true);
    setMatches([]);
    setReasoning(null);
    addLog('Search initiated');

    try {
      const res = await axios.post(`${API_BASE}/match-goods`, {
        description,
        threshold
      });

      setRunId(res.data.run_id);
      setMatchCount(res.data.match_count);
      setMatches(res.data.matches);
      setReasoning(res.data.reasoning);
      addLog(`Search completed: ${res.data.match_count} matches found`);
    } catch (err: any) {
      addLog('Search failed');
      alert(err?.response?.data?.detail || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTestEntry = async () => {
    if (!testName.trim()) {
      alert('Name is mandatory');
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/add-test-entry`, {
        name: testName,
        address: testAddress // remove if backend no longer uses Address
      });

      addLog(`Test entry added: ${testName}`);
      alert(res.data.message);

      // Clear inputs
      setTestName('');
      setTestAddress('');
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.detail || 'Failed to add test entry');
      addLog('Failed to add test entry');
    }
  };

  /* ---------------- RETRIEVE RUN ---------------- */
  const retrieveRun = async (runId: number) => {
    try {
      const res = await axios.get(`${API_BASE}/get-run/${runId}`);
      setMatches(res.data.matches || []);
      setReasoning(res.data.reasoning || null);
      setRunId(res.data.run_id);
      addLog(`Retrieved run #${runId}`);
    } catch {
      alert('Run not found');
    }
  };

  const columns: Column<(typeof tableData)[0]>[] = [
    {
      key: 'match_no',
      label: 'Match #'
    },
    {
      key: 'ItemID',
      label: 'Item ID'
    },
    {
      key: 'ItemDescription',
      label: 'Description'
    },
    {
      key: 'best_score',
      label: 'Score',
      render: (row) => <span className="badge badge-success badge-outline">{row.best_score}%</span>
    },
    {
      key: 'matched_term',
      label: 'Matched Term'
    },
    {
      key: 'SourceCountry',
      label: 'Source Country'
    },
    {
      key: 'SourceRegulation',
      label: 'Regulation'
    }
  ];
  const tableData = matches.map((m, idx) => ({
    match_no: idx + 1,
    ItemID: m.item.ItemID,
    ItemDescription: m.item.ItemDescription,
    best_score: m.best_score,
    matched_term: m.matched_term,
    SourceCountry: m.item.SourceCountry,
    SourceRegulation: m.item.SourceRegulation
  }));

  return (
    <Fragment>
      <style>
        {`
                .conn-bg {
                    background-image: url('${toAbsoluteUrl('/media/images/2600x1200/bg-10.png')}');
                  }
                  .dark .conn-bg {
                      background-image: url('${toAbsoluteUrl('/media/images/2600x1200/bg-10-dark.png')}');
                      }
                `}
      </style>
      <div className="card min-w-full conn-bg ">
        {/* HEADER */}
        <div className="card-header flex justify-between items-center ">
          <h3 className="card-title flex items-center gap-2">
            <KeenIcon icon="magnifier" />
            Goods Matching System
          </h3>
          <span
            className={`badge badge-outline conn-bg ${
              dbStatus === 'Connected' ? 'badge-success' : 'badge-danger'
            }`}
          >
            Database: {dbStatus}
          </span>
        </div>

        <div className="card-body space-y-8">
          {/* SAMPLE DROPDOWN */}
          <div className="card border rounded-xl p-6 ">
            <h4 className="font-semibold mb-3">Choose a sample for demo</h4>

            <Select onValueChange={(value) => setDescription(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a sample..." />
              </SelectTrigger>

              <SelectContent>
                {SAMPLE_GOODS.map((s, i) => (
                  <SelectItem key={i} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* INPUT */}
          <div className="card border rounded-xl p-6">
            <h4 className="text-lg font-semibold mb-4">Input Goods Description</h4>

            <Textarea
              className="h-32"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter goods description (multi-line supported)"
            />

            <div className="flex justify-between mt-4">
              <button
                className="btn btn-primary btn-outline"
                onClick={handleSearch}
                disabled={loading}
              >
                <KeenIcon icon="search" />
                {loading ? 'Searching...' : 'Search & Match'}
              </button>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Match Threshold (%)</span>
                <button
                  className="btn btn-sm btn-primary btn-outline"
                  onClick={() => setThreshold((t) => Math.max(0, t - 1))}
                >
                  –
                </button>
                <span className="w-10 text-center">{threshold}</span>
                <button
                  className="btn btn-sm btn-primary btn-outline"
                  onClick={() => setThreshold((t) => Math.min(100, t + 1))}
                >
                  +
                </button>
              </div>
            </div>
          </div>
          {/* SYSTEM LOGS */}
          <div className="card border rounded-xl">
            <div className="card-header cursor-pointer" onClick={() => setShowLogs(!showLogs)}>
              <h4 className="card-title flex items-center gap-2">
                <KeenIcon icon="notification-status" />
                System Logs & Activity
              </h4>
            </div>

            {showLogs && (
              <div className="card-body">
                <div className="text-xs font-mono bg-gray-100 p-4 rounded max-h-48 overflow-auto">
                  {logs.map((l, i) => (
                    <div key={i}>{l}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* ================= RESULTS (ALREADY DONE) ================= */}
          {/* Reasoning + Matching Results remain unchanged */}
          {/* ================= RESULTS ================= */}
          {/* ================= BOX 1 : REASONING ================= */}{' '}
          {reasoning && (
            <div className="space-y-3">
              {' '}
              <div className="flex items-center gap-2 text-lg font-semibold">
                {' '}
                <KeenIcon icon="brain" /> BOX 1: REASONING{' '}
              </div>{' '}
              <div className="text-sm italic text-gray-500">
                {' '}
                Executive summary of search results:{' '}
              </div>{' '}
              <div className="rounded-xl border-l-4 border-danger-light card  p-6">
                {' '}
                <div className="flex items-center gap-3 mb-3">
                  {' '}
                  <span className="w-4 h-4 rounded-full bg-danger"></span>{' '}
                  <h4 className="font-bold text-danger"> {reasoning.classification} </h4>{' '}
                </div>{' '}
                <div className="text-sm space-y-3 leading-relaxed">
                  {' '}
                  <div>
                    {' '}
                    <strong>Confidence Level:</strong> {reasoning.confidence_level}{' '}
                  </div>{' '}
                  <p>{reasoning.reasoning}</p>{' '}
                  <div className="font-semibold text-danger">
                    {' '}
                    Recommendation: {reasoning.recommendation}{' '}
                  </div>{' '}
                </div>{' '}
              </div>{' '}
            </div>
          )}{' '}
          {/* ================= MATCH RESULTS ================= */}{' '}
          {matches.length > 0 && (
            <div className="space-y-4 ">
              {' '}
              <div className="flex items-center gap-2 text-lg font-semibold">
                {' '}
                {/* <KeenIcon icon="chart-simple" />  */}
                Matching Results (Run #{runId}){' '}
              </div>{' '}
              <div className="alert alert-success"> Found {matchCount} matching items! </div>{' '}
              <div className="card border rounded-xl p-4 overflow-x-auto ">
                {' '}
                <DataTable
                  data={tableData}
                  columns={columns}
                  rowKey={(row) => `${row.ItemID}-${row.match_no}`}
                  onRowClick={(row) => {
                    console.log('Clicked row:', row);
                  }}
                />
              </div>{' '}
            </div>
          )}
          {/* 🧪 TEST ENTRY */}
          <div className="card border rounded-xl p-6">
            <h4 className="text-lg font-semibold mb-4"> Test Entry Section</h4>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <input
                className="input"
                placeholder="Test Name"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
              />
              <input
                className="input"
                placeholder="Test Address (optional)"
                value={testAddress}
                onChange={(e) => setTestAddress(e.target.value)}
              />

              <button
                className="btn btn-primary flex justify-center text-center items-center "
                onClick={handleAddTestEntry}
              >
                <KeenIcon icon="plus" /> Add Test Entry
              </button>
            </div>
          </div>
          {/* 📂 RETRIEVE */}
          <div className="card border rounded-xl p-6">
            <h4 className="text-lg font-semibold mb-4"> Retrieve Past Results</h4>

            <div className="flex gap-4">
              <input
                type="number"
                className="input w-32"
                placeholder="Run ID"
                value={runId}
                onChange={(e) => setRunId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && runId) {
                    retrieveRun(Number(runId));
                  }
                }}
              />

              <button
                className="btn btn-primary btn-outline"
                disabled={!runId}
                onClick={() => retrieveRun(Number(runId))}
              >
                <KeenIcon icon="search" /> Retrieve
              </button>
            </div>
          </div>
          
          <div className="text-center text-xs text-gray-500 pt-4">
            Goods Matching System v1.0 | Powered by Advanced Matching Techniques
          </div>
        </div>
      </div>
    </Fragment>
  );
}
