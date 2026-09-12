export type ModuleCategory = 'sanitary' | 'office' | 'store' | 'access';

export const MODULE_CATEGORY_COLORS: Record<ModuleCategory, { fill: string; stroke: string; label: string }> = {
  sanitary: { fill: '#D5ECE8', stroke: '#327D78', label: 'Sanitario' },
  office: { fill: '#DCE4EE', stroke: '#547697', label: 'Oficina' },
  store: { fill: '#E9E5DA', stroke: '#7B725E', label: 'Almacén' },
  access: { fill: '#F6D8C5', stroke: '#B85A32', label: 'Acceso' },
};

export interface ModuleType {
  id: string;
  name: string;
  category: ModuleCategory;
  L: number; // largo, m
  W: number; // ancho, m
  H: number; // alto, m
  use: string;
  store: boolean;
}

export const MODULE_TYPES: ModuleType[] = [
  { id: 'm10', name: '10 pies', category: 'sanitary', L: 3.0, W: 2.44, H: 2.6, use: 'Baño de paso / garita de vigilancia', store: false },
  { id: 'm15', name: '14-15 pies', category: 'office', L: 4.1, W: 2.44, H: 2.6, use: 'Oficina individual / vestuario reducido', store: false },
  { id: 'm20', name: '20 pies', category: 'office', L: 6.05, W: 2.44, H: 2.6, use: 'Oficina diáfana / vestuario / comedor', store: false },
  { id: 'mA', name: 'Ancho especial', category: 'office', L: 6.05, W: 3.0, H: 2.6, use: 'Mayor habitabilidad, pieza suelta', store: false },
  { id: 'c10', name: "Almacén 10'", category: 'store', L: 3.0, W: 2.44, H: 2.59, use: 'Herramientas y maquinaria ligera', store: true },
  { id: 'c20', name: "Almacén 20'", category: 'store', L: 6.05, W: 2.44, H: 2.59, use: 'Material pesado, antirrobo/humedad', store: true },
];

export function getModuleCategory(typeId: string | null): ModuleCategory {
  if (typeId?.startsWith('c')) return 'store';
  if (typeId === 'm10') return 'sanitary';
  if (typeId === 'access') return 'access';
  return 'office';
}

export interface ElementType {
  id: string;
  name: string;
  abbr: string;
  icon: string;
  defaultW: number;
  defaultH: number;
  exterior: boolean;
  elevFrac?: number; // altura relativa en el alzado (0..1), solo si exterior
  color: string;
}

export const ELEMENT_TYPES: ElementType[] = [
  { id: 'mesa', name: 'Mesa despacho', abbr: 'MESA', icon: '▦', defaultW: 16, defaultH: 10, exterior: false, color: '#8A6A3C' },
  { id: 'taquillas', name: 'Taquillas', abbr: 'TAQ', icon: '▥', defaultW: 10, defaultH: 12, exterior: false, color: '#8A6A3C' },
  { id: 'banco', name: 'Banco', abbr: 'BNC', icon: '▬', defaultW: 14, defaultH: 4, exterior: false, color: '#8A6A3C' },
  { id: 'split', name: 'Split A/A', abbr: 'A/A', icon: '⌁', defaultW: 12, defaultH: 6, exterior: true, elevFrac: 0.74, color: '#38547A' },
  { id: 'escalera', name: 'Escalera ext.', abbr: 'ESC', icon: '≋', defaultW: 10, defaultH: 14, exterior: true, elevFrac: 0.03, color: '#26231F' },
  { id: 'rampa', name: 'Rampa PMR', abbr: 'PMR', icon: '↗', defaultW: 14, defaultH: 10, exterior: true, elevFrac: 0.02, color: '#26231F' },
  { id: 'agua', name: 'Depósito agua', abbr: 'H2O', icon: '◉', defaultW: 10, defaultH: 10, exterior: true, elevFrac: 0.06, color: '#2E7D8C' },
  { id: 'residual', name: 'Depósito residual', abbr: 'RES', icon: '◌', defaultW: 10, defaultH: 10, exterior: true, elevFrac: 0.02, color: '#6B5B3E' },
  { id: 'cuadro', name: 'Cuadro eléctrico', abbr: 'CE', icon: 'ϟ', defaultW: 7, defaultH: 10, exterior: true, elevFrac: 0.48, color: '#D9622B' },
  { id: 'reja', name: 'Reja ventana', abbr: 'REJA', icon: '▤', defaultW: 12, defaultH: 8, exterior: true, elevFrac: 0.45, color: '#59503F' },
  { id: 'persiana', name: 'Persiana', abbr: 'PERS', icon: '▥', defaultW: 12, defaultH: 8, exterior: true, elevFrac: 0.45, color: '#59503F' },
];
