'use client';

import { Ellipse, Group, Line, Path, Rect } from 'react-konva';
import { ELEMENT_TYPES } from '@/lib/catalog';

type ElementIconProps = {
  id: string;
  color?: string;
};

export default function ElementIcon({ id, color }: ElementIconProps) {
  const typeColor = color ?? ELEMENT_TYPES.find((type) => type.id === id)?.color ?? '#59503F';
  const common = {
    stroke: typeColor,
    strokeWidth: 0.8,
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
    listening: false,
  };
  const neutralFill = '#F7F3E9';
  const woodFill = '#E8D4AD';

  switch (id) {
    case 'mesa':
      return (
        <Group>
          <Rect x={-5.2} y={-3.2} width={10.4} height={5.4} cornerRadius={0.5} fill={woodFill} {...common} />
          {[-4, 4].flatMap((x) => [
            <Line key={`${x}-top`} points={[x, -3.2, x, -4.6]} {...common} />,
            <Line key={`${x}-bottom`} points={[x, 2.2, x, 3.7]} {...common} />,
          ])}
        </Group>
      );
    case 'taquillas':
      return (
        <Group>
          <Rect x={-4.6} y={-5} width={9.2} height={10} fill={woodFill} {...common} />
          {[-1.55, 1.55].map((x) => <Line key={x} points={[x, -5, x, 5]} {...common} />)}
        </Group>
      );
    case 'banco':
      return (
        <Group>
          <Line points={[-5.4, -1.35, 5.4, -1.35]} stroke={typeColor} strokeWidth={2.3} lineCap="round" listening={false} />
          <Line points={[-3.7, 0, -3.7, 3.4]} {...common} />
          <Line points={[3.7, 0, 3.7, 3.4]} {...common} />
        </Group>
      );
    case 'split':
      return (
        <Group>
          <Rect x={-5.5} y={-2.8} width={11} height={5.6} cornerRadius={0.65} fill="#E2EBF0" {...common} />
          {[-2.8, 0, 2.8].map((x) => <Line key={x} points={[x - 1.05, 1.1, x + 1.05, 1.9]} {...common} />)}
        </Group>
      );
    case 'escalera':
      return (
        <Group>
          <Line points={[-4.8, 4.5, -2.8, 4.5, -2.8, 2.25, -0.8, 2.25, -0.8, 0, 1.2, 0, 1.2, -2.25, 3.2, -2.25, 3.2, -4.5]} {...common} />
        </Group>
      );
    case 'rampa':
      return (
        <Group>
          <Line points={[-5, 4.1, 4.8, -3.9]} {...common} />
          <Line points={[-5, 4.1, 4.8, 4.1, 4.8, -3.9]} closed fill={neutralFill} {...common} />
        </Group>
      );
    case 'agua':
    case 'residual': {
      const fill = id === 'residual' ? typeColor : '#D4EAEC';
      return (
        <Group>
          <Rect x={-4.15} y={-3.8} width={8.3} height={7.6} fill={fill} {...common} />
          <Ellipse x={0} y={-3.8} radiusX={4.15} radiusY={1.45} fill={fill} {...common} />
          <Ellipse x={0} y={3.8} radiusX={4.15} radiusY={1.45} fill={fill} {...common} />
        </Group>
      );
    }
    case 'cuadro':
      return <Path data="M 0 -5 L -2.25 -0.6 L 0.25 -0.6 L -1.5 5 L 3.2 -1.55 L 0.85 -1.55 Z" fill={typeColor} stroke={typeColor} strokeWidth={0.55} lineJoin="round" listening={false} />;
    case 'reja':
      return (
        <Group>
          <Rect x={-5} y={-3.8} width={10} height={7.6} fill={neutralFill} {...common} />
          {[-2.5, 0, 2.5].map((x) => <Line key={x} points={[x, -3.8, x, 3.8]} {...common} />)}
          <Line points={[-5, 0, 5, 0]} {...common} />
        </Group>
      );
    case 'persiana':
      return (
        <Group>
          <Rect x={-5} y={-3.8} width={10} height={7.6} fill={neutralFill} {...common} />
          {[-2.45, -1.2, 0.05, 1.3, 2.55].map((y) => <Line key={y} points={[-5, y, 5, y]} {...common} />)}
        </Group>
      );
    default:
      return <Rect x={-4} y={-4} width={8} height={8} cornerRadius={1} fill={neutralFill} {...common} />;
  }
}
