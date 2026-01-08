import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
// import mammoth from "mammoth";

import {
  Upload as UploadIcon,
  FileText,
  Image,
  X,
  Check,
  AlertCircle,
  Plus,
  FolderOpen,
  Clock,
  CheckCircle2,
  RefreshCw,
  SparklesIcon,
  DownloadCloudIcon,
  DownloadCloud
} from 'lucide-react';
import { useSessionStore } from '../store/sessionStore';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error' | 'processing';
  progress: number;
  error?: string;
  documentId?: string;
  processingProgress?: {
    stage: string;
    progress: number;
    message: string;
    timestamp: string;
  };
}

interface Lifecycle {
  id: string;
  name: string;
  instrument: string;
  transition: string;
  requiredDocuments: string[];
}

const Upload: React.FC = () => {
  const navigate = useNavigate();
  const [lifecycles, setLifecycles] = useState<Lifecycle[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<{ [docName: string]: File | null }>({});

  const { sessions, loadSessions, createSession, uploadDocument, isLoading } = useSessionStore();
  const { user } = useAuthStore();
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // Inside your Upload component
  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  // At the top of your Upload component
  const [isNewLifecycle, setIsNewLifecycle] = useState(false);
  const [userId, setUserId] = useState<string>("");


  const [masterDocs, setMasterDocs] = useState<
    { id: number; code: string; name: string; documentName: string; documentId: string }[]
  >([]);



  const [mainDocument, setMainDocument] = useState<File | null>(null);
  const [subDocuments, setSubDocuments] = useState<File[]>([]);
  // const [isUploading, setIsUploading] = useState(false);

  // const hasFilesSelected = mainDocument || subDocuments.length > 0;


  const [uploadMode, setUploadMode] = useState("file"); // file | copy

  // MAIN COPY DOC
  const [mainCopyDoc, setMainCopyDoc] = useState({
    name: "",
    content: ""
  });

  // SUB COPY DOCS
  const [subCopyDocs, setSubCopyDocs] = useState<{ name: string; content: string }[]>([]);
  const [classifiedDocName, setClassifiedDocName] = useState<
    { doc_id: string; classified_name: string }[]
  >([]);
  const [isClassifying, setIsClassifying] = useState(false);

  const [selectedDocId, setSelectedDocId] = useState<string[]>([]);

  const fetchClassifiedDocumentName = async (docIdsToUse?: string[]) => {
    const ids = docIdsToUse || selectedDocId;
    // if (ids.length === 0) {
    //   alert("No documents selected");
    //   return;
    // }

    setIsClassifying(true);
    try {
      const results = await Promise.all(
        ids.map(docId =>
          axios.get(
            `http://127.0.0.1:8000/api/lc/classification/current/${docId}`
          )
        )
      );

      const names = results.flatMap(res =>
        res.data.map((d: any) => ({
          doc_id: d.doc_id,
          classified_name: d.classified_name
        }))
      );

      console.log("📄 All classified names:", names);

      setClassifiedDocName(names);
    } catch (err) {
      alert("Failed to fetch classifications");
    } finally {
      setIsClassifying(false);
    }
  };


  const hasActiveSession = Boolean(selectedSessionId);





  useEffect(() => {
    setMainDocument(null);
    setSubDocuments([]);
    setMainCopyDoc({ name: "", content: "" });
    setSubCopyDocs([]);
  }, [uploadMode]);

  useEffect(() => {
    if (selectedSession) {
      const lifecycleExists = lifecycles.some(
        lc => `${lc.name} — ${lc.instrument}` === selectedSession.lifecycle
      );
      setIsNewLifecycle(!lifecycleExists);
    }
  }, [selectedSession, lifecycles]);

  useEffect(() => {
    fetchMasterDocuments();
  }, []);

  const fetchMasterDocuments = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/lc/master-documents");
      setMasterDocs(res.data);
    } catch (err) {
      console.error("Failed to load master documents", err);
    }
  };



  const [newSession, setNewSession] = useState({
    cifno: '',
    customer_ID: '',

    lc_number: '',
    instrument: '',
    lifecycle: '',
    accountName: '',
    customer_name: '',
    customer_type: ''
  });

  const [focused, setFocused] = useState({
    cifno: false,
    customer_ID: false,
    lc_number: false,
    instrument: false,
    lifecycle: false,
    accountName: false,
    customer_name: false,
    customer_type: false
  });

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const [showAllSessions, setShowAllSessions] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const activeSessions = sessions.filter(s => s.status !== 'completed' && s.status !== 'frozen');
  const filteredSessions = useMemo(() => {
    if (showAllSessions) return activeSessions;
    if (activeSessions.length === 0) return [];

    // default filter by lc_number of the first session
    const defaultLc = activeSessions[0].lc_number;
    return activeSessions.filter((s) => s.lc_number === defaultLc);
  }, [activeSessions, showAllSessions]);

  useEffect(() => {
    const fetchLifecycles = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/lc/lifecycles");
        if (!res.ok) throw new Error("Failed to fetch lifecycles");

        const data = await res.json();
        // console.log("✅ Raw lifecycles from API:", data); // 👈 log raw API response

        const instruments = data.map((item: any) => {
          const mapped = {
            id: item.ID,
            name: item.Instrument,
            instrument: item.Instrument,
            transition: item.Transition,
            fullLifecycle: `${item.Instrument} — ${item.Transition}`,
            requiredDocuments: item.Applicable_Documents
              ? item.Applicable_Documents.split(',').map((d: string) => d.trim())
              : []
          };
          // console.log("🔹 Mapped lifecycle:", mapped); // 👈 log each mapped object
          return mapped;
        });

        setLifecycles(instruments);
        // console.log("🟢 Lifecycles state set:", instruments); // 👈 final state
      } catch (error) {
        console.error("❌ Error fetching lifecycles:", error);
      }
    };

    fetchLifecycles();
  }, []);



  const uniqueInstruments = Array.from(
    new Set(lifecycles.map((item) => item.name))
  );

  const filteredLifecycles = lifecycles.filter(
    (item) => item.name === newSession.instrument
  );

  const handleCreateSession = async () => {
    const payload = {
      cifno: newSession.cifno.trim(),
      customer_ID: newSession.customer_ID?.trim() || null,
      customer_name: newSession.customer_name.trim(),
      accountName: newSession.accountName?.trim() || null,
      customer_type: newSession.customer_type.trim(),
      lc_number: newSession.lc_number.trim(),
      instrument: newSession.instrument?.trim() || null,
      lifecycle: newSession.lifecycle.trim(),
      user_id: userId || null

    };

    if (
      !payload.cifno ||
      !payload.customer_name ||
      !payload.customer_type ||
      !payload.lc_number ||
      !payload.lifecycle
    ) {
      alert("Please fill all required fields");
      return;
    }

    try {
      // ============================
      // 1️⃣ CREATE SESSION
      // ============================
      const sessionRes = await axios.post(
        "http://127.0.0.1:8000/api/lc/sessions",
        payload
      );

      const session = sessionRes.data;
      localStorage.setItem("currentSession", JSON.stringify(session));


      // ============================
      // 2️⃣ CREATE CUSTOMER
      // ============================
      await axios.post(
        "http://127.0.0.1:8000/api/lc/save-customers",
        {
          sessionId: session.id,
          cifno: payload.cifno,
          customer_ID: payload.customer_ID,
          customer_name: payload.customer_name,
          accountName: payload.accountName,
          customer_type: payload.customer_type,
          lc_number: payload.lc_number,
          instrument: payload.instrument,
          lifecycle: payload.lifecycle,
          user_id: payload.user_id

        }
      );

      // ============================
      // 3️⃣ UI UPDATES
      // ============================
      setSelectedSessionId(session.id);
      setShowCreateSession(false);
      localStorage.setItem("selectedSessionAfterReload", session.id);
      localStorage.setItem("scrollToUpload", "true");
      window.location.reload();

      setNewSession({
        cifno: "",
        customer_ID: "",
        customer_name: "",
        accountName: "",
        customer_type: "",
        lc_number: "",
        instrument: "",
        lifecycle: ""
      });




    } catch (error) {
      console.error("Error creating session/customer:", error);
      alert("Failed to create session or customer");
    }
  };


  useEffect(() => {
    const sessionAfterReload = localStorage.getItem("selectedSessionAfterReload");
    if (sessionAfterReload) {
      setSelectedSessionId(sessionAfterReload);
      localStorage.removeItem("selectedSessionAfterReload");
    }
  }, []);


  // 2️⃣ At the top level of your component
  useEffect(() => {
    const sessionAfterReload = localStorage.getItem("selectedSessionAfterReload");
    const scrollFlag = localStorage.getItem("scrollToUpload");

    if (sessionAfterReload) {
      setSelectedSessionId(sessionAfterReload); // auto-select new session
      localStorage.removeItem("selectedSessionAfterReload");
    }

    if (scrollFlag) {
      const uploadSection = document.getElementById("upload-section");
      if (uploadSection) {
        uploadSection.scrollIntoView({ behavior: "smooth" });
      }
      localStorage.removeItem("scrollToUpload");
    }
  }, []);



  const fetchCustomerIfExists = async (cif?: string, customer_ID?: string) => {
    if (!cif && !customer_ID) return;

    const res = await axios.get("http://127.0.0.1:8000/api/lc/get-customer", {
      params: {
        cifno: cif || undefined,
        customer_ID: customer_ID || undefined
      }
    });

    if (!res.data) return;

    setNewSession(prev => ({
      ...prev,
      cifno: res.data.cifno || prev.cifno,
      customer_ID: res.data.customer_ID || prev.customer_ID,
      accountName: res.data.accountName || "",
      customer_name: res.data.customer_name || "",
      customer_type: res.data.customer_type || ""
    }));


  };







  const getStatusColor = (status: string) => {
    switch (status) {
      case 'created': return 'bg-gray-100 text-gray-800';
      case 'uploading': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'reviewing': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };



  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [isUploadComplete, setIsUploadComplete] = useState(false);
  const [uploadedMainTextFile, setUploadedMainTextFile] = useState<File | null>(null);
  const [uploadedMainImageFile, setUploadedMainImageFile] = useState<File | null>(null);

  // Upload function
  const uploadSelectedDocuments = async () => {
    setIsButtonLoading(true);
    setIsUploadComplete(false);

    if (!selectedSessionId) {
      alert("Please select a session first.");
      setIsButtonLoading(false);
      return;
    }

    setIsUploading(true);

    try {
      const uploadPromises: Promise<any>[] = [];

      // File mode
      if (uploadMode === "pdf" || uploadMode === "text" || uploadMode === "image") {
        if (mainDocument) uploadPromises.push(uploadDocumentNew(mainDocument, selectedSessionId));
        subDocuments.forEach(file => uploadPromises.push(uploadDocumentNew(file, selectedSessionId)));
      }

      if (uploadMode === "text" && mainDocument) {
        // Keep a reference to the uploaded file for the detect button
        setUploadedMainTextFile(mainDocument);
      }

      if (uploadMode === "image" && mainDocument) {
        // Keep a reference to the uploaded file for the detect button
        setUploadedMainImageFile(mainDocument);
      }


      // Copy mode
      if (uploadMode === "copy") {
        if (mainCopyDoc.name && mainCopyDoc.content) {
          uploadPromises.push(
            axios.post("http://127.0.0.1:8000/api/lc/upload-text-json", {
              session_id: selectedSessionId,
              product: "trade",
              document_name: mainCopyDoc.name,
              content: mainCopyDoc.content,
            })
          );
        }

        subCopyDocs.forEach(doc => {
          if (doc.name && doc.content) {
            uploadPromises.push(
              axios.post("http://127.0.0.1:8000/api/lc/upload-text-json", {
                session_id: selectedSessionId,
                product: "trade",
                document_name: doc.name,
                content: doc.content,
              })
            );
          }
        });
      }

      // Wait for all uploads to finish
      const responses = await Promise.all(uploadPromises);

      // Extract document IDs from responses
      const newDocIds: string[] = [];
      responses.forEach(res => {
        if (res?.documents) {
          res.documents.forEach((doc: any) => {
            if (doc.doc_id) newDocIds.push(doc.doc_id);
          });
        } else if (res?.data?.documents) {
          res.data.documents.forEach((doc: any) => {
            if (doc.doc_id) newDocIds.push(doc.doc_id);
          });
        }
      });

      // Optional: check for failed responses
      const failed = responses.filter(res => res?.status && res.status !== 200);
      if (failed.length > 0) {
        alert(`${failed.length} document(s) failed to upload`);
        return;
      }

      // Reset local states
      setMainDocument(null);
      setSubDocuments([]);
      setMainCopyDoc({ name: "", content: "" });
      setSubCopyDocs([]);

      // Determine wait time based on upload type
      let timeout = 15000; // default text 15s
      if (uploadMode === "pdf") timeout = 170000;
      else if (uploadMode === "image") timeout = 30000;
      else if (uploadMode === "copy") timeout = 10000;

      // Only after the timeout, show the navigate button
      setTimeout(async () => {
        setIsUploadComplete(true); // ✅ now user can navigate
        setIsButtonLoading(false);
        // Automatically fetch classified document names after upload using the captured IDs
        await fetchClassifiedDocumentName(newDocIds);
      }, timeout);

    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Upload failed");
      setIsButtonLoading(false);
    } finally {
      setIsUploading(false);
    }
  };


  // ================= FILE UPLOAD HELPER =================
  const uploadDocumentNew = async (file: File, sessionId: string) => {
    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    const formData = new FormData();
    formData.append("product", "LC");
    formData.append("session_id", sessionId);
    formData.append("files", file);

    const response = await axios.post(
      "http://127.0.0.1:8000/api/lc/upload-bulk",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    const docIds = response?.data?.documents?.map(
      (doc: any) => doc.doc_id
    ) || [];

    setSelectedDocId(prev => [...prev, ...docIds]);



    return response.data;
  };


  const currentSession = JSON.parse(localStorage.getItem("currentSession") || "null");
  const currentCustomerCIF = currentSession?.cifno || null;

  const customerSessions =
    currentCustomerCIF
      ? sessions.filter(s => s.cifno === currentCustomerCIF)
      : [];

  const sampleSessionData = {
    cifno: "ACC-TRD-987654321",
    accountName: "ABC Exports Pvt Ltd",

    customer_ID: "20250045",
    customer_name: "ABC Exports Pvt Ltd",
    customer_type: "Corporate",

    lc_number: "LC-TD-123456789",
    instrument: "Letter of Credit",
    lifecycle: "Issuance",

  };

  const handleLoadSample = () => {
    // Step 1: set everything except lifecycle
    setNewSession((prev) => ({
      ...prev,
      cifno: sampleSessionData.cifno,
      accountName: sampleSessionData.accountName,
      customer_ID: sampleSessionData.customer_ID,
      customer_name: sampleSessionData.customer_name,
      customer_type: sampleSessionData.customer_type,
      lc_number: sampleSessionData.lc_number,
      instrument: sampleSessionData.instrument,
      lifecycle: "",
    }));

    // Step 2: set lifecycle AFTER instrument is applied
    setTimeout(() => {
      setNewSession((prev) => ({
        ...prev,
        lifecycle: sampleSessionData.lifecycle,
      }));
    }, 0);
  };

  const readTextFile = async (path: string) => {
    const res = await fetch(path);
    return await res.text();
  };


  const loadSampleFromPublic = async () => {
    try {
      // RESET STATE
      setMainDocument(null);
      setSubDocuments([]);
      setMainCopyDoc({ name: "", content: "" });
      setSubCopyDocs([]);
      setClassifiedDocName([]);
      setIsUploadComplete(false);

      /* =========================
         COPY–PASTE MODE (DOCX)
      ========================= */
      if (uploadMode === "copy") {

        const mainText = await readTextFile(
          "/ocr_sample/text/SampleLC.txt"
        );

        const commercialInv = await readTextFile(
          "/ocr_sample/text/commercial-inv.txt"
        );

        const boeText = await readTextFile(
          "/ocr_sample/text/BOE.txt"
        );

        setMainCopyDoc({
          name: "LC Application",
          content: mainText
        });

        setSubCopyDocs([
          {
            name: "Commercial Invoice",
            content: commercialInv
          },
          {
            name: "Bill of Exchange",
            content: boeText
          }
        ]);

        return;
      }


      /* =========================
         FILE MODES (PDF / DOCX / IMAGE)
      ========================= */
      const sampleConfig: Record<string, { main: string; subs: string[] }> = {
        pdf: {
          main: "/ocr_sample/pdf/ILCAE00221000098-1.pdf",
          subs: ["/ocr_sample/pdf/ILCAE00221000098-2.pdf"]
        },
        text: {
          main: "/ocr_sample/text/SampleLC.txt",
          subs: ["/ocr_sample/text/commercial-inv.txt", "/ocr_sample/text/BOE.txt"]
        },
        image: {
          main: "/ocr_sample/img/ILCAE00221000098-1_page-0001.jpg",
          subs: [
            "/ocr_sample/img/ILCAE00221000098-2_page-0001.jpg",
            "/ocr_sample/img/ILCAE00221000098-2_page-0003.jpg",
            "/ocr_sample/img/ILCAE00221000098-2_page-0005.jpg"
          ]
        }
      };

      const config = sampleConfig[uploadMode];
      if (!config) return;

      // MAIN FILE
      const mainBlob = await fetch(config.main).then(r => r.blob());
      const mainName = config.main.split("/").pop() || "main-document";
      setMainDocument(new File([mainBlob], mainName, { type: mainBlob.type }));

      // SUB FILES
      const subFiles = await Promise.all(
        config.subs.map(async (path) => {
          const blob = await fetch(path).then(r => r.blob());
          const name = path.split("/").pop() || "document";
          return new File([blob], name, { type: blob.type });
        })
      );

      setSubDocuments(subFiles);
    } catch (err) {
      console.error("Sample load failed", err);
    }
  };



  useEffect(() => {
    const storedUserId = localStorage.getItem("userID");
    setUserId(storedUserId ?? "");
  }, []);




  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-8">
          <div className="text-center">
            <div className="h-10 bg-slate-200 rounded w-1/3 mx-auto mb-4"></div>
            <div className="h-6 bg-slate-200 rounded w-2/3 mx-auto"></div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="h-8 bg-slate-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }





  return (
    <div className="p-6 mx-auto space-y-8">
      {/* Header */}

      <div className="card bg-light p-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <DownloadCloudIcon className="text-blue-400" />
          Upload Documents</h1>
        <p className="text-black mt-1">
          Upload trade finance documents for processing. Select an existing session or create a new one to get started.
        </p>
      </div>

      {!hasActiveSession && (

       <div className="card bg-light rounded-2xl shadow-sm  p-6 mt-8">
          {/* New logic */}
          <>

            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-slate-900">Create New Session</h3>

              <div className="flex justify-end mb-4">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="px-4 py-2 text-sm font-medium rounded-md 
               bg-indigo-100 text-indigo-800 hover:bg-indigo-200
               transition cursor-pointer"
                >
                  Load Sample Data
                </button>
              </div>


            </div>

            <div className="space-y-6">

              {/* User ID (Read Only) */}
              <div className="bg-white border border-slate-300 rounded-lg p-6 shadow-sm">

                <div className="flex flex-1 min-w-[250px] items-center space-x-3">
                  <label className="w-40 text-md font-medium flex items-center gap-1">
                    User ID
                  </label>
                  <input
                    type="text"
                    value={userId}
                    readOnly
                    className="flex-1 input bg-gray-200 border border-slate-400 rounded-md px-3 py-2 text-sm text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>


              {/* ---------------- Account Details Section ---------------- */}
              <div className="bg-white border border-slate-300 rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Account Details</h2>
                <div className="flex flex-col gap-5 w-full">
                  {/* Account Number */}
                  <div className="flex flex-1 min-w-[250px] items-center space-x-3">
                    <label className="w-40 text-md font-medium flex items-center gap-1">
                      Account Number<span className="text-danger text-xl">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Account Number (E.g., ACC-TRD-987654321)"
                      value={newSession.cifno}
                      onChange={(e) =>
                        setNewSession((prev) => ({ ...prev, cifno: e.target.value }))
                      }
                      className="flex-1 input bg-gray-100 border border-slate-400 rounded-md px-3 py-2 text-sm text-gray-700"
                    />
                  </div>

                  {/* Account Name */}
                  <div className="flex flex-1 min-w-[250px] items-center space-x-3">
                    <label className="w-40 text-md font-medium flex items-center gap-1">
                      Account Name<span className="text-danger text-xl">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Account Name"
                      value={newSession.accountName}
                      onChange={(e) =>
                        setNewSession((prev) => ({ ...prev, accountName: e.target.value }))
                      }
                      className="flex-1 input bg-gray-100 border border-slate-400 rounded-md px-3 py-2 text-sm text-gray-700"
                    />
                  </div>
                </div>
              </div>

              {/* ---------------- Applicant Details Section ---------------- */}
              <div className="bg-white border border-slate-300 rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Applicant Details</h2>
                <div className="flex flex-col gap-5 w-full">
                  {/* Applicant ID */}
                  <div className="flex flex-1 min-w-[250px] items-center space-x-3">
                    <label className="w-40 text-md font-medium flex items-center gap-1">
                      Applicant ID<span className="text-danger text-xl">*</span>
                    </label>
                    <input
                      type="text"
                      value={newSession.customer_ID}
                      placeholder='Applicant ID (E.g., APPL20250045)'
                      onChange={(e) =>
                        setNewSession((prev) => ({
                          ...prev,
                          customer_ID: e.target.value.replace(/[^0-9]/g, ""),
                        }))
                      }
                      onBlur={() => {
                        fetchCustomerIfExists(
                          newSession.cifno.trim(),
                          newSession.customer_ID.trim()
                        );
                      }}
                      className="flex-1 input bg-gray-100 border border-slate-400 rounded-md px-3 py-2 text-sm text-gray-700"
                    />
                  </div>

                  {/* Applicant Name */}
                  <div className="flex flex-1 min-w-[250px] items-center space-x-3">
                    <label className="w-40 text-md font-medium flex items-center gap-1">
                      Applicant Name<span className="text-danger text-xl">*</span>
                    </label>
                    <input
                      type="text"
                      value={newSession.customer_name}
                      placeholder='Applicant Name'
                      onChange={(e) =>
                        setNewSession((prev) => ({ ...prev, customer_name: e.target.value }))
                      }
                      className="flex-1 input bg-gray-100 border border-slate-400 rounded-md px-3 py-2 text-sm text-gray-700"
                    />
                  </div>

                  {/* Applicant Type */}
                  <div className="flex flex-1 min-w-[250px] items-center space-x-3">
                    <label className="w-40 text-md font-medium flex items-center gap-1">
                      Applicant Type<span className="text-danger text-xl">*</span>
                    </label>
                    <input
                      type="text"
                      value={newSession.customer_type}
                      placeholder='Applicant Type'
                      onChange={(e) =>
                        setNewSession((prev) => ({ ...prev, customer_type: e.target.value }))
                      }
                      className="flex-1 input bg-gray-100 border border-slate-400 rounded-md px-3 py-2 text-sm text-gray-700"
                    />
                  </div>
                </div>
              </div>

              {/* ---------------- Instrument & Lifecycle Section ---------------- */}
              <div className="bg-white border border-slate-300 rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Instrument & Lifecycle</h2>
                <div className="flex flex-col gap-5 w-full">
                  {/* Instrument Type */}

                  {/* LC Number */}
                  <div className="flex flex-1 min-w-[250px] items-center space-x-3">
                    <label className="w-40 text-md font-medium flex items-center gap-1">
                      LC Number<span className="text-danger text-xl">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="LC Number (E.g., LC-TD-123456789)"
                      value={newSession.lc_number}
                      onChange={(e) =>
                        setNewSession((prev) => ({ ...prev, lc_number: e.target.value }))
                      }
                      className="flex-1 input bg-gray-100 border border-slate-400 rounded-md px-3 py-2 text-sm text-gray-700"
                    />
                  </div>


                  <div className="flex flex-1 min-w-[250px] items-center space-x-3">
                    <label className="w-40 text-md font-medium flex items-center gap-1">
                      Instrument Type<span className="text-danger text-xl">*</span>
                    </label>
                    <div className="flex-1">
                      <Select
                        onValueChange={(value) => {
                          setNewSession((prev) => ({
                            ...prev,
                            instrument: value,
                            lifecycle: "",
                          }));
                        }}
                        value={newSession.instrument ?? ""}
                      >
                        <SelectTrigger className="w-full bg-gray-100 border border-slate-400 rounded-md px-3 py-2 text-sm text-gray-700">
                          <SelectValue placeholder="Select Instrument" />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueInstruments.map((inst, index) => (
                            <SelectItem key={index} value={inst}>
                              {inst}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Lifecycle */}
                  <div className="flex flex-1 min-w-[250px] items-center space-x-3">
                    <label className="w-40 text-md font-medium flex items-center gap-1">
                      Lifecycle<span className="text-danger text-xl">*</span>
                    </label>
                    <div className="flex-1">
                      <Select
                        onValueChange={(value) =>
                          setNewSession((prev) => ({ ...prev, lifecycle: value }))
                        }
                        value={newSession.lifecycle ?? ""}
                      >
                        <SelectTrigger className="w-full bg-gray-100 border border-slate-400 rounded-md px-3 py-2 text-sm text-gray-700">
                          <SelectValue placeholder="Select Lifecycle" />
                        </SelectTrigger>
                        <SelectContent>
                          {lifecycles
                            .filter((item) => item.instrument === newSession.instrument)
                            .map((item) => (
                              <SelectItem key={item.id} value={item.transition}>
                                {item.transition}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreateSession(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSession}
                disabled={
                  !newSession.cifno ||
                  !newSession.customer_ID ||
                  !newSession.lc_number ||
                  !newSession.instrument ||
                  !newSession.lifecycle ||
                  !newSession.accountName ||
                  !newSession.customer_name ||
                  !newSession.customer_type
                }
                // style={{ fontWeight: "600" }}
                className={`flex-1 px-4 py-2 rounded-lg text-blue-600 transition-colors
    ${!newSession.cifno ||
                    !newSession.customer_ID ||
                    !newSession.lc_number ||
                    !newSession.instrument ||
                    !newSession.lifecycle ||
                    !newSession.accountName ||
                    !newSession.customer_name ||
                    !newSession.customer_type
                    ? "bg-blue-100 cursor-not-allowed"
                    : "bg-blue-100 hover:bg-blue-200 cursor-pointer"
                  }`}
              >
                Create Session
              </button>

            </div>

          </>
        </div>

      )}




      {/* Session Selection */}
      {hasActiveSession && (

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-slate-900">Select Session</h2>

            {/* Toggle View: Show all sessions for current customer */}
            {customerSessions.length > 1 && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowAllSessions(prev => !prev)}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors"
                >
                  {showAllSessions ? "View Latest Session" : "View All My Sessions"}
                </button>
              </div>
            )}
          </div>

          {/* Filter sessions by current customer's CIF */}
          {(() => {


            const filteredSessions = showAllSessions
              ? customerSessions // show all sessions for this customer
              : customerSessions.length > 0
                ? [customerSessions[customerSessions.length - 1]] // show latest session only
                : [];



            if (filteredSessions.length === 0) {
              return (
                <div className="text-center py-12">
                  <FolderOpen className="mx-auto text-slate-400 mb-4" size={48} />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Active Sessions</h3>
                  <p className="text-slate-600 mb-4">Create a new session to start uploading documents</p>
                  <button
                    onClick={() => setShowCreateSession(true)}
                    disabled={isUploading}
                    className={`px-6 py-3 rounded-lg text-blue-600 transition-colors
              ${isUploading ? "bg-blue-100 cursor-not-allowed" : "bg-blue-100 hover:bg-blue-200 cursor-pointer"}`}
                  >
                    Create First Session
                  </button>
                </div>
              );
            }

            return (
              <div className="card bg-white p-6 rounded-2xl shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSessions.map(session => (
                    <div
                      key={session.id}
                      onClick={() => !isUploading && setSelectedSessionId(session.id)}
                      className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${isUploading
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer"
                        } ${selectedSessionId === session.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                        }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">{session.lc_number}</h3>
                          <p className="text-sm text-slate-600">CIF: {session.cifno}</p>
                          <p className="text-xs text-slate-500 mt-1">Instrument: {session.instrument}</p>
                          <p className="text-xs text-slate-500 mt-1">Lifecycle: {session.lifecycle}</p>
                        </div>
                        {selectedSessionId === session.id && (
                          <CheckCircle2 className="text-blue-500" size={20} />
                        )}
                      </div>
                      <div className="flex justify-end">
                        <span
                          className={`inline-flex pb-2 pt-1 px-2 text-xs font-medium capitalize rounded-md ${getStatusColor(session.status)}`}
                        >
                          {session.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Selected Session Upload */}
          <div id="upload-section">

            {(() => {
              const selectedSession = sessions.find(s => s.id === selectedSessionId);
              // if (!selectedSession) return null;

              // Define upload options
              const uploadOptions = [
                { label: "PDF", value: "pdf" },
                { label: "Text File", value: "text" },
                { label: "Scanned Images", value: "image" },
                { label: "Copy & Paste", value: "copy" },
              ];

              return (
                <div className="mt-6 p-6 border border-slate-200 rounded-2xl bg-slate-50">

                  <div className="flex items-center justify-between mb-6">

                    <h3 className="text-xl font-semibold text-slate-900 mb-6">Upload LC Documents</h3>
                    <div className='flex justify-end'>
                      <button
                        type="button"
                        onClick={loadSampleFromPublic}
                        className="px-4 py-2 text-sm font-medium rounded-md 
               bg-indigo-100 text-indigo-800 hover:bg-indigo-200
               transition cursor-pointer"
                      >
                        Load Sample Documents
                      </button>
                    </div>
                  </div>


                  {/* RADIO BUTTON FOR UPLOAD MODE */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Select Upload Type
                    </label>
                    <div className="flex flex-wrap gap-6">
                      {uploadOptions.map(option => (
                        <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="uploadMode"
                            value={option.value}
                            checked={uploadMode === option.value}
                            onChange={() => setUploadMode(option.value)}
                            className="accent-blue-600"
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* FILE UPLOAD FLOW */}
                  {(uploadMode === "pdf" || uploadMode === "text" || uploadMode === "image") && (
                    <>
                      {/* Main Document */}
                      <div className="mb-6">
                        {/* Detect Document Name Button - Shown for both Text and Image modes after upload */}


                        <label className="block text-sm font-medium text-slate-700 mb-2">Main LC Document</label>
                        <div
                          className="border-2 border-dashed border-blue-300 rounded-xl p-6 text-center bg-white cursor-pointer"
                          onClick={() => document.getElementById("mainLcInput")?.click()}
                        >
                          <input
                            id="mainLcInput"
                            type="file"
                            accept={
                              uploadMode === "pdf" ? ".pdf" :
                                uploadMode === "text" ? ".txt" :
                                  uploadMode === "image" ? "image/*" : ""
                            }
                            className="hidden"
                            onChange={(e) => setMainDocument(e.target.files?.[0] || null)}
                          />
                          <p className="text-slate-600">
                            Click or drag & drop {uploadMode === "image" ? "images" : uploadMode.toUpperCase()} file
                          </p>
                          {mainDocument && <p className="mt-2 text-green-600 text-sm">Selected: {mainDocument.name}</p>}
                        </div>
                      </div>

                      {/* Sub Documents */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Supporting Documents</label>
                        <div
                          className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-white cursor-pointer"
                          onClick={() => document.getElementById("subDocsInput")?.click()}
                        >
                          <input
                            id="subDocsInput"
                            type="file"
                            multiple
                            accept={
                              uploadMode === "pdf" ? ".pdf" :
                                uploadMode === "text" ? ".txt" :
                                  uploadMode === "image" ? "image/*" : ""
                            }
                            className="hidden"
                            onChange={(e) => setSubDocuments(Array.from(e.target.files || []))}
                          />
                          <p className="text-slate-600">
                            Click or drag & drop {uploadMode === "image" ? "images" : uploadMode.toUpperCase()} files
                          </p>
                          {subDocuments.length > 0 && (
                            <ul className="mt-3 text-sm text-green-700">
                              {subDocuments.map((f, i) => <li key={i}>• {f.name}</li>)}
                            </ul>
                          )}
                        </div>
                      </div>

                      {((uploadMode === "text" && uploadedMainTextFile) || (uploadMode === "image" && uploadedMainImageFile)) && isUploadComplete && (
                        <div className="mb-6  mt-6 flex flex-col gap-3">
                          {/* Detected Document Names */}
                          {classifiedDocName.length > 0 && (
                            <div className="space-y-3">

                              {/* Main LC Document */}
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-slate-600 w-40">
                                  Main LC Document
                                </span>

                                <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs border border-blue-200">
                                  {classifiedDocName[0].classified_name}
                                </div>
                              </div>

                              {/* Supporting Documents */}
                              {classifiedDocName.length > 1 && (
                                <div className="flex items-start gap-3">
                                  <span className="text-xs font-semibold text-slate-600 w-40">
                                    Supporting Documents
                                  </span>

                                  <div className="flex flex-wrap gap-2">
                                    {classifiedDocName.slice(1).map(d => (
                                      <div
                                        key={d.doc_id}
                                        className="px-3 py-1 rounded-full bg-green-50 text-green-800 text-xs border border-green-200"
                                      >
                                        {d.classified_name}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            </div>
                          )}

                        </div>

                      )}
                    </>
                  )}


                  {/* COPY-PASTE FLOW */}
                  {uploadMode === "copy" && (
                    <div className="space-y-6">
                      {/* Main Document */}
                      <div className="border border-slate-300 rounded-xl p-4 bg-white">
                        <h4 className="font-semibold text-slate-800 mb-3">Swift Document</h4>
                        <select
                          value={mainCopyDoc.name}
                          onChange={(e) => setMainCopyDoc(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mb-3"
                        >
                          <option value="">Select Swift Document</option>
                          {masterDocs.map(doc => (
                            <option key={doc.documentId} value={doc.documentName}>
                              {doc.documentName}
                            </option>
                          ))}
                        </select>


                        <textarea
                          rows={6}
                          placeholder="Paste main document content here..."
                          value={mainCopyDoc.content}
                          onChange={(e) => setMainCopyDoc(prev => ({ ...prev, content: e.target.value }))}
                          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                        />
                      </div>

                      {/* Sub Documents */}
                      <div className="border border-slate-300 rounded-xl p-4 bg-white">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-semibold text-slate-800">Sub Documents</h4>
                          <button
                            type="button"
                            onClick={() => setSubCopyDocs(prev => [...prev, { name: "", content: "" }])}
                            className="text-blue-600 text-sm font-medium"
                          >
                            + Add Sub Document
                          </button>
                        </div>
                        {subCopyDocs.length === 0 && <p className="text-sm text-slate-500">No sub documents added</p>}
                        {subCopyDocs.map((doc, index) => (
                          <div key={index} className="border border-slate-200 rounded-lg p-3 mb-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium">Sub Document {index + 1}</span>
                              <button
                                type="button"
                                onClick={() => setSubCopyDocs(prev => prev.filter((_, i) => i !== index))}
                                className="text-red-500 text-xs"
                              >
                                Remove
                              </button>
                            </div>

                            {/* Dropdown for sub-document name */}
                            <select
                              value={doc.name}
                              onChange={(e) => {
                                const updated = [...subCopyDocs];
                                updated[index].name = e.target.value;
                                setSubCopyDocs(updated);
                              }}
                              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mb-2"
                            >
                              <option value="">Select Sub Document</option>
                              {masterDocs.map(md => (
                                <option key={md.documentId} value={md.documentName}>
                                  {md.documentName}
                                </option>
                              ))}
                            </select>

                            {/* Textarea for sub-document content */}
                            <textarea
                              rows={5}
                              placeholder="Paste document content"
                              value={doc.content}
                              onChange={(e) => {
                                const updated = [...subCopyDocs];
                                updated[index].content = e.target.value;
                                setSubCopyDocs(updated);
                              }}
                              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                            />
                          </div>
                        ))}

                      </div>
                    </div>
                  )}

                  {/* Upload Button */}
                  <div className="mt-6 flex justify-end space-x-4">
                    {/* Upload Button: show only if upload NOT complete */}
                    {!isUploadComplete && (
                      <button
                        onClick={uploadSelectedDocuments}
                        disabled={isButtonLoading}
                        className="bg-green-100 text-green-800 px-6 py-3 rounded-lg flex items-center space-x-2 disabled:opacity-70"
                      >
                        {isButtonLoading && (
                          <div className="w-5 h-5 border-2 border-green-800 border-t-transparent rounded-full animate-spin"></div>
                        )}
                        <span>{isButtonLoading ? "Processing..." : "Upload"}</span>
                      </button>
                    )}

                    {/* Navigate Button: show only after upload completes */}
                    {isUploadComplete && (
                      <button
                        onClick={() => navigate(`/tf_genie/discrepancy/ocr-factory/${selectedSessionId}`)}
                        className="bg-blue-100 text-blue-800 px-6 py-3 rounded-lg hover:bg-blue-200 cursor-pointer"
                      >
                        Go to OCR Factory
                      </button>
                    )}
                  </div>

                </div>
              );
            })()}
          </div>

        </div>


      )}

    </div>
  );
};

export default Upload;