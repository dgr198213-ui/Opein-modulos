import { DxfWriter, Units, point3d, Insert } from '@tarikjabiri/dxf';
import { ELEMENT_TYPES, MODULE_TYPES } from './catalog';
import { wallSeg, WallSeg } from './geometry';
import { EMPTY_FABRICATION_META, ElementInst, FabricationMeta, ModuleInst, Partition, WallState } from './types';

const MM_PER_UNIT = 100;
const ELEVATION_GROUND = 46;
const LINE = { layerName: 'TEXTO' };
type Point = { x: number; y: number };

export interface DxfClientInfo {
  projectName?: string;
  clientName?: string;
  deliveryDate?: string;
  scale?: string;
}

const LAYERS = [
  ['MODULOS', 7, 'CONTINUOUS'],
  ['TABIQUES', 7, 'CONTINUOUS'],
  ['ABERTURAS', 6, 'CONTINUOUS'],
  ['ELEMENTOS', 7, 'CONTINUOUS'],
  ['TEXTO', 7, 'CONTINUOUS'],
  ['CAJETIN', 2, 'CONTINUOUS'],
] as const;

function mm(value: number) { return value * MM_PER_UNIT; }
function p(x: number, y: number) { return point3d(mm(x), -mm(y), 0); }
function paperPoint(x: number, y: number) { return point3d(x, y, 0); }
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
function addPaperLine(dxf: DxfWriter, a: Point, b: Point) { dxf.addLine(paperPoint(a.x, a.y), paperPoint(b.x, b.y), { layerName: 'CAJETIN' }); }
function addRect(dxf: DxfWriter, layerName: string, x: number, y: number, w: number, h: number) {
  addLine(dxf, layerName, { x, y }, { x: x + w, y });
  addLine(dxf, layerName, { x: x + w, y }, { x: x + w, y: y + h });
  addLine(dxf, layerName, { x: x + w, y: y + h }, { x, y: y + h });
  addLine(dxf, layerName, { x, y: y + h }, { x, y });
}
function addText(dxf: DxfWriter, layerName: string, x: number, y: number, height: number, value: string) { dxf.addText(p(x, y), mm(height), safe(value), { layerName }); }
function addPaperText(dxf: DxfWriter, x: number, y: number, height: number, value: string) { dxf.addText(paperPoint(x, y), height, safe(value), { layerName: 'CAJETIN' }); }

function addWindow(dxf: DxfWriter, segment: WallSeg) {
  const { x1, y1, x2, y2, inx, iny } = segment;
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / length, uy = (y2 - y1) / length;
  const span = Math.max(6, Math.min(length * 0.55, 14));
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const sx = mx - ux * span / 2, sy = my - uy * span / 2;
  const ex = mx + ux * span / 2, ey = my + uy * span / 2;
  const tick = 2.6;
  addLine(dxf, 'ABERTURAS', { x: sx, y: sy }, { x: sx + inx * tick, y: sy + iny * tick });
  addLine(dxf, 'ABERTURAS', { x: ex, y: ey }, { x: ex + inx * tick, y: ey + iny * tick });
  addLine(dxf, 'ABERTURAS', { x: sx + inx * 1.3, y: sy + iny * 1.3 }, { x: ex + inx * 1.3, y: ey + iny * 1.3 });
}
function addDoor(dxf: DxfWriter, segment: WallSeg) {
  const { x1, y1, x2, y2, inx, iny } = segment;
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / length, uy = (y2 - y1) / length;
  const gap = Math.max(6, Math.min(length * 0.45, 10));
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const sx = mx - ux * gap / 2, sy = my - uy * gap / 2;
  const ex = mx + ux * gap / 2, ey = my + uy * gap / 2;
  const lx = sx + inx * gap, ly = sy + iny * gap;
  addLine(dxf, 'ABERTURAS', { x: sx, y: sy }, { x: lx, y: ly });
  addLine(dxf, 'ABERTURAS', { x: lx, y: ly }, { x: ex, y: ey });
}
function addWall(dxf: DxfWriter, segment: WallSeg, state: WallState, layer: string) {
  if (state === 'wall') { addLine(dxf, layer, { x: segment.x1, y: segment.y1 }, { x: segment.x2, y: segment.y2 }); return; }
  if (state === 'window') { addLine(dxf, layer, { x: segment.x1, y: segment.y1 }, { x: segment.x2, y: segment.y2 }); addWindow(dxf, segment); return; }
  const length = Math.hypot(segment.x2 - segment.x1, segment.y2 - segment.y1) || 1;
  const ux = (segment.x2 - segment.x1) / length, uy = (segment.y2 - segment.y1) / length;
  const gap = Math.max(6, Math.min(length * 0.45, 10));
  const mx = (segment.x1 + segment.x2) / 2, my = (segment.y1 + segment.y2) / 2;
  const sx = mx - ux * gap / 2, sy = my - uy * gap / 2;
  const ex = mx + ux * gap / 2, ey = my + uy * gap / 2;
  addLine(dxf, layer, { x: segment.x1, y: segment.y1 }, { x: sx, y: sy });
  addLine(dxf, layer, { x: ex, y: ey }, { x: segment.x2, y: segment.y2 });
  addDoor(dxf, segment);
}
function addDimensions(dxf: DxfWriter, x: number, y: number, w: number, h: number) {
  addLine(dxf, 'TEXTO', { x, y: y - 4 }, { x: x + w, y: y - 4 });
  addLine(dxf, 'TEXTO', { x, y: y - 5.5 }, { x, y: y - 2.5 });
  addLine(dxf, 'TEXTO', { x: x + w, y: y - 5.5 }, { x: x + w, y: y - 2.5 });
  addText(dxf, 'TEXTO', x + w / 2 - 5, y - 6, 2.5, `${(w / 10).toFixed(0)} x ${(h / 10).toFixed(0)} cm`);
}
function addPlanGeometry(dxf: DxfWriter, modules: ModuleInst[], partitions: Partition[], elements: ElementInst[]) {
  modules.forEach((module) => {
    (['top', 'right', 'bottom', 'left'] as const).forEach((side) => addWall(dxf, wallSeg(module, side), module.walls[side], 'MODULOS'));
    addDimensions(dxf, module.x, module.y, module.w, module.h);
    addText(dxf, 'TEXTO', module.x + 2, module.y + module.h / 2, 3.4, module.name);
    // Juntas verticales de panel, dibujadas como líneas muy tenues en TEXTO.
    for (let seam = 60; seam < module.w - 1; seam += 60) addLine(dxf, 'TEXTO', { x: module.x + seam, y: module.y + 0.4 }, { x: module.x + seam, y: module.y + module.h - 0.4 });
  });
  partitions.forEach((partition) => {
    const dx = partition.x2 - partition.x1, dy = partition.y2 - partition.y1, length = Math.hypot(dx, dy) || 1;
    addWall(dxf, { x1: partition.x1, y1: partition.y1, x2: partition.x2, y2: partition.y2, inx: -dy / length, iny: dx / length }, partition.state, 'TABIQUES');
  });
  elements.forEach((element) => {
    const { w, h, label } = sizeOf(element);
    addRect(dxf, 'ELEMENTOS', element.x - w / 2, element.y - h / 2, w, h);
    addText(dxf, 'TEXTO', element.x - w / 4, element.y + 1, Math.min(2.8, h * 0.38), label);
  });
}
function addElevationGeometry(dxf: DxfWriter, modules: ModuleInst[], elements: ElementInst[]) {
  modules.forEach((module) => {
    const height = module.heightM * 10, top = ELEVATION_GROUND - height, centerX = module.x + module.w / 2;
    addRect(dxf, 'MODULOS', module.x, top, module.w, height);
    addDimensions(dxf, module.x, top, module.w, height);
    addText(dxf, 'TEXTO', module.x, top - 3.2, 3.4, module.name);
    if (module.walls.bottom === 'door') addRect(dxf, 'ABERTURAS', centerX - Math.min(module.w * 0.32, 9) / 2, ELEVATION_GROUND - Math.min(height * 0.8, 20), Math.min(module.w * 0.32, 9), Math.min(height * 0.8, 20));
    if (module.walls.bottom === 'window') addRect(dxf, 'ABERTURAS', centerX - Math.min(module.w * 0.4, 14) / 2, ELEVATION_GROUND - height * 0.42 - Math.min(height * 0.4, 10), Math.min(module.w * 0.4, 14), Math.min(height * 0.4, 10));
  });
  elements.filter((element) => ELEMENT_TYPES.find((type) => type.id === element.typeId)?.exterior).forEach((element) => {
    const type = ELEMENT_TYPES.find((candidate) => candidate.id === element.typeId)!;
    addRect(dxf, 'ELEMENTOS', element.x - 3, ELEVATION_GROUND - (type.elevFrac ?? 0) * 28 - 3, 6, 6);
  });
  addLine(dxf, 'TEXTO', { x: 0, y: ELEVATION_GROUND }, { x: 160, y: ELEVATION_GROUND });
}

function addCajetinBlock(dxf: DxfWriter) {
  const block = dxf.addBlock('CAJETIN');
  block.addLine(point3d(0, 0, 0), point3d(280, 0, 0), { layerName: 'CAJETIN' });
  block.addLine(point3d(280, 0, 0), point3d(280, 190, 0), { layerName: 'CAJETIN' });
  block.addLine(point3d(280, 190, 0), point3d(0, 190, 0), { layerName: 'CAJETIN' });
  block.addLine(point3d(0, 190, 0), point3d(0, 0, 0), { layerName: 'CAJETIN' });
  block.addText(point3d(12, 170, 0), 7, 'OPEIN · PLANO TÉCNICO', { layerName: 'CAJETIN' });
  block.addText(point3d(12, 150, 0), 4, 'PROYECTO', { layerName: 'CAJETIN' });
  block.addText(point3d(12, 130, 0), 4, 'CLIENTE', { layerName: 'CAJETIN' });
  block.addText(point3d(12, 110, 0), 4, 'FECHA ENTREGA', { layerName: 'CAJETIN' });
  block.addText(point3d(12, 90, 0), 4, 'ESCALA', { layerName: 'CAJETIN' });
  block.addText(point3d(12, 70, 0), 4, 'REFERENCIA', { layerName: 'CAJETIN' });
  block.addText(point3d(12, 50, 0), 4, 'METRICA / ACERO', { layerName: 'CAJETIN' });
  block.addText(point3d(12, 30, 0), 4, 'PROVEEDOR / PERFIL', { layerName: 'CAJETIN' });
  const attributes = [
    ['PROYECTO', 80], ['CLIENTE', 80], ['FECHA', 80], ['ESCALA', 80], ['REFERENCIA', 80], ['FABRICACION', 80], ['PROVEEDOR', 80],
  ] as const;
  attributes.forEach(([tag, y]) => block.addAttdef(point3d(80, y, 0), 4, tag, 'N/D', { layerName: 'CAJETIN', visible: false }));
}
function addCajetinInsert(dxf: DxfWriter, position: Point, client: DxfClientInfo | undefined, meta: FabricationMeta) {
  const insert = dxf.addInsert('CAJETIN', point3d(mm(position.x), -mm(position.y), 0), { layerName: 'CAJETIN' });
  const values: Array<[string, string]> = [
    ['PROYECTO', safe(client?.projectName)], ['CLIENTE', safe(client?.clientName)], ['FECHA', safe(client?.deliveryDate)], ['ESCALA', safe(client?.scale ?? '1:20')],
    ['REFERENCIA', safe(meta.reference)], ['FABRICACION', safe(`${meta.metric} / ${meta.steelGrade}`)], ['PROVEEDOR', safe(`${meta.supplier} / ${meta.profile}`)],
  ];
  values.forEach(([tag, value], index) => dxf.addAttrib(point3d(mm(80), -mm(170 - index * 20), 0), mm(4), tag, value, insert, { layerName: 'CAJETIN', visible: false }));
}
function createBase(client: DxfClientInfo | undefined) {
  const dxf = new DxfWriter();
  dxf.setUnits(Units.Millimeters);
  dxf.addLType('CONTINUOUS', 'Solid line', []);
  LAYERS.forEach(([name, color, lineType]) => dxf.addLayer(name, color, lineType));
  addCajetinBlock(dxf);
  return dxf;
}
function finish(dxf: DxfWriter, position: Point, client: DxfClientInfo | undefined, meta: FabricationMeta) {
  addCajetinInsert(dxf, position, client, meta);
  return dxf.stringify();
}
function firstMeta(modules: ModuleInst[], elements: ElementInst[]) { return modules[0] ? metaFor(modules[0]) : elements[0] ? metaFor(elements[0]) : { ...EMPTY_FABRICATION_META, reference: 'N/D' }; }

export function exportPlanDxf({ modules, partitions, elements, client }: { modules: ModuleInst[]; partitions: Partition[]; elements: ElementInst[]; client?: DxfClientInfo }) {
  const dxf = createBase(client);
  addPlanGeometry(dxf, modules, partitions, elements);
  const maxX = Math.max(40, ...modules.map((module) => module.x + module.w), ...elements.map((element) => element.x + sizeOf(element).w));
  const minY = Math.min(40, ...modules.map((module) => module.y + module.h), ...elements.map((element) => element.y + sizeOf(element).h));
  return finish(dxf, { x: maxX + 10, y: minY + 10 }, client, firstMeta(modules, elements));
}
export function exportElevationDxf({ modules, elements, client }: { modules: ModuleInst[]; elements: ElementInst[]; client?: DxfClientInfo }) {
  const dxf = createBase(client);
  addElevationGeometry(dxf, modules, elements);
  const maxX = Math.max(40, ...modules.map((module) => module.x + module.w));
  return finish(dxf, { x: maxX + 10, y: ELEVATION_GROUND + 15 }, client, firstMeta(modules, elements));
}
