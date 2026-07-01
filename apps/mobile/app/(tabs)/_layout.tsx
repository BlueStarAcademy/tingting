import { useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs, useFocusEffect } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/hooks/useAuth';
import { useContentWidth } from '@/hooks/useContentWidth';
import { MAIN_TAB_BAR_HEIGHT } from '@/constants/layout';
import { theme } from '@/constants/theme';

export default function TabsLayout() {
  const { refresh } = useAuth();
  const contentWidth = useContentWidth();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  return (
    <View style={[styles.root, { width: contentWidth, maxWidth: contentWidth }]}>
      <AppHeader />
      <View style={styles.tabs}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none', height: 0 },
            sceneStyle: {
              flex: 1,
              backgroundColor: theme.colors.background,
              overflow: 'hidden',
              paddingBottom: MAIN_TAB_BAR_HEIGHT,
              ...(Platform.OS === 'web' ? { width: contentWidth, maxWidth: contentWidth } : {}),
            },
          }}
        >
          <Tabs.Screen name="home" options={{ title: 'Home' }} />
          <Tabs.Screen name="steps" options={{ title: 'Steps' }} />
          <Tabs.Screen name="minigames" options={{ title: 'Games' }} />
          <Tabs.Screen name="ranking" options={{ title: 'Ranking' }} />
          <Tabs.Screen name="shop" options={{ title: 'Shop' }} />
          <Tabs.Screen name="map" options={{ href: null }} />
          <Tabs.Screen name="visits" options={{ href: null }} />
          <Tabs.Screen name="quest" options={{ href: null }} />
          <Tabs.Screen name="my" options={{ href: null }} />
        </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, overflow: 'hidden', alignSelf: 'center', backgroundColor: theme.colors.background },
  tabs: { flex: 1, minHeight: 0, overflow: 'hidden' },
});
