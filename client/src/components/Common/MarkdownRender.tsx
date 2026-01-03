// import React from 'react';
// import ReactMarkdown from 'react-markdown';
// import remarkGfm from 'remark-gfm';

// type MarkdownRendererProps = {
//   content: string;
// };

// const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
//   if (!content) return null;

//   return (
//     <ReactMarkdown
//       remarkPlugins={[remarkGfm]}
//       components={{
//         // HEADINGS — NO BOLD, NO ITALIC
//         h1: ({ children }) => (
//           <h1 className="text-2xl text-gray-900 mb-4 font-normal font-semibold not-italic normal-case">
//             {children}
//           </h1>
//         ),
//         h2: ({ children }) => (
//           <h2 className="text-xl text-gray-800  mb-2 font-semibold pb-1 font-normal not-italic normal-case">
//             {children}
//           </h2>
//         ),
//         h3: ({ children }) => (
//           <h3 className="text-lg text-gray-700 mb-2 font-semibold font-normal not-italic normal-case">
//             {children}
//           </h3>
//         ),
//         h4: ({ children }) => (
//           <h4 className="text-md text-gray-700 mb-2 font-normal not-italic normal-case">
//             {children}
//           </h4>
//         ),

//         // PARAGRAPH — NORMAL TEXT
//         p: ({ children }) => (
//           <p className="mb-3 text-gray-700 leading-relaxed font-normal not-italic normal-case">
//             {children}
//           </p>
//         ),

//         // STRONG — REMOVE BOLD
//         strong: ({ children }) => (
//           <span className="font-normal not-italic normal-case font-semibold ">{children}</span>
//         ),

//         // EM (ITALIC) — REMOVE ITALIC
//         em: ({ children }) => (
//           <span className="font-normal not-italic normal-case">{children}</span>
//         ),

//         // LISTS — NO BOLD, NO SPECIAL STYLE
//         ul: ({ children }) => (
//           <ul className="ml-5 text-gray-700 mb-3 space-y-1 font-normal not-italic normal-case list-disc">
//             {children}
//           </ul>
//         ),
//         ol: ({ children }) => (
//           <ol className="ml-5 text-gray-700 mb-3 space-y-1 font-normal not-italic normal-case list-decimal">
//             {children}
//           </ol>
//         ),
//         li: ({ children }) => (
//           <li className="text-gray-700 leading-relaxed font-normal not-italic normal-case">
//             {children}
//           </li>
//         ),

//         // TABLE — REMOVE BOLD & ITALIC
//     table: ({ children }) => (
//       <div className="card min-w-full font-normal not-italic normal-case">
//         <div className="card-table">
//           <table className="table align-middle text-gray-700 text-md font-normal not-italic">
//             {children}
//           </table>
//         </div>
//       </div>
//     ),
//     th: ({ children }) => (
//       <th className="font-normal not-italic normal-case text-left">{children}</th>
//     ),
//     td: ({ children }) => <td className="font-normal not-italic normal-case">{children}</td>
//   }}
// >
//       {content}
//     </ReactMarkdown>
//   );
// };

// export default MarkdownRenderer;

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type MarkdownRendererProps = {
  content: string;
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // HEADINGS — clean, no bold/italic
        h1: ({ children }) => (
          <h1 className="text-2xl text-gray-900 mb-3 font-bold">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl text-gray-700 mb-2 font-bold mt-3">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg text-blue-500 mb-2 font-bold">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-lg text-blue-500 font-bold">{children}</h4>
        ),

        // PARAGRAPH
        p: ({ children }) => (
          <p className="text-gray-700 leading-relaxed mb-2">{children}</p>
        ),

        // STRONG → remove bold completely
        strong: ({ children }) => <span className="text-gray-800 font-semibold ml-5">{children}</span>,

        // EM → remove italic
        em: ({ children }) => <span className="not-italic">{children}</span>,

        // LISTS
        ul: ({ children }) => (
          <ul className="ml-8 list-disc text-gray-500 mb-2 font-bold space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="ml-10 list-decimal text-gray-700 mb-2 font-normal space-y-1 ">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed text-gray-500 ml-3 font-bold">{children}</li>,

        // TABLES — clean table look
        table: ({ children }) => (
          <div className="card min-w-full not-italic">
            <div className="card-table">
              <table className="table align-middle text-gray-700 text-md not-italic">
                {children}
              </table>
            </div>
          </div>
        ),
        th: ({ children }) => (
          <th className="not-italic text-left h-12">{children}</th>
        ),
        td: ({ children }) => <td className="not-italic">{children}</td>
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;
