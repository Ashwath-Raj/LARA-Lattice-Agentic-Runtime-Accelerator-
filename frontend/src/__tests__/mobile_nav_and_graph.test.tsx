import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

describe('Mobile Navigation & Highways Graph Interactions', () => {
  it('opens and closes mobile navigation drawer via menu button, backdrop and Escape key', async () => {
    const { container } = render(<App />);

    const menuBtn = await screen.findByLabelText(/Open navigation/i);
    expect(menuBtn).toBeInTheDocument();
    expect(menuBtn).toHaveAttribute('aria-expanded', 'false');

    // Open drawer
    fireEvent.click(menuBtn);
    expect(menuBtn).toHaveAttribute('aria-expanded', 'true');

    const sidebar = container.querySelector('.context-sidebar');
    expect(sidebar).toHaveClass('mobile-visible');

    const scrim = container.querySelector('.mobile-scrim');
    expect(scrim).toBeInTheDocument();

    // Close via backdrop click
    if (scrim) fireEvent.click(scrim);
    expect(sidebar).not.toHaveClass('mobile-visible');
    expect(container.querySelector('.mobile-scrim')).toBeNull();

    // Reopen and close via Escape
    fireEvent.click(menuBtn);
    expect(sidebar).toHaveClass('mobile-visible');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(sidebar).not.toHaveClass('mobile-visible');

    // Reopen and navigate to close
    fireEvent.click(menuBtn);
    const highwaysLink = screen.getAllByText('Information Highways')[0];
    fireEvent.click(highwaysLink);
    await waitFor(() => {
      expect(sidebar).not.toHaveClass('mobile-visible');
      expect(screen.getByText('Dynamic Task Route Resolution')).toBeInTheDocument();
    });
  });

  it('renders Information Highways graph, supports pan buttons, and node selection with keyboard accessibility', async () => {
    render(<App />);

    // Navigate to Highways
    const highwaysLink = await screen.findByText('Information Highways');
    fireEvent.click(highwaysLink);
    await waitFor(() => {
      expect(screen.getByText('Dynamic Task Route Resolution')).toBeInTheDocument();
    });

    // Check pipeline hint and pan buttons
    expect(screen.getByText(/Pipeline:/i)).toBeInTheDocument();
    expect(screen.getByText(/Sources \(2\)/i)).toBeInTheDocument();
    const panLeftBtn = screen.getByLabelText('Scroll graph left');
    const panRightBtn = screen.getByLabelText('Scroll graph right');
    expect(panLeftBtn).toBeInTheDocument();
    expect(panRightBtn).toBeInTheDocument();

    // Clicking pan buttons does not throw
    fireEvent.click(panRightBtn);
    fireEvent.click(panLeftBtn);

    // Verify all 6 nodes exist with accessible roles and labels
    const nodes = [
      'Telemetry stream - Source (TEL-P204-0918)',
      'Maintenance SOP - Source (SOP-MNT-014)',
      'Incident workflow - Workflow (INC-204 investigation)',
      'Research Agent - Agent (Evidence retrieval)',
      'Verification Agent - Agent (Claim validation)',
      'Maintenance connector - Tool (Action: approval gated)'
    ];

    for (const label of nodes) {
      const nodeEl = screen.getByLabelText(label);
      expect(nodeEl).toBeInTheDocument();
      expect(nodeEl).toHaveAttribute('role', 'button');
      expect(nodeEl.getAttribute('tabindex') || String((nodeEl as HTMLElement).tabIndex)).toBe('0');
    }

    // Select Research Agent node
    const researchNode = screen.getByLabelText('Research Agent - Agent (Evidence retrieval)');
    fireEvent.click(researchNode);
    expect(researchNode).toHaveAttribute('aria-pressed', 'true');

    // Inspector updates with Research Agent details
    await waitFor(() => {
      expect(screen.getAllByText('Research Agent').length).toBeGreaterThan(0);
    });

    // Test keyboard selection on Tool node via Enter
    const toolNode = screen.getByLabelText('Maintenance connector - Tool (Action: approval gated)');
    fireEvent.keyDown(toolNode, { key: 'Enter' });
    expect(toolNode).toHaveAttribute('aria-pressed', 'true');
  });
});
