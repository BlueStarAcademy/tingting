import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Canvas, ColorMatrix, Image as SkiaImage, type SkImage } from '@shopify/react-native-skia';
import { theme } from '@/constants/theme';
import { filterPreviewMatrix, type FilterOption } from '@/lib/editor/color';

export type RowItem = { key: string; label: string; icon: string; active?: boolean };

export function ItemRow({
  items,
  selected,
  onSelect,
}: {
  items: RowItem[];
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.itemRow}>
      {items.map((item) => {
        const on = item.key === selected;
        return (
          <Pressable key={item.key} onPress={() => onSelect(item.key)} style={styles.item}>
            <View style={[styles.itemCircle, on && styles.itemCircleOn]}>
              <Text style={styles.itemIcon}>{item.icon}</Text>
              {item.active ? <View style={styles.activeDot} /> : null}
            </View>
            <Text style={[styles.itemLabel, on && styles.itemLabelOn]} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function ChipRow({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string | null;
  onChange: (key: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {options.map((opt) => {
        const on = opt.key === value;
        return (
          <Pressable key={opt.key} onPress={() => onChange(opt.key)} style={[styles.chip, on && styles.chipOn]}>
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Swatches({ colors, value, onChange }: { colors: string[]; value: string; onChange: (c: string) => void }) {
  return (
    <View style={styles.swatches}>
      {colors.map((color) => (
        <Pressable
          key={color}
          onPress={() => onChange(color)}
          style={[styles.swatch, { backgroundColor: color }, value === color && styles.swatchOn]}
        />
      ))}
    </View>
  );
}

const THUMB = 62;

const FilterThumb = memo(function FilterThumb({ image, filterId }: { image: SkImage; filterId: string }) {
  return (
    <Canvas style={styles.thumbCanvas}>
      <SkiaImage image={image} x={0} y={0} width={THUMB} height={THUMB} fit="cover">
        <ColorMatrix matrix={filterPreviewMatrix(filterId)} />
      </SkiaImage>
    </Canvas>
  );
});

export function FilterStrip({
  image,
  filters,
  selected,
  onSelect,
}: {
  image: SkImage | null;
  filters: FilterOption[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
      <Pressable onPress={() => onSelect(null)} style={styles.thumbItem}>
        <View style={[styles.thumbFrame, selected === null && styles.thumbFrameOn, styles.noneThumb]}>
          <Text style={styles.noneText}>원본</Text>
        </View>
        <Text style={[styles.thumbLabel, selected === null && styles.itemLabelOn]}>없음</Text>
      </Pressable>
      {filters.map((f) => {
        const on = f.id === selected;
        return (
          <Pressable key={f.id} onPress={() => onSelect(f.id)} style={styles.thumbItem}>
            <View style={[styles.thumbFrame, on && styles.thumbFrameOn]}>
              {image ? <FilterThumb image={image} filterId={f.id} /> : <View style={[styles.thumbCanvas, { backgroundColor: f.color }]} />}
            </View>
            <Text style={[styles.thumbLabel, on && styles.itemLabelOn]} numberOfLines={1}>
              {f.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function EmojiGrid({ emojis, onPick }: { emojis: { id: string; emoji: string }[]; onPick: (emoji: string) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.emojiGrid} showsVerticalScrollIndicator={false}>
      {emojis.map((e) => (
        <Pressable key={e.id} onPress={() => onPick(e.emoji)} style={styles.emojiCell}>
          <Text style={styles.emoji}>{e.emoji}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function TileRow({
  tiles,
  selected,
  onSelect,
}: {
  tiles: { key: string; label: string; icon?: string; swatch?: string; disabled?: boolean }[];
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
      {tiles.map((tile) => {
        const on = tile.key === selected;
        return (
          <Pressable
            key={tile.key}
            onPress={() => onSelect(tile.key)}
            style={[styles.thumbItem, tile.disabled && { opacity: 0.4 }]}
          >
            <View style={[styles.thumbFrame, on && styles.thumbFrameOn, styles.tile, tile.swatch ? { backgroundColor: tile.swatch } : null]}>
              {tile.icon ? <Text style={styles.tileIcon}>{tile.icon}</Text> : null}
            </View>
            <Text style={[styles.thumbLabel, on && styles.itemLabelOn]} numberOfLines={1}>
              {tile.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  itemRow: { paddingHorizontal: 12, gap: 6, alignItems: 'flex-start' },
  item: { width: 64, alignItems: 'center', gap: 6 },
  itemCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemCircleOn: { borderColor: theme.colors.primaryLight, backgroundColor: 'rgba(224,96,126,0.22)' },
  itemIcon: { fontSize: 20 },
  activeDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primaryLight,
  },
  itemLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '600' },
  itemLabelOn: { color: '#FFFFFF', fontWeight: '800' },
  chipRow: { paddingHorizontal: 12, gap: 6, paddingVertical: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  chipOn: { backgroundColor: theme.colors.primary },
  chipText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700' },
  chipTextOn: { color: '#FFFFFF' },
  swatches: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 6 },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  swatchOn: { borderColor: '#FFFFFF', transform: [{ scale: 1.15 }] },
  thumbRow: { paddingHorizontal: 12, gap: 8 },
  thumbItem: { width: THUMB + 4, alignItems: 'center', gap: 5 },
  thumbFrame: {
    width: THUMB + 4,
    height: THUMB + 4,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbFrameOn: { borderColor: theme.colors.primaryLight },
  thumbCanvas: { width: THUMB, height: THUMB, borderRadius: 10 },
  thumbLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '600' },
  noneThumb: { backgroundColor: 'rgba(255,255,255,0.08)' },
  noneText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },
  tile: { backgroundColor: 'rgba(255,255,255,0.08)' },
  tileIcon: { fontSize: 28 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingBottom: 8 },
  emojiCell: { width: '12.5%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 28 },
});
