'use client';
import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Circle } from 'react-konva';
import Konva from 'konva';
import { MODULE_TYPES, ELEMENT_TYPES, ModuleType, ElementType } from '@/lib/catalog';
import { ModuleInst, Partition, ElementInst, Mode, ViewTab } from '@/lib/types';
import {
  VB_W, VB_H, snap, clampModule, clampPoint, alignSnap, pointInModule, cycleWallState,
} from '@/lib/geometry';
import ModuleShape from './ModuleShape';
import ElementToken from './ElementToken';
import WallShape from './WallShape';
import ElevationView from './ElevationView';

let idSeq = 1;
const nextId = () => idSeq++;

const HINTS: Record<Mode, string> = {
  move: 'Toca un módulo o elemento para seleccionarlo y arrástralo. Los módulos se alinean solos al acercarlos.',
  wall: 'Toca un punto dentro de un módulo y luego otro para trazar el tabique entre ambos.',
  opening: 'Toca una pared o tabique para alternar: pared → puerta → ventana → pared.',
  delete: 'Toca un módulo, tabique o elemento para eliminarlo.',
};

export default function Configurator() {
  const [tab, setTab] = useState<ViewTab>('plan');
  const [modules, setModules] = useState<ModuleInst[]>([]);
  const [partitions, setPartitions] = useState<Partition[]>([]);
  const [elements, setElements] = useState<ElementInst[]>([]);
  const [mode, setMode] = useState<Mode>('move');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [wallPending, setWallPending] = useState<{ hostId: number; x: number; y: number } | null>(null);
  const [vb, setVb] = useState({ x: 0, y: 0, w: VB_W, h: VB_H });

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [containerWidth, setContainerWidth] = useState(360);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = containerWidth / vb.w;
  const stageHeight = containerWidth * (vb.h / vb.w);

  function addModule(type: ModuleType, x?: number, y?: number) {
    const m: ModuleInst = {
      id: nextId(),
      typeId: type.id,
      name: type.name,
      heightM: type.H,
      x: x ?? 10 + (modules.length % 3) * 54,
      y: y ?? 10 + Math.floor(modules.length / 3) * 40,
      w: type.L * 10,
      h: type.W * 10,
      walls: { top: 'wall', right: 'wall', bottom: 'wall', left: 'wall' },
    };
    setModules((ms) => [...ms, m]);
    setSelectedId(m.id);
  }

  function addElement(type: ElementType) {
    const idx = elements.length;
    const it: ElementInst = { id: nextId(), typeId: type.id, x: 10 + (idx % 9) * 16, y: 194 };
    setElements((es) => [...es, it]);
  }

  function updateModule(id: number, patch: Partial<ModuleInst>) {
    setModules((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function handleModuleDragEnd(m: ModuleInst, x: number, y: number) {
    const copy = { ...m, x, y };
    clampModule(copy);
    alignSnap(copy, modules);
    setModules((ms) => ms.map((mm) => (mm.id === m.id ? copy : mm)));
  }

  function handleElementDragEnd(it: ElementInst, x: number, y: number) {
    const c = clampPoint(x, y);
    setElements((es) => es.map((e) => (e.id === it.id ? { ...e, x: snap(c.x), y: snap(c.y) } : e)));
  }

  function toggleModuleWall(m: ModuleInst, side: 'top' | 'right' | 'bottom' | 'left') {
    updateModule(m.id, { walls: { ...m.walls, [side]: cycleWallState(m.walls[side]) } });
  }

  function togglePartition(p: Partition) {
    setPartitions((ps) => ps.map((x) => (x.id === p.id ? { ...x, state: cycleWallState(x.state) } : x)));
  }
  function deletePartition(p: Partition) {
    setPartitions((ps) => ps.filter((x) => x.id !== p.id));
  }

  function clampToHost(x: number, y: number, host: ModuleInst) {
    return {
      x: snap(Math.max(host.x, Math.min(host.x + host.w, x))),
      y: snap(Math.max(host.y, Math.min(host.y + host.h, y))),
    };
  }

  function handleWallTapWorld(worldX: number, worldY: number, hostOverride?: ModuleInst) {
    const host = hostOverride ?? modules.find((m) => pointInModule(worldX, worldY, m));
    if (!host) {
      setWallPending(null);
      return;
    }
    const snapped = clampToHost(worldX, worldY, host);
    if (!wallPending || wallPending.hostId !== host.id) {
      setWallPending({ hostId: host.id, x: snapped.x, y: snapped.y });
      return;
    }
    const len = Math.hypot(snapped.x - wallPending.x, snapped.y - wallPending.y);
    if (len >= 6) {
      setPartitions((ps) => [...ps, { id: nextId(), x1: wallPending.x, y1: wallPending.y, x2: snapped.x, y2: snapped.y, state: 'wall' }]);
    }
    setWallPending(null);
  }

  function onModuleWallTap(m: ModuleInst, localX: number, localY: number) {
    handleWallTapWorld(m.x + localX, m.y + localY, m);
  }

  function onStageClick() {
    if (mode === 'move') {
      setSelectedId(null);
      return;
    }
    if (mode !== 'wall') return;
    const stage = stageRef.current;
    const pos = stage?.getRelativePointerPosition();
    if (!pos) return;
    handleWallTapWorld(pos.x, pos.y);
  }

  function zoomBy(factor: number) {
    setVb((v) => {
      const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
      const w = Math.max(40, Math.min(320, v.w * factor));
      const h = w * (VB_H / VB_W);
      return { x: cx - w / 2, y: cy - h / 2, w, h };
    });
  }

  function zoomFit() {
    if (modules.length === 0) {
      setVb({ x: 0, y: 0, w: VB_W, h: VB_H });
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const m of modules) {
      minX = Math.min(minX, m.x); minY = Math.min(minY, m.y);
      maxX = Math.max(maxX, m.x + m.w); maxY = Math.max(maxY, m.y + m.h);
    }
    const pad = 10;
    const bw = maxX - minX + pad * 2, bh = maxY - minY + pad * 2;
    let w: number, h: number;
    if (bw / bh > VB_W / VB_H) { w = bw; h = w * (VB_H / VB_W); } else { h = bh; w = h * (VB_W / VB_H); }
    w = Math.max(40, Math.min(320, w)); h = w * (VB_H / VB_W);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    setVb({ x: cx - w / 2, y: cy - h / 2, w, h });
  }

  function resetAll() {
    if (modules.length === 0 && partitions.length === 0 && elements.length === 0) return;
    if (confirm('¿Borrar todo el plano?')) {
      setModules([]); setPartitions([]); setElements([]); setSelectedId(null); setWallPending(null);
    }
  }

  function loadExample() {
    idSeq = 1;
    const t20 = MODULE_TYPES.find((t) => t.id === 'm20')!;
    const t15 = MODULE_TYPES.find((t) => t.id === 'm15')!;
    const v1: ModuleInst = { id: nextId(), typeId: t20.id, name: t20.name, heightM: t20.H, x: 10, y: 20, w: t20.L * 10, h: t20.W * 10, walls: { top: 'wall', right: 'wall', bottom: 'door', left: 'window' } };
    const v2: ModuleInst = { id: nextId(), typeId: t20.id, name: t20.name, heightM: t20.H, x: 75, y: 20, w: t20.L * 10, h: t20.W * 10, walls: { top: 'wall', right: 'window', bottom: 'door', left: 'wall' } };
    const ofi: ModuleInst = { id: nextId(), typeId: t15.id, name: t15.name, heightM: t15.H, x: 10, y: 66, w: t15.L * 10, h: t15.W * 10, walls: { top: 'door', right: 'wall', bottom: 'wall', left: 'window' } };
    setModules([v1, v2, ofi]);
    setPartitions([{ id: nextId(), x1: 40, y1: 20, x2: 40, y2: 44.4, state: 'wall' }]);
    setElements([
      { id: nextId(), typeId: 'split', x: 16, y: 16 },
      { id: nextId(), typeId: 'agua', x: 96, y: 46 },
      { id: nextId(), typeId: 'cuadro', x: 6, y: 70 },
      { id: nextId(), typeId: 'rampa', x: 20, y: 90 },
    ]);
    setSelectedId(null);
    setWallPending(null);
  }

  const selectedModule = modules.find((m) => m.id === selectedId) ?? null;
  const totalArea = modules.reduce((a, m) => a + (m.w * m.h) / 100, 0);

  return (
    <div className="app">
      <header>
        <div>
          <h1>Configurador Opein</h1>
          <p>Catálogo modular real, planta y alzado</p>
        </div>
        <button className="reset-btn" onClick={resetAll}>Reiniciar</button>
      </header>

      <div className="tabs">
        <button className={'tab-btn' + (tab === 'plan' ? ' active' : '')} onClick={() => setTab('plan')}>Planta</button>
        <button className={'tab-btn' + (tab === 'elev' ? ' active' : '')} onClick={() => setTab('elev')}>Alzado</button>
      </div>

      {tab === 'plan' && (
        <>
          <div className="tray">
            <span className="tray-label">Módulos:</span>
            {MODULE_TYPES.map((type) => (
              <button key={type.id} className={'mod-card' + (type.store ? ' store' : '')} onClick={() => addModule(type)}>
                <span className="name">{type.store ? 'Almacén ' : 'Módulo '}{type.name}</span>
                <span className="dims">{type.L.toFixed(2).replace('.', ',')}×{type.W.toFixed(2).replace('.', ',')}×{type.H.toFixed(2).replace('.', ',')} m</span>
              </button>
            ))}
          </div>
          <div className="tray">
            <span className="tray-label">Elementos:</span>
            {ELEMENT_TYPES.map((type) => (
              <button key={type.id} className="el-btn" onClick={() => addElement(type)}>
                <span className="ic" style={{ background: type.color }}>{type.abbr}</span>
                <span className="lbl">{type.name}</span>
              </button>
            ))}
          </div>
          <div className="example-row">
            <button className="example-btn" onClick={loadExample}>Cargar ejemplo (vestuarios + oficina)</button>
          </div>

          <div className="canvas-wrap" ref={containerRef}>
            <div className="canvas-frame">
              <Stage
                ref={stageRef}
                width={containerWidth}
                height={stageHeight}
                scaleX={scale}
                scaleY={scale}
                x={-vb.x * scale}
                y={-vb.y * scale}
                onClick={(e) => { if (e.target === e.target.getStage()) onStageClick(); }}
                onTap={(e) => { if (e.target === e.target.getStage()) onStageClick(); }}
              >
                <Layer>
                  <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#FBFAF6" />
                  {Array.from({ length: Math.floor(VB_W / 10) + 1 }).map((_, i) => {
                    const x = i * 10;
                    return <Rect key={'gx' + i} x={x} y={0} width={x % 50 === 0 ? 0.5 : 0.3} height={VB_H} fill={x % 50 === 0 ? '#C9C0A6' : '#DFD9C8'} />;
                  })}
                  {Array.from({ length: Math.floor(VB_H / 10) + 1 }).map((_, i) => {
                    const y = i * 10;
                    return <Rect key={'gy' + i} x={0} y={y} width={VB_W} height={y % 50 === 0 ? 0.5 : 0.3} fill={y % 50 === 0 ? '#C9C0A6' : '#DFD9C8'} />;
                  })}

                  {modules.map((m) => (
                    <ModuleShape
                      key={m.id}
                      m={m}
                      mode={mode}
                      selected={m.id === selectedId}
                      onSelect={() => setSelectedId(m.id)}
                      onDragEnd={(x, y) => handleModuleDragEnd(m, x, y)}
                      onDelete={() => { setModules((ms) => ms.filter((mm) => mm.id !== m.id)); if (selectedId === m.id) setSelectedId(null); }}
                      onWallToggle={(side) => toggleModuleWall(m, side)}
                      onWallTap={(lx, ly) => onModuleWallTap(m, lx, ly)}
                    />
                  ))}

                  {partitions.map((p) => {
                    const dx = p.x2 - p.x1, dy = p.y2 - p.y1;
                    const len = Math.hypot(dx, dy) || 1;
                    const seg = { x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2, inx: -dy / len, iny: dx / len };
                    const onToggle = mode === 'opening' ? () => togglePartition(p) : mode === 'delete' ? () => deletePartition(p) : undefined;
                    return <WallShape key={p.id} seg={seg} state={p.state} onToggle={onToggle} />;
                  })}

                  {elements.map((it) => (
                    <ElementToken
                      key={it.id}
                      it={it}
                      mode={mode}
                      onDragEnd={(x, y) => handleElementDragEnd(it, x, y)}
                      onDelete={() => setElements((es) => es.filter((e) => e.id !== it.id))}
                    />
                  ))}

                  {wallPending && <Circle x={wallPending.x} y={wallPending.y} radius={2.2} fill="#D9622B" />}
                </Layer>
              </Stage>

              <div className="zoom-controls">
                <button onClick={() => zoomBy(0.8)}>+</button>
                <button onClick={() => zoomBy(1.25)}>−</button>
                <button onClick={zoomFit}>⤢</button>
              </div>
            </div>
          </div>

          <div className="info-bar">
            <div><span className="stat">{totalArea.toFixed(1).replace('.', ',')}</span><span className="stat-label">m² totales</span></div>
            <div className="count">{modules.length} módulo{modules.length === 1 ? '' : 's'} · {elements.length} elemento{elements.length === 1 ? '' : 's'}</div>
          </div>

          <div className="mode-bar">
            {(['move', 'wall', 'opening', 'delete'] as Mode[]).map((mm) => (
              <button
                key={mm}
                className={'mode-btn' + (mode === mm ? ' active' : '')}
                onClick={() => { setMode(mm); setWallPending(null); }}
              >
                {mm === 'move' ? 'Mover' : mm === 'wall' ? 'Tabique' : mm === 'opening' ? 'Puerta / vent.' : 'Borrar'}
              </button>
            ))}
          </div>

          <div className="hint">{HINTS[mode]}</div>

          {mode === 'move' && selectedModule && (
            <div className="dims-panel">
              <div className="dims-title">Medidas de «{selectedModule.name}»</div>
              <div className="dims-row">
                <label>Largo (m)
                  <input
                    type="number" step="0.05" min="1.2"
                    value={(selectedModule.w / 10).toFixed(2)}
                    onChange={(e) => {
                      const L = parseFloat(e.target.value);
                      if (!isNaN(L) && L > 0) updateModule(selectedModule.id, { w: L * 10, typeId: null });
                    }}
                  />
                </label>
                <label>Ancho (m)
                  <input
                    type="number" step="0.05" min="1.2"
                    value={(selectedModule.h / 10).toFixed(2)}
                    onChange={(e) => {
                      const W = parseFloat(e.target.value);
                      if (!isNaN(W) && W > 0) updateModule(selectedModule.id, { h: W * 10, typeId: null });
                    }}
                  />
                </label>
                <label>Alto (m)
                  <input
                    type="number" step="0.05" min="2.0"
                    value={selectedModule.heightM.toFixed(2)}
                    onChange={(e) => {
                      const H = parseFloat(e.target.value);
                      if (!isNaN(H) && H > 0) updateModule(selectedModule.id, { heightM: H, typeId: null });
                    }}
                  />
                </label>
              </div>
              <div className="dims-note">{selectedModule.typeId ? 'Medidas de catálogo' : 'Medidas personalizadas'}</div>
            </div>
          )}

          {mode === 'move' && selectedModule && (
            <div className="ctx-bar">
              <button onClick={() => updateModule(selectedModule.id, { w: selectedModule.h, h: selectedModule.w })}>Girar 90°</button>
              <button onClick={() => {
                const copy: ModuleInst = { ...selectedModule, id: nextId(), x: Math.min(VB_W - selectedModule.w, selectedModule.x + 8), y: Math.min(VB_H - selectedModule.h, selectedModule.y + 8) };
                setModules((ms) => [...ms, copy]); setSelectedId(copy.id);
              }}>Duplicar</button>
              <button className="danger" onClick={() => { setModules((ms) => ms.filter((mm) => mm.id !== selectedModule.id)); setSelectedId(null); }}>Eliminar</button>
            </div>
          )}
        </>
      )}

      {tab === 'elev' && (
        <>
          <div className="canvas-wrap">
            <div className="canvas-frame">
              <ElevationView modules={modules} elements={elements} />
            </div>
          </div>
          <div className="elev-caption">
            Alzado generado a partir de la fachada inferior de cada módulo en la planta. Solo se muestran en el alzado los elementos exteriores; el mobiliario interior solo aparece en planta.
          </div>
        </>
      )}

      <footer>Fase 1 · motor Konva. Boceto orientativo, no sustituye un plano técnico acotado.</footer>
    </div>
  );
}
