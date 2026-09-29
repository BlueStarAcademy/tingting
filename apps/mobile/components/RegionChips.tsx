import { StyleSheet, View } from 'react-native';
import { REGIONS } from '@tingting/shared';
import { Chip } from '@/components/ui';

export function RegionChips({
  value,
  onChange,
  allowAll,
}: {
  value: string | null;
  onChange: (code: string | null) => void;
  allowAll?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      {allowAll ? <Chip label="전국" active={value === null} onPress={() => onChange(null)} /> : null}
      {REGIONS.map((r) => (
        <Chip key={r.code} label={r.name} active={value === r.code} onPress={() => onChange(r.code)} color={r.color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
