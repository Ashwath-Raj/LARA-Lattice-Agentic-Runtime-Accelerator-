from typing import Dict, Any, List, Optional
from pathlib import Path
from backend.app.core.errors import NotFoundError

ROOT = Path(__file__).resolve().parents[3]

class AgentRegistry:
    def __init__(self, repo=None):
        from backend.app.repositories.base import get_repository
        self.repo = repo or get_repository()
        self._initialize_agents()

    def _initialize_agents(self):
        prompts_dir = ROOT / "prompts"

        self._agents = {
            "agent:research": {
                "agent_id": "agent:research",
                "name": "Research Specialist Agent",
                "role": "researcher",
                "description": "Discovers and extracts evidence from permitted operational incident logs, asset registries, and active SOPs.",
                "current_version": "v1.0.0",
                "status": "ACTIVE",
                "capabilities": ["source.read.internal", "source.read.confidential"],
                "versions": [
                    {
                        "version_id": "v1.0.0",
                        "status": "ACTIVE",
                        "created_at": "2026-11-20T00:00:00Z",
                        "prompt_file": "prompts/research_agent_v1.md",
                        "description": "Baseline research agent with SOP check guidelines"
                    }
                ],
                "skills": [
                    {
                        "skill_id": "skill:document-search",
                        "name": "Document Search",
                        "description": "Search and retrieve permitted documents based on task context.",
                        "risk_level": "LOW"
                    },
                    {
                        "skill_id": "skill:evidence-citation",
                        "name": "Evidence Citation",
                        "description": "Extract high-confidence evidence snippets with canonical source attribution.",
                        "risk_level": "LOW"
                    },
                    {
                        "skill_id": "skill:sop-verification",
                        "name": "SOP Verification",
                        "description": "Verify current revision and status of Standard Operating Procedures.",
                        "risk_level": "MEDIUM"
                    }
                ]
            },
            "agent:analysis": {
                "agent_id": "agent:analysis",
                "name": "Analysis Specialist Agent",
                "role": "analyst",
                "description": "Synthesizes validated evidence, generates competing hypotheses, determines probable root causes, and recommends corrective action.",
                "current_version": "v1.0.0",
                "status": "ACTIVE",
                "capabilities": ["data.synthesize", "hypothesis.evaluate"],
                "versions": [
                    {
                        "version_id": "v1.0.0",
                        "status": "ACTIVE",
                        "created_at": "2026-11-20T00:00:00Z",
                        "prompt_file": "prompts/analysis_agent_v1.md",
                        "description": "Baseline root cause analysis agent"
                    }
                ],
                "skills": [
                    {
                        "skill_id": "skill:root-cause-analysis",
                        "name": "Root Cause Analysis",
                        "description": "Systematic root cause analysis using fishbone and five-whys patterns.",
                        "risk_level": "MEDIUM"
                    },
                    {
                        "skill_id": "skill:hypothesis-generation",
                        "name": "Hypothesis Generation",
                        "description": "Generate and rank multiple diagnostic hypotheses against evidence.",
                        "risk_level": "MEDIUM"
                    }
                ]
            },
            "agent:verification": {
                "agent_id": "agent:verification",
                "name": "Verification Specialist Agent",
                "role": "verifier",
                "description": "Constitutional oversight agent that verifies evidence grounding, checks SOP effective dates, and flags unsupported claims.",
                "current_version": "v1.0.0",
                "status": "ACTIVE",
                "capabilities": ["claims.verify", "constitutional.enforce"],
                "versions": [
                    {
                        "version_id": "v1.0.0",
                        "status": "ACTIVE",
                        "created_at": "2026-11-20T00:00:00Z",
                        "prompt_file": "prompts/verification_agent_v1.md",
                        "description": "Constitutional verification agent"
                    }
                ],
                "skills": [
                    {
                        "skill_id": "skill:claim-validation",
                        "name": "Claim Validation",
                        "description": "Cross-check all analysis claims against authorized source evidence.",
                        "risk_level": "LOW"
                    },
                    {
                        "skill_id": "skill:revision-audit",
                        "name": "Revision Audit",
                        "description": "Confirm cited SOP is current, effective, and not obsolete.",
                        "risk_level": "MEDIUM"
                    }
                ]
            },
            "agent:diagnostician": {
                "agent_id": "agent:diagnostician",
                "name": "Evolution Diagnostician",
                "role": "diagnostician",
                "description": "Analyzes execution failure traces, diagnoses root causes in agent instructions, and drafts targeted candidate improvements.",
                "current_version": "v1.0.0",
                "status": "ACTIVE",
                "capabilities": ["trace.diagnose", "prompt.mutate"],
                "versions": [
                    {
                        "version_id": "v1.0.0",
                        "status": "ACTIVE",
                        "created_at": "2026-11-20T00:00:00Z",
                        "prompt_file": "prompts/evolution_diagnostician.md",
                        "description": "Trace diagnosis and prompt mutation generator"
                    }
                ],
                "skills": [
                    {
                        "skill_id": "skill:trace-failure-analysis",
                        "name": "Trace Failure Analysis",
                        "description": "Analyze agent execution failures and identify gaps in instructions.",
                        "risk_level": "HIGH"
                    }
                ]
            }
        }

    def list_agents(self) -> List[Dict[str, Any]]:
        return [
            {
                "agent_id": a["agent_id"],
                "name": a["name"],
                "role": a["role"],
                "description": a["description"],
                "current_version": a["current_version"],
                "status": a["status"],
                "capabilities": a["capabilities"]
            }
            for a in self._agents.values()
        ]

    def get_agent(self, agent_id: str) -> Dict[str, Any]:
        agent = self._agents.get(agent_id)
        if not agent:
            raise NotFoundError(f"Agent '{agent_id}' not found")
        return agent

    def get_agent_versions(self, agent_id: str) -> List[Dict[str, Any]]:
        agent = self.get_agent(agent_id)
        return agent.get("versions", [])

    def get_agent_skills(self, agent_id: str) -> List[Dict[str, Any]]:
        agent = self.get_agent(agent_id)
        return agent.get("skills", [])
