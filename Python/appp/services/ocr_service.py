# app/services/ocr_service.py

import fitz  # PyMuPDF
import base64
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential
from openai import AzureOpenAI
from appp.config import settings
from appp.crud.ocr import insert_ocr_page
from appp.prompts import SIGNATURE_STAMP_PROMPT
from loguru import logger


# Initialize Azure Document Intelligence client
di_client = DocumentIntelligenceClient(
    endpoint=settings.AZURE_DOC_ENDPOINT,
    credential=AzureKeyCredential(settings.AZURE_DOC_KEY)
)

# Initialize Azure OpenAI client for GPT-4o vision
azure_client = AzureOpenAI(
    azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
    api_key=settings.AZURE_OPENAI_API_KEY,
    api_version="2024-02-15-preview"
)

def perform_ocr_with_vision(case_id: str, doc_id: str, file_path: str) -> str:
    logger.info(f"Starting OCR + Vision analysis for document ID: {doc_id}")

    # Step 1: Azure Document Intelligence (FIXED)
    with open(file_path, "rb") as f:
        poller = di_client.begin_analyze_document(
            model_id="prebuilt-layout",
            body=f
        )
        result = poller.result()

    # Step 2: PyMuPDF rendering
    pdf_doc = fitz.open(file_path)
    whole_text = ""

    for page_num in range(len(pdf_doc)):
        page = pdf_doc[page_num]
        di_page = result.pages[page_num]

        extracted_text = ""
        if di_page.lines:
            extracted_text = "\n".join([line.content for line in di_page.lines])

        whole_text += extracted_text + "\n\n"

        zoom = 2.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)

        img_bytes = pix.tobytes("jpeg")
        base64_image = base64.b64encode(img_bytes).decode("utf-8")

        try:
            response = azure_client.chat.completions.create(
                model=settings.AZURE_DEPLOYMENT_NAME,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": SIGNATURE_STAMP_PROMPT},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=300,
                temperature=0.0
            )
            signature_stamp = response.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(f"Vision analysis failed for page {page_num + 1}: {e}")
            signature_stamp = "Vision analysis failed"

        insert_ocr_page(
            case_id,
            doc_id,
            file_path,
            page_num + 1,
            extracted_text,
            signature_stamp
        )

    pdf_doc.close()
    logger.info(f"OCR + Vision analysis completed for document ID: {doc_id}")
    return whole_text.strip()
