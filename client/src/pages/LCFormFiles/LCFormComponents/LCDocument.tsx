
import React, { useState, useRef } from 'react';
import lcSample from '../TextFiles/LC.txt';

type FileItem = {
  file: File;
  done: boolean;
  text: string;
};

type LCDocumentProps = {
  onDocumentExtracted: (text: string) => void; // ⭐ NEW PROP
  error?: string;
};

const LCDocument = ({ onDocumentExtracted, error }: LCDocumentProps) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'get' | 'scan'>('upload');
  const [files, setFiles] = useState<FileItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const hasFile = files.length > 0;
  const MIN_SPINNER_TIME = 3000;

  const withMinimumDelay = async (promise: Promise<void>) => {
    const start = Date.now();
    await promise;
    const elapsed = Date.now() - start;
    if (elapsed < MIN_SPINNER_TIME) {
      await new Promise((res) => setTimeout(res, MIN_SPINNER_TIME - elapsed));
    }
  };

  // Handle file upload
  const handleFiles = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || hasFile) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const file = selectedFiles[0];
    setIsUploading(true);

    try {
      await withMinimumDelay(
        (async () => {
          const text = await file.text();
          onDocumentExtracted(text);

          setFiles([
            {
              file,
              done: true,
              text
            }
          ]);
        })()
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setFiles([]);
    onDocumentExtracted('');
    setIsUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const loadSample = async () => {
    if (hasFile) return;

    setActiveTab('upload');
    setIsUploading(true);

    try {
      await withMinimumDelay(
        (async () => {
          const response = await fetch(lcSample);
          const text = await response.text();

          onDocumentExtracted(text);

          const file = new File([text], 'LC.txt', { type: 'text/plain' });

          setFiles([
            {
              file,
              done: true,
              text
            }
          ]);
        })()
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="card pb-2.5" id="LCDocument">
      <div className="card-header p-2" >
        <h3 className="card-title text-md md:text-lg">LC Document</h3>

        {/* Tabs */}
        <div className="gap-4 flex">
          <button
            type="button"
            className="btn btn-primary btn-outline text-xs md:text-md"
            onClick={loadSample}
          >
            Load Sample
          </button>
          {/* <button
            className={`btn btn-outline text-md ${
              activeTab === 'upload' ? 'btn-primary' : 'btn-secondary'
            }`}
            onClick={() => setActiveTab('upload')}
          >
            Upload
          </button> */}

          {/* <button
            className={`btn btn-outline text-md ${
              activeTab === 'get' ? 'btn-primary' : 'btn-secondary'
            }`}
            onClick={() => setActiveTab('get')}
          >
            Get
          </button> */}

          {/* <button
            className={`btn btn-outline text-md ${
              activeTab === 'scan' ? 'btn-primary' : 'btn-secondary'
            }`}
            onClick={() => setActiveTab('scan')}
          >
            Scan
          </button> */}
        </div>
      </div>

      {/* BODY */}
      <div className="md:card-body p-2  grid gap-5">
        <div className="w-full">
          {/* <div className="flex items-baseline flex-wrap lg:flex-nowrap gap-2.5"> */}
          <div className="flex items-baseline flex-wrap lg:flex-nowrap gap-2.5">
            <label className="form-label flex items-center gap-1 max-w-40 text-md">
              LC Document:<span className="text-danger text-xl">*</span>
            </label>
            {/* {activeTab === 'upload' && ( */}
              <div className="flex flex-col gap-4 w-full">
                {/* 🔥 SHOW UPLOAD AREA ONLY IF NO FILE */}
                {!hasFile && (
                  <div className="border border-dashed border-blue-300 rounded-xl p-8 text-center bg-blue-50 dark:bg-[#1F212A]">
                    {isUploading ? (
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
                        <p className="text-sm font-semibold text-primary">
                          Uploading LC Document...
                        </p>
                      </div>
                    ) : (
                      <>
                        <div
                          className="cursor-pointer"
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={onDrop}
                        >
                          <i className="ki-solid ki-exit-down text-3xl text-primary"></i>
                          <p className="text-lg font-semibold mt-2">Drag & Drop your Files here</p>
                          <p className="text-sm text-gray-500">OR</p>

                          <button type="button" className="btn btn-primary mt-2 text-md">
                            Browse Files
                          </button>
                        </div>

                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={(e) => handleFiles(e.target.files)}
                          className="hidden"
                        />
                      </>
                    )}
                  </div>
                )}

                {/* 🔥 SHOW UPLOADED FILE UI ONLY IF FILE EXISTS */}
                {hasFile && (
                  <div className="flex flex-col gap-3 mt-2">
                    <h3 className="text-md font-semibold">Uploaded LC Document</h3>

                    {files.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center bg-white p-3 rounded-lg shadow-md border dark:bg-[#1F212A]"
                      >
                        <div className="flex-1 ml-4">
                          <div className="flex justify-between">
                            {/* <span className="font-medium">{item.file.name}</span> */}

                            {item.done && item.text && (
                              <div className=" w-full">
                                <div className="flex justify-between">
                                  <h4 className="text-lg font-bold mb-2">{item.file.name}</h4>
                                  <button
                                    type="button"
                                    onClick={removeFile}
                                    className="ml-4 text-danger"
                                  >
                                    <i className="ki-solid ki-cross text-lg"></i>
                                  </button>
                                </div>

                                <pre className="bg-gray-50 dark:bg-gray-200 p-4 rounded-lg text-sm  whitespace-pre-wrap border-gray-200">
                                  {item.text}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            {/* )} */}

            {/* GET MODE */}
            {activeTab === 'get' && (
              <textarea
                className="textarea"
                rows={6}
                placeholder="Get LC Document from system..."
                onChange={(e) => onDocumentExtracted(e.target.value)}
              />
            )}

            {/* SCAN MODE */}
            {activeTab === 'scan' && (
              <textarea
                className="textarea"
                rows={6}
                placeholder="Scan LC Document..."
                onChange={(e) => onDocumentExtracted(e.target.value)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LCDocument;
