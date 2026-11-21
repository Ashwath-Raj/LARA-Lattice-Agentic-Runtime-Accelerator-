import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

describe('LARA App Shell & Navigation', () => {
  it('renders LARA brand header, staging environment badge, and workbench', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('LARA')).toBeInTheDocument();
    });
    expect(screen.getByText('STAGING RUNTIME · lara-praneeth-stg-2026')).toBeInTheDocument();
    expect(screen.getByText('Enterprise Incident Workbench')).toBeInTheDocument();
    expect(screen.getByText('Start Investigation')).toBeInTheDocument();
  });

  it('navigates between tabs cleanly', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Information Highways')).toBeInTheDocument();
    });

    // Click Information Highways
    const highwaysTab = screen.getByText('Information Highways');
    fireEvent.click(highwaysTab);
    await waitFor(() => {
      expect(screen.getByText('Dynamic Task Route Resolution')).toBeInTheDocument();
    });

    // Click Agents
    const agentsTab = screen.getByText('Agents');
    fireEvent.click(agentsTab);
    await waitFor(() => {
      expect(screen.getByText('Specialist Agent Fleet')).toBeInTheDocument();
      expect(screen.getByText('Research Agent')).toBeInTheDocument();
      expect(screen.getByText('Analysis Agent')).toBeInTheDocument();
      expect(screen.getByText('Verification Agent')).toBeInTheDocument();
    });

    // Click Evolution Lab
    const evoTab = screen.getByText('Evolution Lab');
    fireEvent.click(evoTab);
    await waitFor(() => {
      expect(screen.getByText('Prompt & Skill Evolution Engine')).toBeInTheDocument();
      expect(screen.getByText(/Observed Failure Signal/i)).toBeInTheDocument();
    });

    // Click Governance
    const govTab = screen.getByText('Governance');
    fireEvent.click(govTab);
    await waitFor(() => {
      expect(screen.getByText('RBAC & ABAC Policy Authority')).toBeInTheDocument();
      expect(screen.getByText('Policy Decision Simulator')).toBeInTheDocument();
    });

    // Click Approvals
    const apprTab = screen.getByText('Approvals');
    fireEvent.click(apprTab);
    await waitFor(() => {
      expect(screen.getByText('Human-in-the-Loop Gateway')).toBeInTheDocument();
    });

    // Click Audit Trail
    const auditTab = screen.getByText('Audit Trail');
    fireEvent.click(auditTab);
    await waitFor(() => {
      expect(screen.getByText('Cryptographic Audit & Provenance')).toBeInTheDocument();
    });
  });
});
