import type { Division, DivisionId } from '../types';

export const DIVISIONS: Division[] = [
  { id: 1, name: 'Besta deild', cssKey: 'besta' },
  { id: 2, name: '1. deild', cssKey: 'fyrsta' },
  { id: 3, name: '2. deild', cssKey: 'annar' },
  { id: 4, name: '3. deild', cssKey: 'thridi' },
];

export const DIVISION_MAP = Object.fromEntries(
  DIVISIONS.map(d => [d.id, d])
) as Record<DivisionId, Division>;
