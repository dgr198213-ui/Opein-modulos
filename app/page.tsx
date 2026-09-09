'use client';
import dynamic from 'next/dynamic';

const Configurator = dynamic(() => import('@/components/Configurator'), { ssr: false });

export default function Page() {
  return <Configurator />;
}
