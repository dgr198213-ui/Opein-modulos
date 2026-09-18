'use client';
import Konva from 'konva';
import { Group, Line } from 'react-konva';
import { WallSeg } from '@/lib/geometry';
import { WallState } from '@/lib/types';

const STEEL = '#38547A';
const SAFETY = '#D9622B';
const GLASS = '#4E90BE';

export default function WallShape({
  seg,
  state,
  onToggle,
  draggable = false,
  onDragEnd,
}: {
  seg: WallSeg;
  state: WallState;
  onToggle?: () => void;
  draggable?: boolean;
  onDragEnd?: (dx: number, dy: number) => void;
}) {
  const { x1, y1, x2, y2, inx, iny } = seg;
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  const shapes: JSX.Element[] = [];
  if (state === 'wall') {
    shapes.push(<Line key="w" points={[x1, y1, x2, y2]} stroke={STEEL} strokeWidth={0.85} lineCap="square" listening={false} />);
  } else if (state === 'window') {
    shapes.push(<Line key="w" points={[x1, y1, x2, y2]} stroke={STEEL} strokeWidth={0.85} lineCap="square" listening={false} />);
    const winLen = Math.max(6, Math.min(len * 0.55, 14));
    const midx = (x1 + x2) / 2, midy = (y1 + y2) / 2;
    const g1x = midx - ux * winLen / 2, g1y = midy - uy * winLen / 2;
    const g2x = midx + ux * winLen / 2, g2y = midy + uy * winLen / 2;
    const tick = 2.6;
    shapes.push(<Line key="t1" points={[g1x, g1y, g1x + inx * tick, g1y + iny * tick]} stroke={STEEL} strokeWidth={0.65} listening={false} />);
    shapes.push(<Line key="t2" points={[g2x, g2y, g2x + inx * tick, g2y + iny * tick]} stroke={STEEL} strokeWidth={0.65} listening={false} />);
    shapes.push(<Line key="glass" points={[g1x + inx * 1.3, g1y + iny * 1.3, g2x + inx * 1.3, g2y + iny * 1.3]} stroke={GLASS} strokeWidth={1.15} lineCap="round" listening={false} />);
  } else if (state === 'door') {
    const gap = Math.max(6, Math.min(len * 0.45, 10));
    const midx = (x1 + x2) / 2, midy = (y1 + y2) / 2;
    const g1x = midx - ux * gap / 2, g1y = midy - uy * gap / 2;
    const g2x = midx + ux * gap / 2, g2y = midy + uy * gap / 2;
    shapes.push(<Line key="s1" points={[x1, y1, g1x, g1y]} stroke={STEEL} strokeWidth={0.85} lineCap="square" listening={false} />);
    shapes.push(<Line key="s2" points={[g2x, g2y, x2, y2]} stroke={STEEL} strokeWidth={0.85} lineCap="square" listening={false} />);
    const leafx = g1x + inx * gap, leafy = g1y + iny * gap;
    shapes.push(<Line key="leaf" points={[g1x, g1y, leafx, leafy]} stroke={SAFETY} strokeWidth={0.7} listening={false} />);
    shapes.push(<Line key="arc" points={[leafx, leafy, g2x, g2y]} stroke={SAFETY} strokeWidth={0.6} dash={[1.6, 1.4]} listening={false} />);
  }
  return (
    <Group
      draggable={draggable}
      onDragEnd={(event: Konva.KonvaEventObject<DragEvent>) => {
        const dx = event.target.x();
        const dy = event.target.y();
        event.target.position({ x: 0, y: 0 });
        onDragEnd?.(dx, dy);
      }}
      onClick={onToggle}
      onTap={onToggle}
    >
      <Line points={[x1, y1, x2, y2]} stroke="transparent" strokeWidth={9} hitStrokeWidth={9} listening={!!onToggle || draggable} />
      {shapes}
    </Group>
  );
}
