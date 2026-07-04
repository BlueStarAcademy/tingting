export type TransportLine = {
  icon: 'train' | 'bus' | 'subway' | 'car' | 'plane';
  title: string;
  detail: string;
};

export function getPlaceTransport(_place?: unknown): TransportLine[] {
  return [];
}
