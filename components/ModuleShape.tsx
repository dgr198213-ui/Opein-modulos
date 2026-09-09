'use client';
import { Group, Rect, Text } from 'react-konva';
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
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  onDelete: () => void;
  onWallToggle: (side: 'top' | 'right' | 'bottom' | 'left') => void;
  onWallTap: (localX: number, localY: number) => void;
}) {
  const local = { ...m, x: 0, y: 0 };

  function handleFillClick(e: Konva.KonvaEventObject<any>) {
    if (mode === 'move') {
      onSelect();
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
      onDragStart={onSelect}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
      onClick={handleFillClick}
      onTap={handleFillClick}
    >
      <Rect
        width={m.w}
        height={m.h}
        fill={selected ? '#F2D9C4' : '#DCE4EE'}
        opacity={0.55}
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
        y={m.h / 2 - 2.5}
        width={m.w}
        align="center"
        fontSize={5.5}
        fontFamily="'IBM Plex Mono', monospace"
        fill="#2A2620"
        listening={false}
      />
      {selected && (
        <Rect
          x={-1}
          y={-1}
          width={m.w + 2}
          height={m.h + 2}
          stroke="#D9622B"
          strokeWidth={1.6}
          dash={[3, 2]}
          listening={false}
        />
      )}
    </Group>
  );
}
