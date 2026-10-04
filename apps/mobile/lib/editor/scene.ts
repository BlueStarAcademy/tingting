import {
  FontWeight,
  Skia,
  TextAlign,
  type SkParagraph,
  type SkTextShadow,
} from '@shopify/react-native-skia';
import { STILL_TIME, layoutArEffect, type ArOp } from '@/lib/ar/effects';
import { buildColorMatrix, getFilterLook, type ColorMatrix } from './color';
import type { FaceGeom, Vec } from './faces';
import { frameLayout, type FrameLayout } from './frames';
import { buildUniforms, type EditorUniforms } from './shader';
import type { EditState, OverlayItem, TextItem } from './types';

export type Glyph = { paragraph: SkParagraph; width: number; height: number };

export type ItemDraw = {
  id: string;
  kind: OverlayItem['kind'];
  glyph: Glyph;
  cx: number;
  cy: number;
  scale: number;
  rotation: number;
  box: { color: string; padX: number; padY: number; radius: number } | null;
  /** half extents in layout units at scale 1, box included */
  halfW: number;
  halfH: number;
};

export type LensPart =
  | { t: 'glyph'; glyph: Glyph; cx: number; cy: number; rotation: number }
  | { t: 'oval'; cx: number; cy: number; rx: number; ry: number; rotation: number; color: string; stroke?: number }
  | { t: 'poly'; points: Vec[]; color: string };

export type Caption = { main: Glyph | null; sub: Glyph | null };

export type SceneModel = {
  layout: FrameLayout;
  uniforms: EditorUniforms;
  matrix: ColorMatrix;
  items: ItemDraw[];
  lens: LensPart[];
  /** AR effect sprites in content (image pixel) space */
  ar: ArOp[];
  caption: Caption;
};

export const STICKER_FONT = 0.16;
export const TEXT_FONT = 0.075;

const glyphCache = new Map<string, Glyph>();

function makeGlyph(
  key: string,
  text: string,
  style: {
    fontSize: number;
    color: string;
    bold?: boolean;
    shadows?: SkTextShadow[];
    letterSpacing?: number;
    align?: TextAlign;
    maxWidth?: number;
  },
): Glyph {
  const cached = glyphCache.get(key);
  if (cached) return cached;
  const align = style.align ?? TextAlign.Center;
  const build = () =>
    Skia.ParagraphBuilder.Make({ textAlign: align })
      .pushStyle({
        color: Skia.Color(style.color),
        fontSize: style.fontSize,
        fontStyle: { weight: style.bold ? FontWeight.Bold : FontWeight.Normal },
        shadows: style.shadows,
        letterSpacing: style.letterSpacing,
      })
      .addText(text)
      .pop()
      .build();
  const probe = build();
  probe.layout(style.maxWidth ?? style.fontSize * Math.max(4, text.length * 1.4));
  const width = Math.ceil(Math.max(probe.getLongestLine(), 1)) + 2;
  const paragraph = align === TextAlign.Center ? build() : probe;
  const finalWidth = align === TextAlign.Center ? width : (style.maxWidth ?? width);
  paragraph.layout(finalWidth);
  const glyph = { paragraph, width: finalWidth, height: paragraph.getHeight() };
  if (glyphCache.size > 300) glyphCache.clear();
  glyphCache.set(key, glyph);
  return glyph;
}

function emojiGlyph(emoji: string, fontSize: number): Glyph {
  const size = Math.max(4, Math.round(fontSize));
  return makeGlyph(`e|${emoji}|${size}`, emoji, { fontSize: size, color: '#000000' });
}

function isLight(hex: string): boolean {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}

function textGlyph(item: TextItem, contentWidth: number): { glyph: Glyph; box: ItemDraw['box'] } {
  const fontSize = Math.max(6, Math.round(contentWidth * TEXT_FONT));
  const maxWidth = contentWidth * 0.9;
  const text = item.text.trim() || ' ';
  const key = `t|${item.look}|${item.bold ? 1 : 0}|${item.color}|${fontSize}|${text}`;
  switch (item.look) {
    case 'box': {
      const textColor = isLight(item.color) ? '#2D1F24' : '#FFFFFF';
      return {
        glyph: makeGlyph(key, text, { fontSize, color: textColor, bold: item.bold, maxWidth }),
        box: { color: item.color, padX: fontSize * 0.4, padY: fontSize * 0.2, radius: fontSize * 0.32 },
      };
    }
    case 'shadow':
      return {
        glyph: makeGlyph(key, text, {
          fontSize,
          color: item.color,
          bold: item.bold,
          maxWidth,
          shadows: [{ color: Skia.Color('rgba(0,0,0,0.55)'), offset: { x: 0, y: fontSize * 0.06 }, blurRadius: fontSize * 0.14 }],
        }),
        box: null,
      };
    case 'neon':
      return {
        glyph: makeGlyph(key, text, {
          fontSize,
          color: '#FFFFFF',
          bold: item.bold,
          maxWidth,
          shadows: [
            { color: Skia.Color(item.color), offset: { x: 0, y: 0 }, blurRadius: fontSize * 0.12 },
            { color: Skia.Color(item.color), offset: { x: 0, y: 0 }, blurRadius: fontSize * 0.4 },
          ],
        }),
        box: null,
      };
    default:
      return { glyph: makeGlyph(key, text, { fontSize, color: item.color, bold: item.bold, maxWidth }), box: null };
  }
}

function buildItems(state: EditState, layout: FrameLayout): ItemDraw[] {
  const { content } = layout;
  return state.items.map((item) => {
    const cx = content.x + item.x * content.width;
    const cy = content.y + item.y * content.height;
    if (item.kind === 'sticker') {
      const glyph = emojiGlyph(item.emoji, content.width * STICKER_FONT);
      return {
        id: item.id,
        kind: item.kind,
        glyph,
        cx,
        cy,
        scale: item.scale,
        rotation: item.rotation,
        box: null,
        halfW: glyph.width / 2,
        halfH: glyph.height / 2,
      };
    }
    const { glyph, box } = textGlyph(item, content.width);
    return {
      id: item.id,
      kind: item.kind,
      glyph,
      cx,
      cy,
      scale: item.scale,
      rotation: item.rotation,
      box,
      halfW: glyph.width / 2 + (box?.padX ?? 0),
      halfH: glyph.height / 2 + (box?.padY ?? 0),
    };
  });
}

const addV = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const mulV = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s });

function glyphAt(emoji: string, fontSize: number, at: Vec, rotation: number): LensPart {
  return { t: 'glyph', glyph: emojiGlyph(emoji, fontSize), cx: at.x, cy: at.y, rotation };
}

function faceLens(lensId: string, f: FaceGeom): LensPart[] {
  const eyeMid = { x: (f.leftEye.x + f.rightEye.x) / 2, y: (f.leftEye.y + f.rightEye.y) / 2 };
  const eyeDist = Math.hypot(f.rightEye.x - f.leftEye.x, f.rightEye.y - f.leftEye.y);
  const fw = f.radius.x * 2;
  const top = addV(eyeMid, mulV(f.up, eyeDist * 1.25));
  const at = (dx: number, dy: number) => addV(f.center, addV(mulV(f.ax, dx), mulV(f.up, dy)));
  switch (lensId) {
    case 'lens_crown':
      return [glyphAt('👑', fw * 0.5, addV(top, mulV(f.up, fw * 0.2)), f.angle)];
    case 'lens_sunglasses':
      return [glyphAt('🕶️', eyeDist * 1.6, addV(eyeMid, mulV(f.up, eyeDist * 0.04)), f.angle)];
    case 'lens_heart_eyes':
      return [
        glyphAt('❤️', f.eyeRadius * 2.6, f.leftEye, f.angle),
        glyphAt('❤️', f.eyeRadius * 2.6, f.rightEye, f.angle),
      ];
    case 'lens_sparkle':
      return [
        glyphAt('✨', fw * 0.2, at(-f.radius.x * 1.15, f.radius.y * 0.55), f.angle),
        glyphAt('✨', fw * 0.14, at(f.radius.x * 1.2, f.radius.y * 0.8), f.angle),
        glyphAt('✨', fw * 0.16, at(f.radius.x * 1.1, -f.radius.y * 0.2), f.angle),
        glyphAt('⭐', fw * 0.11, at(-f.radius.x * 1.05, -f.radius.y * 0.35), f.angle),
        glyphAt('✨', fw * 0.12, at(0, f.radius.y * 1.3), f.angle),
      ];
    case 'lens_flower_crown': {
      const flowers = ['🌸', '🌼', '🌺', '🌷'];
      return Array.from({ length: 7 }, (_, i) => {
        const t = -0.95 + i * (1.9 / 6);
        const pos = at(Math.sin(t) * f.radius.x * 0.95, Math.cos(t) * f.radius.y * 0.95);
        return glyphAt(flowers[i % flowers.length], fw * 0.2, pos, f.angle + t * 0.7);
      });
    }
    case 'lens_cat_ears': {
      const parts: LensPart[] = [];
      for (const side of [-1, 1]) {
        const base = at(side * f.radius.x * 0.55, f.radius.y * 0.88);
        const bl = addV(base, mulV(f.ax, -f.radius.x * 0.3));
        const br = addV(base, mulV(f.ax, f.radius.x * 0.3));
        const apex = addV(addV(base, mulV(f.up, f.radius.y * 0.6)), mulV(f.ax, side * f.radius.x * 0.14));
        const c = { x: (bl.x + br.x + apex.x) / 3, y: (bl.y + br.y + apex.y) / 3 };
        const shrink = (p: Vec) => addV(c, mulV({ x: p.x - c.x, y: p.y - c.y }, 0.55));
        parts.push({ t: 'poly', points: [bl, apex, br], color: '#3B2F2F' });
        parts.push({ t: 'poly', points: [shrink(bl), shrink(apex), shrink(br)], color: '#F7A1B5' });
      }
      parts.push({ t: 'oval', cx: f.nose.x, cy: f.nose.y, rx: f.eyeRadius * 0.6, ry: f.eyeRadius * 0.42, rotation: f.angle, color: '#F48FB1' });
      return parts;
    }
    case 'lens_dog_ears': {
      const parts: LensPart[] = [];
      for (const side of [-1, 1]) {
        const c = at(side * f.radius.x * 0.95, f.radius.y * 0.5);
        parts.push({ t: 'oval', cx: c.x, cy: c.y, rx: fw * 0.14, ry: fw * 0.28, rotation: f.angle + side * 0.35, color: '#8B5A2B' });
        parts.push({ t: 'oval', cx: c.x, cy: c.y, rx: fw * 0.08, ry: fw * 0.19, rotation: f.angle + side * 0.35, color: '#B07A4F' });
      }
      parts.push({ t: 'oval', cx: f.nose.x, cy: f.nose.y, rx: f.eyeRadius * 0.95, ry: f.eyeRadius * 0.62, rotation: f.angle, color: '#2B1D1A' });
      return parts;
    }
    case 'lens_bunny': {
      const parts: LensPart[] = [];
      for (const side of [-1, 1]) {
        const c = at(side * f.radius.x * 0.38, f.radius.y * 1.35);
        parts.push({ t: 'oval', cx: c.x, cy: c.y, rx: fw * 0.11, ry: fw * 0.38, rotation: f.angle - side * 0.15, color: '#FFFFFF' });
        parts.push({ t: 'oval', cx: c.x, cy: c.y, rx: fw * 0.055, ry: fw * 0.28, rotation: f.angle - side * 0.15, color: '#F9B3C8' });
      }
      return parts;
    }
    default:
      return [];
  }
}

function todayLabel(): string {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function buildLens(state: EditState, faces: FaceGeom[]): LensPart[] {
  const lensId = state.lensId;
  if (!lensId || lensId === 'lens_none') return [];
  if (lensId === 'lens_travel_stamp') {
    const { width, height } = state.base;
    const r = Math.min(width, height) * 0.12;
    const c = { x: width * 0.8, y: height - r * 1.6 };
    const color = '#E0607E';
    return [
      { t: 'oval', cx: c.x, cy: c.y, rx: r, ry: r, rotation: 0, color, stroke: r * 0.07 },
      { t: 'oval', cx: c.x, cy: c.y, rx: r * 0.82, ry: r * 0.82, rotation: 0, color, stroke: r * 0.025 },
      glyphAt('✈️', r * 0.62, c, -0.2),
      {
        t: 'glyph',
        glyph: makeGlyph(`stamp|t|${Math.round(r)}`, 'TRAVEL', { fontSize: r * 0.24, color, bold: true, letterSpacing: r * 0.03 }),
        cx: c.x,
        cy: c.y - r * 0.55,
        rotation: -0.2,
      },
      {
        t: 'glyph',
        glyph: makeGlyph(`stamp|d|${Math.round(r)}|${todayLabel()}`, todayLabel(), { fontSize: r * 0.17, color, bold: true }),
        cx: c.x,
        cy: c.y + r * 0.55,
        rotation: -0.2,
      },
    ];
  }
  return faces.flatMap((f) => faceLens(lensId, f));
}

const CAPTION_STYLE: Partial<Record<string, { color: string; sub: string; main?: string; spacing?: number }>> = {
  polaroid: { color: '#4A3B3F', sub: '#9A8A8E' },
  postcard: { color: '#7A6448', sub: '#A89373', main: 'POST CARD', spacing: 0.25 },
  love: { color: '#B8435F', sub: '#D9788F' },
  seoul: { color: '#FFFFFF', sub: '#C9C3FF', main: 'TRAVEL DIARY', spacing: 0.2 },
};

function buildCaption(layout: FrameLayout, caption: string | undefined): Caption {
  const style = layout.frame ? CAPTION_STYLE[layout.frame] : undefined;
  if (!style) return { main: null, sub: null };
  const unit = Math.min(layout.content.width, layout.content.height);
  const fontSize = Math.round(unit * 0.055);
  const mainText = style.main ?? (caption?.trim() || (layout.frame === 'love' ? '우리의 여행 ♥' : '우리의 여행'));
  const maxWidth = layout.content.width * 0.62;
  const main = makeGlyph(`cap|${layout.frame}|${fontSize}|${mainText}`, mainText, {
    fontSize,
    color: style.color,
    bold: true,
    letterSpacing: style.spacing ? fontSize * style.spacing : undefined,
    align: TextAlign.Left,
    maxWidth,
  });
  const subText = style.main && caption?.trim() ? `${caption.trim()} · ${todayLabel()}` : todayLabel();
  const sub = makeGlyph(`cap2|${layout.frame}|${fontSize}|${subText}`, subText, {
    fontSize: Math.round(fontSize * 0.7),
    color: style.sub,
    align: TextAlign.Right,
    maxWidth: layout.content.width * 0.5,
  });
  return { main, sub };
}

export function buildSceneModel(state: EditState, faces: FaceGeom[], caption?: string): SceneModel {
  const layout = frameLayout(state.frameId, state.base.width, state.base.height);
  const look = getFilterLook(state.filterId);
  return {
    layout,
    uniforms: buildUniforms(state, faces, look),
    matrix: buildColorMatrix(state.filterId, state.filterIntensity, state.adjust),
    items: buildItems(state, layout),
    lens: buildLens(state, faces),
    ar: layoutArEffect(state.arId, {
      width: state.base.width,
      height: state.base.height,
      time: STILL_TIME,
      faces: faces.map((face) => ({ face, presence: 1 })),
    }),
    caption: buildCaption(layout, caption),
  };
}

/** Topmost overlay item under a point given in layout units. */
export function hitTestItem(model: SceneModel, x: number, y: number, slop: number): ItemDraw | null {
  for (let i = model.items.length - 1; i >= 0; i -= 1) {
    const item = model.items[i];
    const dx = x - item.cx;
    const dy = y - item.cy;
    const cos = Math.cos(-item.rotation);
    const sin = Math.sin(-item.rotation);
    const lx = (dx * cos - dy * sin) / item.scale;
    const ly = (dx * sin + dy * cos) / item.scale;
    const pad = slop / item.scale;
    if (Math.abs(lx) <= item.halfW + pad && Math.abs(ly) <= item.halfH + pad) return item;
  }
  return null;
}
