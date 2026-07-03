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

/** 여행 + 일반 상식 퀴즈 풀 */
export const QUIZ_QUESTIONS: QuizQuestion[] = [
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
    id: 'water-boil',
    question: {
      ko: '해수면에서 물이 끓기 시작하는 온도는 약 몇 도일까요?',
      en: 'At sea level, water boils at about what temperature?',
    },
    options: {
      ko: ['100°C', '90°C', '80°C', '120°C'],
      en: ['100°C', '90°C', '80°C', '120°C'],
    },
    correctIndex: 0,
  },
  {
    id: 'planets-count',
    question: {
      ko: '태양계 행성(왜행성 제외)의 개수는?',
      en: 'How many planets are in our solar system (excluding dwarf planets)?',
    },
    options: {
      ko: ['8개', '7개', '9개', '10개'],
      en: ['8', '7', '9', '10'],
    },
    correctIndex: 0,
  },
  {
    id: 'pi-approx',
    question: {
      ko: '원주율 π의 대표적인 근사값은?',
      en: 'What is a common approximation of pi (π)?',
    },
    options: {
      ko: ['3.14', '2.71', '1.62', '3.41'],
      en: ['3.14', '2.71', '1.62', '3.41'],
    },
    correctIndex: 0,
  },
  {
    id: 'gold-symbol',
    question: {
      ko: '원소 기호 "Au"는 어떤 금속을 뜻할까요?',
      en: 'The element symbol "Au" stands for which metal?',
    },
    options: {
      ko: ['금', '은', '구리', '알루미늄'],
      en: ['Gold', 'Silver', 'Copper', 'Aluminum'],
    },
    correctIndex: 0,
  },
  {
    id: 'human-bones',
    question: {
      ko: '성인 인체 뼈의 개수는 대략 몇 개일까요?',
      en: 'About how many bones does an adult human body have?',
    },
    options: {
      ko: ['206개', '150개', '300개', '180개'],
      en: ['206', '150', '300', '180'],
    },
    correctIndex: 0,
  },
  {
    id: 'rainbow-colors',
    question: {
      ko: '무지개에 포함되는 색의 개수로 널리 알려진 것은?',
      en: 'How many colors are commonly said to be in a rainbow?',
    },
    options: {
      ko: ['7가지', '5가지', '6가지', '8가지'],
      en: ['7', '5', '6', '8'],
    },
    correctIndex: 0,
  },
  {
    id: 'year-months',
    question: {
      ko: '1년은 몇 개월로 이루어져 있을까요?',
      en: 'How many months are in one year?',
    },
    options: {
      ko: ['12개월', '10개월', '13개월', '11개월'],
      en: ['12', '10', '13', '11'],
    },
    correctIndex: 0,
  },
  {
    id: 'korean-alphabet',
    question: {
      ko: '한글 자음·모음을 체계적으로 만든 조선의 왕은?',
      en: 'Which Joseon king created the Korean alphabet (Hangul)?',
    },
    options: {
      ko: ['세종대왕', '태조', '정조', '광해군'],
      en: ['King Sejong', 'Taejo', 'Jeongjo', 'Gwanghaegun'],
    },
    correctIndex: 0,
  },
  {
    id: 'world-war2-end',
    question: {
      ko: '제2차 세계대전이 종전된 연도는?',
      en: 'In which year did World War II end?',
    },
    options: {
      ko: ['1945년', '1939년', '1950년', '1918년'],
      en: ['1945', '1939', '1950', '1918'],
    },
    correctIndex: 0,
  },
  {
    id: 'speed-of-light',
    question: {
      ko: '빛의 속도에 가장 가까운 값은? (진공 기준)',
      en: 'Which value is closest to the speed of light in a vacuum?',
    },
    options: {
      ko: ['약 30만 km/s', '약 3만 km/s', '약 340 m/s', '약 1500 m/s'],
      en: ['~300,000 km/s', '~30,000 km/s', '~340 m/s', '~1,500 m/s'],
    },
    correctIndex: 0,
  },
  {
    id: 'largest-ocean',
    question: {
      ko: '지구에서 가장 넓은 바다는?',
      en: 'What is the largest ocean on Earth?',
    },
    options: {
      ko: ['태평양', '대서양', '인도양', '북극해'],
      en: ['Pacific', 'Atlantic', 'Indian', 'Arctic'],
    },
    correctIndex: 0,
  },
  {
    id: 'cpu-meaning',
    question: {
      ko: '컴퓨터 CPU의 역할로 가장 알맞은 것은?',
      en: 'What is the main role of a computer CPU?',
    },
    options: {
      ko: ['연산과 명령 처리', '화면 출력', '인터넷 연결', '파일 저장'],
      en: ['Processing instructions', 'Display output', 'Internet connection', 'File storage'],
    },
    correctIndex: 0,
  },
  {
    id: 'triangle-angles',
    question: {
      ko: '평면 삼각형의 내각의 합은?',
      en: 'What is the sum of interior angles in a flat triangle?',
    },
    options: {
      ko: ['180°', '90°', '360°', '270°'],
      en: ['180°', '90°', '360°', '270°'],
    },
    correctIndex: 0,
  },
  {
    id: 'olympics-symbol',
    question: {
      ko: '올림픽 오륜기에 연결된 고리의 개수는?',
      en: 'How many rings are on the Olympic flag?',
    },
    options: {
      ko: ['5개', '4개', '6개', '7개'],
      en: ['5', '4', '6', '7'],
    },
    correctIndex: 0,
  },
  {
    id: 'photosynthesis',
    question: {
      ko: '식물이 햇빛으로 양분을 만드는 과정을 무엇이라 할까요?',
      en: 'What is the process by which plants make food using sunlight?',
    },
    options: {
      ko: ['광합성', '호흡', '발효', '증발'],
      en: ['Photosynthesis', 'Respiration', 'Fermentation', 'Evaporation'],
    },
    correctIndex: 0,
  },
  {
    id: 'moon-gravity',
    question: {
      ko: '지구에서 가장 가까운 천체는?',
      en: 'What is the closest celestial body to Earth?',
    },
    options: {
      ko: ['달', '화성', '금성', '태양'],
      en: ['The Moon', 'Mars', 'Venus', 'The Sun'],
    },
    correctIndex: 0,
  },
  {
    id: 'music-notes',
    question: {
      ko: '서양 음계의 기본 음 이름 7개에 포함되지 않는 것은?',
      en: 'Which is NOT one of the seven basic note names in Western music?',
    },
    options: {
      ko: ['H', 'C', 'D', 'G'],
      en: ['H', 'C', 'D', 'G'],
    },
    correctIndex: 0,
  },
  {
    id: 'chess-pieces',
    question: {
      ko: '체스에서 가로·세로·대각선으로 자유롭게 이동하는 기물은?',
      en: 'In chess, which piece moves freely in any straight line?',
    },
    options: {
      ko: ['퀸(여왕)', '나이트', '폰', '킹'],
      en: ['Queen', 'Knight', 'Pawn', 'King'],
    },
    correctIndex: 0,
  },
  {
    id: 'currency-korea',
    question: {
      ko: '대한민국의 공식 화폐 단위는?',
      en: 'What is the official currency unit of South Korea?',
    },
    options: {
      ko: ['원', '엔', '위안', '달러'],
      en: ['Won', 'Yen', 'Yuan', 'Dollar'],
    },
    correctIndex: 0,
  },
  {
    id: 'earth-shape',
    question: {
      ko: '지구의 모양을 가장 잘 설명하는 것은?',
      en: 'Which best describes the shape of Earth?',
    },
    options: {
      ko: ['약간 납작한 구형', '완전한 구', '정육면체', '평면'],
      en: ['Slightly flattened sphere', 'Perfect sphere', 'Cube', 'Flat plane'],
    },
    correctIndex: 0,
  },
];

/** @deprecated use QUIZ_QUESTIONS */
export const TRAVEL_QUIZ_QUESTIONS = QUIZ_QUESTIONS;

function shuffleOptionOrder(question: QuizQuestion): QuizQuestion {
  const order = question.options.ko.map((_, index) => index).sort(() => Math.random() - 0.5);
  return {
    ...question,
    options: {
      ko: order.map((index) => question.options.ko[index]),
      en: order.map((index) => question.options.en[index]),
    },
    correctIndex: order.indexOf(question.correctIndex),
  };
}

export function pickQuizQuestions(count = 8): QuizQuestion[] {
  const shuffled = [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length)).map(shuffleOptionOrder);
}
