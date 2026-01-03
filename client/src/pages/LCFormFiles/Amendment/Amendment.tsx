import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import sampleOldLcCleaned from './data/sample_old_lc.txt?raw';
import sampleOldLcDiscrepancy from './data/sample_old_lc_discrepancy.txt?raw';
import sampleAmendmentCleaned from './data/sample_mt707_amendment.txt?raw';
import sampleAmendmentDiscrepancy from './data/sample_mt707_amendment_discrepancy.txt?raw';
import DebugConsole from './DebugConsole';
import { useViewport } from '@/hooks';
import { useLanguage } from '@/i18n';
interface Props {
  selectedInstrument: string;
}
interface Props {
  validateForm: () => boolean;
  selectedInstrument: string;

  newLc: string;
  setNewLc: React.Dispatch<React.SetStateAction<string>>;

  oldLc: string;
  setOldLc: React.Dispatch<React.SetStateAction<string>>;

  subDocsNew: string[];
  setSubDocsNew: React.Dispatch<React.SetStateAction<string[]>>;

  amendment: string;
  setAmendment: React.Dispatch<React.SetStateAction<string>>;

  extracted: any;
  setExtracted: React.Dispatch<React.SetStateAction<any>>;

  verified: any;
  setVerified: React.Dispatch<React.SetStateAction<any>>;
}
type ChangeDetected = {
  field: string;
  old_value: string;
  new_value: string;
  change_type: string;
};

const AmendmentComponent: React.FC<Props> = ({
  validateForm,
  selectedInstrument,
  newLc,
  setNewLc,
  subDocsNew,
  setSubDocsNew,
  amendment,
  setAmendment,
  extracted,
  setExtracted,
  verified,
  setVerified,
  oldLc,
  setOldLc,
  saveOnGenerateNew,
}) => {
  const [subDocsOld, setSubDocsOld] = useState<string[]>([]);
  const [threeWay, setThreeWay] = useState<any>(null);
  const [debugRequest, setDebugRequest] = useState('');
  const [debugResponse, setDebugResponse] = useState('');
  const [debugMetadata, setDebugMetadata] = useState('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [debugLlmInput, setDebugLlmInput] = useState('No LLM input');
  const [debugLlmOutput, setDebugLlmOutput] = useState('No LLM output');
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showNewLc, setShowNewLc] = useState(false);
  const [showVerifyLC, setShowVerifyLC] = useState(false);
  const [isVerificationDone, setIsVerificationDone] = useState(false);

  const addSubDocOld = () => setSubDocsOld([...subDocsOld, '']);
  const addSubDocNew = () => setSubDocsNew([...subDocsNew, '']);
  const updateSubDocOld = (i: number, value: string) =>
    setSubDocsOld([...subDocsOld.slice(0, i), value, ...subDocsOld.slice(i + 1)]);
  const updateSubDocNew = (i: number, value: string) =>
    setSubDocsNew([...subDocsNew.slice(0, i), value, ...subDocsNew.slice(i + 1)]);
  
  const handleGenerate = async () => {
    if (!validateForm()) return;
    if (!oldLc || !amendment || isLoading) return;
    const payload = {
      instrument_type: 'LC',
      old_lc: oldLc,
      sub_docs_old: subDocsOld.join('\n'),
      mt_amendment: amendment
    };
    setDebugRequest(JSON.stringify(payload, null, 2));
    try {
      setIsLoading(true);
      const resp = await axios.post('http://localhost:8000/api/lc/generate', payload);
      setDebugResponse(JSON.stringify(resp.data, null, 2));
      if (resp.data.logs) {
        setDebugLogs(resp.data.logs);
      }
      setDebugLlmInput(resp.data.llm_input || 'No LLM input');
      setDebugLlmOutput(resp.data.llm_output || 'No LLM output');
      if (resp.data.metadata) {
        setDebugMetadata(JSON.stringify(resp.data.metadata, null, 2));
      } else {
        setDebugMetadata('No metadata returned');
      }
      const newLcValue = resp.data.new_lc || '';
      setNewLc(newLcValue);
      const generatedSubDocs = Array.isArray(resp.data.sub_docs_new)
        ? resp.data.sub_docs_new
        : resp.data.sub_docs_new
          ? [resp.data.sub_docs_new]
          : [];
      const merged = [...subDocsOld, ...generatedSubDocs];
      const uniqueSubDocs = Array.from(new Set(merged));
      setSubDocsNew(uniqueSubDocs);
      setShowNewLc(true);
    } catch (err) {
      console.error(err);
      setDebugLogs((prev) => [...prev, `Error: ${err}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const normalizedSubDocsNew = Array.isArray(subDocsNew) ? subDocsNew : [];

  const handleExtract = async () => {
    if (!oldLc || !newLc || isExtracting) return;

    const payload = {
      old_lc: oldLc,
      new_lc: newLc,
      instrument_type: 'LC'
    };

    setDebugRequest(JSON.stringify(payload, null, 2));

    try {
      setIsExtracting(true);

      const resp = await axios.post('http://localhost:8000/api/lc/extract', payload);

      setDebugResponse(JSON.stringify(resp.data, null, 2));
      console.log('Extraction response:', resp.data);

      // Debug logs
      setDebugLogs(resp.data.logs || []);

      // Debug LLM raw input/output
      setDebugLlmInput(resp.data.llm_input || 'No LLM input');
      setDebugLlmOutput(resp.data.llm_output || 'No LLM output');

      // Debug metadata
      setDebugMetadata(JSON.stringify(resp.data.metadata || {}, null, 2));

      // Output
      const extractedValue = resp.data.extracted || null;
      setExtracted(extractedValue);
      setShowVerifyLC(true);
    } catch (err) {
      console.error('Error extracting amendment:', err);
      alert('Error extracting amendment');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleVerify = async () => {
    if (!amendment || !extracted || isVerifying) return;

    const payload = {
      instrument_type: 'LC',
      old_lc: oldLc,
      new_lc: newLc,
      mt_amendment: amendment,
      extracted_amendment: extracted
    };

    setDebugRequest(JSON.stringify(payload, null, 2));

    try {
      setIsVerifying(true);

      const resp = await axios.post('http://localhost:8000/api/lc/verify', payload);

      console.log('Verification response:', resp.data);

      setDebugResponse(JSON.stringify(resp.data, null, 2));

      // Debug logs
      setDebugLogs(resp.data.logs || []);

      // Debug LLM I/O
      setDebugLlmInput(resp.data.llm_input || 'No LLM input');
      setDebugLlmOutput(resp.data.llm_output || 'No LLM output');

      // Debug metadata
      setDebugMetadata(JSON.stringify(resp.data.metadata || {}, null, 2));

      // Output
      const verifiedValue = resp.data.verified || null;
      setVerified(verifiedValue);
      setIsVerificationDone(true);
    } catch (err) {
      console.error(err);
      alert('Error verifying amendment');
    } finally {
      setIsVerifying(false);
    }
  };

 

  const markdownComponents = {
    h3: ({ children }: any) => (
      <h3 className="text-xl font-bold mt-12 mb-6 border-b pb-2">{children}</h3>
    ),

    strong: ({ children }: any) => <span className="font-semibold text-gray-900">{children}</span>,

    p: ({ children }: any) => <p className="my-4 leading-8 text-gray-800">{children}</p>,

    ul: ({ children }: any) => <ul className="my-4 pl-6 space-y-2 list-disc">{children}</ul>,

    hr: () => <div className="my-12 border-t-2 border-dashed border-gray-300" />,

    table: ({ children }: any) => (
      <div className="my-10 overflow-x-auto">
        <table className="w-full border border-gray-300 text-sm">{children}</table>
      </div>
    ),

    th: ({ children }: any) => (
      <th className="border bg-gray-100 px-4 py-3 text-left font-semibold">{children}</th>
    ),

    td: ({ children }: any) => <td className="border px-4 py-3 align-top">{children}</td>,

    li: ({ children }: any) => <li className="leading-7">{children}</li>
  };

  const DeltaTable = ({ title, data, mode }: any) => {
    return (
      <div className="border rounded bg-gray-50 p-4">
        <h3 className="font-bold text-lg mb-4">{title}</h3>

        <table className="w-full text-sm border bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border w-52">Field</th>
              <th className="p-2 border">{mode === 'run1' ? 'Old Value' : 'New Value'}</th>
              <th className="p-2 border">Amendment</th>
              <th className="p-2 border">Result</th>
              <th className="p-2 border">Severity</th>
            </tr>
          </thead>

          <tbody>
            {Object.entries(data).map(([field, info]: any) => (
              <tr
                key={field}
                className={`border-t ${info.result === 'MISMATCH' ? 'bg-red-50' : ''}`}
              >
                <td className="p-2 font-semibold">{field}</td>

                <td className="p-2 whitespace-pre-wrap">
                  {info.old_value ?? info.new_value ?? '-'}
                </td>

                <td className="p-2 whitespace-pre-wrap">{info.amendment_value ?? '-'}</td>

                <td className="p-2 font-bold">
                  <span className={info.result === 'MATCH' ? 'text-green-600' : 'text-red-600'}>
                    {info.result}
                  </span>
                </td>

                <td className="p-2 font-bold text-red-600">{info.severity ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const loadOldLcSample = async () => {
    if (!selectedInstrument) {
      alert('Please select instrument');
      return;
    }

    const url = `/trade_finance_samples/samples/${selectedInstrument}/lc.txt`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('LC sample not found');

      const text = await response.text();
      setOldLc(text);
    } catch (err) {
      alert(`No LC sample for ${selectedInstrument}`);
    }
  };

  const loadAmendmentSample = async () => {
    if (!selectedInstrument) {
      alert('Please select instrument');
      return;
    }

    const url = `/trade_finance_samples/samples/${selectedInstrument}/amendment.txt`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Sample not found');

      const text = await response.text();
      setAmendment(text);
    } catch (err) {
      alert(`No amendment sample for ${selectedInstrument}`);
    }
  };
  const parseMT = (mt: string) => {
    const lines = mt.split('\n');
    const fields: { tag: string; value: string }[] = [];

    let current: any = null;

    lines.forEach((line) => {
      const match = line.match(/^:(\d+[A-Z]?):\s*(.*)$/);

      if (match) {
        if (current) fields.push(current);
        current = { tag: match[1], value: match[2] };
      } else if (current) {
        current.value += '\n' + line;
      }
    });

    if (current) fields.push(current);
    return fields;
  };

  // ------------------------
  // JSX
  // ------------------------
  return (
    <div className="space-y-6">
      {/* OLD LC */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Old {selectedInstrument || 'None'}</CardTitle>
          <div className="flex gap-2">
            <Button onClick={loadOldLcSample}>Load Sample</Button>
          </div>
        </CardHeader>
        <CardContent>
          <textarea
            className="textarea"
            value={oldLc}
            onChange={(e) => setOldLc(e.target.value)}
            rows={16}
            placeholder={`Paste Old ${selectedInstrument || 'None'} here...`}
          />
        </CardContent>
      </Card>

      {/* Sub-documents Old */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Sub-Documents (Optional)</CardTitle>
          <Button size="sm" onClick={addSubDocOld}>
            Add Sub-Doc
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {(subDocsOld || []).map((doc, idx) => (
            <textarea
              key={idx}
              className="textarea"
              value={doc}
              onChange={(e) => updateSubDocOld(idx, e.target.value)}
              placeholder={`Sub-document ${idx + 1}`}
            />
          ))}
        </CardContent>
      </Card>
      {/* AMENDMENT */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Amendment</CardTitle>
          <Button onClick={loadAmendmentSample}>Load Sample</Button>
        </CardHeader>
        <CardContent>
          <textarea
            className="textarea"
            value={amendment}
            rows={16}
            onChange={(e) => setAmendment(e.target.value)}
            placeholder="Paste amendment text here..."
          />
          {/* <Button
            className="mt-4"
            disabled={!oldLc || !amendment || isLoading}
            onClick={handleGenerate}
          > */}
          <Button
            disabled={!oldLc || !amendment || isLoading}
            onClick={async () => {
              await handleGenerate(); // existing generate logic
              await saveOnGenerateNew(); //  SAVE EVERYTHING HERE
            }}
          >
            {isLoading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {isLoading
              ? `Generating ${selectedInstrument || 'None'}...`
              : `Generate New ${selectedInstrument || 'None'}`}
          </Button>
        </CardContent>
      </Card>

      {/* NEW LC & Sub-documents */}
      {showNewLc && (
        <Card>
          <CardHeader>
            <CardTitle>New {selectedInstrument || 'None'} & Sub-Documents</CardTitle>
          </CardHeader>
          <CardContent className="flex-row gap-4">
            <div className="flex-1">
              <textarea
                className="textarea"
                value={newLc}
                rows={16}
                onChange={(e) => setNewLc(e.target.value)}
                placeholder={`Generated New ${selectedInstrument || 'None'}...`}
              />
            </div>
            <div className="flex-1 space-y-2 mt-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xl">Sub-Documents</span>
                <Button size="sm" onClick={addSubDocNew}>
                  Add
                </Button>
              </div>
              {normalizedSubDocsNew.map((doc, idx) => (
                <textarea
                  key={idx}
                  className="textarea"
                  rows={6}
                  value={doc}
                  onChange={(e) => updateSubDocNew(idx, e.target.value)}
                  placeholder={`Sub-document ${idx + 1}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {/* EXTRACT AMENDMENT */}
      {showNewLc && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Extract Amendment</CardTitle>
            <Button disabled={!oldLc || !newLc || isExtracting} onClick={handleExtract}>
              {isExtracting && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {isExtracting ? 'Extracting...' : 'Extract Amendment'}
            </Button>
          </CardHeader>
          <CardContent>
            {/* Display the summary */}
            {extracted?.ll_json &&
              (() => {
                // Clean the JSON string
                let jsonStr = extracted.ll_json.replace(/^```json\s*/, '').replace(/```$/, '');

                let data: any = {};

                try {
                  data = JSON.parse(jsonStr);
                } catch (err) {
                  console.error('Failed to parse amendment JSON:', err);
                }
                const mtFields = parseMT(data.mt_format_amendment);
                const usage = extracted.usage || {};
                return (
                  <div className="mt-2 p-4 border rounded-lg max-w-full scrollable-x-auto">
                    <p className="font-semibold mb-1 text-primary text-lg">Amendment Summary:</p>
                    <p className="text-md">{data.amendment_summary}</p>
                    <p className="font-semibold mt-3 mb-1 text-primary text-lg">
                      Changes Detected:
                    </p>
                    <ul className="list-disc list-inside text-md">
                      {data.changes_detected?.map((change: ChangeDetected, idx: number) => (
                        <li key={idx}>
                          <span className="font-semibold">{change.field}:</span> {change.old_value}{' '}
                          → {change.new_value} ({change.change_type})
                        </li>
                      ))}
                    </ul>

                    <p className="font-semibold mt-3 mb-1 text-primary text-lg">
                      Verbose Amendment:
                    </p>
                    <p className="text-md">{data.verbose_amendment}</p>

                    <p className="font-semibold mt-3 mb-1 text-primary text-lg">MT Format:</p>
                    <div className="min-w-full mt-3 mb-1 ">
                      <div className="card-table">
                        <table className="table align-middle text-gray-700 font-medium text-sm">
                          <tbody>
                            {mtFields.map((f, i) => (
                              <tr key={i}>
                                <td>:{f.tag}:</td>
                                <td>{f.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <p className="font-semibold mt-3 mb-1 text-primary text-lg">Fields Used:</p>
                    <p className="text-md">{data.mt_fields_used?.join(', ')}</p>

                    <p className="font-semibold mt-3 mb-1 text-primary text-lg">Total Changes:</p>
                    <p className="text-md">{data.total_changes}</p>
                    <p className="font-semibold mt-3 mb-1 text-primary text-lg">Confidence:</p>
                    <p className="text-md">{data.confidence}</p>

                    {/* Display token usage */}
                    <p className="font-semibold mt-3 mb-1 text-primary text-lg">Token Usage:</p>
                    <ul className="list-disc list-inside text-md">
                      <li className="font-semibold">
                        <span className="text-primary font-bold mr-1">Prompt Tokens:</span>
                        {usage.prompt_tokens ?? 0}
                      </li>
                      <li className="font-semibold">
                        <span className="text-primary font-bold mr-1">Completion Tokens:</span>
                        {usage.completion_tokens ?? 0}
                      </li>
                      <li className="font-semibold">
                        <span className="text-primary font-bold mr-1">Total Tokens:</span>
                        {usage.total_tokens ?? 0}
                      </li>
                    </ul>
                  </div>
                );
              })()}
          </CardContent>
        </Card>
      )}
      {/* VERIFY AMENDMENT */}
      {showVerifyLC && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Verify Amendment</CardTitle>

            <Button disabled={!amendment || !extracted || isVerifying} onClick={handleVerify}>
              {isVerifying && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {isVerifying ? 'Verifying...' : 'Verify Amendment'}
            </Button>
          </CardHeader>
          <CardContent>
            {verified && (
              <div className="mt-2 p-4 border rounded-lg ">
                <p className="font-semibold mb-1 text-primary text-lg ">
                  Verification Status:{' '}
                  <span className="text-gray-600 text-md font-semibold">
                    {verified.verification_status}
                  </span>
                </p>
                <p className="font-semibold mb-1 text-primary text-lg">
                  Overall Confidence:{' '}
                  <span className="text-gray-600 text-md font-semibold">
                    {verified.overall_confidence}
                  </span>
                </p>
                <p className="font-semibold mb-1 text-primary text-lg">Verification Report:</p>
                <p className="whitespace-pre-wrap text-md">{verified.verification_report}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isVerificationDone && (
        <DebugConsole
          debugHeading="LLM Debug"
          requestLog={debugRequest}
          responseLog={debugResponse}
          extracted={extracted}
          verifyAmendmentUsage={verified?.usage}
          threeWayUsage={threeWay?.usage}
          metadataLog={debugMetadata}
          debugLogs={debugLogs}
          llmInput={debugLlmInput}
          llmOutput={debugLlmOutput}
          onClearLogs={() => setDebugLogs([])}
        />
      )}
    </div>
  );
};

export default AmendmentComponent;
