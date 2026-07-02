export type SvgPoint = { x: number; y: number };

/** Parse SVG path `d` into absolute polygon points (M/L/l/z only). */
export function parseSvgPath(d: string): SvgPoint[] {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g);
  if (!tokens?.length) return [];

  const points: SvgPoint[] = [];
  let i = 0;
  let cmd = '';
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;

  const readNum = () => Number(tokens[i++]);

  while (i < tokens.length) {
    const token = tokens[i];
    if (/[a-zA-Z]/.test(token)) {
      cmd = token;
      i++;
    }

    switch (cmd) {
      case 'M': {
        cx = readNum();
        cy = readNum();
        sx = cx;
        sy = cy;
        points.push({ x: cx, y: cy });
        cmd = 'L';
        break;
      }
      case 'm': {
        cx += readNum();
        cy += readNum();
        sx = cx;
        sy = cy;
        points.push({ x: cx, y: cy });
        cmd = 'l';
        break;
      }
      case 'L': {
        while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
          cx = readNum();
          cy = readNum();
          points.push({ x: cx, y: cy });
        }
        break;
      }
      case 'l': {
        while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
          cx += readNum();
          cy += readNum();
          points.push({ x: cx, y: cy });
        }
        break;
      }
      case 'H': {
        while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
          cx = readNum();
          points.push({ x: cx, y: cy });
        }
        break;
      }
      case 'h': {
        while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
          cx += readNum();
          points.push({ x: cx, y: cy });
        }
        break;
      }
      case 'V': {
        while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
          cy = readNum();
          points.push({ x: cx, y: cy });
        }
        break;
      }
      case 'v': {
        while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
          cy += readNum();
          points.push({ x: cx, y: cy });
        }
        break;
      }
      case 'Z':
      case 'z': {
        if (points.length && (cx !== sx || cy !== sy)) {
          points.push({ x: sx, y: sy });
        }
        cx = sx;
        cy = sy;
        break;
      }
      default:
        i = tokens.length;
        break;
    }
  }

  return points;
}
