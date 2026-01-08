# appp/config.py
import os
from pydantic_settings import BaseSettings
from pydantic import ConfigDict, Field

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, ".env")


class Settings(BaseSettings):
    # -------------------------------
    # Azure Document Intelligence
    # -------------------------------
    AZURE_DOC_ENDPOINT: str = Field(
        validation_alias="AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT"
    )
    AZURE_DOC_KEY: str = Field(
        validation_alias="AZURE_DOCUMENT_INTELLIGENCE_KEY"
    )
    # -------------------------------
    # Azure OpenAI
    # -------------------------------
    AZURE_OPENAI_ENDPOINT: str
    AZURE_OPENAI_API_KEY: str
    AZURE_OPENAI_CHAT_DEPLOYMENT: str
    AZURE_OPENAI_API_VERSION: str

    # -------------------------------
    # Database Configuration (MSSQL)
    # -------------------------------
    DB_SERVER: str
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str
    DB_PORT: int = 1433
    DB_ENCRYPT: str = "no"
    DB_TRUST_SERVER_CERTIFICATE: str = "yes"

    model_config = ConfigDict(
        env_file=ENV_PATH,
        extra="allow",
        case_sensitive=False
    )


settings = Settings()
print("ENV loaded from:", ENV_PATH)
