'use client';

import { Circle, Group } from 'react-konva';
import { ElementInst, Mode } from '@/lib/types';
import { ELEMENT_TYPES } from '@/lib/catalog';
import ElementIcon from './ElementIcon';

export default function ElementToken({
  it,
  mode,
  selected,
  onSelect,
  onDragEnd,
  onDelete,
}: {
  it: ElementInst;
  mode: Mode;
  selected: boolean;
  onSelect: (append: boolean) => void;
  onDragEnd: (x: number, y: number) => void;
  onDelete: () => void;
}) {
  const type = ELEMENT_TYPES.find((candidate) => candidate.id === it.typeId)!;
  const width = it.w ?? type.defaultW;
  const height = it.h ?? type.defaultH;
  const canDrag = mode === 'move';

  return (
    <Group
      name={type.abbr}
      x={it.x}
      y={it.y}
      scaleX={width / 12}
      scaleY={height / 12}
      draggable={canDrag}
      onDragStart={() => { if (!selected) onSelect(false); }}
      onDragEnd={(event) => onDragEnd(event.target.x(), event.target.y())}
      onClick={(event) => {
        if (mode === 'move') onSelect(Boolean(event.evt.shiftKey));
        else if (mode === 'delete') onDelete();
      }}
      onTap={() => {
        if (mode === 'move') onSelect(false);
        else if (mode === 'delete') onDelete();
      }}
    >
      {selected && <Circle radius={7} stroke="#D9622B" strokeWidth={0.8} dash={[1.5, 1]} listening={false} />}
      <ElementIcon id={type.id} color={type.color} />
    </Group>
  );
}
