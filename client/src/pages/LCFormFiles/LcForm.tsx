import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useResponsive, useScrollPosition } from '@/hooks';
import { Scrollspy } from '@/components/scrollspy/Scrollspy';
import { AccountSettingsSidebar } from './AccountSettingsSidebar';
import { useLayout } from '@/providers';
import CustomerDetails from './LCFormComponents/CustomerDetails';
import LCDetails from './LCFormComponents/LCDetails';
import InstrumentLifeCycle from './LCFormComponents/InstrumentLifeCycle';
import Prompt from './LCFormComponents/Prompt';
import LCDocument from './LCFormComponents/LCDocument';
import SubLcDocument from './LCFormComponents/SubLcDocument';
import LCAnalysisResult from './LCFormComponents/LCAnalysisResult';
import AmendmentComponent from './Amendment/Amendment';
import axios from 'axios';
import { string } from 'zod';
const stickySidebarClasses: Record<string, string> = {
  'demo1-layout': 'top-[calc(var(--tw-header-height)+1rem)]',
  'demo2-layout': 'top-[calc(var(--tw-header-height)+1rem)]',
  'demo3-layout': 'top-[calc(var(--tw-header-height)+var(--tw-navbar-height)+1rem)]',
  'demo4-layout': 'top-[3rem]',
  'demo5-layout': 'top-[calc(var(--tw-header-height)+1.5rem)]',
  'demo6-layout': 'top-[3rem]',
  'demo7-layout': 'top-[calc(var(--tw-header-height)+1rem)]',
  'demo8-layout': 'top-[3rem]',
  'demo9-layout': 'top-[calc(var(--tw-header-height)+1rem)]',
  'demo10-layout': 'top-[1.5rem]'
};
type TokensInfo = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

type ModeResult = {
  request: string;
  response: string;
  analysis: string;
  tokens: TokensInfo;
};

type AnalysisResult = {
  success: boolean;
  analysis_id?: number;
  mode1: ModeResult;
  mode2: ModeResult;
  mode3: ModeResult;
};

const LcForm = () => {
  const desktopMode = useResponsive('up', 'lg');
  const { currentLayout } = useLayout();
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [lcNumber, setLcNumber] = useState('');
  const [sidebarSticky, setSidebarSticky] = useState(false);
  const [instrument, setInstrument] = useState('');
  const [lifecycle, setLifecycle] = useState('');
  const [promptId, setPromptId] = useState<number | null>(null);
  const [promptText, setPromptText] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lcDocument, setLcDocument] = useState('');
  const [subLcDocument, setSubLcDocument] = useState('');
  const [activeTab, setActiveTab] = useState<'mode1' | 'mode2' | 'mode3'>('mode1');
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [isActive, setIsactive] = useState<boolean | null>(null);
  const isIssuance = ['ISSUANCE', 'PAYMENT'].includes(lifecycle?.toUpperCase() ?? '');
  const isAmendment = ['AMENDMENT'].includes(lifecycle?.toUpperCase() ?? '');
  const [draftId, setDraftId] = useState<number | null>(null);
  const [newLc, setNewLc] = useState('');
  const [oldLc, setOldLc] = useState('');
  const [subDocsNew, setSubDocsNew] = useState<string[]>([]);
  const [amendment, setAmendment] = useState('');
  const [extracted, setExtracted] = useState<any>(null);
  const [verified, setVerified] = useState<any>(null);

  const isRunAnalysisEnabled = React.useMemo(() => {
    if (isIssuance) {
      return lcDocument.trim().length > 0 && subLcDocument.trim().length > 0;
    }

    if (isAmendment) {
      return (
        newLc.trim().length > 0 &&
        Array.isArray(subDocsNew) &&
        subDocsNew.some((doc) => doc.trim().length > 0)
      );
    }

    return false;
  }, [isIssuance, isAmendment, lcDocument, subLcDocument, newLc, subDocsNew]);

  const [errors, setErrors] = useState({
    customerId: '',
    customerName: '',
    lcNumber: '',
    instrument: '',
    lifecycle: '',
    promptText: '',
    lcDocument: '',
    subLcDocument: ''
  });
  const lcDocumentToSend = isAmendment ? newLc : lcDocument;

  const validateForm = () => {
    const newErrors: any = {
      customerId: '',
      customerName: '',
      lcNumber: '',
      instrument: '',
      lifecycle: '',
      promptText: '',
      lcDocument: '',
      subLcDocument: ''
    };

    if (!customerId.trim()) newErrors.customerId = 'Customer ID is required';
    if (!customerName.trim()) newErrors.customerName = 'Customer Name is required';
    if (!lcNumber.trim()) newErrors.lcNumber = 'LC Number is required';
    if (!instrument.trim()) newErrors.instrument = 'Instrument is required';
    if (!lifecycle.trim()) newErrors.lifecycle = 'Lifecycle is required';
    if (!promptText.trim()) newErrors.promptText = 'Prompt is required';
    if (isIssuance) {
      if (!lcDocument.trim()) newErrors.lcDocument = 'LC Document is required';
      if (!subLcDocument.trim()) newErrors.subLcDocument = 'Sub Document is required';
    }

    setErrors(newErrors);
    return Object.values(newErrors).every((e) => e === '');
  };

  console.log('subLcDocument', subLcDocument);
  const parentRef = useRef<HTMLElement | Document>(document);
  const scrollPosition = useScrollPosition({ targetRef: parentRef });

  useEffect(() => {
    const scrollableElement = document.getElementById('scrollable_content');
    if (scrollableElement) parentRef.current = scrollableElement;
  }, []);

  useEffect(() => setSidebarSticky(scrollPosition > 100), [scrollPosition, currentLayout?.options]);

  const stickyClass = currentLayout?.name
    ? stickySidebarClasses[currentLayout.name] || 'top-[calc(var(--tw-header-height)+1rem)]'
    : 'top-[calc(var(--tw-header-height)+1rem)]';
  const computeDocumentHash = (text: string): string => {
    if (!text) return '';
    let hash = 0;
    const str = text.substring(0, 5000); // avoid looping huge text
    for (let i = 0; i < str.length; i++) {
      const chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0; // convert to 32bit int
    }
    return `DOC-${Math.abs(hash)}`;
  };
  const parseSubDocuments = (rawText: string) => {
    const regex = /--- FILE: (.*?) ---\s*([\s\S]*?)(?=--- FILE:|$)/g;
    const results: { name: string; content: string }[] = [];

    let match;
    while ((match = regex.exec(rawText)) !== null) {
      let fileName = match[1].trim();
      fileName = fileName.replace(/\.[^/.]+$/, '');

      results.push({
        name: fileName,
        content: match[2].trim()
      });
    }

    return results;
  };
  const parsedSubs = parseSubDocuments(subLcDocument);

  const subDocumentsPayload = parsedSubs.map((doc) => ({
    subdocument_category: doc.name, // BillOfLading / Invoice
    document_name: doc.name, // Actual document name
    sub_document_text: doc.content // ONLY that document text
  }));

  const fetchPrompt = async (inst: string, life: string) => {
    if (!inst || !life) return;

    const res = await fetch(`/api/lc/prompts?instrument_type=${inst}&lifecycle_stage=${life}`);

    const data = await res.json();
    console.log('prompt', data);
    setPromptText(data.prompt_text || '');
    setPromptId(data.prompt_id ?? null);
    setIsactive(data.is_active ?? null);
    // 🔥 autosave prompt immediately
    setFormData((prev) => {
      const updated = {
        ...prev,
        prompt_text: data.prompt_text || '',
        prompt_id: data.prompt_id ?? null
      };
      // autosaveDraft(updated);
      return updated;
    });
  };

  const userID = localStorage.getItem('userID');
  console.log(userID);

  const runAnalysis = async () => {
    if (!validateForm()) {
      return;
    }
    try {
      setIsAnalyzing(true);
      const parsedSubs = parseSubDocuments(subLcDocument);
      const subCat = parsedSubs.map((d) => d.name).join(', ');
      const subDocsCombined = parsedSubs.map((d) => d.content).join('\n\n-----END-DOC-----\n\n');
      // const lcSubDocumentToSend = isAmendment ? subDocsNew : subDocsCombined;
      const lcSubDocumentToSend =
        isAmendment && Array.isArray(subDocsNew)
          ? subDocsNew.join('\n\n-----END-DOC-----\n\n')
          : subDocsCombined || '';
      const saveRes = await fetch('/api/lc/save-tool-instrument', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lc_number: lcNumber,
          cifno: customerId,
          customer_name: customerName,
          instrument_type: instrument,
          lifecycle: lifecycle,
          prompt_id: promptId,
          prompt_text: promptText,
          document_hash: computeDocumentHash(lcDocument),
          main_document: lcDocument,
          old_document: oldLc,
          given_amendment: amendment,
          new_document: newLc,
          extracted_amendment: extracted ? JSON.stringify(extracted) : null,
          verified_amendment: verified ? JSON.stringify(verified) : null,
          subdocument_category: subCat,
          sub_documents: subDocsCombined,
          UserID: userID
        })
      });

      const saveData = await saveRes.json();

      if (!saveData.success) {
        alert('Failed to save tool instrument');
        return;
      }
      const txnId = saveData.transaction_no;
      setTransactionId(txnId);
      await fetch('/api/lc/subdocuments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_no: txnId,
          cifno: customerId,
          instrument_type: instrument,
          lifecycle: lifecycle,
          lc_number: lcNumber,
          UserID: Number(userID),
          documents: subDocumentsPayload
        })
      });
      const res = await fetch('/api/lc/analyze-lc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: txnId,
          cifno: customerId,
          lc_number: lcNumber,
          instrument: instrument,
          lifecycle: lifecycle,
          prompt: promptText,
          lc_document: lcDocumentToSend,
          sub_documents: lcSubDocumentToSend || '',
          prompt_id: Number(promptId),
          is_active: isActive,
          UserID: Number(userID)
        })
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Analysis failed');
        return;
      }
      setAnalysisResult(data);
      if (data.success) {
        await fetch(`/api/lc/update-status/${txnId}`, {
          method: 'PUT'
        });
      }
      alert(`Analysis completed\nTransaction No: ${txnId}`);
    } catch (err) {
      console.error('Error:', err);
      alert('Something went wrong during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const AmenmentRunAnalysis = async () => {
    if (!oldLc || !newLc || !amendment || isAnalyzing) return;

    try {
      setIsAnalyzing(true);

      const parsedSubs = parseSubDocuments(subLcDocument);
      const subCat = parsedSubs.map((d) => d.name).join(', ');
      const subDocsCombined = parsedSubs.map((d) => d.content).join('\n\n-----END-DOC-----\n\n');

      const lcSubDocumentToSend =
        isAmendment && Array.isArray(subDocsNew)
          ? subDocsNew.join('\n\n-----END-DOC-----\n\n')
          : subDocsCombined || '';

      if (!lcSubDocumentToSend.trim()) {
        alert('Sub-documents are required for cross-document analysis');
        setIsAnalyzing(false);
        return;
      }
      // Save sub-documents
      await fetch('/api/lc/subdocuments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_no: transactionId,
          cifno: customerId,
          instrument_type: instrument,
          lifecycle: lifecycle,
          lc_number: lcNumber,
          UserID: Number(userID),
          documents: subDocumentsPayload
        })
      });
      // Run analysis
      const res = await fetch('/api/lc/analyze-lc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: transactionId,
          cifno: customerId,
          lc_number: lcNumber,
          instrument: instrument,
          lifecycle: lifecycle,
          prompt_id: promptId,
          prompt: promptText,
          lc_document: lcDocumentToSend,
          sub_documents: lcSubDocumentToSend || '',
          is_active: isActive,
          UserID: Number(userID),
          // variation_code: 'Amenment'
        })
      });

      const data = await res.json();
      console.log('Analysis Result:', data);
      setAnalysisResult(data);
      if (data.success) {
        await fetch(`/api/lc/update-status/${transactionId}`, {
          method: 'PUT'
        });
      }

      // 🔥🔥 AUTO SAVE AFTER ANALYSIS SUCCESS 🔥🔥
      await autoSaveDocument(
        newLc, // new document
        extracted, // extracted amendment
        verified // verified amendment
      );
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const [formData, setFormData] = useState({
    cifno: '',
    customer_name: '',
    lc_number: '',
    transaction_no: '',
    instrument_type: '',
    lifecycle: '',
    prompt_text: '',
    prompt_id: null as number | null
  });

  
  const autoSaveDocument = async (
    newDocument?: string,
    extractedAmendment?: string,
    verifiedAmendment?: string
  ) => {
    const payload = {
      transaction_no: transactionId,
      instrument_type: instrument,
      lc_number: lcNumber,
      model: 'amendment_v1',
      old_document: oldLc,
      given_amendment: amendment,
      new_document: newDocument ?? newLc,
      extracted_amendment: extractedAmendment ?? extracted,
      verified_amendment: verifiedAmendment ?? verified
    };

    try {
      await axios.put(`http://localhost:8000/api/lc/instruments/by-txn/${transactionId}`, payload);
      console.log('Auto-save successful!');
    } catch (err) {
      console.error('Error auto-saving document:', err);
    }
  };
  const saveOnGenerateNew = async () => {
    const payload = {
      cifno: customerId,
      customer_name: customerName,
      lc_number: lcNumber,
      instrument_type: instrument,
      lifecycle: lifecycle,

      prompt_id: Number(promptId),
      prompt_text: promptText,

      old_document: oldLc,
      given_amendment: amendment,
      new_document: newLc,

      variation_code: 'LLM',
      userID: Number(userID),
      model: 'amendment_v1',

      status: 'draft'
    };

    const res = await fetch('http://localhost:8000/api/lc/instruments/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    setDraftId(result.id);
    setTransactionId(result.transaction_no);

    localStorage.setItem('transaction_no', result.transaction_no);
    localStorage.setItem('lc_number', lcNumber);

    console.log(' Draft saved on Generate New:', result);
  };

  return (
    <div className="w-full p-6 space-y-6 card">
      <div className="flex grow gap-5 lg:gap-7.5">
        {/* LEFT SIDEBAR */}
        {desktopMode && (
          <div className="w-[230px] shrink-0">
            <div
              className={clsx('w-[200px]', sidebarSticky && `fixed z-10 start-auto ${stickyClass}`)}
            >
              <Scrollspy
                key={`${isIssuance}-${!!analysisResult}`}
                offset={100}
                targetRef={parentRef}
              >
                <AccountSettingsSidebar isIssuance={isIssuance} />
              </Scrollspy>
            </div>
          </div>
        )}

        {/* MAIN CONTENT */}
        <div className="flex flex-col items-stretch grow gap-5 lg:gap-7.5 ">
          <div id="CustomerDetails">
            <CustomerDetails
              errors={errors}
              customerId={customerId}
              customerName={customerName}
              onChange={(field, value) => {
                if (field === 'customerId') setCustomerId(value);
                else setCustomerName(value);
              }}
            />
          </div>
          <div id="LCDetails">
            <LCDetails lcNumber={lcNumber} onChangeLCNumber={setLcNumber} errors={errors} />
          </div>
          <div id="InstrumentLifeCycle">
            <InstrumentLifeCycle
              instrument={instrument}
              lifecycle={lifecycle}
              errors={errors}
              onSelection={(inst, life) => {
                setInstrument(inst);
                setLifecycle(life);

                // 🔥 clear validation errors as user selects
                setErrors((prev) => ({
                  ...prev,
                  instrument: inst ? '' : prev.instrument,
                  lifecycle: life ? '' : prev.lifecycle
                }));

                fetchPrompt(inst, life);
              }}
            />
          </div>
          {/* PROMPT DISPLAY */}
          <div id="prompts">
            <Prompt promptText={promptText} />
          </div>
          {isIssuance && (
            <div id="LCDocument">
              <LCDocument
                error={errors.lcDocument}
                onDocumentExtracted={(txt) => {
                  setLcDocument(txt);

                  if (txt.trim()) {
                    setErrors((prev) => ({ ...prev, lcDocument: '' }));
                  }
                }}
              />
            </div>
          )}
          {isIssuance && (
            <div id="SubLCdocuments">
              <SubLcDocument
                error={errors.subLcDocument}
                onDocumentExtracted={(txt) => {
                  setSubLcDocument(txt);

                  if (txt.trim()) {
                    setErrors((prev) => ({ ...prev, subLcDocument: '' }));
                  }
                }}
              />
            </div>
          )}
          {isAmendment && (
            <div>
              <AmendmentComponent
                validateForm={validateForm}
                selectedInstrument={instrument}
                newLc={newLc}
                setNewLc={setNewLc}
                subDocsNew={subDocsNew}
                setSubDocsNew={setSubDocsNew}
                amendment={amendment}
                setAmendment={setAmendment}
                extracted={extracted}
                setExtracted={setExtracted}
                verified={verified}
                setVerified={setVerified}
                oldLc={oldLc}
                setOldLc={setOldLc}
                saveOnGenerateNew={saveOnGenerateNew}
              />
            </div>
          )}
          {isIssuance && (
            <div className="flex justify-start">
              <button
                onClick={runAnalysis}
                disabled={isAnalyzing || !isRunAnalysisEnabled}
                className={`btn btn-primary w-auto mt-4 ${
                  isAnalyzing || !isRunAnalysisEnabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
              </button>
            </div>
          )}
          {isAmendment && (
            <div className="flex justify-start">
              <button
                onClick={AmenmentRunAnalysis}
                // disabled={isAnalyzing || !isRunAnalysisEnabled}
                className={`btn btn-primary w-auto mt-4 ${
                  isAnalyzing || !isRunAnalysisEnabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
              </button>
            </div>
          )}
          {isAnalyzing && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
                <p className="text-white text-lg font-semibold">Analyzing LC Document...</p>
              </div>
            </div>
          )}
          <LCAnalysisResult
            activeTab={activeTab}
            analysisResult={analysisResult}
            setActiveTab={setActiveTab}
          />
        </div>
      </div>
    </div>
  );
};

export default LcForm;
