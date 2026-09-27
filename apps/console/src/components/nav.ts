import type { ModuleId } from '../types';

export const MODULE_LABEL: Record<ModuleId, string> = {
  dashboard: 'Dashboard',
  experiments: 'Experiments',
  analytics: 'Analytics Lab',
  report: 'Report Builder',
  commissioning: 'Commissioning',
  settings: 'Nutrient Settings',
  schedule: 'Schedule',
  builder: 'Experiment Builder',
  inputs: 'Input Registry',
  market: 'Market Feed',
  device: 'Device Registry',
  review: 'Data Review',
};

export interface NavItem {
  readonly id: ModuleId;
  readonly label: string;
  readonly tag?: string;
}

export const NAV_TOP: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'experiments', label: 'Experiments', tag: '25' },
  { id: 'analytics', label: 'Analytics Lab' },
  { id: 'report', label: 'Report Builder' },
];

export const NAV_BOTTOM: NavItem[] = [
  { id: 'commissioning', label: 'Commissioning · SIT' },
  { id: 'settings', label: 'Nutrient Settings' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'builder', label: 'Experiment Builder' },
  { id: 'inputs', label: 'Input Registry' },
  { id: 'market', label: 'Market Feed' },
  { id: 'device', label: 'Device Registry' },
  { id: 'review', label: 'Data Review' },
];
