import { ELEMENT_TYPES } from './catalog';
import { wallSeg, WallSeg } from './geometry';
import { ElementInst, ModuleInst, Partition, WallState } from './types';

const MM_PER_UNIT = 100;
const ELEVATION_GROUND = 46;

type DxfLayer = 'MODULOS' | 'TABIQUES' | 'ABERTURAS' | 'ELEMENTOS' | 'TEXTO';
type Point = { x: number; y: number };

const LAYERS: DxfLayer[] = ['MODULOS', 'TABIQUES', 'ABERTURAS', 'ELEMENTOS', 'TEXTO'];

function number(value: number) {
  const rounded = Math.round(value * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function point(x: number, y: number): Point {
  // La vista web crece hacia abajo; DXF se guarda con Y creciente hacia arriba.
  return { x: x * MM_PER_UNIT, y: -y * MM_PER_UNIT };
}

function safeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '');
}

class DxfEntities {
  private entities: string[] = [];

  line(layer: DxfLayer, startX: number, startY: number, endX: number, endY: number) {
    const start = point(startX, startY);
    const end = point(endX, endY);
    this.entities.push(
      '0', 'LINE',
      '8', layer,
      '10', number(start.x),
      '20', number(start.y),
      '30', '0.0',
      '11', number(end.x),
      '21', number(end.y),
      '31', '0.0',
    );
  }

  text(layer: DxfLayer, x: number, y: number, height: number, value: string) {
    const position = point(x, y);
    this.entities.push(
      '0', 'TEXT',
      '8', layer,
      '10', number(position.x),
      '20', number(position.y),
      '30', '0.0',
      '40', number(height * MM_PER_UNIT),
      '1', safeText(value),
    );
  }

  rectangle(layer: DxfLayer, x: number, y: number, width: number, height: number) {
    this.line(layer, x, y, x + width, y);
    this.line(layer, x + width, y, x + width, y + height);
    this.line(layer, x + width, y + height, x, y + height);
    this.line(layer, x, y + height, x, y);
  }

  serialize() {
    return this.entities;
  }
}

function addWindow(builder: DxfEntities, segment: WallSeg) {
  const { x1, y1, x2, y2, inx, iny } = segment;
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / length;
  const uy = (y2 - y1) / length;
  const windowLength = Math.max(6, Math.min(length * 0.55, 14));
  const middleX = (x1 + x2) / 2;
  const middleY = (y1 + y2) / 2;
  const startX = middleX - ux * windowLength / 2;
  const startY = middleY - uy * windowLength / 2;
  const endX = middleX + ux * windowLength / 2;
  const endY = middleY + uy * windowLength / 2;
  const tick = 2.6;

  builder.line('ABERTURAS', startX, startY, startX + inx * tick, startY + iny * tick);
  builder.line('ABERTURAS', endX, endY, endX + inx * tick, endY + iny * tick);
  builder.line('ABERTURAS', startX + inx * 1.3, startY + iny * 1.3, endX + inx * 1.3, endY + iny * 1.3);
}

function addDoor(builder: DxfEntities, segment: WallSeg) {
  const { x1, y1, x2, y2, inx, iny } = segment;
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / length;
  const uy = (y2 - y1) / length;
  const gap = Math.max(6, Math.min(length * 0.45, 10));
  const middleX = (x1 + x2) / 2;
  const middleY = (y1 + y2) / 2;
  const startX = middleX - ux * gap / 2;
  const startY = middleY - uy * gap / 2;
  const endX = middleX + ux * gap / 2;
  const endY = middleY + uy * gap / 2;
  const leafX = startX + inx * gap;
  const leafY = startY + iny * gap;

  builder.line('ABERTURAS', startX, startY, leafX, leafY);
  builder.line('ABERTURAS', leafX, leafY, endX, endY);
}

function addWall(builder: DxfEntities, segment: WallSeg, state: WallState, baseLayer: 'MODULOS' | 'TABIQUES') {
  const { x1, y1, x2, y2 } = segment;
  if (state === 'wall') {
    builder.line(baseLayer, x1, y1, x2, y2);
    return;
  }

  if (state === 'window') {
    builder.line(baseLayer, x1, y1, x2, y2);
    addWindow(builder, segment);
    return;
  }

  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / length;
  const uy = (y2 - y1) / length;
  const gap = Math.max(6, Math.min(length * 0.45, 10));
  const middleX = (x1 + x2) / 2;
  const middleY = (y1 + y2) / 2;
  const startX = middleX - ux * gap / 2;
  const startY = middleY - uy * gap / 2;
  const endX = middleX + ux * gap / 2;
  const endY = middleY + uy * gap / 2;

  builder.line(baseLayer, x1, y1, startX, startY);
  builder.line(baseLayer, endX, endY, x2, y2);
  addDoor(builder, segment);
}

function elementSize(element: ElementInst) {
  const type = ELEMENT_TYPES.find((candidate) => candidate.id === element.typeId);
  return {
    width: element.w ?? type?.defaultW ?? 12,
    height: element.h ?? type?.defaultH ?? 12,
    label: type?.abbr ?? element.typeId,
  };
}

function serializeDxf(entities: DxfEntities) {
  const layers = LAYERS.flatMap((layer, index) => [
    '0', 'LAYER',
    '2', layer,
    '70', '0',
    '62', String(index + 1),
    '6', 'CONTINUOUS',
  ]);

  return [
    '0', 'SECTION',
    '2', 'HEADER',
    '9', '$ACADVER',
    '1', 'AC1009',
    '0', 'ENDSEC',
    '0', 'SECTION',
    '2', 'TABLES',
    '0', 'TABLE',
    '2', 'LAYER',
    '70', String(LAYERS.length),
    ...layers,
    '0', 'ENDTAB',
    '0', 'ENDSEC',
    '0', 'SECTION',
    '2', 'ENTITIES',
    ...entities.serialize(),
    '0', 'ENDSEC',
    '0', 'EOF',
    '',
  ].join('\n');
}

/** Exporta la geometría visible de la planta con unidades de dibujo en milímetros. */
export function exportPlanDxf({
  modules,
  partitions,
  elements,
}: {
  modules: ModuleInst[];
  partitions: Partition[];
  elements: ElementInst[];
}) {
  const builder = new DxfEntities();

  modules.forEach((module) => {
    (['top', 'right', 'bottom', 'left'] as const).forEach((side) => {
      addWall(builder, wallSeg(module, side), module.walls[side], 'MODULOS');
    });
    builder.text(
      'TEXTO',
      module.x + 2,
      module.y + module.h / 2,
      Math.min(6, Math.max(3.4, module.w / 10)),
      `${module.name} ${(module.w / 10).toFixed(2)}x${(module.h / 10).toFixed(2)}m`,
    );
  });

  partitions.forEach((partition) => {
    const dx = partition.x2 - partition.x1;
    const dy = partition.y2 - partition.y1;
    const length = Math.hypot(dx, dy) || 1;
    addWall(
      builder,
      { x1: partition.x1, y1: partition.y1, x2: partition.x2, y2: partition.y2, inx: -dy / length, iny: dx / length },
      partition.state,
      'TABIQUES',
    );
  });

  elements.forEach((element) => {
    const { width, height, label } = elementSize(element);
    const x = element.x - width / 2;
    const y = element.y - height / 2;
    builder.rectangle('ELEMENTOS', x, y, width, height);
    builder.text('TEXTO', x + 0.8, element.y + 0.9, Math.min(2.8, height * 0.38), label);
  });

  return serializeDxf(builder);
}

/** Exporta el alzado generado desde la fachada inferior de cada módulo. */
export function exportElevationDxf({
  modules,
  elements,
}: {
  modules: ModuleInst[];
  elements: ElementInst[];
}) {
  const builder = new DxfEntities();

  modules.forEach((module) => {
    const height = module.heightM * 10;
    const top = ELEVATION_GROUND - height;
    const centerX = module.x + module.w / 2;
    builder.rectangle('MODULOS', module.x, top, module.w, height);
    builder.text('TEXTO', module.x, top - 3.2, 3.4, module.name);

    if (module.walls.bottom === 'door') {
      const doorWidth = Math.min(module.w * 0.32, 9);
      const doorHeight = Math.min(height * 0.8, 20);
      const x = centerX - doorWidth / 2;
      const y = ELEVATION_GROUND - doorHeight;
      builder.rectangle('ABERTURAS', x, y, doorWidth, doorHeight);
      builder.line('ABERTURAS', x + 1, ELEVATION_GROUND - 1, x + 1, y + 1);
    } else if (module.walls.bottom === 'window') {
      const windowWidth = Math.min(module.w * 0.4, 14);
      const windowHeight = Math.min(height * 0.4, 10);
      const sill = height * 0.42;
      const y = ELEVATION_GROUND - sill - windowHeight;
      const x = centerX - windowWidth / 2;
      builder.rectangle('ABERTURAS', x, y, windowWidth, windowHeight);
      builder.line('ABERTURAS', centerX, y, centerX, y + windowHeight);
      builder.line('ABERTURAS', x, y + windowHeight / 2, x + windowWidth, y + windowHeight / 2);
    }
  });

  elements
    .filter((element) => ELEMENT_TYPES.find((type) => type.id === element.typeId)?.exterior)
    .forEach((element) => {
      const type = ELEMENT_TYPES.find((candidate) => candidate.id === element.typeId)!;
      const size = 6;
      const centerY = ELEVATION_GROUND - (type.elevFrac ?? 0) * 28 - size / 2;
      builder.rectangle('ELEMENTOS', element.x - size / 2, centerY - size / 2, size, size);
      builder.text('TEXTO', element.x - size / 2, centerY + 1, 2.8, type.abbr);
    });

  builder.line('MODULOS', 0, ELEVATION_GROUND, 160, ELEVATION_GROUND);
  return serializeDxf(builder);
}
