import { useCallback, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PremiumButton } from '@/components/PremiumButton';
import { ADDITIONAL_GROUP_COST } from '@tingting/shared';
import { api } from '@/lib/api';
import { theme } from '@/constants/theme';

export default function CreateGroupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [ownedCount, setOwnedCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      api.getGroups().then((groups) => setOwnedCount(groups.length));
    }, [])
  );

  const isFirstGroup = ownedCount < 1;
  const cost = isFirstGroup ? 0 : ADDITIONAL_GROUP_COST;

  const submit = async () => {
    if (!name.trim()) return Alert.alert('알림', '그룹 이름을 입력해 주세요');
    setLoading(true);
    try {
      if (cost > 0) {
        Alert.alert('스타 사용', `추가 그룹 생성에 ✦ ${cost} 스타가 필요합니다. 계속할까요?`, [
          { text: '취소', style: 'cancel', onPress: () => setLoading(false) },
          { text: '계속', onPress: () => doCreate() },
        ]);
        return;
      }
      await doCreate();
    } catch (e: unknown) {
      Alert.alert('오류', e instanceof Error ? e.message : '실패했습니다');
      setLoading(false);
    }
  };

  const doCreate = async () => {
    setLoading(true);
    try {
      const { group, cost: spent } = await api.createGroup(name.trim(), description.trim() || undefined);
      Alert.alert('생성 완료', spent > 0 ? `그룹이 생성되었습니다 (-${spent} 스타)` : '첫 그룹은 무료입니다!');
      router.replace('/group/' + group.id);
    } catch (e: unknown) {
      Alert.alert('오류', e instanceof Error ? e.message : '실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ScreenHeader title="새 그룹 만들기" showBack />
        <View style={styles.costRow}>
          <Text style={styles.hint}>계정당 첫 번째 그룹은 무료, 두 번째부터 스타가 필요합니다.</Text>
          {isFirstGroup ? (
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>FREE</Text>
            </View>
          ) : (
            <View style={styles.starBadge}>
              <Text style={styles.starBadgeText}>✦ {ADDITIONAL_GROUP_COST}</Text>
            </View>
          )}
        </View>
        <TextInput
          style={styles.input}
          placeholder="그룹 이름"
          placeholderTextColor={theme.colors.textMuted}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="설명 (선택)"
          placeholderTextColor={theme.colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <PremiumButton
          title={isFirstGroup ? '그룹 만들기 (무료)' : `그룹 만들기 (✦ ${ADDITIONAL_GROUP_COST})`}
          onPress={submit}
          loading={loading}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, padding: theme.spacing.lg },
  costRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md, gap: theme.spacing.sm },
  hint: { color: theme.colors.textMuted, fontSize: 14, flex: 1 },
  freeBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
  },
  freeBadgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  starBadge: {
    backgroundColor: 'rgba(251,191,36,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.star,
  },
  starBadgeText: { color: theme.colors.star, fontWeight: '800', fontSize: 13 },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
});
