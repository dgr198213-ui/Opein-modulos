export interface ModuleType {
  id: string;
  name: string;
  L: number; // largo, m
  W: number; // ancho, m
  H: number; // alto, m
  use: string;
  store: boolean;
}

export const MODULE_TYPES: ModuleType[] = [
  { id: 'm10', name: '10 pies', L: 3.0, W: 2.44, H: 2.6, use: 'Baño de paso / garita de vigilancia', store: false },
  { id: 'm15', name: '14-15 pies', L: 4.1, W: 2.44, H: 2.6, use: 'Oficina individual / vestuario reducido', store: false },
  { id: 'm20', name: '20 pies', L: 6.05, W: 2.44, H: 2.6, use: 'Oficina diáfana / vestuario / comedor', store: false },
  { id: 'mA', name: 'Ancho especial', L: 6.05, W: 3.0, H: 2.6, use: 'Mayor habitabilidad, pieza suelta', store: false },
  { id: 'c10', name: "Almacén 10'", L: 3.0, W: 2.44, H: 2.59, use: 'Herramientas y maquinaria ligera', store: true },
  { id: 'c20', name: "Almacén 20'", L: 6.05, W: 2.44, H: 2.59, use: 'Material pesado, antirrobo/humedad', store: true },
];

export interface ElementType {
  id: string;
  name: string;
  abbr: string;
  exterior: boolean;
  elevFrac?: number; // altura relativa en el alzado (0..1), solo si exterior
  color: string;
}

export const ELEMENT_TYPES: ElementType[] = [
  { id: 'mesa', name: 'Mesa despacho', abbr: 'MESA', exterior: false, color: '#8A6A3C' },
  { id: 'taquillas', name: 'Taquillas', abbr: 'TAQ', exterior: false, color: '#8A6A3C' },
  { id: 'banco', name: 'Banco', abbr: 'BNC', exterior: false, color: '#8A6A3C' },
  { id: 'split', name: 'Split A/A', abbr: 'A/A', exterior: true, elevFrac: 0.74, color: '#38547A' },
  { id: 'escalera', name: 'Escalera ext.', abbr: 'ESC', exterior: true, elevFrac: 0.03, color: '#26231F' },
  { id: 'rampa', name: 'Rampa PMR', abbr: 'PMR', exterior: true, elevFrac: 0.02, color: '#26231F' },
  { id: 'agua', name: 'Depósito agua', abbr: 'H2O', exterior: true, elevFrac: 0.06, color: '#2E7D8C' },
  { id: 'residual', name: 'Depósito residual', abbr: 'RES', exterior: true, elevFrac: 0.02, color: '#6B5B3E' },
  { id: 'cuadro', name: 'Cuadro eléctrico', abbr: 'CE', exterior: true, elevFrac: 0.48, color: '#D9622B' },
  { id: 'reja', name: 'Reja ventana', abbr: 'REJA', exterior: true, elevFrac: 0.45, color: '#59503F' },
  { id: 'persiana', name: 'Persiana', abbr: 'PERS', exterior: true, elevFrac: 0.45, color: '#59503F' },
];
