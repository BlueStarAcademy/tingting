import { View, Text, StyleSheet, Pressable } from 'react-native';
import { AppHeader } from '@/components/AppHeader';

/** @deprecated AppHeader 또는 AppScreen을 사용하세요 */
export function ScreenHeader({ title, showBack }: { title: string; showBack?: boolean }) {
  return (
    <View style={styles.wrap}>
      <AppHeader title={title} showBack={showBack} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 0 },
});
