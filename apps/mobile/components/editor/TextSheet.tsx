import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { theme } from '@/constants/theme';
import type { TextItem, TextLook } from '@/lib/editor/types';

export type TextDraft = Pick<TextItem, 'text' | 'color' | 'look' | 'bold'>;

type Props = {
  visible: boolean;
  initial: TextDraft | null;
  onClose: () => void;
  onSubmit: (draft: TextDraft) => void;
  onDelete?: () => void;
};

const COLORS = ['#FFFFFF', '#2D1F24', '#E0607E', '#F58BA0', '#F4A261', '#FFD166', '#7BD389', '#5B8DEF', '#9C89D9', '#3DB5C7'];

const LOOKS: { id: TextLook; label: string }[] = [
  { id: 'plain', label: '기본' },
  { id: 'shadow', label: '그림자' },
  { id: 'box', label: '박스' },
  { id: 'neon', label: '네온' },
];

const EMPTY: TextDraft = { text: '', color: '#FFFFFF', look: 'shadow', bold: true };

export function TextSheet({ visible, initial, onClose, onSubmit, onDelete }: Props) {
  const [draft, setDraft] = useState<TextDraft>(initial ?? EMPTY);

  useEffect(() => {
    if (visible) setDraft(initial ?? EMPTY);
  }, [visible, initial]);

  const submit = () => {
    if (!draft.text.trim()) {
      onClose();
      return;
    }
    onSubmit({ ...draft, text: draft.text.trim() });
  };

  const previewStyle =
    draft.look === 'box'
      ? { backgroundColor: draft.color, color: isLight(draft.color) ? '#2D1F24' : '#FFFFFF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 }
      : draft.look === 'neon'
        ? { color: '#FFFFFF', textShadowColor: draft.color, textShadowRadius: 12 }
        : draft.look === 'shadow'
          ? { color: draft.color, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 2 } }
          : { color: draft.color };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.headerBtn}>취소</Text>
          </Pressable>
          {onDelete ? (
            <Pressable onPress={onDelete} hitSlop={10}>
              <Text style={[styles.headerBtn, { color: '#FF8A8A' }]}>삭제</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={submit} hitSlop={10}>
            <Text style={[styles.headerBtn, { color: theme.colors.primaryLight }]}>완료</Text>
          </Pressable>
        </View>

        <View style={styles.center}>
          <TextInput
            value={draft.text}
            onChangeText={(text) => setDraft((d) => ({ ...d, text }))}
            placeholder="텍스트를 입력하세요"
            placeholderTextColor="rgba(255,255,255,0.45)"
            multiline
            autoFocus
            style={[styles.input, { fontWeight: draft.bold ? '800' : '500' }, previewStyle]}
          />
        </View>

        <View style={styles.controls}>
          <View style={styles.row}>
            {LOOKS.map((look) => (
              <Pressable
                key={look.id}
                onPress={() => setDraft((d) => ({ ...d, look: look.id }))}
                style={[styles.chip, draft.look === look.id && styles.chipOn]}
              >
                <Text style={styles.chipText}>{look.label}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setDraft((d) => ({ ...d, bold: !d.bold }))} style={[styles.chip, draft.bold && styles.chipOn]}>
              <Text style={[styles.chipText, { fontWeight: '900' }]}>B</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colors} keyboardShouldPersistTaps="always">
            {COLORS.map((color) => (
              <Pressable
                key={color}
                onPress={() => setDraft((d) => ({ ...d, color }))}
                style={[styles.swatch, { backgroundColor: color }, draft.color === color && styles.swatchOn]}
              />
            ))}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function isLight(hex: string): boolean {
  const n = parseInt(hex.replace('#', ''), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 170;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(10,6,8,0.86)' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
  },
  headerBtn: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  input: { fontSize: 30, textAlign: 'center', minWidth: 120, maxWidth: '100%' },
  controls: { paddingBottom: 18, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  chipOn: { backgroundColor: theme.colors.primary },
  chipText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  colors: { paddingHorizontal: 16, gap: 10 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)' },
  swatchOn: { borderColor: '#FFFFFF', transform: [{ scale: 1.12 }] },
});
