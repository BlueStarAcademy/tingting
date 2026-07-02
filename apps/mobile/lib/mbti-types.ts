export interface MbtiTypeInfo {
  title: { ko: string; en: string };
  description: { ko: string; en: string };
  traits: { ko: string[]; en: string[] };
}

export const MBTI_TYPE_INFO: Record<string, MbtiTypeInfo> = {
  INTJ: {
    title: { ko: '전략가', en: 'Architect' },
    description: {
      ko: '목표 지향적이고 분석적인 유형입니다. 큰 그림을 그리며 체계적으로 계획하고, 혼자 깊이 생각하는 시간을 통해 아이디어를 다듬습니다. 여행에서도 의미 있는 경험과 효율적인 동선을 중시합니다.',
      en: 'Goal-driven and analytical. You think in systems, plan ahead, and value meaningful, efficient travel experiences over random wandering.',
    },
    traits: {
      ko: ['독립적', '계획적', '통찰력', '끈기'],
      en: ['Independent', 'Strategic', 'Insightful', 'Determined'],
    },
  },
  INTP: {
    title: { ko: '논리술사', en: 'Logician' },
    description: {
      ko: '호기심이 많고 논리적으로 사고하는 유형입니다. 새로운 개념과 아이디어를 탐구하며, 자유로운 여행 일정 속에서도 깊이 있는 관찰을 즐깁니다.',
      en: 'Curious and logical. You love exploring ideas and noticing details others miss, often enjoying flexible trips with room to think.',
    },
    traits: {
      ko: ['분석적', '창의적', '객관적', '유연함'],
      en: ['Analytical', 'Creative', 'Objective', 'Flexible'],
    },
  },
  ENTJ: {
    title: { ko: '통솔자', en: 'Commander' },
    description: {
      ko: '리더십이 강하고 결단력 있는 유형입니다. 목표를 세우고 사람들을 이끌며, 여행에서도 일정과 성과를 중시합니다. 그룹 여행의 오거나이저 역할을 잘 맡습니다.',
      en: 'Bold and decisive. You lead groups well, set clear travel goals, and keep everyone moving toward a shared plan.',
    },
    traits: {
      ko: ['리더십', '추진력', '효율성', '자신감'],
      en: ['Leadership', 'Drive', 'Efficiency', 'Confidence'],
    },
  },
  ENTP: {
    title: { ko: '변론가', en: 'Debater' },
    description: {
      ko: '재치 있고 도전적인 유형입니다. 새로운 가능성을 즐기며 즉흥적인 선택도 두려워하지 않습니다. 여행 중 예상치 못한 만남과 새로운 장소를 에너지로 삼습니다.',
      en: 'Witty and adventurous. You thrive on novelty, spontaneous detours, and lively conversations during travel.',
    },
    traits: {
      ko: ['호기심', '즉흥성', '소통', '창의력'],
      en: ['Curious', 'Spontaneous', 'Communicative', 'Inventive'],
    },
  },
  INFJ: {
    title: { ko: '옹호자', en: 'Advocate' },
    description: {
      ko: '깊은 공감과 이상을 지닌 유형입니다. 사람과 장소에 담긴 의미를 중시하며, 조용하지만 강한 직관으로 여행의 본질적인 감동을 찾아갑니다.',
      en: 'Empathetic and idealistic. You seek meaningful places and quiet moments that resonate emotionally and spiritually.',
    },
    traits: {
      ko: ['공감', '직관', '헌신', '성찰'],
      en: ['Empathetic', 'Intuitive', 'Dedicated', 'Reflective'],
    },
  },
  INFP: {
    title: { ko: '중재자', en: 'Mediator' },
    description: {
      ko: '따뜻하고 상상력이 풍부한 유형입니다. 자신만의 가치와 감성에 따라 여행지를 고르며, 아름다운 풍경과 진솔한 경험을 소중히 여깁니다.',
      en: 'Warm and imaginative. You travel by feeling, choosing places that match your values and creative spirit.',
    },
    traits: {
      ko: ['감성', '이상주의', '개방성', '온화함'],
      en: ['Sensitive', 'Idealistic', 'Open-minded', 'Gentle'],
    },
  },
  ENFJ: {
    title: { ko: '선도자', en: 'Protagonist' },
    description: {
      ko: '사람을 이끌고 조화를 만드는 유형입니다. 함께하는 여행에서 모두가 즐거운 경험을 하도록 배려하며, 따뜻한 분위기를 만들어냅니다.',
      en: 'Charismatic and caring. You make group trips enjoyable for everyone and naturally bring people together.',
    },
    traits: {
      ko: ['배려', '영향력', '협력', '열정'],
      en: ['Caring', 'Influential', 'Cooperative', 'Passionate'],
    },
  },
  ENFP: {
    title: { ko: '활동가', en: 'Campaigner' },
    description: {
      ko: '열정적이고 자유로운 유형입니다. 사람과 새로운 경험을 사랑하며, 여행에서 다양한 만남과 즐거운 순간을 만들어냅니다.',
      en: 'Enthusiastic and free-spirited. You love people, new experiences, and turning trips into memorable adventures.',
    },
    traits: {
      ko: ['열정', '사교성', '낙관', '자유로움'],
      en: ['Enthusiastic', 'Sociable', 'Optimistic', 'Free-spirited'],
    },
  },
  ISTJ: {
    title: { ko: '현실주의자', en: 'Logistician' },
    description: {
      ko: '책임감 있고 실용적인 유형입니다. 꼼꼼한 준비와 안정적인 일정을 선호하며, 검증된 정보를 바탕으로 여행을 계획합니다.',
      en: 'Responsible and practical. You prefer well-prepared, reliable itineraries built on trusted information.',
    },
    traits: {
      ko: ['성실', '체계', '신뢰', '현실적'],
      en: ['Diligent', 'Organized', 'Reliable', 'Practical'],
    },
  },
  ISFJ: {
    title: { ko: '수호자', en: 'Defender' },
    description: {
      ko: '헌신적이고 배려 깊은 유형입니다. 동행의 안전과 편안함을 먼저 생각하며, 익숙하고 따뜻한 여행 경험을 선호합니다.',
      en: 'Supportive and thoughtful. You prioritize companions’ comfort and create caring, dependable travel moments.',
    },
    traits: {
      ko: ['배려', '성실', '온화', '헌신'],
      en: ['Supportive', 'Diligent', 'Warm', 'Devoted'],
    },
  },
  ESTJ: {
    title: { ko: '경영자', en: 'Executive' },
    description: {
      ko: '조직력 있고 실행력 있는 유형입니다. 명확한 규칙과 일정 아래 효율적으로 움직이며, 여행도 목적과 결과가 분명할 때 만족합니다.',
      en: 'Organized and decisive. You run trips efficiently with clear schedules and expect plans to be followed.',
    },
    traits: {
      ko: ['조직력', '실행력', '원칙', '리더십'],
      en: ['Organized', 'Action-oriented', 'Principled', 'Direct'],
    },
  },
  ESFJ: {
    title: { ko: '집정관', en: 'Consul' },
    description: {
      ko: '친절하고 협력적인 유형입니다. 모두가 함께 즐길 수 있는 장소와 일정을 고르며, 여행의 추억을 나누는 것을 좋아합니다.',
      en: 'Friendly and cooperative. You choose places everyone can enjoy and love sharing travel memories together.',
    },
    traits: {
      ko: ['친절', '협력', '사교성', '배려'],
      en: ['Friendly', 'Cooperative', 'Sociable', 'Considerate'],
    },
  },
  ISTP: {
    title: { ko: '장인', en: 'Virtuoso' },
    description: {
      ko: '실용적이고 관찰력이 뛰어난 유형입니다. 직접 체험하며 배우는 것을 좋아하고, 여행에서도 유연하게 상황에 맞게 움직입니다.',
      en: 'Hands-on and observant. You learn by doing and adapt easily to changing travel situations.',
    },
    traits: {
      ko: ['실용적', '관찰력', '유연', '침착'],
      en: ['Practical', 'Observant', 'Adaptable', 'Calm'],
    },
  },
  ISFP: {
    title: { ko: '모험가', en: 'Adventurer' },
    description: {
      ko: '온화하고 감각적인 유형입니다. 아름다움과 자유로운 분위기를 사랑하며, 여행에서 감각적인 경험과 여유를 즐깁니다.',
      en: 'Gentle and artistic. You enjoy sensory beauty, freedom, and unhurried travel experiences.',
    },
    traits: {
      ko: ['감성', '자유', '온화', '예술성'],
      en: ['Artistic', 'Free-spirited', 'Gentle', 'Sensitive'],
    },
  },
  ESTP: {
    title: { ko: '사업가', en: 'Entrepreneur' },
    description: {
      ko: '대담하고 활동적인 유형입니다. 지금 이 순간을 즐기며, 여행에서도 스릴 있는 활동과 즉흥적인 선택을 선호합니다.',
      en: 'Bold and energetic. You live in the moment and prefer active, spontaneous travel adventures.',
    },
    traits: {
      ko: ['대담', '활동적', '즉흥', '현실적'],
      en: ['Bold', 'Active', 'Spontaneous', 'Pragmatic'],
    },
  },
  ESFP: {
    title: { ko: '연예인', en: 'Entertainer' },
    description: {
      ko: '밝고 사교적인 유형입니다. 분위기를 살리며 사람들과 어울리는 것을 즐기고, 여행의 즐거움을 최대한 만끽합니다.',
      en: 'Outgoing and fun-loving. You light up group trips and savor every joyful moment along the way.',
    },
    traits: {
      ko: ['밝음', '사교성', '즉흥', '낙천'],
      en: ['Cheerful', 'Sociable', 'Spontaneous', 'Optimistic'],
    },
  },
};

export function getMbtiTypeInfo(mbti: string): MbtiTypeInfo {
  return (
    MBTI_TYPE_INFO[mbti.toUpperCase()] ?? {
      title: { ko: mbti, en: mbti },
      description: {
        ko: '당신만의 독특한 성향을 가진 여행자입니다.',
        en: 'You have a unique personality as a traveler.',
      },
      traits: { ko: [], en: [] },
    }
  );
}
