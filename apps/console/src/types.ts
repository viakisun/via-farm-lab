export type ModuleId =
  | 'dashboard'
  | 'experiments'
  | 'analytics'
  | 'report'
  | 'commissioning'
  | 'settings'
  | 'schedule'
  | 'builder'
  | 'inputs'
  | 'market'
  | 'device'
  | 'review';

export type ExpFilter = 'all' | 'done' | 'running';
export type ReviewFilter = 'all' | 'flagged';

export interface BuilderRow {
  readonly bed: string;
  readonly role: 'control' | 'treatment';
  readonly photoperiod: number;
  readonly ppfd: number;
}

export interface BuilderState {
  readonly target: number;
  readonly rows: BuilderRow[];
}
