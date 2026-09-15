export type WallState = 'wall' | 'door' | 'window';

export interface FabricationMeta {
  reference: string;
  quantity: number;
  supplier: string;
  metric: string;
  steelGrade: string;
  profile: string;
  notes: string;
}

export const EMPTY_FABRICATION_META: FabricationMeta = {
  reference: '',
  quantity: 1,
  supplier: 'N/D',
  metric: 'N/D',
  steelGrade: 'N/D',
  profile: 'N/D',
  notes: '',
};

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
  fabrication?: FabricationMeta;
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
  w?: number; // ancho en unidades de planta; si falta se usa el catálogo
  h?: number; // alto en unidades de planta; si falta se usa el catálogo
  fabrication?: FabricationMeta;
}

export type Mode = 'move' | 'pan' | 'wall' | 'opening' | 'measure' | 'delete';
export type ViewTab = 'plan' | 'elev' | 'breakdown';
