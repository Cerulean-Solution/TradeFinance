# with llm integration
# tbml_matching.py
"""
tbml_matching.py
----------------
• Entity (Exporter / Importer / Alias) – 10 rules + LLM
• Goods (ECCN / Description) – Fuzzy + LLM
• Country / Route risk
• Value anomaly
• Explainable flags
"""

import re
from difflib import SequenceMatcher
from TBML_matching.tbml_goods_async import tbml_goods_async
from TBML_matching.azure_llm import semantic_similarity

TOTAL_PROMPT_TOKENS = 0
TOTAL_COMPLETION_TOKENS = 0

# -------------------------
# NORMALIZATION UTILITIES
# -------------------------
def normalize(text):
    try:
        if not text:
            return ""
        text = text.lower()
        text = re.sub(r"[^a-z0-9\s]", "", text)
        return re.sub(r"\s+", " ", text).strip()
    except Exception as e:
        print("[ERROR][NORMALIZE]", str(e))
        return ""


def similarity(a, b):
    try:
        return SequenceMatcher(None, normalize(a), normalize(b)).ratio()
    except Exception as e:
        print("[ERROR][SIMILARITY]", str(e))
        return 0.0


def tokens(text):
    try:
        return normalize(text).split()
    except Exception as e:
        print("[ERROR][TOKENS]", str(e))
        return []


# -------------------------
# CLASSICAL TECHNIQUES
# -------------------------
def exact(a, b):
    try:
        return normalize(a) == normalize(b)
    except Exception as e:
        print("[ERROR][EXACT]", str(e))
        return False


def token_overlap(a, b):
    try:
        ta, tb = set(tokens(a)), set(tokens(b))
        return len(ta & tb) / max(len(ta | tb), 1)
    except Exception as e:
        print("[ERROR][TOKEN_OVERLAP]", str(e))
        return 0.0


def containment(a, b):
    try:
        a, b = normalize(a), normalize(b)
        return a in b or b in a
    except Exception as e:
        print("[ERROR][CONTAINMENT]", str(e))
        return False


# -------------------------
# ENTITY MATCH (ALL)
# -------------------------
def entity_match(input_name, watch_name, use_llm=True):
    global TOTAL_PROMPT_TOKENS, TOTAL_COMPLETION_TOKENS

    try:
        scores = []

        if exact(input_name, watch_name):
            scores.append(("Exact", 1.0))

        fuzz = similarity(input_name, watch_name)
        if fuzz >= 0.85:
            scores.append(("Fuzzy", fuzz))

        overlap = token_overlap(input_name, watch_name)
        if overlap >= 0.6:
            scores.append(("TokenOverlap", overlap))

        if containment(input_name, watch_name):
            scores.append(("Containment", 1.0))

        if use_llm:
            try:
                llm = semantic_similarity(input_name, watch_name)
                llm_score = llm["score"]

                TOTAL_PROMPT_TOKENS += llm.get("prompt_tokens", 0)
                TOTAL_COMPLETION_TOKENS += llm.get("completion_tokens", 0)

                if llm_score >= 0.80:
                    scores.append(("LLM-Semantic", llm_score))
            except Exception as e:
                print(
                    f"[ERROR][ENTITY-LLM] "
                    f"Input={input_name} | Watch={watch_name} | {str(e)}"
                )

        if not scores:
            return None

        return {
            "score": max(s[1] for s in scores),
            "techniques": ", ".join(s[0] for s in scores)
        }

    except Exception as e:
        print(
            f"[ERROR][ENTITY-MATCH] "
            f"Input={input_name} | Watch={watch_name} | {str(e)}"
        )
        return None


# -------------------------
# ENTITY FLAGS
# -------------------------
def tbml_entity_flags(transaction, watchlist):
    flags = []

    try:
        parties = {
            "EXPORTER": transaction["exporter_name"],
            "IMPORTER": transaction["importer_name"]
        }

        for role, name in parties.items():
            for w in watchlist:
                names = [w["name"]] + (
                    w.get("aliases", "").split(",")
                    if w.get("aliases") else []
                )

                for n in names:
                    res = entity_match(name, n)
                    if res:
                        flags.append({
                            "FlagType": "ENTITY",
                            "Rule": "Watchlist Entity Match",
                            "RiskLevel": "High",
                            "Reason": f"{role} matched watchlist entity",
                            "MatchedValue": n,
                            "Source": w["source"],
                            "Score": res["score"],
                            "Techniques": res["techniques"]
                        })

    except Exception as e:
        print("[ERROR][ENTITY-FLAGS]", str(e))

    return flags


# -------------------------
# COUNTRY & ROUTE FLAGS
# -------------------------
SANCTIONED_COUNTRIES = {"IRAN", "NORTH KOREA", "SYRIA", "RUSSIA"}

def tbml_country_route_flags(transaction):
    flags = []

    try:
        if transaction["exporter_country"].upper() in SANCTIONED_COUNTRIES:
            flags.append(_country_flag("EXPORTER", transaction["exporter_country"]))

        if transaction["importer_country"].upper() in SANCTIONED_COUNTRIES:
            flags.append(_country_flag("IMPORTER", transaction["importer_country"]))

        for c in transaction["shipping_route"].split(","):
            if c.strip().upper() in SANCTIONED_COUNTRIES:
                flags.append(_country_flag("ROUTE", c.strip()))

    except Exception as e:
        print("[ERROR][COUNTRY-ROUTE]", str(e))

    return flags


def _country_flag(role, country):
    return {
        "FlagType": "COUNTRY",
        "Rule": "Sanctioned Jurisdiction",
        "RiskLevel": "High",
        "Reason": f"{role} involves sanctioned country",
        "MatchedValue": country,
        "Source": "SanctionsCountryList",
        "Score": 1.0,
        "Techniques": "Direct Match"
    }


# -------------------------
# VALUE FLAGS
# -------------------------
def tbml_value_flags(transaction):
    flags = []

    try:
        if transaction["total_value"] > 1_000_000:
            flags.append({
                "FlagType": "VALUE",
                "Rule": "High Value Transaction",
                "RiskLevel": "Medium",
                "Reason": "Transaction value unusually high",
                "MatchedValue": str(transaction["total_value"]),
                "Source": "ThresholdRule",
                "Score": 0.7,
                "Techniques": "Threshold"
            })
    except Exception as e:
        print("[ERROR][VALUE-FLAGS]", str(e))

    return flags


# -------------------------
# MASTER RUNNER
# -------------------------
async def run_tbml_matching_async(
    transaction,
    items,
    watchlist,
    export_controls
):
    flags = []

    try:
        print("[TBML] Running ENTITY checks")
        flags.extend(tbml_entity_flags(transaction, watchlist))

        print("[TBML] Running GOODS checks (ExportControlItems | ASYNC)")
        goods_flags, token_usage = await tbml_goods_async(
            items=items,
            export_controls=export_controls
        )
        flags.extend(goods_flags)

        print("[TBML] Running COUNTRY checks")
        flags.extend(tbml_country_route_flags(transaction))

        print("[TBML] Running VALUE checks")
        flags.extend(tbml_value_flags(transaction))

        return flags, token_usage

    except Exception as e:
        print("[ERROR][TBML-MASTER]", str(e))
        return flags, {
            "prompt_tokens": TOTAL_PROMPT_TOKENS,
            "completion_tokens": TOTAL_COMPLETION_TOKENS
        }
