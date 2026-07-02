import type { Locale } from '@/lib/i18n/translations';

type LocalizedText = { ko: string; en: string };
type LocalizedOptions = { ko: string[]; en: string[] };

export function pickLocalizedText(text: LocalizedText, locale: Locale): string {
  if (locale === 'ko') return text.ko;
  return text.en;
}

export function pickLocalizedOptions(options: LocalizedOptions, locale: Locale): string[] {
  if (locale === 'ko') return options.ko;
  return options.en;
}

export interface QuizQuestion {
  id: string;
  question: LocalizedText;
  options: LocalizedOptions;
  correctIndex: number;
}

export const TRAVEL_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'jeju',
    question: {
      ko: '한국의 최남단 섬으로, 한라산과 오름이 유명한 지역은?',
      en: 'Which southern island is famous for Hallasan and oreum hills?',
    },
    options: {
      ko: ['제주', '울릉', '거제', '진도'],
      en: ['Jeju', 'Ulleung', 'Geoje', 'Jindo'],
    },
    correctIndex: 0,
  },
  {
    id: 'gyeongju',
    question: {
      ko: '불국사와 석굴암이 있는 신라 고도는?',
      en: 'Which city is home to Bulguksa Temple and Seokguram Grotto?',
    },
    options: {
      ko: ['경주', '전주', '안동', '공주'],
      en: ['Gyeongju', 'Jeonju', 'Andong', 'Gongju'],
    },
    correctIndex: 0,
  },
  {
    id: 'capital',
    question: {
      ko: '대한민국의 수도는?',
      en: 'What is the capital of South Korea?',
    },
    options: {
      ko: ['서울', '부산', '대구', '인천'],
      en: ['Seoul', 'Busan', 'Daegu', 'Incheon'],
    },
    correctIndex: 0,
  },
  {
    id: 'hanok',
    question: {
      ko: '전통 한옥 마을과 비빔밥으로 유명한 전북의 도시는?',
      en: 'Which Jeolla city is known for hanok villages and bibimbap?',
    },
    options: {
      ko: ['전주', '목포', '순천', '군산'],
      en: ['Jeonju', 'Mokpo', 'Suncheon', 'Gunsan'],
    },
    correctIndex: 0,
  },
  {
    id: 'eastsea',
    question: {
      ko: '동해안의 해돋이 명소로 유명한 강원도 도시는?',
      en: 'Which Gangwon city is famous for sunrise views on the East Sea?',
    },
    options: {
      ko: ['강릉', '천안', '청주', '창원'],
      en: ['Gangneung', 'Cheonan', 'Cheongju', 'Changwon'],
    },
    correctIndex: 0,
  },
  {
    id: 'dmz',
    question: {
      ko: '남북 분단선 근처에서 DMZ 투어를 체험할 수 있는 경기도 지역은?',
      en: 'Which Gyeonggi area offers DMZ tours near the border?',
    },
    options: {
      ko: ['파주', '수원', '안산', '의정부'],
      en: ['Paju', 'Suwon', 'Ansan', 'Uijeongbu'],
    },
    correctIndex: 0,
  },
  {
    id: 'busan',
    question: {
      ko: '해운대와 자갈치 시장으로 유명한 항구 도시는?',
      en: 'Which port city is famous for Haeundae Beach and Jagalchi Market?',
    },
    options: {
      ko: ['부산', '여수', '포항', '통영'],
      en: ['Busan', 'Yeosu', 'Pohang', 'Tongyeong'],
    },
    correctIndex: 0,
  },
  {
    id: 'sokcho',
    question: {
      ko: '설악산 국립공원 입구 도시로, 속초 중앙시장이 있는 곳은?',
      en: 'Which city at Seoraksan National Park has Sokcho Jungang Market?',
    },
    options: {
      ko: ['속초', '춘천', '원주', '태백'],
      en: ['Sokcho', 'Chuncheon', 'Wonju', 'Taebaek'],
    },
    correctIndex: 0,
  },
  {
    id: 'andong',
    question: {
      ko: '하회마을과 안동찜닭으로 유명한 경상북도 도시는?',
      en: 'Which Gyeongbuk city is known for Hahoe Village and Andong jjimdak?',
    },
    options: {
      ko: ['안동', '구미', '경주', '상주'],
      en: ['Andong', 'Gumi', 'Gyeongju', 'Sangju'],
    },
    correctIndex: 0,
  },
  {
    id: 'yeosu',
    question: {
      ko: '2012년 세계박람회가 열렸던 남해안 도시는?',
      en: 'Which southern coastal city hosted Expo 2012?',
    },
    options: {
      ko: ['여수', '목포', '거제', '사천'],
      en: ['Yeosu', 'Mokpo', 'Geoje', 'Sacheon'],
    },
    correctIndex: 0,
  },
  {
    id: 'daejeon',
    question: {
      ko: '한국 중부에 위치한 과학·연구 도시로, 대덕연구단지가 있는 곳은?',
      en: 'Which central city is known for the Daedeok research complex?',
    },
    options: {
      ko: ['대전', '세종', '천안', '청주'],
      en: ['Daejeon', 'Sejong', 'Cheonan', 'Cheongju'],
    },
    correctIndex: 0,
  },
  {
    id: 'ulsan',
    question: {
      ko: '태화강과 대왕암공원이 있는 동해안 산업 도시는?',
      en: 'Which industrial east-coast city has Taehwa River and Daewangam Park?',
    },
    options: {
      ko: ['울산', '포항', '삼척', '동해'],
      en: ['Ulsan', 'Pohang', 'Samcheok', 'Donghae'],
    },
    correctIndex: 0,
  },
];

export function pickQuizQuestions(count = 8): QuizQuestion[] {
  const shuffled = [...TRAVEL_QUIZ_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
