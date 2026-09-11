'use client';

import { ELEMENT_TYPES, MODULE_TYPES } from '@/lib/catalog';
import { ElementInst, ModuleInst, Partition } from '@/lib/types';

type BreakdownProps = {
  modules: ModuleInst[];
  elements: ElementInst[];
  partitions: Partition[];
};

type ModuleRow = {
  key: string;
  name: string;
  count: number;
  length: number;
  width: number;
  height: number;
  area: number;
};

type ElementRow = {
  key: string;
  name: string;
  count: number;
};

function formatNumber(value: number, decimals = 2) {
  return value.toFixed(decimals).replace('.', ',');
}

function moduleDimensions(module: ModuleInst) {
  return {
    length: module.w / 10,
    width: module.h / 10,
    height: module.heightM,
  };
}

export default function BreakdownView({ modules, elements, partitions }: BreakdownProps) {
  const moduleRows = Array.from(modules.reduce((groups, module) => {
    const key = module.typeId ?? `custom:${module.name}`;
    const dimensions = moduleDimensions(module);
    const previous = groups.get(key);
    if (previous) {
      previous.count += 1;
      previous.area += (module.w * module.h) / 100;
    } else {
      groups.set(key, {
        key,
        name: module.typeId ? MODULE_TYPES.find((type) => type.id === module.typeId)?.name ?? module.name : module.name,
        count: 1,
        length: dimensions.length,
        width: dimensions.width,
        height: dimensions.height,
        area: (module.w * module.h) / 100,
      });
    }
    return groups;
  }, new Map<string, ModuleRow>()).values());

  const elementRows = Array.from(elements.reduce((groups, element) => {
    const type = ELEMENT_TYPES.find((candidate) => candidate.id === element.typeId);
    const previous = groups.get(element.typeId);
    if (previous) {
      previous.count += 1;
    } else {
      groups.set(element.typeId, { key: element.typeId, name: type?.name ?? element.typeId, count: 1 });
    }
    return groups;
  }, new Map<string, ElementRow>()).values());

  const totalArea = modules.reduce((total, module) => total + (module.w * module.h) / 100, 0);
  const doors = modules.reduce((total, module) => total + Object.values(module.walls).filter((state) => state === 'door').length, 0);
  const windows = modules.reduce((total, module) => total + Object.values(module.walls).filter((state) => state === 'window').length, 0);
  const moduleWallSegments = modules.length * 4;
  const partitionCount = partitions.length;
  const totalPartitions = moduleWallSegments + partitionCount;

  return (
    <section className="breakdown-view" aria-labelledby="breakdown-title">
      <div className="breakdown-heading">
        <div>
          <p className="breakdown-overline">RESUMEN DE MATERIAL</p>
          <h2 id="breakdown-title">Despiece del proyecto</h2>
          <p>Lectura automática de la distribución actual. Esta vista es informativa y no añade datos al proyecto.</p>
        </div>
        <div className="breakdown-total">
          <span>Superficie total</span>
          <strong>{formatNumber(totalArea, 1)} m²</strong>
        </div>
      </div>

      <div className="breakdown-kpis" aria-label="Resumen de aberturas y tabiques">
        <div><span>Puertas</span><strong>{doors}</strong></div>
        <div><span>Ventanas</span><strong>{windows}</strong></div>
        <div><span>Tabiques</span><strong>{totalPartitions}</strong><small>{moduleWallSegments} paredes de módulo + {partitionCount} particiones</small></div>
      </div>

      <div className="breakdown-grid">
        <article className="breakdown-card">
          <div className="breakdown-card-heading"><h3>Módulos</h3><span>{modules.length} uds.</span></div>
          {moduleRows.length === 0 ? <p className="breakdown-empty">No hay módulos en la planta.</p> : (
            <div className="breakdown-table-wrap">
              <table className="breakdown-table">
                <thead><tr><th>Tipo</th><th>Ud.</th><th>Medidas</th><th>m² subtotal</th></tr></thead>
                <tbody>
                  {moduleRows.map((row) => (
                    <tr key={row.key}>
                      <th scope="row">{row.name}</th>
                      <td>{row.count}</td>
                      <td>{formatNumber(row.length)} × {formatNumber(row.width)} × {formatNumber(row.height)} m</td>
                      <td>{formatNumber(row.area, 1)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><th colSpan={3}>Total módulos</th><td>{formatNumber(totalArea, 1)} m²</td></tr></tfoot>
              </table>
            </div>
          )}
        </article>

        <article className="breakdown-card">
          <div className="breakdown-card-heading"><h3>Elementos</h3><span>{elements.length} uds.</span></div>
          {elementRows.length === 0 ? <p className="breakdown-empty">No hay elementos añadidos.</p> : (
            <div className="breakdown-table-wrap">
              <table className="breakdown-table compact">
                <thead><tr><th>Elemento</th><th>Cantidad</th></tr></thead>
                <tbody>{elementRows.map((row) => <tr key={row.key}><th scope="row">{row.name}</th><td>{row.count}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </article>
      </div>

      <p className="breakdown-footnote">Las puertas y ventanas proceden de los estados de las cuatro paredes de cada módulo. Los tabiques incluyen esas paredes de módulo y las particiones dibujadas en planta.</p>
    </section>
  );
}
