import { ELEMENT_TYPES, MODULE_TYPES } from './catalog';
import { wallSeg, WallSeg } from './geometry';
import { EMPTY_FABRICATION_META, ElementInst, FabricationMeta, ModuleInst, Partition, WallState } from './types';

const MM_PER_UNIT = 100;
const ELEVATION_GROUND = 46;
type Point = { x: number; y: number };
type LayerName = string;

const LAYERS: Array<{ name: LayerName; color: number; linetype: string; lineweight: number }> = [
  { name: 'MODULOS', color: 7, linetype: 'CONTINUOUS', lineweight: 35 },
  { name: 'TABIQUES', color: 7, linetype: 'CONTINUOUS', lineweight: 25 },
  { name: 'ABERTURAS', color: 6, linetype: 'CONTINUOUS', lineweight: 18 },
  { name: 'ELEMENTOS', color: 7, linetype: 'CONTINUOUS', lineweight: 18 },
  { name: 'TEXTO', color: 7, linetype: 'CONTINUOUS', lineweight: 18 },
  { name: 'MEC_TORNILLERIA', color: 4, linetype: 'CONTINUOUS', lineweight: 18 },
  { name: 'ESTR_PERFILES', color: 1, linetype: 'CONTINUOUS', lineweight: 50 },
  { name: 'COTAS_GENERALES', color: 3, linetype: 'CONTINUOUS', lineweight: 18 },
  { name: 'COTAS_DETALLES', color: 2, linetype: 'CONTINUOUS', lineweight: 18 },
  { name: 'EJES_CENTRO', color: 8, linetype: 'CENTER', lineweight: 18 },
  { name: 'BOM', color: 7, linetype: 'CONTINUOUS', lineweight: 18 },
];

function number(value: number) { return String(Math.round(value * 100) / 100); }
function point(x: number, y: number): Point { return { x: x * MM_PER_UNIT, y: -y * MM_PER_UNIT }; }
function safeText(value: string) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\r\n]+/g, ' ').replace(/[^\x20-\x7E]/g, ''); }
function metaFor(item: ModuleInst | ElementInst): FabricationMeta {
  const elementType = ELEMENT_TYPES.find((candidate) => candidate.id === item.typeId);
  const moduleType = MODULE_TYPES.find((candidate) => candidate.id === item.typeId);
  return { ...EMPTY_FABRICATION_META, reference: moduleType?.sku ?? elementType?.id?.toUpperCase() ?? '', ...item.fabrication };
}

class DxfEntities {
  private entities: string[] = [];
  raw(values: string[]) { this.entities.push(...values); }
  line(layer: LayerName, x1: number, y1: number, x2: number, y2: number) {
    const a = point(x1, y1), b = point(x2, y2);
    this.raw(['0','LINE','100','AcDbEntity','8',layer,'100','AcDbLine','10',number(a.x),'20',number(a.y),'30','0','11',number(b.x),'21',number(b.y),'31','0']);
  }
  rawLine(layer: LayerName, x1: number, y1: number, x2: number, y2: number) {
    this.line(layer, x1 / MM_PER_UNIT, -y1 / MM_PER_UNIT, x2 / MM_PER_UNIT, -y2 / MM_PER_UNIT);
  }
  text(layer: LayerName, x: number, y: number, height: number, value: string, paper = false) {
    const p = paper ? { x: x, y } : point(x, y);
    this.raw(['0','TEXT','100','AcDbEntity','8',layer,'67',paper ? '1' : '0','100','AcDbText','10',number(p.x),'20',number(p.y),'30','0','40',number(height * (paper ? 1 : MM_PER_UNIT)),'1',safeText(value),'7','STANDARD']);
  }
  rectangle(layer: LayerName, x: number, y: number, width: number, height: number) {
    this.line(layer, x, y, x + width, y); this.line(layer, x + width, y, x + width, y + height); this.line(layer, x + width, y + height, x, y + height); this.line(layer, x, y + height, x, y);
  }
  circle(layer: LayerName, x: number, y: number, radius: number) {
    const p = point(x, y); this.raw(['0','CIRCLE','100','AcDbEntity','8',layer,'100','AcDbCircle','10',number(p.x),'20',number(p.y),'30','0','40',number(radius * MM_PER_UNIT)]);
  }
  serialize() { return this.entities; }
}

function addWindow(builder: DxfEntities, segment: WallSeg) {
  const { x1, y1, x2, y2, inx, iny } = segment; const length = Math.hypot(x2 - x1, y2 - y1) || 1; const ux = (x2 - x1) / length; const uy = (y2 - y1) / length; const span = Math.max(6, Math.min(length * .55, 14)); const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2; const sx = mx - ux * span / 2; const sy = my - uy * span / 2; const ex = mx + ux * span / 2; const ey = my + uy * span / 2; const tick = 2.6;
  builder.line('ABERTURAS', sx, sy, sx + inx * tick, sy + iny * tick); builder.line('ABERTURAS', ex, ey, ex + inx * tick, ey + iny * tick); builder.line('ABERTURAS', sx + inx * 1.3, sy + iny * 1.3, ex + inx * 1.3, ey + iny * 1.3);
}
function addDoor(builder: DxfEntities, segment: WallSeg) {
  const { x1, y1, x2, y2, inx, iny } = segment; const length = Math.hypot(x2 - x1, y2 - y1) || 1; const ux = (x2 - x1) / length; const uy = (y2 - y1) / length; const gap = Math.max(6, Math.min(length * .45, 10)); const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2; const sx = mx - ux * gap / 2; const sy = my - uy * gap / 2; const ex = mx + ux * gap / 2; const ey = my + uy * gap / 2; const lx = sx + inx * gap; const ly = sy + iny * gap;
  builder.line('ABERTURAS', sx, sy, lx, ly); builder.line('ABERTURAS', lx, ly, ex, ey);
}
function addWall(builder: DxfEntities, segment: WallSeg, state: WallState, layer: LayerName) {
  const { x1, y1, x2, y2 } = segment;
  if (state === 'wall') { builder.line(layer, x1, y1, x2, y2); return; }
  if (state === 'window') { builder.line(layer, x1, y1, x2, y2); addWindow(builder, segment); return; }
  const length = Math.hypot(x2 - x1, y2 - y1) || 1; const ux = (x2 - x1) / length; const uy = (y2 - y1) / length; const gap = Math.max(6, Math.min(length * .45, 10)); const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2; const sx = mx - ux * gap / 2; const sy = my - uy * gap / 2; const ex = mx + ux * gap / 2; const ey = my + uy * gap / 2;
  builder.line(layer, x1, y1, sx, sy); builder.line(layer, ex, ey, x2, y2); addDoor(builder, segment);
}
function elementSize(element: ElementInst) { const type = ELEMENT_TYPES.find((candidate) => candidate.id === element.typeId); return { width: element.w ?? type?.defaultW ?? 12, height: element.h ?? type?.defaultH ?? 12, label: type?.abbr ?? element.typeId }; }

function attdef(tag: string, prompt: string, defaultValue: string, x: number, y: number) {
  return ['0','ATTDEF','100','AcDbEntity','8','MEC_TORNILLERIA','100','AcDbText','10',number(x),'20',number(y),'30','0','40','2.5','1',safeText(defaultValue),'7','STANDARD','100','AcDbAttributeDefinition','280','0','3',safeText(prompt),'2',tag,'70','1','73','0','74','0'];
}
function blockDefinition(name: string, kind: 'MODULE' | 'ELEMENT' | 'FASTENER') {
  const lines: string[] = ['0','BLOCK','2',name,'70','0','10','0','20','0','30','0'];
  if (kind === 'MODULE') { lines.push('0','LINE','8','ESTR_PERFILES','10','0','20','0','30','0','11','6000','21','0','31','0','0','LINE','8','ESTR_PERFILES','10','6000','20','0','30','0','11','6000','21','2440','31','0','0','LINE','8','ESTR_PERFILES','10','6000','20','2440','30','0','11','0','21','2440','31','0','0','LINE','8','ESTR_PERFILES','10','0','20','2440','30','0','11','0','21','0','31','0'); }
  if (kind === 'ELEMENT') { lines.push('0','CIRCLE','8','MEC_TORNILLERIA','10','0','20','0','30','0','40','30'); }
  if (kind === 'FASTENER') { lines.push('0','CIRCLE','8','MEC_TORNILLERIA','10','0','20','0','30','0','40','5'); }
  lines.push(...attdef('REF','Referencia','N/D',0,0), ...attdef('CANT','Cantidad','1',0,-4), ...attdef('PROV','Proveedor','N/D',0,-8), ...attdef('METRICA','Metrica','N/D',0,-12), ...attdef('ACERO','Grado acero','N/D',0,-16), ...attdef('PERFIL','Perfil','N/D',0,-20), ...attdef('NOTAS','Notas','',0,-24), '0','ENDBLK');
  return lines;
}
function insertWithAttributes(name: string, x: number, y: number, meta: FabricationMeta, layer: LayerName, paper = false) {
  const p = paper ? { x, y } : point(x, y); const values: Array<[string,string]> = [['REF',meta.reference],['CANT',String(meta.quantity)],['PROV',meta.supplier],['METRICA',meta.metric],['ACERO',meta.steelGrade],['PERFIL',meta.profile],['NOTAS',meta.notes]];
  const lines = ['0','INSERT','100','AcDbEntity','8',layer,'67',paper ? '1' : '0','100','AcDbBlockReference','2',name,'10',number(p.x),'20',number(p.y),'30','0','41','1','42','1','43','1'];
  values.forEach(([tag, value], index) => lines.push('0','ATTRIB','100','AcDbEntity','8','MEC_TORNILLERIA','67',paper ? '1' : '0','100','AcDbText','10',number(p.x),'20',number(p.y - index * 4),'30','0','40',paper ? '2.5' : '2.5','1',safeText(value),'7','STANDARD','100','AcDbAttribute','2',tag,'70','1'));
  lines.push('0','SEQEND'); return lines;
}
function dimensions(builder: DxfEntities, x: number, y: number, width: number, height: number, label: string) { builder.line('COTAS_GENERALES', x, y - 4, x + width, y - 4); builder.line('COTAS_GENERALES', x, y - 5.5, x, y - 2.5); builder.line('COTAS_GENERALES', x + width, y - 5.5, x + width, y - 2.5); builder.text('COTAS_GENERALES', x + width / 2 - 5, y - 6, 2.5, label); builder.line('COTAS_GENERALES', x - 4, y, x - 4, y + height); builder.line('COTAS_GENERALES', x - 5.5, y, x - 2.5, y); builder.line('COTAS_GENERALES', x - 5.5, y + height, x - 2.5, y + height); builder.text('COTAS_GENERALES', x - 9, y + height / 2, 2.5, `${height.toFixed(0)}`); }

function tableLayers() { return LAYERS.flatMap((layer) => ['0','LAYER','2',layer.name,'70','0','62',String(layer.color),'6',layer.linetype,'370',String(layer.lineweight)]); }
function tableLinetypes() { return ['0','TABLE','2','LTYPE','70','2','0','LTYPE','2','CONTINUOUS','70','0','3','Solid line','72','65','73','0','40','0','0','LTYPE','2','CENTER','70','0','3','Center __ __','72','65','73','2','40','12','49','9','49','-3','0','ENDTAB']; }
function paperSpaceBlock(name: string, title: string, scale: number) { const e = new DxfEntities(); e.raw(['0','BLOCK','2',name,'70','0','10','0','20','0','30','0']); e.raw(['0','VIEWPORT','100','AcDbEntity','67','1','8','0','100','AcDbViewport','10','148.5','20','105','30','0','40','280','41','180','68','0','69','2','12','0','22','0','16','0','26','0','36','1','17','0','27','0','37','0','45',number(180 * scale),'50','0','51','0','90','0']); e.rectangle('TEXTO', 8, 8, 281, 194); e.text('TEXTO', 15, 190, 4, title, true); e.text('TEXTO', 15, 15, 3, `ESCALA 1:${scale}`, true); e.raw(['0','ENDBLK']); return e.serialize(); }

function serializeDxf(builder: DxfEntities, blocks: string[], layouts: string[]) {
  return ['0','SECTION','2','HEADER','9','$ACADVER','1','AC1015','9','$INSUNITS','70','4','0','ENDSEC','0','SECTION','2','TABLES',...tableLinetypes(),'0','TABLE','2','LAYER','70',String(LAYERS.length),...tableLayers(),'0','ENDTAB','0','ENDSEC','0','SECTION','2','BLOCKS',...blocks,'0','ENDSEC','0','SECTION','2','ENTITIES',...builder.serialize(),'0','ENDSEC','0','SECTION','2','OBJECTS','0','DICTIONARY','5','C','100','AcDbDictionary','281','1','3','ACAD_LAYOUT','350','D','0','DICTIONARY','5','D','100','AcDbDictionary','281','1','3','PLANTA_1_20','350','E','3','ALZADO_1_20','350','F','0','LAYOUT','5','E','100','AcDbLayout','1','PLANTA_1_20','70','1','71','1','330','A','0','LAYOUT','5','F','100','AcDbLayout','1','ALZADO_1_20','70','1','71','2','330','B','0','ENDSEC', '0','SECTION','2','ENTITIES', ...layouts, '0','ENDSEC','0','EOF',''].join('\n');
}

function planBuilder(modules: ModuleInst[], partitions: Partition[], elements: ElementInst[]) { const builder = new DxfEntities(); modules.forEach((module) => { (['top','right','bottom','left'] as const).forEach((side) => addWall(builder, wallSeg(module, side), module.walls[side], 'MODULOS')); dimensions(builder, module.x, module.y, module.w, module.h, `${(module.w / 10).toFixed(0)} x ${(module.h / 10).toFixed(0)} cm`); builder.text('TEXTO', module.x + 2, module.y + module.h / 2, 3.4, module.name); }); partitions.forEach((partition) => { const dx = partition.x2 - partition.x1, dy = partition.y2 - partition.y1, length = Math.hypot(dx,dy) || 1; addWall(builder, { x1: partition.x1, y1: partition.y1, x2: partition.x2, y2: partition.y2, inx: -dy / length, iny: dx / length }, partition.state, 'TABIQUES'); }); elements.forEach((element) => { const { width, height, label } = elementSize(element); const x = element.x - width / 2, y = element.y - height / 2; builder.rectangle('ELEMENTOS', x, y, width, height); builder.text('TEXTO', x + .8, element.y + .9, Math.min(2.8, height * .38), label); }); return builder; }
function elevationBuilder(modules: ModuleInst[], elements: ElementInst[]) { const builder = new DxfEntities(); modules.forEach((module) => { const height = module.heightM * 10, top = ELEVATION_GROUND - height, centerX = module.x + module.w / 2; builder.rectangle('MODULOS', module.x, top, module.w, height); dimensions(builder, module.x, top, module.w, height, `${(module.w / 10).toFixed(0)} x ${module.heightM.toFixed(2)} m`); builder.text('TEXTO', module.x, top - 3.2, 3.4, module.name); if (module.walls.bottom === 'door') { const doorWidth = Math.min(module.w * .32, 9), doorHeight = Math.min(height * .8,20), x = centerX - doorWidth / 2, y = ELEVATION_GROUND - doorHeight; builder.rectangle('ABERTURAS', x,y,doorWidth,doorHeight); } else if (module.walls.bottom === 'window') { const windowWidth = Math.min(module.w * .4,14), windowHeight = Math.min(height * .4,10), y = ELEVATION_GROUND - height * .42 - windowHeight, x = centerX - windowWidth / 2; builder.rectangle('ABERTURAS',x,y,windowWidth,windowHeight); } }); elements.filter((element) => ELEMENT_TYPES.find((type) => type.id === element.typeId)?.exterior).forEach((element) => { const type = ELEMENT_TYPES.find((candidate) => candidate.id === element.typeId)!; builder.rectangle('ELEMENTOS', element.x - 3, ELEVATION_GROUND - (type.elevFrac ?? 0) * 28 - 3, 6, 6); }); builder.line('EJES_CENTRO', 0, ELEVATION_GROUND, 160, ELEVATION_GROUND); return builder; }

export function exportPlanDxf({ modules, partitions, elements }: { modules: ModuleInst[]; partitions: Partition[]; elements: ElementInst[] }) { const builder = planBuilder(modules, partitions, elements); const blocks = [...modules.map((module) => blockDefinition(`MOD_${module.typeId ?? 'CUSTOM'}`, 'MODULE')).filter((value, index, array) => array.indexOf(value) === index).flat(), ...elements.map((element) => blockDefinition(`EL_${element.typeId}`, 'ELEMENT')).filter((value, index, array) => array.indexOf(value) === index).flat(), ...blockDefinition('TORNILLO_M10', 'FASTENER')]; modules.forEach((module) => builder.raw(insertWithAttributes(`MOD_${module.typeId ?? 'CUSTOM'}`, module.x, module.y, metaFor(module), 'MODULOS'))); elements.forEach((element) => builder.raw(insertWithAttributes(`EL_${element.typeId}`, element.x, element.y, metaFor(element), 'ELEMENTOS'))); const bom = elements.concat(modules as unknown as ElementInst[]).map((item) => metaFor(item)).filter((meta) => meta.reference); bom.forEach((meta, index) => builder.text('BOM', 420, 20 + index * 6, 2.5, `${meta.reference} | ${meta.quantity} | ${meta.supplier} | ${meta.metric} | ${meta.steelGrade}`)); const layouts = paperSpaceBlock('*Paper_Space','PLANTA 1:20 · OPEIN',20); return serializeDxf(builder, blocks, layouts); }
export function exportElevationDxf({ modules, elements }: { modules: ModuleInst[]; elements: ElementInst[] }) { const builder = elevationBuilder(modules, elements); const blocks = [...modules.map((module) => blockDefinition(`MOD_${module.typeId ?? 'CUSTOM'}`, 'MODULE')).filter((value, index, array) => array.indexOf(value) === index).flat(), ...blockDefinition('TORNILLO_M10', 'FASTENER')]; modules.forEach((module) => builder.raw(insertWithAttributes(`MOD_${module.typeId ?? 'CUSTOM'}`, module.x, module.y, metaFor(module), 'MODULOS'))); return serializeDxf(builder, blocks, paperSpaceBlock('*Paper_Space0','ALZADO 1:20 · OPEIN',20)); }
