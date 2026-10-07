import { memo } from 'react';
import {
  BlurMask,
  Circle,
  ColorMatrix,
  DashPathEffect,
  Fill,
  Group,
  Image,
  ImageShader,
  LinearGradient,
  Oval,
  Paragraph,
  Path,
  Rect,
  RoundedRect,
  Shader,
  Shadow,
  Skia,
  rect,
  rrect,
  vec,
  type SkImage,
  type SkRuntimeEffect,
} from '@shopify/react-native-skia';
import { ArLayer, type ArImages } from '@/components/ar/ArLayer';
import type { FrameLayout } from '@/lib/editor/frames';
import type { Caption as CaptionModel, Glyph, ItemDraw, LensPart, SceneModel } from '@/lib/editor/scene';

type Props = {
  image: SkImage;
  model: SceneModel;
  effect: SkRuntimeEffect | null;
  arImages?: ArImages;
  /** layout units → canvas units */
  scale: number;
  original?: boolean;
  hideItemId?: string | null;
};

function GlyphAt({ glyph, cx, cy, rotation, scale = 1 }: { glyph: Glyph; cx: number; cy: number; rotation: number; scale?: number }) {
  return (
    <Group transform={[{ translateX: cx }, { translateY: cy }, { rotate: rotation }, { scale }]}>
      <Paragraph paragraph={glyph.paragraph} x={-glyph.width / 2} y={-glyph.height / 2} width={glyph.width} />
    </Group>
  );
}

function LensShape({ part }: { part: LensPart }) {
  if (part.t === 'glyph') {
    return <GlyphAt glyph={part.glyph} cx={part.cx} cy={part.cy} rotation={part.rotation} />;
  }
  if (part.t === 'poly') {
    const path = Skia.Path.Make();
    part.points.forEach((p, i) => (i === 0 ? path.moveTo(p.x, p.y) : path.lineTo(p.x, p.y)));
    path.close();
    return <Path path={path} color={part.color} />;
  }
  return (
    <Group transform={[{ translateX: part.cx }, { translateY: part.cy }, { rotate: part.rotation }]}>
      <Oval
        x={-part.rx}
        y={-part.ry}
        width={part.rx * 2}
        height={part.ry * 2}
        color={part.color}
        style={part.stroke ? 'stroke' : 'fill'}
        strokeWidth={part.stroke}
      />
    </Group>
  );
}

function ItemShape({ item }: { item: ItemDraw }) {
  const { glyph, box } = item;
  return (
    <Group transform={[{ translateX: item.cx }, { translateY: item.cy }, { rotate: item.rotation }, { scale: item.scale }]}>
      {box ? (
        <RoundedRect
          x={-item.halfW}
          y={-item.halfH}
          width={item.halfW * 2}
          height={item.halfH * 2}
          r={box.radius}
          color={box.color}
        />
      ) : null}
      <Paragraph paragraph={glyph.paragraph} x={-glyph.width / 2} y={-glyph.height / 2} width={glyph.width} />
    </Group>
  );
}

function CaptionRow({ layout, caption }: { layout: FrameLayout; caption: CaptionModel }) {
  const { content } = layout;
  const bandTop = content.y + content.height;
  const bandHeight = layout.height - bandTop;
  const midY = bandTop + bandHeight * 0.5;
  return (
    <Group>
      {caption.main ? (
        <Paragraph
          paragraph={caption.main.paragraph}
          x={content.x}
          y={midY - caption.main.height / 2}
          width={caption.main.width}
        />
      ) : null}
      {caption.sub ? (
        <Paragraph
          paragraph={caption.sub.paragraph}
          x={content.x + content.width - caption.sub.width}
          y={midY - caption.sub.height / 2}
          width={caption.sub.width}
        />
      ) : null}
    </Group>
  );
}

function FrameBackground({ layout }: { layout: FrameLayout }) {
  const { width, height, content } = layout;
  const unit = Math.min(content.width, content.height);
  switch (layout.frame) {
    case null:
      return null;
    case 'white_clean':
      return <Fill color="#FFFFFF" />;
    case 'polaroid':
      return <Fill color="#FFFDF7" />;
    case 'black_matte':
      return (
        <Group>
          <Fill color="#1B1B1B" />
          <Rect
            x={content.x - unit * 0.012}
            y={content.y - unit * 0.012}
            width={content.width + unit * 0.024}
            height={content.height + unit * 0.024}
            color="#3A3A3A"
            style="stroke"
            strokeWidth={unit * 0.003}
          />
        </Group>
      );
    case 'film_frame': {
      const holeW = unit * 0.035;
      const holeH = unit * 0.05;
      const gap = unit * 0.075;
      const count = Math.floor(width / gap);
      const offset = (width - (count - 1) * gap) / 2;
      const rows = [content.y * 0.5, height - content.y * 0.5];
      return (
        <Group>
          <Fill color="#161312" />
          {rows.flatMap((cy, r) =>
            Array.from({ length: count }, (_, i) => (
              <RoundedRect
                key={`${r}-${i}`}
                x={offset + i * gap - holeW / 2}
                y={cy - holeH / 2}
                width={holeW}
                height={holeH}
                r={holeW * 0.25}
                color="#EFE7DC"
              />
            )),
          )}
        </Group>
      );
    }
    case 'round':
      return <Fill color="#F7EEEE" />;
    case 'soft_shadow':
      return (
        <Group>
          <Fill color="#F3ECEA" />
          <RoundedRect x={content.x} y={content.y} width={content.width} height={content.height} r={layout.radius} color="#FFFFFF">
            <Shadow dx={0} dy={unit * 0.012} blur={unit * 0.03} color="rgba(60,30,40,0.28)" />
          </RoundedRect>
        </Group>
      );
    case 'postcard': {
      const inset = unit * 0.025;
      return (
        <Group>
          <Fill color="#FAF4E8" />
          <Rect x={inset} y={inset} width={width - inset * 2} height={height - inset * 2} color="#C9B79C" style="stroke" strokeWidth={unit * 0.004}>
            <DashPathEffect intervals={[unit * 0.02, unit * 0.012]} />
          </Rect>
        </Group>
      );
    }
    case 'stamp': {
      const inset = unit * 0.03;
      const r = unit * 0.018;
      const step = unit * 0.05;
      const innerW = width - inset * 2;
      const innerH = height - inset * 2;
      const nx = Math.max(2, Math.round(innerW / step));
      const ny = Math.max(2, Math.round(innerH / step));
      const circles: { x: number; y: number }[] = [];
      for (let i = 0; i <= nx; i += 1) {
        const x = inset + (innerW * i) / nx;
        circles.push({ x, y: inset }, { x, y: height - inset });
      }
      for (let j = 1; j < ny; j += 1) {
        const y = inset + (innerH * j) / ny;
        circles.push({ x: inset, y }, { x: width - inset, y });
      }
      return (
        <Group>
          <Fill color="#E9E2DC" />
          <Rect x={inset} y={inset} width={innerW} height={innerH} color="#FFFFFF" />
          {circles.map((c, i) => (
            <Circle key={i} cx={c.x} cy={c.y} r={r} color="#E9E2DC" />
          ))}
        </Group>
      );
    }
    case 'love':
      return (
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient start={vec(0, 0)} end={vec(width, height)} colors={['#FFE1EA', '#FFC2D1', '#FFD9C7']} />
        </Rect>
      );
    case 'neon_pink_frame':
      return <Fill color="#1A0B14" />;
    case 'sky_frame':
      return (
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={['#8CCBFF', '#E8F4FF']} />
        </Rect>
      );
    case 'gold_frame':
      return (
        <Group>
          <Rect x={0} y={0} width={width} height={height}>
            <LinearGradient start={vec(0, 0)} end={vec(width, height)} colors={['#B8892B', '#F6E27A', '#C99A2E', '#F3D77A', '#A87B22']} />
          </Rect>
          <Rect
            x={content.x - unit * 0.01}
            y={content.y - unit * 0.01}
            width={content.width + unit * 0.02}
            height={content.height + unit * 0.02}
            color="#7A5A12"
            style="stroke"
            strokeWidth={unit * 0.004}
          />
        </Group>
      );
    case 'seoul':
      return <Fill color="#141A3A" />;
    default:
      return null;
  }
}

function FrameForeground({ layout }: { layout: FrameLayout }) {
  const { content } = layout;
  const unit = Math.min(content.width, content.height);
  if (layout.frame === 'neon_pink_frame') {
    const box = rrect(rect(content.x, content.y, content.width, content.height), layout.radius, layout.radius);
    return (
      <Group>
        <RoundedRect rect={box} color="#FF4FA3" style="stroke" strokeWidth={unit * 0.02}>
          <BlurMask blur={unit * 0.025} style="normal" />
        </RoundedRect>
        <RoundedRect rect={box} color="#FFD1E8" style="stroke" strokeWidth={unit * 0.005} />
      </Group>
    );
  }
  return null;
}

const Photo = memo(function Photo({
  image,
  effect,
  uniforms,
  matrix,
  width,
  height,
  original,
}: {
  image: SkImage;
  effect: SkRuntimeEffect | null;
  uniforms: SceneModel['uniforms'];
  matrix: SceneModel['matrix'];
  width: number;
  height: number;
  original?: boolean;
}) {
  if (original) return <Image image={image} x={0} y={0} width={width} height={height} fit="fill" />;
  if (effect) {
    return (
      <Rect x={0} y={0} width={width} height={height}>
        <Shader source={effect} uniforms={uniforms}>
          <ImageShader image={image} fit="fill" rect={{ x: 0, y: 0, width, height }} />
        </Shader>
        <ColorMatrix matrix={matrix} />
      </Rect>
    );
  }
  return (
    <Image image={image} x={0} y={0} width={width} height={height} fit="fill">
      <ColorMatrix matrix={matrix} />
    </Image>
  );
});

const Lens = memo(function Lens({ lens }: { lens: LensPart[] }) {
  return (
    <>
      {lens.map((part, i) => (
        <LensShape key={i} part={part} />
      ))}
    </>
  );
});

const Items = memo(function Items({ items, hideItemId }: { items: ItemDraw[]; hideItemId?: string | null }) {
  return (
    <>
      {items
        .filter((item) => item.id !== hideItemId)
        .map((item) => (
          <ItemShape key={item.id} item={item} />
        ))}
    </>
  );
});

const Background = memo(FrameBackground);
const Foreground = memo(FrameForeground);
const Caption = memo(CaptionRow);
const Ar = memo(ArLayer);

/**
 * The parts are memoized on the scene model's sub-objects, which `createSceneModelBuilder` keeps
 * stable while unchanged, so a slider tick re-renders only the photo node.
 */
export function EditorScene({ image, model, effect, arImages, scale, original, hideItemId }: Props) {
  const { layout } = model;
  const { content } = layout;
  const clip = rrect(rect(0, 0, content.width, content.height), layout.radius, layout.radius);
  return (
    <Group transform={[{ scale }]}>
      <Background layout={layout} />
      {!original ? <Caption layout={layout} caption={model.caption} /> : null}
      <Group transform={[{ translateX: content.x }, { translateY: content.y }]} clip={clip}>
        <Photo
          image={image}
          effect={effect}
          uniforms={model.uniforms}
          matrix={model.matrix}
          width={content.width}
          height={content.height}
          original={original}
        />
        {!original ? <Lens lens={model.lens} /> : null}
        {!original && arImages && model.ar.length ? <Ar ops={model.ar} images={arImages} /> : null}
      </Group>
      <Foreground layout={layout} />
      {!original ? <Items items={model.items} hideItemId={hideItemId} /> : null}
    </Group>
  );
}
