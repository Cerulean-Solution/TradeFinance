from fastapi import Request, APIRouter,HTTPException
# from fastapi.responses import JSONResponse
from typing import Dict,Optional
import time
import traceback
from MTConverter.database import get_db
from MTConverter.sample_generator import get_sample_generator
from pydantic import BaseModel
from MTConverter.document_classifier import get_classifier
from MTConverter.trade_finance_converter import get_converter
from MTConverter.db_logger import get_app_logger, DBLogger
from pydantic import BaseModel
import os
import json
db = get_db()

router = APIRouter(
    prefix="/api/lc/mt",
    tags=["MT Converter"]
)
from MTConverter.prompt_loader import PROMPT_DIR
assert os.path.exists(PROMPT_DIR), f"Missing prompts directory: {PROMPT_DIR}"

class LoadSampleRequest(BaseModel):
    instrument_code: str
    lifecycle_code: str
    variation_code: str
    cifno: str
    customer_name: str
    user_id: int


class ReverseEngineerRequest(BaseModel):
    application_text: str

class ConvertRequest(BaseModel):
    application_text: str
    instrument_code: str
    lifecycle_code: str
    variation_code: str = None
    cifno: str
    customer_name: str
    user_id: int
    lc_number: str = ""

class ToolInstrumentInsertRequest(BaseModel):
    lc_number: str
    cifno: str
    customer_name: str
    instrument_type: str
    lifecycle: str
    variation_code: str
    main_document: str
    status: str
    user_id: int
    model: str

class LLMRequest(BaseModel):
    transaction_no: str
    request_payload: str
    prompt_id: int | None = None
    Rag: str | None = None
    cifno: str | None = None
    lc_number: str | None = None
    UserID: int | None = None
    Model: str | None = None
    request_tokens: int 

class LLMResponse(BaseModel):
    transaction_no: str
    request_id: Optional[int] = None
    response_payload: str
    Rag: Optional[str] = None
    cifno: Optional[str] = None
    lc_number: Optional[str] = None
    UserID: Optional[int] = None  
    Model: Optional[str] = None
    response_tokens: int

# ---------------------------------
# Helpers
# ---------------------------------
generator = get_sample_generator()
classifier = get_classifier()
converter=get_converter()
logger = get_app_logger("tf-genie")

def get_db_logger():
    return DBLogger(db.connect())

# ---------------------------------
# APIs
# ---------------------------------
@router.get("/instruments")
def get_instruments():
    try:
        return {"success": True, "data": db.get_all_instruments()}
    except Exception as e:
        logger.error(f"Error in get_instruments: {str(e)}\n{traceback.format_exc()}")
        return {"success": False, "message": "Failed to load instruments"}


@router.get("/sample_matrix/{instrument_code}")
def get_sample_matrix(instrument_code: str) -> Dict:
    try:
        matrix_data = db.get_sample_availability_matrix(instrument_code)
        return {"success": True, "data": matrix_data}
    except Exception as e:
        logger.error(f"Error in get_sample_matrix: {str(e)}\n{traceback.format_exc()}")
        return {"success": False, "error": str(e)}


@router.post("/sample/load")
def load_sample(req: LoadSampleRequest, request: Request):
    start = time.time()
    db_logger = get_db_logger()

    try:
        # 1 Check existing sample
        sample = db.get_sample_application(
            req.instrument_code, req.lifecycle_code, req.variation_code
        )
        print("sample:", sample)

        if sample:
            # Optional audit for loaded sample
            db_logger.audit(
                "SAMPLE_LOAD",
                "SUCCESS",
                "Sample loaded from existing records",
                None,
                getattr(request.client, "host", None),
                req.dict(),
                {"sample_name": sample["sample_name"]},
                int((time.time() - start) * 1000),
            )
            return {
                "status": "loaded",
                "sample_name": sample["sample_name"],
                "application_text": sample["application_text"]
            }

        # 2 Generate sample
        print("check generate")
        generated, token_usage, llm_generate_prompt = generator.generate_sample(
            instrument_code=req.instrument_code,
            lifecycle_code=req.lifecycle_code,
            variation_code=req.variation_code,
            target_length=1200,
        )
        print("generated")

        # 3 CREATE TRANSACTION (ONE TIME)
        instrument_result = db.insert_tool_instrument_sp(
            lc_number="",
            cifno=req.cifno,
            customer_name=req.customer_name,
            instrument_type=req.instrument_code,
            lifecycle=req.lifecycle_code,
            variation_code=req.variation_code,
            user_id=req.user_id,
            main_document=generated,
            prompt_text=llm_generate_prompt,
            status="COMPLETE",
            model="Sample Application Generator"
        )
        transaction_id = instrument_result["transaction_no"]

        # 4 Store LLM REQUEST
        llm_req = LLMRequest(
            transaction_no=transaction_id,
            request_payload=llm_generate_prompt,
            prompt_id=None,
            Rag="Sample Generation",
            cifno=req.cifno,
            lc_number=None,
            UserID=req.user_id,
            Model="SampleGenerator",
            request_tokens=token_usage["prompt_tokens"]
        )
        request_id = db.MT_request(llm_req)

        # 5 Store LLM RESPONSE
        llm_res = LLMResponse(
            transaction_no=transaction_id,
            request_id=request_id,
            response_payload=generated,
            Rag="Sample Generation",
            cifno=req.cifno,
            lc_number=None,
            UserID=req.user_id,
            Model="SampleGenerator",
            response_tokens=token_usage["completion_tokens"]
        )
        response_id = db.MT_response(llm_res)

        # 6 Store PROMPT (for billing / audit)
        db.insert_tool_instrument_prompt_sp(
            transaction_no=transaction_id,
            cifno=req.cifno,
            Rag="Sample Generation",
            prompt_id=None,
            prompt_text=llm_generate_prompt,
            status="ACTIVE",
            lc_number=None,
            UserID=req.user_id,
            Model="SampleGenerator"
        )

        # 7 Store BILLING (NON-BILLABLE / SYSTEM)
        db.insert_tool_billing_sp(
            transaction_no=transaction_id,
            cifid=req.cifno,
            module="SampleGenerator",
            instrument_type=req.instrument_code,
            lifecycle=req.lifecycle_code,
            lc_number=None,
            variation=req.variation_code,
            status="ACTIVE",
            userid=req.user_id
        )

        # 8 Store SAMPLE
        sample_name = f"{req.instrument_code}_{req.lifecycle_code}_{req.variation_code}_AUTO"
        db.save_sample_application(
            instrument_code=req.instrument_code,
            lifecycle_code=req.lifecycle_code,
            variation_code=req.variation_code,
            sample_name=sample_name,
            application_text=generated,
            file_path=None
        )

        # 9 Audit
        db_logger.audit(
            "SAMPLE_GENERATE",
            "SUCCESS",
            "Sample generated with transaction",
            None,
            getattr(request.client, "host", None),
            req.model_dump(),
            {
                "transaction_id": transaction_id,
                "request_id": request_id,
                "response_id": response_id
            },
            int((time.time() - start) * 1000),
        )

        return {
            "status": "generated",
            "transaction_id": transaction_id,
            "sample_name": sample_name,
            "application_text": generated
        }

    except Exception as e:
        db_logger.error(
            "SAMPLE_ERROR",
            "BUSINESS",
            e,
            None,
            getattr(request.client, "host", None),
            req.model_dump(),
            {"api": "sample/load"},
        )
        raise HTTPException(status_code=500, detail="Sample generation failed")

@router.post("/reverse-engineer")
def reverse_engineer(req: ReverseEngineerRequest):
    try:
        application_text = req.application_text.strip()
        if not application_text:
            return {"status": "error", "message": "Empty document"}

        from MTConverter.document_classifier import get_classifier
        classifier = get_classifier()
        instruments = db.get_all_instruments()

        all_lifecycles = []
        all_variations = []
        for inst in instruments:
            lcs = db.get_lifecycles_for_instrument(inst["instrument_code"])
            vars = db.get_variations_for_instrument(inst["instrument_code"])
            all_lifecycles.extend(lcs)
            all_variations.extend(vars)

        unique_lifecycles = {lc["lifecycle_code"]: lc for lc in all_lifecycles}.values()
        unique_variations = {v["variation_code"]: v for v in all_variations}.values()

        # Classify
        result = classifier.classify_document(
            application_text,
            instruments,
            list(unique_lifecycles),
            list(unique_variations),
        )

        if not result["instrument_code"]:
            return {
                "status": "not_detected",
                "message": "Could not detect instrument/lifecycle/variation",
                "reasoning": result.get("reasoning", "")
            }

        return {
            "status": "success",
            "instrument_code": result["instrument_code"],
            "lifecycle_code": result["lifecycle_code"],
            "variation_code": result["variation_code"],
            "confidence": result["confidence"],
        }

    except Exception as e:
        logger.error(f"Error in reverse_engineer: {str(e)}\n{traceback.format_exc()}")
        return {"status": "error", "message": str(e)}   

@router.post("/convert-mt")
def convert_mt(request: ConvertRequest, req: Request):
    start = time.time()
    db_logger = get_db_logger()
    try: 
        # 1. Resolve MT message type
        lifecycles = db.get_lifecycles_for_instrument(request.instrument_code)
        lc_details = [lc for lc in lifecycles if lc["lifecycle_code"] == request.lifecycle_code]
        mt_message_type = lc_details[0]["mt_message_type"] if lc_details else "MT700"

        #  2. Convert
        mt_message, extracted_data, processing_time, combined_prompt_payload ,combined_prompt,token_usage = converter.convert(
            request.application_text,
            request.instrument_code,
            request.lifecycle_code,
            mt_message_type
        )
         #  3. Insert tool_instrument (creates transaction_id)
        instrument_result = db.insert_tool_instrument_sp(
            lc_number=request.lc_number,
            cifno=request.cifno,
            customer_name=request.customer_name,
            instrument_type=request.instrument_code,
            lifecycle=request.lifecycle_code,
            variation_code=request.variation_code,
            user_id=request.user_id,
            main_document=request.application_text,
            prompt_text=combined_prompt_payload,
            status="COMPLETE",
            model="MT_CONVERTER"    
        )
        transaction_id = instrument_result["transaction_no"]
        #  4. Store LLM REQUEST (OBJECT)
        llm_req = LLMRequest(
            transaction_no=transaction_id,
            request_payload= combined_prompt,
            prompt_id=None,
            Rag="MT Conversion",
            cifno=request.cifno,
            lc_number=request.lc_number,
            UserID=request.user_id,
            Model="MTConverter",
            request_tokens=token_usage["prompt_tokens"]
        )
        request_id = db.MT_request(llm_req)
        #  5. Store Conversion
        conversion_id = db.save_conversion(
            request.instrument_code,
            request.lifecycle_code,
            request.variation_code,
            request.application_text,
            extracted_data,
            mt_message,
            mt_message_type,
            "SUCCESS",
            None,
            processing_time,
            request.user_id,
            request.cifno,
            transaction_no=transaction_id
        )
        
        results = json.dumps({
            "mt_message": mt_message,
            "extracted_data": extracted_data
        }, ensure_ascii=False)
        
        results= (
            "======== MT Generation ========\n"
            f"{mt_message}\n\n"
            "=== EXTRACTION ===\n"
            f"{extracted_data}\n"
            )
        #  6. Store LLM RESPONSE (OBJECT)
        llm_res = LLMResponse(
             transaction_no=transaction_id,
            request_id=request_id,
            response_payload=results,
            Rag="MT Conversion",
            cifno=request.cifno,
            lc_number=request.lc_number,
            UserID=request.user_id,
            Model="MTConverter",
            response_tokens=token_usage["completion_tokens"]
        )
        
        response_id = db.MT_response(llm_res)
        #  7. billing
        prompt_insert_id = db.insert_tool_instrument_prompt_sp(
            transaction_no=transaction_id,
            cifno=request.cifno,
            Rag="MT Conversion",
            prompt_id=None,
            prompt_text=combined_prompt_payload,
            status="ACTIVE",
            lc_number=request.lc_number,
            UserID=request.user_id,
            Model="MTConverter"
        )

        # 8. Store Billing (ONLY ON SUCCESS)
        billing_id = db.insert_tool_billing_sp(
            transaction_no=transaction_id,
            cifid=request.cifno,
            module="MTConverter",
            instrument_type=request.instrument_code,
            lifecycle=request.lifecycle_code,
            lc_number=request.lc_number,
            variation=request.variation_code,
            status="ACTIVE",
            userid=request.user_id
        )
        
        # 9. Audit
        db_logger.audit(
            "MT_CONVERSION",
            "SUCCESS",
            "MT converted",
            None,
            req.client.host if req.client else None,
            request.model_dump(),
            {
                "transaction_id": transaction_id,
                "request_id": request_id,
                "conversion_id": conversion_id,
                "response_id": response_id
            },
            int((time.time() - start) * 1000),
        )

        return {
            "status": "success",
            "transaction_id": transaction_id,
            "request_id": request_id,
            "conversion_id": conversion_id,
            "response_id": response_id,
            "mt_message": mt_message,
            "extracted_data": extracted_data,
            "processing_time": processing_time,
            "mt_message_type": mt_message_type
        }

    except Exception as e:
        logger.error(traceback.format_exc())
        db_logger.error(
            "MT_ERROR",
            "CONVERSION",
            e,
            None,
            req.client.host if req.client else None,
            request.model_dump(),
            {"api": "convert-mt"},
        )
        raise HTTPException(status_code=500, detail="MT conversion failed")
