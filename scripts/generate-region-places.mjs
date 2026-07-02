/**
 * Generates seed/places.json with food, stay, play, sight, event per region.
 * Run: node scripts/generate-region-places.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const SIGHT_CATS = new Set(['heritage', 'landmark', 'nature', 'mountain', 'sea', 'park']);
const PLAY_CATS = new Set(['beach', 'culture', 'activity', 'science', 'city']);

const REGION_META = {
  SEO: { lat: 37.5665, lng: 126.978, food: ['을지로 골목식당', '을지로 전통 골목의 한식 맛집'], stay: ['포시즌스 호텔 서울', '광화문 인근 럭셔리 호텔'], play: ['한강공원', '자전거·피크닉·야경을 즐기는 서울 대표 공원'], sight: ['덕수궁', '서울 도심 속 조선 왕궁'], event: ['서울 빛초롱 축제', '매년 가을 서울 전역 등불 축제'] },
  BUS: { lat: 35.1796, lng: 129.0756, food: ['할매집 돼지국밥', '부산 원조 돼지국밥 맛집'], stay: ['파라다이스 호텔 부산', '해운대 해변 인근 5성급 호텔'], play: ['해운대 요트투어', '해상에서 즐기는 부산 바다 체험'], sight: ['용두산공원', '부산항과 도심을 한눈에 보는 전망'], event: ['부산 불꽃축제', '광안리 해변 대형 불꽃쇼'] },
  DAE: { lat: 35.8714, lng: 128.6014, food: ['동인동 찜갈비', '대구 대표 찜갈비 골목'], stay: ['인터불고 호텔 대구', '동성로 중심 비즈니스 호텔'], play: ['이월드', '대구 대표 테마파크'], sight: ['83타워', '대구 시내 전망 타워'], event: ['치맥 페스티벌', '대구 치킨·맥주 축제'] },
  ICN: { lat: 37.4563, lng: 126.7052, food: ['신포닭강정', '인천 차이나타운 닭강정 명물'], stay: ['송도 센트럴파크 호텔', '송도 국제도시 호텔'], play: ['월미바다열차', '월미도 해안 레일 체험'], sight: ['인천대교 전망', '서해를 가로지르는 대교 야경'], event: ['인천 펜타포트 락페스티벌', '송도 해변 대형 음악 축제'] },
  GWJ: { lat: 35.1595, lng: 126.8526, food: ['송정 떡갈비', '광주 대표 떡갈비 거리'], stay: ['라마다 플라자 광주', '무등산 인근 시내 호텔'], play: ['무등산 케이블카', '광주 상징 산 케이블카'], sight: ['518기념공원', '민주화 역사 기념 공원'], event: ['광주 비엔날레', '국제 현대미술 전시 행사'] },
  DJN: { lat: 36.3504, lng: 127.3845, food: ['성심당 튀김소보로', '대전 대표 베이커리'], stay: ['유성호텔', '유성온천 지구 숙박'], play: ['엑스포과학공원', '대전 과학 체험 테마파크'], sight: ['한밭수목원', '국내 최대 도심 수목원'], event: ['대전 0시 축제', '대덕연구단지 야간 문화행사'] },
  ULS: { lat: 35.5384, lng: 129.3114, food: ['울산 왕갈비', '울산 대표 소갈비 맛집'], stay: ['울산 현대호텔', '태화강 인근 시내 호텔'], play: ['간절곶 일출', '한반도 최동단 일출 명소'], sight: ['대왕암공원', '울산 해안 절경'], event: ['울산 태화강 축제', '대나무숲 야간 공연'] },
  SJG: { lat: 36.48, lng: 127.289, food: ['세종 전통시장 국밥', '세종 행정수도 전통시장 맛집'], stay: ['세종 Lake Hotel', '호수공원 인근 호텔'], play: ['세종호수공원 수상자전거', '인공호수 레저 체험'], sight: ['정부세종청사 전망', '행정수도 랜드마크'], event: ['세종 문화예술제', '호수공원 야외 공연'] },
  GGD: { lat: 37.2636, lng: 127.0286, food: ['수원 왕갈비통닭', '수원화성 인근 명물 치킨'], stay: ['라마다 수원', '수원 화성 인근 호텔'], play: ['에버랜드', '경기 대표 테마파크'], sight: ['수원화성', '유네스코 세계유산'], event: ['수원 화성문화제', '연등·전통 공연 축제'] },
  GWN: { lat: 37.8228, lng: 128.1555, food: ['강릉 초당순두부', '동해안 순두부 명물'], stay: ['씨마크호텔', '강릉 해변 리조트'], play: ['평창 알펜시아', '스키·골프 리조트'], sight: ['설악산 국립공원', '강원 대표 산'], event: ['강릉 단오제', '유네스코 무형문화 축제'] },
  NCB: { lat: 36.6357, lng: 127.4917, food: ['청주 오창 한우', '충북 대표 한우 맛집'], stay: ['청주 스카이호텔', '청주 시내 중심 호텔'], play: ['청주 뮤지엄 산', '현대미술 체험'], sight: ['속리산 법주사', '국립공원 사찰'], event: ['청주 공예비엔날레', '세계 공예 전시'] },
  SCB: { lat: 36.5184, lng: 126.8, food: ['공주 한정식', '백제 고도 전통 한정식'], stay: ['라한셀렉트 공주', '공산성 인근 호텔'], play: ['대천 해수욕장', '서해 대표 해수욕장'], sight: ['공산성', '백제 역사 유적'], event: ['부여 백제문화제', '백제 역사 문화 축제'] },
  NJB: { lat: 35.8242, lng: 127.148, food: ['전주 비빔밥 거리', '전주 한옥마을 비빔밥'], stay: ['전주 한옥스테이', '한옥마을 전통 숙소'], play: ['전주 한옥마을 체험', '전통 공예·한복 체험'], sight: ['경기전', '조선 왕실 사당'], event: ['전주 세계소리축제', '국제 음악 축제'] },
  SJB: { lat: 34.8679, lng: 126.991, food: ['여수 돌게장', '남해안 해산물 명물'], stay: ['여수 오션호텔', '여수 밤바다 전망 호텔'], play: ['순천만 습지열차', '갈대밭 생태 체험'], sight: ['순천만 국가정원', '갈대 습지 생태'], event: ['보성 다원대축제', '녹차밭 문화 축제'] },
  NGB: { lat: 36.4919, lng: 128.8889, food: ['안동 찜닭', '경북 대표 찜닭'], stay: ['경주 힐튼', '경주 역사지구 호텔'], play: ['안동 하회마을 체험', '전통 마을 문화 체험'], sight: ['불국사', '신라 불교 유적'], event: ['경주 세계문화엑스포 공원 행사', '역사 문화 야간 행사'] },
  SGB: { lat: 35.4606, lng: 128.2132, food: ['통영 꿀빵', '통영 대표 디저트'], stay: ['통영 마리나 리조트', '남해 해안 리조트'], play: ['통영 케이블카', '한려수도 바다 전망'], sight: ['거제 해금강', '남해 절경'], event: ['진주 남강유등축제', '유등 띄우기 축제'] },
  JEJ: { lat: 33.4996, lng: 126.5312, food: ['흑돼지 거리', '제주 흑돼지 구이 맛집'], stay: ['제주 신라호텔', '서귀포 리조트'], play: ['제주 올레길', '해안 트레킹 코스'], sight: ['성산일출봉', '제주 UNESCO 자연'], event: ['제주 들불축제', '봄 들판 불꽃 축제'] },
};

const ICONIC = [
  { id: 'p-seo-1', regionCode: 'SEO', name: '경복궁', description: '조선 왕조의 법궁', lat: 37.5796, lng: 126.977, category: 'heritage' },
  { id: 'p-seo-2', regionCode: 'SEO', name: '남산타워', description: '서울의 랜드마크', lat: 37.5512, lng: 126.9882, category: 'landmark' },
  { id: 'p-bus-1', regionCode: 'BUS', name: '부산 해운대', description: '부산 대표 해변 · 국내 최고의 바다 휴양지', lat: 35.1587, lng: 129.1604, category: 'beach' },
  { id: 'p-bus-2', regionCode: 'BUS', name: '부산 감천문화마을', description: '부산의 알록달록 예술 마을', lat: 35.0975, lng: 129.0107, category: 'culture' },
  { id: 'p-dae-1', regionCode: 'DAE', name: '동성로', description: '대구의 번화가', lat: 35.8694, lng: 128.5938, category: 'city' },
  { id: 'p-icn-1', regionCode: 'ICN', name: '월미도', description: '인천 바다 전망', lat: 37.4664, lng: 126.5972, category: 'sea' },
  { id: 'p-gwj-1', regionCode: 'GWJ', name: '무등산', description: '광주의 상징', lat: 35.1347, lng: 126.9883, category: 'mountain' },
  { id: 'p-djn-1', regionCode: 'DJN', name: '엑스포과학공원', description: '과학 테마파크', lat: 36.3745, lng: 127.3728, category: 'science' },
  { id: 'p-uls-1', regionCode: 'ULS', name: '대왕암공원', description: '울산 해안 절경', lat: 35.4928, lng: 129.4342, category: 'park' },
  { id: 'p-sjg-1', regionCode: 'SJG', name: '세종호수공원', description: '세종의 중심 공원', lat: 36.504, lng: 127.2495, category: 'park' },
  { id: 'p-ggd-1', regionCode: 'GGD', name: '수원화성', description: '유네스코 세계유산', lat: 37.286, lng: 127.0117, category: 'heritage' },
  { id: 'p-gwn-1', regionCode: 'GWN', name: '설악산', description: '강원 대표 산', lat: 38.1195, lng: 128.4655, category: 'mountain' },
  { id: 'p-ncb-1', regionCode: 'NCB', name: '속리산', description: '국립공원', lat: 36.543, lng: 127.8728, category: 'mountain' },
  { id: 'p-scb-1', regionCode: 'SCB', name: '공주', description: '백제 역사 도시', lat: 36.4465, lng: 127.119, category: 'heritage' },
  { id: 'p-njb-1', regionCode: 'NJB', name: '전주한옥마을', description: '전통 한옥 거리', lat: 35.8154, lng: 127.153, category: 'culture' },
  { id: 'p-sjb-1', regionCode: 'SJB', name: '순천만', description: '갈대 습지', lat: 34.8868, lng: 127.5278, category: 'nature' },
  { id: 'p-ngb-1', regionCode: 'NGB', name: '경주', description: '신라 천년의 고도', lat: 35.8562, lng: 129.2247, category: 'heritage' },
  { id: 'p-sgb-1', regionCode: 'SGB', name: '통영', description: '케이블카와 바다', lat: 34.8467, lng: 128.419, category: 'sea' },
  { id: 'p-jej-1', regionCode: 'JEJ', name: '성산일출봉', description: '제주 UNESCO', lat: 33.4584, lng: 126.9425, category: 'nature' },
  { id: 'p-jej-2', regionCode: 'JEJ', name: '한라산', description: '제주 최고봉', lat: 33.3617, lng: 126.5292, category: 'mountain' },
];

function hasCategory(regionCode, set) {
  return ICONIC.some((p) => p.regionCode === regionCode && set.has(p.category));
}

const CROP = 'auto=format&fit=crop&w=600&h=400&q=80';
const img = (id) => `https://images.unsplash.com/photo-${id}?${CROP}`;

const CATEGORY_IMAGES = {
  food: img('1504674900247-0877df9cc836'),
  stay: img('1566073771259-6a8506099945'),
  event: img('1492684223066-81342ee5ff30'),
  activity: img('1529156069898-49953e39b3ac'),
  beach: img('1596436889106-58a3ee4c6b54'),
  culture: img('1559827260-dc66d52bef19'),
  city: img('1480714378408-67cf0d13bc1b'),
  science: img('1581091226825-a6a2a5aee158'),
  heritage: img('1583417319070-4a1d3d9f5a6e'),
  landmark: img('1534274867514-d5b3310cb327'),
  mountain: img('1464822759023-fed622ff2c3b'),
  sea: img('1507525428034-b723cf961d3e'),
  park: img('1441974231531-c6227db76b6e'),
  nature: img('1470071459604-3b5ec3a8fe05'),
};

const ICONIC_IMAGES = {
  'p-seo-1': img('1583417319070-4a1d3d9f5a6e'),
  'p-seo-2': img('1534274867514-d5b3310cb327'),
  'p-bus-1': img('1596436889106-58a3ee4c6b54'),
  'p-bus-2': img('1559827260-dc66d52bef19'),
  'p-dae-1': img('1480714378408-67cf0d13bc1b'),
  'p-icn-1': img('1507525428034-b723cf961d3e'),
  'p-gwj-1': img('1464822759023-fed622ff2c3b'),
  'p-djn-1': img('1581091226825-a6a2a5aee158'),
  'p-uls-1': img('1505142468610-359e7d316be0'),
  'p-sjg-1': img('1441974231531-c6227db76b6e'),
  'p-ggd-1': img('1517154421774-6aad56366d86'),
  'p-gwn-1': img('1506905925346-21bda4d32df4'),
  'p-ncb-1': img('1439066588041-2504cb8550a9'),
  'p-scb-1': img('1528360983277-13d401cdc186'),
  'p-njb-1': img('1580894900169-8672efdd62da'),
  'p-sjb-1': img('1470071459604-3b5ec3a8fe05'),
  'p-ngb-1': img('1528360983277-13d401cdc186'),
  'p-sgb-1': img('1559827260-dc66d52bef19'),
  'p-jej-1': img('1590523277543-a94d2e4ddb54'),
  'p-jej-2': img('1464822759023-fed622ff2c3b'),
};

const FOOD_POOL = [
  img('1547592180-85f173990554'),
  img('1569055241982-45b0f5585467'),
  img('1555939594-58d7cb561ad1'),
  img('1504674900247-0877df9cc836'),
  img('1512621776951-a57141f2eefd'),
  img('1563245372-f21724e3856d'),
  img('1551218808-94e220e084d2'),
  img('1574484786402-934b77434b31'),
  img('1567620905732-2d1ec7ab7445'),
  img('1559339352-11d035aa65de'),
  img('1414235077428-338989a2e8c0'),
  img('1504113888839-1c8e50233f76'),
  img('1553621042-f6e147245756'),
  img('1565299624946-b28f40a0ae38'),
  img('1540189549336-e9e8883be175'),
  img('1551024506-0bccd828d307'),
  img('1476224208491-c28d37d32ed9'),
];

const STAY_POOL = [
  img('1566073771259-6a8506099945'),
  img('1582719478250-c89cae4dc85b'),
  img('1571896349842-33c89424de2d'),
  img('1520250497591-112be2d99614'),
  img('1564501049412-2566c978ccee'),
  img('1578683010236-d716f9a3f461'),
  img('1590490360182-c33d57733427'),
  img('1618773928123-c66b9ffde44d'),
  img('1631049307264-da0ec8d70304'),
  img('1551882547-ff40c63fe5fa'),
  img('1584132915807-be1e43e422d3'),
  img('1591087657150-f9ff2c9dbfc4'),
  img('1566665797737-15c698f58fe3'),
  img('1571008881686-5bd8c7c4c4a4'),
  img('1522771739844-6a9f6d5f14af'),
  img('1582719508461-905c673771fd'),
  img('1560185127-6ed189bf02f4'),
];

const EVENT_POOL = [
  img('1492684223066-81342ee5ff30'),
  img('1533174072545-7a4b6d5c4d3e'),
  img('1514525253161-7a46d19cd819'),
  img('1470229722913-7c0e2dbbafd3'),
  img('1506157785271-0d7858b9f57e'),
  img('1459747510973-5cf035f67959'),
  img('1501281668745-f7f57925c3b4'),
  img('1540039158931-ceffa28af7a6'),
  img('1429962714451-bb834a88fbbd'),
  img('1516450360452-aaa2ed0e8369'),
  img('1506157785271-0d7858b9f57e'),
  img('1493225457124-a3eb161ffa5f'),
  img('1511570174474-a2a27b9ca9b8'),
  img('1470225620780-dba8ba2b4445'),
  img('1506157785271-0d7858b9f57e'),
  img('1514525253161-7a46d19cd819'),
  img('1533174072545-7a4b6d5c4d3e'),
];

const REGION_ORDER = Object.keys(REGION_META);

function poolImage(pool, regionCode) {
  const i = REGION_ORDER.indexOf(regionCode);
  return pool[(i >= 0 ? i : 0) % pool.length];
}

function withImage(place) {
  if (ICONIC_IMAGES[place.id]) {
    return { ...place, imageUrl: ICONIC_IMAGES[place.id] };
  }
  if (place.id.endsWith('-food')) {
    return { ...place, imageUrl: poolImage(FOOD_POOL, place.regionCode) };
  }
  if (place.id.endsWith('-stay')) {
    return { ...place, imageUrl: poolImage(STAY_POOL, place.regionCode) };
  }
  if (place.id.endsWith('-event')) {
    return { ...place, imageUrl: poolImage(EVENT_POOL, place.regionCode) };
  }
  if (place.id.endsWith('-play')) {
    return { ...place, imageUrl: CATEGORY_IMAGES.activity };
  }
  if (place.id.endsWith('-sight')) {
    return { ...place, imageUrl: CATEGORY_IMAGES.landmark };
  }
  return { ...place, imageUrl: CATEGORY_IMAGES[place.category] ?? CATEGORY_IMAGES.activity };
}

const extras = [];
for (const [code, meta] of Object.entries(REGION_META)) {
  const base = { regionCode: code, lat: meta.lat, lng: meta.lng };
  extras.push({ id: `p-${code.toLowerCase()}-food`, ...base, name: meta.food[0], description: meta.food[1], category: 'food' });
  extras.push({ id: `p-${code.toLowerCase()}-stay`, ...base, name: meta.stay[0], description: meta.stay[1], category: 'stay', lat: meta.lat + 0.008, lng: meta.lng + 0.006 });
  extras.push({ id: `p-${code.toLowerCase()}-event`, ...base, name: meta.event[0], description: meta.event[1], category: 'event', lat: meta.lat - 0.006, lng: meta.lng + 0.01 });
  if (!hasCategory(code, PLAY_CATS)) {
    extras.push({ id: `p-${code.toLowerCase()}-play`, ...base, name: meta.play[0], description: meta.play[1], category: 'activity', lat: meta.lat + 0.012, lng: meta.lng - 0.008 });
  }
  if (!hasCategory(code, SIGHT_CATS)) {
    extras.push({ id: `p-${code.toLowerCase()}-sight`, ...base, name: meta.sight[0], description: meta.sight[1], category: 'landmark', lat: meta.lat - 0.01, lng: meta.lng - 0.006 });
  }
}

const all = [...ICONIC, ...extras].map(withImage);
const outPaths = [
  path.join(root, 'seed', 'places.json'),
  path.join(root, 'apps', 'mobile', 'constants', 'places.json'),
];
for (const outPath of outPaths) {
  fs.writeFileSync(outPath, JSON.stringify(all, null, 2) + '\n');
  console.log('Wrote', outPath, `(${all.length} places)`);
}
