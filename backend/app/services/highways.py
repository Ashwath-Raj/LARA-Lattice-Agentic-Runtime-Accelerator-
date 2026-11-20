import uuid
import networkx as nx
from typing import Dict, Any, List, Optional, Set
from backend.app.domain.models import Principal, PolicyDecisionEnum
from backend.app.services.policy import PolicyEngine
from backend.app.repositories.base import get_repository

class HighwayResolver:
    """Dynamic Information Highway route resolver using in-process NetworkX graph index."""

    def __init__(self, repo=None, policy_engine=None, retrieval_engine=None):
        self.repo = repo or get_repository()
        self.policy = policy_engine or PolicyEngine(self.repo)
        from backend.app.services.retrieval import DeterministicKnowledgeRetrievalEngine
        self.retrieval_engine = retrieval_engine or DeterministicKnowledgeRetrievalEngine(self.repo, self.policy)

    def retrieve_evidence(
        self,
        query: str,
        principal: Principal,
        task_id: Optional[str] = None,
        purpose: str = "incident_investigation"
    ):
        return self.retrieval_engine.retrieve(
            query=query,
            principal=principal,
            task_id=task_id,
            purpose=purpose
        )

    def _build_graph(self, tenant_id: str) -> nx.DiGraph:
        G = nx.DiGraph()
        nodes = self.repo.list("graph_nodes", {"tenant_id": tenant_id})
        for n in nodes:
            G.add_node(n["node_id"], **n)

        edges = self.repo.list("graph_edges", {"tenant_id": tenant_id})
        for e in edges:
            if e.get("enabled", True) and e.get("status") == "ACTIVE":
                G.add_edge(e["source_node"], e["target_node"], **e)
        return G

    def resolve_routes(
        self,
        principal: Principal,
        task_id: str,
        purpose: str = "incident_investigation"
    ) -> Dict[str, Any]:
        G = self._build_graph(principal.tenant_id)
        meta = self.repo.get("graph_meta", "current") or {"version": 1}
        graph_version = meta.get("version", 1)

        permitted_sources: List[str] = []
        permitted_tools: List[str] = []
        excluded_candidates: List[Dict[str, Any]] = []

        # 1. Filter nodes based on principal and policy
        for node_id, data in G.nodes(data=True):
            node_type = data.get("type")
            action = f"{node_type}.access"
            decision = self.policy.evaluate(principal, action, node_id, purpose)

            if decision.decision == PolicyDecisionEnum.ALLOW:
                if node_type == "source":
                    permitted_sources.append(node_id)
                elif node_type == "tool":
                    permitted_tools.append(node_id)
            else:
                excluded_candidates.append({
                    "node_id": node_id,
                    "reason_code": decision.reason_code,
                    "policy_id": decision.policy_id
                })

        # 2. Build permitted paths for workflow execution
        workflow_id = "workflow:incident-investigation"
        selected_path: List[str] = []
        alternative_paths: List[List[str]] = []

        if workflow_id in G:
            selected_path = [workflow_id]
            for agent_id in ["agent:research", "agent:analysis", "agent:verification"]:
                if agent_id in G and self.policy.evaluate(principal, "agent.execute", agent_id, purpose).decision == PolicyDecisionEnum.ALLOW:
                    selected_path.append(agent_id)
            # Add permitted primary sources to selected path
            for src in permitted_sources:
                selected_path.append(src)

            # Build alternative candidate paths with other permitted nodes
            if len(permitted_sources) > 3:
                alt = [workflow_id, "agent:research", "agent:analysis", "agent:verification"] + permitted_sources[3:6]
                alternative_paths.append(alt)


        # 3. Deterministic score calculation derived from graph metadata
        # Score = 0.35 * relevance + 0.25 * trust + 0.20 * freshness + 0.10 * availability + 0.10 * cost_efficiency
        avg_trust = 0.95
        if permitted_sources:
            trust_scores = []
            for src_id in permitted_sources:
                n = G.nodes[src_id] if src_id in G else {}
                trust_scores.append(n.get("trust_score", 0.90))
            avg_trust = sum(trust_scores) / len(trust_scores)

        relevance = min(1.0, 0.70 + (0.05 * len(permitted_sources)))
        trust = round(avg_trust, 3)
        freshness = 0.90
        availability = 1.0 if len(permitted_sources) > 0 else 0.50
        cost_efficiency = round(1.0 - (0.02 * len(selected_path)), 3)

        score_components = {
            "relevance": round(relevance, 3),
            "trust": trust,
            "freshness": freshness,
            "availability": availability,
            "cost_efficiency": cost_efficiency
        }

        # Filter excluded_candidates to not leak restricted resource metadata
        sanitized_excluded = []
        for exc in excluded_candidates:
            # Only reveal node_id and safe reason_code, no sensitive payload
            sanitized_excluded.append({
                "node_id": exc["node_id"],
                "reason_code": exc["reason_code"]
            })

        route_id = f"route_{uuid.uuid4().hex[:12]}"
        return {
            "route_id": route_id,
            "task_id": task_id,
            "principal_id": principal.principal_id,
            "permitted_sources": permitted_sources,
            "permitted_tools": permitted_tools,
            "selected_path": selected_path,
            "alternative_paths": alternative_paths,
            "excluded_candidates": sanitized_excluded,
            "score_components": score_components,
            "graph_version": graph_version
        }

    def get_summary(self, principal: Principal) -> Dict[str, Any]:
        G = self._build_graph(principal.tenant_id)
        meta = self.repo.get("graph_meta", "current") or {"version": 1}
        node_types: Dict[str, int] = {}
        for _, d in G.nodes(data=True):
            t = d.get("type", "unknown")
            node_types[t] = node_types.get(t, 0) + 1
        return {
            "node_count": G.number_of_nodes(),
            "edge_count": G.number_of_edges(),
            "node_types": node_types,
            "version": meta.get("version", 1),
            "tenant_id": principal.tenant_id
        }

    def get_nodes(self, principal: Principal, node_type: Optional[str] = None) -> List[Dict[str, Any]]:
        G = self._build_graph(principal.tenant_id)
        nodes = []
        for node_id, d in G.nodes(data=True):
            nt = d.get("type")
            if node_type and nt != node_type:
                continue
            decision = self.policy.evaluate(principal, f"{nt}.access", node_id, "inspection")
            if decision.decision == PolicyDecisionEnum.ALLOW:
                nodes.append({
                    "node_id": node_id,
                    "label": d.get("label", node_id),
                    "type": nt,
                    "classification": d.get("classification", "INTERNAL"),
                    "department": d.get("department")
                })
        return nodes

    def get_edges(self, principal: Principal) -> List[Dict[str, Any]]:
        permitted_nodes = {n["node_id"] for n in self.get_nodes(principal)}
        G = self._build_graph(principal.tenant_id)
        edges = []
        for u, v, d in G.edges(data=True):
            if u in permitted_nodes and v in permitted_nodes:
                edges.append({
                    "source": u,
                    "target": v,
                    "edge_type": d.get("edge_type", "FLOWS_TO"),
                    "weight": d.get("weight", 1.0)
                })
        return edges

    def preview_route(
        self,
        principal: Principal,
        intent: str,
        required_capabilities: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        simulated_task_id = "preview"
        result = self.resolve_routes(principal, simulated_task_id, purpose="preview")
        result["intent"] = intent
        if required_capabilities:
            result["required_capabilities"] = required_capabilities
        return result

    def get_version(self, principal: Principal) -> Dict[str, Any]:
        meta = self.repo.get("graph_meta", "current") or {"version": 1}
        v = meta.get("version", 1)
        return {
            "version": v,
            "graph_version": v,
            "tenant_id": principal.tenant_id,
            "updated_at": meta.get("updated_at", "2026-11-20T00:00:00Z")
        }
