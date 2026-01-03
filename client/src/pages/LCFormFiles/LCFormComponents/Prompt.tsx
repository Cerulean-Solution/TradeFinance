// import React, { useState, useRef, useEffect } from "react";

// type PromptProps = {
//   promptText: string;
// };

// const Prompt = ({ promptText }: PromptProps) => {
//   const [expanded, setExpanded] = useState(false);
//   const textareaRef = useRef<HTMLTextAreaElement>(null);

//   // Auto resize Textarea when expanded
//   useEffect(() => {
//     if (textareaRef.current) {
//       textareaRef.current.style.height = "auto"; // reset height
//       textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"; // expand to full content
//     }
//   }, [expanded]);

//   return (
//     <div className="card pb-2.5">
//       <div className="card-header" id="prompts">
//         <h3 className="card-title text-lg">Prompts</h3>
//       </div>

//       <div className="card-body grid gap-5">
//         <div className="w-full">
//           <label className="form-label flex items-center gap-1 max-w-56 text-md mb-3">
//             Prompts:<span className="text-danger text-xl">*</span>
//           </label>

//           <textarea
//             ref={textareaRef}
//             className="textarea text-md"
//             placeholder="prompt"
//             readOnly
//             style={{
//               resize: "none",
//               overflow: "hidden", // no scroll bar
//             }}
//             value={expanded ? promptText : promptText.split("\n").slice(0, 2).join("\n")}
//             rows={expanded ? 1 : 2} // initial collapsed = 2 lines
//           />

//           <button
//             className="btn btn-sm btn-primary mt-2"
//             onClick={() => setExpanded((prev) => !prev)}
//           >
//             {expanded ? "Show Less" : "Show More"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Prompt;


import React, { useState, useRef, useEffect } from "react";

type PromptProps = {
  promptText: string;
};

const Prompt = ({ promptText }: PromptProps) => {
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lineCount = promptText.split("\n").length;

  // Auto resize textarea when expanded
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [expanded]);

  return (
    <div className="card pb-2.5">
      <div className="card-header p-2" id="prompts">
        <h3 className="card-title text-md md:text-lg">Prompts</h3>
      </div>

      <div className="md:card-body p-2 grid gap-5">
        <div className="w-full">
          <div className="flex items-baseline flex-wrap lg:flex-nowrap gap-2.5">
          <label className="form-label flex items-center gap-1 max-w-40 text-sm md:text-md ">
            Prompts:<span className="text-danger text-xl">*</span>
          </label>

          {/* TEXTAREA */}
          <textarea
            ref={textareaRef}
            className="textarea "
            placeholder="prompt"
            // readOnly
            style={{ resize: "none", overflow: "hidden" }}
            value={
              expanded
                ? promptText
                : promptText.split("\n").slice(0, 2).join("\n")
            }
            rows={expanded ? 1 : 4}
          />

          {/* ONLY SHOW BUTTON IF MORE THAN 2 LINES */}
          
          </div>
          {lineCount > 2 && (
            <div className="flex justify-end">
            <button
              className="btn btn-sm btn-primary mt-2 "
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? "Show Less" : "Show More"}
            </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Prompt;
