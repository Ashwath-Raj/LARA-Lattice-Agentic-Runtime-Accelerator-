import json
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from backend.app.domain.models import Principal, ClassificationLevel, PolicyDecisionEnum
from backend.app.services.policy import PolicyEngine
from backend.app.services.audit import AuditService
from backend.app.repositories.base import get_repository

ROOT = Path(__file__).resolve().parents[3]

class EvidenceItem(BaseModel):
    evidence_id: str
    source_id: str
    source_title: str
    source_revision: str
    classification: str
    content: str
    location: Optional[str] = None
    relevance_score: float = Field(ge=0.0, le=1.0)
    confidence: float = Field(ge=0.0, le=1.0)
    retrieved_at: str
    provenance: Dict[str, Any] = Field(default_factory=dict)

class RetrievalResult(BaseModel):
    task_id: Optional[str] = None
    query: str
    principal_id: str
    tenant_id: str
    permitted_sources: List[str]
    excluded_sources: List[Dict[str, str]]
    evidence: List[EvidenceItem]
    ranking_explanation: Dict[str, Any]
    retrieved_at: str

class BaseRetrievalEngine(ABC):
    @abstractmethod
    def retrieve(
        self,
        query: str,
        principal: Principal,
        task_id: Optional[str] = None,
        purpose: str = "incident_investigation",
        max_results: int = 10
    ) -> RetrievalResult:
        pass

class DeterministicKnowledgeRetrievalEngine(BaseRetrievalEngine):
    """
    Permission-aware Knowledge Retrieval Engine for Information Highways.
    Executes pipeline: Query -> Identity Context -> Policy Filtering -> Candidate Retrieval -> Ranking -> Evidence Packaging -> Agent Context.
    """

    def __init__(self, repo=None, policy_engine=None, audit_service=None):
        self.repo = repo or get_repository()
        self.policy = policy_engine or PolicyEngine(self.repo)
        self.audit = audit_service or AuditService(self.repo)
        self._sources: Dict[str, Dict[str, Any]] = {}
        self._initialize_knowledge_base()

    def _initialize_knowledge_base(self):
        # 1. Incident Log
        inc_file = ROOT / "data" / "synthetic" / "incidents.json"
        inc_records = []
        if inc_file.exists():
            inc_data = json.loads(inc_file.read_text(encoding="utf-8"))
            inc_records = inc_data.get("records", [])

        self.register_source({
            "source_id": "source:incident-log",
            "title": "Plant Incident Log",
            "tenant_id": "demo-enterprise",
            "classification": ClassificationLevel.INTERNAL.value,
            "status": "ACTIVE",
            "revision": "1.0",
            "trust_score": 0.98,
            "allowed_roles": ["operator", "supervisor", "runtime_admin"],
            "records": inc_records
        })

        # 2. Asset Registry
        asset_file = ROOT / "data" / "synthetic" / "assets.json"
        asset_records = []
        if asset_file.exists():
            asset_data = json.loads(asset_file.read_text(encoding="utf-8"))
            asset_records = asset_data.get("records", [])

        self.register_source({
            "source_id": "source:asset-registry",
            "title": "Enterprise Asset Registry",
            "tenant_id": "demo-enterprise",
            "classification": ClassificationLevel.INTERNAL.value,
            "status": "ACTIVE",
            "revision": "2026.4",
            "trust_score": 0.99,
            "allowed_roles": ["operator", "supervisor", "runtime_admin"],
            "records": asset_records
        })

        # 3. Maintenance History
        mnt_file = ROOT / "data" / "synthetic" / "maintenance_history.json"
        mnt_records = []
        if mnt_file.exists():
            mnt_data = json.loads(mnt_file.read_text(encoding="utf-8"))
            mnt_records = mnt_data.get("records", [])

        self.register_source({
            "source_id": "source:maintenance-history",
            "title": "Equipment Maintenance Log",
            "tenant_id": "demo-enterprise",
            "classification": ClassificationLevel.INTERNAL.value,
            "status": "ACTIVE",
            "revision": "1.2",
            "trust_score": 0.96,
            "allowed_roles": ["operator", "supervisor", "runtime_admin"],
            "records": mnt_records
        })

        # 4. Current SOP
        sop_curr_file = ROOT / "data" / "sops" / "SOP-MNT-014-current.md"
        sop_curr_text = sop_curr_file.read_text(encoding="utf-8") if sop_curr_file.exists() else ""
        self.register_source({
            "source_id": "source:sop-current",
            "title": "SOP-MNT-014 Pump Vibration Assessment",
            "tenant_id": "demo-enterprise",
            "classification": ClassificationLevel.INTERNAL.value,
            "status": "ACTIVE",
            "revision": "3.2",
            "effective_date": "2026-09-01",
            "trust_score": 0.99,
            "allowed_roles": ["operator", "supervisor", "runtime_admin"],
            "raw_text": sop_curr_text,
            "records": [
                {
                    "section": "Required Checks",
                    "content": "Verify SOP status, revision (3.2) and effective date (2026-09-01) before using it. Review operating envelope: vibration threshold 7.0 mm/s, bearing temperature threshold 80.0 degC.",
                    "location": "SOP-MNT-014 Sec 2"
                },
                {
                    "section": "Escalation & Approvals",
                    "content": "A maintenance request may be drafted but must not be submitted until Supervisor approval. Physical actuation/shutdown is strictly unsupported.",
                    "location": "SOP-MNT-014 Sec 3"
                }
            ]
        })

        # 5. Obsolete SOP (for stale detection)
        sop_obs_file = ROOT / "data" / "sops" / "SOP-MNT-014-obsolete.md"
        sop_obs_text = sop_obs_file.read_text(encoding="utf-8") if sop_obs_file.exists() else ""
        self.register_source({
            "source_id": "source:sop-obsolete",
            "title": "SOP-MNT-014 (Obsolete Rev 2.1)",
            "tenant_id": "demo-enterprise",
            "classification": ClassificationLevel.INTERNAL.value,
            "status": "OBSOLETE",
            "revision": "2.1",
            "effective_date": "2025-02-01",
            "trust_score": 0.40,
            "allowed_roles": ["operator", "supervisor", "runtime_admin"],
            "raw_text": sop_obs_text,
            "records": [
                {
                    "section": "Obsolete Notice",
                    "content": "Superseded by Revision 3.2. Intentionally omits mandatory revision date check.",
                    "location": "SOP-MNT-014 Rev 2.1"
                }
            ]
        })

        # 6. Confidential Vendor Contract
        vnd_file = ROOT / "data" / "synthetic" / "vendor_contracts.json"
        vnd_records = []
        if vnd_file.exists():
            vnd_data = json.loads(vnd_file.read_text(encoding="utf-8"))
            vnd_records = vnd_data.get("records", [])

        self.register_source({
            "source_id": "source:vendor-contract",
            "title": "Vendor Warranty & Inspection Agreement (Asterion)",
            "tenant_id": "demo-enterprise",
            "classification": ClassificationLevel.CONFIDENTIAL.value,
            "status": "ACTIVE",
            "revision": "2026-A",
            "trust_score": 0.95,
            "allowed_roles": ["supervisor", "runtime_admin"],
            "records": vnd_records
        })

    def register_source(self, metadata: Dict[str, Any]):
        sid = metadata["source_id"]
        self._sources[sid] = dict(metadata)

    def update_source_status(self, source_id: str, status: str):
        if source_id in self._sources:
            self._sources[source_id]["status"] = status

    def get_source(self, source_id: str) -> Optional[Dict[str, Any]]:
        return self._sources.get(source_id)

    def list_sources(self, tenant_id: str) -> List[Dict[str, Any]]:
        return [dict(s) for s in self._sources.values() if s.get("tenant_id") == tenant_id]

    def retrieve(
        self,
        query: str,
        principal: Principal,
        task_id: Optional[str] = None,
        purpose: str = "incident_investigation",
        max_results: int = 10
    ) -> RetrievalResult:
        if not principal or not principal.principal_id:
            from backend.app.core.errors import AuthenticationError
            raise AuthenticationError("Cannot retrieve evidence without authenticated principal identity")

        now = datetime.now(timezone.utc).isoformat()
        q_lower = query.lower()

        # Step 1: Policy filtering per source
        permitted_sources: List[str] = []
        excluded_sources: List[Dict[str, str]] = []

        for sid, src in self._sources.items():
            # Check tenant isolation
            if src.get("tenant_id") != principal.tenant_id:
                continue

            # Check source status - exclude obsolete sources by default unless explicitly asked
            if src.get("status") == "OBSOLETE" and "obsolete" not in q_lower and "rev 2.1" not in q_lower:
                excluded_sources.append({
                    "source_id": sid,
                    "reason_code": "SOURCE_OBSOLETE"
                })
                continue

            if src.get("status") in ["UNAVAILABLE", "DEPRECATED"]:
                excluded_sources.append({
                    "source_id": sid,
                    "reason_code": "SOURCE_UNAVAILABLE"
                })
                continue

            # Check authorization through policy engine
            decision = self.policy.evaluate(
                principal=principal,
                action="source.read",
                resource_id=sid,
                purpose=purpose
            )

            if decision.decision == PolicyDecisionEnum.ALLOW:
                permitted_sources.append(sid)
            else:
                excluded_sources.append({
                    "source_id": sid,
                    "reason_code": decision.reason_code
                })

        # Step 2: Extract candidate evidence from permitted sources
        candidate_evidence: List[EvidenceItem] = []

        for sid in permitted_sources:
            src = self._sources[sid]
            trust = src.get("trust_score", 0.90)

            if sid == "source:incident-log":
                for rec in src.get("records", []):
                    # Check incident matching
                    inc_id = rec.get("incident_id", "")
                    asset_id = rec.get("asset_id", "")
                    content_str = (
                        f"Incident {inc_id} ({asset_id} at {rec.get('site')}): {rec.get('summary')} "
                        f"Readings: " + ", ".join([f"{o['metric']}={o['value']} {o['unit']}" for o in rec.get("observations", [])])
                    )
                    relevance = 0.95 if (inc_id.lower() in q_lower or asset_id.lower() in q_lower or "incident" in q_lower or "vibration" in q_lower) else 0.70
                    candidate_evidence.append(EvidenceItem(
                        evidence_id=f"evi_{uuid.uuid4().hex[:10]}",
                        source_id=sid,
                        source_title=src["title"],
                        source_revision=src["revision"],
                        classification=src["classification"],
                        content=content_str,
                        location=f"Record {inc_id}",
                        relevance_score=relevance,
                        confidence=trust,
                        retrieved_at=now,
                        provenance={"tenant_id": principal.tenant_id, "principal_id": principal.principal_id, "query": query}
                    ))

            elif sid == "source:asset-registry":
                for rec in src.get("records", []):
                    asset_id = rec.get("asset_id", "")
                    env = rec.get("operating_envelope", {})
                    vib_thresh = env.get("vibration_rms", {}).get("review_threshold")
                    temp_thresh = env.get("bearing_temperature", {}).get("review_threshold")
                    content_str = (
                        f"Asset {asset_id} ({rec.get('asset_type')} at {rec.get('site')}): Status {rec.get('status')}. "
                        f"Operating Review Envelope: vibration_rms <= {vib_thresh} mm/s, bearing_temperature <= {temp_thresh} degC."
                    )
                    relevance = 0.95 if (asset_id.lower() in q_lower or "envelope" in q_lower or "threshold" in q_lower or "asset" in q_lower) else 0.65
                    candidate_evidence.append(EvidenceItem(
                        evidence_id=f"evi_{uuid.uuid4().hex[:10]}",
                        source_id=sid,
                        source_title=src["title"],
                        source_revision=src["revision"],
                        classification=src["classification"],
                        content=content_str,
                        location=f"Asset {asset_id}",
                        relevance_score=relevance,
                        confidence=trust,
                        retrieved_at=now,
                        provenance={"tenant_id": principal.tenant_id, "principal_id": principal.principal_id, "query": query}
                    ))

            elif sid == "source:maintenance-history":
                for rec in src.get("records", []):
                    content_str = (
                        f"Maintenance Event {rec.get('record_id')} for {rec.get('asset_id')} on {rec.get('date')}: "
                        f"{rec.get('summary')} (Outcome: {rec.get('outcome')})"
                    )
                    relevance = 0.90 if ("maintenance" in q_lower or "history" in q_lower or rec.get("asset_id", "").lower() in q_lower) else 0.60
                    candidate_evidence.append(EvidenceItem(
                        evidence_id=f"evi_{uuid.uuid4().hex[:10]}",
                        source_id=sid,
                        source_title=src["title"],
                        source_revision=src["revision"],
                        classification=src["classification"],
                        content=content_str,
                        location=rec.get("record_id"),
                        relevance_score=relevance,
                        confidence=trust,
                        retrieved_at=now,
                        provenance={"tenant_id": principal.tenant_id, "principal_id": principal.principal_id, "query": query}
                    ))

            elif sid == "source:sop-current":
                for rec in src.get("records", []):
                    content_str = f"SOP-MNT-014 Rev 3.2 [{rec.get('section')}]: {rec.get('content')}"
                    relevance = 0.95 if ("sop" in q_lower or "mnt-014" in q_lower or "procedure" in q_lower or "vibration" in q_lower) else 0.65
                    candidate_evidence.append(EvidenceItem(
                        evidence_id=f"evi_{uuid.uuid4().hex[:10]}",
                        source_id=sid,
                        source_title=src["title"],
                        source_revision=src["revision"],
                        classification=src["classification"],
                        content=content_str,
                        location=rec.get("location"),
                        relevance_score=relevance,
                        confidence=trust,
                        retrieved_at=now,
                        provenance={"tenant_id": principal.tenant_id, "principal_id": principal.principal_id, "effective_date": "2026-09-01"}
                    ))

            elif sid == "source:vendor-contract":
                for rec in src.get("records", []):
                    content_str = (
                        f"Vendor Contract {rec.get('contract_id')} ({rec.get('vendor')} for {rec.get('asset_id')}): "
                        f"{rec.get('terms_summary')} [CONFIDENTIAL]"
                    )
                    relevance = 0.95 if ("vendor" in q_lower or "contract" in q_lower or "warranty" in q_lower or rec.get("asset_id", "").lower() in q_lower) else 0.60
                    candidate_evidence.append(EvidenceItem(
                        evidence_id=f"evi_{uuid.uuid4().hex[:10]}",
                        source_id=sid,
                        source_title=src["title"],
                        source_revision=src["revision"],
                        classification=src["classification"],
                        content=content_str,
                        location=rec.get("contract_id"),
                        relevance_score=relevance,
                        confidence=trust,
                        retrieved_at=now,
                        provenance={"tenant_id": principal.tenant_id, "principal_id": principal.principal_id, "classification": "CONFIDENTIAL"}
                    ))

        # Step 3: Ranking
        # Combined score = 0.6 * relevance + 0.4 * confidence
        candidate_evidence.sort(key=lambda ev: (0.6 * ev.relevance_score + 0.4 * ev.confidence), reverse=True)
        ranked_evidence = candidate_evidence[:max_results]

        # Step 4: Record Audit Event
        self.audit.record_event(
            event_type="EVIDENCE_RETRIEVED",
            principal_id=principal.principal_id,
            task_id=task_id,
            action="highways.retrieve",
            policy_decision="ALLOW",
            reason_code="PERMITTED_EVIDENCE_RETRIEVAL",
            tenant_id=principal.tenant_id,
            details={
                "query": query,
                "permitted_source_count": len(permitted_sources),
                "excluded_source_count": len(excluded_sources),
                "evidence_count": len(ranked_evidence),
                "permitted_sources": permitted_sources,
                "excluded_sources": excluded_sources
            }
        )

        return RetrievalResult(
            task_id=task_id,
            query=query,
            principal_id=principal.principal_id,
            tenant_id=principal.tenant_id,
            permitted_sources=permitted_sources,
            excluded_sources=excluded_sources,
            evidence=ranked_evidence,
            ranking_explanation={
                "ranking_algorithm": "deterministic_weighted",
                "weights": {"relevance": 0.60, "confidence": 0.40},
                "total_candidates": len(candidate_evidence),
                "returned_candidates": len(ranked_evidence)
            },
            retrieved_at=now
        )
