import type { EditorFeature } from './types';

type FeatureSeed = Omit<EditorFeature, 'category'>;

const free = true;

const filters: FeatureSeed[] = [
  { id: 'filter_natural', name: { ko: '내추럴', en: 'Natural' }, free, previewColor: '#94A3B8', effectKey: 'natural', group: { ko: '데일리', en: 'Daily' } },
  { id: 'filter_warm', name: { ko: '따뜻함', en: 'Warm' }, free, previewColor: '#F59E0B', effectKey: 'warm', group: { ko: '데일리', en: 'Daily' } },
  { id: 'filter_cool', name: { ko: '시원함', en: 'Cool' }, free, previewColor: '#38BDF8', effectKey: 'cool', group: { ko: '데일리', en: 'Daily' } },
  { id: 'filter_vivid', name: { ko: '선명', en: 'Vivid' }, free, previewColor: '#EC4899', effectKey: 'vivid', group: { ko: '데일리', en: 'Daily' } },
  { id: 'filter_soft_clean', name: { ko: '소프트 클린', en: 'Soft Clean' }, free, previewColor: '#FCE7F3', effectKey: 'soft_clean', group: { ko: '셀피', en: 'Selfie' } },
  { id: 'filter_peach_skin', name: { ko: '피치 스킨', en: 'Peach Skin' }, free, previewColor: '#FDBA74', effectKey: 'peach_skin', group: { ko: '셀피', en: 'Selfie' } },
  { id: 'filter_rosy', name: { ko: '로지', en: 'Rosy' }, free, previewColor: '#FB7185', effectKey: 'rosy', group: { ko: '셀피', en: 'Selfie' } },
  { id: 'filter_clear_face', name: { ko: '맑은 얼굴', en: 'Clear Face' }, free, previewColor: '#F0FDFA', effectKey: 'clear_face', group: { ko: '셀피', en: 'Selfie' } },
  { id: 'filter_porcelain', name: { ko: '포슬린', en: 'Porcelain' }, previewColor: '#F8FAFC', effectKey: 'porcelain', group: { ko: '셀피', en: 'Selfie' } },
  { id: 'filter_blush', name: { ko: '블러쉬', en: 'Blush' }, previewColor: '#FDA4AF', effectKey: 'blush', group: { ko: '셀피', en: 'Selfie' } },
  { id: 'filter_vintage', name: { ko: '빈티지', en: 'Vintage' }, free, previewColor: '#A16207', effectKey: 'vintage', group: { ko: '필름', en: 'Film' } },
  { id: 'filter_film', name: { ko: '필름', en: 'Film' }, free, previewColor: '#78716C', effectKey: 'film', group: { ko: '필름', en: 'Film' } },
  { id: 'filter_mono', name: { ko: '흑백', en: 'Mono' }, free, previewColor: '#64748B', effectKey: 'mono', group: { ko: '필름', en: 'Film' } },
  { id: 'filter_fade_film', name: { ko: '페이드 필름', en: 'Fade Film' }, previewColor: '#D6D3D1', effectKey: 'fade_film', group: { ko: '필름', en: 'Film' } },
  { id: 'filter_kodak_gold', name: { ko: '코닥 골드', en: 'Kodak Gold' }, previewColor: '#FBBF24', effectKey: 'kodak_gold', group: { ko: '필름', en: 'Film' } },
  { id: 'filter_fuji_green', name: { ko: '후지 그린', en: 'Fuji Green' }, previewColor: '#65A30D', effectKey: 'fuji_green', group: { ko: '필름', en: 'Film' } },
  { id: 'filter_noir', name: { ko: '누아르', en: 'Noir' }, previewColor: '#18181B', effectKey: 'noir', group: { ko: '필름', en: 'Film' } },
  { id: 'filter_instant', name: { ko: '즉석사진', en: 'Instant' }, previewColor: '#FEF3C7', effectKey: 'instant', group: { ko: '필름', en: 'Film' } },
  { id: 'filter_cinematic_blue', name: { ko: '시네 블루', en: 'Cine Blue' }, previewColor: '#1D4ED8', effectKey: 'cinematic_blue', group: { ko: '무드', en: 'Mood' } },
  { id: 'filter_cinematic_teal', name: { ko: '시네 틸', en: 'Cine Teal' }, previewColor: '#0F766E', effectKey: 'cinematic_teal', group: { ko: '무드', en: 'Mood' } },
  { id: 'filter_matte', name: { ko: '매트', en: 'Matte' }, previewColor: '#A8A29E', effectKey: 'matte', group: { ko: '무드', en: 'Mood' } },
  { id: 'filter_dreamy', name: { ko: '드리미', en: 'Dreamy' }, previewColor: '#DDD6FE', effectKey: 'dreamy', group: { ko: '무드', en: 'Mood' } },
  { id: 'filter_moody_gray', name: { ko: '무디 그레이', en: 'Moody Gray' }, previewColor: '#475569', effectKey: 'moody_gray', group: { ko: '무드', en: 'Mood' } },
  { id: 'filter_latte', name: { ko: '라떼', en: 'Latte' }, previewColor: '#C08457', effectKey: 'latte', group: { ko: '무드', en: 'Mood' } },
  { id: 'filter_neon', name: { ko: '네온', en: 'Neon' }, previewColor: '#A855F7', effectKey: 'neon', group: { ko: '무드', en: 'Mood' } },
  { id: 'filter_pastel', name: { ko: '파스텔', en: 'Pastel' }, previewColor: '#F9A8D4', effectKey: 'pastel', group: { ko: '무드', en: 'Mood' } },
  { id: 'filter_jeju_sea', name: { ko: '제주 바다', en: 'Jeju Sea' }, free, previewColor: '#0EA5E9', effectKey: 'jeju_sea', regionCode: 'JEJ', group: { ko: '여행', en: 'Travel' } },
  { id: 'filter_seoul_night', name: { ko: '서울 야경', en: 'Seoul Night' }, previewColor: '#4338CA', effectKey: 'seoul_night', regionCode: 'SEO', group: { ko: '여행', en: 'Travel' } },
  { id: 'filter_busan_wave', name: { ko: '부산 파도', en: 'Busan Wave' }, previewColor: '#0284C7', effectKey: 'busan_wave', regionCode: 'BUS', group: { ko: '여행', en: 'Travel' } },
  { id: 'filter_gyeongju_gold', name: { ko: '경주 골드', en: 'Gyeongju Gold' }, previewColor: '#CA8A04', effectKey: 'gyeongju_gold', regionCode: 'GYE', group: { ko: '여행', en: 'Travel' } },
  { id: 'filter_gangwon_forest', name: { ko: '강원 숲', en: 'Gangwon Forest' }, previewColor: '#15803D', effectKey: 'gangwon_forest', regionCode: 'GWD', group: { ko: '여행', en: 'Travel' } },
  { id: 'filter_travel_pop', name: { ko: '여행 POP', en: 'Travel Pop' }, previewColor: '#22C55E', effectKey: 'travel_pop', group: { ko: '여행', en: 'Travel' } },
  { id: 'filter_blue_hour', name: { ko: '블루아워', en: 'Blue Hour' }, previewColor: '#2563EB', effectKey: 'blue_hour', group: { ko: '여행', en: 'Travel' } },
  { id: 'filter_sun_trip', name: { ko: '햇살 여행', en: 'Sun Trip' }, previewColor: '#FDE047', effectKey: 'sun_trip', group: { ko: '여행', en: 'Travel' } },
  { id: 'filter_food_pop', name: { ko: '푸드 팝', en: 'Food Pop' }, previewColor: '#EF4444', effectKey: 'food_pop', group: { ko: '음식', en: 'Food' } },
  { id: 'filter_cafe_mood', name: { ko: '카페 무드', en: 'Cafe Mood' }, previewColor: '#92400E', effectKey: 'cafe_mood', group: { ko: '음식', en: 'Food' } },
  { id: 'filter_dessert', name: { ko: '디저트', en: 'Dessert' }, previewColor: '#F9A8D4', effectKey: 'dessert', group: { ko: '음식', en: 'Food' } },
  { id: 'filter_fresh_salad', name: { ko: '프레시', en: 'Fresh Salad' }, previewColor: '#84CC16', effectKey: 'fresh_salad', group: { ko: '음식', en: 'Food' } },
  { id: 'filter_spicy', name: { ko: '매콤', en: 'Spicy' }, previewColor: '#DC2626', effectKey: 'spicy', group: { ko: '음식', en: 'Food' } },
  { id: 'filter_brunch', name: { ko: '브런치', en: 'Brunch' }, previewColor: '#FDBA74', effectKey: 'brunch', group: { ko: '음식', en: 'Food' } },
  { id: 'filter_night_fix', name: { ko: '야경 보정', en: 'Night Fix' }, previewColor: '#1E1B4B', effectKey: 'night_fix', group: { ko: '야경', en: 'Night' } },
  { id: 'filter_city_light', name: { ko: '시티 라이트', en: 'City Light' }, previewColor: '#FACC15', effectKey: 'city_light', group: { ko: '야경', en: 'Night' } },
  { id: 'filter_club_neon', name: { ko: '클럽 네온', en: 'Club Neon' }, previewColor: '#DB2777', effectKey: 'club_neon', group: { ko: '야경', en: 'Night' } },
  { id: 'filter_midnight', name: { ko: '미드나잇', en: 'Midnight' }, previewColor: '#0F172A', effectKey: 'midnight', group: { ko: '야경', en: 'Night' } },
  { id: 'filter_fireworks', name: { ko: '불꽃놀이', en: 'Fireworks' }, previewColor: '#F97316', effectKey: 'fireworks', group: { ko: '야경', en: 'Night' } },
  { id: 'filter_sakura', name: { ko: '벚꽃', en: 'Sakura' }, previewColor: '#F9A8D4', effectKey: 'sakura', group: { ko: '계절', en: 'Season' } },
  { id: 'filter_summer', name: { ko: '썸머', en: 'Summer' }, previewColor: '#06B6D4', effectKey: 'summer', group: { ko: '계절', en: 'Season' } },
  { id: 'filter_autumn', name: { ko: '가을빛', en: 'Autumn' }, previewColor: '#EA580C', effectKey: 'autumn', group: { ko: '계절', en: 'Season' } },
  { id: 'filter_winter', name: { ko: '윈터', en: 'Winter' }, previewColor: '#BAE6FD', effectKey: 'winter', group: { ko: '계절', en: 'Season' } },
  { id: 'filter_rainy', name: { ko: '비 오는 날', en: 'Rainy' }, previewColor: '#64748B', effectKey: 'rainy', group: { ko: '계절', en: 'Season' } },
  { id: 'filter_snow', name: { ko: '스노우', en: 'Snow' }, previewColor: '#EFF6FF', effectKey: 'snow', group: { ko: '계절', en: 'Season' } },
  { id: 'filter_k_cute', name: { ko: 'K-귀염', en: 'K-Cute' }, previewColor: '#FB7185', effectKey: 'k_cute', group: { ko: 'K-감성', en: 'K-Mood' } },
  { id: 'filter_k_drama', name: { ko: '드라마톤', en: 'K-Drama' }, previewColor: '#C4B5FD', effectKey: 'k_drama', group: { ko: 'K-감성', en: 'K-Mood' } },
  { id: 'filter_idol', name: { ko: '아이돌', en: 'Idol' }, previewColor: '#F472B6', effectKey: 'idol', group: { ko: 'K-감성', en: 'K-Mood' } },
  { id: 'filter_daily_cam', name: { ko: '일상캠', en: 'Daily Cam' }, previewColor: '#E2E8F0', effectKey: 'daily_cam', group: { ko: 'K-감성', en: 'K-Mood' } },
  { id: 'filter_aegyo', name: { ko: '애교톤', en: 'Aegyo Tone' }, previewColor: '#FBCFE8', effectKey: 'aegyo', group: { ko: 'K-감성', en: 'K-Mood' } },
  { id: 'filter_clean_k', name: { ko: '청순', en: 'Clean K' }, previewColor: '#DBEAFE', effectKey: 'clean_k', group: { ko: 'K-감성', en: 'K-Mood' } },
];

const stickers: EditorFeature[] = [
  ['camera', '카메라', 'Camera', '📷', '기본'], ['pin', '핀', 'Pin', '📍', '기본'], ['plane', '비행기', 'Plane', '✈️', '여행'], ['train', '기차', 'Train', '🚆', '여행'], ['car', '자동차', 'Car', '🚗', '여행'], ['bus', '버스', 'Bus', '🚌', '여행'], ['ship', '배', 'Ship', '🚢', '여행'], ['ticket', '티켓', 'Ticket', '🎫', '여행'], ['map', '지도', 'Map', '🗺️', '여행'], ['luggage', '캐리어', 'Luggage', '🧳', '여행'],
  ['compass', '나침반', 'Compass', '🧭', '여행'], ['tent', '텐트', 'Tent', '⛺', '여행'], ['mountain', '산', 'Mountain', '⛰️', '여행'], ['beach', '해변', 'Beach', '🏖️', '여행'], ['island', '섬', 'Island', '🏝️', '여행'], ['city', '도시', 'City', '🏙️', '여행'], ['bridge', '다리', 'Bridge', '🌉', '여행'], ['ferris', '관람차', 'Ferris Wheel', '🎡', '여행'], ['castle', '성', 'Castle', '🏰', '여행'], ['hotspring', '온천', 'Hot Spring', '♨️', '여행'],
  ['sakura', '벚꽃', 'Sakura', '🌸', '계절'], ['sunflower', '해바라기', 'Sunflower', '🌻', '계절'], ['tulip', '튤립', 'Tulip', '🌷', '계절'], ['rose', '장미', 'Rose', '🌹', '계절'], ['leaf', '나뭇잎', 'Leaf', '🍃', '계절'], ['maple', '단풍', 'Maple', '🍁', '계절'], ['snowflake', '눈꽃', 'Snowflake', '❄️', '계절'], ['sun', '해', 'Sun', '☀️', '계절'], ['moon', '달', 'Moon', '🌙', '계절'], ['rainbow', '무지개', 'Rainbow', '🌈', '계절'],
  ['cloud', '구름', 'Cloud', '☁️', '날씨'], ['rain', '비', 'Rain', '🌧️', '날씨'], ['sparkle', '반짝', 'Sparkle', '✨', '무드'], ['star', '별', 'Star', '⭐', '무드'], ['glow_star', '빛나는 별', 'Glowing Star', '🌟', '무드'], ['fire', '불꽃', 'Fire', '🔥', '무드'], ['party', '파티', 'Party', '🎉', '무드'], ['confetti', '컨페티', 'Confetti', '🎊', '무드'], ['balloon', '풍선', 'Balloon', '🎈', '무드'], ['ribbon', '리본', 'Ribbon', '🎀', '무드'],
  ['heart', '하트', 'Heart', '❤️', '러브'], ['pink_heart', '핑크하트', 'Pink Heart', '🩷', '러브'], ['orange_heart', '오렌지하트', 'Orange Heart', '🧡', '러브'], ['yellow_heart', '노랑하트', 'Yellow Heart', '💛', '러브'], ['green_heart', '초록하트', 'Green Heart', '💚', '러브'], ['blue_heart', '파랑하트', 'Blue Heart', '💙', '러브'], ['purple_heart', '보라하트', 'Purple Heart', '💜', '러브'], ['two_hearts', '두근두근', 'Two Hearts', '💕', '러브'], ['kiss', '키스', 'Kiss', '💋', '러브'], ['cupid', '큐피드', 'Cupid', '💘', '러브'],
  ['smile', '스마일', 'Smile', '😊', '표정'], ['wink', '윙크', 'Wink', '😉', '표정'], ['laugh', '웃음', 'Laugh', '😂', '표정'], ['cool', '선글라스', 'Cool', '😎', '표정'], ['cute', '귀여워', 'Cute', '🥰', '표정'], ['wow', '와우', 'Wow', '😮', '표정'], ['cry_laugh', '웃픈', 'LOL', '🤣', '표정'], ['shy', '수줍', 'Shy', '☺️', '표정'], ['angel', '천사', 'Angel', '😇', '표정'], ['devil', '장난꾸러기', 'Devil', '😈', '표정'],
  ['coffee', '커피', 'Coffee', '☕', '푸드'], ['cake', '케이크', 'Cake', '🍰', '푸드'], ['donut', '도넛', 'Donut', '🍩', '푸드'], ['icecream', '아이스크림', 'Ice Cream', '🍦', '푸드'], ['pizza', '피자', 'Pizza', '🍕', '푸드'], ['burger', '버거', 'Burger', '🍔', '푸드'], ['ramen', '라멘', 'Ramen', '🍜', '푸드'], ['rice', '밥', 'Rice', '🍚', '푸드'], ['bento', '도시락', 'Bento', '🍱', '푸드'], ['strawberry', '딸기', 'Strawberry', '🍓', '푸드'],
  ['peach', '복숭아', 'Peach', '🍑', '푸드'], ['lemon', '레몬', 'Lemon', '🍋', '푸드'], ['cocktail', '칵테일', 'Cocktail', '🍹', '푸드'], ['beer', '맥주', 'Beer', '🍺', '푸드'], ['camera_flash', '플래시', 'Flash', '📸', '소품'], ['video', '비디오', 'Video', '🎥', '소품'], ['music', '음악', 'Music', '🎵', '소품'], ['headphone', '헤드폰', 'Headphones', '🎧', '소품'], ['mic', '마이크', 'Mic', '🎤', '소품'], ['game', '게임', 'Game', '🎮', '소품'],
  ['crown', '왕관', 'Crown', '👑', '소품'], ['gem', '보석', 'Gem', '💎', '소품'], ['gift', '선물', 'Gift', '🎁', '소품'], ['shopping', '쇼핑', 'Shopping', '🛍️', '소품'], ['money', '머니', 'Money', '💸', '소품'], ['medal', '메달', 'Medal', '🏅', '소품'], ['trophy', '트로피', 'Trophy', '🏆', '소품'], ['check', '체크', 'Check', '✅', '마크'], ['good', '굿', 'Good', '👍', '마크'], ['peace', '브이', 'Peace', '✌️', '마크'],
  ['thumb_heart', '손하트', 'Finger Heart', '🫰', 'K-감성'], ['korea', '대한민국', 'Korea', '🇰🇷', 'K-감성'], ['kimchi', '김치', 'Kimchi', '🥬', 'K-감성'], ['hanbok', '한복', 'Hanbok', '👘', 'K-감성'], ['hallasan', '한라산', 'Hallasan', '🏔️', '지역'], ['seoul_tower', '서울타워', 'Seoul Tower', '🗼', '지역'], ['busan_fish', '부산바다', 'Busan Sea', '🐟', '지역'], ['jeju_tangerine', '제주 귤', 'Jeju Tangerine', '🍊', '지역'], ['temple', '사찰', 'Temple', '🛕', '지역'], ['flag', '깃발', 'Flag', '🚩', '마크'],
].map(([id, ko, en, emoji, group], index) => ({
  id: `sticker_${id}`,
  category: 'sticker' as const,
  name: { ko, en },
  emoji,
  free: index < 30,
  group: { ko: group, en: group },
}));

const frames: FeatureSeed[] = [
  { id: 'frame_polaroid', name: { ko: '폴라로이드', en: 'Polaroid' }, free, effectKey: 'polaroid', group: { ko: '클래식', en: 'Classic' } },
  { id: 'frame_film', name: { ko: '필름 테두리', en: 'Film Border' }, free, effectKey: 'film_frame', group: { ko: '클래식', en: 'Classic' } },
  { id: 'frame_seoul', name: { ko: '서울 야경', en: 'Seoul Night' }, effectKey: 'seoul', regionCode: 'SEO', group: { ko: '지역', en: 'Region' } },
  { id: 'frame_round', name: { ko: '원형', en: 'Round' }, free, effectKey: 'round', group: { ko: '형태', en: 'Shape' } },
  { id: 'frame_white_clean', name: { ko: '화이트 클린', en: 'White Clean' }, free, effectKey: 'white_clean', group: { ko: '클래식', en: 'Classic' } },
  { id: 'frame_black_matte', name: { ko: '블랙 매트', en: 'Black Matte' }, effectKey: 'black_matte', group: { ko: '클래식', en: 'Classic' } },
  { id: 'frame_postcard', name: { ko: '엽서', en: 'Postcard' }, effectKey: 'postcard', group: { ko: '여행', en: 'Travel' } },
  { id: 'frame_stamp', name: { ko: '우표', en: 'Stamp' }, effectKey: 'stamp', group: { ko: '여행', en: 'Travel' } },
  { id: 'frame_neon_pink', name: { ko: '네온 핑크', en: 'Neon Pink' }, effectKey: 'neon_pink_frame', group: { ko: '무드', en: 'Mood' } },
  { id: 'frame_sky', name: { ko: '스카이', en: 'Sky' }, effectKey: 'sky_frame', group: { ko: '무드', en: 'Mood' } },
  { id: 'frame_gold', name: { ko: '골드', en: 'Gold' }, effectKey: 'gold_frame', group: { ko: '무드', en: 'Mood' } },
  { id: 'frame_soft_shadow', name: { ko: '소프트 섀도우', en: 'Soft Shadow' }, effectKey: 'soft_shadow', group: { ko: '무드', en: 'Mood' } },
];

const aiTools: FeatureSeed[] = [
  { id: 'ai_bbosyap', name: { ko: '뽀샵', en: 'Glow Up' }, description: { ko: '피부톤을 밝고 화사하게', en: 'Brightens skin tones' }, effectKey: 'bbosyap', icon: '✨', group: { ko: '인물', en: 'Portrait' } },
  { id: 'ai_sky', name: { ko: '하늘리터치', en: 'Sky Touch' }, description: { ko: '하늘색을 선명하고 맑게', en: 'Enhances sky tones' }, effectKey: 'sky', icon: '☁️', group: { ko: '풍경', en: 'Scene' } },
  { id: 'ai_portrait', name: { ko: '인물 보정', en: 'Portrait' }, description: { ko: '인물 중심 소프트 포커스', en: 'Soft portrait focus' }, effectKey: 'portrait', icon: '🙂', group: { ko: '인물', en: 'Portrait' } },
  { id: 'ai_cinematic', name: { ko: '시네마', en: 'Cinematic' }, description: { ko: '영화 같은 색감과 비네팅', en: 'Cinematic color and vignette' }, effectKey: 'cinematic', icon: '🎬', group: { ko: '무드', en: 'Mood' } },
  { id: 'ai_travel_pop', name: { ko: '여행 POP', en: 'Travel Pop' }, description: { ko: '여행 사진 색감 강화', en: 'Boosts travel photo colors' }, effectKey: 'travel_pop', icon: '🧳', group: { ko: '여행', en: 'Travel' } },
  { id: 'ai_night_fix', name: { ko: '야경 보정', en: 'Night Fix' }, description: { ko: '어두운 사진 밝기 복원', en: 'Recovers dark photos' }, effectKey: 'night_fix', icon: '🌙', group: { ko: '풍경', en: 'Scene' } },
  { id: 'ai_food_boost', name: { ko: '음식 보정', en: 'Food Boost' }, description: { ko: '음식 색감을 맛있게 강화', en: 'Makes food colors richer' }, effectKey: 'food_pop', icon: '🍰', group: { ko: '음식', en: 'Food' } },
  { id: 'ai_dehaze', name: { ko: '선명 복원', en: 'Dehaze' }, description: { ko: '흐린 사진을 또렷한 느낌으로', en: 'Adds a clearer look' }, effectKey: 'dehaze', icon: '🔆', group: { ko: '풍경', en: 'Scene' } },
];

const adjusts: FeatureSeed[] = [
  { id: 'adjust_brightness', name: { ko: '밝기', en: 'Brightness' }, free, effectKey: 'brightness', icon: '☀️', intensity: 0 },
  { id: 'adjust_contrast', name: { ko: '대비', en: 'Contrast' }, free, effectKey: 'contrast', icon: '◐', intensity: 0 },
  { id: 'adjust_saturation', name: { ko: '채도', en: 'Saturation' }, free, effectKey: 'saturation', icon: '🌈', intensity: 0 },
  { id: 'adjust_warmth', name: { ko: '온도', en: 'Warmth' }, free, effectKey: 'warmth', icon: '🌡️', intensity: 0 },
  { id: 'adjust_tint', name: { ko: '틴트', en: 'Tint' }, free, effectKey: 'tint', icon: '🎨', intensity: 0 },
  { id: 'adjust_fade', name: { ko: '페이드', en: 'Fade' }, free, effectKey: 'fade', icon: '◌', intensity: 0 },
  { id: 'adjust_highlights', name: { ko: '하이라이트', en: 'Highlights' }, free, effectKey: 'highlights', icon: '⬆️', intensity: 0 },
  { id: 'adjust_shadows', name: { ko: '섀도우', en: 'Shadows' }, free, effectKey: 'shadows', icon: '⬇️', intensity: 0 },
  { id: 'adjust_vignette', name: { ko: '비네팅', en: 'Vignette' }, free, effectKey: 'vignette_adjust', icon: '◎', intensity: 0 },
  { id: 'adjust_grain', name: { ko: '그레인', en: 'Grain' }, free, effectKey: 'grain_adjust', icon: '▪', intensity: 0 },
  { id: 'adjust_rotate', name: { ko: '회전', en: 'Rotate' }, free, effectKey: 'rotate', icon: '↻' },
  { id: 'adjust_flip', name: { ko: '좌우 반전', en: 'Flip' }, free, effectKey: 'flip', icon: '⇄' },
  { id: 'adjust_crop_square', name: { ko: '정사각 크롭', en: 'Square Crop' }, free, effectKey: 'crop_square', icon: '□' },
  { id: 'adjust_crop_portrait', name: { ko: '4:5 크롭', en: '4:5 Crop' }, free, effectKey: 'crop_portrait', icon: '▯' },
  { id: 'adjust_crop_story', name: { ko: '스토리 크롭', en: 'Story Crop' }, free, effectKey: 'crop_story', icon: '▯' },
  { id: 'adjust_crop_wide', name: { ko: '16:9 크롭', en: 'Wide Crop' }, free, effectKey: 'crop_wide', icon: '▭' },
];

const effects: FeatureSeed[] = [
  { id: 'effect_vignette', name: { ko: '비네팅', en: 'Vignette' }, free, effectKey: 'vignette', icon: '◎', group: { ko: '렌즈', en: 'Lens' } },
  { id: 'effect_grain', name: { ko: '필름 그레인', en: 'Film Grain' }, free, effectKey: 'grain', icon: '▪', group: { ko: '필름', en: 'Film' } },
  { id: 'effect_light_leak', name: { ko: '빛샘', en: 'Light Leak' }, effectKey: 'light_leak', icon: '🌤️', group: { ko: '빛', en: 'Light' } },
  { id: 'effect_prism', name: { ko: '프리즘', en: 'Prism' }, effectKey: 'prism', icon: '🔮', group: { ko: '빛', en: 'Light' } },
  { id: 'effect_dust', name: { ko: '먼지', en: 'Dust' }, effectKey: 'dust', icon: '·', group: { ko: '필름', en: 'Film' } },
  { id: 'effect_soft_blur', name: { ko: '소프트 블러', en: 'Soft Blur' }, effectKey: 'soft_blur', icon: '◌', group: { ko: '렌즈', en: 'Lens' } },
  { id: 'effect_spotlight', name: { ko: '스포트라이트', en: 'Spotlight' }, effectKey: 'spotlight', icon: '🔦', group: { ko: '빛', en: 'Light' } },
  { id: 'effect_sunflare', name: { ko: '햇살 플레어', en: 'Sun Flare' }, effectKey: 'sunflare', icon: '☀️', group: { ko: '빛', en: 'Light' } },
  { id: 'watermark_remove', name: { ko: '워터마크 제거', en: 'Remove Watermark' }, effectKey: 'watermark_remove', icon: 'T' },
];

export const EDITOR_FEATURES: EditorFeature[] = [
  ...filters.map((feature) => ({ ...feature, category: 'filter' as const })),
  ...stickers,
  ...frames.map((feature) => ({ ...feature, category: 'frame' as const })),
  ...aiTools.map((feature) => ({ ...feature, category: 'ai' as const })),
  ...adjusts.map((feature) => ({ ...feature, category: 'adjust' as const })),
  ...effects.map((feature) => ({ ...feature, category: 'effect' as const })),
];

export function getEditorFeature(id: string): EditorFeature | undefined {
  return EDITOR_FEATURES.find((f) => f.id === id);
}

export function getEditorFeaturesByCategory(category: EditorFeature['category']): EditorFeature[] {
  return EDITOR_FEATURES.filter((f) => f.category === category);
}
