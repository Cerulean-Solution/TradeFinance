import pyodbc
from configures.config import Config

def get_connection():
    conn_str = (
        f"DRIVER={Config.SQL_DRIVER};"
        f"SERVER={Config.SQL_SERVER};"
        f"DATABASE={Config.SQL_DATABASE};"
        f"UID={Config.SQL_USERNAME};"
        f"PWD={Config.SQL_PASSWORD};"
        "TrustServerCertificate=yes;"
    )
    return pyodbc.connect(conn_str)
def fetch_all(query: str, params: tuple = ()):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(query, params)

        columns = [column[0] for column in cursor.description]
        rows = cursor.fetchall()

        return [dict(zip(columns, row)) for row in rows]

    finally:
        conn.close()





def get_connection_OCR():
    conn_str = (
         f"DRIVER={Config.SQL_DRIVER};"
        f"SERVER={Config.SQL_SERVER};"
        f"DATABASE={Config.DB_DATABASE};"
        f"UID={Config.SQL_USERNAME};"
        f"PWD={Config.SQL_PASSWORD};"
        "TrustServerCertificate=yes;"
    )
    return pyodbc.connect(conn_str)
       