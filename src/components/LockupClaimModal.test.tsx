import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LockupClaimModal } from './LockupClaimModal';

describe('LockupClaimModal', () => {
  it('renders standard claim elements when open in default idle state', () => {
    render(<LockupClaimModal isOpen onClose={vi.fn()} />);

    // Header title and sub-heading
    expect(screen.getByRole('dialog', { name: /claim unlocked tokens/i })).toBeInTheDocument();
    expect(screen.getByText(/A portion of your locked allocation is now unlocked and available/i)).toBeInTheDocument();

    // Amount Displays
    const amountDisplays = screen.getAllByText(/12,500 REV/i);
    expect(amountDisplays.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/≈ \$4,230\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/25% unlocked/i)).toBeInTheDocument();

    // Summary Statistics
    expect(screen.getByText(/Total Allocation/i)).toBeInTheDocument();
    expect(screen.getByText(/50,000 REV/i)).toBeInTheDocument();
    expect(screen.getByText(/Remaining Locked/i)).toBeInTheDocument();
    expect(screen.getByText(/37,500 REV/i)).toBeInTheDocument();

    // Gas Estimates
    expect(screen.getByText(/Estimated Gas Fee/i)).toBeInTheDocument();
    expect(screen.getByText(/0.002 XLM/i)).toBeInTheDocument();

    // Auto-Claim and plain-text details
    expect(screen.getByRole('checkbox', { name: /enable auto-claim/i })).toBeInTheDocument();
    expect(screen.getByText(/automatically claim them for you whenever possible/i)).toBeInTheDocument();

    // Control buttons
    expect(screen.getByRole('button', { name: /claim now/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /claim later/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('allows toggling auto-claim preference and opening popover', async () => {
    const user = userEvent.setup();
    render(<LockupClaimModal isOpen onClose={vi.fn()} />);

    const checkbox = screen.getByRole('checkbox', { name: /enable auto-claim/i });
    expect(checkbox).not.toBeChecked();

    // Toggle ON
    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    // Toggle Info Popover
    const infoBtn = screen.getByRole('button', { name: /more information about auto-claim/i });
    expect(screen.queryByRole('dialog', { name: /auto-claim details/i })).not.toBeInTheDocument();

    await user.click(infoBtn);
    expect(screen.getByRole('dialog', { name: /auto-claim details/i })).toBeInTheDocument();
    expect(screen.getByText(/no manual approval is needed per unlock event/i)).toBeInTheDocument();

    // Close popover
    await user.click(screen.getByRole('button', { name: /close information popover/i }));
    expect(screen.queryByRole('dialog', { name: /auto-claim details/i })).not.toBeInTheDocument();
  });

  it('supports interactive developer state panel to preview gas warning', async () => {
    const user = userEvent.setup();
    render(<LockupClaimModal isOpen onClose={vi.fn()} />);

    // Click Developer settings gear button to open the control panel
    const gearBtn = screen.getByRole('button', { name: /toggle interactive developer states/i });
    await user.click(gearBtn);

    expect(screen.getByText(/Developer Interactive Simulator/i)).toBeInTheDocument();

    // Force High Gas Warning via developer simulator panel
    const gasWarningCheckbox = screen.getByRole('checkbox', { name: /force gas warning/i });
    expect(screen.queryByText(/Network fees are higher than usual/i)).not.toBeInTheDocument();

    await user.click(gasWarningCheckbox);
    expect(screen.getByText(/Network fees are higher than usual/i)).toBeInTheDocument();
  });

  it('runs transaction simulation and displays success details on completion', async () => {
    const user = userEvent.setup();
    render(<LockupClaimModal isOpen onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /claim now/i }));

    // Verify progress spinner/timeline
    expect(screen.getByText(/Submitting Transaction\.\.\./i)).toBeInTheDocument();
    expect(screen.getByText(/Wallet Confirmation/i)).toBeInTheDocument();

    // Fast forward mock timers or wait for UI transition
    await waitFor(
      () => {
        expect(screen.getByText(/Tokens Claimed Successfully!/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Verify post-claim statistics and explorer link
    expect(screen.getByText(/Amount Claimed/i)).toBeInTheDocument();
    const successDisplays = screen.getAllByText(/12,500 REV/i);
    expect(successDisplays.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Updated Remaining Locked/i)).toBeInTheDocument();
    expect(screen.getByText(/37,500 REV/i)).toBeInTheDocument();
    expect(screen.getByText(/0x9f1a\.\.\.4d8c/i)).toBeInTheDocument();

    // Close standard buttons
    expect(screen.getByRole('button', { name: /view transaction/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /done/i }));
  });

  it('handles empty states correctly via the interactive simulator panel', async () => {
    const user = userEvent.setup();
    render(<LockupClaimModal isOpen onClose={vi.fn()} />);

    // Open dev panel
    await user.click(screen.getByRole('button', { name: /toggle interactive developer states/i }));

    // Click '0 Claimable' preview
    await user.click(screen.getByRole('button', { name: '0 Claimable' }));
    expect(screen.getByText(/No Tokens Available to Claim/i)).toBeInTheDocument();
    expect(screen.getByText(/Next scheduled unlock: October 15, 2026/i)).toBeInTheDocument();

    // Click 'Fully Claimed' preview
    await user.click(screen.getByRole('button', { name: 'Fully Claimed' }));
    expect(screen.getByText(/Allocation Fully Claimed/i)).toBeInTheDocument();

    // Click 'Wallet Disconnected' preview
    await user.click(screen.getByRole('button', { name: 'Wallet Disconnected' }));
    expect(screen.getByText(/Wallet Connection Required/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
  });

  it('displays detailed warning and error messages accurately', async () => {
    const user = userEvent.setup();
    render(<LockupClaimModal isOpen onClose={vi.fn()} />);

    // Open dev panel
    await user.click(screen.getByRole('button', { name: /toggle interactive developer states/i }));

    // Simulator: Network Timeout
    await user.click(screen.getByRole('button', { name: 'Net Timeout' }));
    expect(screen.getByText(/Network Timeout/i)).toBeInTheDocument();
    expect(screen.getByText(/Please review gas fees and try again/i)).toBeInTheDocument();

    // Simulator: Insufficient Balance
    await user.click(screen.getByRole('button', { name: 'No Gas XLM' }));
    expect(screen.getByText(/Insufficient Balance/i)).toBeInTheDocument();
    expect(screen.getByText(/not have enough XLM in your wallet to cover network transaction costs/i)).toBeInTheDocument();
  });

  it('supports RTL layouts with language mirroring toggles', async () => {
    const user = userEvent.setup();
    render(<LockupClaimModal isOpen onClose={vi.fn()} />);

    // Check default dir is ltr
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('dir', 'ltr');

    // Enable RTL in dev simulator
    await user.click(screen.getByRole('button', { name: /toggle interactive developer states/i }));
    await user.click(screen.getByRole('checkbox', { name: /arabic rtl layout/i }));

    // Verify Arabic layout translations and dir attribute
    expect(dialog).toHaveAttribute('dir', 'rtl');
    expect(screen.getByText(/مطالبة بالرموز المفتوحة/i)).toBeInTheDocument();
  });
});
