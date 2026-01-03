"""
Database operations for Document Checklist (SQL Server)
Enhanced version with AI document import capability
"""
import os
import pandas as pd
import pyodbc
import json
import requests
from typing import Optional, Dict
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DB_SERVER = os.getenv('DB_SERVER', 'localhost')
DB_NAME = os.getenv('DB_NAME', 'tf_genie')
DB_USER = os.getenv('DB_USER', 'sa')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')
DB_TIMEOUT = int(os.getenv('DB_TIMEOUT', '30'))

# Azure OpenAI configuration (using direct API endpoint)
AZURE_OPENAI_ENDPOINT = os.getenv('AZURE_OPENAI_ENDPOINT', '').strip('"')
AZURE_OPENAI_API_KEY = os.getenv('AZURE_OPENAI_API_KEY', '').strip('"')

def get_connection():
    """Create and return a database connection"""
    conn_str = (
        f'DRIVER={{ODBC Driver 17 for SQL Server}};'
        f'SERVER={DB_SERVER};'
        f'DATABASE={DB_NAME};'
        f'UID={DB_USER};'
        f'PWD={DB_PASSWORD};'
        f'Connection Timeout={DB_TIMEOUT};'
    )
    return pyodbc.connect(conn_str)

def get_all_documents() -> pd.DataFrame:
    """Get all documents with calculated Fully Compliant status and progress counts - DESCENDING ORDER"""
    conn = get_connection()
    query = """
        SELECT 
            d.DocsNeededID,
            d.SampleNo,
            d.Description,
            ISNULL(d.LCType, 'Sight') AS LCType,
            d.Commodity,
            COUNT(dt.DetailID) AS TotalItems,
            SUM(
                CASE 
                    WHEN cd.Checked = 1 THEN 1 
                    ELSE 0 
                END
            ) AS CheckedItems,
            CASE 
                WHEN COUNT(dt.DetailID) = 0 THEN 'N'
                WHEN COUNT(dt.DetailID) = SUM(
                    CASE 
                        WHEN cd.Checked = 1 THEN 1 
                        ELSE 0 
                    END
                ) THEN 'Y'
                ELSE 'N'
            END AS FullyCompliant
        FROM tf_docs_needed d
        LEFT JOIN tf_docs_needed_detail dt ON d.DocsNeededID = dt.DocsNeededID
        LEFT JOIN tf_master_check mc ON d.DocsNeededID = mc.DocsNeededID
        LEFT JOIN tf_master_check_detail cd ON mc.CheckID = cd.CheckID AND dt.DetailID = cd.DetailID
        GROUP BY d.DocsNeededID, d.SampleNo, d.Description, d.LCType, d.Commodity
        ORDER BY d.DocsNeededID DESC
    """
    df = pd.read_sql(query, conn)
    conn.close()
    # Rename columns to match app expectations (camelCase)
    df.columns = ['docsNeededId', 'sampleNo', 'description', 'lcType', 'commodity', 'totalItems', 'checkedItems', 'fullyCompliant']
    return df

def get_document_details(docs_needed_id: int, user_id: str = 'default_user') -> pd.DataFrame:
    """Get details for a specific document"""
    conn = get_connection()
    query = """
        SELECT 
            dt.DetailID,
            dt.DocsNeededID,
            dt.[LineNo],
            dt.DocumentText
        FROM tf_docs_needed_detail dt
        WHERE dt.DocsNeededID = ? 
        ORDER BY dt.[LineNo]
    """
    df = pd.read_sql(query, conn, params=(docs_needed_id,))
    conn.close()
    # Rename columns to match app expectations
    df.columns = ['detailId', 'docsNeededId', 'lineNo', 'documentText']
    return df

def get_or_create_master_check(user_id: str, docs_needed_id: int) -> int:
    """
    Get or create a master check record for a user and document
    Returns the CheckID
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    # Check if master check exists
    cursor.execute("""
        SELECT CheckID FROM tf_master_check 
        WHERE UserID = ? AND DocsNeededID = ?
    """, (user_id, docs_needed_id))
    
    result = cursor.fetchone()
    
    if result:
        check_id = result[0]
    else:
        # Create new master check
        cursor.execute("""
            INSERT INTO tf_master_check (UserID, DocsNeededID, Status, StartedAt, UpdatedAt)
            VALUES (?, ?, 'In Progress', GETDATE(), GETDATE())
        """, (user_id, docs_needed_id))
        conn.commit()
        
        # Get the inserted ID
        cursor.execute("SELECT @@IDENTITY")
        check_id = int(cursor.fetchone()[0])
    
    conn.close()
    return check_id

def initialize_check_details(user_id: str, docs_needed_id: int):
    """Initialize check detail records for all document details"""
    check_id = get_or_create_master_check(user_id, docs_needed_id)
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Get all detail IDs for this document
    cursor.execute(
        "SELECT DetailID FROM tf_docs_needed_detail WHERE DocsNeededID = ?",
        (docs_needed_id,)
    )
    detail_ids = [row[0] for row in cursor.fetchall()]
    
    # For each detail, create a check detail if it doesn't exist
    for detail_id in detail_ids:
        cursor.execute("""
            IF NOT EXISTS (SELECT 1 FROM tf_master_check_detail WHERE CheckID = ? AND DetailID = ?)
            BEGIN
                INSERT INTO tf_master_check_detail 
                (CheckID, DetailID, Checked, Narration, Description, UpdatedAt)
                VALUES (?, ?, 0, NULL, NULL, GETDATE())
            END
        """, (check_id, detail_id, check_id, detail_id))
    
    conn.commit()
    conn.close()

def get_check_detail(user_id: str, docs_needed_id: int, detail_id: int) -> Optional[Dict]:
    """Get check detail for a specific user, document, and detail item"""
    check_id = get_or_create_master_check(user_id, docs_needed_id)
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT CheckDetailID, CheckID, DetailID, Checked, Narration, Description, UpdatedAt
        FROM tf_master_check_detail 
        WHERE CheckID = ? AND DetailID = ?
    """, (check_id, detail_id))
    result = cursor.fetchone()
    conn.close()
    
    if result:
        return {
            "checkDetailId": result[0],
            "checkId": result[1],
            "detailId": result[2],
            "checked": result[3],
            "narration": result[4],
            "description": result[5],
            "updatedAt": result[6]
        }
    return None

def upsert_check_detail(user_id: str, docs_needed_id: int, detail_id: int, checked: int, 
                       narration: Optional[str] = None, 
                       description: Optional[str] = None):
    """Insert or update check detail"""
    check_id = get_or_create_master_check(user_id, docs_needed_id)
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Use MERGE for upsert in SQL Server
    cursor.execute("""
        MERGE tf_master_check_detail AS target
        USING (SELECT ? AS CheckID, ? AS DetailID) AS source
        ON target.CheckID = source.CheckID AND target.DetailID = source.DetailID
        WHEN MATCHED THEN
            UPDATE SET 
                Checked = ?,
                Narration = ?,
                Description = ?,
                UpdatedAt = GETDATE()
        WHEN NOT MATCHED THEN
            INSERT (CheckID, DetailID, Checked, Narration, Description, UpdatedAt)
            VALUES (?, ?, ?, ?, ?, GETDATE());
    """, (check_id, detail_id, checked, narration, description, check_id, detail_id, checked, narration, description))
    
    conn.commit()
    conn.close()

def get_all_check_details(user_id: str, docs_needed_id: int) -> pd.DataFrame:
    """Get all check details for a document"""
    check_id = get_or_create_master_check(user_id, docs_needed_id)
    
    conn = get_connection()
    query = """
        SELECT 
            cd.DetailID,
            cd.Checked,
            cd.Narration,
            cd.Description
        FROM tf_master_check_detail cd
        WHERE cd.CheckID = ?
        ORDER BY cd.DetailID
    """
    df = pd.read_sql(query, conn, params=(check_id,))
    conn.close()
    
    df.columns = ['detailId', 'checked', 'narration', 'description']
    return df

# ============= AI Document Import Functions =============

def get_next_sample_no() -> int:
    """Get the next available sample number"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT ISNULL(MAX(SampleNo), 0) + 1 FROM tf_docs_needed")
    next_no = cursor.fetchone()[0]
    conn.close()
    return next_no

def parse_document_with_ai(text: str) -> Dict:
    """
    Use Azure OpenAI to parse document text and extract structured information
    Uses direct REST API call to Azure OpenAI endpoint
    Returns: {
        'description': str,
        'lcType': str or None,
        'commodity': str or None,
        'subDocuments': List[str]
    }
    """
    if not AZURE_OPENAI_ENDPOINT or not AZURE_OPENAI_API_KEY:
        raise ValueError("Azure OpenAI credentials not configured. Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in .env file")
    
    system_prompt = """You are a document parsing assistant. Parse the provided text and extract:
        1. The first line as the document description (may contain format like "46A Documents - Electronics - Mobile Phones" or "Additional Documents")
        2. Extract LC Type and Commodity from the description if present (common LC types: Sight, Usance, Transferable, Red Clause)
        3. All subsequent non-empty lines as sub-documents

        Return JSON in this exact format:
        {
        "description": "full description text from first line",
        "lcType": "extracted LC type or null",
        "commodity": "extracted commodity or null",
        "subDocuments": ["line1", "line2", ...]
        }

        Important: 
        - If LC Type is mentioned in the description, extract it (e.g., "Sight LC" -> "Sight")
        - If commodity is mentioned, extract it (e.g., "Electronics - Mobile Phones" -> "Electronics")
        - Each sub-document should be a separate line item
        - Remove empty lines from sub-documents"""
    
    headers = {
        "Content-Type": "application/json",
        "api-key": AZURE_OPENAI_API_KEY
    }
    
    payload = {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.3,
        "max_tokens": 2000
    }
    
    response = requests.post(AZURE_OPENAI_ENDPOINT, headers=headers, json=payload)
    response.raise_for_status()
    
    result_json = response.json()
    content = result_json['choices'][0]['message']['content']
    result = json.loads(content)
    
    return result

def insert_document(sample_no: int, description: str, lc_type: Optional[str], commodity: Optional[str],user_id: Optional[int],) -> int:
    """
    Insert a new document into tf_docs_needed
    Returns: DocsNeededID of the inserted document
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO tf_docs_needed (SampleNo, Description, LCType, Commodity,UserID)
        VALUES (?, ?, ?, ?,?)
    """, (sample_no, description, lc_type, commodity,user_id))
    conn.commit()
    
    # Get the inserted ID
    cursor.execute("SELECT @@IDENTITY")
    docs_needed_id = int(cursor.fetchone()[0])
    
    conn.close()
    return docs_needed_id

def insert_document_details(docs_needed_id: int, sub_documents: list,user_id: Optional[int]) -> int:
    """
    Insert sub-documents into tf_docs_needed_detail
    Returns: Number of details inserted
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    for line_no, doc_text in enumerate(sub_documents, start=1):
        cursor.execute("""
            INSERT INTO tf_docs_needed_detail
(DocsNeededID, [LineNo], DocumentText, UserID)
VALUES (?, ?, ?, ?)

        """, (docs_needed_id, line_no, doc_text,user_id))
    
    conn.commit()
    conn.close()
    return len(sub_documents)

def delete_document(docs_needed_id: int):
    """
    Delete document and all related records from all 4 tables
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Delete from tf_master_check_detail first (foreign key constraint)
        cursor.execute("""
            DELETE cd FROM tf_master_check_detail cd
            INNER JOIN tf_master_check mc ON cd.CheckID = mc.CheckID
            WHERE mc.DocsNeededID = ?
        """, (docs_needed_id,))
        
        # Delete from tf_master_check
        cursor.execute("""
            DELETE FROM tf_master_check WHERE DocsNeededID = ?
        """, (docs_needed_id,))
        
        # Delete from tf_docs_needed_detail
        cursor.execute("""
            DELETE FROM tf_docs_needed_detail WHERE DocsNeededID = ?
        """, (docs_needed_id,))
        
        # Delete from tf_docs_needed
        cursor.execute("""
            DELETE FROM tf_docs_needed WHERE DocsNeededID = ?
        """, (docs_needed_id,))
        
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def analyze_and_import_document(text: str, user_id: Optional[int]) -> Dict:
    """
    Main function to analyze document text with AI and import into database
    Returns: {
        'docs_needed_id': int,
        'sample_no': int,
        'description': str,
        'detail_count': int
    }
    """
    # Parse with AI
    parsed = parse_document_with_ai(text)
    
    # Get next sample number
    sample_no = get_next_sample_no()
    
    # Insert document (default LC Type to 'Sight' if not found)
    docs_needed_id = insert_document(
        sample_no=sample_no,
        description=parsed['description'],
        lc_type=parsed.get('lcType') or 'Sight',
        commodity=parsed.get('commodity'),
        user_id=user_id
    )
    
    # Insert sub-documents
    detail_count = insert_document_details(docs_needed_id, parsed['subDocuments'], user_id)
    
    return {
        'docs_needed_id': docs_needed_id,
        'sample_no': sample_no,
        'description': parsed['description'],
        'detail_count': detail_count
    }
