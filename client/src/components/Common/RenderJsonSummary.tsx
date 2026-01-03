import React from 'react';

type Props = {
  data: any;
};

const RenderJsonSummary: React.FC<Props> = ({ data }) => {
  if (!data || typeof data !== 'object') return null;

  const { document_examined, lc_number, total_issues_found, discrepancies, summary_statistics } =
    data;

  return (
    <>
      {/* HEADER SUMMARY */}
      <div className="p-4 ">
        <h2 className="text-xl font-bold mb-2 text-primary ">Document Summary</h2>
        <p className="mb-2 text-md text-gray-950">
          <span className=" font-bold text-lg">Document Examined:</span> {document_examined}
        </p>
        <p className="mb-2 text-md text-gray-950">
          <span className="font-bold text-lg">LC Number:</span> {lc_number}
        </p>
        <p className="mb-2 text-md text-gray-950">
          <span className="font-bold text-lg">Total Issues Found:</span> {total_issues_found}
        </p>
      </div>
      {/* DISCREPANCY TABLE */}
      <div className="p-4 pt-0">
        <h2 className="text-xl font-bold mb-2 text-primary">Discrepancies</h2>
        {/* ⭐ Metronic scroll wrapper */}
        <div className="card min-w-full">
          <div className="card-table scrollable-x-auto">
            <table className="table min-w-full table-auto align-middle text-sm">
              <thead className="">
                <tr className="text-left">
                  <th className="px-3 py-2">Discrepancy ID</th>
                  <th className="px-3 py-2">Discrepancy Title</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Severity</th>
                  <th className="px-3 py-2">Source Ref</th>
                  <th className="px-3 py-2">Evidence</th>
                  <th className="px-3 py-2">Remediation</th>
                  <th className="px-3 py-2">Governing Rule</th>
                </tr>
              </thead>

              <tbody>
                {discrepancies?.map((d: any, i: number) => (
                  <tr
                    key={i}
                    className={`text-left ${i % 2 === 0 ? '' : 'bg-gray-100'} hover:bg-gray-100`}
                  >
                    <td className="px-3 py-3">{d.discrepancy_id}</td>
                    <td className="px-3 py-3">{d.discrepancy_title}</td>
                    <td className="px-3 py-3">{d.discrepancy_type}</td>
                    <td className="px-3 py-3">{d.severity_level}</td>
                    <td className="px-3 py-3">{d.source_reference}</td>

                    {/* Evidence */}
                    <td className="px-3 py-3">
                      <ul className="m-0 ps-4">
                        {Object.entries(d.evidence || {}).map(([key, value]) => (
                          <li key={key}>
                            <strong>{key}: </strong>
                            {String(value)}
                          </li>
                        ))}
                      </ul>
                    </td>

                    <td className="px-3 py-3">{d.remediation}</td>
                    <td className="px-3 py-3">{d.governing_rule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 🔥 NEW SECTION — FULL DETAILED ISSUE BREAKDOWN */}
      {discrepancies && discrepancies.length > 0 && (
        <div className="p-4">
          {discrepancies.map((d: any, index: number) => (
            <div key={index} className="">
              {/* ISSUE TITLE */}
              <h2 className="text-xl font-bold text-primary mb-4">ISSUE {index + 1}</h2>

              <div className="space-y-3 text-gray-800 leading-relaxed mb-4">
                <p>
                  <strong>Discrepancy ID:</strong> {d.discrepancy_id}
                </p>
                <p>
                  <strong>Discrepancy Title:</strong> {d.discrepancy_title}
                </p>
                <p>
                  <strong>Validation Rule:</strong> {d.validation_rule}
                </p>
                <p>
                  <strong>Discrepancy Type:</strong> {d.discrepancy_type}
                </p>
                <p>
                  <strong>Severity Level:</strong> {d.severity_level}
                </p>
                <p>
                  <strong>Source Reference:</strong> {d.source_reference}
                </p>

                {/* Evidence List */}
                {d.evidence && (
                  <div>
                    <strong>Evidence:</strong>
                    <ul className="list-disc ml-6">
                      {Object.entries(d.evidence).map(([k, v]: any) => (
                        <li key={k}>
                          <strong>{k}:</strong> {v}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p>
                  <strong>The Contradiction/Issue:</strong> {d.contradiction_issue}
                </p>
                <p>
                  <strong>Why This Is Problematic:</strong> {d.why_problematic}
                </p>
                <p>
                  <strong>Impact:</strong> {d.impact}
                </p>
                <p>
                  <strong>Remediation:</strong> {d.remediation}
                </p>
                <p>
                  <strong>Governing Rule:</strong> {d.governing_rule}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* SUMMARY STATISTICS */}
      {summary_statistics && (
        <div className="p-4 pt-0">
          <h2 className="text-xl text-primary font-bold mb-2">Summary Statistics</h2>

          <p>
            <strong>Critical Issues:</strong> {summary_statistics.critical_issues}
          </p>
          <p>
            <strong>High Issues:</strong> {summary_statistics.high_issues}
          </p>
          <p>
            <strong>Medium Issues:</strong> {summary_statistics.medium_issues}
          </p>
          <p>
            <strong>Low Issues:</strong> {summary_statistics.low_issues}
          </p>
        </div>
      )}
    </>
  );
};

export default RenderJsonSummary;
