import { ModuleInst } from './types';

export const VB_W = 160; // 16 m, 1 unidad = 0.1 m
export const VB_H = 200; // 20 m
export const GRID_SNAP = 3;
export const ALIGN_TOL = 5;

export function snap(v: number): number {
  return Math.round(v / GRID_SNAP) * GRID_SNAP;
}

export function clampModule(m: Pick<ModuleInst, 'x' | 'y' | 'w' | 'h'>) {
  m.x = Math.max(0, Math.min(VB_W - m.w, m.x));
  m.y = Math.max(0, Math.min(VB_H - m.h, m.y));
}

export function clampPoint(x: number, y: number) {
  return { x: Math.max(0, Math.min(VB_W, x)), y: Math.max(0, Math.min(VB_H, y)) };
}

/** Ajusta x,y de un módulo a la rejilla y, si hay otro módulo cerca, encaja los bordes. */
export function alignSnap(m: ModuleInst, others: ModuleInst[]) {
  m.x = snap(m.x);
  m.y = snap(m.y);
  for (const o of others) {
    if (o.id === m.id) continue;
    if (Math.abs(m.x - (o.x + o.w)) < ALIGN_TOL) m.x = o.x + o.w;
    else if (Math.abs(m.x + m.w - o.x) < ALIGN_TOL) m.x = o.x - m.w;
    if (Math.abs(m.y - (o.y + o.h)) < ALIGN_TOL) m.y = o.y + o.h;
    else if (Math.abs(m.y + m.h - o.y) < ALIGN_TOL) m.y = o.y - m.h;
  }
  clampModule(m);
}

export interface WallSeg {
  x1: number; y1: number; x2: number; y2: number;
  inx: number; iny: number; // vector hacia el interior del módulo
}

export function wallSeg(m: ModuleInst, side: 'top' | 'right' | 'bottom' | 'left'): WallSeg {
  switch (side) {
    case 'top': return { x1: m.x, y1: m.y, x2: m.x + m.w, y2: m.y, inx: 0, iny: 1 };
    case 'bottom': return { x1: m.x, y1: m.y + m.h, x2: m.x + m.w, y2: m.y + m.h, inx: 0, iny: -1 };
    case 'left': return { x1: m.x, y1: m.y, x2: m.x, y2: m.y + m.h, inx: 1, iny: 0 };
    case 'right': return { x1: m.x + m.w, y1: m.y, x2: m.x + m.w, y2: m.y + m.h, inx: -1, iny: 0 };
  }
}

export function pointInModule(x: number, y: number, m: ModuleInst) {
  return x >= m.x && x <= m.x + m.w && y >= m.y && y <= m.y + m.h;
}

export function cycleWallState<T extends string>(s: T): T {
  return (s === 'wall' ? 'door' : s === 'door' ? 'window' : 'wall') as T;
}
