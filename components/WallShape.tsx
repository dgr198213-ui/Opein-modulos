'use client';
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
}: {
  seg: WallSeg;
  state: WallState;
  onToggle?: () => void;
}) {
  const { x1, y1, x2, y2, inx, iny } = seg;
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len;

  const shapes: JSX.Element[] = [];

  if (state === 'wall') {
    shapes.push(<Line key="w" points={[x1, y1, x2, y2]} stroke={STEEL} strokeWidth={1.6} lineCap="square" />);
  } else if (state === 'window') {
    shapes.push(<Line key="w" points={[x1, y1, x2, y2]} stroke={STEEL} strokeWidth={1.6} lineCap="square" />);
    const winLen = Math.max(6, Math.min(len * 0.55, 14));
    const midx = (x1 + x2) / 2, midy = (y1 + y2) / 2;
    const g1x = midx - ux * winLen / 2, g1y = midy - uy * winLen / 2;
    const g2x = midx + ux * winLen / 2, g2y = midy + uy * winLen / 2;
    const tick = 2.6;
    shapes.push(<Line key="t1" points={[g1x, g1y, g1x + inx * tick, g1y + iny * tick]} stroke={STEEL} strokeWidth={1.1} />);
    shapes.push(<Line key="t2" points={[g2x, g2y, g2x + inx * tick, g2y + iny * tick]} stroke={STEEL} strokeWidth={1.1} />);
    shapes.push(
      <Line
        key="glass"
        points={[g1x + inx * 1.3, g1y + iny * 1.3, g2x + inx * 1.3, g2y + iny * 1.3]}
        stroke={GLASS}
        strokeWidth={2.2}
        lineCap="round"
      />
    );
  } else if (state === 'door') {
    const gap = Math.max(6, Math.min(len * 0.45, 10));
    const midx = (x1 + x2) / 2, midy = (y1 + y2) / 2;
    const g1x = midx - ux * gap / 2, g1y = midy - uy * gap / 2;
    const g2x = midx + ux * gap / 2, g2y = midy + uy * gap / 2;
    shapes.push(<Line key="s1" points={[x1, y1, g1x, g1y]} stroke={STEEL} strokeWidth={1.6} lineCap="square" />);
    shapes.push(<Line key="s2" points={[g2x, g2y, x2, y2]} stroke={STEEL} strokeWidth={1.6} lineCap="square" />);
    const leafx = g1x + inx * gap, leafy = g1y + iny * gap;
    shapes.push(<Line key="leaf" points={[g1x, g1y, leafx, leafy]} stroke={SAFETY} strokeWidth={1.2} />);
    shapes.push(
      <Line key="arc" points={[leafx, leafy, g2x, g2y]} stroke={SAFETY} strokeWidth={1} dash={[1.6, 1.4]} />
    );
  }

  return (
    <Group onClick={onToggle} onTap={onToggle}>
      <Line
        points={[x1, y1, x2, y2]}
        stroke="transparent"
        strokeWidth={9}
        hitStrokeWidth={9}
        listening={!!onToggle}
      />
      {shapes}
    </Group>
  );
}
