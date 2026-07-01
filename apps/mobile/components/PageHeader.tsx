import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { screenSubStyle, screenTitleStyle } from '@/lib/ui';
import { theme } from '@/constants/theme';

interface Props {
  title: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
}

export function PageHeader({ title, subtitle, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginBottom: theme.spacing.sm },
  title: screenTitleStyle(),
  sub: screenSubStyle(),
});
