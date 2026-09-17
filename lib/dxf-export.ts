import { DxfWriter, Units, point3d } from '@tarikjabiri/dxf';
import { ELEMENT_TYPES, MODULE_TYPES } from './catalog';
import { wallSeg, WallSeg } from './geometry';
import { EMPTY_FABRICATION_META, ElementInst, FabricationMeta, ModuleInst, Partition, WallState } from './types';

const MM_PER_UNIT = 100;
const ELEVATION_GROUND = 46;
const WALL_THICKNESS = 0.12;
const PANEL_PITCH = 12;
const TEXT_H = 0.22;
const SMALL_TEXT_H = 0.18;
type Point = { x: number; y: number };

type DxfBlock = ReturnType<DxfWriter['addBlock']>;

export interface DxfClientInfo {
  projectName?: string;
  clientName?: string;
  deliveryDate?: string;
  scale?: string;
}

const LAYERS = [
  ['ESTR_PERFILES', 1, 'CONTINUOUS'],
  ['PANELES', 8, 'CONTINUOUS'],
  ['MODULOS', 7, 'CONTINUOUS'],
  ['TABIQUES', 7, 'CONTINUOUS'],
  ['ABERTURAS', 6, 'CONTINUOUS'],
  ['ELEMENTOS', 3, 'CONTINUOUS'],
  ['EJES_CENTRO', 8, 'CENTER'],
  ['COTAS_GENERALES', 3, 'CONTINUOUS'],
  ['COTAS_DETALLES', 2, 'CONTINUOUS'],
  ['TEXTO', 7, 'CONTINUOUS'],
  ['CAJETIN', 2, 'CONTINUOUS'],
] as const;

function mm(value: number) { return value * MM_PER_UNIT; }
function p(x: number, y: number) { return point3d(mm(x), -mm(y), 0); }
function safe(value: string | number | undefined) { return String(value ?? '').replace(/[\r\n]+/g, ' ').trim() || 'N/D'; }
function metaFor(item: ModuleInst | ElementInst): FabricationMeta {
  const elementType = ELEMENT_TYPES.find((candidate) => candidate.id === item.typeId);
  const moduleType = MODULE_TYPES.find((candidate) => candidate.id === item.typeId);
  return { ...EMPTY_FABRICATION_META, reference: moduleType?.sku ?? elementType?.id?.toUpperCase() ?? 'N/D', ...item.fabrication };
}
function sizeOf(element: ElementInst) {
  const type = ELEMENT_TYPES.find((candidate) => candidate.id === element.typeId);
  return { w: element.w ?? type?.defaultW ?? 12, h: element.h ?? type?.defaultH ?? 12, label: type?.abbr ?? element.typeId };
}
function addLine(dxf: DxfWriter, layerName: string, a: Point, b: Point) { dxf.addLine(p(a.x, a.y), p(b.x, b.y), { layerName }); }
function addRect(dxf: DxfWriter, layerName: string, x: number, y: number, w: number, h: number) {
  addLine(dxf, layerName, { x, y }, { x: x + w, y });
  addLine(dxf, layerName, { x: x + w, y }, { x: x + w, y: y + h });
  addLine(dxf, layerName, { x: x + w, y: y + h }, { x, y: y + h });
  addLine(dxf, layerName, { x, y: y + h }, { x, y });
}
function addText(dxf: DxfWriter, layerName: string, x: number, y: number, height: number, value: string) { dxf.addText(p(x, y), mm(height), safe(value), { layerName }); }
function addBlockLine(block: DxfBlock, a: Point, b: Point, layerName = 'ELEMENTOS') { block.addLine(point3d(mm(a.x), mm(a.y), 0), point3d(mm(b.x), mm(b.y), 0), { layerName }); }
function blockRect(block: DxfBlock, x: number, y: number, w: number, h: number, layerName = 'ELEMENTOS') {
  addBlockLine(block, { x, y }, { x: x + w, y }, layerName);
  addBlockLine(block, { x: x + w, y }, { x: x + w, y: y + h }, layerName);
  addBlockLine(block, { x: x + w, y: y + h }, { x, y: y + h }, layerName);
  addBlockLine(block, { x, y: y + h }, { x, y }, layerName);
}
function offsetPoint(point: Point, segment: WallSeg, distance: number): Point { return { x: point.x + segment.inx * distance, y: point.y + segment.iny * distance }; }
function addOffsetSegment(dxf: DxfWriter, layerName: string, segment: WallSeg, distance: number) {
  addLine(dxf, layerName, offsetPoint({ x: segment.x1, y: segment.y1 }, segment, distance), offsetPoint({ x: segment.x2, y: segment.y2 }, segment, distance));
}

function addWindow(dxf: DxfWriter, segment: WallSeg) {
  const { x1, y1, x2, y2, inx, iny } = segment;
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / length, uy = (y2 - y1) / length;
  const span = Math.max(6, Math.min(length * 0.55, 14));
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const sx = mx - ux * span / 2, sy = my - uy * span / 2;
  const ex = mx + ux * span / 2, ey = my + uy * span / 2;
  addLine(dxf, 'ABERTURAS', { x: sx, y: sy }, { x: sx + inx * 2.4, y: sy + iny * 2.4 });
  addLine(dxf, 'ABERTURAS', { x: ex, y: ey }, { x: ex + inx * 2.4, y: ey + iny * 2.4 });
  addLine(dxf, 'ABERTURAS', { x: sx + inx * 1.3, y: sy + iny * 1.3 }, { x: ex + inx * 1.3, y: ey + iny * 1.3 });
  addLine(dxf, 'ABERTURAS', { x: sx + inx * 2.6, y: sy + iny * 2.6 }, { x: ex + inx * 2.6, y: ey + iny * 2.6 });
}
function addDoor(dxf: DxfWriter, segment: WallSeg) {
  const { x1, y1, x2, y2, inx, iny } = segment;
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / length, uy = (y2 - y1) / length;
  const gap = Math.max(6, Math.min(length * 0.45, 10));
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const sx = mx - ux * gap / 2, sy = my - uy * gap / 2;
  const ex = mx + ux * gap / 2, ey = my + uy * gap / 2;
  const hinge = { x: sx, y: sy };
  const leaf = { x: sx + inx * gap, y: sy + iny * gap };
  addLine(dxf, 'ABERTURAS', hinge, leaf);
  addLine(dxf, 'ABERTURAS', leaf, { x: ex, y: ey });
  addLine(dxf, 'ABERTURAS', { x: sx + inx * gap * 0.45, y: sy + iny * gap * 0.45 }, { x: ex + inx * gap * 0.45, y: ey + iny * gap * 0.45 });
}
function addWall(dxf: DxfWriter, segment: WallSeg, state: WallState, layer: string) {
  if (state === 'wall') {
    addLine(dxf, layer, { x: segment.x1, y: segment.y1 }, { x: segment.x2, y: segment.y2 });
    addOffsetSegment(dxf, 'PANELES', segment, segment.inx * WALL_THICKNESS);
    return;
  }
  const length = Math.hypot(segment.x2 - segment.x1, segment.y2 - segment.y1) || 1;
  const ux = (segment.x2 - segment.x1) / length, uy = (segment.y2 - segment.y1) / length;
  const gap = Math.max(6, Math.min(length * 0.45, 10));
  const mx = (segment.x1 + segment.x2) / 2, my = (segment.y1 + segment.y2) / 2;
  const sx = mx - ux * gap / 2, sy = my - uy * gap / 2;
  const ex = mx + ux * gap / 2, ey = my + uy * gap / 2;
  addLine(dxf, layer, { x: segment.x1, y: segment.y1 }, { x: sx, y: sy });
  addLine(dxf, layer, { x: ex, y: ey }, { x: segment.x2, y: segment.y2 });
  addOffsetSegment(dxf, 'PANELES', { ...segment, x2: sx, y2: sy }, segment.inx * WALL_THICKNESS);
  addOffsetSegment(dxf, 'PANELES', { ...segment, x1: ex, y1: ey }, segment.inx * WALL_THICKNESS);
  if (state === 'window') addWindow(dxf, segment); else addDoor(dxf, segment);
}
function addDimensions(dxf: DxfWriter, x: number, y: number, w: number, h: number) {
  const offset = 4;
  addLine(dxf, 'COTAS_GENERALES', { x, y: y - offset }, { x: x + w, y: y - offset });
  addLine(dxf, 'COTAS_GENERALES', { x, y: y - offset - 1.3 }, { x, y: y - offset + 1.3 });
  addLine(dxf, 'COTAS_GENERALES', { x: x + w, y: y - offset - 1.3 }, { x: x + w, y: y - offset + 1.3 });
  addText(dxf, 'COTAS_GENERALES', x + w / 2 - 5, y - offset - 2.2, SMALL_TEXT_H, `${Math.round(mm(w))} x ${Math.round(mm(h))} mm`);
}

function addElementBlocks(dxf: DxfWriter) {
  const add = (id: string, draw: (block: DxfBlock) => void) => { const block = dxf.addBlock(`PIEZA_${id.toUpperCase()}`); draw(block); };
  add('mesa', (block) => { blockRect(block, 4, 20, 92, 60); blockRect(block, 10, 26, 10, 10); blockRect(block, 80, 26, 10, 10); });
  add('taquillas', (block) => { blockRect(block, 8, 4, 84, 92); [29, 50, 71].forEach((x) => addBlockLine(block, { x, y: 4 }, { x, y: 96 })); });
  add('banco', (block) => { blockRect(block, 4, 30, 92, 35); addBlockLine(block, { x: 15, y: 30 }, { x: 15, y: 80 }); addBlockLine(block, { x: 85, y: 30 }, { x: 85, y: 80 }); });
  add('split', (block) => { blockRect(block, 4, 20, 92, 60); [32, 44, 56, 68].forEach((x) => addBlockLine(block, { x, y: 28 }, { x, y: 72 })); });
  add('escalera', (block) => { blockRect(block, 8, 4, 84, 92); [20, 32, 44, 56, 68, 80].forEach((y) => addBlockLine(block, { x: 8, y }, { x: 92, y })); addBlockLine(block, { x: 18, y: 86 }, { x: 78, y: 14 }); });
  add('rampa', (block) => { blockRect(block, 5, 15, 90, 70); addBlockLine(block, { x: 12, y: 78 }, { x: 88, y: 22 }); addBlockLine(block, { x: 76, y: 22 }, { x: 88, y: 22 }); addBlockLine(block, { x: 88, y: 22 }, { x: 88, y: 34 }); });
  add('agua', (block) => { blockRect(block, 20, 4, 60, 92); addBlockLine(block, { x: 20, y: 20 }, { x: 80, y: 20 }); addBlockLine(block, { x: 20, y: 80 }, { x: 80, y: 80 }); addBlockLine(block, { x: 50, y: 80 }, { x: 50, y: 98 }); });
  add('residual', (block) => { blockRect(block, 20, 4, 60, 92); addBlockLine(block, { x: 20, y: 50 }, { x: 80, y: 50 }); addBlockLine(block, { x: 50, y: 4 }, { x: 50, y: 96 }); });
  add('cuadro', (block) => { blockRect(block, 10, 4, 80, 92); blockRect(block, 22, 18, 56, 64); addBlockLine(block, { x: 22, y: 50 }, { x: 78, y: 50 }); });
  add('reja', (block) => { blockRect(block, 4, 20, 92, 60); [20, 36, 52, 68, 84].forEach((x) => addBlockLine(block, { x, y: 20 }, { x, y: 80 })); });
  add('persiana', (block) => { blockRect(block, 4, 20, 92, 60); [30, 40, 50, 60, 70].forEach((y) => addBlockLine(block, { x: 4, y }, { x: 96, y })); });
}
function addElementInsert(dxf: DxfWriter, element: ElementInst) {
  const { w, h, label } = sizeOf(element);
  const blockName = `PIEZA_${element.typeId.toUpperCase()}`;
  const insert = dxf.addInsert(blockName, p(element.x - w / 2, element.y + h / 2), { layerName: 'ELEMENTOS', scaleFactor: { x: w / 100, y: h / 100, z: 1 } });
  const meta = metaFor(element);
  dxf.addAttrib(p(element.x - w / 2 + 0.4, element.y + h / 2 + 0.3), mm(TEXT_H), 'REF', safe(meta.reference), insert, { layerName: 'TEXTO', visible: false });
  addText(dxf, 'TEXTO', element.x - w / 2, element.y + h / 2 + 1.8, SMALL_TEXT_H, label);
}
function addPlanGeometry(dxf: DxfWriter, modules: ModuleInst[], partitions: Partition[], elements: ElementInst[]) {
  modules.forEach((module) => {
    (['top', 'right', 'bottom', 'left'] as const).forEach((side) => addWall(dxf, wallSeg(module, side), module.walls[side], 'ESTR_PERFILES'));
    addDimensions(dxf, module.x, module.y, module.w, module.h);
    addText(dxf, 'TEXTO', module.x + 1.5, module.y + module.h / 2, TEXT_H, `${module.name} · ${Math.round(mm(module.w))} x ${Math.round(mm(module.h))} mm`);
    addText(dxf, 'TEXTO', module.x + module.w / 2 - 1, module.y + module.h / 2 + 2.4, SMALL_TEXT_H, module.fabrication?.reference || module.typeId || 'MODULO');
    for (let seam = PANEL_PITCH; seam < module.w - 1; seam += PANEL_PITCH) addLine(dxf, 'PANELES', { x: module.x + seam, y: module.y + 0.12 }, { x: module.x + seam, y: module.y + module.h - 0.12 });
    addLine(dxf, 'EJES_CENTRO', { x: module.x + module.w / 2, y: module.y - 2 }, { x: module.x + module.w / 2, y: module.y + module.h + 2 });
    addLine(dxf, 'EJES_CENTRO', { x: module.x - 2, y: module.y + module.h / 2 }, { x: module.x + module.w + 2, y: module.y + module.h / 2 });
  });
  partitions.forEach((partition) => {
    const dx = partition.x2 - partition.x1, dy = partition.y2 - partition.y1, length = Math.hypot(dx, dy) || 1;
    addWall(dxf, { x1: partition.x1, y1: partition.y1, x2: partition.x2, y2: partition.y2, inx: -dy / length, iny: dx / length }, partition.state, 'TABIQUES');
  });
  elements.forEach((element) => addElementInsert(dxf, element));
}
function addElevationGeometry(dxf: DxfWriter, modules: ModuleInst[], elements: ElementInst[]) {
  modules.forEach((module) => {
    const height = module.heightM * 10, top = ELEVATION_GROUND - height;
    addRect(dxf, 'ESTR_PERFILES', module.x, top, module.w, height);
    addLine(dxf, 'PANELES', { x: module.x + 0.12, y: top + height * 0.12 }, { x: module.x + module.w - 0.12, y: top + height * 0.12 });
    addLine(dxf, 'PANELES', { x: module.x + 0.12, y: ELEVATION_GROUND - height * 0.12 }, { x: module.x + module.w - 0.12, y: ELEVATION_GROUND - height * 0.12 });
    for (let seam = PANEL_PITCH; seam < module.w - 1; seam += PANEL_PITCH) addLine(dxf, 'PANELES', { x: module.x + seam, y: top }, { x: module.x + seam, y: ELEVATION_GROUND });
    addDimensions(dxf, module.x, top, module.w, height);
    addText(dxf, 'TEXTO', module.x + 1.5, top - 2.2, TEXT_H, `${module.name} · ${Math.round(mm(height))} mm alto`);
    addText(dxf, 'TEXTO', module.x + module.w / 2 - 1, ELEVATION_GROUND + 2, SMALL_TEXT_H, module.fabrication?.reference || module.typeId || 'MODULO');
  });
  elements.filter((element) => ELEMENT_TYPES.find((type) => type.id === element.typeId)?.exterior).forEach((element) => {
    const type = ELEMENT_TYPES.find((candidate) => candidate.id === element.typeId)!;
    addRect(dxf, 'ELEMENTOS', element.x - 3, ELEVATION_GROUND - (type.elevFrac ?? 0) * 28 - 3, 6, 6);
  });
  addLine(dxf, 'EJES_CENTRO', { x: 0, y: ELEVATION_GROUND }, { x: 160, y: ELEVATION_GROUND });
}

function addCajetinBlock(dxf: DxfWriter) {
  const block = dxf.addBlock('CAJETIN');
  const width = 1800, height = 550;
  const line = (a: Point, b: Point) => block.addLine(point3d(a.x, a.y, 0), point3d(b.x, b.y, 0), { layerName: 'CAJETIN' });
  line({ x: 0, y: 0 }, { x: width, y: 0 }); line({ x: width, y: 0 }, { x: width, y: height }); line({ x: width, y: height }, { x: 0, y: height }); line({ x: 0, y: height }, { x: 0, y: 0 });
  line({ x: 0, y: 100 }, { x: width, y: 100 }); line({ x: 0, y: 210 }, { x: width, y: 210 }); line({ x: 0, y: 320 }, { x: width, y: 320 }); line({ x: 0, y: 430 }, { x: width, y: 430 });
  block.addText(point3d(35, 485, 0), 42, 'OPEIN · PLANO TECNICO', { layerName: 'CAJETIN' });
  block.addText(point3d(35, 375, 0), 25, 'PROYECTO', { layerName: 'CAJETIN' });
  block.addText(point3d(35, 265, 0), 25, 'CLIENTE', { layerName: 'CAJETIN' });
  block.addText(point3d(35, 155, 0), 25, 'FECHA / ESCALA', { layerName: 'CAJETIN' });
  block.addText(point3d(35, 45, 0), 25, 'REFERENCIA / DATOS DE FABRICACION', { layerName: 'CAJETIN' });
  [['PROYECTO', 360], ['CLIENTE', 250], ['FECHA', 140], ['ESCALA', 30], ['REFERENCIA', 720], ['FABRICACION', 610], ['PROVEEDOR', 500]]
    .forEach(([tag, y]) => block.addAttdef(point3d(720, Number(y), 0), 25, String(tag), 'N/D', { layerName: 'CAJETIN', visible: false }));
}
function addCajetinInsert(dxf: DxfWriter, position: Point, client: DxfClientInfo | undefined, meta: FabricationMeta) {
  const insert = dxf.addInsert('CAJETIN', p(position.x, position.y), { layerName: 'CAJETIN' });
  const values: Array<[string, string, number]> = [
    ['PROYECTO', safe(client?.projectName), 360], ['CLIENTE', safe(client?.clientName), 250], ['FECHA', `${safe(client?.deliveryDate)} · ${safe(client?.scale ?? '1:20')}`, 140],
    ['ESCALA', safe(client?.scale ?? '1:20'), 30], ['REFERENCIA', safe(meta.reference), 720], ['FABRICACION', safe(`${meta.metric} / ${meta.steelGrade}`), 610], ['PROVEEDOR', safe(`${meta.supplier} / ${meta.profile}`), 500],
  ];
  values.forEach(([tag, value, y]) => dxf.addAttrib(point3d(mm(position.x) + 720, -mm(position.y) + y, 0), 25, tag, value, insert, { layerName: 'CAJETIN', visible: true }));
}
function createBase() {
  const dxf = new DxfWriter();
  dxf.setUnits(Units.Millimeters);
  dxf.addLType('CONTINUOUS', 'Solid line', []);
  dxf.addLType('CENTER', 'Center line', [12, -3, 1, -3]);
  LAYERS.forEach(([name, color, lineType]) => dxf.addLayer(name, color, lineType));
  addCajetinBlock(dxf);
  addElementBlocks(dxf);
  return dxf;
}
function firstMeta(modules: ModuleInst[], elements: ElementInst[]) { return modules[0] ? metaFor(modules[0]) : elements[0] ? metaFor(elements[0]) : { ...EMPTY_FABRICATION_META, reference: 'N/D' }; }
function finish(dxf: DxfWriter, position: Point, client: DxfClientInfo | undefined, meta: FabricationMeta) { addCajetinInsert(dxf, position, client, meta); return dxf.stringify(); }

export function exportPlanDxf({ modules, partitions, elements, client }: { modules: ModuleInst[]; partitions: Partition[]; elements: ElementInst[]; client?: DxfClientInfo }) {
  const dxf = createBase();
  addPlanGeometry(dxf, modules, partitions, elements);
  const allX = [...modules.map((module) => module.x), ...elements.map((element) => element.x - sizeOf(element).w / 2)];
  const allY = [...modules.map((module) => module.y), ...elements.map((element) => element.y - sizeOf(element).h / 2)];
  const maxX = Math.max(40, ...modules.map((module) => module.x + module.w), ...elements.map((element) => element.x + sizeOf(element).w / 2));
  const maxY = Math.max(40, ...modules.map((module) => module.y + module.h), ...elements.map((element) => element.y + sizeOf(element).h / 2));
  const minX = Math.min(0, ...allX);
  const titleBlockWidth = 18;
  return finish(dxf, { x: Math.max(minX, maxX - titleBlockWidth), y: maxY + 10 }, client, firstMeta(modules, elements));
}
export function exportElevationDxf({ modules, elements, client }: { modules: ModuleInst[]; elements: ElementInst[]; client?: DxfClientInfo }) {
  const dxf = createBase();
  addElevationGeometry(dxf, modules, elements);
  const minX = Math.min(0, ...modules.map((module) => module.x));
  const maxX = Math.max(40, ...modules.map((module) => module.x + module.w));
  return finish(dxf, { x: Math.max(minX, maxX - 18), y: ELEVATION_GROUND + 12 }, client, firstMeta(modules, elements));
}
