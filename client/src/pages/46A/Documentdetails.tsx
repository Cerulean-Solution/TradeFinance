
// export default DocumentDetails;
import { Fragment, useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { KeenIcon } from "@/components";
import { Textarea } from "@/components/ui/textarea";
import { toAbsoluteUrl } from "@/utils/Assets";
import { log } from "console";

type Detail = {
    detailId: number;
    lineNo: number;
    documentText: string;
    checked: number;
    narration: string;
};

const DocumentDetails = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [brandColorInput, setBrandColorInput] = useState("#BA35A0");

    const [details, setDetails] = useState<Detail[]>([]);
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const docInfo = location.state;



    const userID = localStorage.getItem("userID");
    console.log(userID);

    const fetchDetails = async () => {
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/lc/documents/${id}/details`);
            const data = await res.json();
            console.log("Fetched details:", data);
            setDetails(data);
        } catch (err) {
            console.error("Error fetching details:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchDetails();
    }, [id]);

    const updateDetail = async (detailId: number, checked: boolean, narration: string) => {
        try {
            await fetch(`http://127.0.0.1:8000/api/lc/documents/${id}/update`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ detailId, checked, narration }),
            });
        } catch (err) {
            console.error("Update error:", err);
        }
    };

    const handleCheckbox = (detailId: number) => {
        const updated = details.map((d) =>
            d.detailId === detailId ? { ...d, checked: d.checked === 1 ? 0 : 1 } : d
        );
        setDetails(updated);

        const item = updated.find((d) => d.detailId === detailId);
        updateDetail(detailId, item!.checked === 1, item!.narration);
    };

    const handleNarration = (detailId: number, value: string) => {
        const updated = details.map((d) =>
            d.detailId === detailId ? { ...d, narration: value } : d
        );
        setDetails(updated);

        const item = updated.find((d) => d.detailId === detailId);
        updateDetail(detailId, item!.checked === 1, value);
    };

    const handleSave = () => {
        alert("Document details saved successfully!");
        navigate("/form/46A");
    };

    const docStats = [
        {
            // icon: "/media/images/FrameworkImages/doc-file.png",
            info: docInfo?.sampleNo ?? "N/A",
            desc: "Sample No",
            bg: "/media/images/2600x1600/bg-4.png",
            bgDark: "",
            color: "bg-blue-500",
        },
        {
            // icon: "/media/images/FrameworkImages/lc-type.png",
            info: docInfo?.lcType ?? "N/A",
            desc: "LC Type",
            bg: "/media/images/2600x1600/bg-4.png",
            bgDark: "",
            color: "bg-green-500",
        },
        {
            // icon: "/media/images/FrameworkImages/commodity.png",
            info: docInfo?.commodity ?? "N/A",
            desc: "Commodity",
            bg: "/media/images/2600x1600/bg-5.png",
            bgDark: "",
            color: "bg-purple-500",
        },
        {
            // icon: "/media/images/FrameworkImages/status.png",
            info: docInfo?.fullyCompliant === "Y" ? "Active" : "Inactive",
            desc: "Fully Compliant",
            bg: "/media/images/2600x1600/bg-6.png",
            bgDark: "",
            color: docInfo?.fullyCompliant === "Y" ? "bg-success" : "bg-danger",
        },
    ];




    return (
        <Fragment>
            <style>
                {`
          .branding-bg {
            background-image: url('${toAbsoluteUrl("/media/images/2600x1200/bg-10.png")}');
          }
          .dark .branding-bg {
            background-image: url('${toAbsoluteUrl("/media/images/2600x1200/bg-10-dark.png")}');
          }
        `}
            </style>

            <div className="card min-w-full branding-bg">

                {/* HEADER */}
                <div className="card-header gap-2 flex justify-between">
                    <h3 className="card-title flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="btn btn-sm btn-primary btn-outline flex items-center gap-1"
                        >
                            <KeenIcon icon="arrow-left" className="text-base " /> Back to List
                        </button>
                        Document Details
                    </h3>
                </div>

                <div className="card-body lg:py-7.5 py-5 ">

                    {/* DOCUMENT CATEGORY */}
                    <div className="flex flex-wrap justify-between gap-5 ">
                        <div className="flex flex-col">

                            {/* <div className="text-gray-900 text-sm font-medium">Document Category</div> */}
                            <span className="text-xl font-semibold text-blue-700">
                                {docInfo?.description}
                            </span>
                            <span className="text-gray-700 text-2sm">
                                Overview of the selected 46A document group
                            </span>
                        </div>





                        <div className="flex flex-wrap sm:flex-nowrap gap-5 lg:gap-7.5 max-w-md w-full">
                            <img
                                // src={toAbsoluteUrl("/media/brand-logos/hex-lab.svg")}
                                src={toAbsoluteUrl("/media/images/FrameworkImages/46A.png")}
                                className="h-[50px] mt-2"
                                alt="Document Logo"
                            />

                            <div className="flex bg-center w-full p-5 lg:p-7 bg-no-repeat bg-[length:550px] border border-gray-300 rounded-xl border-dashed branding-bg ">
                                <div className="flex flex-col place-items-center place-content-center text-center rounded-xl w-full">
                                    <div className="flex items-center mb-2.5">
                                        <div className="relative size-20 shrink-1 ">
                                            <svg className="w-full h-full stroke-brand-clarity fill-light" width="44" height="48">
                                                <path d="M16 2.4641C19.7 0.32 24.3 0.32 28 2.46L37.65 8.03C41.36 10.17 43.65 14.14 43.65 18.43V29.57C43.65 33.86 41.36 37.82 37.65 39.96L28 45.53C24.28 47.67 19.71 47.67 16 45.53L6.34 39.96C2.63 37.82 0.35 33.86 0.35 29.57V18.42C0.35 14.14 2.63 10.17 6.34 8.03L16 2.46Z" />
                                            </svg>

                                            <div className="absolute leading-none left-2/4 top-2/4 -translate-y-2/4 -translate-x-2/4">
                                                <img
                                                    src={toAbsoluteUrl("/media/images/FrameworkImages/doc-file.png")}
                                                    alt=""
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <span className="text-2xs text-gray-700 text-nowrap">
                                        Uploaded 46A Document Information
                                    </span>
                                </div>
                            </div>
                        </div>
                        {/* documents */}


                        {/* <div className="mt-3 text-sm text-gray-800 flex gap-4 flex-wrap">
                            <div><strong>Sample No:</strong> {docInfo?.sampleNo ?? "N/A"}</div>
                            <div><strong>LC Type:</strong> {docInfo?.lcType ?? "N/A"}</div>
                            <div><strong>Commodity:</strong> {docInfo?.commodity ?? "N/A"}</div>
                            <div>
                                <strong>Fully Compliant:</strong>{" "}
                                {docInfo?.fullyCompliant === "Y" ? "✔️ Yes" : "❌ No"}
                            </div>
                        </div> */}
                    </div>

                    <div className="border-t border-gray-300 my-7.5"></div>

                    {/* DOCUMENT SUMMARY */}
                    <div className="flex  justify-between gap-1  items-center">
                        <div className="flex flex-col  w-1/3">
                            <div className="text-gray-900 text-sm font-medium">Document Summary</div>
                            <span className="text-gray-700 text-2sm">
                                Key reference or internal tracking reference
                            </span>
                        </div>

                        {/* <label className="input sm:max-w-full xl:max-w-96 w-full">
                            <KeenIcon icon="mouse-square" className="text-success" style="solid" />
                            <input
                                type="text"
                                value={brandColorInput}
                                onChange={(e) => setBrandColorInput(e.target.value)}
                            />
                        </label> */}

                        <div className="mt-3 text-sm text-gray-800 flex gap-1 flex-wrap  w-full justify-evenly">
                            <div><strong>Sample No:</strong> {docInfo?.sampleNo ?? "N/A"}</div>
                            <div><strong>LC Type:</strong> {docInfo?.lcType ?? "N/A"}</div>
                            <div><strong>Commodity:</strong> {docInfo?.commodity ?? "N/A"}</div>
                            <div>
                                <strong>Fully Compliant:</strong>{" "}
                                {docInfo?.fullyCompliant === "Y" ? "✔️ Yes" : "❌ No"}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-300 my-7.5"></div>

                    {/* CHECKLIST SECTION */}
                    <div className="flex flex-col gap-4 p-5 border rounded-xl card branding-bg ">
                        {loading ? (
                            <p>Loading document details...</p>
                        ) : (
                            details.map((item) => (
                                <div
                                    key={item.detailId}
                                    className="flex border rounded-xl p-3 gap-4 items-start justify-center"
                                >
                                    <div className="flex flex-col gap-2 w-1/3 min-w-[200px] ">
                                        <label className="checkbox-group flex items-start gap-2">
                                            <input
                                                type="checkbox"
                                                className="checkbox checkbox-sm"
                                                checked={item.checked === 1}
                                                onChange={() => handleCheckbox(item.detailId)}
                                            />
                                            <span className="text-gray-900 font-medium">
                                                {item.documentText}
                                            </span>
                                        </label>
                                    </div>

                                    <div className="flex-1">
                                        <Textarea
                                            value={item.narration}
                                            onChange={(e) =>
                                                handleNarration(item.detailId, e.target.value)
                                            }
                                            placeholder="Add notes or remarks..."
                                            className="w-full h-1"
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="border-t border-gray-300 my-7.5"></div>

                    {/* SAVE */}
                    <div className="flex justify-end">
                        <button className="btn btn-primary" onClick={handleSave}>
                            Save Document Details
                        </button>
                    </div>

                </div>
            </div>
        </Fragment>
    );
};

export default DocumentDetails;
