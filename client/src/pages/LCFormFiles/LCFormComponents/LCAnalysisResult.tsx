import React from 'react';
import MarkdownRenderer from '@/components/Common/MarkdownRender';
import RenderJsonSummary from '@/components/Common/RenderJsonSummary';
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

type LCAnalysisResultProps = {
  analysisResult: AnalysisResult | null;
  activeTab: 'mode1' | 'mode2' | 'mode3';
  setActiveTab: React.Dispatch<React.SetStateAction<'mode1' | 'mode2' | 'mode3'>>;
};

const LCAnalysisResult: React.FC<LCAnalysisResultProps> = ({
  analysisResult,
  activeTab,
  setActiveTab
}) => {
  const extractJson = (text: string) => {
    try {
      // 1️⃣ Extract JSON inside ```json ... ```
      const jsonBlock = text.match(/```json([\s\S]*?)```/);
      if (jsonBlock && jsonBlock[1]) {
        return JSON.parse(jsonBlock[1].trim());
      }

      // 2️⃣ Extract first valid JSON object anywhere in text
      const fallback = text.match(/\{[\s\S]*\}/);
      if (fallback) {
        return JSON.parse(fallback[0]);
      }

      return null; // No JSON found
    } catch (err) {
      console.error('JSON Parse Error:', err);
      return null;
    }
  };
  return (
    <>
      {analysisResult && (
        <div id='AnalysisResult' className="card mt-6 overflow-x-auto ">
          <div className="card-body">
            <div className="tabs mb-5 flex gap-3">
              <button
                className={`tab px-4 py-2 text-xl font-bold ${activeTab === 'mode1' ? 'active' : ''}`}
                onClick={() => setActiveTab('mode1')}
              >
                LC Document Result
              </button>

              <button
                className={`tab px-4 py-2 text-xl font-bold ${activeTab === 'mode2' ? 'active' : ''}`}
                onClick={() => setActiveTab('mode2')}
              >
                Cross Document Result
              </button>

              <button
                className={`tab px-4 py-2 text-xl font-bold ${activeTab === 'mode3' ? 'active' : ''}`}
                onClick={() => setActiveTab('mode3')}
              >
                Multi-Hop RAG
              </button>
            </div>
            {/* MODE 1 */}
            {activeTab === 'mode1' && (
              <div id="tab_1_1" className="space-y-6">
                {/* REQUEST */}
                <div className="card pb-2.5 mt-5">
                  <div className="card-header">
                    <h3 className="text-xl font-bold ">LLM Request</h3>
                  </div>
                  <div className="card-body">
                    <pre className="p-3 rounded border whitespace-pre-wrap text-sm ">
                      {analysisResult.mode1.request}
                    </pre>
                  </div>
                </div>

                {/* RESPONSE JSON */}
                <div className="card pb-2.5 mt-5">
                  <div className="card-header">
                    <h3 className="text-xl font-bold ">LLM Response</h3>
                  </div>
                  <div className="p-3">
                    {extractJson(analysisResult?.mode1?.response) ? (
                      <RenderJsonSummary data={extractJson(analysisResult.mode1.response)} />
                    ) : (
                      <pre className="text-red-600">⚠ No JSON found in LLM response</pre>
                    )}
                  </div>
                </div>

                {/* NARRATIVE ANALYSIS */}
                <div className="card pb-2.5 mt-5">
                  <div className="card-header">
                    <h3 className="text-xl font-bold ">Analysis Result</h3>
                  </div>
                  <div className="p-3">
                    {extractJson(analysisResult?.mode1?.response) ? (
                      <RenderJsonSummary data={extractJson(analysisResult.mode1.response)} />
                    ) : (
                      <pre className="text-red-600">⚠ No JSON found in LLM response</pre>
                    )}
                  </div>
                </div>
                <div className="card pb-2.5 mt-5">
                  <div className="card-header" id="LCDocument">
                    <h3 className="card-title text-lg">Total Tokens</h3>
                  </div>
                  <div className="card-body grid gap-5">
                    <div className="w-full">
                      <div className="flex items-baseline flex-wrap lg:flex-nowrap gap-2.5">
                        <div className="flex flex-col gap-2.5">
                          <h4 className="font-semibold mb-2">
                            LLM Request Tokens:{' '}
                            <span className="text-gray-500">
                              {analysisResult.mode1.tokens?.prompt_tokens}
                            </span>
                          </h4>
                          <h4 className="font-semibold mb-2">
                            LLM Response Tokens:{' '}
                            <span className="text-gray-500">
                              {analysisResult.mode1.tokens?.completion_tokens}
                            </span>
                          </h4>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MODE 2 */}
            {activeTab === 'mode2' && (
              <div id="tab_1_2">
                <div className="card pb-2.5 mt-5">
                  <div className="card-header" id="LCDocument">
                    <h3 className="card-title text-lg">LLM Request</h3>
                  </div>
                  {/* BODY */}
                  <div className="card-body ">
                    <h4 className="font-semibold mb-2"></h4>
                    <pre className="p-3 rounded border whitespace-pre-wrap text-sm ">
                      {' '}
                      {analysisResult.mode2.request}
                    </pre>
                  </div>
                </div>
                <div className="card pb-2.5 mt-5">
                  <div className="card-header" id="LCDocument">
                    <h3 className="card-title text-lg">LLM Response</h3>
                  </div>
                  {/* BODY */}
                  <div className="card-body grid gap-5">
                    <div className="w-full">
                      <div className="flex items-baseline flex-wrap lg:flex-nowrap gap-2.5">
                        <div className="flex flex-col gap-2.5">
                          <MarkdownRenderer content={analysisResult.mode2.response} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card pb-2.5 mt-5">
                  <div className="card-header" id="LCDocument">
                    <h3 className="card-title text-lg">Analysis Result</h3>
                  </div>
                  {/* BODY */}
                  <div className="card-body grid gap-5">
                    <div className="w-full">
                      <div className="flex items-baseline flex-wrap lg:flex-nowrap gap-2.5">
                        <div className="flex flex-col gap-2.5">
                          <h4 className="font-semibold mt-4 mb-2">Analysis</h4>
                          <MarkdownRenderer content={analysisResult.mode2.analysis} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card pb-2.5 mt-5">
                  <div className="card-header" id="LCDocument">
                    <h3 className="card-title text-lg">Total Tokens</h3>
                  </div>
                  {/* BODY */}
                  <div className="card-body grid gap-5">
                    <div className="w-full">
                      <div className="flex items-baseline flex-wrap lg:flex-nowrap gap-2.5">
                        <div className="flex flex-col gap-2.5">
                          <h4 className="font-semibold mb-2">
                            LLM Request Tokens:{' '}
                            <span className="text-gray-500">
                              {analysisResult.mode2.tokens?.prompt_tokens}
                            </span>
                          </h4>
                          <h4 className="font-semibold mb-2">
                            LLM Response Tokens:{' '}
                            <span className="text-gray-500">
                              {analysisResult.mode2.tokens?.completion_tokens}
                            </span>
                          </h4>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MODE 3 */}
            {activeTab === 'mode3' && (
              <div id="tab_1_3">
                {/* <h4 className="font-semibold mb-2">LLM Request</h4>
                    <pre className="bg-light p-3 rounded">{analysisResult.mode3.request}</pre> */}
                <div className="card pb-2.5 mt-5">
                  <div className="card-header" id="LLMRequest">
                    <h3 className="text-xl font-bold ">LLM Request</h3>
                  </div>

                  <div className="card-body">
                    {/* Styled pre-formatted output */}
                    <pre className="p-3 rounded border whitespace-pre-wrap text-sm ">
                      {analysisResult.mode3?.request || 'No LLM Request available'}
                    </pre>
                  </div>
                </div>

                <div className="card pb-2.5 mt-5">
                  <div className="card-header" id="LCDocument">
                    <h3 className="card-title text-lg">LLM Response</h3>
                  </div>
                  {/* BODY */}
                  <div className="card-body grid gap-5">
                    <div className="w-full">
                      <div className="flex items-baseline flex-wrap lg:flex-nowrap gap-2.5">
                        <div className="flex flex-col gap-2.5">
                          <MarkdownRenderer content={analysisResult.mode3.response} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card pb-2.5 mt-5">
                  <div className="card-header" id="LCDocument">
                    <h3 className="card-title text-lg">Analysis Result</h3>
                  </div>
                  {/* BODY */}
                  <div className="card-body grid gap-5">
                    <div className="w-full">
                      <div className="flex items-baseline flex-wrap lg:flex-nowrap gap-2.5">
                        <div className="flex flex-col gap-2.5">
                          <h4 className="font-semibold mt-4 mb-2">Analysis</h4>
                          <MarkdownRenderer content={analysisResult.mode3.analysis} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card pb-2.5 mt-5">
                  <div className="card-header" id="LCDocument">
                    <h3 className="card-title text-lg">Total Tokens</h3>
                  </div>
                  {/* BODY */}
                  <div className="card-body grid gap-5">
                    <div className="w-full">
                      <div className="flex items-baseline flex-wrap lg:flex-nowrap gap-2.5">
                        <div className="flex flex-col gap-2.5">
                          <h4 className="font-semibold mb-2">
                            LLM Request Tokens:{' '}
                            <span className="text-gray-500">
                              {analysisResult.mode3.tokens?.prompt_tokens}
                            </span>
                          </h4>
                          <h4 className="font-semibold mb-2">
                            LLM Response Tokens:{' '}
                            <span className="text-gray-500">
                              {analysisResult.mode3.tokens?.completion_tokens}
                            </span>
                          </h4>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default LCAnalysisResult;
