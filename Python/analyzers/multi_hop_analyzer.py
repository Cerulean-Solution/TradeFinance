"""
Multi-Hop Agentic RAG Analyzer (Mode 3)
=========================================
Advanced retrieval-based analysis using multi-hop RAG.
Integrates with the EnhancedRAGPipeline from multi_hops_agentic_rag.py

This version:
- Removes all Streamlit UI code
- Adds a FinalRAGPipeline subclass with:
  - Detailed debug prints (to console)
  - Hard max-iteration guard to avoid infinite loops
  - Custom recursion_limit passed to LangGraph
- Returns a Mode 3 result in the same structure as Mode 1/2:
  {
      "request": "...",
      "response": "...",
      "analysis": "...",
      "tokens": { ... },
      "debug": { ... }
  }
"""

from typing import Optional, Dict, Any, Tuple
from uuid import uuid4
from Prompts.multi_hops_prompts import (
    QUESTION_ANALYSIS_PROMPT,
    MULTI_QUERY_PLANNING_PROMPT,
    CONTEXT_ASSESSMENT_PROMPT,
    DECISION_MAKING_PROMPT,
    ENHANCED_SYNTHESIS_PROMPT,
    ADVANCED_VERIFICATION_PROMPT,
    USER_PROMPT
)

from Prompts.prompts import (
    SYSTEM_PROMPT
)

from analyzers.base_analyzer import BaseAnalyzer

try:
    # Base enhanced RAG pipeline (graph, nodes, etc.)
    from Model.multi_hops_agentic_rag import EnhancedRAGPipeline
except Exception as e:
    # We will handle this gracefully in MultiHopAnalyzer.__init__
    EnhancedRAGPipeline = None  # type: ignore
    print("Warning: Could not import EnhancedRAGPipeline from multi_hops_agentic_rag:", e)


# ---------------------------------------------------------------------------
# FinalRAGPipeline - backend-only version (NO Streamlit, only prints)
# ---------------------------------------------------------------------------

class FinalRAGPipeline(EnhancedRAGPipeline):  # type: ignore[misc]
    """
    Final RAG Pipeline with:
    - Extra debug prints
    - Hard max iteration guard
    - Custom recursion_limit passed to graph.invoke
    """

    def __init__(
        self,
        max_iters: int = 8,
        min_iters: int = 2,
        hard_max_iterations: int = 3,
    ):
        """
        Args:
            max_iters: default_max_iters for the base EnhancedRAGPipeline
            min_iters: minimum iterations before stopping
            hard_max_iterations: extra safety stop for our own iteration counter
        """
        super().__init__(max_iters=max_iters, min_iters=min_iters)
        self.iteration_count: int = 0
        self.max_iterations: int = hard_max_iterations

    # ----- Simple print helper -----
    def _log(self, msg: str) -> None:
        print(msg, flush=True)

    # ----- Node overrides with logging & safety -----

    def _analyze_question(self, state):
        self._log("=" * 80)
        self._log("🔍 NODE: ANALYZE_QUESTION")
        self._log("=" * 80)

        question = state["question"]
        self._log(f"📝 INPUT QUESTION: {question}")
        self._log("🧠 THINKING: Analyzing question complexity and type...")

        result = super()._analyze_question(state)

        self._log("📊 ANALYSIS COMPLETE:")
        self._log(
            f"   • Complexity: {result.get('question_complexity', 0):.1f}/10"
        )
        self._log(f"   • Type: {result.get('question_type', 'unknown')}")
        self._log(f"   • Est. Hops: {result.get('estimated_hops', 0)}")
        self._log("")

        return result

    def _enhanced_plan(self, state):
        self.iteration_count += 1

        self._log("=" * 80)
        self._log("📋 NODE: ENHANCED_PLAN")
        self._log("=" * 80)

        iteration = state.get("iteration", 0)
        self._log(f"🔄 ITERATION (graph): {iteration} | (local count): {self.iteration_count}")

        # Hard stop guard at our own max_iterations
        if self.iteration_count > self.max_iterations:
            self._log("⚠️ FORCE STOP IN PLAN NODE: Local max iterations reached")
            question = state["question"]
            return {
                "sub_questions": [
                    {
                        "query": question,
                        "priority": 1.0,
                        "strategy": "semantic",
                        "aspect": "general",
                    }
                ],
                "current_query_batch": [question],
                "sub_question": question,
            }

        evidence_count = len(state.get("evidence_docs", []))
        self._log(f"📚 Current Evidence Docs: {evidence_count}")
        self._log("🧠 THINKING: Planning retrieval strategy...")

        result = super()._enhanced_plan(state)

        sub_questions = result.get("sub_questions", [])
        self._log(f"🎯 PLAN: {len(sub_questions)} sub-questions generated")
        self._log("")

        return result

    def _parallel_retrieve(self, state):
        self._log("=" * 80)
        self._log("🔍 NODE: PARALLEL_RETRIEVE")
        self._log("=" * 80)

        queries = state.get("current_query_batch", [])
        self._log(f"🎯 EXECUTING: {len(queries)} parallel queries")
        self._log("🧠 THINKING: Searching with multiple retrievers...")

        result = super()._parallel_retrieve(state)

        total_evidence = len(result.get("evidence_docs", []))
        new_docs = len(result.get("fused_results", []))

        self._log(f"📊 RESULTS: {new_docs} new docs in this batch, {total_evidence} total evidence docs")
        self._log("")

        return result

    def _advanced_assess(self, state):
        self._log("=" * 80)
        self._log("📊 NODE: ADVANCED_ASSESS")
        self._log("=" * 80)

        evidence_docs = state.get("evidence_docs", [])
        self._log(f"📚 ASSESSING: {len(evidence_docs)} documents")
        self._log("🧠 THINKING: Evaluating context quality & coverage...")

        result = super()._advanced_assess(state)

        quality = result.get("context_quality_score", 0.0)
        coverage = result.get("coverage_score", 0.0)
        self._log(f"📈 QUALITY SCORE: {quality:.3f}, COVERAGE SCORE: {coverage:.3f}")
        self._log("")

        return result

    def _intelligent_decide(self, state):
        self._log("=" * 80)
        self._log("🤔 NODE: INTELLIGENT_DECIDE")
        self._log("=" * 80)

        iteration = state.get("iteration", 0)
        quality = state.get("context_quality_score", 0.0)

        self._log(f"🔄 ITERATION (graph): {iteration}")
        self._log(f"📊 CURRENT QUALITY: {quality:.3f}")
        self._log("🧠 THINKING: Should we continue retrieval or stop?")

        # Hard stop guard: if we already looped too many times locally
        if self.iteration_count >= self.max_iterations:
            self._log("🛑 DECISION: STOP (local hard max_iterations reached)")
            return {
                "stop": True,
                "iteration": iteration + 1,
                "stop_reasons": ["Hard max_iterations reached in FinalRAGPipeline"],
                "decision_factors": {"force_stop": True},
                "continue_probability": 0.0,
            }

        result = super()._intelligent_decide(state)

        should_stop = result.get("stop", False)
        decision_msg = "🛑 STOP" if should_stop else "🔄 CONTINUE"
        self._log(f"🎯 DECISION: {decision_msg}")
        self._log("")

        return result

    def _enhanced_synthesis(self, state):
        self._log("=" * 80)
        self._log("✍️ NODE: ENHANCED_SYNTHESIS")
        self._log("=" * 80)

        evidence_docs = state.get("evidence_docs", [])
        self._log(f"📚 SYNTHESIZING ANSWER FROM {len(evidence_docs)} evidence docs")
        self._log("🧠 THINKING: Generating final discrepancy analysis...")

        result = super()._enhanced_synthesis(state)

        final_answer = result.get("final_answer", "")
        confidence = result.get("answer_confidence", 0.0)

        self._log(
            f"📝 SYNTHESIZED ANSWER: {len(final_answer)} characters, "
            f"confidence={confidence:.3f}"
        )
        self._log("")

        return result

    def _advanced_verify(self, state):
        self._log("=" * 80)
        self._log(" NODE: ADVANCED_VERIFY")
        self._log("=" * 80)

        final_answer = state.get("final_answer", "")
        evidence_docs = state.get("evidence_docs", [])

        self._log(f"🔍 VERIFYING ANSWER AGAINST {len(evidence_docs)} evidence docs")
        self._log("🧠 THINKING: Checking grounding & consistency...")

        result = super()._advanced_verify(state)

        grounded_ok = result.get("grounded_ok", False)
        self._log(f" GROUNDING RESULT: {'PASSED' if grounded_ok else 'FAILED'}")
        self._log(
            f"📊 FINAL ANSWER LENGTH: {len(final_answer)} chars | "
            f"EVIDENCE DOCS: {len(evidence_docs)}"
        )
        self._log("🎉 MULTI-HOP RAG PROCESS COMPLETE")
        self._log("=" * 80)

        return result

    # ----- Backend ask() with recursion_limit control -----

    def ask(
        self,
        question: str,
        max_iters: Optional[int] = None,
        thread_id: Optional[str] = None,
        recursion_limit: int = 40,
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Execute the enhanced pipeline and return answer + debug info.

        This overrides the base ask() to:
        - Pass a custom recursion_limit to LangGraph
        - Rebuild debug info from the final state
        """
        mi = max_iters if max_iters is not None else self.default_max_iters
        init_state = {"question": question}

        tid = thread_id or f"enhanced-rag-{uuid4().hex}"

        final_state = self.app.invoke(
            init_state,
            config={
                "configurable": {"thread_id": tid},
                "recursion_limit": recursion_limit,
            },
        )

        answer = final_state.get("final_answer", "") or ""
        evidence_docs = final_state.get("evidence_docs", []) or []

        debug: Dict[str, Any] = {
            "iterations": final_state.get("iteration", 0),
            "evidence_count": len(evidence_docs),
            "grounded_ok": final_state.get("grounded_ok", None),
            "question_complexity": final_state.get("question_complexity", 0.0),
            "context_quality_score": final_state.get("context_quality_score", 0.0),
            "coverage_score": final_state.get("coverage_score", 0.0),
            "answer_confidence": final_state.get("answer_confidence", 0.0),
            "stop_reasons": final_state.get("stop_reasons", []),
            "last_gaps": final_state.get("information_gaps", [])[-3:],
            "last_sub_question": final_state.get("sub_question", ""),
            # Optional: include docs for deeper debugging (can be large)
            "evidence_docs": evidence_docs,
        }

        self._log("************************************************************************************************")
        self._log(f"FINAL_ANSWER (len={len(answer)}):")
        self._log(answer[:500] + ("..." if len(answer) > 500 else ""))
        self._log("************************************************************************************************")

        return answer, debug


# ---------------------------------------------------------------------------
# MultiHopAnalyzer (Mode 3) used by FastAPI
# ---------------------------------------------------------------------------

class MultiHopAnalyzer(BaseAnalyzer):
    """Mode 3: Multi-Hop Agentic RAG - Advanced retrieval analysis"""
    def __init__(self, lc_type: str = "Import Letter of Credit",
        system_prompt: str = "",
        question_analysis_prompt: str = "",
        multi_query_planning_prompt: str = "",
        context_assessment_prompt: str = "",
        decision_making_prompt: str = "",
        enhanced_synthesis_prompt: str = "",
        advanced_verification_prompt: str = "",
        user_prompt: str = "",):
        """
        Initialize multi-hop analyzer

        Args:
            lc_type: Type of LC being analyzed (ex: "Import Letter of Credit")
        """
        super().__init__(lc_type)

        print("Attempting to initialize FinalRAGPipeline for Multi-Hop...", flush=True)
        self.available: bool = False
        self.rag_pipeline: Optional[FinalRAGPipeline] = None
        self.system_prompt = system_prompt
        self.question_analysis_prompt = question_analysis_prompt
        self.multi_query_planning_prompt = multi_query_planning_prompt
        self.context_assessment_prompt = context_assessment_prompt
        self.decision_making_prompt = decision_making_prompt
        self.enhanced_synthesis_prompt = enhanced_synthesis_prompt
        self.advanced_verification_prompt = advanced_verification_prompt
        self.user_prompt = user_prompt
        try:
            if EnhancedRAGPipeline is None:
                raise ImportError("EnhancedRAGPipeline is not available")

            # Use our safer FinalRAGPipeline
            self.rag_pipeline = FinalRAGPipeline(
                max_iters=8,
                min_iters=2,
                hard_max_iterations=3,
            )
            self.available = True
            print("Multi-Hop Available:", self.available, flush=True)
        except Exception as e:
            print("IMPORT/INIT FAILED for FinalRAGPipeline:", e, flush=True)
            self.available = False
            self.rag_pipeline = None

    # ==========================================================
    # MODE-3 (MULTIHOP) EXTRACT HELPERS
    # ==========================================================


    def analyze(
        self,
        lc_details: str,
        presented_documents: Optional[str] = None,
        vector_context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Analyze using multi-hop agentic RAG.

        Args:
            lc_details: Letter of Credit document text
            presented_documents: Presented documents text (required for Mode 3)
            vector_context: Not used in Mode 3 (RAG handles retrieval internally)

        Returns:
            Dict[str, Any]: Mode 3 result in the same structure as Mode 1/2:
                {
                    "request": "... merged query ...",
                    "response": "... final answer ...",
                    "analysis": "... final answer ...",
                    "tokens": { ... },
                    "debug": { ... multi-hop debug info ... }
                }
        """


        # If multi-hop RAG is not available, return an explanation as a simple string
        if not self.available or self.rag_pipeline is None:
            return {
                "request": "",
                "response": """# Multi-Hop RAG Not Available

The multi-hop RAG module is not available. Please ensure the following:

1. `multi_hops_agentic_rag.py` is in the project root directory
2. `multi_hops_prompts.py` is in the project root directory
3. All required dependencies are installed:
   - langgraph
   - langchain-openai
   - langchain-postgres
   - langchain-core

You can use Mode 1 (LC Document Analysis) or Mode 2 (Cross-Document Analysis) instead.
""",
                "analysis": "",
                "tokens": {
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0,
                },
            }

        # Validate inputs (BaseAnalyzer helper)
        self.validate_inputs(lc_details, presented_documents)

        if not presented_documents or not presented_documents.strip():
            raise ValueError("Presented documents are required for multi-hop RAG analysis")

        # Build merged LC + documents question
        merged_query = self._build_comprehensive_query(lc_details, presented_documents)
        request_for_logging = self._build_request_for_logging(merged_query)


        # Run RAG pipeline
        try:
            print("Running Multi-Hop Agentic RAG analysis (Mode 3)...", flush=True)
            answer, debug = self.rag_pipeline.ask(
                merged_query,
                max_iters=8,
                thread_id=None,        # can be set per LC analysis if needed
                recursion_limit=40,    # avoid LangGraph recursion_limit=25 errors
            )

            # Ensure we always return something string-like
            final_answer = answer or "No answer was generated by the Multi-Hop RAG pipeline."

            # Mode 3 structure aligned with Mode 1 / Mode 2
            result: Dict[str, Any] = {
                "request": request_for_logging,
                "response": final_answer,
                "analysis": final_answer,
                "tokens": self.rag_pipeline.token_usage, 
                # Extra debug info (front-end can ignore if not needed)
                "debug": debug,
            }

            return result

        except Exception as e:
            # Raise with clear message; FastAPI will catch and wrap this
            raise Exception(f"Error during multi-hop RAG analysis: {str(e)}")

    # -------------------------------------------------------------------
    # Internal helper (unchanged from your previous version)
    # -------------------------------------------------------------------
    def _build_request_for_logging(
        self,
        merged_query: str
    ) -> str:
        """
        Build a full request string ONLY for logging & DB storage
        (does NOT affect actual LLM execution)
        """

        return f"""
    ================ SYSTEM PROMPT ================
    {SYSTEM_PROMPT}

    ================ QUESTION ANALYSIS PROMPT ================
    {QUESTION_ANALYSIS_PROMPT}

    ================ MULTI QUERY PLANNING PROMPT ================
    {MULTI_QUERY_PLANNING_PROMPT}

    ================ CONTEXT ASSESSMENT PROMPT ================
    {CONTEXT_ASSESSMENT_PROMPT}

    ================ DECISION MAKING PROMPT ================
    {DECISION_MAKING_PROMPT}

    ================ ENHANCED SYNTHESIS PROMPT ================
    {ENHANCED_SYNTHESIS_PROMPT}

    ================ ADVANCED VERIFICATION PROMPT ================
    {ADVANCED_VERIFICATION_PROMPT}

    ================ USER / MERGED QUERY ================
    {merged_query}
    """.strip()

    def _build_comprehensive_query(self, lc_details: str, presented_documents: str) -> str:
        """
        Build a comprehensive query for multi-hop RAG analysis

        Args:
            lc_details: LC document text
            presented_documents: Presented documents text

        Returns:
            str: Comprehensive query for RAG
        """
        query = f"""Analyze the following Letter of Credit ({self.lc_type}) and presented documents for discrepancies.

**LETTER OF CREDIT (GOLDEN TRUTH)**:
{lc_details}

---

**PRESENTED DOCUMENTS**:
{presented_documents}

---

**ANALYSIS TASK**:
Perform a comprehensive discrepancy analysis comparing the LC requirements against the presented documents. 

Focus on:
1. **Amount discrepancies** (currency, values, tolerance)
2. **Date discrepancies** (shipment, issue, expiry)
3. **Party/name/entity mismatches**
4. **Address/location/port differences**
5. **Description/specification variations**
6. **Quantity/measurement/weight differences**
7. **Reference/identifier mismatches**
8. **Coverage/policy/insurance term differences**
9. **Missing/extra/unclear information**
10. **Compliance with UCP 600 and ISBP 821 standards**

Provide findings in a structured markdown table format with:
- Discrepancy ID
- Discrepancy Type
- LC Requirement
- Document Observation
- Conclusion/Impact
- UCP/ISBP Reference

Include an overall assessment with severity levels and recommendations.
"""
        return query

    def is_available(self) -> bool:
        """Check if multi-hop RAG is available"""
        return self.available
