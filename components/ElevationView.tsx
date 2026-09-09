'use client';
import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Line, Text, Group } from 'react-konva';
import { ModuleInst, ElementInst } from '@/lib/types';
import { ELEMENT_TYPES } from '@/lib/catalog';
import { VB_W } from '@/lib/geometry';

const EL_VB_H = 55;
const EL_GROUND = 46;

export default function ElevationView({ modules, elements }: { modules: ModuleInst[]; elements: ElementInst[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = width / VB_W;
  const height = EL_VB_H * scale;
  const groundHatch = [];
  for (let x = 0; x < VB_W; x += 4) {
    groundHatch.push(
      <Line key={x} points={[x, EL_GROUND, x - 2, EL_GROUND + 2.5]} stroke="#C9C0A6" strokeWidth={0.6} />
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <Stage width={width} height={height} scaleX={scale} scaleY={scale}>
        <Layer>
          <Rect x={0} y={0} width={VB_W} height={EL_VB_H} fill="#FBFAF6" />

          {modules.map((m) => {
            const h = m.heightM * 10;
            const top = EL_GROUND - h;
            const cx = m.x + m.w / 2;
            const state = m.walls.bottom;
            const parts = [
              <Rect
                key="body"
                x={m.x}
                y={top}
                width={m.w}
                height={h}
                fill="#DCE4EE"
                stroke="#26231F"
                strokeWidth={1.3}
              />,
              <Text
                key="lbl"
                text={m.name}
                x={m.x}
                y={top - 3.2}
                width={m.w}
                align="center"
                fontSize={3.4}
                fontFamily="'IBM Plex Mono', monospace"
                fill="#2A2620"
              />,
            ];
            if (state === 'door') {
              const dw = Math.min(m.w * 0.32, 9), dh = Math.min(h * 0.8, 20);
              parts.push(
                <Rect key="door" x={cx - dw / 2} y={EL_GROUND - dh} width={dw} height={dh} fill="#FBFAF6" stroke="#38547A" strokeWidth={0.8} />
              );
              parts.push(
                <Line key="leaf" points={[cx - dw / 2 + 1, EL_GROUND - 1, cx - dw / 2 + 1, EL_GROUND - dh + 1]} stroke="#D9622B" strokeWidth={1.2} />
              );
            } else if (state === 'window') {
              const ww = Math.min(m.w * 0.4, 14), wh = Math.min(h * 0.4, 10);
              const sill = h * 0.42;
              const wy = EL_GROUND - sill - wh;
              parts.push(<Rect key="win" x={cx - ww / 2} y={wy} width={ww} height={wh} fill="#CBDCE8" stroke="#38547A" strokeWidth={0.8} />);
              parts.push(<Line key="mv" points={[cx, wy, cx, wy + wh]} stroke="#38547A" strokeWidth={0.6} />);
              parts.push(<Line key="mh" points={[cx - ww / 2, wy + wh / 2, cx + ww / 2, wy + wh / 2]} stroke="#38547A" strokeWidth={0.6} />);
            }
            return parts;
          })}

          {elements
            .filter((it) => ELEMENT_TYPES.find((t) => t.id === it.typeId)?.exterior)
            .map((it) => {
              const type = ELEMENT_TYPES.find((t) => t.id === it.typeId)!;
              const size = 6;
              const cy = EL_GROUND - (type.elevFrac ?? 0) * 28 - size / 2;
              return (
                <Group key={it.id} x={it.x} y={cy}>
                  <Rect x={-size / 2} y={-size / 2} width={size} height={size} cornerRadius={1} fill={type.color} stroke="#fff" strokeWidth={0.6} />
                  <Text text={type.abbr} x={-size / 2} y={-1.4} width={size} align="center" fontSize={2.8} fontStyle="700" fill="#fff" />
                </Group>
              );
            })}

          <Line points={[0, EL_GROUND, VB_W, EL_GROUND]} stroke="#26231F" strokeWidth={1.2} />
          {groundHatch}
        </Layer>
      </Stage>
    </div>
  );
}
