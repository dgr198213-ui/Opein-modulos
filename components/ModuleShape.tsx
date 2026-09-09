'use client';
import { Group, Line, Rect, Text } from 'react-konva';
import Konva from 'konva';
import WallShape from './WallShape';
import { ModuleInst, Mode, WallState } from '@/lib/types';
import { wallSeg, cycleWallState } from '@/lib/geometry';

export default function ModuleShape({
  m,
  mode,
  selected,
  onSelect,
  onDragEnd,
  onDelete,
  onWallToggle,
  onWallTap,
}: {
  m: ModuleInst;
  mode: Mode;
  selected: boolean;
  onSelect: (append: boolean) => void;
  onDragEnd: (x: number, y: number) => void;
  onDelete: () => void;
  onWallToggle: (side: 'top' | 'right' | 'bottom' | 'left') => void;
  onWallTap: (localX: number, localY: number) => void;
}) {
  const local = { ...m, x: 0, y: 0 };
  const isStore = m.typeId?.startsWith('c') ?? false;
  const ribPositions = Array.from({ length: Math.max(0, Math.floor(m.w / 12) - 1) }, (_, index) => (index + 1) * 12);

  function handleFillClick(e: Konva.KonvaEventObject<any>) {
    if (mode === 'move') {
      onSelect(Boolean(e.evt.shiftKey));
    } else if (mode === 'delete') {
      e.cancelBubble = true;
      onDelete();
    } else if (mode === 'wall') {
      e.cancelBubble = true;
      const group = e.target.getStage()?.findOne('#mod-' + m.id) as Konva.Group | null;
      const pos = group?.getRelativePointerPosition();
      if (pos) onWallTap(pos.x, pos.y);
    }
  }

  return (
    <Group
      id={'mod-' + m.id}
      x={m.x}
      y={m.y}
      draggable={mode === 'move'}
      onDragStart={() => { if (!selected) onSelect(false); }}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
      onClick={handleFillClick}
      onTap={handleFillClick}
    >
      <Rect
        width={m.w}
        height={m.h}
        fill={selected ? '#F2D9C4' : isStore ? '#E9E5DA' : '#DCE4EE'}
        opacity={0.84}
        cornerRadius={0.7}
        listening={false}
      />
      <Rect
        x={1.5}
        y={1.5}
        width={Math.max(0, m.w - 3)}
        height={Math.max(0, m.h - 3)}
        stroke={isStore ? '#6B6558' : '#7190B0'}
        strokeWidth={0.32}
        dash={isStore ? [1.1, 0.9] : undefined}
        listening={false}
      />
      {ribPositions.map((x) => (
        <Line key={x} points={[x, 1.8, x, Math.max(1.8, m.h - 1.8)]} stroke={isStore ? '#928A78' : '#AFC1D3'} strokeWidth={0.28} opacity={0.65} listening={false} />
      ))}
      <Text
        text={isStore ? 'ALMACÉN' : 'MÓDULO'}
        x={2.1}
        y={2.1}
        fontSize={2.1}
        fontStyle="bold"
        fontFamily="'IBM Plex Mono', monospace"
        fill={isStore ? '#665E50' : '#496987'}
        listening={false}
      />
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <WallShape
          key={side}
          seg={wallSeg(local, side)}
          state={m.walls[side]}
          onToggle={mode === 'opening' ? () => onWallToggle(side) : undefined}
        />
      ))}
      <Text
        text={`${m.name} · ${(m.w / 10).toFixed(2).replace('.', ',')}×${(m.h / 10).toFixed(2).replace('.', ',')}m`}
        x={0}
        y={m.h / 2 - 1.5}
        width={m.w}
        align="center"
        fontSize={Math.min(5.5, Math.max(3.4, m.w / 10))}
        fontFamily="'IBM Plex Mono', monospace"
        fill="#29323A"
        listening={false}
      />
      {selected && (
        <Rect
          x={-1}
          y={-1}
          width={m.w + 2}
          height={m.h + 2}
          stroke="#D9622B"
          strokeWidth={1.25}
          dash={[2.2, 1.4]}
          listening={false}
        />
      )}
    </Group>
  );
}
