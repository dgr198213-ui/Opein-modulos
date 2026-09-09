'use client';
import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Circle, Line, Text } from 'react-konva';
import Konva from 'konva';
import { MODULE_TYPES, ELEMENT_TYPES, ModuleType, ElementType } from '@/lib/catalog';
import { ModuleInst, Partition, ElementInst, Mode, ViewTab } from '@/lib/types';
import { deleteLocalProject, listLocalProjects, LocalProject, ProjectSnapshot, saveLocalProject } from '@/lib/local-projects';
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
  move: 'Selecciona y arrastra módulos o elementos. La alineación magnética mantiene el plano ordenado.',
  pan: 'Arrastra cualquier zona del plano para desplazarte. También puedes usar la rueda o pellizcar para acercar.',
  wall: 'Toca un punto dentro de un módulo y después otro para trazar un tabique.',
  opening: 'Toca una pared o tabique para alternar: pared → puerta → ventana → pared.',
  measure: 'Marca dos puntos del plano para consultar su distancia. Una nueva primera marca sustituye la cota anterior.',
  delete: 'Toca un módulo, tabique o elemento para eliminarlo.',
};

const TOOL_DEFINITIONS: { mode: Mode; icon: string; label: string; shortcut: string }[] = [
  { mode: 'move', icon: '⌖', label: 'Seleccionar', shortcut: 'V' },
  { mode: 'pan', icon: '↔', label: 'Desplazar', shortcut: 'H' },
  { mode: 'wall', icon: '╏', label: 'Tabique', shortcut: 'T' },
  { mode: 'opening', icon: '⊔', label: 'Huecos', shortcut: 'O' },
  { mode: 'measure', icon: '⟷', label: 'Cotar', shortcut: 'M' },
  { mode: 'delete', icon: '×', label: 'Borrar', shortcut: 'Supr' },
];

type EditorScene = {
  modules: ModuleInst[];
  partitions: Partition[];
  elements: ElementInst[];
};

function cloneScene(scene: EditorScene): EditorScene {
  return {
    modules: scene.modules.map((module) => ({ ...module, walls: { ...module.walls } })),
    partitions: scene.partitions.map((partition) => ({ ...partition })),
    elements: scene.elements.map((element) => ({ ...element })),
  };
}

export default function Configurator() {
  const [tab, setTab] = useState<ViewTab>('plan');
  const [modules, setModules] = useState<ModuleInst[]>([]);
  const [partitions, setPartitions] = useState<Partition[]>([]);
  const [elements, setElements] = useState<ElementInst[]>([]);
  const [mode, setMode] = useState<Mode>('move');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [wallPending, setWallPending] = useState<{ hostId: number; x: number; y: number } | null>(null);
  const [vb, setVb] = useState({ x: 0, y: 0, w: VB_W, h: VB_H });
  const [localProjects, setLocalProjects] = useState<LocalProject[]>([]);
  const [projectPanelOpen, setProjectPanelOpen] = useState(false);
  const [projectName, setProjectName] = useState('Proyecto sin título');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [storageMessage, setStorageMessage] = useState('');
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const pinchDistanceRef = useRef<number | null>(null);
  const sceneRef = useRef<EditorScene>({ modules: [], partitions: [], elements: [] });
  const undoStackRef = useRef<EditorScene[]>([]);
  const redoStackRef = useRef<EditorScene[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);
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

  useEffect(() => {
    setLocalProjects(listLocalProjects());
  }, []);

  useEffect(() => {
    sceneRef.current = { modules, partitions, elements };
  }, [modules, partitions, elements]);

  function restoreScene(scene: EditorScene, clearSelection = true) {
    const copy = cloneScene(scene);
    sceneRef.current = copy;
    setModules(copy.modules);
    setPartitions(copy.partitions);
    setElements(copy.elements);
    if (clearSelection) setSelectedId(null);
    setWallPending(null);
    setMeasureStart(null);
    setMeasureEnd(null);
    setHistoryVersion((version) => version + 1);
  }

  function commitScene(nextScene: EditorScene) {
    const next = cloneScene(nextScene);
    undoStackRef.current = [...undoStackRef.current.slice(-49), cloneScene(sceneRef.current)];
    redoStackRef.current = [];
    restoreScene(next, false);
  }

  function undo() {
    const previous = undoStackRef.current.pop();
    if (!previous) return;
    redoStackRef.current.push(cloneScene(sceneRef.current));
    restoreScene(previous);
  }

  function redo() {
    const next = redoStackRef.current.pop();
    if (!next) return;
    undoStackRef.current.push(cloneScene(sceneRef.current));
    restoreScene(next);
  }

  useEffect(() => {
    function handleKeyboardShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
      const isModifier = event.ctrlKey || event.metaKey;
      if (isModifier && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
        return;
      }
      if (isModifier && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
        return;
      }
      if (event.key === 'Escape') {
        setSelectedId(null);
        setWallPending(null);
        setMeasureStart(null);
        setMeasureEnd(null);
        setMode('move');
        return;
      }
      const tool = TOOL_DEFINITIONS.find((candidate) => candidate.shortcut.toLowerCase() === event.key.toLowerCase());
      if (tool) {
        setMode(tool.mode);
        setWallPending(null);
        setMeasureStart(null);
        setMeasureEnd(null);
      }
    }
    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => window.removeEventListener('keydown', handleKeyboardShortcut);
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
    commitScene({ ...sceneRef.current, modules: [...sceneRef.current.modules, m] });
    setSelectedId(m.id);
  }

  function addElement(type: ElementType) {
    const idx = elements.length;
    const it: ElementInst = { id: nextId(), typeId: type.id, x: 10 + (idx % 9) * 16, y: 194 };
    commitScene({ ...sceneRef.current, elements: [...sceneRef.current.elements, it] });
  }

  function updateModule(id: number, patch: Partial<ModuleInst>) {
    commitScene({
      ...sceneRef.current,
      modules: sceneRef.current.modules.map((module) => (module.id === id ? { ...module, ...patch } : module)),
    });
  }

  function handleModuleDragEnd(m: ModuleInst, x: number, y: number) {
    const copy = { ...m, x, y };
    clampModule(copy);
    alignSnap(copy, modules);
    commitScene({
      ...sceneRef.current,
      modules: sceneRef.current.modules.map((module) => (module.id === m.id ? copy : module)),
    });
  }

  function handleElementDragEnd(it: ElementInst, x: number, y: number) {
    const c = clampPoint(x, y);
    commitScene({
      ...sceneRef.current,
      elements: sceneRef.current.elements.map((element) => (element.id === it.id ? { ...element, x: snap(c.x), y: snap(c.y) } : element)),
    });
  }

  function toggleModuleWall(m: ModuleInst, side: 'top' | 'right' | 'bottom' | 'left') {
    updateModule(m.id, { walls: { ...m.walls, [side]: cycleWallState(m.walls[side]) } });
  }

  function togglePartition(p: Partition) {
    commitScene({
      ...sceneRef.current,
      partitions: sceneRef.current.partitions.map((partition) => (partition.id === p.id ? { ...partition, state: cycleWallState(partition.state) } : partition)),
    });
  }
  function deletePartition(p: Partition) {
    commitScene({
      ...sceneRef.current,
      partitions: sceneRef.current.partitions.filter((partition) => partition.id !== p.id),
    });
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
      commitScene({
        ...sceneRef.current,
        partitions: [...sceneRef.current.partitions, { id: nextId(), x1: wallPending.x, y1: wallPending.y, x2: snapped.x, y2: snapped.y, state: 'wall' }],
      });
    }
    setWallPending(null);
  }

  function onModuleWallTap(m: ModuleInst, localX: number, localY: number) {
    handleWallTapWorld(m.x + localX, m.y + localY, m);
  }

  function handleMeasureTap(worldX: number, worldY: number) {
    const point = { x: snap(worldX), y: snap(worldY) };
    if (!measureStart || measureEnd) {
      setMeasureStart(point);
      setMeasureEnd(null);
      return;
    }
    setMeasureEnd(point);
  }

  function onStageClick() {
    const stage = stageRef.current;
    const pos = stage?.getRelativePointerPosition();
    if (mode === 'move') {
      setSelectedId(null);
      return;
    }
    if (mode === 'measure' && pos) {
      handleMeasureTap(pos.x, pos.y);
      return;
    }
    if (mode === 'wall' && pos) handleWallTapWorld(pos.x, pos.y);
  }

  function zoomAt(point: { x: number; y: number }, factor: number) {
    setVb((v) => {
      const previousScale = containerWidth / v.w;
      const w = Math.max(40, Math.min(320, v.w * factor));
      const h = w * (VB_H / VB_W);
      const nextScale = containerWidth / w;
      const worldX = v.x + point.x / previousScale;
      const worldY = v.y + point.y / previousScale;
      return { x: worldX - point.x / nextScale, y: worldY - point.y / nextScale, w, h };
    });
  }

  function zoomBy(factor: number) {
    zoomAt({ x: containerWidth / 2, y: stageHeight / 2 }, factor);
  }

  function handleStageWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    event.evt.preventDefault();
    const point = stageRef.current?.getPointerPosition();
    if (point) zoomAt(point, event.evt.deltaY > 0 ? 1.16 : 0.86);
  }

  function handleStageTouchStart() {
    const pointers = stageRef.current?.getPointersPositions() ?? [];
    if (pointers.length !== 2) return;
    pinchDistanceRef.current = Math.hypot(pointers[1].x - pointers[0].x, pointers[1].y - pointers[0].y);
  }

  function handleStageTouchMove(event: Konva.KonvaEventObject<TouchEvent>) {
    const pointers = stageRef.current?.getPointersPositions() ?? [];
    if (pointers.length !== 2) return;
    event.evt.preventDefault();
    const distance = Math.hypot(pointers[1].x - pointers[0].x, pointers[1].y - pointers[0].y);
    const midpoint = { x: (pointers[0].x + pointers[1].x) / 2, y: (pointers[0].y + pointers[1].y) / 2 };
    if (pinchDistanceRef.current && distance > 0) zoomAt(midpoint, pinchDistanceRef.current / distance);
    pinchDistanceRef.current = distance;
  }

  function handleStageTouchEnd() {
    pinchDistanceRef.current = null;
  }

  function handleStagePanEnd(event: Konva.KonvaEventObject<DragEvent>) {
    const stage = event.target.getStage();
    if (!stage || event.target !== stage) return;
    setVb((viewBox) => ({ ...viewBox, x: -stage.x() / scale, y: -stage.y() / scale }));
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

  function currentSnapshot(): ProjectSnapshot {
    return { modules, partitions, elements, tab };
  }

  function openProjectLibrary() {
    setLocalProjects(listLocalProjects());
    setStorageMessage('');
    setProjectPanelOpen(true);
  }

  function saveProject(createNew = false) {
    try {
      const saved = saveLocalProject(projectName, currentSnapshot(), createNew ? undefined : activeProjectId ?? undefined);
      setActiveProjectId(saved.id);
      setProjectName(saved.name);
      setLocalProjects(listLocalProjects());
      setStorageMessage(createNew || !activeProjectId ? 'Proyecto guardado en este navegador.' : 'Proyecto actualizado en este navegador.');
    } catch {
      setStorageMessage('No se ha podido guardar el proyecto. Comprueba que el navegador permite almacenamiento local.');
    }
  }

  function loadProject(project: LocalProject) {
    const { snapshot } = project;
    commitScene({ modules: snapshot.modules, partitions: snapshot.partitions, elements: snapshot.elements });
    setTab(snapshot.tab);
    setSelectedId(null);
    setWallPending(null);
    const highestId = Math.max(0, ...snapshot.modules.map((item) => item.id), ...snapshot.partitions.map((item) => item.id), ...snapshot.elements.map((item) => item.id));
    idSeq = highestId + 1;
    setActiveProjectId(project.id);
    setProjectName(project.name);
    setProjectPanelOpen(false);
    setStorageMessage('');
  }

  function removeProject(project: LocalProject) {
    if (!confirm(`¿Eliminar el proyecto “${project.name}” de este navegador?`)) return;
    try {
      deleteLocalProject(project.id);
      setLocalProjects(listLocalProjects());
      if (activeProjectId === project.id) {
        setActiveProjectId(null);
        setProjectName('Proyecto sin título');
      }
      setStorageMessage('Proyecto eliminado.');
    } catch {
      setStorageMessage('No se ha podido eliminar el proyecto.');
    }
  }

  function resetAll() {
    if (modules.length === 0 && partitions.length === 0 && elements.length === 0) return;
    if (confirm('¿Borrar todo el plano?')) {
      commitScene({ modules: [], partitions: [], elements: [] });
      setSelectedId(null); setWallPending(null);
      setMeasureStart(null); setMeasureEnd(null);
      setActiveProjectId(null); setProjectName('Proyecto sin título');
    }
  }

  function loadExample() {
    idSeq = 1;
    const t20 = MODULE_TYPES.find((t) => t.id === 'm20')!;
    const t15 = MODULE_TYPES.find((t) => t.id === 'm15')!;
    const v1: ModuleInst = { id: nextId(), typeId: t20.id, name: t20.name, heightM: t20.H, x: 10, y: 20, w: t20.L * 10, h: t20.W * 10, walls: { top: 'wall', right: 'wall', bottom: 'door', left: 'window' } };
    const v2: ModuleInst = { id: nextId(), typeId: t20.id, name: t20.name, heightM: t20.H, x: 75, y: 20, w: t20.L * 10, h: t20.W * 10, walls: { top: 'wall', right: 'window', bottom: 'door', left: 'wall' } };
    const ofi: ModuleInst = { id: nextId(), typeId: t15.id, name: t15.name, heightM: t15.H, x: 10, y: 66, w: t15.L * 10, h: t15.W * 10, walls: { top: 'door', right: 'wall', bottom: 'wall', left: 'window' } };
    commitScene({
      modules: [v1, v2, ofi],
      partitions: [{ id: nextId(), x1: 40, y1: 20, x2: 40, y2: 44.4, state: 'wall' }],
      elements: [
        { id: nextId(), typeId: 'split', x: 16, y: 16 },
        { id: nextId(), typeId: 'agua', x: 96, y: 46 },
        { id: nextId(), typeId: 'cuadro', x: 6, y: 70 },
        { id: nextId(), typeId: 'rampa', x: 20, y: 90 },
      ],
    });
    setSelectedId(null);
    setWallPending(null);
    setMeasureStart(null);
    setMeasureEnd(null);
    setActiveProjectId(null);
    setProjectName('Proyecto sin título');
  }

  const selectedModule = modules.find((m) => m.id === selectedId) ?? null;
  const canUndo = undoStackRef.current.length > 0;
  const canRedo = redoStackRef.current.length > 0;
  const totalArea = modules.reduce((a, m) => a + (m.w * m.h) / 100, 0);

  return (
    <div className="app">
      <header>
        <div>
          <h1>Configurador Opein</h1>
          <p>Catálogo modular real, planta y alzado</p>
        </div>
        <div className="header-actions">
          <div className="history-actions" aria-label="Historial" data-history-version={historyVersion}>
            <button className="history-btn" type="button" title="Deshacer (Ctrl/Cmd+Z)" aria-label="Deshacer" disabled={!canUndo} onClick={undo}>↶</button>
            <button className="history-btn" type="button" title="Rehacer (Ctrl/Cmd+Y)" aria-label="Rehacer" disabled={!canRedo} onClick={redo}>↷</button>
          </div>
          <button className="project-btn" onClick={openProjectLibrary}>Proyectos ({localProjects.length})</button>
          <button className="save-btn" onClick={openProjectLibrary}>Guardar</button>
          <button className="reset-btn" onClick={resetAll}>Reiniciar</button>
        </div>
      </header>

      {projectPanelOpen && (
        <div className="project-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setProjectPanelOpen(false); }}>
          <section className="project-panel" role="dialog" aria-modal="true" aria-labelledby="project-panel-title">
            <div className="project-panel-heading">
              <div>
                <p className="project-overline">BIBLIOTECA LOCAL</p>
                <h2 id="project-panel-title">Proyectos</h2>
              </div>
              <button className="panel-close" type="button" aria-label="Cerrar proyectos" onClick={() => setProjectPanelOpen(false)}>×</button>
            </div>
            <p className="project-help">Los proyectos se guardan solo en este navegador y dispositivo.</p>
            <label className="project-name-label" htmlFor="project-name">Nombre del proyecto</label>
            <input id="project-name" className="project-name-input" value={projectName} maxLength={80} onChange={(event) => setProjectName(event.target.value)} />
            <div className="project-save-actions">
              <button className="save-project-btn" type="button" onClick={() => saveProject(false)}>{activeProjectId ? 'Actualizar proyecto' : 'Guardar proyecto'}</button>
              {activeProjectId && <button className="secondary-project-btn" type="button" onClick={() => saveProject(true)}>Guardar como nuevo</button>}
            </div>
            {storageMessage && <p className="project-message" role="status">{storageMessage}</p>}
            <div className="project-list-heading">
              <h3>Guardados en este navegador</h3>
              <span>{localProjects.length}</span>
            </div>
            {localProjects.length === 0 ? (
              <p className="empty-projects">Aún no hay proyectos guardados.</p>
            ) : (
              <ul className="project-list">
                {localProjects.map((project) => (
                  <li key={project.id} className={'project-item' + (project.id === activeProjectId ? ' active' : '')}>
                    <div className="project-item-copy">
                      <strong>{project.name}</strong>
                      <span>Actualizado {new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(project.updatedAt))}</span>
                    </div>
                    <div className="project-item-actions">
                      <button type="button" onClick={() => loadProject(project)}>Cargar</button>
                      <button className="delete-project-btn" type="button" onClick={() => removeProject(project)}>Eliminar</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

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
            <div className={'canvas-frame mode-' + mode}>
              <Stage
                ref={stageRef}
                width={containerWidth}
                height={stageHeight}
                scaleX={scale}
                scaleY={scale}
                x={-vb.x * scale}
                y={-vb.y * scale}
                draggable={mode === 'pan'}
                onDragStart={(event) => { if (event.target === event.target.getStage()) { setSelectedId(null); setWallPending(null); } }}
                onDragEnd={handleStagePanEnd}
                onWheel={handleStageWheel}
                onTouchStart={handleStageTouchStart}
                onTouchMove={handleStageTouchMove}
                onTouchEnd={handleStageTouchEnd}
                onClick={(event) => { if (mode === 'measure' || event.target === event.target.getStage()) onStageClick(); }}
                onTap={(event) => { if (mode === 'measure' || event.target === event.target.getStage()) onStageClick(); }}
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
                      onDelete={() => { commitScene({ ...sceneRef.current, modules: sceneRef.current.modules.filter((module) => module.id !== m.id) }); if (selectedId === m.id) setSelectedId(null); }}
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
                      onDelete={() => commitScene({ ...sceneRef.current, elements: sceneRef.current.elements.filter((element) => element.id !== it.id) })}
                    />
                  ))}

                  {wallPending && <Circle x={wallPending.x} y={wallPending.y} radius={2.2} fill="#D9622B" />}
                  {measureStart && (
                    <>
                      <Circle x={measureStart.x} y={measureStart.y} radius={1.8} fill="#D9622B" listening={false} />
                      {measureEnd && (
                        <>
                          <Line points={[measureStart.x, measureStart.y, measureEnd.x, measureEnd.y]} stroke="#D9622B" strokeWidth={0.9} dash={[2, 1]} listening={false} />
                          <Circle x={measureEnd.x} y={measureEnd.y} radius={1.8} fill="#D9622B" listening={false} />
                          <Text
                            text={`${(Math.hypot(measureEnd.x - measureStart.x, measureEnd.y - measureStart.y) / 10).toFixed(2).replace('.', ',')} m`}
                            x={(measureStart.x + measureEnd.x) / 2 - 11}
                            y={(measureStart.y + measureEnd.y) / 2 - 5}
                            width={22}
                            align="center"
                            fontSize={4}
                            fontStyle="bold"
                            fill="#8F3C1A"
                            fillAfterStrokeEnabled={true}
                            stroke="#FBFAF6"
                            strokeWidth={1.2}
                            listening={false}
                          />
                        </>
                      )}
                    </>
                  )}
                </Layer>
              </Stage>

              <div className="workspace-status" aria-live="polite">
                <span>{mode === 'pan' ? 'MANO ACTIVA' : mode === 'measure' ? 'COTA ACTIVA' : 'REJILLA 1 m'}</span>
                <span>{Math.round(scale * 100)}%</span>
              </div>
              <div className="zoom-controls" aria-label="Controles de vista">
                <button type="button" title="Acercar" aria-label="Acercar" onClick={() => zoomBy(0.8)}>+</button>
                <button type="button" title="Alejar" aria-label="Alejar" onClick={() => zoomBy(1.25)}>−</button>
                <button type="button" title="Encuadrar el plano" aria-label="Encuadrar el plano" onClick={zoomFit}>⤢</button>
              </div>
            </div>
          </div>

          <div className="info-bar">
            <div><span className="stat">{totalArea.toFixed(1).replace('.', ',')}</span><span className="stat-label">m² totales</span></div>
            <div className="count">{modules.length} módulo{modules.length === 1 ? '' : 's'} · {elements.length} elemento{elements.length === 1 ? '' : 's'}</div>
          </div>

          <section className="design-toolbar" aria-label="Herramientas de diseño">
            <div className="toolbar-heading">
              <span>Herramientas de plano</span>
              <span>Esc: cancelar</span>
            </div>
            <div className="mode-bar">
              {TOOL_DEFINITIONS.map((tool) => (
                <button
                  key={tool.mode}
                  type="button"
                  className={'mode-btn' + (mode === tool.mode ? ' active' : '')}
                  aria-pressed={mode === tool.mode}
                  title={`${tool.label} (${tool.shortcut})`}
                  onClick={() => { setMode(tool.mode); setWallPending(null); setMeasureStart(null); setMeasureEnd(null); }}
                >
                  <span className="mode-icon">{tool.icon}</span>
                  <span>{tool.label}</span>
                </button>
              ))}
            </div>
          </section>

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
                commitScene({ ...sceneRef.current, modules: [...sceneRef.current.modules, copy] }); setSelectedId(copy.id);
              }}>Duplicar</button>
              <button className="danger" onClick={() => { commitScene({ ...sceneRef.current, modules: sceneRef.current.modules.filter((module) => module.id !== selectedModule.id) }); setSelectedId(null); }}>Eliminar</button>
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
