import networkx as nx
from typing import Dict, Any, List, Optional, Set
from backend.app.domain.models import Principal, PolicyDecisionEnum
from backend.app.services.policy import PolicyEngine
from backend.app.repositories.base import get_repository

class HighwayResolver:
    """Dynamic Information Highway route resolver using in-process NetworkX graph index."""

    def __init__(self, repo=None, policy_engine=None):
        self.repo = repo or get_repository()
        self.policy = policy_engine or PolicyEngine(self.repo)

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
        # Workflow start: workflow:incident-investigation
        workflow_id = "workflow:incident-investigation"
        selected_path: List[str] = []
        alternative_paths: List[List[str]] = []

        if workflow_id in G:
            # Simple bounded traversal: workflow -> agents -> sources/tools/skills
            selected_path = [workflow_id]
            for agent_id in ["agent:research", "agent:analysis", "agent:verification"]:
                if agent_id in G and self.policy.evaluate(principal, "agent.execute", agent_id, purpose).decision == PolicyDecisionEnum.ALLOW:
                    selected_path.append(agent_id)

        # 3. Deterministic score calculation
        score_components = {
            "relevance": 0.95,
            "trust": 0.92,
            "freshness": 0.88,
            "availability": 1.0,
            "cost_efficiency": 0.90
        }

        return {
            "task_id": task_id,
            "principal_id": principal.principal_id,
            "permitted_sources": permitted_sources,
            "permitted_tools": permitted_tools,
            "selected_path": selected_path,
            "alternative_paths": alternative_paths,
            "excluded_candidates": excluded_candidates,
            "score_components": score_components,
            "graph_version": graph_version
        }
