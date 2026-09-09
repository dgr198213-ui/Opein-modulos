'use client';
import { Group, Rect, Text } from 'react-konva';
import { ElementInst, Mode } from '@/lib/types';
import { ELEMENT_TYPES } from '@/lib/catalog';

export default function ElementToken({
  it,
  mode,
  onDragEnd,
  onDelete,
}: {
  it: ElementInst;
  mode: Mode;
  onDragEnd: (x: number, y: number) => void;
  onDelete: () => void;
}) {
  const type = ELEMENT_TYPES.find((t) => t.id === it.typeId)!;
  const size = 8;

  return (
    <Group
      x={it.x}
      y={it.y}
      draggable={mode === 'move'}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
      onClick={mode === 'delete' ? onDelete : undefined}
      onTap={mode === 'delete' ? onDelete : undefined}
    >
      <Rect
        x={-size / 2}
        y={-size / 2}
        width={size}
        height={size}
        cornerRadius={1.2}
        fill={type.color}
        stroke="#fff"
        strokeWidth={0.5}
      />
      <Text
        text={type.abbr}
        x={-size / 2}
        y={-1.8}
        width={size}
        align="center"
        fontSize={3.6}
        fontStyle="700"
        fontFamily="'IBM Plex Mono', monospace"
        fill="#fff"
        listening={false}
      />
    </Group>
  );
}
