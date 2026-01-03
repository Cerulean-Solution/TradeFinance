"""
Database Access Layer for Trade Finance Converter
SQL Server connection and query methods
"""

import os
import pyodbc
import json
import logging
import time
import traceback
from typing import List, Dict, Optional
from dotenv import load_dotenv
from MTConverter.db_logger import get_app_logger, DBLogger
from utils.txn_generator import generate_unique_transaction_no
from core.db import get_connection
load_dotenv()
logger = get_app_logger("trade-finance-db")

class TradeFinanceDB:
    """SQL Server database access layer"""
    
    def __init__(self):
        """Initialize database connection"""
        # self.connection_string = self._build_connection_string()
        self.connection = None
        # self.tf_logger = None
    
    # ------------------------------------------------------------------
    # Connection Handling
    # ------------------------------------------------------------------   
    # def _build_connection_string(self) -> str:
        
    #     conn_str = os.getenv("SQL_SERVER_CONNECTION_STRING")
    #     if conn_str:
    #         return conn_str
        
    #     driver = os.getenv("SQL_SERVER_DRIVER", "ODBC Driver 17 for SQL Server")
    #     server = os.getenv("DB_SERVER") or os.getenv("SQL_SERVER_HOST", "localhost")
    #     port = os.getenv("SQL_SERVER_PORT", "1433")
    #     database = os.getenv("DB_NAME") or os.getenv("SQL_SERVER_DATABASE", "TradeFinanceDB")
    #     username = os.getenv("DB_USER") or os.getenv("SQL_SERVER_USERNAME", "sa")
    #     password = os.getenv("DB_PASSWORD") or os.getenv("SQL_SERVER_PASSWORD", "")
        
    #     return f"Driver={{{driver}}};Server={server},{port};Database={database};UID={username};PWD={password};"
    
    def connect(self):
        """Get DB connection from db.py"""
        self.connection = get_connection()
        return self.connection
    # def connect(self) -> pyodbc.Connection:
    #     return pyodbc.connect(
    #         self.connection_string,
    #         autocommit=False,
    #         timeout=5
    #     )

    # def disconnect(self):
    #     """Close database connection"""
    #     if self.connection and not self.connection.closed:
    #         self.connection.close()
    #         logger.info("Database connection closed")
    #         self.connection = None
    def disconnect(self):
        """Close DB connection safely"""
        if self.connection:
            try:
                self.connection.close()
            finally:
                self.connection = None
    
    # ------------------------------
    # Query Helpers
    # ------------------------------
    # def execute_query(self, query: str, params: tuple = ()) -> List[Dict]:
    #     try:
    #         with self.connect() as conn:
    #             with conn.cursor() as cursor:
    #                 cursor.execute(query, params)

    #                 if cursor.description is None:
    #                     return []

    #                 columns = [col[0] for col in cursor.description]
    #                 rows = cursor.fetchall()
    #                 return [dict(zip(columns, row)) for row in rows]

    #     except Exception as e:
    #         logger.error(f"Query failed: {e}\n{traceback.format_exc()}")
    #         raise
    def execute_query(self, query: str, params: tuple = ()) -> List[Dict]:
        conn = self.connect()
        cursor = conn.cursor()
        try:
            cursor.execute(query, params)

            if cursor.description is None:
                return []

            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
            return [dict(zip(columns, row)) for row in rows]

        except Exception as e:
            logger.error(f"Query failed: {e}\n{traceback.format_exc()}")
            raise
        finally:
            cursor.close()
            self.disconnect()


    def execute_non_query(self, query: str, params: tuple = ()) -> int:
        try:
            conn = self.connect()
            cursor = conn.cursor()
            cursor.execute(query, params)
            affected = cursor.rowcount
            conn.commit()
            cursor.close()
            return affected
        except Exception as e:
            logger.error(f"Non-query failed: {e}\n{traceback.format_exc()}")
            if self.db_logger:
                self.db_logger.error(
                    error_type="DB_NON_QUERY_ERROR",
                    error_category="DATABASE",
                    error=e,
                    user_id=None,
                    ip_address=None,
                    request_data={"query": query, "params": params},
                    system_info={"module": "TradeFinanceDB"},
                )
            conn.rollback()
            raise

    def execute_scalar(self, query: str, params: tuple = None):
        try:
            with self.connect() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(query, params or ())
                    row = cursor.fetchone()
                    return row[0] if row else None
        except Exception as e:
            logger.error(f"Scalar query error: {e}")
            raise

    def execute_sp(self, sp_name: str, params: tuple = ()) -> List[Dict]:
        placeholders = ",".join("?" for _ in params)
        sql = f"EXEC {sp_name} {placeholders}" if placeholders else f"EXEC {sp_name}"
        return self.execute_query(sql, params)

    # ========================================================================
    # INSTRUMENT ,LIFECYCLE ,VARIATION METHODS
    # ========================================================================

    def get_all_instruments(self) -> List[Dict]:
      return self.execute_sp("conv_sp_get_all_instruments")

    def get_lifecycles_for_instrument(self, instrument_code: str) -> List[Dict]:
        return self.execute_sp("conv_sp_get_lifecycles_for_instrument", (instrument_code,))

    def get_variations_for_instrument(self, instrument_code: str) -> List[Dict]:
      return self.execute_sp("conv_sp_get_variations_for_instrument", (instrument_code,))

    # ========================================================================
    # SAMPLE APPLICATION METHODS
    # ========================================================================
    
    def get_sample_application(self, instrument_code: str, lifecycle_code: str, 
                           variation_code: Optional[str] = None) -> Optional[Dict]:
        query = "EXEC dbo.conv_sp_GetSampleApplication @instrument_code = ?, @lifecycle_code = ?, @variation_code = ?"
        results = self.execute_query(query, (instrument_code, lifecycle_code, variation_code))
        return results[0] if results else None

    def save_sample_application(self, instrument_code: str, lifecycle_code: str,
                                variation_code: Optional[str], sample_name: str,
                                application_text: str, file_path: Optional[str] = None) -> int:
        query = "EXEC dbo.conv_SaveSampleApplication ?, ?, ?, ?, ?, ?"
        params = (instrument_code, lifecycle_code, variation_code, sample_name, application_text, file_path)
        
        return self.execute_non_query(query, params)

    # ========================================================================
    # CONVERSION HISTORY METHODS
    # ========================================================================
    def get_recent_conversions(self, top: int = 5):
        query = f"""
            SELECT TOP {top} *
            FROM [TF_genie].[dbo].[conv_conversion_history]
            ORDER BY conversion_id DESC
        """
        rows = self.execute_query(query)  
        for row in rows:
            print(row)
        return rows 

    def save_conversion(
        self,
        instrument_code,
        lifecycle_code,
        variation_code,
        application_text,
        extracted_data,
        mt_message,
        mt_message_type,
        conversion_status,
        error_message,
        processing_time_ms,
        user_id=None,
        cifno=None,
        transaction_no=None
    ):
        conn = None
        cursor = None
        try:
            params = (
                instrument_code,
                lifecycle_code,
                variation_code,
                json.dumps(extracted_data) if extracted_data else None,
                application_text,
                mt_message,
                mt_message_type,
                conversion_status,
                error_message,
                processing_time_ms,
                user_id,
                cifno,                                          
                transaction_no  
            )
            query = "EXEC dbo.conv_SaveConversion ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?"
            conn = self.connect()
            cursor = conn.cursor()
            cursor.execute(query, params)
            row = cursor.fetchone()
            if not row:
                raise RuntimeError("conv_SaveConversion did not return conversion_id")

            conversion_id = row[0]
            conn.commit()
            return conversion_id

        except Exception as e:
            logger.error(f"Save conversion failed: {e}\n{traceback.format_exc()}")
            if conn:
                conn.rollback()

            if self.db_logger:
                self.db_logger.error(
                    error_type="CONVERSION_SAVE_ERROR",
                    error_category="BUSINESS",
                    error=e,
                    user_id=user_id,
                    ip_address=None,
                    request_data={"instrument": instrument_code,"transaction_no": transaction_no},
                    system_info={"module": "save_conversion"}
                )
            return -1

        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    # ========================================================================
    # UTILITY METHODS
    # ========================================================================
  
    def get_sample_availability_matrix(self, instrument_code: str) -> Dict:
        query = "EXEC dbo.conv_GetSampleAvailabilityMatrix @instrument_code = ?"
        results = self.execute_query(query, (instrument_code,))
        matrix = {}
        lifecycles = set()
        variations = set()

        for row in results:
            lc = row['lifecycle_code']
            var = row['variation_code']
            count = row['sample_count']

            lifecycles.add((lc, row['lifecycle_name']))
            variations.add((var, row['variation_name']))

            if lc not in matrix:
                matrix[lc] = {}
            matrix[lc][var] = count

        return {
            'matrix': matrix,
            'lifecycles': sorted(list(lifecycles)),
            'variations': sorted(list(variations))
        }
    
    def get_mt_type_for_combination(self, instrument_code: str, lifecycle_code: str, 
                                   variation_code: Optional[str] = None) -> Optional[str]:
        """Get MT message type for specific instrument+lifecycle+variation combination"""
        query = """
            SELECT TOP 1
                imt.mt_message_type
            FROM dbo.conv_Ins_mt imt
            JOIN dbo.conv_instruments i ON imt.instrument_id = i.instrument_id
            JOIN dbo.conv_lifecycle_stages ls ON imt.lifecycle_id = ls.lifecycle_id
            LEFT JOIN dbo.conv_variations v ON imt.variation_id = v.variation_id
            WHERE i.instrument_code = ?
            AND ls.lifecycle_code = ?
            AND (v.variation_code = ? OR imt.variation_id IS NULL)
            ORDER BY CASE WHEN imt.variation_id IS NULL THEN 1 ELSE 0 END
        """
        results = self.execute_query(query, (instrument_code, lifecycle_code, variation_code))
        return results[0]['mt_message_type'] if results else None

    def insert_tool_instrument_sp(
        self,
        lc_number: str,
        cifno: str,
        customer_name: str,
        instrument_type: str,
        lifecycle: str,
        variation_code: str,
        user_id: int,
        main_document: str,
        prompt_text:str,
        status: str,
        model: str
    ):
        conn = self.connect()
        cursor = conn.cursor()
        try:
            transaction_no = generate_unique_transaction_no(conn)

            cursor.execute("""
                EXEC dbo.sp_insert_tool_instrument
                    @transaction_no = ?,
                    @lc_number = ?,
                    @cifno = ?,
                    @customer_name = ?,
                    @instrument_type = ?,
                    @lifecycle = ?,
                    @variation_code = ?,
                    @UserID = ?,
                    @main_document = ?,
                    @prompt_text=?,
                    @status = ?,
                    @Model = ?
            """, (
                transaction_no,
                "",
                cifno,
                customer_name,
                instrument_type,
                lifecycle,
                variation_code,
                user_id,
                main_document,
                prompt_text,
                status,
                model
            ))

            inserted_id = cursor.fetchone()[0]
            conn.commit()
            return {"inserted_id": inserted_id, "transaction_no": transaction_no}
        finally:
            cursor.close()
            self.disconnect()

    def MT_request(self, llm_req):
        conn = self.connect()
        cursor = conn.cursor()
        try:

            cursor.execute("""
                INSERT INTO tool_llm_requests
                (transaction_no, request_payload, token_count, prompt_id, Rag, cifno, lc_number, UserID, Model)
                OUTPUT INSERTED.request_id
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                 llm_req.transaction_no,
            llm_req.request_payload,
            llm_req.request_tokens, 
            llm_req.prompt_id,
            llm_req.Rag,
            llm_req.cifno,
            llm_req.lc_number,
            llm_req.UserID,
            llm_req.Model
            ))
            request_id = cursor.fetchone()[0]
            conn.commit()
            return request_id
        finally:
            cursor.close()
            self.disconnect()

    def MT_response(self, llm_res):
        conn = self.connect()
        cursor = conn.cursor()
        try:
            cursor.execute("""
                INSERT INTO tool_llm_responses
                (transaction_no, request_id, response_payload, token_count, Rag, cifno, lc_number, UserID, Model)
                OUTPUT INSERTED.response_id
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                llm_res.transaction_no,
            llm_res.request_id,
            llm_res.response_payload,
            llm_res.response_tokens,
            llm_res.Rag,
            llm_res.cifno,
            llm_res.lc_number,
            llm_res.UserID,
            llm_res.Model
            ))
            response_id = cursor.fetchone()[0]
            conn.commit()
            return response_id
        finally:
            cursor.close()
            self.disconnect()
  
    def insert_tool_billing_sp(
    self,
    transaction_no: str,
    cifid: str,
    module: str,
    instrument_type: str,
    lifecycle: str,
    lc_number: str,
    variation: str,
    status: str,
    userid: int = None
):
        conn = self.connect()       
        cursor = conn.cursor()    
        try:
            query = """
                EXEC dbo.InsertToolBilling
                    @transaction_no = ?,
                    @cifid = ?,
                    @module = ?,
                    @instrument_type = ?,
                    @lifecycle = ?,
                    @lc_number = ?,
                    @variation = ?,
                    @status = ?,
                    @userid = ?
            """
            params = (
                transaction_no,
                cifid,
                module,
                instrument_type,
                lifecycle,
                lc_number,
                variation,
                status,
                userid
            )
            cursor.execute(query, params)
            row = cursor.fetchone()
            conn.commit()
            return row[0] if row else None
        finally:
            cursor.close()
            conn.close()          

    def insert_tool_instrument_prompt_sp(
    self,
    transaction_no: str,
    cifno: str,
    Rag: str = None,
    prompt_id: int = None,
    prompt_text: str = None,
    status: str = "ACTIVE",
    lc_number: str = None,
    UserID: int = None,
    Model: str = None
):
        conn = self.connect()
        cursor = conn.cursor()
        try:
            query = """
                EXEC dbo.sp_insert_tool_instrument_prompt
                    @transaction_no = ?,
                    @cifno = ?,
                    @Rag = ?,
                    @prompt_id = ?,
                    @prompt_text = ?,
                    @status = ?,
                    @lc_number = ?,
                    @UserID = ?,
                    @Model = ?
            """

            params = (
                transaction_no,
                cifno,
                Rag,
                prompt_id,
                prompt_text,
                status,
                lc_number,
                UserID,
                Model
            )
            cursor.execute(query, params)
            row = cursor.fetchone()
            conn.commit()
            return row[0] if row else None
        finally:
            cursor.close()
            conn.close()

_db_instance = None
def get_db() -> TradeFinanceDB:
    """Get database instance (singleton)"""
    global _db_instance
    if _db_instance is None:
        _db_instance = TradeFinanceDB()
    return _db_instance
