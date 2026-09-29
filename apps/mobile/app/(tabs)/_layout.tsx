import { View, StyleSheet, Platform } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useContentWidth } from '@/hooks/useContentWidth';
import { theme } from '@/constants/theme';

export default function TabsLayout() {
  const { session, loading } = useAuth();
  const contentWidth = useContentWidth();

  if (!loading && !session) return <Redirect href="/select-user" />;

  return (
    <View style={[styles.root, { width: contentWidth, maxWidth: contentWidth }]}>
      <Tabs
        tabBar={() => null}
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none', height: 0 },
          sceneStyle: {
            flex: 1,
            backgroundColor: theme.colors.background,
            overflow: 'hidden',
            ...(Platform.OS === 'web' ? { width: contentWidth, maxWidth: contentWidth } : {}),
          },
        }}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="map" />
        <Tabs.Screen name="camera" />
        <Tabs.Screen name="album" />
        <Tabs.Screen name="plans" />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, overflow: 'hidden', alignSelf: 'center', backgroundColor: theme.colors.background },
});
