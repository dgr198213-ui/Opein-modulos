'use client';
import { Circle, Group, Line, Rect, Text } from 'react-konva';
import { ElementInst, Mode } from '@/lib/types';
import { ELEMENT_TYPES } from '@/lib/catalog';

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
  const common = { stroke: type.color, strokeWidth: 0.65, listening: false };
  const canDrag = mode === 'move';

  function symbol() {
    switch (type.id) {
      case 'mesa':
        return <>
          <Rect x={-5.5} y={-3.2} width={11} height={6.4} cornerRadius={0.7} fill="#E8D4AD" {...common} />
          <Line points={[-3.8, -3.2, -3.8, 3.2, 3.8, 3.2, 3.8, -3.2]} {...common} opacity={0.6} />
          <Circle x={-4.2} y={-2.3} radius={0.5} fill={type.color} listening={false} />
          <Circle x={4.2} y={2.3} radius={0.5} fill={type.color} listening={false} />
        </>;
      case 'taquillas':
        return <>
          <Rect x={-4.3} y={-4.6} width={8.6} height={9.2} fill="#E8D4AD" {...common} />
          <Line points={[-1.45, -4.6, -1.45, 4.6, 1.45, 4.6, 1.45, -4.6]} {...common} />
          {[-2.9, 0, 2.9].map((x) => <Circle key={x} x={x + 0.75} y={0} radius={0.3} fill={type.color} listening={false} />)}
        </>;
      case 'banco':
        return <>
          <Rect x={-6} y={-1.55} width={12} height={3.1} cornerRadius={0.45} fill="#E8D4AD" {...common} />
          <Line points={[-4.7, 1.55, -4.7, 3.1, 4.7, 3.1, 4.7, 1.55]} {...common} />
        </>;
      case 'split':
        return <>
          <Rect x={-5} y={-2.7} width={10} height={5.4} cornerRadius={0.8} fill="#DCE4EE" {...common} />
          <Line points={[-3.7, 0.6, 3.7, 0.6]} {...common} />
          <Circle x={3.5} y={-1.1} radius={0.55} fill={type.color} listening={false} />
        </>;
      case 'escalera':
        return <>
          <Rect x={-4} y={-5.5} width={8} height={11} fill="#EFEDE7" {...common} />
          {[-3.2, -1.6, 0, 1.6, 3.2].map((y) => <Line key={y} points={[-4, y, 4, y]} {...common} />)}
          <Line points={[0, -4.4, 0, 4.2, -1.1, 3.1, 0, 4.2, 1.1, 3.1]} {...common} />
        </>;
      case 'rampa':
        return <>
          <Line points={[-5, 4.2, 5, 4.2, 5, -4.2, -5, 4.2]} closed fill="#EFEDE7" {...common} />
          <Line points={[-3.2, 2.8, 2.6, -2.7]} {...common} />
          <Line points={[0.8, -2.7, 2.6, -2.7, 2.6, -0.9]} {...common} />
        </>;
      case 'agua':
        return <>
          <Circle radius={4.6} fill="#D4EAEC" {...common} />
          <Circle radius={2.6} {...common} opacity={0.55} />
          <Text text="H₂O" x={-3.2} y={-1.55} width={6.4} align="center" fontSize={2.7} fontStyle="bold" fill={type.color} listening={false} />
        </>;
      case 'residual':
        return <>
          <Circle radius={4.6} fill="#E5DFD2" {...common} />
          <Circle radius={2.4} {...common} opacity={0.55} />
          <Text text="RES" x={-3.4} y={-1.45} width={6.8} align="center" fontSize={2.3} fontStyle="bold" fill={type.color} listening={false} />
        </>;
      case 'cuadro':
        return <>
          <Rect x={-3.3} y={-4.4} width={6.6} height={8.8} cornerRadius={0.5} fill="#FBE1D2" {...common} />
          <Line points={[0, -2.9, 0, 1.5, -1.35, 2.8, 1.35, 2.8]} {...common} />
        </>;
      case 'reja':
        return <>
          <Rect x={-5.2} y={-3.5} width={10.4} height={7} fill="#E8E5DF" {...common} />
          {[-2.6, 0, 2.6].map((x) => <Line key={x} points={[x, -3.5, x, 3.5]} {...common} />)}
          <Line points={[-5.2, 0, 5.2, 0]} {...common} />
        </>;
      case 'persiana':
        return <>
          <Rect x={-5.2} y={-3.5} width={10.4} height={7} fill="#E8E5DF" {...common} />
          {[-2.1, -0.7, 0.7, 2.1].map((y) => <Line key={y} points={[-5.2, y, 5.2, y]} {...common} />)}
        </>;
      default:
        return <Rect x={-4} y={-4} width={8} height={8} cornerRadius={1.2} fill={type.color} {...common} />;
    }
  }

  return (
    <Group
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
      {symbol()}
    </Group>
  );
}
