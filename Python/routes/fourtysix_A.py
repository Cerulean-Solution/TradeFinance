# """
# Document Checklist Application (SQL Server)
# Enhanced version with AI Document Import and compact UI
# """
# import streamlit as st
# import pandas as pd
# from database import (
#     get_all_documents,
#     get_document_details,
#     get_check_detail,
#     upsert_check_detail,
#     initialize_check_details,
#     get_all_check_details,
#     analyze_and_import_document,
#     delete_document
# )

# # Page configuration
# st.set_page_config(
#     page_title="Document Checklist",
#     page_icon="📋",
#     layout="wide"
# )

# # Custom CSS for styling
# st.markdown("""
# <style>
#     .badge {
#         display: inline-block;
#         padding: 0.2rem 0.5rem;
#         font-size: 0.8rem;
#         font-weight: 600;
#         line-height: 1;
#         text-align: center;
#         white-space: nowrap;
#         vertical-align: baseline;
#         border-radius: 0.3rem;
#     }
#     .badge-sight {
#         background-color: #3b82f6;
#         color: white;
#     }
#     .badge-usance {
#         background-color: #8b5cf6;
#         color: white;
#     }
#     .badge-transferable {
#         background-color: #10b981;
#         color: white;
#     }
#     .badge-red-clause {
#         background-color: #ef4444;
#         color: white;
#     }
#     .stTextInput > div > div > input {
#         padding: 0.3rem 0.5rem;
#         font-size: 0.9rem;
#     }
#     .stCheckbox {
#         padding: 0;
#         margin: 0;
#     }
# </style>
# """, unsafe_allow_html=True)

# # Initialize session state
# if 'selected_doc' not in st.session_state:
#     st.session_state.selected_doc = None

# def show_ai_import_section():
#     """Display AI Document Import section - STATIC (always visible)"""
#     st.markdown("### ✨ AI Document Import")
#     st.markdown("""
#     Paste document text from "Additional Documents" or "46A" field. 
#     The AI will automatically extract the description and sub-documents.
#     """)
    
#     document_text = st.text_area(
#         "Document Text",
#         height=120,
#         placeholder="""Example:
# 46A Documents - Electronics - Mobile Phones
# Commercial Invoice in 3 copies
# Packing List in 2 copies
# Certificate of Origin
# Bill of Lading""",
#         help="First line will be the document description, subsequent lines will be sub-documents",
#         key="doc_import_text"
#     )
    
#     col1, col2, col3 = st.columns([2, 2, 8])
#     with col1:
#         if st.button("🔍 Analyze & Import", type="primary", use_container_width=True):
#             if document_text.strip():
#                 with st.spinner("Analyzing document with AI..."):
#                     try:
#                         result = analyze_and_import_document(document_text)
#                         st.success(f"✅ Successfully imported: **{result['description']}** with {result['detail_count']} sub-documents")
#                         st.rerun()
#                     except Exception as e:
#                         st.error(f"❌ Error: {str(e)}")
#             else:
#                 st.warning("Please enter document text to analyze")
#     with col2:
#         if document_text.strip():
#             if st.button("Clear", use_container_width=True):
#                 st.rerun()

# def show_documents_list():
#     """Display list of documents"""
#     st.title("📋 Document Checklist")
#     st.markdown("Select a document to view its checklist and manage your progress")
    
#     # AI Import Section
#     show_ai_import_section()
    
#     st.markdown("---")
    
#     # Get all documents
#     documents = get_all_documents()
    
#     if documents.empty:
#         st.warning("No documents found in the database.")
#         return
    
#     st.subheader("Documents")
    
#     # Display column headers with reduced padding
#     header_cols = st.columns([0.5, 1.5, 4, 1.5, 2.5, 1, 1, 2])
#     with header_cols[0]:
#         st.markdown('<div style="font-size: 18px;"><strong>#</strong></div>', unsafe_allow_html=True)
#     with header_cols[1]:
#         st.markdown('<div style="font-size: 18px;"><strong>Sample</strong></div>', unsafe_allow_html=True)
#     with header_cols[2]:
#         st.markdown('<div style="font-size: 18px;"><strong>Description</strong></div>', unsafe_allow_html=True)
#     with header_cols[3]:
#         st.markdown('<div style="font-size: 18px;"><strong>LC Type</strong></div>', unsafe_allow_html=True)
#     with header_cols[4]:
#         st.markdown('<div style="font-size: 18px;"><strong>Commodity</strong></div>', unsafe_allow_html=True)
#     with header_cols[5]:
#         st.markdown('<div style="font-size: 18px;"><strong>Status</strong></div>', unsafe_allow_html=True)
#     with header_cols[6]:
#         st.markdown('<div style="font-size: 18px;"><strong>Progress</strong></div>', unsafe_allow_html=True)
#     with header_cols[7]:
#         st.markdown('<div style="font-size: 18px;"><strong>Actions</strong></div>', unsafe_allow_html=True)
    
#     st.markdown('<hr style="margin: 0.3rem 0; border-color: #ccc;">', unsafe_allow_html=True)
    
#     # Display documents in a table-like format with tighter spacing
#     # Calculate descending row numbers
#     total_docs = len(documents)
#     for idx, doc in documents.iterrows():
#         # Descending row number
#         row_num = total_docs - idx
        
#         # Determine row background color based on Fully Compliant status
#         fully_compliant = doc.get('fullyCompliant', 'N')
#         if fully_compliant == 'Y':
#             row_bg_color = '#d4edda'  # Light green
#             row_border_color = '#c3e6cb'
#         elif fully_compliant == 'N':
#             row_bg_color = '#fff3cd'  # Light orange/yellow
#             row_border_color = '#ffeaa7'
#         else:
#             row_bg_color = '#f9f9f9'  # Default gray
#             row_border_color = '#e0e0e0'
        
#         # Create a container with colored background and minimal padding
#         st.markdown(f'<div style="background-color: {row_bg_color}; border: 1px solid {row_border_color}; border-radius: 4px; padding: 0.25rem 0.5rem; margin-bottom: 0.2rem;">', unsafe_allow_html=True)
        
#         # Create columns for document row
#         cols = st.columns([0.5, 1.5, 4, 1.5, 2.5, 1, 1, 2])
        
#         with cols[0]:
#             st.markdown(f'<div style="font-size: 18px; line-height: 1.2; padding: 0;"><strong>{row_num}</strong></div>', unsafe_allow_html=True)
        
#         with cols[1]:
#             st.markdown(f'<span class="badge badge-sight" style="font-size: 18px; padding: 0.2rem 0.5rem;">{doc["sampleNo"]}</span>', unsafe_allow_html=True)
        
#         with cols[2]:
#             st.markdown(f'<div style="font-size: 18px; line-height: 1.2; padding: 0;">{doc["description"]}</div>', unsafe_allow_html=True)
        
#         with cols[3]:
#             lc_type = doc["lcType"] if pd.notna(doc["lcType"]) else "Sight"
#             badge_class = f"badge-{lc_type.lower().replace(' ', '-')}"
#             st.markdown(f'<span class="badge {badge_class}" style="font-size: 18px; padding: 0.2rem 0.5rem;">{lc_type}</span>', unsafe_allow_html=True)
        
#         with cols[4]:
#             st.markdown(f'<div style="font-size: 18px; line-height: 1.2; padding: 0;">{doc["commodity"] if pd.notna(doc["commodity"]) else ""}</div>', unsafe_allow_html=True)
        
#         with cols[5]:
#             if fully_compliant == 'Y':
#                 st.markdown('✅')
#             else:
#                 st.markdown('❌')
        
#         with cols[6]:
#             # Display progress (checked/total)
#             checked = int(doc['checkedItems']) if pd.notna(doc['checkedItems']) else 0
#             total = int(doc['totalItems']) if pd.notna(doc['totalItems']) else 0
#             st.markdown(f'<div style="font-size: 18px; line-height: 1.2;"><strong>{checked}/{total}</strong></div>', unsafe_allow_html=True)
        
#         with cols[7]:
#             btn_col1, btn_col2 = st.columns(2)
#             with btn_col1:
#                 if st.button("View", key=f"view_{doc['docsNeededId']}", use_container_width=True):
#                     st.session_state.selected_doc = doc['docsNeededId']
#                     st.rerun()
#             with btn_col2:
#                 if st.button("🗑️", key=f"delete_{doc['docsNeededId']}", use_container_width=True, help="Delete document"):
#                     try:
#                         delete_document(doc['docsNeededId'])
#                         st.success(f"Deleted: {doc['description']}")
#                         st.rerun()
#                     except Exception as e:
#                         st.error(f"Error deleting: {str(e)}")
        
#         st.markdown('</div>', unsafe_allow_html=True)

# def show_document_details():
#     """Display document details with checklist"""
#     doc_id = st.session_state.selected_doc
#     user_id = "default_user"  # In production, get from authentication
    
#     # Initialize check details
#     initialize_check_details(user_id, doc_id)
    
#     # Get document info
#     documents = get_all_documents()
#     doc_info = documents[documents['docsNeededId'] == doc_id].iloc[0] if not documents.empty else None
    
#     # Get document details
#     details = get_document_details(doc_id, user_id)
#     check_details = get_all_check_details(user_id, doc_id)
    
#     # Merge details with check details
#     merged = pd.merge(details, check_details, on='detailId', how='left')
#     merged['checked'] = merged['checked'].fillna(0).astype(int)
#     merged['narration'] = merged['narration'].fillna('')
    
#     # Back button
#     if st.button("← Back to Documents"):
#         st.session_state.selected_doc = None
#         st.rerun()
    
#     st.title("📄 Document Details")
    
#     # Display document description
#     if doc_info is not None:
#         st.markdown(f"### {doc_info['description']}")
#         info_cols = st.columns(4)
#         with info_cols[0]:
#             st.markdown(f"**Sample No:** {doc_info['sampleNo']}")
#         with info_cols[1]:
#             st.markdown(f"**LC Type:** {doc_info['lcType'] if pd.notna(doc_info['lcType']) else 'Sight'}")
#         with info_cols[2]:
#             st.markdown(f"**Commodity:** {doc_info['commodity'] if pd.notna(doc_info['commodity']) else 'N/A'}")
#         with info_cols[3]:
#             compliant_status = '✅ Yes' if doc_info['fullyCompliant'] == 'Y' else '❌ No'
#             st.markdown(f"**Fully Compliant:** {compliant_status}")
#         st.markdown('<hr style="margin: 0.8rem 0; border-color: #ccc;">', unsafe_allow_html=True)
    
#     st.subheader("Sub Documents")
    
#     # Display column headers with reduced spacing
#     header_cols = st.columns([4, 0.8, 4])
#     with header_cols[0]:
#         st.markdown("**Sub Document**")
#     with header_cols[1]:
#         st.markdown("**✓**")
#     with header_cols[2]:
#         st.markdown("**Narration**")
    
#     st.markdown('<hr style="margin: 0.3rem 0; border-color: #ccc;">', unsafe_allow_html=True)
    
#     # Display each detail item with minimal spacing
#     for idx, row in merged.iterrows():
#         # Create a container for each row with minimal spacing
#         cols = st.columns([4, 0.8, 4])
        
#         with cols[0]:
#             st.markdown(f'<div style="font-size: 0.9rem; padding: 0.2rem 0;">Line {row["lineNo"]}: {row["documentText"]}</div>', unsafe_allow_html=True)
        
#         with cols[1]:
#             checked = st.checkbox(
#                 "",
#                 value=bool(row['checked']),
#                 key=f"check_{row['detailId']}",
#                 label_visibility="collapsed"
#             )
        
#         with cols[2]:
#             narration = st.text_input(
#                 "",
#                 value=row['narration'],
#                 key=f"narr_{row['detailId']}",
#                 placeholder="Add notes...",
#                 label_visibility="collapsed"
#             )
        
#         # Auto-save on change
#         if checked != bool(row['checked']) or narration != row['narration']:
#             upsert_check_detail(
#                 user_id=user_id,
#                 docs_needed_id=doc_id,
#                 detail_id=row['detailId'],
#                 checked=1 if checked else 0,
#                 narration=narration if narration else None
#             )
        
#         # Add thin divider with reduced spacing
#         st.markdown('<hr style="margin: 0.15rem 0; border-color: #e0e0e0; border-width: 0.5px;">', unsafe_allow_html=True)

# def main():
#     """Main application entry point"""
#     if st.session_state.selected_doc is None:
#         show_documents_list()
#     else:
#         show_document_details()

# if __name__ == "__main__":
#     main()



# backend/app.py
from fastapi import FastAPI, HTTPException,APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
from typing import Optional


# Import your existing database functions
from Fourty_six_A.database import (
    get_all_documents,
    get_document_details,
    get_check_detail,
    upsert_check_detail,
    initialize_check_details,
    get_all_check_details,
    analyze_and_import_document,
    delete_document
)

app = FastAPI(title="Document Checklist API")

# Allow CORS for React frontend
origins = [
    "http://localhost:5173",  # your React dev server
    "http://localhost:3000",  # if you serve frontend on 3000
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(
    prefix="/api/lc",
    tags=["FoutySixA"]
)


# Pydantic models
class DocumentImportRequest(BaseModel):
    document_text: str
    user_id: Optional[int] = None


class UpdateDetailRequest(BaseModel):
    detailId: int
    checked: bool
    narration: str | None = None
    


# ====== Endpoints ======

@router.get("/documents")
def list_documents():
    df = get_all_documents()
    print("Fetched documents:", df)
    return df.to_dict(orient="records")


@router.get("/documents/{doc_id}/details")
def document_details(doc_id: int):
    user_id = "default_user"  # Replace with actual auth user
    initialize_check_details(user_id, doc_id)
    
    details = get_document_details(doc_id, user_id)
    check_details = get_all_check_details(user_id, doc_id)
    
    merged = pd.merge(details, check_details, on="detailId", how="left")
    merged['checked'] = merged['checked'].fillna(0).astype(int)
    merged['narration'] = merged['narration'].fillna('')
    
    return merged.to_dict(orient="records")


@router.post("/analyze")
def analyze_document(request: DocumentImportRequest):
    if not request.document_text.strip():
        raise HTTPException(status_code=400, detail="Document text is empty")
    result = analyze_and_import_document(
        text=request.document_text,
        user_id=request.user_id)
    return {
        "description": result["description"], 
        "detail_count": result["detail_count"]}


@router.post("/documents/{doc_id}/update")
def update_document_check(doc_id: int, payload: UpdateDetailRequest):
    user_id = "default_user"
    upsert_check_detail(
        user_id=user_id,
        docs_needed_id=doc_id,
        detail_id=payload.detailId,
        checked=1 if payload.checked else 0,
        narration=payload.narration
    )
    return {"status": "ok"}


@router.delete("/documents/{doc_id}")
def delete_doc(doc_id: int):
    try:
        delete_document(doc_id)
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
