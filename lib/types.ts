export type WallState = 'wall' | 'door' | 'window';

export interface ModuleInst {
  id: number;
  typeId: string | null; // null = medidas personalizadas, ya no ligado al catálogo
  name: string;
  heightM: number; // alto real, m
  x: number; // unidades de planta (1 unidad = 0.1 m)
  y: number;
  w: number; // largo en planta, unidades
  h: number; // ancho en planta, unidades
  walls: { top: WallState; right: WallState; bottom: WallState; left: WallState };
}

export interface Partition {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  state: WallState;
}

export interface ElementInst {
  id: number;
  typeId: string;
  x: number;
  y: number;
}

export type Mode = 'move' | 'pan' | 'wall' | 'opening' | 'measure' | 'delete';
export type ViewTab = 'plan' | 'elev' | 'breakdown';
