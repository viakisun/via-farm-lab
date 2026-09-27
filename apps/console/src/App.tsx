import { useState } from 'react';

import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { MODULE_LABEL } from './components/nav';
import { C, equalisedPpfd } from './data/derive';
import { Analytics } from './modules/Analytics';
import { Builder } from './modules/Builder';
import { Commissioning } from './modules/Commissioning';
import { Schedule } from './modules/Schedule';
import { Settings } from './modules/Settings';
import { Dashboard } from './modules/Dashboard';
import { Devices } from './modules/Devices';
import { Experiments } from './modules/Experiments';
import { Inputs } from './modules/Inputs';
import { Market } from './modules/Market';
import { Report } from './modules/Report';
import { Review } from './modules/Review';
import type { BuilderRow, BuilderState, ExpFilter, ModuleId, ReviewFilter } from './types';

const INITIAL_BUILDER: BuilderState = {
  target: 12.96,
  rows: [
    { bed: 'B-1', role: 'treatment', photoperiod: 12, ppfd: 300 },
    { bed: 'A-1', role: 'control', photoperiod: 16, ppfd: 225 },
    { bed: 'A-2', role: 'treatment', photoperiod: 20, ppfd: 180 },
    { bed: 'B-2', role: 'treatment', photoperiod: 24, ppfd: 150 },
  ],
};

export default function App() {
  const [mod, setMod] = useState<ModuleId>('dashboard');
  const [expFilter, setExpFilter] = useState<ExpFilter>('all');
  const [selectedExp, setSelectedExp] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');
  const [builder, setBuilder] = useState<BuilderState>(INITIAL_BUILDER);

  const onTarget = (delta: number): void =>
    setBuilder((b) => ({ ...b, target: Math.max(4, +(b.target + delta).toFixed(2)) }));
  const onRow = (index: number, patch: Partial<BuilderRow>): void =>
    setBuilder((b) => ({
      ...b,
      rows: b.rows.map((r, j) => (j === index ? { ...r, ...patch } : r)),
    }));
  const onAutoEqualise = (): void =>
    setBuilder((b) => ({
      ...b,
      rows: b.rows.map((r) => ({ ...r, ppfd: equalisedPpfd(b.target, r.photoperiod) })),
    }));

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'auto',
        background: C.bg,
      }}
    >
      <div
        data-screen-label={`Web Console · ${MODULE_LABEL[mod]}`}
        style={{
          width: 1512,
          height: 982,
          background: C.bg,
          color: C.ink,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        <Sidebar active={mod} onSelect={setMod} />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Topbar modLabel={MODULE_LABEL[mod]} />
          <div style={{ flex: 1, minHeight: 0, padding: '22px 26px', overflow: 'hidden' }}>
            {mod === 'dashboard' && <Dashboard />}
            {mod === 'experiments' && (
              <Experiments
                filter={expFilter}
                onFilter={setExpFilter}
                selectedId={selectedExp}
                onSelect={setSelectedExp}
                onOpenReport={() => setMod('report')}
              />
            )}
            {mod === 'commissioning' && <Commissioning />}
            {mod === 'settings' && <Settings />}
            {mod === 'schedule' && <Schedule />}
            {mod === 'builder' && (
              <Builder
                builder={builder}
                onTarget={onTarget}
                onRow={onRow}
                onAutoEqualise={onAutoEqualise}
              />
            )}
            {mod === 'inputs' && <Inputs />}
            {mod === 'market' && <Market />}
            {mod === 'device' && <Devices />}
            {mod === 'review' && <Review filter={reviewFilter} onFilter={setReviewFilter} />}
            {mod === 'analytics' && <Analytics />}
            {mod === 'report' && <Report />}
          </div>
        </main>
      </div>
    </div>
  );
}
