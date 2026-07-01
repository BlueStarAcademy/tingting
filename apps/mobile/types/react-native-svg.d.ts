declare module 'react-native-svg' {
  import type { ComponentType } from 'react';

  export interface SvgProps {
    width?: number | string;
    height?: number | string;
    viewBox?: string;
    children?: React.ReactNode;
  }

  export interface PathProps {
    d?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    strokeLinejoin?: string;
    strokeLinecap?: string;
    onPress?: () => void;
  }

  export interface GProps {
    children?: React.ReactNode;
  }

  export interface TextProps {
    x?: number;
    y?: number;
    fill?: string;
    fontSize?: number;
    fontWeight?: string;
    textAnchor?: string;
    pointerEvents?: string;
    children?: React.ReactNode;
  }

  const Svg: ComponentType<SvgProps>;
  export default Svg;
  export const Path: ComponentType<PathProps>;
  export const G: ComponentType<GProps>;
  export const Text: ComponentType<TextProps>;
}
