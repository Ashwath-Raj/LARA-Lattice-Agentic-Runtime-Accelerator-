# 07 — Synthetic Data, Knowledge Sources and SOP Specification

## 1. Purpose

The demo must be repeatable without real company data. All records in this pack are fictional and generated for the LARA prototype. They must be visibly labelled `SYNTHETIC DEMO DATA` in the UI and must not be represented as a real customer deployment.

## 2. Scenario

A synthetic industrial operator reports repeated vibration and temperature anomalies on pump asset `P-204` at fictional `Northstar Process Works`. The runtime must investigate incident `INC-204`, inspect asset history, consult current procedures, identify a stale SOP and a restricted vendor contract, coordinate agents, produce an evidence-backed response and prepare a simulated maintenance request.

The same task is run as Operator and Supervisor to demonstrate identity-sensitive route resolution.

## 3. Data files

- `data/synthetic/incidents.json`: incidents and observations.
- `data/synthetic/assets.json`: asset registry.
- `data/synthetic/maintenance_history.json`: prior maintenance records.
- `data/synthetic/vendor_contracts.json`: confidential vendor data.
- `data/synthetic/users.json`: demo principal definitions (no plaintext passwords).
- `data/synthetic/graph_nodes.json`: highway graph nodes.
- `data/synthetic/graph_edges.json`: highway graph edges.
- `data/synthetic/evolution_failure.json`: seeded recurring agent failure.
- `data/sops/SOP-MNT-014-current.md`: current maintenance procedure.
- `data/sops/SOP-MNT-014-obsolete.md`: obsolete procedure for freshness/revision tests.

## 4. Synthetic SOP current — SOP-MNT-014 rev 3.2

**Title:** Pump Vibration and Temperature Anomaly Assessment  
**Status:** CURRENT — effective 2026-09-01  
**Classification:** INTERNAL  
**Scope:** synthetic pump asset P-204 only for demo.

### Required procedure checks
1. Confirm asset ID and operating context from the asset registry.
2. Confirm source record timestamp and measurement units.
3. Compare vibration and temperature readings to the synthetic operating envelope in the asset record. Do not invent missing thresholds.
4. Check the revision and effective date of this SOP before relying on it.
5. Review maintenance history for repeat incidents.
6. Separate observed facts from hypotheses.
7. Prepare a maintenance recommendation with evidence references and uncertainty.
8. Do not issue a work order automatically. Submit a simulated request for Supervisor approval.
9. Do not operate, stop, start or alter physical equipment. All actuation is unsupported.

### Escalation rules for demo
- If a measurement is missing or unit is ambiguous: mark `NEEDS_INPUT`.
- If the record is outside the supplied synthetic operating envelope: flag for Supervisor review; do not invent an engineering threshold.
- If evidence conflicts: Verification Agent returns `NEEDS_REVIEW`.
- If SOP is obsolete: exclude it from authoritative recommendation and cite the current revision.

## 5. Obsolete SOP — SOP-MNT-014 rev 2.1

**Status:** OBSOLETE — superseded 2026-09-01.  
This file intentionally contains older instructions and must never be treated as current authority. It exists to test freshness-aware routing and the evolution engine's requirement to check revision/effective date.

## 6. Expected incident result

The runtime should:
- identify incident `INC-204` and asset `P-204`;
- retrieve current SOP rev 3.2;
- identify that rev 2.1 is obsolete and exclude it from current procedural advice;
- retrieve permitted maintenance history;
- identify repeated vibration/temperature observations as evidence, not assert an unproven root cause;
- produce a response recommendation with citations and uncertainty;
- propose `maintenance_request.create_simulated`;
- require Supervisor approval before creating the simulated request;
- deny `equipment.control` regardless of identity.

## 7. Restricted vendor source

`vendor_contracts.json` is classified `CONFIDENTIAL`. Operator cannot discover its metadata or content. Supervisor can access it only when the task purpose and clearance policy pass. The Operator-facing UI should show `A restricted source was excluded by access policy`, not reveal vendor name, contract terms or hidden metadata.

## 8. Synthetic data rules

- Use fictional company/person/asset names.
- No real customer or university information.
- Every record has `synthetic: true` and `tenant_id: demo-enterprise`.
- Timestamps should be deterministic for benchmark tests; use fixed ISO values in fixture files.
- Do not use random generation during demo; seed files must produce identical records each time.
- Seed script must be idempotent and versioned.
- Re-seeding must not duplicate graph edges, approvals or audit events.
