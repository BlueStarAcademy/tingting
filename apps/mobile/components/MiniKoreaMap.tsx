import { KoreaSvgMap } from '@/components/KoreaSvgMap';

interface Props {
  visitedRegionCodes: string[];
  width?: number;
  height?: number;
}

export function MiniKoreaMap({ visitedRegionCodes, width = 160, height = 160 }: Props) {
  return (
    <KoreaSvgMap
      visitedRegionCodes={visitedRegionCodes}
      width={width}
      height={height}
      showLabels={false}
      interactive={false}
    />
  );
}
