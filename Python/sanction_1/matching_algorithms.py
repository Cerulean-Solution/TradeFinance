



"""
Name and address matching algorithms - 10 techniques
Enhanced with try/except and print tracing
"""

import re
import os
from dotenv import load_dotenv

load_dotenv()

# --------------------------------------------------
# FUZZY MATCHING LIBRARY
# --------------------------------------------------
try:
    from rapidfuzz import fuzz
    USING_RAPIDFUZZ = True
    print("[INIT] rapidfuzz loaded")
except ImportError:
    from simple_fuzzy import fuzz
    USING_RAPIDFUZZ = False
    print("[INIT] rapidfuzz not found, using fallback")

# --------------------------------------------------
# PHONETIC
# --------------------------------------------------
try:
    from phonetics import metaphone
    print("[INIT] phonetics loaded")
except Exception as e:
    metaphone = None
    print("[INIT ERROR] phonetics load failed:", e)

# --------------------------------------------------
# AZURE OPENAI
# --------------------------------------------------
try:
    from openai import AzureOpenAI
    print("[INIT] AzureOpenAI loaded")
except Exception as e:
    AzureOpenAI = None
    print("[INIT ERROR] AzureOpenAI load failed:", e)


# --------------------------------------------------
# HELPERS
# --------------------------------------------------
def normalize_text(text):
    try:
        if not text:
            return ""
        return " ".join(text.lower().strip().split())
    except Exception as e:
        print("[ERROR] normalize_text:", e)
        return ""


def tokenize(text):
    try:
        if not text:
            return []
        return re.findall(r'\w+', text.lower())
    except Exception as e:
        print("[ERROR] tokenize:", e)
        return []


# --------------------------------------------------
# 1️⃣ EXACT MATCH
# --------------------------------------------------
def exact_match(input_text, db_text):
    try:
        is_match = input_text == db_text
        return {
            'match': is_match,
            'technique': '1️⃣ Exact Match',
            'score': 1.0 if is_match else 0.0,
            'details': 'Exact case-sensitive comparison'
        }
    except Exception as e:
        print("[ERROR] exact_match:", e)
        return {'match': False, 'technique': '1️⃣ Exact Match', 'score': 0.0}


# --------------------------------------------------
# 2️⃣ CASE INSENSITIVE
# --------------------------------------------------
def case_insensitive_match(input_text, db_text):
    try:
        a = normalize_text(input_text)
        b = normalize_text(db_text)
        is_match = a == b
        return {
            'match': is_match,
            'technique': '2️⃣ Case-Insensitive Match',
            'score': 1.0 if is_match else 0.0,
            'details': 'Normalized comparison'
        }
    except Exception as e:
        print("[ERROR] case_insensitive_match:", e)
        return {'match': False, 'technique': '2️⃣ Case-Insensitive Match', 'score': 0.0}


# --------------------------------------------------
# 3️⃣ FUZZY SIMILARITY
# --------------------------------------------------
def fuzzy_similarity(input_text, db_text, threshold=80):
    try:
        if not input_text or not db_text:
            return {'match': False, 'technique': '3️⃣ Fuzzy Similarity', 'score': 0.0}

        score = fuzz.ratio(input_text.lower(), db_text.lower())
        return {
            'match': score >= threshold,
            'technique': '3️⃣ Fuzzy Similarity',
            'score': score / 100.0,
            'details': f'Score={score}'
        }
    except Exception as e:
        print("[ERROR] fuzzy_similarity:", e)
        return {'match': False, 'technique': '3️⃣ Fuzzy Similarity', 'score': 0.0}


# --------------------------------------------------
# 4️⃣ TOKEN SET / SORT
# --------------------------------------------------
def token_set_match(input_text, db_text, threshold=80):
    try:
        if not input_text or not db_text:
            return {'match': False, 'technique': '4️⃣ Token Match', 'score': 0.0}

        ts = fuzz.token_sort_ratio(input_text, db_text)
        tset = fuzz.token_set_ratio(input_text, db_text)
        score = max(ts, tset)

        return {
            'match': score >= threshold,
            'technique': '4️⃣ Token Set/Sort Match',
            'score': score / 100.0,
            'details': f'token_sort={ts}, token_set={tset}'
        }
    except Exception as e:
        print("[ERROR] token_set_match:", e)
        return {'match': False, 'technique': '4️⃣ Token Set/Sort Match', 'score': 0.0}


# --------------------------------------------------
# 5️⃣ PHONETIC
# --------------------------------------------------
def phonetic_similarity(input_text, db_text):
    try:
        if not metaphone or not input_text or not db_text:
            return {'match': False, 'technique': '5️⃣ Phonetic', 'score': 0.0}

        a = metaphone(input_text)
        b = metaphone(db_text)

        return {
            'match': a == b,
            'technique': '5️⃣ Phonetic Similarity',
            'score': 1.0 if a == b else 0.0,
            'details': f'{a} vs {b}'
        }
    except Exception as e:
        print("[ERROR] phonetic_similarity:", e)
        return {'match': False, 'technique': '5️⃣ Phonetic Similarity', 'score': 0.0}


# --------------------------------------------------
# 6️⃣ NGRAM JACCARD
# --------------------------------------------------
def ngram_jaccard_similarity(input_text, db_text, n=2, threshold=0.5):
    try:
        if not input_text or not db_text:
            return {'match': False, 'technique': '6️⃣ NGram', 'score': 0.0}

        def grams(t):
            return set(t[i:i+n] for i in range(len(t)-n+1))

        a = grams(input_text.lower())
        b = grams(db_text.lower())

        score = len(a & b) / len(a | b) if a | b else 0
        return {
            'match': score >= threshold,
            'technique': '6️⃣ NGram Jaccard',
            'score': score,
            'details': f'score={score:.3f}'
        }
    except Exception as e:
        print("[ERROR] ngram_jaccard_similarity:", e)
        return {'match': False, 'technique': '6️⃣ NGram Jaccard', 'score': 0.0}


# --------------------------------------------------
# 9️⃣ ML COMPOSITE
# --------------------------------------------------
def ml_composite_score(input_name, db_name, input_addr, db_addr, threshold=0.7):
    try:
        fn = fuzzy_similarity(input_name, db_name)['score']
        tn = token_set_match(input_name, db_name)['score']
        pn = phonetic_similarity(input_name, db_name)['score']

        composite = fn * 0.4 + tn * 0.4 + pn * 0.2

        return {
            'match': composite >= threshold,
            'technique': '9️⃣ ML Composite Score',
            'score': composite,
            'details': f'Composite={composite:.3f}'
        }
    except Exception as e:
        print("[ERROR] ml_composite_score:", e)
        return {'match': False, 'technique': '9️⃣ ML Composite Score', 'score': 0.0}


# --------------------------------------------------
# 🔟 LLM SEMANTIC
# --------------------------------------------------
def semantic_llm_similarity(input_name, db_name, input_addr, db_addr):
    try:
        if not AzureOpenAI:
            raise RuntimeError("AzureOpenAI not available")

        client = AzureOpenAI(
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION")
        )

        prompt = f"""
Compare entities:
Input: {input_name}, {input_addr}
DB: {db_name}, {db_addr}
Return MATCH YES/NO and CONFIDENCE.
"""

        response = client.chat.completions.create(
            model=os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT"),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.1
        )

        text = response.choices[0].message.content
        match = "YES" in text.upper()

        return {
            'match': match,
            'technique': '🔟 Semantic LLM Similarity',
            'score': 1.0 if match else 0.0,
            'details': text[:200]
        }
    except Exception as e:
        print("[ERROR] semantic_llm_similarity:", e)
        return {'match': False, 'technique': '🔟 Semantic LLM Similarity', 'score': 0.0}


# --------------------------------------------------
# MASTER RUNNER
# --------------------------------------------------
def run_all_matching_techniques(input_name, input_address, db_record):
    try:
        print(f"[MATCH] Running techniques for: {input_name}")

        db_name = db_record.get('name', '')
        db_address = db_record.get('country', '')

        techniques = [
            exact_match(input_name, db_name),
            case_insensitive_match(input_name, db_name),
            fuzzy_similarity(input_name, db_name),
            token_set_match(input_name, db_name),
            phonetic_similarity(input_name, db_name),
            ngram_jaccard_similarity(input_name, db_name),
            ml_composite_score(input_name, db_name, input_address, db_address)
        ]

        return {
            'db_record': db_record,
            'techniques': techniques,
            'any_match': any(t['match'] for t in techniques),
            'match_count': sum(1 for t in techniques if t['match']),
            'max_score': max(t['score'] for t in techniques)
        }
    except Exception as e:
        print("[ERROR] run_all_matching_techniques:", e)
        return {
            'db_record': db_record,
            'techniques': [],
            'any_match': False,
            'match_count': 0,
            'max_score': 0.0
        }





















# """
# Name and address matching algorithms - 10 techniques
# """
# import re
# try:
#     from rapidfuzz import fuzz
#     USING_RAPIDFUZZ = True
# except ImportError:
#     # Fallback to simple built-in fuzzy matching
#     from simple_fuzzy import fuzz
#     USING_RAPIDFUZZ = False
#     print("[INFO] Using built-in fuzzy matching (rapidfuzz not found)")

# from phonetics import metaphone
# import os
# from openai import AzureOpenAI
# from dotenv import load_dotenv


# load_dotenv()


# def normalize_text(text):
#     """Normalize text by removing extra spaces and converting to lowercase"""
#     if not text:
#         return ""
#     return " ".join(text.lower().strip().split())


# def tokenize(text):
#     """Split text into tokens"""
#     if not text:
#         return []
#     return re.findall(r'\w+', text.lower())


# # 1️⃣ Exact Match
# def exact_match(input_text, db_text):
#     """
#     Check if both texts are identical (case-sensitive)
    
#     Returns:
#         dict: {'match': bool, 'technique': str, 'score': float}
#     """
#     is_match = input_text == db_text
#     return {
#         'match': is_match,
#         'technique': '1️⃣ Exact Match',
#         'score': 1.0 if is_match else 0.0,
#         'details': 'Exact case-sensitive comparison'
#     }


# # 2️⃣ Case-Insensitive Match
# def case_insensitive_match(input_text, db_text):
#     """
#     Compare ignoring case and extra spaces
    
#     Returns:
#         dict: {'match': bool, 'technique': str, 'score': float}
#     """
#     normalized_input = normalize_text(input_text)
#     normalized_db = normalize_text(db_text)
#     is_match = normalized_input == normalized_db
    
#     return {
#         'match': is_match,
#         'technique': '2️⃣ Case-Insensitive Match',
#         'score': 1.0 if is_match else 0.0,
#         'details': 'Normalized case and whitespace comparison'
#     }


# # 3️⃣ Fuzzy Similarity (Edit Distance Style)
# def fuzzy_similarity(input_text, db_text, threshold=80):
#     """
#     Estimate similarity using Levenshtein-style similarity (0-100)
    
#     Returns:
#         dict: {'match': bool, 'technique': str, 'score': float}
#     """
#     if not input_text or not db_text:
#         return {
#             'match': False,
#             'technique': '3️⃣ Fuzzy Similarity',
#             'score': 0.0,
#             'details': 'Empty input'
#         }
    
#     score = fuzz.ratio(input_text.lower(), db_text.lower())
#     is_match = score >= threshold
    
#     return {
#         'match': is_match,
#         'technique': '3️⃣ Fuzzy Similarity (Levenshtein)',
#         'score': score / 100.0,
#         'details': f'Similarity score: {score}/100 (threshold: {threshold})'
#     }


# # 4️⃣ Token Set / Token Sort Match
# def token_set_match(input_text, db_text, threshold=80):
#     """
#     Compare after sorting or deduplicating tokens
    
#     Returns:
#         dict: {'match': bool, 'technique': str, 'score': float}
#     """
#     if not input_text or not db_text:
#         return {
#             'match': False,
#             'technique': '4️⃣ Token Set Match',
#             'score': 0.0,
#             'details': 'Empty input'
#         }
    
#     token_sort_score = fuzz.token_sort_ratio(input_text.lower(), db_text.lower())
#     token_set_score = fuzz.token_set_ratio(input_text.lower(), db_text.lower())
    
#     # Use the higher score
#     score = max(token_sort_score, token_set_score)
#     is_match = score >= threshold
    
#     return {
#         'match': is_match,
#         'technique': '4️⃣ Token Set/Sort Match',
#         'score': score / 100.0,
#         'details': f'Token sort: {token_sort_score}, Token set: {token_set_score} (threshold: {threshold})'
#     }


# # 5️⃣ Phonetic Similarity
# def phonetic_similarity(input_text, db_text):
#     """
#     Simulate Soundex/Metaphone logic
    
#     Returns:
#         dict: {'match': bool, 'technique': str, 'score': float}
#     """
#     if not input_text or not db_text:
#         return {
#             'match': False,
#             'technique': '5️⃣ Phonetic Similarity',
#             'score': 0.0,
#             'details': 'Empty input'
#         }
    
#     try:
#         input_phonetic = metaphone(input_text)
#         db_phonetic = metaphone(db_text)
        
#         is_match = input_phonetic == db_phonetic
        
#         return {
#             'match': is_match,
#             'technique': '5️⃣ Phonetic Similarity (Metaphone)',
#             'score': 1.0 if is_match else 0.0,
#             'details': f'Input: {input_phonetic}, DB: {db_phonetic}'
#         }
#     except:
#         return {
#             'match': False,
#             'technique': '5️⃣ Phonetic Similarity',
#             'score': 0.0,
#             'details': 'Phonetic encoding failed'
#         }


# # 6️⃣ N-Gram / Jaccard Similarity
# def ngram_jaccard_similarity(input_text, db_text, n=2, threshold=0.5):
#     """
#     Estimate overlap of tokens or substrings (0-1 scale)
    
#     Returns:
#         dict: {'match': bool, 'technique': str, 'score': float}
#     """
#     if not input_text or not db_text:
#         return {
#             'match': False,
#             'technique': '6️⃣ N-Gram Jaccard Similarity',
#             'score': 0.0,
#             'details': 'Empty input'
#         }
    
#     def get_ngrams(text, n):
#         text = text.lower()
#         return set([text[i:i+n] for i in range(len(text)-n+1)])
    
#     input_ngrams = get_ngrams(input_text, n)
#     db_ngrams = get_ngrams(db_text, n)
    
#     if not input_ngrams or not db_ngrams:
#         return {
#             'match': False,
#             'technique': '6️⃣ N-Gram Jaccard Similarity',
#             'score': 0.0,
#             'details': 'Insufficient text for n-grams'
#         }
    
#     intersection = len(input_ngrams.intersection(db_ngrams))
#     union = len(input_ngrams.union(db_ngrams))
    
#     score = intersection / union if union > 0 else 0.0
#     is_match = score >= threshold
    
#     return {
#         'match': is_match,
#         'technique': f'6️⃣ N-Gram Jaccard (n={n})',
#         'score': score,
#         'details': f'Jaccard score: {score:.3f} (threshold: {threshold})'
#     }


# # 7️⃣ Address Normalization Match
# def address_normalization_match(input_addr, db_addr):
#     """
#     Normalize abbreviations, punctuation, and local variants
    
#     Returns:
#         dict: {'match': bool, 'technique': str, 'score': float}
#     """
#     if not input_addr or not db_addr:
#         return {
#             'match': False,
#             'technique': '7️⃣ Address Normalization',
#             'score': 0.0,
#             'details': 'Empty address'
#         }
    
#     # Common address abbreviations
#     abbreviations = {
#         'street': 'st', 'st.': 'st', 'str': 'st',
#         'avenue': 'ave', 'ave.': 'ave',
#         'boulevard': 'blvd', 'blvd.': 'blvd',
#         'road': 'rd', 'rd.': 'rd',
#         'drive': 'dr', 'dr.': 'dr',
#         'lane': 'ln', 'ln.': 'ln',
#         'court': 'ct', 'ct.': 'ct',
#         'place': 'pl', 'pl.': 'pl',
#         'apartment': 'apt', 'apt.': 'apt',
#         'suite': 'ste', 'ste.': 'ste',
#         'building': 'bldg', 'bldg.': 'bldg',
#         'floor': 'fl', 'fl.': 'fl',
#         'north': 'n', 'south': 's', 'east': 'e', 'west': 'w'
#     }
    
#     def normalize_address(addr):
#         addr = addr.lower().strip()
#         # Remove punctuation
#         addr = re.sub(r'[^\w\s]', ' ', addr)
#         # Replace abbreviations
#         for full, abbr in abbreviations.items():
#             addr = re.sub(r'\b' + full + r'\b', abbr, addr)
#         # Remove extra spaces
#         addr = ' '.join(addr.split())
#         return addr
    
#     normalized_input = normalize_address(input_addr)
#     normalized_db = normalize_address(db_addr)
    
#     is_match = normalized_input == normalized_db
    
#     # If not exact match, check fuzzy similarity
#     if not is_match:
#         score = fuzz.ratio(normalized_input, normalized_db) / 100.0
#         is_match = score >= 0.9
#     else:
#         score = 1.0
    
#     return {
#         'match': is_match,
#         'technique': '7️⃣ Address Normalization',
#         'score': score,
#         'details': f'Normalized comparison (score: {score:.3f})'
#     }


# # 8️⃣ Geospatial / Location Proximity
# def geospatial_proximity(input_addr, db_addr):
#     """
#     Conceptually determine if both refer to the same physical location
    
#     Returns:
#         dict: {'match': bool, 'technique': str, 'score': float}
#     """
#     if not input_addr or not db_addr:
#         return {
#             'match': False,
#             'technique': '8️⃣ Geospatial Proximity',
#             'score': 0.0,
#             'details': 'Empty address'
#         }
    
#     # Extract key location components
#     def extract_location_components(addr):
#         addr_lower = addr.lower()
#         # Simple extraction of potential city, street, and number patterns
#         components = {
#             'numbers': re.findall(r'\d+', addr_lower),
#             'words': tokenize(addr_lower)
#         }
#         return components
    
#     input_comp = extract_location_components(input_addr)
#     db_comp = extract_location_components(db_addr)
    
#     # Check for common numbers (street numbers, zip codes)
#     number_overlap = len(set(input_comp['numbers']).intersection(set(db_comp['numbers'])))
    
#     # Check for common words
#     word_overlap = len(set(input_comp['words']).intersection(set(db_comp['words'])))
#     total_words = len(set(input_comp['words']).union(set(db_comp['words'])))
    
#     if total_words == 0:
#         score = 0.0
#     else:
#         # Weighted score: numbers are more important
#         score = (number_overlap * 0.4 + (word_overlap / total_words) * 0.6)
    
#     is_match = score >= 0.7
    
#     similarity_level = "High" if score >= 0.7 else "Medium" if score >= 0.4 else "Low"
    
#     return {
#         'match': is_match,
#         'technique': '8️⃣ Geospatial Proximity',
#         'score': score,
#         'details': f'{similarity_level} similarity (score: {score:.3f})'
#     }


# # 9️⃣ Machine-Learning Style Composite Score
# def ml_composite_score(input_name, db_name, input_addr, db_addr, threshold=0.7):
#     """
#     Combine fuzzy, phonetic, and token similarities for composite score
    
#     Returns:
#         dict: {'match': bool, 'technique': str, 'score': float}
#     """
#     # Get individual scores
#     fuzzy_name = fuzzy_similarity(input_name, db_name)['score']
#     token_name = token_set_match(input_name, db_name)['score']
#     phonetic_name = phonetic_similarity(input_name, db_name)['score']
    
#     fuzzy_addr = fuzzy_similarity(input_addr, db_addr)['score'] if input_addr and db_addr else 0
#     token_addr = token_set_match(input_addr, db_addr)['score'] if input_addr and db_addr else 0
    
#     # Weighted composite score
#     # Name is more important (70%), address is secondary (30%)
#     name_score = (fuzzy_name * 0.4 + token_name * 0.4 + phonetic_name * 0.2)
#     addr_score = (fuzzy_addr * 0.5 + token_addr * 0.5) if input_addr and db_addr else 0
    
#     if input_addr and db_addr:
#         composite_score = name_score * 0.7 + addr_score * 0.3
#     else:
#         composite_score = name_score
    
#     is_match = composite_score >= threshold
    
#     return {
#         'match': is_match,
#         'technique': '9️⃣ ML Composite Score',
#         'score': composite_score,
#         'details': f'Name: {name_score:.3f}, Address: {addr_score:.3f}, Composite: {composite_score:.3f}'
#     }


# # 🔟 Semantic / Contextual Similarity (LLM Reasoning)
# def semantic_llm_similarity(input_name, db_name, input_addr, db_addr):
#     """
#     Use LLM to determine if entities represent the same organization/address
    
#     Returns:
#         dict: {'match': bool, 'technique': str, 'score': float}
#     """
#     try:
#         client = AzureOpenAI(
#             azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
#             api_key=os.getenv("AZURE_OPENAI_API_KEY"),
#             api_version=os.getenv("AZURE_OPENAI_API_VERSION")
#         )
        
#         prompt = f"""You are an expert in entity matching and sanctions screening. 
        
# Analyze if these two entities represent the same person or organization:

# Input Entity:
# - Name: {input_name}
# - Address: {input_addr if input_addr else 'Not provided'}

# Database Entity:
# - Name: {db_name}
# - Address: {db_addr if db_addr else 'Not provided'}

# Consider:
# 1. Name variations, aliases, and transliterations
# 2. Address variations and location references
# 3. Contextual clues about the same entity

# Respond in this exact format:
# MATCH: [YES/NO]
# CONFIDENCE: [0.0-1.0]
# REASONING: [Brief explanation]"""

#         response = client.chat.completions.create(
#             model=os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT"),
#             messages=[{"role": "user", "content": prompt}],
#             max_tokens=200,
#             temperature=0.1
#         )
        
#         result_text = response.choices[0].message.content.strip()
        
#         # Parse response
#         match_line = re.search(r'MATCH:\s*(YES|NO)', result_text, re.IGNORECASE)
#         confidence_line = re.search(r'CONFIDENCE:\s*([\d.]+)', result_text)
#         reasoning_line = re.search(r'REASONING:\s*(.+)', result_text, re.DOTALL)
        
#         is_match = match_line.group(1).upper() == 'YES' if match_line else False
#         confidence = float(confidence_line.group(1)) if confidence_line else 0.0
#         reasoning = reasoning_line.group(1).strip() if reasoning_line else 'No reasoning provided'
        
#         return {
#             'match': is_match,
#             'technique': '🔟 Semantic LLM Similarity',
#             'score': confidence,
#             'details': f'LLM Analysis: {reasoning[:200]}'
#         }
        
#     except Exception as e:
#         return {
#             'match': False,
#             'technique': '🔟 Semantic LLM Similarity',
#             'score': 0.0,
#             'details': f'LLM call failed: {str(e)}'
#         }


# def run_all_matching_techniques(input_name, input_address, db_record):
#     """
#     Run all matching techniques against a database record
    
#     NOTE: Address matching is currently DISABLED (techniques #7, #8).
#     NOTE: Technique #10 (Semantic LLM) is currently DISABLED for performance.
#           These can be re-enabled by uncommenting the lines in the techniques list.
    
#     Args:
#         input_name: Input name to match
#         input_address: Input address to match (currently not used)
#         db_record: Database record dict with 'name' and 'country' fields
        
#     Returns:
#         dict: Results from all techniques with match indicators
#     """
#     db_name = db_record.get('name', '')
#     db_address = db_record.get('country', '')  # Using country as address field
    
#     results = {
#         'db_record': db_record,
#         'techniques': []
#     }
    
#     # Run name-only techniques (Address techniques #7, #8 and LLM #10 are commented out)
#     techniques = [
#         exact_match(input_name, db_name),
#         case_insensitive_match(input_name, db_name),
#         fuzzy_similarity(input_name, db_name),
#         token_set_match(input_name, db_name),
#         phonetic_similarity(input_name, db_name),
#         ngram_jaccard_similarity(input_name, db_name),
#         # DISABLED: Address-based techniques (uncomment to enable)
#         # address_normalization_match(input_address, db_address),
#         # geospatial_proximity(input_address, db_address),
#         ml_composite_score(input_name, db_name, input_address, db_address),
#         # DISABLED FOR PERFORMANCE: Uncomment below to enable LLM semantic matching
#         # semantic_llm_similarity(input_name, db_name, input_address, db_address)
#     ]
    
#     results['techniques'] = techniques
#     results['any_match'] = any(t['match'] for t in techniques)
#     results['match_count'] = sum(1 for t in techniques if t['match'])
#     results['max_score'] = max(t['score'] for t in techniques)
    
#     return results
