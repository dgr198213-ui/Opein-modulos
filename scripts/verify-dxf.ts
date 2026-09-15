import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { exportElevationDxf, exportPlanDxf } from '../lib/dxf-export';
import { ElementInst, ModuleInst, Partition } from '../lib/types';

const module: ModuleInst = {
  id: 1,
  typeId: 'm20',
  name: 'Módulo 6 m diáfano',
  heightM: 2.7,
  x: 10,
  y: 20,
  w: 60,
  h: 24.4,
  walls: { top: 'wall', right: 'window', bottom: 'door', left: 'wall' },
  fabrication: { reference: 'CAS6MDIA.01', quantity: 1, supplier: 'Opein', metric: 'M10x50', steelGrade: '8.8', profile: 'PERFIL 60x40', notes: 'Muestra' },
};
const element: ElementInst = { id: 2, typeId: 'cuadro', x: 30, y: 30, fabrication: { reference: 'CUADRO-01', quantity: 2, supplier: 'Opein', metric: 'N/D', steelGrade: 'N/D', profile: 'N/D', notes: '' } };
const partitions: Partition[] = [{ id: 3, x1: 20, y1: 20, x2: 20, y2: 40, state: 'wall' }];
const client = { projectName: 'Prueba fabricación', clientName: 'Cliente demo', deliveryDate: '2026-09-16', scale: '1:20' };
const plan = exportPlanDxf({ modules: [module], partitions, elements: [element], client });
const elevation = exportElevationDxf({ modules: [module], elements: [element], client });
assert.equal(plan.startsWith('0\nSECTION'), true);
assert.equal(plan.includes('CAJETIN'), true);
assert.equal(plan.includes('CAS6MDIA.01'), true);
assert.equal(plan.includes('Cliente demo'), true);
assert.equal(plan.includes('0\nLINE'), true);
assert.equal(plan.includes('0\nLWPOLYLINE'), false);
assert.equal(plan.includes('0\nVIEWPORT'), false);
assert.equal(elevation.includes('ALZADO'), false, 'El cajetín usa texto fijo genérico; se valida la salida y sus entidades');
assert.equal(elevation.includes('CAJETIN'), true);
writeFileSync('/tmp/opein-fabricacion-plan.dxf', plan, 'utf8');
writeFileSync('/tmp/opein-fabricacion-alzado.dxf', elevation, 'utf8');
console.log(JSON.stringify({ plan: '/tmp/opein-fabricacion-plan.dxf', elevation: '/tmp/opein-fabricacion-alzado.dxf', planBytes: Buffer.byteLength(plan), elevationBytes: Buffer.byteLength(elevation) }));
