// //client/src/pages/FrameworkFiles/promptscreen/CreatePrompt.tsx

// import { useNavigate, useParams, useLocation } from "react-router-dom";
// import { useEffect, useState } from "react";
// import { Toaster, toast } from "sonner";

// const emptyForm = {
//   module_name: "",
//   instrument_type: "",
//   lifecycle_stage: "",
//   analysis_mode: "",
//   prompt_text: "",
//   description: "",
//   version: "",
//   version_desc: "",   // ⬅ ADD THIS
//   is_active: "active",   // default
// };


// export default function CreatePrompt({ inheritMode = false, viewMode = false }) {
//   const navigate = useNavigate();
//   const { id } = useParams();

//   // 3 MODES
//   // const isEdit = Boolean(id) && !inheritMode;
//   // const isInheritance = Boolean(id) && inheritMode;

//   const [form, setForm] = useState(emptyForm);
//   const [loading, setLoading] = useState(false);

//   const [instrumentTypes, setInstrumentTypes] = useState<string[]>([]);
//   const [lifecycleStages, setLifecycleStages] = useState<string[]>([]);

//   // const isCreate = !id && !inheritMode;

//   // 3 MODES
//   const isView = viewMode;
//   const isEdit = Boolean(id) && !inheritMode && !isView;
//   const isInheritance = Boolean(id) && inheritMode;
//   const isCreate = !id && !inheritMode && !isView;





//   // -----------------------------------------------------
//   // ⭐ FETCH DATA (Edit + Inheritance)
//   // -----------------------------------------------------
//   useEffect(() => {
//     if (!id) return;

//     const fetchPrompt = async () => {
//       try {
//         setLoading(true);
//         const res = await fetch(`http://localhost:5000/api/prompts/${id}`);
//         if (!res.ok) throw new Error("Failed to fetch prompt data");

//         const data = await res.json();

//         setForm({
//           module_name: data.module_name,
//           instrument_type: data.instrument_type,
//           lifecycle_stage: data.lifecycle_stage,
//           analysis_mode: data.analysis_mode,
//           prompt_text: data.prompt_text,
//           description: data.description,
//           version: data.version,
//           version_desc: data.version_desc ?? "",
//           is_active: isInheritance
//             ? "active"
//             : data.is_active
//               ? "active"
//               : "inactive",
//         });
//       } catch (err: any) {
//         toast.error(`Error fetching prompt: ${err.message}`);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchPrompt();
//   }, [id, inheritMode]);

//   // -----------------------------------------------------
//   // ⭐ FETCH DROPDOWN DATA
//   // -----------------------------------------------------
//   useEffect(() => {
//     const fetchDropdowns = async () => {
//       try {
//         const [instrumentsRes, stagesRes] = await Promise.all([

//           fetch("http://localhost:5000/api/prompts/instrument-types"),
//           fetch("http://localhost:5000/api/prompts/lifecycle-stages"),
//         ]);

//         if (!instrumentsRes.ok || !stagesRes.ok) {
//           throw new Error("Failed to fetch dropdown data");
//         }


//         const instrumentsData = await instrumentsRes.json();
//         const stagesData = await stagesRes.json();


//         setInstrumentTypes(instrumentsData);
//         setLifecycleStages(stagesData);
//       } catch (err: any) {
//         toast.error(`Dropdown fetch error: ${err.message}`);
//       }
//     };

//     fetchDropdowns();
//   }, []);

//   // -----------------------------------------------------
//   // ⭐ HANDLE INPUT CHANGE
//   // -----------------------------------------------------
//   const handleChange = (key: string, val: string) => {
//     setForm((prev) => ({ ...prev, [key]: val }));
//   };

//   // -----------------------------------------------------
//   // ⭐ HANDLE SUBMIT
//   // -----------------------------------------------------
//   // const handleSubmit = async () => {
//   //   const payload = {
//   //     ...form,
//   //     version_desc: form.version_desc,
//   //     is_active: isCreate ? true : form.is_active === "active",
//   //   };

//   //   let method = "POST";
//   //   let url = "http://localhost:5000/api/prompts";

//   //   if (isEdit) {
//   //     method = "PUT";
//   //     url = `http://localhost:5000/api/prompts/${id}`;
//   //   }

//   //   if (isInheritance) {
//   //     method = "POST";
//   //     url = `http://localhost:5000/api/prompts/inherit/${id}`;
//   //   }

//   //   const res = await fetch(url, {
//   //     method,
//   //     headers: { "Content-Type": "application/json" },
//   //     body: JSON.stringify(payload),
//   //   });

//   //   if (res.ok) {
//   //     toast.success(
//   //       isEdit
//   //         ? "Prompt updated successfully 🎉"
//   //         : isInheritance
//   //         ? "New inherited prompt created 🎉"
//   //         : "Prompt created successfully 🎉"
//   //     );
//   //     setTimeout(() => navigate("/framework/prompt-management"), 1000);
//   //   } else {
//   //     toast.error("Failed, try again ❌");
//   //   }
//   // };

//   const handleSubmit = async () => {
//     try {
//       if (isCreate) {
//         if (
//           !form.module_name.trim() ||
//           !form.instrument_type.trim() ||
//           !form.lifecycle_stage.trim() ||
//           !form.analysis_mode.trim() ||
//           !form.prompt_text.trim() ||
//           !form.version.trim() ||
//           !form.version_desc.trim()
//         ) {
//           toast.error(
//             "Please fill all required fields ❌ (Description is optional)"
//           );
//           return;
//         }
//       }

//       const payload = {
//         ...form,
//         version_desc: form.version_desc,
//         is_active: isCreate ? true : form.is_active === "active",
//       };

//       let method = "POST";
//       let url = "http://localhost:5000/api/prompts";

//       if (isEdit) {
//         method = "PUT";
//         url = `http://localhost:5000/api/prompts/${id}`;
//       }

//       if (isInheritance) {
//         method = "POST";
//         url = `http://localhost:5000/api/prompts/inherit/${id}`;
//       }

//       const res = await fetch(url, {
//         method,
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) throw new Error("Failed to save prompt");

//       toast.success(
//         isEdit
//           ? "Prompt updated successfully 🎉"
//           : isInheritance
//             ? "New inherited prompt created 🎉"
//             : "Prompt created successfully 🎉"
//       );

//       setTimeout(() => navigate("/framework/prompt-management"), 500);
//     } catch (err: any) {
//       toast.error(err.message || "Something went wrong ❌");
//     }
//   };


//   const autoGrow = (e: any) => {
//     e.target.style.height = "auto";
//     e.target.style.height = e.target.scrollHeight + "px";
//   };


//   return (
//     <div className="p-6 space-y-6">
//       {/* Back Button */}
//       <button
//         className="text-primary mb-4 flex items-center gap-2 hover:underline"
//         onClick={() => navigate(-1)}
//       >
//         ← Back
//       </button>

//       <h1 className="text-2xl font-bold text-primary">
//         {isEdit
//           ? "Edit Prompt"
//           : isInheritance
//             ? "Inherit Prompt"
//             : "Create New Prompt"}
//       </h1>

//       {loading ? (
//         <div className="text-lg font-semibold text-gray-500">Loading...</div>
//       ) : (
//         <div className="card p-6 space-y-6">
//           <FormRow>
//             <Input
//               label="Module Name "
//               value={form.module_name}
//               onChange={(e: any) => handleChange("module_name", e.target.value)}
//               placeholder="Ex: Instrument"
//               disabled={isEdit}
//             />

//             <Select
//               label="Instrument Type"
//               value={form.instrument_type}
//               onChange={(e: any) => handleChange("instrument_type", e.target.value)}
//               disabled={isEdit}
//             >
//               <option value="">Select Instrument</option>
//               {instrumentTypes.map((i) => (
//                 <option key={i} value={i}>{i}</option>
//               ))}
//             </Select>

//             <Select
//               label="Lifecycle Stage"
//               value={form.lifecycle_stage}
//               onChange={(e: any) => handleChange("lifecycle_stage", e.target.value)}
//               disabled={isEdit}
//             >
//               <option value="">Select Stage</option>

//               {/* Ensure the existing value is included even if not in fetched list */}
//               {form.lifecycle_stage && !lifecycleStages.includes(form.lifecycle_stage) && (
//                 <option key={form.lifecycle_stage} value={form.lifecycle_stage}>
//                   {form.lifecycle_stage}
//                 </option>
//               )}

//               {lifecycleStages.map((s) => (
//                 <option key={s} value={s}>{s}</option>
//               ))}
//             </Select>

//           </FormRow>


//           <FormRow>
//             <Input
//               label="Analysis Mode "
//               value={form.analysis_mode}
//               onChange={(e: any) => handleChange("analysis_mode", e.target.value)}
//               placeholder="Ex: Model1 / Model2"
//             // disabled={isEdit}
//             />
//             <Input
//               label="Version "
//               value={form.version}
//               onChange={(e: any) => handleChange("version", e.target.value)}
//               placeholder="Ex: 1.0 / 1.1 / 2.0"
//             />

//             {!isCreate && (
//               <Select
//                 label="Status "
//                 value={form.is_active}
//                 onChange={(e: any) => handleChange("is_active", e.target.value)}
//               >
//                 <option value="active">Active</option>
//                 <option value="inactive">Inactive</option>
//               </Select>
//             )}


//             <Input
//               label="Version Description"
//               value={form.version_desc}
//               onChange={(e: any) => handleChange("version_desc", e.target.value)}
//               placeholder="Explain what changed in this version..."
//             />

//           </FormRow>

//           <TextArea
//             label="Prompt Text "
//             value={form.prompt_text}
//             onChange={(e: any) => handleChange("prompt_text", e.target.value)}
//             onInput={(e: any) => autoGrow(e)}   // ⬅️ add this line
//             placeholder="Write the AI prompt instructions here..."
//           />

//           <TextArea
//             label="Description "
//             value={form.description}
//             onChange={(e: any) => handleChange("description", e.target.value)}
//             placeholder="Explain what this prompt does..."
//           />

//           <button
//             className="btn btn-primary w-36 flex justify-center text-center"
//             onClick={() => {
//               handleSubmit();
//             }}
//           >
//             {isEdit
//               ? "Update Prompt"
//               : isInheritance
//                 ? "Inherit Prompt"
//                 : "Create Prompt"}
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }

// /* ---------------------------------------------------
//    ⭐ REUSABLE UI COMPONENTS
// --------------------------------------------------- */

// function FormRow({ children }: any) {
//   return <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{children}</div>;
// }

// function Input({ label, value, onChange, placeholder, disabled = false }: any) {
//   return (
//     <div className="flex flex-col gap-2">
//       <label className="form-label text-md">{label} <span className='text-danger text-xl'> *</span></label>
//       <input
//         className="input"
//         value={value}
//         onChange={onChange}
//         placeholder={placeholder}
//         disabled={disabled }
//       />
//     </div>
//   );
// }

// function TextArea({ label, value, onChange, placeholder }: any) {
//   return (
//     <div className="flex flex-col gap-2">
//       <label className="form-label text-md">{label} <span className='text-danger text-xl'>*</span></label>
//       <textarea
//         className="input min-h-96"
//         value={value}
//         onChange={onChange}
//         placeholder={placeholder}
//       />
//     </div>
//   );
// }

// function Select({ label, value, children, onChange, disabled = false }: any) {
//   return (
//     <div className="flex flex-col gap-2">
//       <label className="form-label text-md">{label} <span className='text-danger text-xl'>*</span></label>
//       <select className="input" value={value} onChange={onChange} disabled={disabled}>
//         {children}
//       </select>
//     </div>
//   );
// }


// client/src/pages/FrameworkFiles/promptscreen/CreatePrompt.tsx

import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";

const emptyForm = {
  module_name: "",
  instrument_type: "",
  lifecycle_stage: "",
  analysis_mode: "",
  prompt_text: "",
  description: "",
  version: "",
  version_desc: "",
  is_active: "active",
};

export default function CreatePrompt({ inheritMode = false, viewMode = false }) {
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const [instrumentTypes, setInstrumentTypes] = useState<string[]>([]);
  const [lifecycleStages, setLifecycleStages] = useState<string[]>([]);

  // MODE CHECKS
  const isView = viewMode;
  const isEdit = Boolean(id) && !inheritMode && !isView;
  const isInheritance = Boolean(id) && inheritMode;
  const isCreate = !id && !inheritMode && !isView;

  //  PUT THE DISABLE VARIABLES HERE
  const disableModuleFields = isView || isEdit;  // Module Name, Instrument Type, Lifecycle Stage
  const disableEditableFields = isView;

  // -----------------------------------------------------
  // FETCH PROMPT DATA (Edit + Inheritance + View)
  // -----------------------------------------------------
  useEffect(() => {
    if (!id) return;

    const fetchPrompt = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:5000/api/prompts/${id}`);
        if (!res.ok) throw new Error("Failed to fetch prompt data");

        const data = await res.json();

        setForm({
          module_name: data.module_name,
          instrument_type: data.instrument_type,
          lifecycle_stage: data.lifecycle_stage,
          analysis_mode: data.analysis_mode,
          prompt_text: data.prompt_text,
          description: data.description,
          version: data.version,
          version_desc: data.version_desc ?? "",
          is_active: isInheritance
            ? "active"
            : data.is_active
              ? "active"
              : "inactive",
        });
      } catch (err: any) {
        toast.error(`Error fetching prompt: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPrompt();
  }, [id, inheritMode]);

  // -----------------------------------------------------
  // FETCH DROPDOWN DATA
  // -----------------------------------------------------
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [instrumentsRes, stagesRes] = await Promise.all([
          fetch("http://localhost:5000/api/prompts/instrument-types"),
          fetch("http://localhost:5000/api/prompts/lifecycle-stages"),
        ]);

        if (!instrumentsRes.ok || !stagesRes.ok) {
          throw new Error("Failed to fetch dropdown data");
        }

        const instrumentsData = await instrumentsRes.json();
        const stagesData = await stagesRes.json();

        setInstrumentTypes(instrumentsData);
        setLifecycleStages(stagesData);
      } catch (err: any) {
        toast.error(`Dropdown fetch error: ${err.message}`);
      }
    };

    fetchDropdowns();
  }, []);

  // -----------------------------------------------------
  // HANDLE INPUT CHANGE
  // -----------------------------------------------------
  const handleChange = (key: string, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  // -----------------------------------------------------
  // HANDLE SUBMIT
  // -----------------------------------------------------
  const handleSubmit = async () => {
    try {
      if (isCreate) {
        if (
          !form.module_name.trim() ||
          !form.instrument_type.trim() ||
          !form.lifecycle_stage.trim() ||
          !form.analysis_mode.trim() ||
          !form.prompt_text.trim() ||
          !form.version.trim() ||
          !form.version_desc.trim()
        ) {
          toast.error(
            "Please fill all required fields ❌ (Description is optional)"
          );
          return;
        }
      }

      const payload = {
        ...form,
        version_desc: form.version_desc,
        is_active: isCreate ? true : form.is_active === "active",
      };

      let method = "POST";
      let url = "http://localhost:5000/api/prompts";

      if (isEdit) {
        method = "PUT";
        url = `http://localhost:5000/api/prompts/${id}`;
      }

      if (isInheritance) {
        method = "POST";
        url = `http://localhost:5000/api/prompts/inherit/${id}`;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save prompt");

      toast.success(
        isEdit
          ? "Prompt updated successfully 🎉"
          : isInheritance
            ? "New inherited prompt created 🎉"
            : "Prompt created successfully 🎉"
      );

      setTimeout(() => navigate("/framework/prompt-management"), 500);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong ❌");
    }
  };

  // -----------------------------------------------------
  // AUTO GROW TEXTAREA
  // -----------------------------------------------------
  const autoGrow = (e: any) => {
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  // -----------------------------------------------------
  // RENDER
  // -----------------------------------------------------
  return (
    <div className="p-6 space-y-6">
      <Toaster />
      <button
        className="text-primary mb-4 flex items-center gap-2 hover:underline"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold text-primary">
        {isView
          ? "View Prompt"
          : isEdit
            ? "Edit Prompt"
            : isInheritance
              ? "Inherit Prompt"
              : "Create New Prompt"}
      </h1>

      {loading ? (
        <div className="text-lg font-semibold text-gray-500">Loading...</div>
      ) : (
        <div className="card p-6 space-y-6">
          <FormRow>
            <Input
              label="Module Name"
              value={form.module_name}
              onChange={(e: any) => handleChange("module_name", e.target.value)}
              placeholder="Ex: Instrument"
              disabled={disableModuleFields} // ❌ not editable in edit & view
              bold={isView}
            />

            <Select
              label="Instrument Type"
              value={form.instrument_type}
              onChange={(e: any) => handleChange("instrument_type", e.target.value)}
              disabled={disableModuleFields} // ❌ not editable in edit & view
              bold={isView}
            >
              <option value="">Select Instrument</option>
              {instrumentTypes.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </Select>

            <Select
              label="Lifecycle Stage"
              value={form.lifecycle_stage}
              onChange={(e: any) => handleChange("lifecycle_stage", e.target.value)}
              disabled={disableModuleFields} // ❌ not editable in edit & view
              bold={isView}
            >
              <option value="">Select Stage</option>
              {form.lifecycle_stage && !lifecycleStages.includes(form.lifecycle_stage) && (
                <option key={form.lifecycle_stage} value={form.lifecycle_stage}>
                  {form.lifecycle_stage}
                </option>
              )}
              {lifecycleStages.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </FormRow>

          <FormRow>
            <Input
              label="Analysis Mode"
              value={form.analysis_mode}
              onChange={(e: any) => handleChange("analysis_mode", e.target.value)}
              placeholder="Ex: Model1 / Model2"
              disabled={disableEditableFields} //  editable in edit, disabled in view
              bold={isView}
            />

            <Input
              label="Version"
              value={form.version}
              onChange={(e: any) => handleChange("version", e.target.value)}
              placeholder="Ex: 1.0 / 1.1 / 2.0"
              disabled={disableEditableFields}
              bold={isView}
            />

            {!isCreate && !isView && (
              <Select
                label="Status"
                value={form.is_active}
                onChange={(e: any) => handleChange("is_active", e.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            )}

            <Input
              label="Version Description"
              value={form.version_desc}
              onChange={(e: any) => handleChange("version_desc", e.target.value)}
              placeholder="Explain what changed in this version..."
              disabled={disableEditableFields}
              bold={isView}
            />
          </FormRow>

          <TextArea
            label="Prompt Text"
            value={form.prompt_text}
            onChange={(e: any) => handleChange("prompt_text", e.target.value)}
            onInput={autoGrow}
            placeholder="Write the AI prompt instructions here..."
            disabled={disableEditableFields}
            bold={isView}
          />

          <TextArea
            label="Description"
            value={form.description}
            onChange={(e: any) => handleChange("description", e.target.value)}
            placeholder="Explain what this prompt does..."
            disabled={disableEditableFields}
            bold={isView}
          />


          {!isView && (
            <button
              className="btn btn-primary w-36 flex justify-center text-center"
              onClick={handleSubmit}
            >
              {isEdit
                ? "Update Prompt"
                : isInheritance
                  ? "Inherit Prompt"
                  : "Create Prompt"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------
   REUSABLE COMPONENTS
--------------------------------------------------- */
function FormRow({ children }: any) {
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{children}</div>;
}

function Input({ label, value, onChange, placeholder, disabled = false, bold = false }: any) {
  return (
    <div className="flex flex-col gap-2">
      <label className="form-label text-md">{label} <span className='text-danger text-xl'>*</span></label>
      <input
        className={`input ${bold ? 'font-bold text-gray-800 bg-gray-100' : ''}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, disabled = false, bold = false }: any) {
  return (
    <div className="flex flex-col gap-2">
      <label className="form-label text-md">{label} <span className='text-danger text-xl'>*</span></label>
      <textarea
        className={`input min-h-96 ${bold ? 'font-bold text-gray-800 bg-gray-100' : ''}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

function Select({ label, value, children, onChange, disabled = false, bold = false }: any) {
  return (
    <div className="flex flex-col gap-2">
      <label className="form-label text-md">{label} <span className='text-danger text-xl'>*</span></label>
      <select
        className={`input ${bold ? 'font-bold text-gray-800 bg-gray-100' : ''}`}
        value={value}
        onChange={onChange}
        disabled={disabled}
      >
        {children}
      </select>
    </div>
  );
}
