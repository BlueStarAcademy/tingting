import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

export function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.grabber} />
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>
        <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={20} color={theme.colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 8, paddingHorizontal: theme.spacing.lg },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderStrong,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.tint.soft,
  },
});
