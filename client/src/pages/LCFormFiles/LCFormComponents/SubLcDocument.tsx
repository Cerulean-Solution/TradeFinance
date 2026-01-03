import React, { useState, useRef } from 'react';
import BillOfLading from '../TextFiles/Bill_of_lading.txt';
import CommercialInvoice from '../TextFiles/Commercial_invoice.txt';
import IssuanceCertificate from '../TextFiles/Issuance_certificate.txt';
import PackingList from '../TextFiles/PackingList.txt';
import QulaityCertificate from '../TextFiles/Quality_certificate.txt';
import { KeenIcon } from '@/components';
import {
  Menu,
  TMenuConfig,
  MenuItem,
  MenuLink,
  MenuSub,
  MenuTitle,
  MenuArrow
} from '@/components/menu';
import { useLanguage } from '@/i18n';
type FileItem = {
  file: File;
  progress: number;
  done: boolean;
  text: string; // ⭐ NEW: store extracted text for each file
};

type LCDocumentProps = {
  onDocumentExtracted: (text: string) => void;
  error?: string;
};

type MasterDocument = {
  documentId: number;
  documentCode: string;
  documentName: string;
  description?: string | null;
  isActive: boolean;
};

const SubLcDocument = ({ onDocumentExtracted, error }: LCDocumentProps) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [documents, setDocuments] = useState<MasterDocument[]>([]);
  const [showDocPopup, setShowDocPopup] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  // ----------------------------------------------------------------------
  // ⭐ Extract text and attach to each file
  // ----------------------------------------------------------------------
  const extractAllTexts = async (fileList: FileList) => {
    let combinedText = '';
    const updatedFiles: FileItem[] = [];

    for (const file of Array.from(fileList)) {
      try {
        const text = await file.text();
        combinedText += `\n\n--- FILE: ${file.name} ---\n${text}`;

        updatedFiles.push({
          file,
          progress: 0,
          done: false,
          text // ⭐ store text in each item
        });
      } catch (err) {
        console.error(err);
      }
    }

    setFiles((prev) => [...prev, ...updatedFiles]);
    onDocumentExtracted(combinedText);
  };
  const SAMPLE_FILES = [
    { name: 'BillOfLading', path: BillOfLading },
    { name: 'CommercialInvoice', path: CommercialInvoice },
    { name: 'PackingList', path: PackingList },
    { name: 'QulaityCertificate ', path: QulaityCertificate },
    { name: 'IssuanceCertificate', path: IssuanceCertificate }
  ];

  const loadSampleFiles = async () => {
    let combinedText = '';
    const sampleItems: FileItem[] = [];

    for (const sample of SAMPLE_FILES) {
      const res = await fetch(sample.path);
      const text = await res.text();

      combinedText += `\n\n--- FILE: ${sample.name} ---\n${text}`;

      const file = new File([text], sample.name, {
        type: 'text/plain'
      });

      sampleItems.push({
        file,
        progress: 0,
        done: false,
        text
      });
    }

    // Reset previous files
    setFiles(sampleItems);
    setActiveTab(0);

    // Send combined text to parent
    onDocumentExtracted(combinedText);

    // Simulate progress
    sampleItems.forEach((item) => {
      const interval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) => {
            if (f.file === item.file) {
              const next = f.progress + 10;
              return {
                ...f,
                progress: next >= 100 ? 100 : next,
                done: next >= 100
              };
            }
            return f;
          })
        );
      }, 200);

      setTimeout(() => clearInterval(interval), 2200);
    });
  };

  // ----------------------------------------------------------------------
  // Handle upload
  // ----------------------------------------------------------------------
  const handleFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    extractAllTexts(selectedFiles);

    // Fake progress animation
    Array.from(selectedFiles).forEach((file) => {
      const interval = setInterval(() => {
        setFiles((prev) =>
          prev.map((item) => {
            if (item.file === file) {
              const newProg = item.progress + 10;
              return {
                ...item,
                progress: newProg >= 100 ? 100 : newProg,
                done: newProg >= 100
              };
            }
            return item;
          })
        );
      }, 200);
    });
  };

  const removeFile = (target: FileItem) => {
    setFiles((prev) => prev.filter((f) => f !== target));
    onDocumentExtracted('');
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  // ----------------------------------------------------------------------
  // Load popup data
  // ----------------------------------------------------------------------
  const handleBrowseClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setShowDocPopup(true);
    setDocError(null);

    if (documents.length > 0) return;

    try {
      setIsLoadingDocs(true);

      const res = await fetch('/api/lc/master-documents');
      console.log("STATUS =", res.status);

      const data = await res.json();
      console.log("MASTER DOCS =", data);

      setDocuments(data);
      if (data.length > 0) setSelectedDocumentId(data[0].documentId);
    } catch (err) {
      console.error("FETCH ERROR", err);
    }
    finally {
      setIsLoadingDocs(false);
    }
  };

  const handleConfirmDocument = () => {
    setShowDocPopup(false);
    fileInputRef.current?.click();
  };

  return (
    <div id="SubLCdocuments">
      <div className="card pb-2.5 relative">
        <div className="card-header p-2 ">
          <h3 className="card-title text-md md:text-lg">SubDocument</h3>
          <button
            type="button"
            className="btn btn-primary btn-outline text-xs md:text-md"
            onClick={loadSampleFiles}
          >
            Load Sample
          </button>
        </div>

        <div className="md:card-body p-2  grid gap-5">
          <div className="w-full">
            <div className="flex items-baseline flex-wrap lg:flex-nowrap gap-2.5">
              <label className="form-label flex items-center gap-1 max-w-40 text-md">
                Sub Documents: <span className="text-danger text-xl">*</span>
              </label>

              <div className="flex flex-col gap-4 w-full">
                <div
                  className="border border-dashed border-blue-300 rounded-xl p-8 text-center cursor-pointer dark:bg-[#1F212A] bg-blue-50 hover:bg-blue-100"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDrop}
                >
                  <i className="ki-solid ki-exit-down text-3xl text-primary"></i>
                  <p className="text-lg font-semibold mt-2">Drag & Drop your Files here</p>
                  <p className="text-sm text-gray-500">OR</p>

                  <button
                    type="button"
                    className="btn btn-primary mt-2 text-md"
                    onClick={handleBrowseClick}
                  >
                    Browse Files
                  </button>

                  <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                </div>
                {error && <p className="text-danger text-xs">{error}</p>}
              </div>
            </div>
          </div>

          {files.length > 0 && (
            <div className="mt-6">
              <div className="grid">
                <div className="scrollable-x-auto">
                  <div className="tabs mb-5 " data-tabs="true">
                    <Menu highlight={true} className="gap-3">
                      {files.map((item, index) => (
                        <button
                          key={index}
                          className={`tab text-md ${activeTab === index ? 'active' : ''}`}
                          onClick={() => setActiveTab(index)}
                          data-tab-toggle={`#tab_sub_${index}`}
                        >
                          <i className="ki-solid ki-file text-md mr-2"></i>
                          {item.file.name}
                        </button>
                      ))}
                    </Menu>
                  </div>
                </div>
              </div>
              {files.map((item, index) => (
                <div
                  key={index}
                  id={`tab_sub_${index}`}
                  className={`${activeTab === index ? '' : 'hidden'} p-4 border rounded-lg`}
                >
                  <h4 className="font-semibold mb-2">{item.file.name}</h4>
                  <pre className="bg-gray-50 p-3 rounded-lg text-sm whitespace-pre-wrap dark:bg-gray-200">
                    {item.text || 'No extracted text'}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* POPUP */}
        {showDocPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
            {/* <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-4xl h-2/4 md:h-0 flex flex-col"> */}
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-4xl h-2/4 flex flex-col">

              <h2 className="text-lg font-semibold mb-4">Select Document Type</h2>

              {isLoadingDocs && <p>Loading...</p>}
              {docError && <p className="text-danger">{docError}</p>}

              <div className="flex-1 overflow-y-auto pr-2">
                {!isLoadingDocs && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2">
                    {documents.map((doc) => (
                      <label
                        key={doc.documentId}
                        className="form-label flex items-center gap-2.5 cursor-pointer p-1"
                      >
                        <input
                          type="radio"
                          className="radio"
                          name="doc"
                          checked={selectedDocumentId === doc.documentId}
                          onChange={() => setSelectedDocumentId(doc.documentId)}
                        />
                        <span className="truncate">{doc.documentName}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button className="btn btn-light" onClick={() => setShowDocPopup(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleConfirmDocument}
                  disabled={!selectedDocumentId}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubLcDocument;
