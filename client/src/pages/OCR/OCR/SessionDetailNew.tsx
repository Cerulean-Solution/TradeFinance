import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSessionStore } from '../store/sessionStore';
import axios from 'axios';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const tabs = [
  { id: 'draft', label: 'Draft' },
  { id: 'ocr', label: 'OCR' },
  { id: 'classification', label: 'Classification' },
  { id: 'final_ocr', label: 'Assemble workshop' },
  { id: 'summary', label: 'Summary' },
];

const SessionDetailNew: React.FC = () => {
  const { sessionId: paramSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('draft');
  const [loading, setLoading] = useState(false);

  const currentSession = useSessionStore((state) => state.currentSession);
  const currentSessionLocal = localStorage.getItem("currentSession");
  const parsedSession = currentSessionLocal ? JSON.parse(currentSessionLocal) : null;

  const sessionId = currentSession?.id || parsedSession?.id || paramSessionId;

  // Multiple drafts
  const [drafts, setDrafts] = useState<any[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  // Tab data
  const [ocrPages, setOcrPages] = useState<any[]>([]);
  const [classificationPages, setClassificationPages] = useState<any[]>([]);
  const [finalOcrPages, setFinalOcrPages] = useState<any[]>([]);
  const [summaryPages, setSummaryPages] = useState<Record<string, any>>({});

  // review and edit

  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [editedText, setEditedText] = useState<Record<string, string>>({});
  const [finalizedDocs, setFinalizedDocs] = useState<Set<string>>(new Set());
  const [isFinalized, setIsFinalized] = useState(false);
  const [reviewer, setReviewer] = useState("");
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);


  const [previewDocId, setPreviewDocId] = useState<string | null>(null);



  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setReviewer(storedUsername);
    }
  }, []);



  const saveEdits = async (
    docId: string,
    docJson: any
  ) => {
    setSaving(true);
    try {
      await axios.put(
        `/api/lc/review/${docId}`,
        {
          documents_json: JSON.stringify(docJson),
          user: reviewer
        }
      );

      // alert("Saved successfully");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };


  useEffect(() => {
    if (!selectedDraftId) return;
    fetchSummary(selectedDraftId);

  }, [selectedDraftId]);

  const fetchSummary = async (docId: string) => {
    try {
      const res = await axios.get(`/api/lc/summary/current/${docId}`);
      let records = res.data;

      // Ensure records is an array
      if (!Array.isArray(records)) records = [records];

      console.log("Summary fetch response:", records);

      if (records.length > 0 && records[0].documents_json) {
        let finalJson = {};
        try {
          finalJson = JSON.parse(records[0].documents_json);
          if (Array.isArray(finalJson)) finalJson = { default: finalJson };
        } catch (err) {
          console.error("Error parsing documents_json:", err);
        }

        setSummaryPages(finalJson);
        setIsFinalized(Object.keys(finalJson).length > 0);
      } else {
        setSummaryPages({});
        setIsFinalized(false);
      }
    } catch (err) {
      console.error("Final OCR fetch failed:", err);
      setSummaryPages({});
      setIsFinalized(false);
    }
  };







  const finalizeDocument = async (docId: string) => {
    setApproving(true);
    try {
      await axios.post(
        `/api/lc/review/${docId}/approve`,
        reviewer
      );


      setIsFinalized(true);

      // 🔥 REFRESH SUMMARY DATA
      await fetchSummary(docId);

      // optional: auto-switch to summary tab
      setActiveTab("summary");

    } catch (e) {
      console.error(e);
      alert("Approval failed");
    } finally {
      setApproving(false);
    }
  };








  // Fetch drafts initially
  useEffect(() => {
    if (!sessionId) return;

    setLoading(true);

    axios.get(`/api/lc/drafts/current/${sessionId}`)
      .then(res => {
        const draftData = Array.isArray(res.data) ? res.data : [res.data];
        setDrafts(draftData);

        if (draftData.length > 0) {
          setSelectedDraftId(draftData[0].doc_id); // default select first draft
        }
      })
      .catch(err => console.error('Draft fetch error:', err))
      .finally(() => setLoading(false));
  }, [sessionId]);

  // Fetch tab data whenever selected draft changes
  useEffect(() => {
    if (!selectedDraftId) return;

    setLoading(true);

    const fetchTabData = async () => {
      try {
        const [ocrRes, classificationRes, finalOcrRes] = await Promise.all([
          axios.get(`/api/lc/ocr/current/${selectedDraftId}`),
          axios.get(`/api/lc/classification/current/${selectedDraftId}`),
          axios.get(`/api/lc/final-ocr/current/${selectedDraftId}`)
        ]);

        setOcrPages(ocrRes.data || []);
        setClassificationPages(classificationRes.data || []);
        const finalOcrData = finalOcrRes.data || [];
        setFinalOcrPages(finalOcrData);

        // 🔥 CHECK FINALIZED STATE
        if (finalOcrData.length > 0 && finalOcrData[0].status === "APPROVED") {
          setIsFinalized(true);

          // auto-fetch summary if finalized
          fetchSummary(selectedDraftId);
        }


        // const summaryData = summaryRes.data
        //   ? Array.isArray(summaryRes.data)
        //     ? summaryRes.data
        //     : [summaryRes.data]
        //   : [];
        // setSummaryPages(summaryData);

      } catch (err) {
        console.error('Tab data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTabData();
  }, [selectedDraftId]);


  // Helper function to format datetime
  const formatDateTime = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const normalizeText = (text?: string) => {
    if (!text) return '-';

    return text
      .replace(/"/g, '')
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  };

  const normalizeDocName = (name: string) =>
    name
      .replace(/["']/g, '')      // remove quotes
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());


  // Get selected draft object
  const selectedDraft = drafts.find(d => d.doc_id === selectedDraftId) || null;

  const currentSessionID = JSON.parse(
    localStorage.getItem("currentSession") || "{}"
  );
  const session_Id = currentSessionID?.id || currentSessionID?.sessionID;

  const [classificationNameMap, setClassificationNameMap] =
    useState<Record<string, string>>({});

  useEffect(() => {
    if (!drafts.length) return;

    const fetchAllClassificationNames = async () => {
      const map: Record<string, string> = {};

      await Promise.all(
        drafts.map(async (draft) => {
          try {
            const res = await axios.get(
              `/api/lc/classification/current/${draft.doc_id}`
            );

            const pages = Array.isArray(res.data) ? res.data : [];

            if (pages.length > 0 && pages[0].classified_name) {
              map[draft.doc_id] = normalizeText(pages[0].classified_name);
            }
          } catch (err) {
            console.warn("Classification fetch failed for", draft.doc_id);
          }
        })
      );

      setClassificationNameMap(map);
    };

    fetchAllClassificationNames();
  }, [drafts]);


  return (
    <div className="p-3 sm:p-6 mx-auto ">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3 sm:items-center">
          <button
            onClick={() => navigate('/tf_genie/discrepancy/ocr-factory')}
            className="p-2 -ml-2 text-slate-600 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-100"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-slate-900 truncate">
              SESSION ID: {currentSession?.id || session_Id}
            </h1>

            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-600">
              <span className="whitespace-nowrap">LC No: <span className="font-medium text-slate-900">{currentSession?.lc_number || parsedSession?.lc_number}</span></span>
              <span className="hidden sm:inline text-slate-300">|</span>
              <span className="whitespace-nowrap">CIF: <span className="font-medium text-slate-900">{currentSession?.cifno || parsedSession?.cifno}</span></span>
              <span className="hidden sm:inline text-slate-300">|</span>
              <span className="whitespace-nowrap">Lifecycle: <span className="font-medium text-slate-900">{currentSession?.lifecycle || parsedSession?.lifecycle}</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200 -mx-3 px-3 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-hide">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max">
          {tabs.filter(tab => {
            if (tab.id !== 'summary') return true;
            return summaryPages && Object.keys(summaryPages).length > 0;
          }).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1 font-medium whitespace-nowrap text-sm transition-all
          ${activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Draft Tab */}
      {activeTab === 'draft' && (
        <div className="space-y-4">
          {/* Mobile View: Cards */}
          <div className="block sm:hidden space-y-4">
            {drafts.length > 0 ? (
              drafts.map(d => {
                const fileName = d.file_path.split(/[/\\]/).pop();
                const fileUrl = `/api/lc/ocr_upload/${fileName}`;
                const isOpen = previewDocId === d.doc_id;
                return (
                  <div key={d.doc_id} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="p-4 space-y-3">
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Document Name</div>
                        <div className="text-sm font-medium text-slate-900">{classificationNameMap[d.doc_id] || d.document_name}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">File Path</div>
                        <div className="text-xs text-slate-600 break-all">{fileName}</div>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                        <div className="text-xs text-slate-500">{formatDateTime(d.processed_at)}</div>
                        <button
                          onClick={() => setPreviewDocId(isOpen ? null : d.doc_id)}
                          className="text-blue-600 text-sm font-semibold hover:text-blue-800"
                        >
                          {isOpen ? "Hide Preview" : "Preview"}
                        </button>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="border-t border-slate-200">
                        <iframe src={fileUrl} className="w-full h-[300px]" title="PDF Preview" />
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-lg text-slate-500 text-sm">No drafts found.</div>
            )}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden sm:block overflow-hidden border border-slate-200 rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Document Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">File Path</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Preview</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Processed At</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {drafts.length > 0 ? (
                  drafts.map(d => {
                    const fileName = d.file_path.split(/[/\\]/).pop();
                    const fileUrl = `/api/lc/ocr_upload/${fileName}`;
                    const isOpen = previewDocId === d.doc_id;
                    return (
                      <React.Fragment key={d.doc_id}>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-4 text-sm text-slate-900">{classificationNameMap[d.doc_id] || d.document_name}</td>
                          <td className="px-4 py-4 text-sm text-slate-600 break-all">{fileName}</td>
                          <td className="px-4 py-4 text-sm">
                            <button
                              onClick={() => setPreviewDocId(isOpen ? null : d.doc_id)}
                              className="text-blue-600 font-semibold hover:underline"
                            >
                              {isOpen ? "Hide Preview" : "Preview"}
                            </button>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-500 whitespace-nowrap">{formatDateTime(d.processed_at)}</td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={4} className="p-4 bg-slate-50">
                              <iframe src={fileUrl} className="w-full h-[450px] lg:h-[600px] border rounded shadow-inner bg-white" title="PDF Preview" />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500 text-sm">No drafts found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* OCR Tab */}
      {activeTab === 'ocr' && (
        <div className="space-y-6">
          {/* Draft Selection */}
          {drafts.length > 1 && (
            <div className="flex flex-1 min-w-[250px] items-center space-x-3">
              <label className="w-40 text-md font-medium flex items-center gap-1">
                Select Document
              </label>
              <div className="flex-1">
                <Select
                  onValueChange={(value) => setSelectedDraftId(value)}
                  value={selectedDraftId || ""}
                >
                  <SelectTrigger className="w-full bg-gray-100 border border-slate-400 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-0 focus:border-slate-400">
                    <SelectValue placeholder="Select Document" />
                  </SelectTrigger>

                  <SelectContent>
                    {drafts.map((d) => (
                      <SelectItem key={d.doc_id} value={d.doc_id}>
                        {d.document_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>


          )}

          {selectedDraft && ocrPages.length > 0 ? (
            <div className="space-y-8">
              {ocrPages.map((page) => {
                const lines = page.extracted_text?.split(/\r?\n/) || [];
                const kvPairs: { key?: string; value: string }[] = [];
                let currentKey: string | undefined;
                let currentValue = "";

                lines.forEach((line: string) => {
                  if (line.includes(":")) {
                    if (currentKey || currentValue) {
                      kvPairs.push({ key: currentKey, value: currentValue.trim() });
                    }
                    const [k, ...rest] = line.split(":");
                    currentKey = k.trim();
                    currentValue = rest.join(":").trim();
                  } else {
                    currentValue += " " + line.trim();
                  }
                });

                if (currentKey || currentValue) {
                  kvPairs.push({ key: currentKey, value: currentValue.trim() });
                }

                return (
                  <div key={page.doc_id + '-' + page.page_no} className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                      <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                        {selectedDraft.document_name} – Page {page.page_no}
                      </h3>
                    </div>

                    {/* Mobile: Stacked List */}
                    <div className="block sm:hidden divide-y divide-slate-100">
                      {kvPairs.map((item, idx) => (
                        <div key={idx} className="p-4 space-y-1">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{item.key || "Field"}</div>
                          <div className="text-sm text-slate-900 whitespace-pre-wrap break-words">{item.value}</div>
                        </div>
                      ))}
                      <div className="p-4 space-y-1 bg-slate-50">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Signature / Stamp</div>
                        <div className="text-sm text-slate-900">{page.signature_stamp || "No signature detected"}</div>
                      </div>
                    </div>

                    {/* Desktop: Table */}
                    <div className="hidden sm:block">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-1/4">Key</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-3/4">Value</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {kvPairs.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 align-top">
                              <td className="px-4 py-4 text-sm font-medium text-slate-700 break-words">{item.key || ""}</td>
                              <td className="px-4 py-4 text-sm text-slate-600">
                                <div className="whitespace-pre-wrap break-words max-h-48 overflow-y-auto pr-2">{item.value}</div>
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50 align-top">
                            <td className="px-4 py-4 text-sm font-semibold text-slate-700">Signature / Stamp</td>
                            <td className="px-4 py-4 text-sm text-slate-600">{page.signature_stamp || "No signature detected"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            !loading && <div className="text-center py-12 bg-slate-50 rounded-lg text-slate-500">No OCR pages found for the selected document.</div>
          )}
        </div>
      )}

      {/* Classification Tab */}
      {activeTab === 'classification' && (
        <div className="space-y-4">
          {classificationPages.length > 0 ? (
            <>
              {/* Mobile View */}
              <div className="block sm:hidden space-y-4">
                {classificationPages.map(page => (
                  <div key={page.doc_id + '-' + page.page_no} className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">Page {page.page_no}</span>
                      <span className="text-xs font-mono text-slate-500">{page.classified_code}</span>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</div>
                      <div className="text-sm font-medium text-slate-900">{normalizeText(page.classified_name)}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Extracted Text</div>
                      <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 max-h-32 overflow-y-auto whitespace-pre-wrap break-words">
                        {page.extracted_text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden sm:block overflow-hidden border border-slate-200 rounded-lg shadow-sm">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-[10%]">Page No</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-[15%]">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-[25%]">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-[50%]">Extracted Text</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {classificationPages.map(page => (
                      <tr key={page.doc_id + '-' + page.page_no} className="hover:bg-slate-50 align-top">
                        <td className="px-4 py-4 text-sm text-slate-900">{page.page_no}</td>
                        <td className="px-4 py-4 text-sm font-mono text-slate-600">{page.classified_code}</td>
                        <td className="px-4 py-4 text-sm text-slate-900">{normalizeText(page.classified_name)}</td>
                        <td className="px-4 py-4 text-sm">
                          <div className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words p-2 border border-slate-100 rounded bg-slate-50 text-slate-600">
                            {page.extracted_text}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            !loading && <div className="text-center py-12 bg-slate-50 rounded-lg text-slate-500">No classification data found.</div>
          )}
        </div>
      )}

      {/* Final OCR Tab */}
      {activeTab === 'final_ocr' && (
        <div className="space-y-6">
          {finalOcrPages.length > 0 ? (
            finalOcrPages.map((page) => {
              let docJson: any = {};
              try {
                docJson = JSON.parse(page.documents_json);
              } catch {
                docJson = { error: 'Invalid JSON' };
              }

              return (
                <div key={page.doc_id + '-' + page.page_no} className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-700">File:</span>
                      <span className="text-sm text-slate-600 break-all">{page.file_path.split(/[/\\]/).pop()}</span>
                    </div>
                    {!isFinalized && (
                      <button
                        disabled={approving}
                        onClick={() => finalizeDocument(page.doc_id)}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        {approving ? "Finalizing..." : "Finalize Document"}
                      </button>
                    )}
                  </div>

                  <div className="p-4 sm:p-6 space-y-8">
                    {Object.entries(docJson).map(([docType, pagesOrArray]: any) => {
                      const pagesArray = Array.isArray(pagesOrArray) ? pagesOrArray : [pagesOrArray];
                      return (
                        <div key={docType} className="space-y-4">
                          <h4 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
                            {normalizeDocName(docType)}
                          </h4>

                          <div className="grid grid-cols-1 gap-6">
                            {pagesArray.map((p: any) => {
                              const rowKey = `${page.doc_id}_${p.page_no}`;
                              return (
                                <div key={rowKey} className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                    <div className="text-sm font-semibold text-slate-700">
                                      Page No: <span className="text-blue-600">{p.page_no}</span>
                                    </div>

                                    {!isFinalized && (
                                      <div className="flex gap-2">
                                        {!editMode[rowKey] ? (
                                          <button
                                            className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-xs font-medium rounded text-blue-600 bg-white hover:bg-blue-50"
                                            onClick={() => {
                                              setEditMode(prev => ({ ...prev, [rowKey]: true }));
                                              setEditedText(prev => ({ ...prev, [rowKey]: p.text }));
                                            }}
                                          >
                                            Edit
                                          </button>
                                        ) : (
                                          <button
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                                            onClick={() => {
                                              const pageObj = docJson[docType].find((x: any) => x.page_no === p.page_no);
                                              pageObj.text = editedText[rowKey];
                                              saveEdits(page.doc_id, docJson);
                                              setEditMode(prev => ({ ...prev, [rowKey]: false }));
                                            }}
                                          >
                                            Save
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Extracted Text</label>
                                    {editMode[rowKey] && !isFinalized ? (
                                      <textarea
                                        className="w-full text-sm text-slate-800 bg-white border border-slate-300 rounded-md p-3 min-h-[200px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        value={editedText[rowKey] ?? p.text}
                                        onChange={(e) => setEditedText(prev => ({ ...prev, [rowKey]: e.target.value }))}
                                      />
                                    ) : (
                                      <pre className="whitespace-pre-wrap break-words text-xs text-slate-800 bg-white p-3 rounded-md border border-slate-200 max-h-[400px] overflow-y-auto">
                                        {editedText[rowKey] ?? p.text}
                                      </pre>
                                    )}
                                  </div>

                                  <div className="mt-4 pt-4 border-t border-slate-200">
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Signature / Stamp</div>
                                    <div className="text-sm text-slate-700">{p.signature_stamp || "None"}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : !loading && <div className="text-center py-12 bg-slate-50 rounded-lg text-slate-500">No Final OCR pages found.</div>}
        </div>
      )}

      {/* Summary Tab */}
      {activeTab === 'summary' && summaryPages && Object.keys(summaryPages).length > 0 ? (
        <div className="space-y-6">
          {/* Mobile View: Cards */}
          <div className="block lg:hidden space-y-6">
            {Object.entries(summaryPages).map(([docType, pages]: any) => {
              const pagesArray = Array.isArray(pages) ? pages : [pages];
              return pagesArray.map((p: any, idx: number) => (
                <div key={`${docType}-${idx}`} className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                    <h4 className="font-bold text-slate-800">{normalizeDocName(docType)}</h4>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</div>
                        <div className="text-sm text-slate-900">Trade Finance</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Page No</div>
                        <div className="text-sm text-slate-900">{p.page_no}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Extracted Text</div>
                      <pre className="whitespace-pre-wrap break-words text-xs bg-slate-50 p-3 rounded border border-slate-100 max-h-60 overflow-y-auto text-slate-700">
                        {p.text}
                      </pre>
                    </div>
                    <div className="pt-3 border-t border-slate-100">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Signature / Stamp</div>
                      <div className="text-sm text-slate-900">{p.signature_stamp || "None"}</div>
                    </div>
                  </div>
                </div>
              ));
            })}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden lg:block overflow-hidden border border-slate-200 rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-1/6">Document Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-1/6">Product / List</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-4/6">Extracted Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {Object.entries(summaryPages).map(([docType, pages]: any) => {
                  const pagesArray = Array.isArray(pages) ? pages : [pages];
                  return pagesArray.map((p: any, idx: number) => (
                    <tr key={`${docType}-${idx}`} className="hover:bg-slate-50 align-top">
                      <td className="px-4 py-4">
                        <div className="text-sm font-bold text-slate-900">{normalizeDocName(docType)}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-slate-900 font-medium">Trade Finance</div>
                        <div className="text-xs text-slate-500 capitalize mt-1">{docType.replaceAll("_", " ")}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 space-y-3">
                          <div className="text-xs font-semibold text-slate-500">PAGE NO: {p.page_no}</div>
                          <div>
                            <div className="text-xs font-bold text-slate-400 uppercase mb-1">Extracted Text</div>
                            <pre className="whitespace-pre-wrap break-words text-xs text-slate-700 bg-white p-3 rounded border border-slate-200 max-h-60 overflow-y-auto">
                              {p.text}
                            </pre>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-slate-400 uppercase">Signature:</span>
                            <span className="text-slate-700">{p.signature_stamp || "None"}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SessionDetailNew;
