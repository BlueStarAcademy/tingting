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
  {
    id: 'andong-mask',
    question: {
      ko: '하회별신굿탈놀이로 유명한 경북 도시는?',
      en: 'Which Gyeongbuk city is famous for Hahoe mask dance?',
    },
    options: {
      ko: ['안동', '영주', '상주', '문경'],
      en: ['Andong', 'Yeongju', 'Sangju', 'Mungyeong'],
    },
    correctIndex: 0,
  },
  {
    id: 'suwon-fortress',
    question: {
      ko: '유네스코 세계유산인 화성(華城)이 있는 도시는?',
      en: 'Which city has the UNESCO World Heritage Hwaseong Fortress?',
    },
    options: {
      ko: ['수원', '성남', '용인', '화성'],
      en: ['Suwon', 'Seongnam', 'Yongin', 'Hwaseong'],
    },
    correctIndex: 0,
  },
  {
    id: 'damyang-bamboo',
    question: {
      ko: '죽녹원(대나무 숲)으로 유명한 전남 지역은?',
      en: 'Which Jeonnam area is famous for its bamboo forest (Juknokwon)?',
    },
    options: {
      ko: ['담양', '곡성', '구례', '보성'],
      en: ['Damyang', 'Gokseong', 'Gurye', 'Boseong'],
    },
    correctIndex: 0,
  },
  {
    id: 'incheon-airport',
    question: {
      ko: '대한민국의 관문 공항으로 영종도에 위치한 공항은?',
      en: 'Which airport on Yeongjong Island serves as Korea\'s main gateway?',
    },
    options: {
      ko: ['인천국제공항', '김포공항', '제주공항', '김해공항'],
      en: ['Incheon Intl.', 'Gimpo', 'Jeju', 'Gimhae'],
    },
    correctIndex: 0,
  },
  {
    id: 'tongyeong-cable',
    question: {
      ko: '한려수도 조망과 케이블카로 유명한 경남 해안 도시는?',
      en: 'Which Gyeongnam coastal city is known for its cable car and sea views?',
    },
    options: {
      ko: ['통영', '거제', '사천', '남해'],
      en: ['Tongyeong', 'Geoje', 'Sacheon', 'Namhae'],
    },
    correctIndex: 0,
  },
  {
    id: 'boseong-tea',
    question: {
      ko: '초록빛 녹차밭으로 유명한 전남 지역은?',
      en: 'Which Jeonnam area is famous for its green tea fields?',
    },
    options: {
      ko: ['보성', '담양', '해남', '완도'],
      en: ['Boseong', 'Damyang', 'Haenam', 'Wando'],
    },
    correctIndex: 0,
  },
  {
    id: 'dna-shape',
    question: {
      ko: 'DNA의 구조를 가장 잘 설명한 것은?',
      en: 'Which best describes the structure of DNA?',
    },
    options: {
      ko: ['이중 나선', '단일 직선', '삼중 나선', '원형 고리'],
      en: ['Double helix', 'Single strand', 'Triple helix', 'Circular ring'],
    },
    correctIndex: 0,
  },
  {
    id: 'highest-mountain',
    question: {
      ko: '세계에서 가장 높은 산은?',
      en: 'What is the tallest mountain in the world?',
    },
    options: {
      ko: ['에베레스트', 'K2', '칸첸중가', '마카루'],
      en: ['Everest', 'K2', 'Kangchenjunga', 'Makalu'],
    },
    correctIndex: 0,
  },
  {
    id: 'blood-types',
    question: {
      ko: 'ABO 혈액형 분류에서 존재하지 않는 혈액형은?',
      en: 'Which blood type does NOT exist in the ABO system?',
    },
    options: {
      ko: ['C형', 'A형', 'B형', 'O형'],
      en: ['Type C', 'Type A', 'Type B', 'Type O'],
    },
    correctIndex: 0,
  },
  {
    id: 'vitamin-c-source',
    question: {
      ko: '비타민 C가 풍부한 과일로 가장 적절한 것은?',
      en: 'Which fruit is richest in vitamin C?',
    },
    options: {
      ko: ['키위', '바나나', '포도', '사과'],
      en: ['Kiwi', 'Banana', 'Grape', 'Apple'],
    },
    correctIndex: 0,
  },
  {
    id: 'sahara-location',
    question: {
      ko: '사하라 사막은 어느 대륙에 있을까요?',
      en: 'On which continent is the Sahara Desert?',
    },
    options: {
      ko: ['아프리카', '아시아', '호주', '남아메리카'],
      en: ['Africa', 'Asia', 'Australia', 'South America'],
    },
    correctIndex: 0,
  },
  {
    id: 'beethoven-work',
    question: {
      ko: '베토벤이 작곡한 교향곡의 수는 몇 곡일까요?',
      en: 'How many symphonies did Beethoven compose?',
    },
    options: {
      ko: ['9곡', '5곡', '12곡', '7곡'],
      en: ['9', '5', '12', '7'],
    },
    correctIndex: 0,
  },
  {
    id: 'gravity-discoverer',
    question: {
      ko: '만유인력의 법칙을 발견한 과학자는?',
      en: 'Who discovered the law of universal gravitation?',
    },
    options: {
      ko: ['뉴턴', '아인슈타인', '갈릴레오', '다윈'],
      en: ['Newton', 'Einstein', 'Galileo', 'Darwin'],
    },
    correctIndex: 0,
  },
  {
    id: 'korean-flag-name',
    question: {
      ko: '대한민국 국기의 명칭은?',
      en: 'What is the name of the South Korean national flag?',
    },
    options: {
      ko: ['태극기', '일장기', '성조기', '삼색기'],
      en: ['Taegeukgi', 'Hinomaru', 'Stars and Stripes', 'Tricolore'],
    },
    correctIndex: 0,
  },
  {
    id: 'amazon-river',
    question: {
      ko: '세계에서 유역 면적이 가장 넓은 강은?',
      en: 'Which river has the largest drainage basin in the world?',
    },
    options: {
      ko: ['아마존강', '나일강', '양쯔강', '미시시피강'],
      en: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'],
    },
    correctIndex: 0,
  },
  {
    id: 'oxygen-symbol',
    question: {
      ko: '산소의 원소 기호는?',
      en: 'What is the chemical symbol for oxygen?',
    },
    options: {
      ko: ['O', 'Ox', 'Og', 'Os'],
      en: ['O', 'Ox', 'Og', 'Os'],
    },
    correctIndex: 0,
  },
  {
    id: 'korea-neighbors',
    question: {
      ko: '한반도와 국경을 접하고 있는 국가가 아닌 것은?',
      en: 'Which country does NOT border the Korean Peninsula?',
    },
    options: {
      ko: ['일본', '중국', '러시아', '북한'],
      en: ['Japan', 'China', 'Russia', 'North Korea'],
    },
    correctIndex: 0,
  },
  {
    id: 'heart-chambers',
    question: {
      ko: '사람의 심장은 몇 개의 방으로 나뉘어 있을까요?',
      en: 'How many chambers does the human heart have?',
    },
    options: {
      ko: ['4개', '2개', '3개', '5개'],
      en: ['4', '2', '3', '5'],
    },
    correctIndex: 0,
  },
  {
    id: 'internet-www',
    question: {
      ko: 'WWW의 풀네임으로 올바른 것은?',
      en: 'What does WWW stand for?',
    },
    options: {
      ko: ['World Wide Web', 'World Wired Web', 'Wide World Web', 'Web World Wide'],
      en: ['World Wide Web', 'World Wired Web', 'Wide World Web', 'Web World Wide'],
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

export function pickQuizQuestions(count = 8, excludeIds: Set<string> = new Set()): QuizQuestion[] {
  const available = QUIZ_QUESTIONS.filter((q) => !excludeIds.has(q.id));
  const pool = available.length >= count ? available : [...QUIZ_QUESTIONS];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length)).map(shuffleOptionOrder);
}
