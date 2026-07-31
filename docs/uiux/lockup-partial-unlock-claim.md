# Lockup Partial Unlock Claim Modal — Design Specification

## Purpose
When a portion of an investor's locked token allocation becomes unlocked and available to claim based on a vesting schedule, they require a clear, high-fidelity, and highly accessible user interface to understand their options and complete claims. This design document establishes the interactive, responsive, and accessibility-compliant specifications for the partial-unlock claim modal.

---

## User Flow Overview
```
Vesting Schedule (Portfolio)
   ↓
Unlocked Tokens Available
   ↓
Open Partial Claim Modal
   ↓
Review Amount & Estimated Network Gas Fee
   ↓
[Option] Learn how Auto-Claim works via interactive Info Popover
   ↓
Choose Claim Method:
   • "Claim Now" — Triggers immediate Web3 transaction
   • "Claim Later" — Defers claiming (no penalty)
   • "Enable Auto-Claim" (ON/OFF Toggle) — Automates future claim transactions
   ↓
Transaction Progress (Phase Timeline: Wallet Confirm → Processing → Finalizing)
   ↓
Success State (Explorer transaction link, claimed stats) OR Actionable Error State
```

---

## Screen States & Interaction Guidelines

### 1. Header Area
- **Title:** "Claim Unlocked Tokens" (English) or "مطالبة بالرموز المفتوحة" (Arabic RTL).
- **Sub-title:** High-clarity description: "A portion of your locked allocation is now unlocked and available."
- Includes standard Lucide `X` close icon with accessible focus outlines and labeled targets.

### 2. Unlocked Amount Display (Visual Accent Focus)
- Primary visual element utilizing bold typography hierarchy.
- Shows dynamic token values (e.g., `12,500 REV`), fiat equivalent estimate (`≈ $4,230.00`), and a pill badge indicating percentage unlocked (`25% unlocked`).

### 3. Vesting Schedule Summary Card
- Highlights concise schedule indicators for the investment:
  - **Total Allocation:** `50,000 REV`
  - **Claimed to Date:** `0 REV`
  - **Currently Claimable:** `12,500 REV` (highlighted)
  - **Remaining Locked:** `37,500 REV`
  - **Next Unlock Date:** `Oct 15, 2026`

### 4. Gas Estimate & Warning Card
- Renders the network gas fee estimate (e.g., `0.002 XLM ≈ $0.03`).
- **High Gas Alert:** Under high-traffic situations, a warning banner automatically renders notifying: "Network fees are higher than usual. You may choose to claim later when congestion is lower, or enable auto-claim."
- Meets WCAG 1.4.1 (No color-only communication) by utilizing warning symbols and explicit descriptive alert text.

### 5. Auto-Claim Toggle & Popover Box
- Includes an ON/OFF state toggle checkbox.
- A descriptive popover triggers on clicking the info icon next to the toggle. The popover details:
  - How automatic claims function hands-free.
  - Verification that preset smart contract permissions eliminate the need for active wallet approvals per unlock.
  - Simple guidance on turning the option off at any time.

### 6. Transaction Processing (Loading Mode)
- Triggers upon clicking **Claim Now**.
- Features an animated spinner and a dynamic phase timeline to guide users:
  1. **Wallet Confirmation:** Authorizing request inside the Web3 extension.
  2. **Processing:** Transmitting transaction on the blockchain.
  3. **Finalizing:** Smart contract state verification.
- Double-click prevention is implemented by disabling submit controls during execution.

### 7. Success State
- Clear success icon (`CheckCircle2`).
- Summary details: Claimed amount, remaining locked balances, and a mock transaction ID (`0x9f1a...4d8c`) linking directly to the block explorer.

### 8. Actionable Error Banners
- Handles standard edge cases gracefully inside the modal with distinct descriptions:
  - **Wallet Rejected:** Signature request was cancelled or declined.
  - **Network Timeout:** Slow network response.
  - **Gas Estimation Failure:** Smart contract gas estimation failed.
  - **Insufficient Balance:** Lacking base tokens (XLM) to pay for transactions.
  - **Wallet Disconnected:** Prompt to connect active Web3 wallet.

---

## Accessibility Compliance (WCAG 2.1 AA)
- **Keyboard Navigation:** Full focus trap inside the modal container when open. Tab/Shift+Tab navigate logically through active controls, and the `Escape` key immediately closes the dialog.
- **Screen Reader Announcements:** High-priority warnings and error states utilize semantic ARIA roles (`role="alert"` / `aria-live="assertive"`). Popovers have logical labels and controls (`role="dialog"`).
- **Contrast Ratios:** Text matches minimum contrast requirements (4.5:1 ratio). Interactive borders match 3:1 contrast against light/dark background themes.
- **Touch Targets:** Buttons and input targets are sized to at least `44px` on mobile preview layouts.

---

## Right-to-Left (RTL) Layout Adaptations
- Logical mirrors are fully supported. Layout transitions are managed dynamically using the `dir` document attribute (`dir="rtl"`).
- Button hierarchies and layouts are reversed properly.
- All iconography mirrors orientation directions safely without losing original semantic meaning.
