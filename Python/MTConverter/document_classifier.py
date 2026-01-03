"""
Document Classifier - Reverse Engineer Instrument, Lifecycle, and Variation
Uses LLM to analyze trade finance application text and classify it
"""

import os
import logging
import json
import time
import traceback
from typing import Dict, Optional, Tuple
from openai import AzureOpenAI

from  MTConverter.db_logger import get_app_logger
logger = get_app_logger("document-classifier")


class DocumentClassifier:
    """Classifies trade finance documents using LLM"""
    
    def __init__(self):
        """Initialize Azure OpenAI client"""
        self.client = AzureOpenAI(
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
        )
        self.deployment = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT", "gpt-4")
        self.max_tokens = 500
    
    def classify_document(self, application_text: str, 
                         instruments_list: list, 
                         lifecycles_list: list, 
                         variations_list: list) -> Dict:
        print("document classifier")
        """
        Classify a trade finance application document
        
        Args:
            application_text: The application document text
            instruments_list: List of available instruments with codes and names
            lifecycles_list: List of available lifecycles with codes and names
            variations_list: List of available variations with codes and names
            
        Returns:
            Dict with detected instrument_code, lifecycle_code, variation_code, and confidence
        """
        try:
            # Build the classification prompt
            system_prompt = self._build_system_prompt(
                instruments_list, lifecycles_list, variations_list
            )
            
            user_prompt = f"""Analyze this trade finance application and identify:
1. The INSTRUMENT type (e.g., LC, SBLC, BG, APG, etc.)
2. The LIFECYCLE stage (e.g., ISSUE, AMEND, CANCEL, etc.)
3. The VARIATION (e.g., CONFIRMED, REVOLVING, REDUCING, etc.)

Application Text:
{application_text[:2000]}

Return ONLY a JSON object with this exact format:
{{
    "instrument_code": "CODE",
    "lifecycle_code": "CODE",
    "variation_code": "CODE",
    "confidence": "high/medium/low",
    "reasoning": "brief explanation"
}}"""
            response = self.client.chat.completions.create(
                model=self.deployment,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                max_tokens=self.max_tokens
            )
            
            result_text = response.choices[0].message.content.strip()
            
            # Remove markdown code blocks if present
            if result_text.startswith('```'):
                lines = result_text.split('\n')
                if lines[0].startswith('```'):
                    lines = lines[1:]
                if lines and lines[-1].strip() == '```':
                    lines = lines[:-1]
                result_text = '\n'.join(lines).strip()
            
            # Parse JSON response
            try:
                result = json.loads(result_text)
            except json.JSONDecodeError:
                logger.error(f"Failed to parse JSON from LLM response: {result_text}")
                return {
                    "instrument_code": None,
                    "lifecycle_code": None,
                    "variation_code": None,
                    "confidence": "low",
                    "reasoning": "Invalid JSON returned by LLM"
                }
            
            logger.info(f"Document classified: {result}")
            
            return {
                'instrument_code': result.get('instrument_code'),
                'lifecycle_code': result.get('lifecycle_code'),
                'variation_code': result.get('variation_code'),
                'confidence': result.get('confidence', 'medium'),
                'reasoning': result.get('reasoning', 'No reasoning provided')
            }
            
        except Exception as e:
            logger.error(f"Document classification error: {str(e)}\n{traceback.format_exc()}")
            return {
                'instrument_code': None,
                'lifecycle_code': None,
                'variation_code': None,
                'confidence': 'low',
                'reasoning': f'Error: {str(e)}'
            }
    
    def _build_system_prompt(self, instruments_list: list, 
                            lifecycles_list: list, 
                            variations_list: list) -> str:
        """Build system prompt with available options"""
        
        instruments_str = "\n".join([
            f"- {inst['instrument_code']}: {inst['instrument_name']}"
            for inst in instruments_list
        ])
        
        lifecycles_str = "\n".join([
            f"- {lc['lifecycle_code']}: {lc['lifecycle_name']}"
            for lc in lifecycles_list
        ])
        
        variations_str = "\n".join([
            f"- {var['variation_code']}: {var['variation_name']}"
            for var in variations_list
        ])
        
        return f"""You are a trade finance expert specializing in document classification.
Your task is to analyze trade finance application documents and identify:
1. The instrument type
2. The lifecycle stage
3. The variation

Available INSTRUMENTS:
{instruments_str}

Available LIFECYCLES:
{lifecycles_str}

Available VARIATIONS:
{variations_str}

Classification Guidelines:
- Look for explicit mentions of instrument types (e.g., "Letter of Credit", "Bank Guarantee", "Advance Payment Guarantee")
- Identify lifecycle keywords (e.g., "Issue", "Issuance", "Amendment", "Cancellation", "Extension")
- Detect variation keywords (e.g., "Confirmed", "Revolving", "Reducing", "Irrevocable", "Sight", "Usance")
- Use context clues if explicit mentions are missing
- Assign confidence level: high (explicit mention), medium (strong context), low (weak evidence)

Return ONLY valid JSON with the detected codes and reasoning."""


# Singleton instance
_classifier = None

def get_classifier() -> DocumentClassifier:
    """Get document classifier instance"""
    global _classifier
    if _classifier is None:
        _classifier = DocumentClassifier()
    return _classifier
