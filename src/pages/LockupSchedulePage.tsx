import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Calendar,
  Lock,
  Unlock,
  Percent,
  Clock,
  ArrowUpDown,
  Info,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '../components/Button';
import { getMockScenarios, LockupScenarioId, LockupSchedule, UnlockEvent } from './LockupSchedulePage.types';
import { LockupClaimModal } from '../components/LockupClaimModal';
import './LockupSchedulePage.css';

// Formatter Helpers
const formatCurrency = (value: number, symbol = 'REV') => {
  return `${value.toLocaleString('en-US')} ${symbol}`;
};

const formatDateDisplay = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

export const LockupSchedulePage: React.FC = () => {
  const scenarios = useMemo(() => getMockScenarios(), []);
  const [activeScenarioId, setActiveScenarioId] = useState<LockupScenarioId>('quarterly-nominal');
  const [hoveredTickId, setHoveredTickId] = useState<string | null>(null);
  const [focusedTickId, setFocusedTickId] = useState<string | null>(null);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  // Sorting for accessible table
  const [sortField, setSortField] = useState<'date' | 'amount' | 'status'>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const activeScenario = useMemo(() => {
    return scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];
  }, [scenarios, activeScenarioId]);

  const schedule = activeScenario.schedule;
  const isError = activeScenario.isError;
  const isLoading = activeScenarioId === 'empty-state' ? false : activeScenarioId === 'quarterly-nominal' ? false : activeScenarioId === 'long-schedule' ? false : activeScenarioId === 'daily-vesting' ? false : activeScenarioId === 'one-time-unlock' ? false : activeScenarioId === 'monthly-no-cliff' ? false : activeScenarioId === 'pre-vesting' ? false : activeScenarioId === 'during-cliff' ? false : activeScenarioId === 'fully-vested' ? false : true; // empty-state is false, and others are handled

  // Calculate percentage of an event date between start and end
  const getPct = (dateStr: string, startStr: string, endStr: string) => {
    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();
    const current = new Date(dateStr).getTime();
    if (end - start === 0) return 0;
    const pct = ((current - start) / (end - start)) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  // Derived progress values
  const progressMetrics = useMemo(() => {
    if (!schedule) return null;
    const total = schedule.totalAllocated;
    const unlocks = schedule.unlocks;
    const todayStr = schedule.todayDate;

    // Completed amount
    const completedUnlocks = unlocks.filter((u) => u.status === 'completed');
    const unlockedAmount = completedUnlocks.reduce((sum, u) => sum + u.amount, 0);
    const remainingAmount = total - unlockedAmount;

    // Progress %
    const progressPercentage = total > 0 ? Number(((unlockedAmount / total) * 100).toFixed(2)) : 0;

    // Next unlock details
    const upcomingUnlocks = [...unlocks]
      .filter((u) => u.status === 'upcoming')
      .sort((a, b) => a.date.localeCompare(b.date));
    const nextUnlock = upcomingUnlocks[0] || null;

    return {
      unlockedAmount,
      remainingAmount,
      progressPercentage,
      nextUnlock,
    };
  }, [schedule]);

  // Sortable unlocks for table
  const sortedUnlocks = useMemo(() => {
    if (!schedule) return [];
    const unsorted = [...schedule.unlocks];
    return unsorted.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = a.date.localeCompare(b.date);
      } else if (sortField === 'amount') {
        comparison = a.amount - b.amount;
      } else if (sortField === 'status') {
        comparison = a.status.localeCompare(b.status);
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [schedule, sortField, sortAsc]);

  const handleSort = (field: 'date' | 'amount' | 'status') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Cumulative lockup area chart paths generator
  const chartPaths = useMemo(() => {
    if (!schedule) return { linePath: '', areaPath: '', points: [] };
    const W = 800; // standard width for internal SVG calculation
    const H = 140; // standard height
    const paddingBottom = 20;
    const paddingTop = 10;
    const usableHeight = H - paddingTop - paddingBottom;

    const getY = (pct: number) => H - paddingBottom - (pct / 100) * usableHeight;
    const getX = (dateStr: string) => (getPct(dateStr, schedule.startDate, schedule.endDate) / 100) * W;

    const sorted = [...schedule.unlocks].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length === 0) return { linePath: '', areaPath: '', points: [] };

    let linePath = `M 0,${getY(0)}`;
    let currentPct = 0;

    const points: Array<{ x: number; y: number; pct: number; date: string; id: string }> = [];

    // Starting coordinate at 0%
    points.push({ x: 0, y: getY(0), pct: 0, date: schedule.startDate, id: 'start' });

    for (const item of sorted) {
      const x = getX(item.date);
      // Horizontal line to the event's X
      linePath += ` L ${x},${getY(currentPct)}`;
      // Vertical line to event's new cumulative %
      linePath += ` L ${x},${getY(item.cumulativePercentage)}`;

      currentPct = item.cumulativePercentage;

      points.push({
        x,
        y: getY(item.cumulativePercentage),
        pct: item.cumulativePercentage,
        date: item.date,
        id: item.id,
      });
    }

    // Final segment to end date
    linePath += ` L ${W},${getY(currentPct)}`;
    points.push({ x: W, y: getY(currentPct), pct: currentPct, date: schedule.endDate, id: 'end' });

    // Close the area polygon
    const areaPath = `${linePath} L ${W},${H - paddingBottom} L 0,${H - paddingBottom} Z`;

    return { linePath, areaPath, points };
  }, [schedule]);

  // Today marker calculation
  const todayPct = useMemo(() => {
    if (!schedule) return 0;
    return getPct(schedule.todayDate, schedule.startDate, schedule.endDate);
  }, [schedule]);

  return (
    <div className="lsp-container" data-testid="lockup-schedule-container">
      {/* Header & Scenario Selector */}
      <header className="lsp-header">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Investor Lockups</p>
        <h1 className="lsp-title">Token Lockup & Vesting</h1>
        <p className="lsp-desc">
          Monitor your cumulative unlocked token progress, cliff milestones, and upcoming unlock events.
        </p>
      </header>

      {/* Scenario switcher (dev / demo tool) */}
      <section className="lsp-scenario-card" aria-label="Demo scenarios switcher">
        <h2 className="lsp-scenario-title">Demo Schedule Scenarios</h2>
        <div className="lsp-scenario-btn-group" role="group" aria-label="Vesting scenarios">
          {scenarios.map((sc) => (
            <button
              key={sc.id}
              onClick={() => setActiveScenarioId(sc.id)}
              className={`lsp-scenario-btn ${activeScenarioId === sc.id ? 'lsp-scenario-btn--active' : ''}`}
              aria-pressed={activeScenarioId === sc.id}
            >
              {sc.name}
            </button>
          ))}
        </div>
        <p className="lsp-scenario-desc">
          <strong>Description:</strong> {activeScenario.description}
        </p>
      </section>

      {/* Loading Skeleton View */}
      {activeScenarioId === 'error-state' ? (
        <section className="lsp-error-well" role="alert" data-testid="lockup-error-state">
          <div className="lsp-error-icon-well">
            <AlertCircle size={32} aria-hidden="true" />
          </div>
          <h2 className="lsp-error-title">Failed to load schedule</h2>
          <p className="lsp-error-desc">
            An error occurred while retrieving your lockup contract details. This might be due to a malformed vesting schedule or a temporary network failure on the Stellar blockchain.
          </p>
          <Button type="button" onClick={() => setActiveScenarioId('quarterly-nominal')}>
            Reset to Standard Schedule
          </Button>
        </section>
      ) : activeScenarioId === 'empty-state' ? (
        <section className="glass-card p-8 text-center flex flex-col items-center justify-center gap-4" data-testid="lockup-empty-state">
          <div className="rounded-full bg-primary/10 p-4 text-primary">
            <Lock size={32} aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-white">No active lockup schedules</h2>
          <p className="text-sm text-muted max-w-sm">
            There are no token allocation schedules associated with your current wallet. Once a startup allocates tokens to you, they will appear here.
          </p>
          <Button type="button" variant="secondary" onClick={() => setActiveScenarioId('quarterly-nominal')}>
            View Demo Schedule
          </Button>
        </section>
      ) : !schedule ? (
        <div className="space-y-6" data-testid="lockup-loading-skeletons">
          <div className="lsp-skeleton-card-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="lsp-skeleton lsp-skeleton-card" />
            ))}
          </div>
          <div className="lsp-skeleton lsp-skeleton-chart" />
        </div>
      ) : (
        <>
          {/* Progress Summary Cards */}
          <section className="lsp-cards-grid" aria-label="Vesting progress statistics">
            {/* Total Allocated */}
            <div className="lsp-card" data-testid="stat-total-allocated">
              <span className="lsp-card-label">Total Allocated</span>
              <span className="lsp-card-value">{formatCurrency(schedule.totalAllocated, schedule.tokenSymbol)}</span>
              <span className="lsp-card-sub flex items-center gap-1">
                <Lock size={12} className="text-muted" aria-hidden="true" />
                Vesting contract
              </span>
            </div>

            {/* Unlocked Amount */}
            <div className="lsp-card" data-testid="stat-unlocked">
              <span className="lsp-card-label">Total Unlocked</span>
              <span className="lsp-card-value text-emerald-400">{formatCurrency(progressMetrics!.unlockedAmount, schedule.tokenSymbol)}</span>
              <span className="lsp-card-sub flex items-center gap-1 mb-2">
                <Unlock size={12} className="text-emerald-400" aria-hidden="true" />
                Available to claim
              </span>
              {progressMetrics!.unlockedAmount > 0 && (
                <Button
                  type="button"
                  variant="primary"
                  className="btn--sm w-full mt-1"
                  onClick={() => setIsClaimModalOpen(true)}
                >
                  Claim Tokens
                </Button>
              )}
            </div>

            {/* Remaining Locked */}
            <div className="lsp-card" data-testid="stat-remaining">
              <span className="lsp-card-label">Remaining Locked</span>
              <span className="lsp-card-value text-amber-500">{formatCurrency(progressMetrics!.remainingAmount, schedule.tokenSymbol)}</span>
              <span className="lsp-card-sub flex items-center gap-1">
                <Lock size={12} className="text-amber-500" aria-hidden="true" />
                Locked in contract
              </span>
            </div>

            {/* Vesting Progress % */}
            <div className="lsp-card" data-testid="stat-progress-percentage">
              <span className="lsp-card-label">Vesting Progress</span>
              <span className="lsp-card-value">{progressMetrics!.progressPercentage}%</span>
              <div className="lsp-progress-track" aria-hidden="true">
                <div className="lsp-progress-fill" style={{ width: `${progressMetrics!.progressPercentage}%` }} />
              </div>
            </div>

            {/* Next Unlock */}
            <div className="lsp-card" data-testid="stat-next-unlock">
              <span className="lsp-card-label">Next Unlock</span>
              {progressMetrics!.nextUnlock ? (
                <>
                  <span className="lsp-card-value text-primary">{formatCurrency(progressMetrics!.nextUnlock.amount, schedule.tokenSymbol)}</span>
                  <span className="lsp-card-sub flex items-center gap-1">
                    <Clock size={12} aria-hidden="true" />
                    {formatDateDisplay(progressMetrics!.nextUnlock.date)}
                  </span>
                </>
              ) : (
                <>
                  <span className="lsp-card-value text-muted">Fully Vested</span>
                  <span className="lsp-card-sub">No upcoming unlocks</span>
                </>
              )}
            </div>

            {/* Final Vesting Date */}
            <div className="lsp-card" data-testid="stat-final-date">
              <span className="lsp-card-label">Vesting End Date</span>
              <span className="lsp-card-value">{formatDateDisplay(schedule.endDate)}</span>
              <span className="lsp-card-sub uppercase tracking-wider font-semibold text-primary-hover">
                {schedule.vestingType} schedule
              </span>
            </div>
          </section>

          {/* Interactive Timeline & Area Chart Section */}
          <section className="lsp-viz-panel" aria-label="Visual cliff and vesting timeline">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-white">Vesting Progress Visualization</h2>
                <p className="text-xs text-muted">Aligns the horizontal timeline with cumulative unlock shading below.</p>
              </div>
              <div className="text-xs text-muted">
                <span>Vesting Start: <strong>{formatDateDisplay(schedule.startDate)}</strong></span>
                <span className="mx-2">|</span>
                <span>Vesting End: <strong>{formatDateDisplay(schedule.endDate)}</strong></span>
              </div>
            </div>

            {/* Scroll Wrapper for Mobile Responsiveness */}
            <div className="lsp-viz-scroll-wrapper" data-testid="lockup-viz-scroll-container">
              <div className="lsp-viz-scroll-content">

                {/* Horizontal Timeline Component */}
                <div className="lsp-timeline-container" data-testid="lockup-timeline">
                  {/* Timeline track line */}
                  <div className="lsp-timeline-track" />
                  <div
                    className="lsp-timeline-track-filled"
                    style={{ width: `${todayPct}%` }}
                  />

                  {/* Cliff Marker */}
                  {schedule.cliffDate && (
                    <div
                      className="lsp-cliff-marker"
                      style={{ left: `${getPct(schedule.cliffDate, schedule.startDate, schedule.endDate)}%` }}
                      data-testid="lockup-cliff-marker"
                    >
                      <div className="lsp-cliff-label" title={`Cliff period ending on ${formatDateDisplay(schedule.cliffDate)}`}>
                        ▲ Cliff
                      </div>
                      <div className="lsp-cliff-shape" />
                    </div>
                  )}

                  {/* Interactive, Keyboard focusable tick marks */}
                  {schedule.unlocks.map((un) => {
                    const pctPos = getPct(un.date, schedule.startDate, schedule.endDate);
                    const isActive = hoveredTickId === un.id || focusedTickId === un.id;
                    return (
                      <button
                        key={un.id}
                        type="button"
                        className={`lsp-tick-target ${un.status === 'completed' ? 'lsp-tick-target--completed' : 'lsp-tick-target--upcoming'}`}
                        style={{ left: `${pctPos}%` }}
                        onMouseEnter={() => setHoveredTickId(un.id)}
                        onMouseLeave={() => setHoveredTickId(null)}
                        onFocus={() => setFocusedTickId(un.id)}
                        onBlur={() => setFocusedTickId(null)}
                        aria-label={`Unlock on ${formatDateDisplay(un.date)}, amount ${formatCurrency(un.amount, schedule.tokenSymbol)}, status ${un.status}`}
                        data-testid={`lockup-tick-${un.id}`}
                      >
                        <div className="lsp-tick-dot" />

                        {/* Event details popover */}
                        {isActive && (
                          <div
                            className="lsp-popover"
                            style={{
                              top: '-110px',
                              opacity: 1
                            }}
                            role="tooltip"
                            data-testid={`lockup-popover-${un.id}`}
                          >
                            <span className="lsp-popover-title">{un.eventLabel}</span>
                            <div className="lsp-popover-row">
                              <span className="lsp-popover-label">Unlock Date:</span>
                              <span className="lsp-popover-value">{formatDateDisplay(un.date)}</span>
                            </div>
                            <div className="lsp-popover-row">
                              <span className="lsp-popover-label">Tokens Unlocked:</span>
                              <span className="lsp-popover-value text-emerald-400">{formatCurrency(un.amount, schedule.tokenSymbol)}</span>
                            </div>
                            <div className="lsp-popover-row">
                              <span className="lsp-popover-label">Unlock %:</span>
                              <span className="lsp-popover-value">{un.percentage}%</span>
                            </div>
                            <div className="lsp-popover-row">
                              <span className="lsp-popover-label">Total Unlocked:</span>
                              <span className="lsp-popover-value lsp-popover-value--highlight">{un.cumulativePercentage}%</span>
                            </div>
                            <div className="lsp-popover-row">
                              <span className="lsp-popover-label">Remaining Locked:</span>
                              <span className="lsp-popover-value text-amber-500">{un.remainingPercentage}%</span>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {/* Today Marker Line */}
                  <div
                    className="lsp-today-line"
                    style={{ left: `${todayPct}%` }}
                    data-testid="lockup-today-marker"
                  >
                    <div className="lsp-today-badge">
                      Today
                    </div>
                  </div>
                </div>

                {/* Cumulative Unlock Area Chart */}
                <div className="lsp-chart-container" data-testid="lockup-area-chart">
                  <svg className="lsp-chart-svg" viewBox="0 0 800 140" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="unlockedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--success, #10b981)" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="var(--success, #10b981)" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="lockedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary, #3b82f6)" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="var(--primary, #3b82f6)" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Chart Gridlines */}
                    <line x1="0" y1="10" x2="800" y2="10" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                    <line x1="0" y1="40" x2="800" y2="40" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                    <line x1="0" y1="70" x2="800" y2="70" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                    <line x1="0" y1="100" x2="800" y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />

                    {/* Shaded Area Region */}
                    {chartPaths.areaPath && (
                      <polygon points="" path="" d={chartPaths.areaPath} fill="url(#unlockedGradient)" className="transition-all duration-300" />
                    )}

                    {/* Step line for cumulative progression */}
                    {chartPaths.linePath && (
                      <path d={chartPaths.linePath} fill="none" stroke="var(--success, #10b981)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300" />
                    )}

                    {/* Zero baseline */}
                    <line x1="0" y1="120" x2="800" y2="120" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />

                    {/* Chart Grid Labels (Y-axis) */}
                    <text x="5" y="20" fill="var(--text-muted)" fontSize="9" opacity="0.6">100% Unlocked</text>
                    <text x="5" y="50" fill="var(--text-muted)" fontSize="9" opacity="0.6">75%</text>
                    <text x="5" y="80" fill="var(--text-muted)" fontSize="9" opacity="0.6">50%</text>
                    <text x="5" y="110" fill="var(--text-muted)" fontSize="9" opacity="0.6">25%</text>

                    {/* Today marker intersecting path */}
                    <line x1={`${todayPct * 8}`} y1="0" x2={`${todayPct * 8}`} y2="120" stroke="var(--text-accent, #38bdf8)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
                  </svg>
                </div>

              </div>
            </div>

            {/* Accessibility Color-blind Legend */}
            <div className="lsp-legend" data-testid="lockup-legend">
              <div className="lsp-legend-item">
                <span className="w-3 h-0.5 bg-sky-400 inline-block" />
                <span>Today Line</span>
              </div>
              <div className="lsp-legend-item">
                <span className="lsp-cliff-shape inline-block" style={{ borderBottomWidth: '10px', borderLeftWidth: '6px', borderRightWidth: '6px', transform: 'none', position: 'static' }} />
                <span>Cliff Marker (No unlocks prior to this)</span>
              </div>
              <div className="lsp-legend-item">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span>Completed Unlock</span>
              </div>
              <div className="lsp-legend-item">
                <span className="w-3 h-3 rounded-full border-2 border-blue-500 inline-block" />
                <span>Future Unlock</span>
              </div>
              <div className="lsp-legend-item">
                <span className="w-3 h-3 bg-emerald-500/20 border border-emerald-500/40 rounded inline-block" />
                <span>Unlocked Shaded Region</span>
              </div>
            </div>
          </section>

          {/* Accessible Table Alternative */}
          <section className="lsp-table-section" aria-labelledby="lockup-table-title">
            <div className="lsp-table-header-row">
              <h2 id="lockup-table-title" className="lsp-table-title">Vesting Unlock Events</h2>
              <span className="text-xs text-muted">Showing all {schedule.unlocks.length} scheduled distributions</span>
            </div>

            <div className="lsp-table-card">
              <table className="lsp-table" aria-label="Token lockup schedule details">
                <thead>
                  <tr>
                    <th scope="col" className="sortable" onClick={() => handleSort('date')}>
                      Unlock Date
                      {sortField === 'date' && (
                        <span className="lsp-sort-icon">
                          {sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </span>
                      )}
                    </th>
                    <th scope="col">Event Label</th>
                    <th scope="col" className="sortable" onClick={() => handleSort('amount')}>
                      Tokens Unlocked
                      {sortField === 'amount' && (
                        <span className="lsp-sort-icon">
                          {sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </span>
                      )}
                    </th>
                    <th scope="col">Unlock %</th>
                    <th scope="col">Cumulative Unlocked</th>
                    <th scope="col">Remaining Locked</th>
                    <th scope="col" className="sortable" onClick={() => handleSort('status')}>
                      Status
                      {sortField === 'status' && (
                        <span className="lsp-sort-icon">
                          {sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </span>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUnlocks.map((un) => (
                    <tr key={un.id} data-testid={`table-row-${un.id}`}>
                      <td className="font-semibold text-white">{formatDateDisplay(un.date)}</td>
                      <td>{un.eventLabel}</td>
                      <td className="font-medium text-emerald-400">{formatCurrency(un.amount, schedule.tokenSymbol)}</td>
                      <td>{un.percentage}%</td>
                      <td>{un.cumulativePercentage}%</td>
                      <td className="text-amber-500">{un.remainingPercentage}%</td>
                      <td>
                        <span className={`lsp-badge ${un.status === 'completed' ? 'lsp-badge--completed' : 'lsp-badge--upcoming'}`}>
                          {un.status === 'completed' ? 'Completed' : 'Upcoming'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Implementation Notes / Legend description */}
          <footer className="glass-card p-6 flex flex-col gap-4 text-xs text-muted leading-relaxed" data-testid="lockup-design-notes">
            <h3 className="font-semibold text-white text-sm">Lockup Schedule Design Notes & Anatomy</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p>
                  <strong>Why we chose the triangle cliff marker:</strong> The cliff marks the definitive end of the initial locked period during which zero rewards or vested shares are claimable. Placing a prominent red triangle (<span className="text-red-400 font-bold">▲ Cliff</span>) indicates a clear, warning-style boundary that immediately stops non-technical users from expecting liquid access beforehand.
                </p>
                <p>
                  <strong>WCAG 2.1 AA Compliance details:</strong> Contrast ratios for the primary blue (#3b82f6) and emerald green (#10b981) reach &gt; 4.5:1 on background surfaces. Screen reader users can focus any tick via keyboard (44x44px target sizes) to hear full speech synthesis of unlock events. Text colors use semantic tokens preventing color-only communication.
                </p>
              </div>
              <div className="space-y-2">
                <p>
                  <strong>Long schedules & Scroll behaviors:</strong> To avoid layout squishing on mobile screens or deep monthly charts (up to 120 ticks), the visualization sits within a clean <code>overflow-x: auto</code> container with a minimum content width of 650px. Touch gestures and screen layout adapt seamlessly.
                </p>
                <p>
                  <strong>Timezones & Leap years:</strong> All Date-handling processes are parsed using strictly locked UTC hours to avoid shifting events over GMT boundaries. Leap years and day-light savings transitions are fully accounted for by using Epoch millisecond math for point offsets.
                </p>
              </div>
            </div>
          </footer>

          <LockupClaimModal
            isOpen={isClaimModalOpen}
            onClose={() => setIsClaimModalOpen(false)}
            unlockedAmount={`${progressMetrics!.unlockedAmount.toLocaleString('en-US')} ${schedule.tokenSymbol}`}
            gasEstimate={0.002}
          />
        </>
      )}
    </div>
  );
};
export default LockupSchedulePage;
