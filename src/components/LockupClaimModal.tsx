import React, { useEffect, useId, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronRight,
  Info,
  Sparkles,
  X,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Lock,
  Settings,
  Wallet,
} from 'lucide-react';
import { Button } from './Button';

interface LockupClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  unlockedAmount?: string;
  gasEstimate?: number;
  initialAutoClaim?: boolean;
}

// Focus trap utility
const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  return Array.from(
    container.querySelectorAll(
      'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]',
    ),
  ) as HTMLElement[];
};

export const LockupClaimModal: React.FC<LockupClaimModalProps> = ({
  isOpen,
  onClose,
  unlockedAmount: propUnlockedAmount = '12,500 REV',
  gasEstimate: propGasEstimate = 0.002,
  initialAutoClaim = false,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const popoverId = useId();

  // Modal Screen States: 'idle' | 'loading' | 'success'
  const [screen, setScreen] = useState<'idle' | 'loading' | 'success'>('idle');

  // Loading phase tracking
  const [loadingPhase, setLoadingPhase] = useState<'wallet' | 'processing' | 'finalizing'>('wallet');

  // Interactive configurations & Simulator states
  const [autoClaim, setAutoClaim] = useState(initialAutoClaim);
  const [showAutoClaimInfo, setShowAutoClaimInfo] = useState(false);
  const [highGasWarning, setHighGasWarning] = useState(false);
  const [isRtl, setIsRtl] = useState(false);

  // Simulation controls
  const [emptyState, setEmptyState] = useState<'none' | 'zero' | 'fully_claimed' | 'not_started' | 'loading_data' | 'disconnected'>('none');
  const [errorState, setErrorState] = useState<'none' | 'wallet_rejected' | 'timeout' | 'gas_failed' | 'tx_failed' | 'insufficient' | 'unknown'>('none');

  // Interactive UI customization
  const [showDevPanel, setShowDevPanel] = useState(false);

  // Mock static values that can be customized
  const tokenSymbol = 'REV';
  const tokenPriceUsd = 0.3384; // $4,230 for 12,500 tokens
  const totalAllocation = 50000;
  const claimedToDate = 0;
  const claimableTokens = emptyState === 'zero' ? 0 : 12500;
  const remainingLocked = emptyState === 'fully_claimed' ? 0 : 37500;
  const nextUnlockDate = emptyState === 'not_started' ? 'Nov 01, 2026' : 'Oct 15, 2026';

  // Format currency helpers
  const formatTokens = (val: number) => val.toLocaleString('en-US');
  const formatUsd = (val: number) =>
    val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trapping
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = getFocusableElements(dialogRef.current);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Initial focus management
  useEffect(() => {
    if (!isOpen) {
      setScreen('idle');
      setLoadingPhase('wallet');
      setShowAutoClaimInfo(false);
      setEmptyState('none');
      setErrorState('none');
      return;
    }

    // Set focus inside the dialog when opened
    const timer = setTimeout(() => {
      if (dialogRef.current) {
        const focusable = getFocusableElements(dialogRef.current);
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          dialogRef.current.focus();
        }
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // Simulation timers for loading states
  const runTransactionSimulation = () => {
    setScreen('loading');
    setLoadingPhase('wallet');
    setErrorState('none');

    // Simulate flow: Wallet -> Processing -> Finalizing -> Success/Error
    setTimeout(() => {
      setLoadingPhase('processing');
      setTimeout(() => {
        setLoadingPhase('finalizing');
        setTimeout(() => {
          if (errorState !== 'none' && errorState !== 'wallet_rejected') {
            setScreen('idle'); // Back to idle to show error banner
          } else {
            setScreen('success');
          }
        }, 1500);
      }, 1500);
    }, 1500);
  };

  if (!isOpen) return null;

  // Render standard Header
  const renderHeader = () => (
    <div className={`flex items-start justify-between gap-4 border-b border-slate-800 pb-4 ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}>
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 id={titleId} className="text-xl font-bold text-white leading-tight">
            {isRtl ? 'مطالبة بالرموز المفتوحة' : 'Claim Unlocked Tokens'}
          </h2>
          <p id={descriptionId} className="mt-1 text-xs text-slate-400">
            {isRtl
              ? 'يتوفر جزء من تخصيص الرموز المميزة المقفلة للمطالبة به الآن.'
              : 'A portion of your locked allocation is now unlocked and available.'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        aria-label={isRtl ? 'إغلاق النافذة' : 'Close claim modal'}
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );

  // Render Unlocked Amount display (visually emphasized)
  const renderAmountDisplay = () => {
    const formattedAmount = propUnlockedAmount.includes('REV') ? propUnlockedAmount : `${formatTokens(claimableTokens)} ${tokenSymbol}`;
    const formattedUsdEquivalent = formatUsd(claimableTokens * tokenPriceUsd);
    const unlockedPercentage = Math.round((claimableTokens / totalAllocation) * 100);

    return (
      <div className={`rounded-2xl border border-slate-800 bg-slate-900/60 p-5 ${isRtl ? 'text-right' : 'text-left'}`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {isRtl ? 'متاح للمطالبة' : 'Available to Claim'}
        </p>
        <div className={`mt-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 ${isRtl ? 'sm:flex-row-reverse' : ''}`}>
          <div>
            <span className="text-3xl font-extrabold tracking-tight text-white">
              {formattedAmount}
            </span>
            <span className={`block text-sm font-medium text-slate-400 mt-0.5 ${isRtl ? 'mr-1' : ''}`}>
              {isRtl ? 'يعادل تقريباً' : '≈'} {formattedUsdEquivalent}
            </span>
          </div>
          <div className="self-start rounded-full bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-900/50">
            {isRtl ? `${unlockedPercentage}% مفتوح` : `${unlockedPercentage}% unlocked`}
          </div>
        </div>
      </div>
    );
  };

  // Render Vesting Summary Section (Concise metrics list)
  const renderVestingSummary = () => {
    const metrics = [
      { label: isRtl ? 'إجمالي التخصيص' : 'Total Allocation', value: `${formatTokens(totalAllocation)} ${tokenSymbol}` },
      { label: isRtl ? 'المطالب بها' : 'Claimed to Date', value: `${formatTokens(claimedToDate)} ${tokenSymbol}` },
      { label: isRtl ? 'متاح حالياً' : 'Currently Claimable', value: `${formatTokens(claimableTokens)} ${tokenSymbol}`, highlight: true },
      { label: isRtl ? 'المتبقي المقفل' : 'Remaining Locked', value: `${formatTokens(remainingLocked)} ${tokenSymbol}` },
      { label: isRtl ? 'تاريخ الفتح القادم' : 'Next Unlock Date', value: nextUnlockDate },
    ];

    return (
      <div className="rounded-xl border border-slate-800 p-4 space-y-3">
        <h3 className={`text-xs font-bold uppercase tracking-wider text-slate-400 ${isRtl ? 'text-right' : 'text-left'}`}>
          {isRtl ? 'ملخص الاستحقاق' : 'Vesting Schedule Summary'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {metrics.map((m, i) => (
            <div
              key={i}
              className={`flex items-center justify-between p-2 rounded-lg bg-slate-900/30 border border-slate-800/50 text-xs ${
                m.highlight ? 'border-primary/20 bg-primary/5' : ''
              } ${isRtl ? 'flex-row-reverse' : ''}`}
            >
              <span className="text-slate-400">{m.label}</span>
              <span className={`font-semibold ${m.highlight ? 'text-primary' : 'text-slate-200'}`}>
                {m.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render Gas Estimate and Warning Display
  const renderGasEstimate = () => {
    const calculatedFee = isNaN(propGasEstimate) ? 0.002 : propGasEstimate;
    const isGasUnavailable = errorState === 'gas_failed';

    return (
      <div className="space-y-3">
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-800 p-4 ${isRtl ? 'sm:flex-row-reverse' : ''}`}>
          <div className={`${isRtl ? 'text-right' : 'text-left'}`}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {isRtl ? 'رسوم الغاز المقدرة' : 'Estimated Gas Fee'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {isRtl
                ? 'قد تختلف الرسوم الفعلية قليلاً بناءً على ازدحام الشبكة.'
                : 'Actual fee may vary slightly depending on network congestion.'}
            </p>
          </div>
          {isGasUnavailable ? (
            <div className={`flex items-center gap-2 text-rose-400 text-sm font-semibold ${isRtl ? 'flex-row-reverse' : ''}`}>
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <span>{isRtl ? 'تعذر تقدير الغاز' : 'Gas unavailable'}</span>
            </div>
          ) : (
            <div className={`${isRtl ? 'text-left' : 'text-right'}`}>
              <span className="text-sm font-bold text-slate-200">
                {calculatedFee} XLM
              </span>
              <span className="block text-xs text-slate-400">
                ≈ {formatUsd(calculatedFee * 15)}
              </span>
            </div>
          )}
        </div>

        {/* High Gas Warning Alert */}
        {(highGasWarning || errorState === 'timeout') && (
          <div
            role="alert"
            className={`flex items-start gap-3 rounded-xl border border-amber-900/30 bg-amber-950/20 p-4 text-xs leading-relaxed text-amber-400 ${
              isRtl ? 'flex-row-reverse text-right' : 'text-left'
            }`}
          >
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-amber-300">
                {isRtl ? 'رسوم شبكة مرتفعة بشكل غير عادة' : 'Network fees are higher than usual'}
              </p>
              <p className="mt-1">
                {isRtl
                  ? 'قد ترغب في تأجيل المطالبة حتى تنخفض الرسوم أو تمكين المطالبة التلقائية لتنفيذها عندما تكون الرسوم مثالية.'
                  : 'You may choose to claim later when congestion is lower, or enable auto-claim.'}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Auto-Claim switch with plain-language explanation and interactive Popover
  const renderAutoClaimToggle = () => (
    <div className="relative rounded-xl border border-slate-800 p-4">
      <div className={`flex items-start justify-between gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div className="flex-1">
          <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <label
              htmlFor="auto-claim-checkbox"
              className="flex items-center gap-2.5 text-sm font-semibold text-slate-200 cursor-pointer"
            >
              <input
                id="auto-claim-checkbox"
                type="checkbox"
                checked={autoClaim}
                onChange={(e) => setAutoClaim(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-slate-700 text-primary focus:ring-primary bg-slate-900 cursor-pointer"
              />
              {isRtl ? 'تمكين المطالبة التلقائية' : 'Enable Auto-Claim'}
            </label>

            {/* Info Popover Anchor Button */}
            <button
              type="button"
              onClick={() => setShowAutoClaimInfo(!showAutoClaimInfo)}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-expanded={showAutoClaimInfo}
              aria-controls={popoverId}
              aria-label={isRtl ? 'مزيد من المعلومات عن المطالبة التلقائية' : 'More information about Auto-Claim'}
            >
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <p className={`mt-2 text-xs leading-relaxed text-slate-400 ${isRtl ? 'text-right' : 'text-left'}`}>
            {isRtl
              ? 'عند فتح الرموز المستقبلية، سيقوم النظام بالمطالبة بها تلقائياً نيابة عنك كلما كان ذلك ممكناً. يمكنك إلغاء هذا الخيار في أي وقت.'
              : 'When future tokens unlock, the application will automatically claim them for you whenever possible. You can turn this off at any time.'}
          </p>
        </div>

        {/* ON / OFF Badge indicator */}
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-2xs font-extrabold uppercase tracking-wider ${
            autoClaim
              ? 'bg-primary/10 text-primary'
              : 'bg-slate-800 text-slate-500'
          }`}
        >
          {autoClaim ? (isRtl ? 'مفعّل' : 'ON') : (isRtl ? 'معطل' : 'OFF')}
        </span>
      </div>

      {/* Info Popover element */}
      {showAutoClaimInfo && (
        <div
          id={popoverId}
          role="dialog"
          aria-label={isRtl ? 'تفاصيل المطالبة التلقائية' : 'Auto-Claim Details'}
          className={`absolute z-10 mt-3 w-80 rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-xl text-xs leading-relaxed text-slate-300 animate-fade-in ${
            isRtl ? 'left-4 right-auto text-right' : 'right-4 left-auto text-left'
          }`}
        >
          <div className={`flex items-center justify-between border-b border-slate-700 pb-2 mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <span className="font-bold text-white">
              {isRtl ? 'كيف تعمل المطالبة التلقائية؟' : 'How Auto-Claim Works'}
            </span>
            <button
              type="button"
              onClick={() => setShowAutoClaimInfo(false)}
              className="text-slate-400 hover:text-slate-200"
              aria-label={isRtl ? 'إغلاق نافذة المعلومات' : 'Close information popover'}
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
          <ul className="space-y-2 list-disc pl-4 pr-1">
            <li>
              {isRtl
                ? 'تعمل المطالبة التلقائية بشكل كامل في الخلفية دون الحاجة إلى فتح المحفظة يدوياً في كل مرة.'
                : 'Auto-claim runs fully hands-free in the background without needing manual wallet authorization for each unlock.'}
            </li>
            <li>
              {isRtl
                ? 'يتم تشغيلها تلقائياً بمجرد حلول موعد الفتح التالي مباشرة.'
                : 'It triggers automatically as soon as the scheduled unlock time is reached.'}
            </li>
            <li>
              {isRtl
                ? 'لا تتطلب موافقة فورية من المحفظة عند كل معاملة، حيث يتم استخدام تفويض مسبق.'
                : 'No manual approval is needed per unlock event, thanks to preset smart contract permissioning.'}
            </li>
            <li>
              {isRtl
                ? 'يمكنك تعطيل هذه الميزة في أي وقت وبكل سهولة من إعدادات حسابك.'
                : 'Can be easily deactivated at any moment through your project settings.'}
            </li>
          </ul>
        </div>
      )}
    </div>
  );

  // Render Action Buttons
  const renderActions = () => {
    const isZeroAmount = claimableTokens === 0;

    return (
      <div className={`flex flex-col sm:flex-row gap-3 pt-2 ${isRtl ? 'sm:flex-row-reverse' : 'sm:justify-end'}`}>
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          className="w-full sm:w-auto h-[44px] min-w-[100px]"
        >
          {isRtl ? 'إلغاء' : 'Cancel'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            // Trigger Claim Later State simulation
            onClose();
          }}
          className="w-full sm:w-auto h-[44px]"
        >
          {isRtl ? 'المطالبة لاحقاً' : 'Claim Later'}
        </Button>
        <Button
          type="button"
          onClick={runTransactionSimulation}
          disabled={isZeroAmount || emptyState === 'disconnected' || emptyState === 'loading_data'}
          className="w-full sm:w-auto h-[44px] min-w-[120px]"
        >
          {isRtl ? 'المطالبة الآن' : 'Claim Now'}
          <ChevronRight className={`ml-2 h-4 w-4 inline ${isRtl ? 'rotate-180 mr-2 ml-0' : ''}`} aria-hidden="true" />
        </Button>
      </div>
    );
  };

  // Render Loading / Transaction Progress State
  const renderLoadingState = () => {
    const phases = [
      { key: 'wallet', label: isRtl ? 'تأكيد المحفظة' : 'Wallet Confirmation', desc: isRtl ? 'يرجى تأكيد المعاملة في محفظتك الموصولة.' : 'Please authorize the request inside your connected wallet extension.' },
      { key: 'processing', label: isRtl ? 'معالجة المعاملة' : 'Processing', desc: isRtl ? 'يتم إرسال معاملتك وتأكيدها على الشبكة.' : 'Transaction has been submitted to the blockchain network.' },
      { key: 'finalizing', label: isRtl ? 'إنهاء وحفظ البيانات' : 'Finalizing', desc: isRtl ? 'جاري تحديث أرصدة محفظتك وجدول الاستحقاق.' : 'Updating smart contracts and finalizing transaction state.' },
    ];

    return (
      <div className={`space-y-6 py-6 text-center ${isRtl ? 'rtl' : ''}`}>
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative flex items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary" aria-hidden="true" />
            <span className="absolute text-xs font-bold text-primary">REV</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {isRtl ? 'جاري إرسال المعاملة...' : 'Submitting Transaction...'}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              {isRtl ? 'يرجى عدم إغلاق هذه الصفحة أو تحديثها.' : 'Please do not close this window or refresh the page.'}
            </p>
          </div>
        </div>

        {/* Phase timeline indicator */}
        <div className="max-w-sm mx-auto space-y-4 pt-4 border-t border-slate-800">
          {phases.map((p) => {
            const isActive = loadingPhase === p.key;
            const isCompleted =
              (p.key === 'wallet' && (loadingPhase === 'processing' || loadingPhase === 'finalizing')) ||
              (p.key === 'processing' && loadingPhase === 'finalizing');

            return (
              <div
                key={p.key}
                className={`flex gap-3 text-left ${isRtl ? 'flex-row-reverse text-right' : ''}`}
                style={{ contentVisibility: 'auto' }}
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isActive
                        ? 'bg-primary text-white animate-pulse'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isCompleted ? '✓' : ''}
                  </div>
                </div>
                <div className="flex-1">
                  <h4
                    className={`text-sm font-semibold ${
                      isActive ? 'text-white' : 'text-slate-500'
                    }`}
                  >
                    {p.label}
                  </h4>
                  {isActive && <p className="mt-0.5 text-xs text-slate-400">{p.desc}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Success State
  const renderSuccessState = () => {
    const formattedAmount = `${formatTokens(claimableTokens)} ${tokenSymbol}`;
    const remainingBalance = totalAllocation - claimableTokens;

    return (
      <div className={`py-6 text-center space-y-6 ${isRtl ? 'rtl text-right' : 'text-left'}`}>
        <div className="flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-emerald-950/40 p-3 text-emerald-400">
            <CheckCircle2 className="h-16 w-16" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-xl font-bold text-white">
            {isRtl ? 'تمت المطالبة بنجاح!' : 'Tokens Claimed Successfully!'}
          </h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            {isRtl
              ? 'تم تحويل الرموز المميزة الخاصة بك بالكامل إلى عنوان محفظتك الموصولة.'
              : 'Your unlocked tokens have been successfully transferred to your wallet.'}
          </p>
        </div>

        {/* Transaction Summary Card */}
        <div className="rounded-xl border border-slate-800 p-5 bg-slate-900/30 space-y-3">
          <div className={`flex justify-between items-center text-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
            <span className="text-slate-400">{isRtl ? 'المبلغ المطالب به' : 'Amount Claimed'}</span>
            <span className="font-extrabold text-white text-lg">{formattedAmount}</span>
          </div>
          <div className={`flex justify-between items-center text-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
            <span className="text-slate-400">{isRtl ? 'الرصيد المتبقي المقفل' : 'Updated Remaining Locked'}</span>
            <span className="font-semibold text-slate-200">{formatTokens(remainingBalance)} {tokenSymbol}</span>
          </div>
          <div className={`flex justify-between items-center text-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
            <span className="text-slate-400">{isRtl ? 'مُعرّف المعاملة' : 'Transaction ID'}</span>
            <span className="font-mono text-xs text-primary underline truncate max-w-[180px] cursor-pointer">
              0x9f1a...4d8c
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={`flex flex-col sm:flex-row gap-3 pt-2 ${isRtl ? 'sm:flex-row-reverse' : 'sm:justify-end'}`}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              window.open('https://stellar.expert', '_blank');
            }}
            className="w-full sm:w-auto h-[44px]"
          >
            {isRtl ? 'عرض المعاملة' : 'View Transaction'}
          </Button>
          <Button
            type="button"
            onClick={() => {
              setScreen('idle');
              onClose();
            }}
            className="w-full sm:w-auto h-[44px] min-w-[120px]"
          >
            {isRtl ? 'تم' : 'Done'}
          </Button>
        </div>
      </div>
    );
  };

  // Render Error Banner inside dialog
  const renderErrorBanner = () => {
    if (errorState === 'none') return null;

    const errorDetails = {
      wallet_rejected: {
        title: isRtl ? 'تم رفض المعاملة' : 'Transaction Rejected',
        desc: isRtl ? 'تم إلغاء التوقيع من قبل مستخدم المحفظة. يرجى المحاولة مرة أخرى.' : 'The signature request was cancelled or declined in your wallet. Please try again.',
      },
      timeout: {
        title: isRtl ? 'انتهت مهلة الشبكة' : 'Network Timeout',
        desc: isRtl ? 'فشل إرسال المعاملة بسبب بطء استجابة الشبكة. يرجى مراجعة رسوم الغاز وإعادة المحاولة.' : 'The network is taking unusually long to respond. Please review gas fees and try again.',
      },
      gas_failed: {
        title: isRtl ? 'فشل تقدير الغاز' : 'Gas Estimation Failure',
        desc: isRtl ? 'فشل محرك التقدير الذكي للغاز في حساب الرسوم المطلوبة. يرجى المحاولة لاحقاً.' : 'Unable to estimate transaction fees accurately. The network may be heavily congested.',
      },
      tx_failed: {
        title: isRtl ? 'فشلت المعاملة' : 'Transaction Failed',
        desc: isRtl ? 'حدث خطأ غير متوقع أثناء معالجة العقد الذكي على الشبكة.' : 'Execution failed on-chain. Please verify contract permissions and try again.',
      },
      insufficient: {
        title: isRtl ? 'رصيد غاز غير كافٍ' : 'Insufficient Balance',
        desc: isRtl ? 'ليس لديك ما يكفي من العملات الأساسية (XLM) لدفع رسوم معاملة الشبكة.' : 'You do not have enough XLM in your wallet to cover network transaction costs.',
      },
      disconnected: {
        title: isRtl ? 'المحفظة غير متصلة' : 'Wallet Disconnected',
        desc: isRtl ? 'يرجى توصيل محفظتك لاسترداد تفاصيل استحقاق الرموز المميزة والمطالبة بها.' : 'Please connect your active Web3 wallet to authorize and process claims.',
      },
      unknown: {
        title: isRtl ? 'خطأ غير معروف في البلوكشين' : 'Unknown Blockchain Error',
        desc: isRtl ? 'واجهت المعاملة خطأ تقني غير مسبوق في الشبكة. يرجى الاتصال بالدعم الفني.' : 'An unexpected blockchain error occurred. Please contact technical support.',
      },
    };

    const activeError = errorDetails[errorState];
    if (!activeError) return null;

    return (
      <div
        role="alert"
        className={`flex items-start gap-3 rounded-xl border border-rose-950/30 bg-rose-950/20 p-4 text-xs leading-relaxed text-rose-400 ${
          isRtl ? 'flex-row-reverse text-right' : 'text-left'
        }`}
      >
        <XCircle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" aria-hidden="true" />
        <div>
          <p className="font-semibold text-rose-300">{activeError.title}</p>
          <p className="mt-1">{activeError.desc}</p>
        </div>
      </div>
    );
  };

  // Render Empty State Screen Layout
  const renderEmptyState = () => {
    const emptyConfigs = {
      zero: {
        title: isRtl ? 'لا توجد رموز متاحة للمطالبة' : 'No Tokens Available to Claim',
        desc: isRtl
          ? 'جدول تخصيص الرموز الحالي لا يحتوي على أرصدة مفتوحة جاهزة للمطالبة في الوقت الحالي.'
          : 'Your lockup schedule does not have any unlocked balances available to claim right now.',
        nextUnlock: isRtl ? 'الفتح القادم المجدول: ١٥ أكتوبر ٢٠٢٦' : 'Next scheduled unlock: October 15, 2026',
      },
      fully_claimed: {
        title: isRtl ? 'تمت المطالبة بالكامل بالتخصيص' : 'Allocation Fully Claimed',
        desc: isRtl
          ? 'لقد قمت بسحب كامل رصيد الاستحقاق الخاص بك (٥٠,٠٠٠ REV). لا تتوفر أي رموز مغلقة إضافية.'
          : 'You have claimed 100% of your allocated tokens (50,000 REV) under this schedule. No remaining locked tokens.',
        nextUnlock: null,
      },
      not_started: {
        title: isRtl ? 'فترة حظر الرموز لم تبدأ بعد' : 'Lockup Period Has Not Started',
        desc: isRtl
          ? 'من المقرر أن تبدأ فترة الاستحقاق والحظر الرسمية في ١ نوفمبر ٢٠٢٦. يرجى التحقق من الجدول لاحقاً.'
          : 'The vesting and lockup period for this token allocation officially commences on November 01, 2026.',
        nextUnlock: isRtl ? 'تاريخ البدء الرسمي: ١ نوفمبر ٢٠٢٦' : 'Vesting Start Date: November 01, 2026',
      },
      loading_data: {
        title: isRtl ? 'جاري تحميل تفاصيل الاستحقاق...' : 'Loading Vesting Details...',
        desc: isRtl
          ? 'يرجى الانتظار بينما نقوم بمزامنة تفاصيل جدول الاستحقاق والأرصدة من البلوكشين.'
          : 'Retrieving up-to-date allocation, unlocked amounts, and smart contract state.',
        nextUnlock: null,
      },
      disconnected: {
        title: isRtl ? 'المحفظة غير متصلة' : 'Wallet Connection Required',
        desc: isRtl
          ? 'يرجى ربط محفظة العملات المشفرة الخاصة بك للوصول إلى تفاصيل الأرصدة وإجراء عمليات المطالبة.'
          : 'Please connect your Web3 wallet to inspect your lockup schedule allocations and claim available tokens.',
        nextUnlock: null,
      },
    };

    const activeEmpty = emptyConfigs[emptyState === 'none' ? 'zero' : emptyState];

    return (
      <div className={`py-8 text-center space-y-6 ${isRtl ? 'rtl text-right' : 'text-left'}`}>
        <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
          {emptyState === 'loading_data' ? (
            <div className="rounded-full bg-primary/10 p-4 text-primary animate-pulse mb-4">
              <Loader2 className="h-10 w-10 animate-spin" aria-hidden="true" />
            </div>
          ) : emptyState === 'disconnected' ? (
            <div className="rounded-full bg-slate-800 p-4 text-slate-400 mb-4">
              <Wallet className="h-10 w-10" aria-hidden="true" />
            </div>
          ) : (
            <div className="rounded-full bg-slate-800 p-4 text-slate-400 mb-4">
              <Lock className="h-10 w-10" aria-hidden="true" />
            </div>
          )}
          <h3 className="text-lg font-bold text-white">
            {activeEmpty.title}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            {activeEmpty.desc}
          </p>
          {activeEmpty.nextUnlock && (
            <p className="mt-3 inline-block rounded-full bg-slate-800 px-3 py-1 text-2xs font-semibold text-slate-300">
              {activeEmpty.nextUnlock}
            </p>
          )}
        </div>

        {/* Action Button container */}
        <div className={`flex flex-col sm:flex-row gap-3 pt-2 ${isRtl ? 'sm:flex-row-reverse' : 'sm:justify-end'}`}>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="w-full sm:w-auto h-[44px] min-w-[100px]"
          >
            {isRtl ? 'إغلاق' : 'Close'}
          </Button>
          {emptyState === 'disconnected' && (
            <Button
              type="button"
              onClick={() => setEmptyState('none')}
              className="w-full sm:w-auto h-[44px] min-w-[120px]"
            >
              {isRtl ? 'توصيل المحفظة' : 'Connect Wallet'}
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Render Simulator Panel
  const renderDevPanel = () => (
    <div className="mt-6 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-4 text-xs space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-extrabold tracking-wide text-primary uppercase flex items-center gap-1">
          <Settings className="h-3.5 w-3.5 animate-spin-loader" />
          Developer Interactive Simulator
        </span>
        <button
          type="button"
          onClick={() => setShowDevPanel(false)}
          className="text-slate-400 hover:text-slate-200"
          aria-label="Collapse Developer Panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* RTL & Gas Warning Toggles */}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex items-center gap-2 font-semibold text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={isRtl}
            onChange={(e) => setIsRtl(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 focus:ring-primary"
          />
          Arabic RTL Layout
        </label>
        <label className="flex items-center gap-2 font-semibold text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={highGasWarning}
            onChange={(e) => setHighGasWarning(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 focus:ring-primary"
          />
          Force Gas Warning
        </label>
      </div>

      {/* Empty States Simulation */}
      <div className="space-y-1.5">
        <p className="font-bold text-slate-500 uppercase tracking-wider text-2xs">Empty State Previews</p>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'none', label: 'Active Unlocks' },
            { key: 'zero', label: '0 Claimable' },
            { key: 'fully_claimed', label: 'Fully Claimed' },
            { key: 'not_started', label: 'Not Started' },
            { key: 'loading_data', label: 'Vesting Loading' },
            { key: 'disconnected', label: 'Wallet Disconnected' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setEmptyState(item.key as any);
                setScreen('idle');
              }}
              className={`rounded px-2.5 py-1 font-semibold border transition-colors ${
                emptyState === item.key
                  ? 'bg-primary text-white border-primary'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error State Simulation */}
      <div className="space-y-1.5">
        <p className="font-bold text-slate-500 uppercase tracking-wider text-2xs">Error Flow Simulation</p>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'none', label: 'No Error' },
            { key: 'wallet_rejected', label: 'Wallet Reject' },
            { key: 'timeout', label: 'Net Timeout' },
            { key: 'gas_failed', label: 'Gas Fail' },
            { key: 'tx_failed', label: 'Tx Fail' },
            { key: 'insufficient', label: 'No Gas XLM' },
            { key: 'disconnected', label: 'Disconnect' },
            { key: 'unknown', label: 'Unknown Error' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setErrorState(item.key as any);
                setScreen('idle');
              }}
              className={`rounded px-2.5 py-1 font-semibold border transition-colors ${
                errorState === item.key
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 md:p-6 backdrop-blur-xs overflow-y-auto animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="w-full max-w-lg rounded-3xl border border-slate-800 bg-[#0f172a] p-5 md:p-6 shadow-2xl outline-none transition-all transform duration-300 relative scale-100 max-h-[90vh] overflow-y-auto text-slate-100"
        dir={isRtl ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toggle Developer Gear Button */}
        <button
          type="button"
          onClick={() => setShowDevPanel(!showDevPanel)}
          className="absolute top-5 right-14 text-slate-400 hover:text-slate-200 p-1 rounded-full hover:bg-slate-800 transition-colors"
          title="Toggle interactive developer state panels"
          aria-label="Toggle interactive developer states"
        >
          <Settings className="h-5 w-5" />
        </button>

        {/* Header (Shared across screens except success/loading) */}
        {screen === 'idle' && renderHeader()}

        {/* Render main view based on current state */}
        <div className="mt-5 space-y-5">
          {screen === 'idle' && (
            <>
              {renderErrorBanner()}
              {emptyState !== 'none' ? (
                renderEmptyState()
              ) : (
                <>
                  {renderAmountDisplay()}
                  {renderVestingSummary()}
                  {renderGasEstimate()}
                  {renderAutoClaimToggle()}
                  {renderActions()}
                </>
              )}
            </>
          )}

          {screen === 'loading' && renderLoadingState()}

          {screen === 'success' && renderSuccessState()}
        </div>

        {/* Collapsible Simulator Controls */}
        {showDevPanel && renderDevPanel()}
      </div>
    </div>
  );
};
