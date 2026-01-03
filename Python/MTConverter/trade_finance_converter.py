"""
Trade Finance Converter V2 - SWIFT-Compliant Converter
Converts application text to properly formatted SWIFT MT messages using Azure OpenAI + SWIFT Formatter
"""

import os
import json
import logging
import time
from typing import Dict, Optional, Tuple
from openai import AzureOpenAI
from dotenv import load_dotenv
from  MTConverter.swift_mt700_formatter import SwiftMT700Formatter
from  MTConverter.prompt_loader import load_prompt

load_dotenv()
logger = logging.getLogger(__name__)

class TradeFinanceConverterV2:
    """SWIFT-compliant converter for all trade finance instruments"""
    
    def __init__(self):
        """Initialize Azure OpenAI client and SWIFT formatter"""
        self.client = AzureOpenAI(
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview"),
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
        )
        self.deployment = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT", "gpt-4o")
        self.temperature = float(os.getenv("OPENAI_TEMPERATURE", "0.1"))
        self.max_tokens = int(os.getenv("OPENAI_MAX_TOKENS", "4096"))
        self.swift_formatter = SwiftMT700Formatter()

    def convert(self, application_text: str, instrument_code: str, 
                lifecycle_code: str, mt_message_type: str, 
                variation_code: Optional[str] = None) -> Tuple[str, Dict, int,str]:
        """
        Convert application text to SWIFT-compliant MT message
        
        Args:
            application_text: Input application text
            instrument_code: Instrument code (ILC, ELC, SBLC, etc.)
            lifecycle_code: Lifecycle stage (ISSUE, AMENDMENT, etc.)
            mt_message_type: MT message type (MT700, MT707, MT760, etc.)
            variation_code: Optional variation code
        
        Returns:
            Tuple of (mt_message, extracted_data, processing_time_ms)
        """
        start_time = time.time()
        
        try:
            print("first")
            # Step 1: Extract data from application text using LLM
            extracted_data,llm_prompt_text,llm_request_prompt,extract_tokens = self._extract_data_from_application(
                application_text, instrument_code, lifecycle_code, mt_message_type, variation_code
            )
            print(("hi"))
            # Step 2: Format extracted data into proper SWIFT MT message
            if mt_message_type == "MT700":
                print("mt700")
                mt_message = self.swift_formatter.format_mt700(
                    extracted_data,
                    sender_bic=os.getenv("SENDER_BIC", "GTBNUS33XXX"),
                    receiver_bic=os.getenv("RECEIVER_BIC", "ASIAHKHHXXX")
                )
                print("mt700 found")
                mt_prompt_text = ""  # No MT generation prompt
                gen_tokens = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
            else:
                print("mt generate")
                # For other MT types, fall back to LLM-generated format
                mt_message, llm_prompt_text, gen_tokens  = self._generate_mt_message_llm(
                    extracted_data, mt_message_type
                )
                print("mt_prompt_text :",llm_prompt_text)
                print("mt generated")
            print(("hi1"))
            total_token_usage = {
        "prompt_tokens": extract_tokens["prompt_tokens"] + gen_tokens["prompt_tokens"],
        "completion_tokens": extract_tokens["completion_tokens"] + gen_tokens["completion_tokens"],
        "total_tokens": extract_tokens["total_tokens"] + gen_tokens["total_tokens"]
    }
            

            combined_prompt_payload= (
                "======== EXTRACTION PROMPT ========\n"
                f"{llm_request_prompt}\n\n"
                "=== MT Generation Prompt ===\n"
                f"{llm_request_prompt if llm_request_prompt else '[NOT APPLICABLE]'}\n"

            )
            print("combined_prompt_payload1")
            print("llm_request_prompt",llm_request_prompt)
            print("llm_prompt_text",llm_prompt_text)
            combined_prompt = (
                "=== Extraction Prompt (LLM Request) ===\n"
                f"{llm_request_prompt}\n\n"
                "=== MT Generation Prompt ===\n"
                f"{llm_prompt_text if llm_prompt_text else '[NOT APPLICABLE]'}\n"
            )
            print("combined_prompt_payload2")
            # Step 3: Validate the MT message
            is_valid, validation_errors = self.swift_formatter.validate_mt700(mt_message)
            
            if not is_valid:
                logger.warning(f"MT message validation warnings: {validation_errors}")
                # Add validation errors to extracted_data
                extracted_data['validation_errors'] = validation_errors
            
            # Add formatter warnings to extracted_data
            if self.swift_formatter.warnings:
                extracted_data['formatter_warnings'] = self.swift_formatter.warnings
            
            processing_time_ms = int((time.time() - start_time) * 1000)
            
            logger.info(f"Conversion successful: {instrument_code} {lifecycle_code} -> {mt_message_type}")
            return mt_message, extracted_data, processing_time_ms, combined_prompt_payload,combined_prompt,total_token_usage 
            
        except Exception as e:
            logger.error(f"Conversion error: {str(e)}")
            raise
    
    def _extract_data_from_application(self, application_text: str, instrument_code: str,
                                      lifecycle_code: str, mt_message_type: str,
                                      variation_code: Optional[str] = None) -> Tuple[Dict, str, str, Dict]:
        
        """
        Extract structured data from application text using LLM
        Returns a dictionary with field names and values
        """
        print("working")
          #  Load prompts from files
        system_prompt = load_prompt(
            "extraction/mt700_extract_system.txt",
            instrument_code=instrument_code,
            lifecycle_code=lifecycle_code
        )
        print("system",system_prompt)
        user_prompt = load_prompt(
            "extraction/mt700_extract_user.txt",
            instrument_code=instrument_code,
            application_text=application_text
        )
       
        
        # For audit / DB storage
        llm_request_prompt = (
            f"SYSTEM PROMPT:\n{system_prompt}\n\n"
            f"USER PROMPT:\n{user_prompt}"
        )

        llm_prompt_text = (
        f"SYSTEM PROMPT:\n{system_prompt}\n\n"
        f"USER PROMPT:\n{user_prompt}\n\n"
        f"APPLICATION TEXT:\n{application_text}"
    )
        try:
            response = self.client.chat.completions.create(
                model=self.deployment,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.0,  
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"} 
            )
            
            content = response.choices[0].message.content
            extracted_data = json.loads(content)
            usage = response.usage
            token_usage = {
                "prompt_tokens": usage.prompt_tokens,
                "completion_tokens": usage.completion_tokens,
                "total_tokens": usage.total_tokens
            }
            return extracted_data,llm_prompt_text,llm_request_prompt,token_usage
            
        except Exception as e:
            logger.error(f"Data extraction error: {str(e)}")
            return {
                "documentary_credit_number": "UNKNOWN",
                "applicant": "NOT EXTRACTED",
                "beneficiary": "NOT EXTRACTED"
            }, llm_prompt_text, {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0
        }
    
    def _generate_mt_message_llm(self, extracted_data: Dict, mt_message_type: str) -> Tuple[str, str, Dict]:
        """
        Generate MT message using LLM for non-MT700 types
        This is a fallback for MT types not yet implemented in formatter
        """
        print("prompt")
        print("mt_message_type",mt_message_type)
        # Load prompts from files (INSIDE function)
        print(" Loading system prompt")
        system_prompt = load_prompt(
            "generation/mt_generic_system.txt",
            mt_message_type=mt_message_type
        )
        print(" Loaded system prompt")

        print(" Loading user prompt")
        user_prompt = load_prompt(
            "generation/mt_generic_user.txt",
            mt_message_type=mt_message_type,
            extracted_data_json=json.dumps(extracted_data, indent=2)
        )
        
        print(" Both prompts loaded")

        mt_prompt_text = (
            "SYSTEM PROMPT:\n"
            f"{system_prompt}\n\n"
            "USER PROMPT:\n"
            f"{user_prompt}"
        )
        print(" mt_prompt_text",mt_prompt_text)
        
        try:
            response = self.client.chat.completions.create(
                model=self.deployment,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                max_tokens=self.max_tokens
            )

            mt_message = response.choices[0].message.content
            usage = response.usage or {}

            token_usage = {
                "prompt_tokens": getattr(usage, "prompt_tokens", 0),
                "completion_tokens": getattr(usage, "completion_tokens", 0),
                "total_tokens": getattr(usage, "total_tokens", 0)
            }
            return mt_message, mt_prompt_text, token_usage
        

        except Exception as e:
            logger.error(f"MT message generation error: {str(e)}")
            return (
                f"ERROR: Could not generate {mt_message_type} message",
                mt_prompt_text,
                {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
            )
        
def get_converter() -> TradeFinanceConverterV2:
    """Get converter instance"""
    return TradeFinanceConverterV2()