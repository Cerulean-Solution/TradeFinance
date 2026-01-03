from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from analyzers.lc_document_analyzer import LCDocumentAnalyzer
from analyzers.cross_document_analyzer import CrossDocumentAnalyzer
from analyzers.multi_hop_analyzer import MultiHopAnalyzer
from core.db import get_connection
from utils.txn_generator import generate_unique_transaction_no
from routes.tool_instrument import insert_tool_instrument_prompt,save_llm_response ,save_llm_request,save_discrepancy,save_cross_document_discrepancy,save_multihop_discrepancy,insert_tool_billing # ⭐ IMPORT response saver
from analyzers.cross_document_analyzer import (
    extract_table_rows_from_markdown,
    extract_detailed_discrepancies,
    merge_table_and_details,
    extract_multihop_discrepancy_rows,
)
from Prompts.multi_hops_prompts import (
    QUESTION_ANALYSIS_PROMPT,
    MULTI_QUERY_PLANNING_PROMPT,
    CONTEXT_ASSESSMENT_PROMPT,
    DECISION_MAKING_PROMPT,
    ENHANCED_SYNTHESIS_PROMPT,
    ADVANCED_VERIFICATION_PROMPT,
    USER_PROMPT
)

from Prompts.prompts import (
    SYSTEM_PROMPT
)
from Prompts.sysprompt import SYSTEM_PROMPT, SYSTEM_DETAIL_PROMPT
router = APIRouter(prefix="/api/lc", tags=["Analysis"])
# -----------------------------------------------------------
# Request from React
# -----------------------------------------------------------
class AnalysisRequest(BaseModel):
    cifno: str
    transaction_id: str 
    instrument: str
    lifecycle: str
    prompt: str
    lc_document: str
    sub_documents: str | None = None
    prompt_id: int | None = None   
    is_active: bool | None = None
    UserID: int | None = None
    Model: str | None = None 
    lc_number: str


def build_prompt_text(
    rag_name: str,
    ui_prompt: str,
):
    """
    Returns the correct prompt_text based on RAG name
    """

    if rag_name == "LLM Rag against standards":
        # MODE 1
        return f"""
custom_prompt = {ui_prompt}
""".strip()

    elif rag_name == "Cross Document Validation":
        # MODE 2
        return f"""
system_prompt = {SYSTEM_PROMPT}

system_detail_prompt = {SYSTEM_DETAIL_PROMPT}
""".strip()

    elif rag_name == "MultiHop RAG":
        # MODE 3
        return f"""
m3 = MultiHopAnalyzer(
    lc_type = instrument_code,
    system_prompt = {SYSTEM_PROMPT},
    question_analysis_prompt = {QUESTION_ANALYSIS_PROMPT},
    multi_query_planning_prompt = {MULTI_QUERY_PLANNING_PROMPT},
    context_assessment_prompt = {CONTEXT_ASSESSMENT_PROMPT},
    decision_making_prompt = {DECISION_MAKING_PROMPT},
    enhanced_synthesis_prompt = {ENHANCED_SYNTHESIS_PROMPT},
    advanced_verification_prompt = {ADVANCED_VERIFICATION_PROMPT},
    user_prompt = {USER_PROMPT},
)
""".strip()

    else:
        return ""

# -----------------------------------------------------------
# Normalize LLM Output
# -----------------------------------------------------------
def normalize(result_raw):
    if isinstance(result_raw, str):
        return {
            "request": "",
            "response": result_raw,
            "analysis": result_raw,
            "tokens": {
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0,
            }
        }

    if isinstance(result_raw, dict):
        return {
            "request": result_raw.get("request", ""),
            "response": result_raw.get("response", result_raw.get("analysis", "")),
            "analysis": result_raw.get("analysis", ""),
            "tokens": result_raw.get("tokens", {
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0,
            })
        }

    return {
        "request": "",
        "response": str(result_raw),
        "analysis": str(result_raw),
        "tokens": {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
        }
    }

@router.post("/analyze-lc")
def analyze_lc(data: AnalysisRequest):
    print("start analysis")

    try:
        db = get_connection()
        transaction_id = data.transaction_id
        instrument_code = data.instrument
        # lifecycle_code = data.lifecycle
        lifecycle_code = data.lifecycle.strip().lower()

        if lifecycle_code == "issuance":
            model_name = "LCAnalysis"
            variation_code = "ISSUANCE"
        elif lifecycle_code == "amendment":
            model_name = "Amendment"
            variation_code = "AMENDMENT"
        else:
            raise ValueError(f"Unsupported lifecycle: {data.lifecycle}")

        ui_prompt = data.prompt.strip()
        lc_text = data.lc_document.strip()
        sub_text = (data.sub_documents or "").strip()


        if not lc_text:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "LC document is empty"}
            )

        # ---------------- MODE 1 ---------------------
        m1 = LCDocumentAnalyzer(
            lc_type=instrument_code,
            lc_code=instrument_code,
            lifecycle_code=lifecycle_code,
            custom_prompt=ui_prompt
        )

        mode1_raw = m1.analyze(lc_text)
        mode1 = normalize(mode1_raw)

        request_id_m1 = save_llm_request(
            db=db,
            transaction_no=transaction_id,
            request_payload=mode1["request"],
            token_count=mode1["tokens"]["prompt_tokens"],
            prompt_id=data.prompt_id,
            rag_name="LLM Rag against standards",
            cifno=data.cifno,
            lc_number=data.lc_number,
            UserID=data.UserID,
            Model=model_name
        )

        rag_name = "LLM Rag against standards"

        prompt_text = build_prompt_text(
            rag_name=rag_name,
            ui_prompt=ui_prompt,
        )

        insert_tool_instrument_prompt(
            db=db,
            transaction_no=transaction_id,
            cifno=data.cifno,
            rag_name=rag_name,
            prompt_id=data.prompt_id,
            prompt_text=prompt_text,
            status=data.is_active,
            lc_number=data.lc_number,
            user_id=data.UserID,
            model=model_name,
        )

        save_llm_response(
            db=db,
            transaction_no=transaction_id,
            request_id=request_id_m1,
            response_payload=mode1["response"],
            token_count=mode1["tokens"]["completion_tokens"],
            rag_name="LLM Rag against standards",
            cifno=data.cifno,
            lc_number=data.lc_number,
            UserID=data.UserID,
            Model=model_name
        )

                
        # # ---------------------------------------------------------
        # # ⭐ INSERT DISCREPANCIES (MODE-1 ONLY)
        # # ---------------------------------------------------------
        import json
        try:
            response_text = mode1["response"]

            # Extract JSON inside ```json ... ```
            if "```json" in response_text:
                json_block = response_text.split("```json")[1].split("```")[0].strip()
                data_json = json.loads(json_block)
            else:
                data_json = None

            # Insert each discrepancy row
            if data_json and "discrepancies" in data_json:
                serial = 1
                for d in data_json["discrepancies"]:
                    save_discrepancy(
                        db=db,
                        transaction_no=transaction_id,
                        d=d,
                        cifno=data.cifno,
                        lc_number=data.lc_number,
                        UserID=data.UserID,
                        Model=model_name
                    )


        except Exception as err:
            print("DISCREPANCY INSERT ERROR:", err)

        # ---------------- MODE 2 ---------------------
        m2 = CrossDocumentAnalyzer(
            lc_type=instrument_code,
            lc_code=instrument_code,
            lifecycle_code=lifecycle_code,
            system_prompt=SYSTEM_PROMPT,
            system_detail_prompt=SYSTEM_DETAIL_PROMPT
        )

        mode2_raw = m2.analyze(lc_text, presented_documents=sub_text)
        mode2 = normalize(mode2_raw)
        # ---------------------------------------------------------
        # ⭐ INSERT MODE-2 CROSS DOCUMENT DISCREPANCIES
        # ---------------------------------------------------------
        try:
            
            md_text = mode2["response"]

            # 1. table rows
            table_rows = extract_table_rows_from_markdown(md_text)

            # 2. detailed rows
            detail_rows = extract_detailed_discrepancies(md_text)

            # 3. merged complete rows
            final_rows = merge_table_and_details(table_rows, detail_rows)

            serial = 1
            for r in final_rows:
                save_cross_document_discrepancy(
                    db=db,
                    transaction_no=transaction_id,
                    d=r,
                    serial_id=serial,
                    cifno=data.cifno,
                    lc_number=data.lc_number,
                    UserID=data.UserID,
                    Model=model_name
                )
                serial += 1



        except Exception as err:
            print("MODE-2 DISCREPANCY INSERT ERROR:", err)


        request_id_m2 = save_llm_request(
            db=db,
            transaction_no=transaction_id,
            request_payload=mode2["request"],
            token_count=mode2["tokens"]["prompt_tokens"],
            prompt_id=data.prompt_id,
            rag_name="Cross Document Validation",
            cifno=data.cifno,
            lc_number=data.lc_number,
            UserID=data.UserID,
            Model=model_name
        )
        rag_name = "Cross Document Validation"

        prompt_text = build_prompt_text(
            rag_name=rag_name,
            ui_prompt=ui_prompt,
        )

        insert_tool_instrument_prompt(
            db=db,
            transaction_no=transaction_id,
            cifno=data.cifno,
            rag_name=rag_name,
            prompt_id=data.prompt_id,
            prompt_text=prompt_text,
            status=data.is_active,
            lc_number=data.lc_number,
            user_id=data.UserID,
            model=model_name,
        )


        save_llm_response(
            db=db,
            transaction_no=transaction_id,
            request_id=request_id_m2,
            response_payload=mode2["response"],
            token_count=mode2["tokens"]["completion_tokens"],
            rag_name="Cross Document Validation",
            cifno=data.cifno,
            lc_number=data.lc_number,
            UserID=data.UserID,
            Model=model_name
        )

        # ---------------- MODE 3 ---------------------
        m3 = MultiHopAnalyzer(
        lc_type=instrument_code,
        system_prompt=SYSTEM_PROMPT,
        question_analysis_prompt=QUESTION_ANALYSIS_PROMPT,
        multi_query_planning_prompt=MULTI_QUERY_PLANNING_PROMPT,
        context_assessment_prompt=CONTEXT_ASSESSMENT_PROMPT,
        decision_making_prompt=DECISION_MAKING_PROMPT,
        enhanced_synthesis_prompt=ENHANCED_SYNTHESIS_PROMPT,
        advanced_verification_prompt=ADVANCED_VERIFICATION_PROMPT,
        user_prompt=USER_PROMPT,
    )


        mode3_raw = m3.analyze(lc_text, presented_documents=sub_text)
        mode3 = normalize(mode3_raw)
        # ---------------------------------------------------------
        # ⭐ INSERT MODE-3 MULTIHOP DISCREPANCIES
        # ---------------------------------------------------------
        # try:
        #     md_text = mode3["response"]

        #     # A. row-level discrepancies
        #     rows = extract_multihop_discrepancy_rows(md_text)
        #     for r in rows:
        #         save_multihop_discrepancy(
        #             db=db,
        #             d=r,
        #             cifno=data.cifno,
        #             transaction_no=transaction_id,
        #             lc_number=data.lc_number,
        #             UserID=data.UserID,
        #             Model=model_name
        #         )

           

        # except Exception as err:
        #     print("MODE-3 MULTIHOP INSERT ERROR:", err)


        request_id_m3 = save_llm_request(
            db=db,
            transaction_no=transaction_id,
            request_payload=mode3["request"],
            token_count=mode3["tokens"]["prompt_tokens"],
            prompt_id=data.prompt_id,
            rag_name="MultiHop RAG",
            cifno=data.cifno,
            lc_number=data.lc_number,
            UserID=data.UserID,
            Model=model_name
        )
        rag_name = "MultiHop RAG"

        prompt_text = build_prompt_text(
            rag_name=rag_name,
            ui_prompt=ui_prompt,
        )

        insert_tool_instrument_prompt(
            db=db,
            transaction_no=transaction_id,
            cifno=data.cifno,
            rag_name=rag_name,
            prompt_id=data.prompt_id,
            prompt_text=prompt_text,
            status=data.is_active,
            lc_number=data.lc_number,
            user_id=data.UserID,
            model=model_name,
        )


        save_llm_response(
            db=db,
            transaction_no=transaction_id,
            request_id=request_id_m3,
            response_payload=mode3["response"],
            token_count=mode3["tokens"]["completion_tokens"],
            rag_name="MultiHop RAG",
            cifno=data.cifno,
            lc_number=data.lc_number,
            UserID=data.UserID,
            Model=model_name
        )


        inserted_billing_id = insert_tool_billing(
            db=db,
            transaction_no=transaction_id,
            cifno=data.cifno,
            Model=model_name,
            instrument=instrument_code,
            lifecycle=lifecycle_code,
            lc_number=data.lc_number,
            variation_code=variation_code,
            is_active=data.is_active,
            UserID=data.UserID
        )
        # Return to React
        return {
            "success": True,
            "transaction_id": transaction_id,
            "instrument": instrument_code,
            "lifecycle": lifecycle_code,
            "prompt_used": ui_prompt,
            "billing_id": inserted_billing_id,
            "mode1": mode1,
            "mode2": mode2,
            "mode3": mode3,
        }

            # After Mode 3 response is saved
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )
