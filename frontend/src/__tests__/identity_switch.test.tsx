import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { api } from '../api/client';

describe('Identity Switch & Route Re-fetch Verification', () => {
  it('switches identity from Operator to Supervisor and re-resolves Information Highway route', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Information Highways')).toBeInTheDocument();
    });

    // Go to Information Highways tab
    fireEvent.click(screen.getByText('Information Highways'));

    // Wait for route to resolve for initial Operator (Maya)
    await waitFor(() => {
      expect(screen.getByText(/Resolved route for principal/i)).toBeInTheDocument();
    });

    // Verify that Operator route excludes vendor-contract with POLICY_DENIED
    const operatorRoute = await api.resolveRoute('task_demo_inc204');
    expect(operatorRoute.selected_sources).not.toContain('source:vendor-contract');
    expect(operatorRoute.excluded_candidates.some((e) => e.reason_code === 'POLICY_DENIED')).toBe(true);

    // Now switch identity to Ravi Supervisor
    const identityButton = screen.getByLabelText(/Switch demo principal/i);
    fireEvent.click(identityButton);

    const supervisorOption = screen.getByText('Ravi Supervisor');
    fireEvent.click(supervisorOption);

    // Wait for UI to update with Ravi Supervisor
    await waitFor(() => {
      expect(screen.getByText(/Ravi Supervisor/i)).toBeInTheDocument();
    });

    // Verify that Supervisor route now contains vendor-contract and does not exclude it
    const supervisorRoute = await api.resolveRoute('task_demo_inc204');
    expect(supervisorRoute.selected_sources).toContain('source:vendor-contract');
    expect(supervisorRoute.selected_path).toContain('source:vendor-contract');
  });
});
