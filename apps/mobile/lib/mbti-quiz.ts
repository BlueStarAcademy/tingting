export type MbtiDimension = 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P';

export interface MbtiQuestion {
  id: string;
  text: string;
  optionA: { label: string; dimension: MbtiDimension };
  optionB: { label: string; dimension: MbtiDimension };
}

export const MBTI_QUESTIONS: MbtiQuestion[] = [
  {
    id: 'q1',
    text: '주말에 에너지를 충전하는 방법은?',
    optionA: { label: '친구들과 함께 외출', dimension: 'E' },
    optionB: { label: '혼자만의 시간', dimension: 'I' },
  },
  {
    id: 'q2',
    text: '새로운 사람을 만날 때 나는…',
    optionA: { label: '먼저 말을 건네는 편', dimension: 'E' },
    optionB: { label: '상대가 말 걸길 기다림', dimension: 'I' },
  },
  {
    id: 'q3',
    text: '여행 중 기억에 남는 것은?',
    optionA: { label: '함께한 사람과의 대화', dimension: 'E' },
    optionB: { label: '혼자 느낀 풍경과 분위기', dimension: 'I' },
  },
  {
    id: 'q4',
    text: '장소를 선택할 때 더 중요한 것은?',
    optionA: { label: '실제 후기와 구체적 정보', dimension: 'S' },
    optionB: { label: '느낌과 새로운 가능성', dimension: 'N' },
  },
  {
    id: 'q5',
    text: '여행 계획을 세울 때…',
    optionA: { label: '세부 일정을 꼼꼼히', dimension: 'S' },
    optionB: { label: '큰 흐름만 정하고 유연하게', dimension: 'N' },
  },
  {
    id: 'q6',
    text: '사진을 찍을 때 나는…',
    optionA: { label: '눈에 보이는 그대로 담는다', dimension: 'S' },
    optionB: { label: '상징과 분위기를 담는다', dimension: 'N' },
  },
  {
    id: 'q7',
    text: '그룹에서 의견이 갈릴 때…',
    optionA: { label: '논리와 효율을 따진다', dimension: 'T' },
    optionB: { label: '분위기와 감정을 우선한다', dimension: 'F' },
  },
  {
    id: 'q8',
    text: '친구가 힘들다고 하면…',
    optionA: { label: '해결 방법을 제안한다', dimension: 'T' },
    optionB: { label: '공감하고 위로한다', dimension: 'F' },
  },
  {
    id: 'q9',
    text: '결정을 내릴 때 더 믿는 것은?',
    optionA: { label: '객관적 판단', dimension: 'T' },
    optionB: { label: '가치와 마음', dimension: 'F' },
  },
  {
    id: 'q10',
    text: '여행 짐을 싸는 스타일은?',
    optionA: { label: '미리 리스트를 만들어 준비', dimension: 'J' },
    optionB: { label: '당일 기분에 맞게 챙김', dimension: 'P' },
  },
  {
    id: 'q11',
    text: '일정이 바뀌면…',
    optionA: { label: '불편하고 빨리 정리하고 싶다', dimension: 'J' },
    optionB: { label: '오히려 새로운 재미가 생긴다', dimension: 'P' },
  },
  {
    id: 'q12',
    text: '여행 마무리 방식은?',
    optionA: { label: '정리하고 다음 계획까지 세운다', dimension: 'J' },
    optionB: { label: '여운을 즐기며 자유롭게 마친다', dimension: 'P' },
  },
];

export function calculateMbti(answers: Record<string, 'A' | 'B'>): string {
  const scores: Record<MbtiDimension, number> = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  for (const q of MBTI_QUESTIONS) {
    const choice = answers[q.id];
    if (!choice) continue;
    const dim = choice === 'A' ? q.optionA.dimension : q.optionB.dimension;
    scores[dim] += 1;
  }
  return (
    (scores.E >= scores.I ? 'E' : 'I') +
    (scores.S >= scores.N ? 'S' : 'N') +
    (scores.T >= scores.F ? 'T' : 'F') +
    (scores.J >= scores.P ? 'J' : 'P')
  );
}
