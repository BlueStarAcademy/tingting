import { DEFAULT_TIMEZONE, getDayKey, getDayStartInTimezone } from '@/lib/timezone';

export type MinigameBetCategory = 'stock' | 'lottery' | 'sports' | 'weather';
export type MinigameBetTicketStatus = 'pending' | 'won' | 'lost';

export interface MinigameBetChoice {
  id: string;
  labelKo: string;
  labelEn: string;
}

export interface MinigameBetQuestion {
  id: string;
  category: MinigameBetCategory;
  titleKo: string;
  titleEn: string;
  descriptionKo: string;
  descriptionEn: string;
  resolveDate: string;
  choices: MinigameBetChoice[];
}

export interface MinigameBetTicket {
  id: string;
  questionId: string;
  choiceId: string;
  stake: number;
  status: MinigameBetTicketStatus;
  placedAt: string;
  resolveDate: string;
  settledAt?: string;
  payout?: number;
  fee?: number;
  claimedAt?: string;
  adBonusClaimed?: boolean;
}

export interface MinigameBetDailyState {
  dayKey: string;
  betsPlaced: number;
  extraSlotUnlocked: boolean;
}

export interface MinigameBetPool {
  questionId: string;
  totalStars: number;
  byChoice: Record<string, number>;
}

export interface MinigameBetState {
  questions: MinigameBetQuestion[];
  tickets: MinigameBetTicket[];
  pools: Record<string, MinigameBetPool>;
}

export interface MinigameBetPayout {
  grossPayout: number;
  payout: number;
  profit: number;
  fee: number;
  odds: number;
}

export const MINIGAME_BET_MIN_STAKE = 1;
export const MINIGAME_BET_MAX_STAKE = 50;
export const MINIGAME_BET_BASE_CHOICE_POOL = 50;
export const MINIGAME_BET_FEE_RATE = 0.1;
export const MINIGAME_BET_START_HOUR = 7;
export const MINIGAME_BET_END_HOUR = 22;
export const MINIGAME_BET_RESOLVE_HOUR = 22;
export const MINIGAME_BET_RESOLVE_MINUTE = 0;

const UP_DOWN: MinigameBetChoice[] = [
  { id: 'up', labelKo: 'UP', labelEn: 'UP' },
  { id: 'down', labelKo: 'DOWN', labelEn: 'DOWN' },
];

const BASEBALL_MATCHUPS = [
  {
    titleKo: 'LG 트윈스 vs 두산 베어스',
    titleEn: 'LG Twins vs Doosan Bears',
    choices: [
      { id: 'lg', labelKo: 'LG', labelEn: 'LG' },
      { id: 'doosan', labelKo: '두산', labelEn: 'Doosan' },
    ],
  },
  {
    titleKo: 'KIA 타이거즈 vs 삼성 라이온즈',
    titleEn: 'KIA Tigers vs Samsung Lions',
    choices: [
      { id: 'kia', labelKo: 'KIA', labelEn: 'KIA' },
      { id: 'samsung', labelKo: '삼성', labelEn: 'Samsung' },
    ],
  },
  {
    titleKo: '롯데 자이언츠 vs NC 다이노스',
    titleEn: 'Lotte Giants vs NC Dinos',
    choices: [
      { id: 'lotte', labelKo: '롯데', labelEn: 'Lotte' },
      { id: 'nc', labelKo: 'NC', labelEn: 'NC' },
    ],
  },
  {
    titleKo: 'SSG 랜더스 vs 키움 히어로즈',
    titleEn: 'SSG Landers vs Kiwoom Heroes',
    choices: [
      { id: 'ssg', labelKo: 'SSG', labelEn: 'SSG' },
      { id: 'kiwoom', labelKo: '키움', labelEn: 'Kiwoom' },
    ],
  },
] as const;

function stableHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getWeekdayInTimezone(dayKey: string, timeZone = DEFAULT_TIMEZONE): number {
  const [year, month, day] = dayKey.split('-').map(Number);
  const anchor = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(anchor);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekday] ?? 0;
}

export function getBetDayKey(date = new Date(), timeZone = DEFAULT_TIMEZONE): string {
  return getDayKey(timeZone, date);
}

export function getTomorrowKey(date = new Date(), timeZone = DEFAULT_TIMEZONE): string {
  const dayStart = getDayStartInTimezone(timeZone, date);
  const tomorrow = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return getDayKey(timeZone, tomorrow);
}

export function getMinigameBetResolveAt(
  resolveDate: string,
  timeZone = DEFAULT_TIMEZONE,
): Date {
  const [year, month, day] = resolveDate.split('-').map(Number);
  const anchor = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayStart = getDayStartInTimezone(timeZone, anchor);
  return new Date(
    dayStart.getTime()
      + MINIGAME_BET_RESOLVE_HOUR * 60 * 60 * 1000
      + MINIGAME_BET_RESOLVE_MINUTE * 60 * 1000,
  );
}

export function formatMinigameBetResolveAt(
  resolveDate: string,
  locale: 'ko' | 'en',
  timeZone = DEFAULT_TIMEZONE,
): string {
  const at = getMinigameBetResolveAt(resolveDate, timeZone);
  const loc = locale === 'ko' ? 'ko-KR' : 'en-US';
  const datePart = new Intl.DateTimeFormat(loc, {
    timeZone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(at);
  const timePart = new Intl.DateTimeFormat(loc, {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: locale === 'en',
  }).format(at);
  if (locale === 'ko') {
    return `${datePart} ${timePart}`;
  }
  return `${datePart} at ${timePart}`;
}

export function hasMinigameBetResultReady(
  ticket: Pick<MinigameBetTicket, 'resolveDate'>,
  now = new Date(),
  timeZone = DEFAULT_TIMEZONE,
): boolean {
  return now.getTime() >= getMinigameBetResolveAt(ticket.resolveDate, timeZone).getTime();
}

export function canSettleMinigameBet(
  ticket: MinigameBetTicket,
  now = new Date(),
  timeZone = DEFAULT_TIMEZONE,
): boolean {
  return ticket.status === 'pending' && hasMinigameBetResultReady(ticket, now, timeZone);
}

export function isMinigameBetAwaitingResult(
  ticket: MinigameBetTicket,
  now = new Date(),
  timeZone = DEFAULT_TIMEZONE,
): boolean {
  return ticket.status === 'pending' && !hasMinigameBetResultReady(ticket, now, timeZone);
}

export function canPlaceMinigameBet(date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= MINIGAME_BET_START_HOUR && hour < MINIGAME_BET_END_HOUR;
}

export function getMinigameBetRemainingSlots(state: MinigameBetDailyState): {
  remaining: number;
  max: number;
} {
  if (!state.extraSlotUnlocked) {
    return { remaining: state.betsPlaced < 1 ? 1 : 0, max: 1 };
  }
  return { remaining: state.betsPlaced < 2 ? 1 : 0, max: 1 };
}

export function canUnlockMinigameBetExtraSlot(state: MinigameBetDailyState): boolean {
  return state.betsPlaced >= 1 && !state.extraSlotUnlocked;
}

export function formatBetPredictionDate(resolveDate: string, locale: 'ko' | 'en'): string {
  const [year, month, day] = resolveDate.split('-').map(Number);
  if (locale === 'ko') return `${month}월${day}일`;
  const anchor = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(anchor);
}

const BET_CARD_SUBJECTS: Record<string, { ko: string; en: string }> = {
  kosdaq: { ko: '코스닥 상승 vs 하락', en: 'KOSDAQ Up vs Down' },
  kospi: { ko: '코스피 상승 vs 하락', en: 'KOSPI Up vs Down' },
  usdkrw: { ko: '원/달러 상승 vs 하락', en: 'USD/KRW Up vs Down' },
  'temp-even': { ko: '서울 최고기온 홀수 vs 짝수', en: 'Seoul High Odd vs Even' },
  lotto3: { ko: '로또 1등 3명 초과 vs 이하', en: 'Lotto Winners Over 3 vs 3 or Fewer' },
};

export function getBetCardTitle(question: MinigameBetQuestion, locale: 'ko' | 'en'): string {
  const dateLabel = formatBetPredictionDate(question.resolveDate, locale);
  const questionKey = question.id.split(':').pop() ?? '';

  if (question.category === 'sports') {
    const left = locale === 'ko' ? question.choices[0]?.labelKo : question.choices[0]?.labelEn;
    const right = locale === 'ko' ? question.choices[1]?.labelKo : question.choices[1]?.labelEn;
    const league = locale === 'ko' ? 'KBO리그' : 'KBO';
    return `${league} ${dateLabel} ${left} vs ${right}`;
  }

  const subject = BET_CARD_SUBJECTS[questionKey];
  if (subject) {
    return `${dateLabel} ${locale === 'ko' ? subject.ko : subject.en}`;
  }

  const fallback = locale === 'ko' ? question.titleKo : question.titleEn;
  return `${dateLabel} ${fallback}`;
}

export function buildDailyBetQuestions(dayKey = getBetDayKey()): MinigameBetQuestion[] {
  const resolveDate = getTomorrowKey(new Date(`${dayKey}T12:00:00Z`));
  const weekday = getWeekdayInTimezone(dayKey);
  const baseball = BASEBALL_MATCHUPS[stableHash(`${dayKey}:baseball-match`) % BASEBALL_MATCHUPS.length];
  const questions: MinigameBetQuestion[] = [
    {
      id: `${dayKey}:kosdaq`,
      category: 'stock',
      titleKo: '코스닥 상승팀 vs 하락팀',
      titleEn: 'KOSDAQ Up Team vs Down Team',
      descriptionKo: '내일 주식시장 마감 기준 코스닥지수가 전 거래일보다 오를지 내려갈지 예측하세요.',
      descriptionEn: "Predict whether tomorrow's KOSDAQ close will be up or down versus the previous session.",
      resolveDate,
      choices: UP_DOWN,
    },
    {
      id: `${dayKey}:kospi`,
      category: 'stock',
      titleKo: '코스피 상승팀 vs 하락팀',
      titleEn: 'KOSPI Up Team vs Down Team',
      descriptionKo: '내일 주식시장 마감 기준 코스피지수가 전 거래일보다 오를지 내려갈지 예측하세요.',
      descriptionEn: "Predict whether tomorrow's KOSPI close will be up or down versus the previous session.",
      resolveDate,
      choices: UP_DOWN,
    },
    {
      id: `${dayKey}:usdkrw`,
      category: 'stock',
      titleKo: '원/달러 상승팀 vs 하락팀',
      titleEn: 'USD/KRW Up Team vs Down Team',
      descriptionKo: '내일 고시 환율이 오늘보다 오를지 내려갈지 예측하세요.',
      descriptionEn: "Predict whether tomorrow's USD/KRW reference rate will rise or fall.",
      resolveDate,
      choices: UP_DOWN,
    },
    {
      id: `${dayKey}:baseball`,
      category: 'sports',
      titleKo: `야구 대결 · ${baseball.titleKo}`,
      titleEn: `Baseball matchup · ${baseball.titleEn}`,
      descriptionKo: '내일 실제 진행 예정인 대표 경기 중 승자를 예측하세요.',
      descriptionEn: "Pick the winner from tomorrow's featured matchup.",
      resolveDate,
      choices: baseball.choices.map((choice) => ({ ...choice })),
    },
    {
      id: `${dayKey}:temp-even`,
      category: 'weather',
      titleKo: '서울 최고기온 홀수팀 vs 짝수팀',
      titleEn: 'Seoul High Temp Odd Team vs Even Team',
      descriptionKo: '내일 공식 최고기온의 정수값이 홀수일지 짝수일지 예측하세요.',
      descriptionEn: "Predict whether tomorrow's official high temperature integer is odd or even.",
      resolveDate,
      choices: [
        { id: 'odd', labelKo: '홀', labelEn: 'Odd' },
        { id: 'even', labelKo: '짝', labelEn: 'Even' },
      ],
    },
  ];

  if (weekday === 2) {
    questions.splice(3, 0, {
      id: `${dayKey}:lotto3`,
      category: 'lottery',
      titleKo: '로또 1등 3명 초과팀 vs 이하팀',
      titleEn: 'Lotto Jackpot Over 3 Team vs 3 Or Fewer Team',
      descriptionKo: '내일 추첨 결과 1등 당첨자가 3명보다 많을지 적을지 예측하세요.',
      descriptionEn: 'Predict whether jackpot winners will be more or fewer than 3.',
      resolveDate,
      choices: [
        { id: 'over', labelKo: '3명 초과', labelEn: 'Over 3' },
        { id: 'under', labelKo: '3명 이하', labelEn: '3 or fewer' },
      ],
    });
  }

  return questions;
}

export function getDemoWinningChoiceId(question: MinigameBetQuestion): string {
  const index = stableHash(question.id) % question.choices.length;
  return question.choices[index]?.id ?? question.choices[0].id;
}

export function buildMinigameBetPool(
  question: MinigameBetQuestion,
  tickets: MinigameBetTicket[],
): MinigameBetPool {
  const byChoice = question.choices.reduce<Record<string, number>>((acc, choice) => {
    acc[choice.id] = MINIGAME_BET_BASE_CHOICE_POOL;
    return acc;
  }, {});

  tickets
    .filter((ticket) => ticket.questionId === question.id)
    .forEach((ticket) => {
      byChoice[ticket.choiceId] = (byChoice[ticket.choiceId] ?? 0) + ticket.stake;
    });

  return {
    questionId: question.id,
    byChoice,
    totalStars: Object.values(byChoice).reduce((sum, amount) => sum + amount, 0),
  };
}

export function buildMinigameBetPools(
  questions: MinigameBetQuestion[],
  tickets: MinigameBetTicket[],
): Record<string, MinigameBetPool> {
  return questions.reduce<Record<string, MinigameBetPool>>((acc, question) => {
    acc[question.id] = buildMinigameBetPool(question, tickets);
    return acc;
  }, {});
}

export function calculateMinigameBetPayout(
  stake: number,
  choiceId: string,
  pool: MinigameBetPool,
): MinigameBetPayout {
  const winningPool = Math.max(1, pool.byChoice[choiceId] ?? 0);
  const odds = pool.totalStars / winningPool;
  const grossPayout = Math.max(stake, Math.floor(stake * odds));
  const profit = Math.max(0, grossPayout - stake);
  const fee = Math.floor(profit * MINIGAME_BET_FEE_RATE);
  return {
    grossPayout,
    payout: stake + profit - fee,
    profit,
    fee,
    odds,
  };
}
