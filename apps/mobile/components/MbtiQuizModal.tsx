import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MBTI_QUESTIONS, calculateMbti } from '@/lib/mbti-quiz';
import { useLocale } from '@/hooks/useLocale';
import { AppModal } from '@/components/AppModal';
import { PremiumButton } from '@/components/PremiumButton';
import { PremiumTextButton } from '@/components/PremiumIconButton';
import { theme } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onComplete: (mbti: string) => void;
}

export function MbtiQuizModal({ visible, onClose, onComplete }: Props) {
  const { t } = useLocale();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B'>>({});

  const question = MBTI_QUESTIONS[step];
  const progress = ((step + 1) / MBTI_QUESTIONS.length) * 100;

  const reset = () => {
    setStep(0);
    setAnswers({});
  };

  const choose = (choice: 'A' | 'B') => {
    const next = { ...answers, [question.id]: choice };
    setAnswers(next);
    if (step + 1 >= MBTI_QUESTIONS.length) {
      onComplete(calculateMbti(next));
      reset();
    } else {
      setStep(step + 1);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!question) return null;

  return (
    <AppModal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      variant="fullscreen"
      transparent={false}
      dismissOnBackdrop={false}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('profile.mbtiQuiz')}</Text>
          <PremiumTextButton title={t('header.cancel')} onPress={handleClose} />
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.step}>
          {step + 1} / {MBTI_QUESTIONS.length}
        </Text>
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.question}>{question.text}</Text>
          <PremiumButton title={question.optionA.label} variant="outline" onPress={() => choose('A')} />
          <PremiumButton title={question.optionB.label} variant="outline" onPress={() => choose('B')} />
        </ScrollView>
      </SafeAreaView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '800' },
  progressTrack: {
    height: 4,
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: theme.colors.primaryLight },
  step: { color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing.sm },
  body: { padding: theme.spacing.lg, gap: theme.spacing.md },
  question: { color: theme.colors.text, fontSize: 20, fontWeight: '700', lineHeight: 28, marginBottom: theme.spacing.md },
});
