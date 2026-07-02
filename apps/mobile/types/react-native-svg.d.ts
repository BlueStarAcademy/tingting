declare module 'react-native-svg' {
  import type { ComponentType, ReactNode } from 'react';

  export interface SvgProps {
    width?: number | string;
    height?: number | string;
    viewBox?: string;
    children?: ReactNode;
  }

  export interface PathProps {
    d?: string;
    fill?: string;
    fillOpacity?: number;
    stroke?: string;
    strokeWidth?: number;
    strokeLinejoin?: string;
    strokeLinecap?: string;
    onPress?: () => void;
  }

  export interface CircleProps {
    cx?: number;
    cy?: number;
    r?: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  }

  export interface GProps {
    children?: ReactNode;
    pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
  }

  export interface TextProps {
    x?: number;
    y?: number;
    fill?: string;
    fontSize?: number;
    fontWeight?: string;
    textAnchor?: string;
    pointerEvents?: string;
    children?: ReactNode;
  }

  export interface RectProps {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rx?: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  }

  export interface StopProps {
    offset?: string | number;
    stopColor?: string;
    stopOpacity?: number;
  }

  export interface LinearGradientProps {
    id?: string;
    x1?: string | number;
    y1?: string | number;
    x2?: string | number;
    y2?: string | number;
    gradientUnits?: string;
    children?: ReactNode;
  }

  export interface DefsProps {
    children?: ReactNode;
  }

  const Svg: ComponentType<SvgProps>;
  export default Svg;
  export const Path: ComponentType<PathProps>;
  export const Circle: ComponentType<CircleProps>;
  export const G: ComponentType<GProps>;
  export const Text: ComponentType<TextProps>;
  export const Rect: ComponentType<RectProps>;
  export const Stop: ComponentType<StopProps>;
  export const Defs: ComponentType<DefsProps>;
  export const LinearGradient: ComponentType<LinearGradientProps>;
}
