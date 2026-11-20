import os
import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

class BaseModelAdapter(ABC):
    @abstractmethod
    async def generate_structured(self, system_prompt: str, user_prompt: str, schema: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        pass

class MockVertexAIAdapter(BaseModelAdapter):
    """Deterministic mock adapter for development and testing without live GCP credentials."""
    async def generate_structured(self, system_prompt: str, user_prompt: str, schema: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        sp = system_prompt.lower()
        if "verification" in sp:
            return {
                "agent": "verification_agent",
                "coverage_valid": True,
                "unsupported_claims": [],
                "sop_revision_checked": True,
                "sop_reference": "SOP-MNT-014 Rev 3.2 (Active)",
                "verification_status": "PASSED"
            }
        elif "analysis" in sp:
            return {
                "agent": "analysis_agent",
                "root_cause": "Cavitation caused by clogged upstream strainer leading to bearing overheat.",
                "hypotheses": ["Upstream blockage", "Impeller wear"],
                "recommendation": "Perform emergency maintenance inspection and seal replacement according to SOP-MNT-014."
            }
        elif "research" in sp:
            return {
                "agent": "research_agent",
                "evidence": [
                    {
                        "source_id": "source:incident-log",
                        "claim": "Pump P-204 experienced severe cavitation and bearing overheating.",
                        "confidence": 0.98
                    },
                    {
                        "source_id": "source:sop-current",
                        "claim": "SOP-MNT-014 Rev 3.2 mandates immediate seal flush and vibration check.",
                        "confidence": 0.95
                    }
                ],
                "unresolved_questions": []
            }
        elif "diagnostician" in sp or "evolution" in user_prompt.lower():
            return {
                "diagnosis": "Research agent omitted checking the SOP revision status and effective date.",
                "proposed_fix": "Add mandatory SOP revision check step in system instructions.",
                "target_agent": "agent:research"
            }
        return {
            "summary": "Task analyzed and verified.",
            "status": "SUCCESS"
        }

class VertexAIGeminiAdapter(BaseModelAdapter):
    """Production Vertex AI Gemini adapter using official google-genai SDK in Vertex mode."""
    def __init__(self, project: str, location: str, model_id: str):
        from google import genai
        # Initialize client in Vertex mode via ADC
        self.client = genai.Client(vertexai=True, project=project, location=location)
        self.model_id = model_id

    async def generate_structured(self, system_prompt: str, user_prompt: str, schema: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        try:
            # Using genai client generate_content
            config: Dict[str, Any] = {
                "system_instruction": system_prompt,
                "temperature": 0.1,
            }
            if schema:
                config["response_mime_type"] = "application/json"
                config["response_schema"] = schema

            response = self.client.models.generate_content(
                model=self.model_id,
                contents=user_prompt,
                config=config
            )
            if response.text:
                return json.loads(response.text)
            return {"error": "Empty response from Vertex AI"}
        except Exception as e:
            logger.error("Vertex AI inference failure", exc_info=e)
            raise

_adapter_instance: Optional[BaseModelAdapter] = None

def get_model_adapter() -> BaseModelAdapter:
    global _adapter_instance
    if _adapter_instance is None:
        is_prod = settings.ENVIRONMENT.lower() in ["production", "prod"]
        use_live = os.environ.get("LARA_USE_LIVE_VERTEX_AI") == "true" or is_prod
        if is_prod and not use_live:
            raise RuntimeError("Production configuration error: Live Vertex AI adapter must be enabled in production. Mock adapter is strictly prohibited.")
        if use_live:
            if not settings.GOOGLE_CLOUD_PROJECT:
                raise RuntimeError("GOOGLE_CLOUD_PROJECT must be configured when connecting to Vertex AI.")
            _adapter_instance = VertexAIGeminiAdapter(
                project=settings.GOOGLE_CLOUD_PROJECT,
                location=settings.VERTEX_AI_LOCATION,
                model_id=settings.VERTEX_AI_MODEL
            )
        else:
            _adapter_instance = MockVertexAIAdapter()
    return _adapter_instance
