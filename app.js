/* ==========================================================================
   OsakaGo - 오사카 여행 번역기 & 음성 길찾기 & 맛집 가이드 메인 스크립트
   ========================================================================== */

// 전역 상태
const state = {
  currentTab: 'translate',
  sourceLang: 'ko',
  targetLang: 'ja',
  isRecording: false,
  isMapRecording: false,
  recognition: null,
  mapRecognition: null,
  voices: [],
  history: JSON.parse(localStorage.getItem('osaka_trans_history') || '[]'),
  currentPhraseCategory: 'all',
  currentFoodCategory: 'all',
  selectedDay: 1,
  plans: JSON.parse(localStorage.getItem('osaka_plans_v1') || 'null'),
  map: null,
  mapMarkers: [],
  userMarker: null,
  userCoords: null,
  selectedPlace: null,
  lastPronunciation: '',
  liveTranslate: true,
  liveDebounceTimer: null,
  dialogRecognition: null,
  activeDialogSpeaker: null,
  isRealtimeVoiceActive: false,
  realtimeRecognition: null,
  isSpeakingNow: false,
  dualTurnSpeaker: null,
  isProcessingDualResult: false
};

// ==========================================
// 1. 오사카 주요 명소 및 맛집 데이터베이스
// ==========================================
const placesDatabase = [
  // 🌟 핵심 명소 & 랜드마크
  {
    id: 'spot-dotonbori',
    type: 'spot',
    cat: 'spot',
    nameKo: '도톤보리 글리코상',
    nameJa: '道頓堀グリコサイン',
    addressJa: '大阪府大阪市中央区道頓堀1-10-3',
    lat: 34.668728,
    lng: 135.501302,
    desc: '오사카 여행의 심장이자 상징! 에비스 다리 위 만세 포즈 인증샷 명소.',
    area: '난바/도톤보리'
  },
  {
    id: 'spot-usj',
    type: 'spot',
    cat: 'spot',
    nameKo: '유니버설 스튜디오 재팬 (USJ)',
    nameJa: 'ユニバーサル・スタジオ・ジャパン',
    addressJa: '大阪府大阪市此花区桜島2-1-33',
    lat: 34.665442,
    lng: 135.432338,
    desc: '마리오 카트와 닌텐도 월드, 해리포터 성이 있는 세계적인 테마파크.',
    area: '유니버설시티'
  },
  {
    id: 'spot-castle',
    type: 'spot',
    cat: 'spot',
    nameKo: '오사카성 천수각',
    nameJa: '大阪城天守閣',
    addressJa: '大阪府大阪市中央区大阪城1-1',
    lat: 34.687315,
    lng: 135.526201,
    desc: '오사카의 유구한 역사를 품은 랜드마크 성채와 아름다운 공원 산책로.',
    area: '오사카조코엔'
  },
  {
    id: 'spot-umeda-sky',
    type: 'spot',
    cat: 'spot',
    nameKo: '우메다 스카이빌딩 (공중정원 전망대)',
    nameJa: '梅田スカイビル 空中庭園展望台',
    addressJa: '大阪府大阪市北区大淀中1-1-88',
    lat: 34.705944,
    lng: 135.489722,
    desc: '지상 173m 옥상에서 360도로 오사카 야경을 감상할 수 있는 명소.',
    area: '우메다'
  },
  {
    id: 'spot-shinsekai',
    type: 'spot',
    cat: 'spot',
    nameKo: '신세카이 & 츠텐카쿠 타워',
    nameJa: '新世界 通天閣',
    addressJa: '大阪府大阪市浪速区恵美須東1-18-6',
    lat: 34.652518,
    lng: 135.506306,
    desc: '화려하고 레트로한 복고풍 네온사인과 쿠시카츠(꼬치튀김)의 본고장.',
    area: '신세카이'
  },
  {
    id: 'spot-namba-station',
    type: 'spot',
    cat: 'transport',
    nameKo: '난바역 (난카이 난바 & 지하철)',
    nameJa: '難波駅（なんば駅）',
    addressJa: '大阪府大阪市中央区難波5-1-60',
    lat: 34.663111,
    lng: 135.501944,
    desc: '공항 라피트 급행열차의 종착역이자 오사카 여행의 핵심 교통 허브.',
    area: '난바'
  },
  {
    id: 'spot-kix',
    type: 'spot',
    cat: 'transport',
    nameKo: '간사이 국제공항 (KIX)',
    nameJa: '関西国際空港',
    addressJa: '大阪府泉佐野市泉州空港北1',
    lat: 34.432002,
    lng: 135.230394,
    desc: '오사카 여행의 관문 공항. 난바역까지 라피트 열차로 38분 소요.',
    area: '공항'
  },
  {
    id: 'spot-kyoto-kiyomizu',
    type: 'spot',
    cat: 'spot',
    nameKo: '교토 청수사 (기요미즈데라)',
    nameJa: '清水寺',
    addressJa: '京都府京都市東山区清水1-294',
    lat: 34.994856,
    lng: 135.785046,
    desc: '오사카에서 전철 45분! 교토의 탁 트인 전경과 전통 가옥 거리.',
    area: '교토'
  },
  {
    id: 'spot-fushimi',
    type: 'spot',
    cat: 'spot',
    nameKo: '교토 후시미 이나리 신사 (여우신사)',
    nameJa: '伏見稲荷大社',
    addressJa: '京都府京都市伏見区深草藪之内町68',
    lat: 34.967140,
    lng: 135.772671,
    desc: '수천 개의 붉은 도리이가 끝없이 이어진 인생샷 명소.',
    area: '교토'
  },

  // 🐙 오사카 대표 맛집 큐레이션
  {
    id: 'food-atchichi',
    type: 'food',
    cat: 'takoyaki',
    nameKo: '앗치치혼포 도톤보리점',
    nameJa: 'あっちち本舗 道頓堀店',
    addressJa: '大阪府大阪市中央区宗右衛門町7-19',
    lat: 34.669041,
    lng: 135.502931,
    desc: '돈키호테 바로 옆! 바삭 촉촉하고 싱싱한 문어가 씹히는 오사카 1등 타코야키.',
    menu: '타코야키 (타코야키 소스 & 마요네즈)',
    area: '도톤보리'
  },
  {
    id: 'food-wanaka',
    type: 'food',
    cat: 'takoyaki',
    nameKo: '타코야키 도라쿠 와나카 난바본점',
    nameJa: 'たこ焼道楽 わなか なんば店',
    addressJa: '大阪府大阪市中央区難波千日前11-19',
    lat: 34.665123,
    lng: 135.503451,
    desc: '오사카 현지인들이 강력 추천하는 겉바속촉 육즙 가득 전통 타코야키.',
    menu: '소금맛 타코야키, 폰즈 타코야키',
    area: '난바'
  },
  {
    id: 'food-hanatako',
    type: 'food',
    cat: 'takoyaki',
    nameKo: '하나타코 (우메다)',
    nameJa: 'はなだこ',
    addressJa: '大阪府大阪市北区角田町9-26 新梅田食道街',
    lat: 34.702812,
    lng: 135.499521,
    desc: '파가 산더미처럼 쌓여 나오는 네기마요 타코야키의 절대 강자!',
    menu: '네기마요 (파+마요네즈 타코야키)',
    area: '우메다'
  },
  {
    id: 'food-mizuno',
    type: 'food',
    cat: 'okonomiyaki',
    nameKo: '오코노미야키 미즈노 (미슐랭 빕구르망)',
    nameJa: '美津の（みづの）',
    addressJa: '大阪府大阪市中央区道頓堀1-4-15',
    lat: 34.668351,
    lng: 135.502781,
    desc: '밀가루를 쓰지 않고 마를 듬뿍 넣어 부드러운 전설적인 오코노미야키 명가.',
    menu: '야마이모야키 (마 100% 오코노미야키)',
    area: '도톤보리'
  },
  {
    id: 'food-kiji',
    type: 'food',
    cat: 'okonomiyaki',
    nameKo: '키지 우메다 스카이빌딩점',
    nameJa: 'きじ 梅田スカイビル店',
    addressJa: '大阪府大阪市北区大淀中1-1-90 B1F',
    lat: 34.705821,
    lng: 135.489621,
    desc: '고소한 야키소바가 통째로 들어간 모단야키가 일품인 오코노미야키 맛집.',
    menu: '모단야키, 믹스 오코노미야키',
    area: '우메다'
  },
  {
    id: 'food-ichiran',
    type: 'food',
    cat: 'ramen',
    nameKo: '이치란 라멘 도톤보리점 본관',
    nameJa: '一蘭 道頓堀店本館',
    addressJa: '大阪府大阪市中央区宗右衛門町7-18',
    lat: 34.669112,
    lng: 135.503112,
    desc: '진한 돈코츠 육수와 한국인 맞춤 비법 빨간 양념장, 1인 독서실 좌석.',
    menu: '천연 돈코츠 라멘 + 반숙 달걀',
    area: '도톤보리'
  },
  {
    id: 'food-kinryu',
    type: 'food',
    cat: 'ramen',
    nameKo: '킨류 라멘 도톤보리 본점 (금룡라면)',
    nameJa: '金龍ラーメン 道頓堀店',
    addressJa: '大阪府大阪市中央区道頓堀1-7-26',
    lat: 34.668541,
    lng: 135.502121,
    desc: '거대한 입체 용 간판! 김치와 마늘을 무료로 무제한 넣어 먹는 24시간 라멘.',
    menu: '돈코츠 라멘, 차슈멘',
    area: '도톤보리'
  },
  {
    id: 'food-daruma',
    type: 'food',
    cat: 'kushikatsu',
    nameKo: '쿠시카츠 다루마 신세카이 총본점',
    nameJa: '串かつだるま 新世界総本店',
    addressJa: '大阪府大阪市浪速区恵美須東2-3-9',
    lat: 34.651821,
    lng: 135.505912,
    desc: '바삭하고 얇은 튀김옷의 원조 쿠시카츠! (소스 두 번 찍기 절대 금지 원칙)',
    menu: '원조 쿠시카츠 세트, 도테야키(소힘줄조림)',
    area: '신세카이'
  },
  {
    id: 'food-motomura',
    type: 'food',
    cat: 'beef',
    nameKo: '규카츠 모토무라 난바점',
    nameJa: '牛かつもと村 難波店',
    addressJa: '大阪府大阪市中央区難波3-3-1',
    lat: 34.666112,
    lng: 135.501812,
    desc: '겉만 살짝 튀긴 소고기를 개인 미니 화로에 취향껏 구워 먹는 부드러운 규카츠.',
    menu: '규카츠 정식 (130g / 260g)',
    area: '난바'
  },
  {
    id: 'food-matsusaka',
    type: 'food',
    cat: 'beef',
    nameKo: '마츠사카규 야키니쿠 M 난바점',
    nameJa: '松阪牛焼肉M なんば店',
    addressJa: '大阪府大阪市中央区難波1-6-3',
    lat: 34.667821,
    lng: 135.502112,
    desc: '일본 3대 와규인 마츠사카 소고기를 분위기 좋은 프라이빗 룸에서 굽는 고급 만찬.',
    menu: '마츠사카 와규 모듬 플래터',
    area: '난바'
  },
  {
    id: 'food-harukoma',
    type: 'food',
    cat: 'sushi',
    nameKo: '하루코마 스시 본점',
    nameJa: '春駒 本店',
    addressJa: '大阪府大阪市北区天神橋5-5-2',
    lat: 34.709912,
    lng: 135.513221,
    desc: '두툼하고 신선한 회가 샤리를 덮어버리는 오사카 최고 가성비의 줄 서는 초밥집.',
    menu: '참치 대뱃살(오도로), 연어, 우나기(장어)',
    area: '텐진바시'
  },
  {
    id: 'food-uoshin',
    type: 'food',
    cat: 'sushi',
    nameKo: '우오신 스시 우메다점 (대왕초밥)',
    nameJa: '魚心 梅田店',
    addressJa: '大阪府大阪市北区堂山町5-4',
    lat: 34.703212,
    lng: 135.502112,
    desc: '일반 스시의 3배 크기! 한 입 가득 차는 엄청난 볼륨감의 대형 네타 스시.',
    menu: '대왕 연어초밥, 대왕 장어초밥',
    area: '우메다'
  },
  {
    id: 'food-rikuro',
    type: 'food',
    cat: 'dessert',
    nameKo: '리쿠로 오지상 치즈케이크 난바본점',
    nameJa: 'りくろーおじさんの店 なんば本店',
    addressJa: '大阪府大阪市中央区難波3-2-28',
    lat: 34.666421,
    lng: 135.501981,
    desc: '종이 울리면 갓 구워 나오는 퐁실퐁실하고 따뜻한 수플레 치즈케이크!',
    menu: '갓 구운 수플레 치즈케이크',
    area: '난바'
  },
  {
    id: 'food-moncher',
    type: 'food',
    cat: 'dessert',
    nameKo: '몽쉐르 도지마롤 본점',
    nameJa: 'パティスリー モンシェール 堂島本店',
    addressJa: '大阪府大阪市北区堂島浜2-1-2',
    lat: 34.694821,
    lng: 135.495212,
    desc: '신선한 홋카이도산 순우유 생크림이 아낌없이 꽉 찬 원조 도지마롤 케이크.',
    menu: '도지마롤 (오리지널 롤케이크)',
    area: '우메다/도지마'
  }
];

// ==========================================
// 2. 4박 5일 오사카 추천 일정 기본 템플릿
// ==========================================
const defaultPlans = {
  1: {
    title: 'Day 1: 오사카 입국 & 난바/도톤보리 첫날',
    desc: '간사이 공항에서 난바로 이동 후 활기찬 오사카의 밤거리 즐기기',
    items: [
      { id: '1-1', text: '간사이 국제공항 도착 & 라피트(난카이 전철) 탑승', note: '공항에서 난바역까지 약 38분 소요', done: false },
      { id: '1-2', text: '난바역 주변 호텔 체크인 및 짐 풀기', note: '도톤보리 도보 5~10분 거리가 편리', done: false },
      { id: '1-3', text: '도톤보리 글리코상 앞에서 만세 인증샷 찍기', note: '에비스 다리 위가 명당', done: false },
      { id: '1-4', text: '앗치치혼포 타코야키 & 이치란 라멘 저녁 식사', note: '웨이팅이 있을 수 있으니 야식으로도 추천', done: false },
      { id: '1-5', text: '돈키호테 도톤보리점 첫 탐방 또는 우라난바 이자카야', note: '시원한 나마비루(생맥주)로 1일차 마무리', done: false }
    ]
  },
  2: {
    title: 'Day 2: 유니버설 스튜디오 재팬 (USJ) 완전정복',
    desc: '하루 종일 테마파크에서 짜릿한 어트랙션과 슈퍼 닌텐도 월드 즐기기',
    items: [
      { id: '2-1', text: '오픈런 준비! 난바역에서 JR 유니버설시티역 이동', note: '개장 1시간~1시간 반 전 도착 추천', done: false },
      { id: '2-2', text: '슈퍼 닌텐도 월드 (마리오 카트, 파워업 밴드)', note: '정리권(에어리어 입장권) 앱으로 즉시 확보', done: false },
      { id: '2-3', text: '해리포터 앤드 더 포비든 저니 & 버터맥주 맛보기', note: '호그와트 성 디테일 감상', done: false },
      { id: '2-4', text: '미니언즈 메이헴 또는 플라잉 다이노소어 타기', note: '싱글라이더 줄 활용 팁', done: false },
      { id: '2-5', text: '유니버설 시티워크에서 저녁 식사 후 난바로 복귀', note: '발 마사지나 온천으로 피로 풀기', done: false }
    ]
  },
  3: {
    title: 'Day 3: 천년고도 교토 당일치기 (or 오사카 역사 코스)',
    desc: '오사카에서 전철로 45분! 붉은 도리이와 고즈넉한 사찰 탐방',
    items: [
      { id: '3-1', text: '한큐 전철 또는 게이한 전철 타고 교토로 이동', note: '우메다역에서 한큐 교토선 특급 탑승', done: false },
      { id: '3-2', text: '후시미 이나리 신사 (붉은 센본 도리이 길 산책)', note: '오전에 가면 비교적 덜 붐빔', done: false },
      { id: '3-3', text: '청수사(기요미즈데라) & 산넨자카/니넨자카 걷기', note: '일본 전통 가옥 거리와 말차 아이스크림', done: false },
      { id: '3-4', text: '기온 거리 & 카모가와 강변 산책', note: '운이 좋으면 게이샤를 만날 수도 있음', done: false },
      { id: '3-5', text: '우메다로 복귀하여 헵파이브 대관람차 야경 감상', note: '우메다 스카이빌딩 공중정원도 훌륭함', done: false }
    ]
  },
  4: {
    title: 'Day 4: 오사카 랜드마크 & 레트로 신세카이 & 쇼핑',
    desc: '오사카의 과거와 현재! 오사카성과 츠텐카쿠, 그리고 본격 쇼핑 데이',
    items: [
      { id: '4-1', text: '오사카성 천수각 둘러보기 & 고자부네 뱃놀이', note: '공원 산책로와 포토존 즐기기', done: false },
      { id: '4-2', text: '레트로 감성 신세카이 & 츠텐카쿠 타워', note: '쿠시카츠(꼬치튀김) 골목에서 점심 식사 (소스 두 번 찍기 금지!)', done: false },
      { id: '4-3', text: '신사이바시스지 상점가 & 아메리카무라 쇼핑', note: '의류, 화장품, 캐릭터 굿즈 쇼핑', done: false },
      { id: '4-4', text: '빅카메라 또는 다이마루 백화점 면세 쇼핑', note: '여권 필수 지참 (Tax Free 받기)', done: false },
      { id: '4-5', text: '오사카의 명물 야키니쿠 또는 오코노미야키 만찬', note: '마지막 밤을 기념하는 풍성한 저녁 식사', done: false }
    ]
  },
  5: {
    title: 'Day 5: 마지막 기념품 쇼핑 & 아쉬운 출국',
    desc: '린쿠 아울렛 또는 공항 면세점에서 선물 챙기고 안전하게 귀국하기',
    items: [
      { id: '5-1', text: '호텔 체크아웃 & 짐 챙기기 (캐리어 무게 체크)', note: '항공사 위탁수하물 무게 규정 확인', done: false },
      { id: '5-2', text: '쿠로몬 시장에서 간단한 아침/브런치 (해산물, 과일)', note: '난바역 인근 도보 이동', done: false },
      { id: '5-3', text: '간사이 공항행 라피트 탑승 (린쿠타운 경유 가능)', note: '출국 2시간 30분 전 공항 도착 권장', done: false },
      { id: '5-4', text: '간사이공항 면세점 쇼핑 (도쿄바나나, 시로이코이비토, 로이스 생초콜릿)', note: '남은 엔화 동전 알뜰하게 쓰기', done: false },
      { id: '5-5', text: '비행기 탑승 & 대한민국 귀국', note: '즐거운 오사카 여행 완료!', done: false }
    ]
  }
};

// ==========================================
// 3. 상황별 필수 회화 데이터베이스
// ==========================================
const phraseDatabase = [
  { cat: 'restaurant', ko: '이것으로 주세요.', ja: 'これをお願いします。', reading: '고레오 오네가이시마스', tip: '메뉴판을 손가락으로 가리키며 말해보세요!' },
  { cat: 'restaurant', ko: '추천 메뉴는 무엇인가요?', ja: 'おすすめは何ですか？', reading: '오스스메와 난데스까?', tip: '현지인들이 가장 많이 찾는 메뉴를 물어볼 때 유용합니다.' },
  { cat: 'restaurant', ko: '얼음물 좀 주실 수 있나요?', ja: 'お冷（お水）をいただけますか？', reading: '오히야(오미즈)오 이타다케마스까?', tip: '일본 식당에서 물은 보통 무료로 제공됩니다.' },
  { cat: 'restaurant', ko: '와사비는 빼주세요.', ja: 'わさび抜きでお願いします。', reading: '와사비 누키데 오네가이시마스', tip: '스시 주문 시 필수 표현!' },
  { cat: 'restaurant', ko: '계산서 따로 부탁드립니다.', ja: '別々で会計をお願いします。', reading: '베츠베츠데 카이케이오 오네가이시마스', tip: '더치페이 계산할 때 유용해요.' },
  { cat: 'restaurant', ko: '계산 부탁드립니다. (얼마예요?)', ja: 'お会計をお願いします。', reading: '오카이케이오 오네가이시마스', tip: '식사를 마치고 자리에서 또는 카운터에서 말합니다.' },
  { cat: 'transport', ko: '이 전철 난바역 가나요?', ja: 'この電車は難波（なんば）に行きますか？', reading: '코노 덴샤와 난바니 이키마스까?', tip: '플랫폼 승무원이나 주변 승객에게 물어보세요.' },
  { cat: 'transport', ko: '도톤보리로 가려면 몇 번 출구인가요?', ja: '道頓堀に行くには何番出口ですか？', reading: '도톤보리니 이쿠니와 난반 데구치데스까?', tip: '난바역 14번 또는 25번 출구가 가깝습니다.' },
  { cat: 'transport', ko: '교통카드(이코카/스이카) 충전은 어디서 하나요?', ja: '交通系ICカードのチャージはどこでできますか？', reading: '코-츠-케이 아이시-카-도노 챠-지와 도코데 데키마스까?', tip: '지하철역 티켓 발권기나 편의점에서 가능해요.' },
  { cat: 'transport', ko: '여기로 가주세요. (택시 탈 때)', ja: 'ここへ行ってください。', reading: '코코에 잇테 쿠다사이', tip: '구글 맵 주소나 지도를 보여주며 말하세요.' },
  { cat: 'shopping', ko: '면세(Tax Free) 가능한가요?', ja: '免税（タックスフリー）はできますか？', reading: '멘제이(탓쿠스 후리-)와 데키마스까?', tip: '여권을 소지하고 5,000엔 이상 구매 시 면세 가능합니다.' },
  { cat: 'shopping', ko: '새 상품으로 있나요?', ja: '新しい在庫はありますか？', reading: '아타라시이 자이코와 아리마스까?', tip: '진열 상품 말고 새 제품을 요청할 때 씁니다.' },
  { cat: 'shopping', ko: '비닐봉투는 괜찮습니다. (필요 없어요)', ja: '袋は大丈夫です（いりません）。', reading: '후쿠로와 다이죠-부데스 (이리마센)', tip: '일본 편의점은 봉투가 유료(3~5엔)입니다.' },
  { cat: 'shopping', ko: '카드 결제 가능한가요?', ja: 'カード払いはできますか？', reading: '카-도 바라이와 데키마스까?', tip: '트래블로그, 트래블월렛, 네이버페이, 카카오페이 등' },
  { cat: 'hotel', ko: '체크인 전 짐을 맡길 수 있나요?', ja: 'チェックイン前に荷物を預かってもらえますか？', reading: '쳇쿠인 마에니 니모츠오 아즈캇테 모라에마스까?', tip: '대부분의 호텔에서 무료로 보관해 줍니다.' },
  { cat: 'hotel', ko: '수건을 하나 더 주실 수 있나요?', ja: 'タオルをもう一枚いただけますか？', reading: '타오루오 모- 이치마이 이타다케마스까?', tip: '프런트 데스크에 편하게 요청하세요.' },
  { cat: 'hotel', ko: '체크아웃 시간은 몇 시인가요?', ja: 'チェックアウトは何時ですか？', reading: '쳇쿠아우토와 난지데스까?', tip: '보통 오전 10시 또는 11시입니다.' },
  { cat: 'emergency', ko: '가장 가까운 화장실은 어디인가요?', ja: '一番近いトイレはどこですか？', reading: '이치반 치카이 토이레와 도코데스까?', tip: '급할 때 편의점이나 지하철역 화장실을 이용하세요.' },
  { cat: 'emergency', ko: '소화제와 두통약이 필요해요.', ja: '消化薬と頭痛薬がほしいです。', reading: '쇼-카야쿠토 즈츠-야쿠가 호시이데스', tip: '오타이산(소화제), EVE(두통약) 등이 유명합니다.' },
  { cat: 'emergency', ko: '도와주세요! 길을 잃었어요.', ja: '助けてください、道に迷いました。', reading: '타스케테 쿠다사이, 미치니 마요이마시타', tip: '파출소(코반 - 交番)를 찾으면 친절히 안내해 줍니다.' },
  { cat: 'osaka', ko: '감사합니다! (오사카 사투리)', ja: 'おおきに！', reading: '오-키니!', tip: '오사카 상인들이 들으면 미소를 지으며 반겨줍니다!' },
  { cat: 'osaka', ko: '얼마예요? (오사카 사투리)', ja: 'なんぼ？（なんぼですか？）', reading: '난보? (난보데스까?)', tip: '도톤보리나 재래시장에서 정겹게 가격 물어보기!' },
  { cat: 'osaka', ko: '진짜로? / 정말이야? (오사카 사투리)', ja: 'ほんまに？', reading: '혼마니?', tip: '도쿄의 "혼토니?" 대신 오사카에서는 100% "혼마니!"를 씁니다.' },
  { cat: 'osaka', ko: '조금만 깎아주세요~ (애교 넘치는 흥정)', ja: 'まけてーな！', reading: '마케테-나!', tip: '전자상가(덴덴타운)나 재래시장에서 가볍게 흥정할 때!' },
  { cat: 'osaka', ko: '안 돼 / 안 됩니다 (오사카 사투리)', ja: 'あかん！', reading: '아칸!', tip: '오사카에서 "다메(ダメ)" 대신 항상 들을 수 있는 단어!' }
];

// ==========================================
// 4. 앱 초기화
// ==========================================
function initializeApp() {
  try { initPlans(); } catch(e) { console.warn('initPlans error:', e); }
  try { initVoices(); } catch(e) { console.warn('initVoices error:', e); }
  try { initSpeechRecognition(); } catch(e) { console.warn('initSpeechRecognition error:', e); }
  try { initMapSpeechRecognition(); } catch(e) { console.warn('initMapSpeechRecognition error:', e); }
  try { initLeafletMap(); } catch(e) { console.warn('initLeafletMap error:', e); }
  try { renderPhrases(); } catch(e) { console.warn('renderPhrases error:', e); }
  try { renderFoodList(); } catch(e) { console.warn('renderFoodList error:', e); }
  try { renderPlans(); } catch(e) { console.warn('renderPlans error:', e); }
  try { initLiveDialog(); } catch(e) { console.warn('initLiveDialog error:', e); }
  try { setupEventListeners(); } catch(e) { console.error('setupEventListeners error:', e); }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

function initPlans() {
  if (!state.plans) {
    state.plans = defaultPlans;
    savePlans();
  }
}

function savePlans() {
  localStorage.setItem('osaka_plans_v1', JSON.stringify(state.plans));
}

function initVoices() {
  if ('speechSynthesis' in window) {
    state.voices = window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      state.voices = window.speechSynthesis.getVoices();
    };
  }
}

// ==========================================
// 모바일 브라우저 오디오 언락 (Web Speech API + HTML5 Audio 완벽 해제)
// 전역 TTS 오디오 객체: 매번 new Audio()를 하면 비동기 콜백에서 모바일 Autoplay에 막히므로, 
// 전역으로 하나만 만들고 사용자 터치 시점에 unlock해야 함.
let audioUnlocker = null;

function unlockAudio() {
  if ('speechSynthesis' in window) {
    try {
      // 안드로이드 '첫 발화 삼킴 버그'를 소모시키기 위한 무음 더미 발화
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  try {
    const player = document.getElementById('global-tts-player');
    if (player) {
      player.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      player.play().catch(() => {});
    }
  } catch (e) {}
}

let dualTurnActive = false;
let recognizedTextBuffer = '';
let speechSilenceTimer = null;

// 실시간 음성 진단 모니터 UI 갱신 함수
function updateMonitorUI(indicatorType, statusMsg, textMsg) {
  const indicator = document.getElementById('vlm-indicator');
  const status = document.getElementById('vlm-status');
  const text = document.getElementById('vlm-text');

  if (indicator) {
    indicator.className = 'vlm-indicator ' + (indicatorType || '');
    if (indicatorType === 'listening') indicator.innerText = '🔴 청취 중';
    else if (indicatorType === 'translating') indicator.innerText = '⏳ 번역 중';
    else if (indicatorType === 'speaking') indicator.innerText = '🔊 낭독 중';
    else indicator.innerText = '⚪ 대기';
  }
  if (status) status.innerText = statusMsg || '';
  if (text) text.innerText = textMsg || '';
}

// ==========================================
// 4-1. 양방향 실시간 티키타카 대화 통역 엔진
// ==========================================
function startDualTurn(speakerLang) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('⚠️ 이 기기/브라우저는 음성 인식을 지원하지 않습니다. Chrome을 이용해 주세요.');
    updateMonitorUI('idle', '⚠️ 음성 인식 미지원', '이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 앱으로 접속해 주세요.');
    return;
  }

  // 모바일 오디오 재생 락 해제
  unlockAudio();

  // 이전 마이크 인스턴스 안전하게 종료
  stopDualTurn(false);

  state.dualTurnSpeaker = speakerLang;
  dualTurnActive = true;
  recognizedTextBuffer = '';
  if (speechSilenceTimer) {
    clearTimeout(speechSilenceTimer);
    speechSilenceTimer = null;
  }

  const koBtn = document.getElementById('dual-speak-ko-btn');
  const jaBtn = document.getElementById('dual-listen-ja-btn');
  const koStatus = document.getElementById('dual-ko-status');
  const jaStatus = document.getElementById('dual-ja-status');
  const banner = document.getElementById('dual-live-banner');
  const bannerText = document.getElementById('dual-live-banner-text');

  if (speakerLang === 'ko') {
    // [내 차례] 한국어 ➔ 일본어 번역
    state.sourceLang = 'ko';
    state.targetLang = 'ja';
    updateLangBarUI('ko', 'ja');

    if (koBtn) koBtn.classList.add('active');
    if (jaBtn) jaBtn.classList.remove('active');
    if (koStatus) koStatus.innerText = '🔴 듣는 중 (말씀하세요)';
    if (jaStatus) jaStatus.innerText = '대기 중';
    if (banner) banner.style.display = 'flex';
    if (bannerText) bannerText.innerText = '🔴 한국어로 편하게 말씀하세요...';
    updateMonitorUI('listening', '마이크 활성화됨 🎙️ 말씀하세요!', '한국어로 말씀하시면 0.7초 후 자동으로 일본어로 번역 및 낭독됩니다.');
    showToast('🎙️ [한국어로 말씀하세요] 듣고 있습니다...');
  } else {
    // [상대방 차례] 일본어 ➔ 한국어 번역
    state.sourceLang = 'ja';
    state.targetLang = 'ko';
    updateLangBarUI('ja', 'ko');

    if (jaBtn) jaBtn.classList.add('active');
    if (koBtn) koBtn.classList.remove('active');
    if (jaStatus) jaStatus.innerText = '🔴 일본어 듣는 중...';
    if (koStatus) koStatus.innerText = '대기 중';
    if (banner) banner.style.display = 'flex';
    if (bannerText) bannerText.innerText = '👂 상대방의 일본어 답변을 듣고 있습니다...';
    updateMonitorUI('listening', '일본어 청취 중 👂', '상대방 일본인이 말씀하시면 한국어로 번역됩니다...');
    showToast('👂 [일본어 듣는 중] 상대방이 말씀하게 해주세요...');
  }

  const rec = new SpeechRecognition();
  state.realtimeRecognition = rec;
  rec.continuous = false;
  rec.interimResults = true; // 말하는 동안 실시간 텍스트 피드백
  rec.lang = speakerLang === 'ko' ? 'ko-KR' : 'ja-JP';

  let hasExecutedTranslation = false;

  // 번역 실행 헬퍼 (중복 실행 방지)
  async function triggerTranslation(text) {
    if (hasExecutedTranslation || !text || !text.trim()) return;
    hasExecutedTranslation = true;

    if (speechSilenceTimer) {
      clearTimeout(speechSilenceTimer);
      speechSilenceTimer = null;
    }

    try { rec.stop(); } catch (e) {}

    const cleanText = text.trim();
    const inputEl = document.getElementById('source-text');
    if (inputEl) inputEl.value = cleanText;

    const destLangName = speakerLang === 'ko' ? '일본어' : '한국어';
    updateMonitorUI('translating', `${destLangName}로 번역 중입니다... ⏳`, `인식된 말: "${cleanText}"`);
    showToast(`⏳ ${destLangName}로 번역 중입니다...`);
    await performTranslation(false);

    const targetTextEl = document.getElementById('target-text');
    const targetText = targetTextEl ? targetTextEl.innerText.trim() : '';

    if (targetText && targetText !== '번역 결과가 여기에 표시됩니다.' && !targetText.includes('오류가 발생했습니다')) {
      updateMonitorUI('speaking', `${destLangName} 원어민 낭독 중... 🔊`, `번역 결과: "${targetText}"`);
      speakText(targetText, state.targetLang, () => {
        // 자동 티키타카(핑퐁) 대화 모드 확인
        const autoPingpong = document.getElementById('auto-pingpong-check');
        if (autoPingpong && autoPingpong.checked && dualTurnActive) {
          const nextSpeaker = speakerLang === 'ko' ? 'ja' : 'ko';
          setTimeout(() => {
            if (dualTurnActive) {
              startDualTurn(nextSpeaker);
            }
          }, 600);
        } else {
          stopDualTurn(false);
          updateMonitorUI('idle', '통역 완료 ✨', `결과: "${targetText}"`);
        }
      });
    } else {
      stopDualTurn(false);
      updateMonitorUI('idle', '번역 실패 또는 결과 없음', '다시 말씀해 주시거나 아래 원클릭 버튼을 이용해 보세요.');
    }
  }

  // 외부 즉시 번역 트리거 함수 등록 (버튼 재터치 또는 '지금 번역' 클릭 시)
  window.executeDualTranslationNow = (forcedText) => {
    const textToRun = (forcedText || recognizedTextBuffer || document.getElementById('source-text')?.value || '').trim();
    if (textToRun) {
      triggerTranslation(textToRun);
    } else {
      stopDualTurn(true);
    }
  };

  rec.onresult = (event) => {
    let currentText = '';
    let isFinal = false;

    for (let i = 0; i < event.results.length; ++i) {
      currentText += event.results[i][0].transcript;
      if (event.results[i].isFinal) isFinal = true;
    }

    if (currentText) {
      recognizedTextBuffer = currentText;
      const inputEl = document.getElementById('source-text');
      if (inputEl) inputEl.value = currentText;
      updateMonitorUI('listening', '말씀 감지됨! 👂', `인식 중: "${currentText}"`);

      // ⏱️ 묵음 자동 감지 타이머 (0.75초간 말이 멈추면 isFinal 상관없이 100% 즉시 번역 트리거)
      if (speechSilenceTimer) clearTimeout(speechSilenceTimer);
      speechSilenceTimer = setTimeout(() => {
        if (!hasExecutedTranslation && recognizedTextBuffer.trim()) {
          triggerTranslation(recognizedTextBuffer);
        }
      }, 750);
    }

    // 최종 결과가 나왔을 때 즉시 번역
    if (isFinal && currentText.trim()) {
      if (speechSilenceTimer) clearTimeout(speechSilenceTimer);
      triggerTranslation(currentText);
    }
  };

  rec.onerror = (err) => {
    console.warn('Dual STT Error:', err);
    if (speechSilenceTimer) {
      clearTimeout(speechSilenceTimer);
      speechSilenceTimer = null;
    }

    if (err.error === 'not-allowed' || err.error === 'service-not-allowed') {
      showToast('⚠️ 마이크 사용 권한을 허용해 주세요!');
      updateMonitorUI('idle', '⚠️ 마이크 권한 차단됨', '브라우저 주소창 왼쪽 자물쇠 아이콘을 눌러 [마이크 허용]을 켜주세요.');
      stopDualTurn(false);
    } else if (err.error === 'no-speech') {
      // 아무 말도 하지 않음
    } else if (!hasExecutedTranslation && recognizedTextBuffer.trim()) {
      triggerTranslation(recognizedTextBuffer);
    } else {
      updateMonitorUI('idle', '마이크 연결 대기', '음성을 감지하지 못했습니다. 버튼을 누르고 다시 말씀해 보세요.');
    }
  };

  rec.onend = () => {
    if (speechSilenceTimer) {
      clearTimeout(speechSilenceTimer);
      speechSilenceTimer = null;
    }

    // 모바일 크롬 등에서 isFinal이 안 와서 번역이 안 돌았더라도 인식된 글자가 있으면 100% 번역 실행!
    if (!hasExecutedTranslation && recognizedTextBuffer.trim()) {
      triggerTranslation(recognizedTextBuffer);
    } else if (!hasExecutedTranslation) {
      stopDualTurn(false);
      updateMonitorUI('idle', '대기 상태', '음성을 듣지 못했습니다. 버튼을 누르고 편하게 다시 말씀해 주세요.');
    }
  };

  try {
    rec.start();
  } catch (e) {
    console.warn('SpeechRecognition start error:', e);
    stopDualTurn(false);
    updateMonitorUI('idle', '⚠️ 마이크 시작 실패', '브라우저 마이크를 다시 확인해 주세요.');
  }
}

function stopDualTurn(showMsg = true) {
  dualTurnActive = false;
  state.dualTurnSpeaker = null;
  state.isProcessingDualResult = false;
  recognizedTextBuffer = '';
  window.executeDualTranslationNow = null;

  if (speechSilenceTimer) {
    clearTimeout(speechSilenceTimer);
    speechSilenceTimer = null;
  }

  if (state.realtimeRecognition) {
    try { state.realtimeRecognition.stop(); } catch(e) {}
    state.realtimeRecognition = null;
  }

  const koBtn = document.getElementById('dual-speak-ko-btn');
  const jaBtn = document.getElementById('dual-listen-ja-btn');
  const koStatus = document.getElementById('dual-ko-status');
  const jaStatus = document.getElementById('dual-ja-status');
  const banner = document.getElementById('dual-live-banner');

  if (koBtn) koBtn.classList.remove('active');
  if (jaBtn) jaBtn.classList.remove('active');
  if (koStatus) koStatus.innerText = '터치하여 말하기';
  if (jaStatus) jaStatus.innerText = '터치하여 답변 듣기';
  if (banner) banner.style.display = 'none';

  if (showMsg) showToast('대화 통역이 중단되었습니다.');
}

function updateLangBarUI(src, tgt) {
  const srcPill = document.getElementById('src-lang-label');
  const tgtPill = document.getElementById('tgt-lang-label');
  const resultTag = document.getElementById('result-lang-tag');

  const srcName = src === 'ko' ? '🇰🇷 한국어' : '🇯🇵 日本語';
  const tgtName = tgt === 'ko' ? '🇰🇷 한국어' : '🇯🇵 日本語';

  if (srcPill) srcPill.innerText = srcName;
  if (tgtPill) tgtPill.innerText = tgtName;
  if (resultTag) resultTag.innerText = tgtName;
}

// 번역기용 일반 음성 입력
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    state.recognition = new SpeechRecognition();
    state.recognition.continuous = false;
    state.recognition.interimResults = false;

    state.recognition.onstart = () => {
      state.isRecording = true;
      updateMicButtonUI();
      showToast('음성을 듣고 있어요. 말씀해주세요...');
    };

    state.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const inputEl = document.getElementById('source-text');
      if (inputEl) {
        inputEl.value = transcript;
        performTranslation();
      }
    };

    state.recognition.onerror = () => {
      state.isRecording = false;
      updateMicButtonUI();
      showToast('음성을 인식하지 못했습니다. 다시 시도해주세요.');
    };

    state.recognition.onend = () => {
      state.isRecording = false;
      updateMicButtonUI();
    };
  }
}

function updateMicButtonUI() {
  const micBtn = document.getElementById('mic-btn');
  if (!micBtn) return;
  if (state.isRecording) {
    micBtn.classList.add('recording');
    micBtn.innerHTML = '<span>🔴</span> 듣는 중...';
  } else {
    micBtn.classList.remove('recording');
    micBtn.innerHTML = '<span>🎤</span> 음성입력';
  }
}

// 길찾기 지도용 음성 인식 (목적지 말하기)
function initMapSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    state.mapRecognition = new SpeechRecognition();
    state.mapRecognition.continuous = false;
    state.mapRecognition.interimResults = false;
    state.mapRecognition.lang = 'ko-KR';

    state.mapRecognition.onstart = () => {
      state.isMapRecording = true;
      const micBtn = document.getElementById('map-mic-btn');
      if (micBtn) micBtn.classList.add('recording');
      showToast('가고 싶은 곳을 말씀해주세요! (예: 도톤보리, 유니버설)');
    };

    state.mapRecognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.replace(/\.$/, '').trim();
      const input = document.getElementById('map-search-input');
      if (input) {
        input.value = transcript;
        searchPlace(transcript);
      }
    };

    state.mapRecognition.onerror = () => {
      state.isMapRecording = false;
      const micBtn = document.getElementById('map-mic-btn');
      if (micBtn) micBtn.classList.remove('recording');
      showToast('음성을 인식하지 못했습니다.');
    };

    state.mapRecognition.onend = () => {
      state.isMapRecording = false;
      const micBtn = document.getElementById('map-mic-btn');
      if (micBtn) micBtn.classList.remove('recording');
    };
  }
}

// ==========================================
// 5. Leaflet 인터랙티브 지도 구현
// ==========================================
function initLeafletMap() {
  const mapContainer = document.getElementById('map-container');
  if (!mapContainer || !window.L) return;

  // 오사카 도톤보리 중심 좌표
  const defaultLat = 34.668728;
  const defaultLng = 135.501302;

  state.map = L.map('map-container', {
    zoomControl: true
  }).setView([defaultLat, defaultLng], 14);

  // OpenStreetMap 타일 레이어
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(state.map);

  // 명소 및 맛집 마커 일괄 생성
  renderAllMapMarkers();

  // 기본 목적지로 도톤보리 글리코상 선택
  const defaultPlace = placesDatabase.find(p => p.id === 'spot-dotonbori');
  if (defaultPlace) {
    selectPlace(defaultPlace, false);
  }
}

function renderAllMapMarkers() {
  if (!state.map || !window.L) return;

  // 기존 마커 제거
  state.mapMarkers.forEach(m => state.map.removeLayer(m));
  state.mapMarkers = [];

  placesDatabase.forEach(place => {
    // 음식점과 일반 명소 아이콘 구분
    const isFood = place.type === 'food';
    const iconHtml = isFood
      ? `<div style="background: #EA580C; color: #FFF; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 3px 8px rgba(0,0,0,0.3); border: 2px solid #FFF;">🍴</div>`
      : `<div style="background: #2563EB; color: #FFF; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 3px 8px rgba(0,0,0,0.3); border: 2px solid #FFF;">📍</div>`;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'custom-leaflet-pin',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    const marker = L.marker([place.lat, place.lng], { icon: customIcon }).addTo(state.map);
    
    // 팝업 내용
    const popupContent = `
      <div style="font-family: inherit; font-size: 13px; min-width: 150px;">
        <strong style="font-size: 14px; color: #0F172A;">${escapeHtml(place.nameKo)}</strong><br>
        <span style="font-size: 11px; color: #64748B;">${escapeHtml(place.nameJa)}</span><br>
        <button onclick="window.onMapMarkerClick('${place.id}')" style="margin-top: 8px; width: 100%; background: #2563EB; color: #FFF; border: none; padding: 5px 8px; border-radius: 6px; font-weight: 700; cursor: pointer;">
          이곳으로 길찾기 ➔
        </button>
      </div>
    `;

    marker.bindPopup(popupContent);
    marker.placeData = place;

    marker.on('click', () => {
      selectPlace(place, false);
    });

    state.mapMarkers.push(marker);
  });
}

window.onMapMarkerClick = (placeId) => {
  const target = placesDatabase.find(p => p.id === placeId);
  if (target) {
    selectPlace(target, true);
  }
};

// 목적지 선택 시 상세 카드 갱신 및 지도 이동
function selectPlace(place, panTo = true) {
  state.selectedPlace = place;

  // 카드 UI 갱신
  const nameKoEl = document.getElementById('dest-name-ko');
  const nameJaEl = document.getElementById('dest-name-ja');
  const badgeEl = document.getElementById('dest-category');
  const descEl = document.getElementById('dest-desc');
  const transitBtn = document.getElementById('google-transit-btn');
  const walkBtn = document.getElementById('google-walk-btn');

  const badgeText = place.type === 'food' ? '오사카 맛집' : '인기 명소';
  if (badgeEl) badgeEl.innerText = badgeText;
  if (nameKoEl) nameKoEl.innerText = place.nameKo;
  if (nameJaEl) nameJaEl.innerText = place.nameJa;

  let descText = place.desc;
  if (place.menu) {
    descText += ` [대표메뉴: ${place.menu}]`;
  }
  if (descEl) descEl.innerText = descText;

  // 구글 맵 길찾기 링크 연결 (대중교통 / 도보)
  const destQuery = encodeURIComponent(`${place.nameJa} ${place.addressJa || ''}`);
  let transitUrl = `https://www.google.com/maps/dir/?api=1&destination=${destQuery}&travelmode=transit`;
  let walkUrl = `https://www.google.com/maps/dir/?api=1&destination=${destQuery}&travelmode=walking`;

  if (state.userCoords) {
    const origin = `${state.userCoords.lat},${state.userCoords.lng}`;
    transitUrl += `&origin=${origin}`;
    walkUrl += `&origin=${origin}`;
  }

  if (transitBtn) transitBtn.href = transitUrl;
  if (walkBtn) walkBtn.href = walkUrl;

  // 지도 포커스 이동
  if (panTo && state.map) {
    state.map.flyTo([place.lat, place.lng], 16, { duration: 1.2 });
  }
}

// 목적지 검색 함수 (음성 또는 텍스트)
function searchPlace(query) {
  if (!query || !query.trim()) {
    showToast('검색어를 입력하거나 말씀해주세요.');
    return;
  }

  const clean = query.toLowerCase().replace(/\s+/g, '');
  
  // 데이터베이스에서 스마트 매칭
  const matched = placesDatabase.find(p => {
    const koClean = p.nameKo.toLowerCase().replace(/\s+/g, '');
    const jaClean = p.nameJa.toLowerCase().replace(/\s+/g, '');
    const descClean = p.desc.toLowerCase().replace(/\s+/g, '');
    const areaClean = (p.area || '').toLowerCase().replace(/\s+/g, '');
    return koClean.includes(clean) || clean.includes(koClean) ||
           jaClean.includes(clean) || descClean.includes(clean) || areaClean.includes(clean);
  });

  if (matched) {
    selectPlace(matched, true);
    // 마커 팝업 열기
    const marker = state.mapMarkers.find(m => m.placeData && m.placeData.id === matched.id);
    if (marker) marker.openPopup();
    showToast(`'${matched.nameKo}' 위치를 찾았습니다! 🎯`);
  } else {
    // DB에 없는 경우 구글 지도 검색으로 바로 안내
    showToast(`'${query}' 위치를 구글 지도로 탐색합니다...`);
    const directGoogleUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query + ' 大阪')}`;
    window.open(directGoogleUrl, '_blank');
  }
}

// 내 위치 찾기 (GPS)
function findMyLocation() {
  if (!navigator.geolocation) {
    showToast('이 기기에서는 위치 정보를 지원하지 않습니다.');
    return;
  }

  showToast('현재 내 위치를 확인하고 있습니다... 📡');

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      state.userCoords = { lat, lng };

      if (state.map && window.L) {
        if (state.userMarker) {
          state.map.removeLayer(state.userMarker);
        }

        const userIcon = L.divIcon({
          html: `<div style="background: #10B981; color: #FFF; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.3);">👤</div>`,
          className: 'user-location-pin',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        state.userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(state.map);
        state.userMarker.bindPopup('<strong>📍 현재 내 위치</strong>').openPopup();
        state.map.flyTo([lat, lng], 15);
      }

      // 현재 선택된 목적지가 있다면 길찾기 링크에 출발지 자동 반영
      if (state.selectedPlace) {
        selectPlace(state.selectedPlace, false);
      }

      showToast('내 위치를 지도에 표시했습니다! 📍');
    },
    (err) => {
      console.warn('Geolocation error:', err);
      showToast('위치 정보를 가져올 수 없습니다. 권한을 확인해주세요.');
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

// ==========================================
// 6. 오사카 맛집 큐레이션 렌더링
// ==========================================
function renderFoodList() {
  const container = document.getElementById('food-list-container');
  if (!container) return;

  const foodPlaces = placesDatabase.filter(p => p.type === 'food');
  const filtered = state.currentFoodCategory === 'all'
    ? foodPlaces
    : foodPlaces.filter(p => p.cat === state.currentFoodCategory);

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #94A3B8; padding: 24px;">해당 카테고리의 맛집 정보가 없습니다.</div>';
    return;
  }

  container.innerHTML = filtered.map(item => {
    const destQuery = encodeURIComponent(`${item.nameJa} ${item.addressJa}`);
    const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destQuery}&travelmode=transit`;

    return `
      <div class="food-card">
        <div class="food-header">
          <div class="food-title-group">
            <div class="food-name-ko">${escapeHtml(item.nameKo)}</div>
            <div class="food-name-ja">${escapeHtml(item.nameJa)}</div>
          </div>
          <button class="icon-btn" onclick="speakText('${escapeHtml(item.nameJa)}', 'ja')" title="가게 이름 일본어 발음 듣기">
            🔊
          </button>
        </div>

        <div class="food-meta-row">
          <span class="food-tag">${getFoodCategoryName(item.cat)}</span>
          <span class="food-area">📍 ${escapeHtml(item.area)}</span>
        </div>

        <div class="food-desc">
          ${escapeHtml(item.desc)}<br>
          <strong style="color: #EA580C; font-size: 11px;">추천: ${escapeHtml(item.menu)}</strong>
        </div>

        <div class="food-action-row">
          <button class="food-btn primary" onclick="goToMapPlace('${item.id}')">
            <span>📍</span> 지도에서 보기
          </button>
          <a href="${gmapsUrl}" target="_blank" class="food-btn accent">
            <span>🧭</span> 구글 길찾기
          </a>
        </div>
      </div>
    `;
  }).join('');
}

function getFoodCategoryName(cat) {
  const map = {
    takoyaki: '🐙 타코야키',
    okonomiyaki: '🥞 오코노미야키',
    ramen: '🍜 라멘',
    kushikatsu: '🍢 쿠시카츠',
    beef: '🥩 규카츠/야키니쿠',
    sushi: '🍣 스시/초밥',
    dessert: '🍰 디저트'
  };
  return map[cat] || '맛집';
}

// 맛집 카드에서 [지도에서 보기] 클릭 시
window.goToMapPlace = (placeId) => {
  const target = placesDatabase.find(p => p.id === placeId);
  if (!target) return;

  switchTab('map');
  setTimeout(() => {
    selectPlace(target, true);
    const marker = state.mapMarkers.find(m => m.placeData && m.placeData.id === target.id);
    if (marker) marker.openPopup();
  }, 200);
};

// ==========================================
// 7. 일본어 ➔ 한글 발음 변환 엔진 & 실시간 번역
// ==========================================

// 자주 쓰이는 여행 일본어 완벽 매핑
const quickTravelPhrases = {
  'これをお願いします': '고레오 오네가이시마스 (이것으로 부탁해요)',
  'これください': '고레 쿠다사이 (이거 주세요)',
  'いくらですか': '이쿠라데스카? (얼마예요?)',
  'これはいくらですか': '고레와 이쿠라데스카? (이것은 얼마예요?)',
  'こんにちは': '콘니치와 (안녕하세요)',
  'こんばんは': '콘방와 (안녕하세요)',
  'おはようございます': '오하요-고자이마스 (좋은 아침입니다)',
  'ありがとうございます': '아리가토-고자이마스 (감사합니다)',
  'どうも': '도-모 (고마워요 / 안녕)',
  'すみません': '스미마센 (저기요 / 죄송합니다)',
  'ごめんなさい': '고멘나사이 (미안합니다)',
  'はい': '하이 (네)',
  'いいえ': '이이에 (아니요)',
  'お会計をお願いします': '오카이케이오 오네가이시마스 (계산 부탁드립니다)',
  'トイレはどこですか': '토이레와 도코데스카? (화장실은 어디인가요?)',
  '駅はどこですか': '에키와 도코데스카? (역은 어디인가요?)',
  'おすすめは何ですか': '오스스메와 난데스카? (추천 메뉴가 무엇인가요?)',
  'おいしい': '오이시이 (맛있어요)',
  'ごちそうさまでした': '고치소-사마데시타 (잘 먹었습니다)',
  '大丈夫です': '다이죠-부데스 (괜찮습니다)',
  'わかりました': '와카리마시타 (알겠습니다)',
  'わかりません': '와카리마센 (모르겠습니다)'
};

// 헵번식 로마자 ➔ 자연스러운 한글 발음 변환 함수
function romajiToHangul(romaji) {
  if (!romaji || typeof romaji !== 'string') return '';
  let s = romaji.toLowerCase();
  
  // 장음 기호 및 모음 연속 정규화
  s = s.replace(/[āáà]/g, 'a-').replace(/[īíì]/g, 'i-').replace(/[ūúù]/g, 'u-').replace(/[ēéè]/g, 'e-').replace(/[ōóò]/g, 'o-');
  s = s.replace(/oo/g, 'o-').replace(/ou/g, 'o-').replace(/uu/g, 'u-');

  // 3글자 음절 매핑
  const map3 = {
    'kya': '캬', 'kyu': '큐', 'kyo': '쿄',
    'sha': '샤', 'shu': '슈', 'sho': '쇼', 'shi': '시',
    'cha': '차', 'chu': '추', 'cho': '초', 'chi': '치',
    'tsu': '츠',
    'nya': '냐', 'nyu': '뉴', 'nyo': '뇨',
    'hya': '햐', 'hyu': '휴', 'hyo': '효',
    'mya': '먀', 'myu': '뮤', 'myo': '묘',
    'rya': '랴', 'ryu': '류', 'ryo': '료',
    'gya': '갸', 'gyu': '규', 'gyo': '교',
    'bya': '뱌', 'byu': '뷰', 'byo': '뵤',
    'pya': '퍄', 'pyu': '퓨', 'pyo': '표',
    'ja': '자', 'ju': '주', 'jo': '조', 'ji': '지'
  };

  // 2글자 음절 매핑
  const map2 = {
    'ka': '카', 'ki': '키', 'ku': '쿠', 'ke': '케', 'ko': '코',
    'sa': '사', 'si': '시', 'su': '스', 'se': '세', 'so': '소',
    'ta': '타', 'ti': '치', 'tu': '츠', 'te': '테', 'to': '토',
    'na': '나', 'ni': '니', 'nu': '누', 'ne': '네', 'no': '노',
    'ha': '하', 'hi': '히', 'fu': '후', 'hu': '후', 'he': '헤', 'ho': '호',
    'ma': '마', 'mi': '미', 'mu': '무', 'me': '메', 'mo': '모',
    'ya': '야', 'yu': '유', 'yo': '요',
    'ra': '라', 'ri': '리', 'ru': '루', 're': '레', 'ro': '로',
    'wa': '와', 'wo': '오',
    'ga': '가', 'gi': '기', 'gu': '구', 'ge': '게', 'go': '고',
    'za': '자', 'zi': '지', 'zu': '즈', 'ze': '제', 'zo': '조',
    'da': '다', 'di': '디', 'du': '두', 'de': '데', 'do': '도',
    'ba': '바', 'bi': '비', 'bu': '부', 'be': '베', 'bo': '보',
    'pa': '파', 'pi': '피', 'pu': '푸', 'pe': '페', 'po': '포'
  };

  const map1 = {
    'a': '아', 'i': '이', 'u': '우', 'e': '에', 'o': '오',
    '-': '-'
  };

  let res = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] === ' ' || s[i] === '?' || s[i] === '!' || s[i] === ',' || s[i] === '.') {
      res += s[i];
      i++;
      continue;
    }

    if (i + 3 <= s.length && map3[s.slice(i, i + 3)]) {
      res += map3[s.slice(i, i + 3)];
      i += 3;
      continue;
    }

    // 촉음 (tt, kk, ss, pp 등)
    if (i + 2 <= s.length && s[i] === s[i + 1] && !'aeiou- '.includes(s[i])) {
      res += 'ㅅ';
      i++;
      continue;
    }

    if (i + 2 <= s.length && map2[s.slice(i, i + 2)]) {
      res += map2[s.slice(i, i + 2)];
      i += 2;
      continue;
    }

    // 받침 n 처리
    if (s[i] === 'n') {
      const next = s[i + 1];
      if (!next || !'aeiouy'.includes(next)) {
        res += 'ㄴ';
        i++;
        continue;
      }
    }

    if (map1[s[i]]) {
      res += map1[s[i]];
      i++;
      continue;
    }

    res += s[i];
    i++;
  }

  // 받침 'ㄴ' 결합 정돈
  res = res.replace(/아ㄴ/g, '안').replace(/이ㄴ/g, '인').replace(/우ㄴ/g, '운').replace(/에ㄴ/g, '엔').replace(/오ㄴ/g, '온')
           .replace(/카ㄴ/g, '칸').replace(/키ㄴ/g, '킨').replace(/쿠ㄴ/g, '쿤').replace(/케ㄴ/g, '켄').replace(/코ㄴ/g, '콘')
           .replace(/사ㄴ/g, '산').replace(/시ㄴ/g, '신').replace(/스ㄴ/g, '슨').replace(/세ㄴ/g, '센').replace(/소ㄴ/g, '손')
           .replace(/타ㄴ/g, '탄').replace(/치ㄴ/g, '친').replace(/츠ㄴ/g, '츤').replace(/테ㄴ/g, '텐').replace(/토ㄴ/g, '톤')
           .replace(/나ㄴ/g, '난').replace(/니ㄴ/g, '닌').replace(/누ㄴ/g, '눈').replace(/네ㄴ/g, '넨').replace(/노ㄴ/g, '논')
           .replace(/하ㄴ/g, '한').replace(/히ㄴ/g, '힌').replace(/후ㄴ/g, '훈').replace(/헤ㄴ/g, '헨').replace(/호ㄴ/g, '혼')
           .replace(/마ㄴ/g, '만').replace(/미ㄴ/g, '민').replace(/무ㄴ/g, '문').replace(/메ㄴ/g, '멘').replace(/모ㄴ/g, '몬')
           .replace(/라ㄴ/g, '란').replace(/리ㄴ/g, '린').replace(/루ㄴ/g, '룬').replace(/레ㄴ/g, '렌').replace(/로ㄴ/g, '론')
           .replace(/가ㄴ/g, '간').replace(/기ㄴ/g, '긴').replace(/구ㄴ/g, '군').replace(/게ㄴ/g, '겐').replace(/고ㄴ/g, '곤')
           .replace(/자ㄴ/g, '잔').replace(/지ㄴ/g, '진').replace(/즈ㄴ/g, '즌').replace(/제ㄴ/g, '젠').replace(/조ㄴ/g, '존')
           .replace(/다ㄴ/g, '단').replace(/디ㄴ/g, '딘').replace(/두ㄴ/g, '둔').replace(/데ㄴ/g, '덴').replace(/도ㄴ/g, '돈')
           .replace(/바ㄴ/g, '반').replace(/비ㄴ/g, '빈').replace(/부ㄴ/g, '분').replace(/베ㄴ/g, '벤').replace(/보ㄴ/g, '본')
           .replace(/파ㄴ/g, '판').replace(/피ㄴ/g, '핀').replace(/푸ㄴ/g, '푼').replace(/페ㄴ/g, '펜').replace(/포ㄴ/g, '폰');

  return res.trim();
}

// 히라가나/가타카나 직접 한글 변환 함수
function kanaToHangul(kana) {
  if (!kana || typeof kana !== 'string') return '';
  const kMap = {
    'あ': '아', 'い': '이', 'う': '우', 'え': '에', 'お': '오',
    'か': '카', 'き': '키', 'く': '쿠', 'け': '케', 'こ': '코',
    'さ': '사', 'し': '시', 'す': '스', 'せ': '세', 'そ': '소',
    'た': '타', 'ち': '치', 'つ': '츠', 'て': '테', 'と': '토',
    'な': '나', 'に': '니', 'ぬ': '누', 'ね': '네', 'の': '노',
    'は': '하', 'ひ': '히', 'ふ': '후', 'へ': '헤', 'ほ': '호',
    'ま': '마', 'み': '미', 'む': '무', 'め': '메', 'も': '모',
    'や': '야', 'ゆ': '유', 'よ': '요',
    'ら': '라', 'り': '리', 'る': '루', 'れ': '레', 'ろ': '로',
    'わ': '와', 'を': '오', 'ん': 'ㄴ',
    'が': '가', 'ぎ': '기', 'ぐ': '구', 'げ': '게', 'ご': '고',
    'ざ': '자', 'じ': '지', 'ず': '즈', 'ぜ': '제', 'ぞ': '조',
    'だ': '다', 'ぢ': '지', 'づ': '즈', 'で': '데', 'ど': '도',
    'ば': '바', 'び': '비', 'ぶ': '부', 'べ': '베', 'ぼ': '보',
    'ぱ': '파', 'ぴ': '피', 'ぷ': '푸', 'ぺ': '페', 'ぽ': '포',
    'きゃ': '캬', 'きゅ': '큐', 'きょ': '쿄',
    'しゃ': '샤', 'しゅ': '슈', 'しょ': '쇼',
    'ちゃ': '차', 'ちゅ': '추', 'ちょ': '초',
    'にゃ': '냐', 'にゅ': '뉴', 'にょ': '뇨',
    'ひゃ': '햐', 'ひゅ': '휴', 'ひょ': '효',
    'みゃ': '먀', 'みゅ': '뮤', 'みょ': '묘',
    'りゃ': '랴', 'りゅ': '류', 'りょ': '료',
    'ぎゃ': '갸', 'ぎゅ': '규', 'ぎょ': '교',
    'じゃ': '자', 'じゅ': '주', 'じょ': '조',
    'びゃ': '뱌', 'びゅ': '뷰', 'びょ': '뵤',
    'ぴゃ': '퍄', 'ぴゅ': '퓨', 'ぴょ': '표',
    'っ': 'ㅅ', 'ー': '-'
  };

  let h = '';
  for (let i = 0; i < kana.length; i++) {
    const code = kana.charCodeAt(i);
    if (code >= 0x30a1 && code <= 0x30f6) {
      h += String.fromCharCode(code - 0x60);
    } else {
      h += kana[i];
    }
  }

  let out = '';
  let i = 0;
  while (i < h.length) {
    if (i + 2 <= h.length && kMap[h.slice(i, i + 2)]) {
      out += kMap[h.slice(i, i + 2)];
      i += 2;
    } else if (kMap[h[i]]) {
      out += kMap[h[i]];
      i++;
    } else {
      out += h[i];
      i++;
    }
  }

  out = out.replace(/아ㄴ/g, '안').replace(/이ㄴ/g, '인').replace(/우ㄴ/g, '운').replace(/에ㄴ/g, '엔').replace(/오ㄴ/g, '온')
           .replace(/카ㄴ/g, '칸').replace(/키ㄴ/g, '킨').replace(/쿠ㄴ/g, '쿤').replace(/케ㄴ/g, '켄').replace(/코ㄴ/g, '콘')
           .replace(/사ㄴ/g, '산').replace(/시ㄴ/g, '신').replace(/스ㄴ/g, '슨').replace(/세ㄴ/g, '센').replace(/소ㄴ/g, '손')
           .replace(/타ㄴ/g, '탄').replace(/치ㄴ/g, '친').replace(/츠ㄴ/g, '츤').replace(/테ㄴ/g, '텐').replace(/토ㄴ/g, '톤')
           .replace(/나ㄴ/g, '난').replace(/니ㄴ/g, '닌').replace(/누ㄴ/g, '눈').replace(/네ㄴ/g, '넨').replace(/노ㄴ/g, '논')
           .replace(/하ㄴ/g, '한').replace(/히ㄴ/g, '힌').replace(/후ㄴ/g, '훈').replace(/헤ㄴ/g, '헨').replace(/호ㄴ/g, '혼')
           .replace(/마ㄴ/g, '만').replace(/미ㄴ/g, '민').replace(/무ㄴ/g, '문').replace(/메ㄴ/g, '멘').replace(/모ㄴ/g, '몬')
           .replace(/라ㄴ/g, '란').replace(/리ㄴ/g, '린').replace(/루ㄴ/g, '룬').replace(/레ㄴ/g, '렌').replace(/로ㄴ/g, '론')
           .replace(/가ㄴ/g, '간').replace(/기ㄴ/g, '긴').replace(/구ㄴ/g, '군').replace(/게ㄴ/g, '겐').replace(/고ㄴ/g, '곤')
           .replace(/자ㄴ/g, '잔').replace(/지ㄴ/g, '진').replace(/즈ㄴ/g, '즌').replace(/제ㄴ/g, '젠').replace(/조ㄴ/g, '존')
           .replace(/다ㄴ/g, '단').replace(/디ㄴ/g, '딘').replace(/두ㄴ/g, '둔').replace(/데ㄴ/g, '덴').replace(/도ㄴ/g, '돈')
           .replace(/바ㄴ/g, '반').replace(/비ㄴ/g, '빈').replace(/부ㄴ/g, '분').replace(/베ㄴ/g, '벤').replace(/보ㄴ/g, '본')
           .replace(/파ㄴ/g, '판').replace(/피ㄴ/g, '핀').replace(/푸ㄴ/g, '푼').replace(/페ㄴ/g, '펜').replace(/포ㄴ/g, '폰');

  return out.trim();
}

// 최종 한국어 발음 표기 조합기
function convertToKoreanPronunciation(japaneseText, rawRomaji) {
  if (!japaneseText) return '';

  const stripped = japaneseText.replace(/[。！？\s]/g, '');
  for (const [key, val] of Object.entries(quickTravelPhrases)) {
    if (stripped === key.replace(/[。！？\s]/g, '')) {
      return val;
    }
  }

  if (rawRomaji && typeof rawRomaji === 'string' && rawRomaji.trim().length > 0) {
    const hangul = romajiToHangul(rawRomaji);
    if (hangul) return hangul;
  }

  return kanaToHangul(japaneseText);
}

// 네이버 파파고 공식 연동 링크 동적 동기화
function updatePapagoLink(text) {
  const papagoBtn = document.getElementById('papago-direct-btn');
  const hintText = document.getElementById('papago-hint-text');
  if (!papagoBtn) return;
  const clean = (text || '').trim();
  if (clean) {
    const sl = state.sourceLang || 'ko';
    const tl = state.targetLang || 'ja';
    papagoBtn.href = `https://papago.naver.com/?sk=${sl}&tk=${tl}&st=${encodeURIComponent(clean)}`;
    if (hintText) hintText.innerText = `"${clean.slice(0, 16)}${clean.length > 16 ? '...' : ''}" 파파고로 바로 번역하기 ➔`;
  } else {
    papagoBtn.href = 'https://papago.naver.com/?sk=ko&tk=ja';
    if (hintText) hintText.innerText = '위 입력창에 적힌 문장을 파파고로 그대로 보냅니다';
  }
}

// 실시간 번역 실행 (isLive: 실시간 타이핑 여부)
async function performTranslation(isLive = false) {
  const inputEl = document.getElementById('source-text');
  const text = inputEl ? inputEl.value.trim() : '';

  updatePapagoLink(text);

  if (!text) {
    if (!isLive) showToast('번역할 내용을 입력해주세요!');
    inputEl && inputEl.focus();
    return;
  }

  const targetTextEl = document.getElementById('target-text');
  const readingEl = document.getElementById('target-reading');
  const pronounceBox = document.getElementById('pronounce-box');

  if (!isLive) {
    targetTextEl.innerText = '번역 중입니다... ⏳';
    if (pronounceBox) pronounceBox.style.display = 'none';
  }

  try {
    const sl = state.sourceLang;
    const tl = state.targetLang;

    let translated = '';
    let rawRomaji = '';

    // 1차 시도: Google Translate API
    try {
      const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&dt=rm&q=${encodeURIComponent(text)}`;
      const resp = await fetch(gUrl);
      if (resp.ok) {
        const data = await resp.json();
        if (data && data[0]) {
          translated = data[0].filter(item => item[0]).map(item => item[0]).join('');
          
          for (let k = 0; k < data[0].length; k++) {
            const seg = data[0][k];
            if (seg && seg.length > 2 && typeof seg[2] === 'string' && seg[2].trim()) {
              rawRomaji = seg[2];
            } else if (seg && seg.length > 3 && typeof seg[3] === 'string' && seg[3].trim()) {
              rawRomaji = seg[3];
            }
          }
        }
      }
    } catch (gErr) {
      console.warn('Google endpoint error, trying backup...', gErr);
    }

    // 2차 시도: MyMemory API 백업
    if (!translated) {
      const mUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sl}|${tl}`;
      const mResp = await fetch(mUrl);
      if (mResp.ok) {
        const mData = await mResp.json();
        if (mData && mData.responseData) {
          translated = mData.responseData.translatedText;
        }
      }
    }

    if (!translated) {
      throw new Error('번역 결과를 가져올 수 없습니다.');
    }

    targetTextEl.innerText = translated;

    // 일본어로 번역되었을 때: 한글 발음 표시 및 자동 음성 재생
    if (tl === 'ja') {
      const koreanPronounce = convertToKoreanPronunciation(translated, rawRomaji);
      state.lastPronunciation = koreanPronounce;

      if (koreanPronounce) {
        if (readingEl) readingEl.innerText = koreanPronounce;
        if (pronounceBox) pronounceBox.style.display = 'block';
      }

      // 실시간 타이핑이 아니며, 양방향 대화 통역 중이 아닐 때만 자체 자동 음성 재생
      const autoCheck = document.getElementById('auto-speak-check');
      if (!isLive && !state.dualTurnSpeaker && autoCheck && autoCheck.checked) {
        speakText(translated, 'ja');
      }
    } else {
      state.lastPronunciation = '';
      if (pronounceBox) pronounceBox.style.display = 'none';

      const autoCheck = document.getElementById('auto-speak-check');
      if (!isLive && !state.dualTurnSpeaker && autoCheck && autoCheck.checked) {
        speakText(translated, 'ko');
      }
    }

    addHistoryItem(text, translated, sl, tl);

  } catch (err) {
    console.error('Translation error:', err);
    if (!isLive) {
      targetTextEl.innerText = '번역 중 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
    }
  }
}

function swapLanguages() {
  const temp = state.sourceLang;
  state.sourceLang = state.targetLang;
  state.targetLang = temp;

  const srcPill = document.getElementById('src-lang-label');
  const tgtPill = document.getElementById('tgt-lang-label');
  const resultTag = document.getElementById('result-lang-tag');

  const srcName = state.sourceLang === 'ko' ? '🇰🇷 한국어' : '🇯🇵 日本語';
  const tgtName = state.targetLang === 'ko' ? '🇰🇷 한국어' : '🇯🇵 日本語';

  if (srcPill) srcPill.innerText = srcName;
  if (tgtPill) tgtPill.innerText = tgtName;
  if (resultTag) resultTag.innerText = tgtName;

  const sourceInput = document.getElementById('source-text');
  const targetText = document.getElementById('target-text');

  const prevSource = sourceInput.value.trim();
  const prevTarget = targetText.innerText.trim();

  if (prevTarget && prevTarget !== '번역 결과가 여기에 표시됩니다.') {
    sourceInput.value = prevTarget;
    targetText.innerText = prevSource || '번역 결과가 여기에 표시됩니다.';
  }

  // 실시간 음성 통역 텍스트 동기화
  const voiceDesc = document.getElementById('realtime-voice-desc');
  const langName = state.sourceLang === 'ko' ? '한국어' : '일본어';
  const targetName = state.targetLang === 'ko' ? '한국어' : '일본어';
  if (voiceDesc) {
    voiceDesc.innerText = `${langName}로 말하면 즉시 ${targetName}로 번역해서 말해줍니다`;
  }

  if (state.isRealtimeVoiceActive) {
    startRealtimeListening();
  }

  showToast(`번역 방향: ${srcName} ➔ ${tgtName}`);
}

function toggleSpeechRecognition() {
  if (!state.recognition) {
    showToast('이 브라우저는 음성 인식을 지원하지 않습니다.');
    return;
  }

  if (state.isRecording) {
    state.recognition.stop();
  } else {
    state.recognition.lang = state.sourceLang === 'ko' ? 'ko-KR' : 'ja-JP';
    try {
      state.recognition.start();
    } catch (e) {
      console.warn(e);
    }
  }
}

function toggleMapSpeechRecognition() {
  if (!state.mapRecognition) {
    showToast('이 브라우저는 음성 인식을 지원하지 않습니다.');
    return;
  }

  if (state.isMapRecording) {
    state.mapRecognition.stop();
  } else {
    try {
      state.mapRecognition.start();
    } catch (e) {
      console.warn(e);
    }
  }
}

// ==========================================
// 8. TTS 음성 합성 & 복사 & 모달 (하이브리드: 구글 TTS 오디오 + Web Speech API)
// ==========================================
let currentTtsAudio = null;
let lastSpokenText = '';
let lastSpokenTime = 0;

function speakText(text, lang = 'ja', onEndCallback = null) {
  if (!text || text === '번역 결과가 여기에 표시됩니다.') {
    if (onEndCallback) onEndCallback();
    return;
  }

  // 🛡️ 발화 중복 차단
  const now = Date.now();
  if (text === lastSpokenText && (now - lastSpokenTime) < 800) {
    if (onEndCallback) onEndCallback();
    return;
  }
  lastSpokenText = text;
  lastSpokenTime = now;

  let callbackFired = false;
  const finishSpeech = () => {
    if (!callbackFired) {
      callbackFired = true;
      state.isSpeakingNow = false;
      if (onEndCallback) onEndCallback();
    }
  };

  const safetyTimeout = setTimeout(finishSpeech, Math.max(4000, text.length * 400));
  state.isSpeakingNow = true;
  showToast(lang === 'ja' ? '🔊 [일본어] 음성 낭독 중...' : '🔊 [한국어] 음성 낭독 중...');

  if ('speechSynthesis' in window) {
    try {
      // 🚨 절대 cancel()을 호출하지 마세요. 안드로이드에서 큐가 꼬였을 때 cancel()을 호출하면 영구 데드락(먹통)이 발생합니다.
      
      const utterance = new SpeechSynthesisUtterance(text);
      const langCode = lang === 'ko' ? 'ko-KR' : 'ja-JP';
      utterance.lang = langCode;
      utterance.rate = 0.95;
      utterance.volume = 1.0;

      // 안드로이드 삼성폰 등에서는 getVoices()에 일본어가 안 보일 수 있지만
      // utterance.lang만 설정해주면 자체적으로 알아서 읽어줌
      if (state.voices && state.voices.length > 0) {
        const voice = state.voices.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(lang.toLowerCase()));
        if (voice) utterance.voice = voice;
      }

      utterance.onend = () => { clearTimeout(safetyTimeout); finishSpeech(); };
      utterance.onerror = () => { clearTimeout(safetyTimeout); finishSpeech(); };

      window.speechSynthesis.speak(utterance);
      return;
    } catch(e) {
      finishSpeech();
    }
  } else {
    finishSpeech();
  }
}

function copyToClipboard(text) {
  if (!text || text === '번역 결과가 여기에 표시됩니다.') {
    showToast('복사할 텍스트가 없습니다.');
    return;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('클립보드에 복사되었습니다! ✨');
    }).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
  showToast('클립보드에 복사되었습니다! ✨');
}

function openShowingModal(jaText, reading, koText) {
  const modal = document.getElementById('showing-modal');
  const jaEl = document.getElementById('modal-ja-text');
  const rdEl = document.getElementById('modal-reading-text');
  const koEl = document.getElementById('modal-ko-text');

  if (jaEl) jaEl.innerText = jaText;
  if (rdEl) rdEl.innerText = reading ? `[발음] ${reading}` : '';
  if (koEl) koEl.innerText = koText;

  if (modal) modal.classList.add('active');
}

function openShowingModalFromTranslation() {
  const targetText = document.getElementById('target-text').innerText;
  const sourceText = document.getElementById('source-text').value;
  const readingText = state.lastPronunciation || document.getElementById('target-reading').innerText;

  if (!targetText || targetText === '번역 결과가 여기에 표시됩니다.') {
    showToast('먼저 문장을 번역해주세요.');
    return;
  }

  openShowingModal(targetText, readingText, sourceText);
}

function openShowingModalFromPlace() {
  if (!state.selectedPlace) {
    showToast('목적지를 먼저 선택해주세요.');
    return;
  }
  const p = state.selectedPlace;
  const jaText = `${p.nameJa}へ行ってください。\n(${p.addressJa})`;
  const koText = `${p.nameKo}(으)로 가주세요.`;
  openShowingModal(jaText, '', koText);
}

function closeModal() {
  const modal = document.getElementById('showing-modal');
  if (modal) modal.classList.remove('active');
}

// ==========================================
// 9. 회화 & 일정 렌더링
// ==========================================
function renderPhrases() {
  const container = document.getElementById('phrases-container');
  if (!container) return;

  const filtered = state.currentPhraseCategory === 'all'
    ? phraseDatabase
    : phraseDatabase.filter(p => p.cat === state.currentPhraseCategory);

  container.innerHTML = filtered.map(p => `
    <div class="phrase-card">
      <div style="flex: 1;">
        <div class="phrase-ko">${escapeHtml(p.ko)}</div>
        <div class="phrase-ja">${escapeHtml(p.ja)}</div>
        <div class="phrase-reading">${escapeHtml(p.reading)}</div>
        ${p.tip ? `<div class="phrase-tip">💡 ${escapeHtml(p.tip)}</div>` : ''}
      </div>
      <div style="display: flex; flex-direction: column; gap: 4px; margin-left: 8px;">
        <button class="icon-btn primary" onclick="speakText('${escapeHtml(p.ja)}', 'ja')" title="발음 듣기">
          🔊 듣기
        </button>
        <button class="icon-btn" onclick="openShowingModal('${escapeHtml(p.ja)}', '${escapeHtml(p.reading)}', '${escapeHtml(p.ko)}')" title="크게 보여주기">
          📱 보여주기
        </button>
      </div>
    </div>
  `).join('');
}

function renderPlans() {
  const currentDayData = state.plans[state.selectedDay];
  if (!currentDayData) return;

  const titleEl = document.getElementById('day-header-title');
  const descEl = document.getElementById('day-header-desc');
  const listEl = document.getElementById('plan-items-list');

  if (titleEl) titleEl.innerHTML = `<span>🗓️</span> ${escapeHtml(currentDayData.title)}`;
  if (descEl) descEl.innerText = currentDayData.desc;

  if (listEl) {
    if (currentDayData.items.length === 0) {
      listEl.innerHTML = '<div style="text-align: center; color: #94A3B8; padding: 20px;">등록된 일정이 없습니다. 아래에서 추가해보세요!</div>';
      return;
    }

    listEl.innerHTML = currentDayData.items.map(item => `
      <div class="plan-item ${item.done ? 'done' : ''}">
        <div class="plan-left">
          <input type="checkbox" class="plan-checkbox" ${item.done ? 'checked' : ''} onchange="togglePlanDone('${item.id}')">
          <div>
            <div class="plan-name">${escapeHtml(item.text)}</div>
            ${item.note ? `<div class="plan-note">${escapeHtml(item.note)}</div>` : ''}
          </div>
        </div>
        <button class="icon-btn" onclick="deletePlan('${item.id}')" title="삭제" style="color: #94A3B8; border: none; background: transparent; padding: 4px;">
          🗑️
        </button>
      </div>
    `).join('');
  }
}

window.togglePlanDone = (id) => {
  const dayData = state.plans[state.selectedDay];
  const targetItem = dayData.items.find(it => it.id === id);
  if (targetItem) {
    targetItem.done = !targetItem.done;
    savePlans();
    renderPlans();
    if (targetItem.done) showToast('일정을 완료했습니다! 🎉');
  }
};

function addNewPlan() {
  const input = document.getElementById('new-plan-input');
  const text = input ? input.value.trim() : '';

  if (!text) {
    showToast('추가할 일정 내용을 입력해주세요.');
    return;
  }

  const dayData = state.plans[state.selectedDay];
  dayData.items.push({
    id: `${state.selectedDay}-${Date.now()}`,
    text: text,
    note: '내가 추가한 여행 계획',
    done: false
  });

  savePlans();
  input.value = '';
  renderPlans();
  showToast('새 일정이 추가되었습니다! 📌');
}

window.deletePlan = (id) => {
  const dayData = state.plans[state.selectedDay];
  dayData.items = dayData.items.filter(it => it.id !== id);
  savePlans();
  renderPlans();
  showToast('일정이 삭제되었습니다.');
};

// ==========================================
// 10. 탭 전환 및 이벤트 리스너
// ==========================================
function switchTab(tabId) {
  state.currentTab = tabId;
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  const targetPane = document.getElementById(`pane-${tabId}`);
  const targetNav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);

  if (targetPane) targetPane.classList.add('active');
  if (targetNav) targetNav.classList.add('active');

  // 지도 탭으로 전환 시 크기 재계산 (Leaflet 깨짐 방지)
  if (tabId === 'map' && state.map) {
    setTimeout(() => {
      state.map.invalidateSize();
    }, 150);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 히스토리 저장 안전 헬퍼
function addHistoryItem(sourceText, targetText, sl, tl) {
  try {
    if (!state.history) state.history = [];
    state.history.unshift({
      source: sourceText,
      target: targetText,
      from: sl,
      to: tl,
      time: Date.now()
    });
    if (state.history.length > 50) state.history.pop();
    localStorage.setItem('osaka_trans_history', JSON.stringify(state.history));
  } catch (e) {
    console.warn('Save history error:', e);
  }
}

// ==========================================
// 4. 한·일 실시간 양방향 음성 통역 엔진 (OsakaGo Voice Direct Dual)
// ==========================================
let voiceTurnRec = null;
let activeVoiceSpeaker = null; // 'ko' | 'ja' | null
let voiceTurnBuffer = '';
let voiceSilenceTimer = null;
let isSessionProcessing = false; // 🛡️ 세션 처리 중 락 (타이머+버튼+onend 3중 호출 완전 차폐!)
let lastTranslatedText = '';
let lastTranslatedLang = 'ja';
let lastOriginalText = '';
let lastPronunciationText = '';

function toggleVoiceSpeaker(speakerLang) {
  // 🛡️ 이미 번역 처리 또는 낭독 중이면 버튼 연타 무시
  if (isSessionProcessing) return;

  if (activeVoiceSpeaker) {
    if (activeVoiceSpeaker === speakerLang) {
      // 🗣️ 같은 버튼 다시 터치: 즉시 말끝 인식 & 단 1회만 정확히 확정 번역!
      commitVoiceTurn();
    } else {
      // 다른 언어로 전환: 이전 발화 무효화하고 새 언어 시작
      cancelVoiceTurn();
      startVoiceTurn(speakerLang);
    }
  } else {
    startVoiceTurn(speakerLang);
  }
}

// 🛡️ 연속/중복 인식된 단어 및 어구 자동 압축 필터 (5번 반복되는 현상 원천 박멸)
function cleanRepeatedPhrases(text) {
  if (!text) return '';
  let str = text.trim();

  // 1) 연속으로 똑같이 반복된 단어 압축 ("얼마예요 얼마예요 얼마예요" -> "얼마예요")
  const tokens = str.split(/\s+/);
  const dedupTokens = [];
  for (let i = 0; i < tokens.length; i++) {
    if (i === 0 || tokens[i] !== tokens[i - 1]) {
      dedupTokens.push(tokens[i]);
    }
  }
  str = dedupTokens.join(' ');

  // 2) 2개 이상의 단어로 이루어진 반복 구절 압축 (예: "화장실 어디예요 화장실 어디예요")
  for (let phraseLen = 10; phraseLen >= 2; phraseLen--) {
    const pTokens = str.split(/\s+/);
    if (pTokens.length >= phraseLen * 2) {
      for (let i = 0; i <= pTokens.length - phraseLen * 2; i++) {
        const chunk1 = pTokens.slice(i, i + phraseLen).join(' ');
        const chunk2 = pTokens.slice(i + phraseLen, i + phraseLen * 2).join(' ');
        if (chunk1 === chunk2) {
          pTokens.splice(i + phraseLen, phraseLen);
          str = pTokens.join(' ');
          break;
        }
      }
    }
  }

  return str.trim();
}

function startVoiceTurn(speakerLang) {
  if (isSessionProcessing) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    const micModal = document.getElementById('mic-guide-modal');
    if (micModal) {
      micModal.classList.add('active');
    } else {
      showToast('⚠️ 카카오톡/네이버 앱에서는 마이크가 차단됩니다. Chrome 앱으로 열어주세요.');
    }
    return;
  }

  // 모바일 오디오 재생 락 사전 해제
  unlockAudio();

  // 🛡️ 이전 오디오 낭독 강제 중단 (스피커 소리가 마이크로 들어가지 않도록 차단)
  if (currentTtsAudio) {
    try { currentTtsAudio.pause(); } catch(e) {}
    currentTtsAudio = null;
  }
  if ('speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch(e) {}
  }
  state.isSpeakingNow = false;

  // 기존 세션 완전히 정리
  cancelVoiceTurn();

  activeVoiceSpeaker = speakerLang;
  voiceTurnBuffer = '';
  isSessionProcessing = false;

  const koBtn = document.getElementById('voice-speak-ko-btn');
  const jaBtn = document.getElementById('voice-listen-ja-btn');
  const koIcon = document.getElementById('voice-ko-mic-icon');
  const jaIcon = document.getElementById('voice-ja-mic-icon');
  const koStatus = document.getElementById('voice-ko-status');
  const jaStatus = document.getElementById('voice-ja-status');
  const streamBox = document.getElementById('voice-stream-box');
  const streamText = document.getElementById('voice-stream-text');

  if (streamBox) streamBox.style.display = 'block';

  if (speakerLang === 'ko') {
    if (koBtn) koBtn.classList.add('active');
    if (jaBtn) jaBtn.classList.remove('active');
    if (koIcon) koIcon.innerText = '⏹️';
    if (jaIcon) jaIcon.innerText = '🇯🇵';
    if (koStatus) koStatus.innerText = '듣고 있습니다... 말씀하세요! (터치 시 즉시 번역)';
    if (jaStatus) jaStatus.innerText = '대기 중';
    if (streamText) streamText.innerText = '🎙️ [한국어로 말씀하세요] 듣고 있습니다...';
    showToast('🎙️ [한국어로 말씀하세요] 듣고 있습니다...');
  } else {
    if (jaBtn) jaBtn.classList.add('active');
    if (koBtn) koBtn.classList.remove('active');
    if (jaIcon) jaIcon.innerText = '⏹️';
    if (koIcon) koIcon.innerText = '🇰🇷';
    if (jaStatus) jaStatus.innerText = '日本語を聞いています... (터치 시 즉시 번역)';
    if (koStatus) koStatus.innerText = '대기 중';
    if (streamText) streamText.innerText = '👂 [일본인 상대방 답변] 듣고 있습니다...';
    showToast('👂 [일본어 듣는 중] 일본인 상대방에게 폰을 대주세요...');
  }

  try {
    const rec = new SpeechRecognition();
    voiceTurnRec = rec;
    rec.lang = speakerLang === 'ko' ? 'ko-KR' : 'ja-JP';
    rec.continuous = false; // 🛡️ 단일 발화 모드: 여러 문장이 무한 누적되어 5번 반복되는 현상 원천 차단!
    rec.interimResults = true;

    rec.onstart = () => {};

    rec.onresult = (event) => {
      // 🛡️ 세션이 이미 커밋되었거나 닫혔으면 잔여 패킷 즉시 폐기
      if (isSessionProcessing || !activeVoiceSpeaker) return;

      let transcript = '';
      let isFinalResult = false;
      for (let i = 0; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          isFinalResult = true;
        }
      }

      // 🛡️ 중복 단어/어구 자동 압축 필터 통과
      const cleanSpoken = cleanRepeatedPhrases(transcript);
      if (cleanSpoken) {
        voiceTurnBuffer = cleanSpoken;
        if (streamText) streamText.innerText = `🗣️ "${cleanSpoken}"`;

        if (voiceSilenceTimer) clearTimeout(voiceSilenceTimer);

        if (isFinalResult) {
          // 브라우저가 발화 종료를 확정함 -> 300ms 후 단 1회만 확정 번역 커밋!
          voiceSilenceTimer = setTimeout(() => {
            commitVoiceTurn();
          }, 300);
        } else {
          // 말하는 중간 잠깐 쉬는 구간 -> 1000ms 묵음 감지 시 커밋
          voiceSilenceTimer = setTimeout(() => {
            commitVoiceTurn();
          }, 1000);
        }
      }
    };

    rec.onerror = (err) => {
      console.warn('Voice STT Error:', err);
      if (err.error === 'not-allowed' || err.error === 'service-not-allowed') {
        const micModal = document.getElementById('mic-guide-modal');
        if (micModal) micModal.classList.add('active');
        else showToast('⚠️ 마이크 권한이 차단되었습니다. 브라우저 설정에서 마이크를 허용해 주세요.');
        cancelVoiceTurn();
      } else if (err.error === 'no-speech') {
        // 무시
      } else {
        cancelVoiceTurn();
      }
    };

    rec.onend = () => {
      // 🛡️ 자연 종료 시: 아직 커밋 안 되었고 말이 있으면 커밋, 아니면 정리
      if (!isSessionProcessing && activeVoiceSpeaker && voiceTurnBuffer.trim()) {
        commitVoiceTurn();
      } else if (!isSessionProcessing) {
        cancelVoiceTurn();
      }
    };

    rec.start();
  } catch (err) {
    console.error('STT Start Error:', err);
    cancelVoiceTurn();
    showToast('마이크를 시작할 수 없습니다.');
  }
}

// 🛡️ [핵심] 단방향 세션 커밋: 타이머/버튼/onend 중 가장 먼저 도달한 단 1회만 실행 보장!
function commitVoiceTurn() {
  if (isSessionProcessing) return; // 🔒 2차, 3차 호출 100% 원천 차단!
  isSessionProcessing = true;

  if (voiceSilenceTimer) {
    clearTimeout(voiceSilenceTimer);
    voiceSilenceTimer = null;
  }

  const textToTranslate = (voiceTurnBuffer || '').trim();
  const currentSpeaker = activeVoiceSpeaker;

  // 🛡️ 마이크 하드웨어 및 모든 이벤트 리스너 즉시 완전 소멸 (연쇄 이벤트 완전 차단)
  if (voiceTurnRec) {
    try {
      voiceTurnRec.onresult = null;
      voiceTurnRec.onerror = null;
      voiceTurnRec.onend = null;
      voiceTurnRec.abort();
    } catch(e) {}
    voiceTurnRec = null;
  }

  voiceTurnBuffer = '';
  activeVoiceSpeaker = null;
  resetVoiceTurnUI();

  if (textToTranslate && currentSpeaker) {
    triggerVoiceTranslate(textToTranslate, currentSpeaker);
  } else {
    isSessionProcessing = false;
  }
}

// 🛡️ 음성 세션 취소 및 청소
function cancelVoiceTurn() {
  if (voiceSilenceTimer) {
    clearTimeout(voiceSilenceTimer);
    voiceSilenceTimer = null;
  }
  if (voiceTurnRec) {
    try {
      voiceTurnRec.onresult = null;
      voiceTurnRec.onerror = null;
      voiceTurnRec.onend = null;
      voiceTurnRec.abort();
    } catch(e) {}
    voiceTurnRec = null;
  }
  voiceTurnBuffer = '';
  activeVoiceSpeaker = null;
  isSessionProcessing = false;
  resetVoiceTurnUI();
}

function resetVoiceTurnUI() {
  const koBtn = document.getElementById('voice-speak-ko-btn');
  const jaBtn = document.getElementById('voice-listen-ja-btn');
  const koIcon = document.getElementById('voice-ko-mic-icon');
  const jaIcon = document.getElementById('voice-ja-mic-icon');
  const koStatus = document.getElementById('voice-ko-status');
  const jaStatus = document.getElementById('voice-ja-status');

  if (koBtn) koBtn.classList.remove('active');
  if (jaBtn) jaBtn.classList.remove('active');
  if (koIcon) koIcon.innerText = '🇰🇷';
  if (jaIcon) jaIcon.innerText = '🇯🇵';
  if (koStatus) koStatus.innerText = '터치 후 말하기 ➔ 일본어로 소리 재생 🇯🇵';
  if (jaStatus) jaStatus.innerText = '터치 후 일본인 말소리 ➔ 한국어로 소리 재생 🇰🇷';
}

async function triggerVoiceTranslate(text, fromLang) {
  const cleanText = (text || '').trim();
  if (!cleanText) {
    isSessionProcessing = false;
    return;
  }

  // 🛡️ 동일 문장 1.5초 내 중복 번역 방지 (두 번 나오는 현상 원천 차단)
  const now = Date.now();
  if (cleanText === lastRequestedText && (now - lastRequestedTimestamp) < 1500) {
    isSessionProcessing = false;
    return;
  }
  lastRequestedText = cleanText;
  lastRequestedTimestamp = now;

  const toLang = fromLang === 'ko' ? 'ja' : 'ko';
  const streamBox = document.getElementById('voice-stream-box');
  const streamText = document.getElementById('voice-stream-text');
  const resultBox = document.getElementById('voice-result-box');
  const resultBadge = document.getElementById('voice-result-badge');
  const resOriginal = document.getElementById('voice-res-original');
  const resJapanese = document.getElementById('voice-res-japanese');
  const resReading = document.getElementById('voice-res-reading');

  const destLangName = toLang === 'ja' ? '일본어' : '한국어';
  if (streamBox) streamBox.style.display = 'block';
  if (streamText) streamText.innerText = `⏳ ${destLangName}로 번역 중입니다: "${text}"`;

  showToast(`⏳ ${destLangName}로 번역 중입니다...`);

  let translated = '';
  let rawRomaji = '';

  try {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // 1순위: 로컬호스트 전용 프록시 (CORS 및 구글 봇 차단 100% 우회)
    if (isLocalhost) {
      try {
        const localUrl = `/api/translate?q=${encodeURIComponent(text)}&sl=${fromLang}&tl=${toLang}`;
        const lResp = await fetch(localUrl);
        if (lResp.ok) {
          const lData = await lResp.json();
          if (lData && lData.translated && lData.translated.trim() && lData.translated !== '?????') {
            translated = lData.translated.trim();
            if (lData.pron) rawRomaji = lData.pron;
          }
        }
      } catch (localErr) {
        console.warn('Local proxy error, falling back:', localErr);
      }
    }

    // 2순위: Google Chrome 공식 확장 API (clients5 - 브라우저 차단 없음, 초고속)
    if (!translated) {
      try {
        const cUrl = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${fromLang}&tl=${toLang}&q=${encodeURIComponent(text)}`;
        const cResp = await fetch(cUrl);
        if (cResp.ok) {
          const cData = await cResp.json();
          if (Array.isArray(cData) && cData.length > 0 && typeof cData[0] === 'string') {
            translated = cData[0].trim();
          } else if (typeof cData === 'string') {
            translated = cData.trim();
          }
        }
      } catch (cErr) {
        console.warn('Clients5 API error, trying backup:', cErr);
      }
    }

    // 3순위: MyMemory 번역 (브라우저 CORS 100% 지원)
    if (!translated) {
      try {
        const mUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`;
        const mResp = await fetch(mUrl);
        if (mResp.ok) {
          const mData = await mResp.json();
          if (mData && mData.responseData && mData.responseData.translatedText) {
            const mText = mData.responseData.translatedText.trim();
            // 할당량 경고문 제외
            if (!mText.startsWith('MYMEMORY WARNING') && !mText.includes('FREE TRANSLATIONS')) {
              translated = mText;
            }
          }
        }
      } catch (mErr) {
        console.warn('MyMemory API error:', mErr);
      }
    }

    // 4순위: Google gtx (로마자 발음 및 비상 번역)
    if (!translated || (toLang === 'ja' && !rawRomaji)) {
      try {
        const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&dt=rm&q=${encodeURIComponent(text)}`;
        const gResp = await fetch(gUrl);
        if (gResp.ok) {
          const gData = await gResp.json();
          if (gData && gData[0]) {
            if (!translated) {
              translated = gData[0].filter(it => it[0]).map(it => it[0]).join('').trim();
            }
            for (let k = 0; k < gData[0].length; k++) {
              const seg = gData[0][k];
              if (seg && seg.length > 2 && typeof seg[2] === 'string' && seg[2].trim()) {
                rawRomaji = seg[2];
              } else if (seg && seg.length > 3 && typeof seg[3] === 'string' && seg[3].trim()) {
                rawRomaji = seg[3];
              }
            }
          }
        }
      } catch (gErr) {
        console.warn('Google single gtx error:', gErr);
      }
    }

    if (!translated) {
      showToast('⚠️ 번역 서버 연결 지연. 다시 말씀해 주세요.');
      return;
    }

    // 한국어 ➔ 일본어인 경우 한글 발음 표기 생성
    let pron = '';
    if (toLang === 'ja') {
      pron = convertToKoreanPronunciation(translated, rawRomaji);
    }

    lastOriginalText = text;
    lastTranslatedText = translated;
    lastTranslatedLang = toLang;
    lastPronunciationText = pron;

    // 화면 표시 업데이트
    if (resultBadge) {
      resultBadge.innerText = toLang === 'ja' ? '🇯🇵 일본어 번역 & 낭독' : '🇰🇷 한국어 번역 & 낭독';
      resultBadge.style.color = toLang === 'ja' ? '#E11D48' : '#2563EB';
    }

    if (resOriginal) {
      const speakerPrefix = fromLang === 'ko' ? '🇰🇷 나 (한국어)' : '🇯🇵 일본인 상대방';
      resOriginal.innerText = `${speakerPrefix}: "${text}"`;
    }

    if (resJapanese) {
      resJapanese.innerText = translated;
    }

    if (resReading) {
      if (pron && toLang === 'ja') {
        resReading.innerText = `🗣️ [발음] ${pron}`;
        resReading.style.display = 'inline-block';
      } else {
        resReading.style.display = 'none';
      }
    }

    if (resultBox) {
      resultBox.style.display = 'block';
      resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // 즉시 해당 언어(일본어 or 한국어) 원어민 음성으로 읽어주기!
    speakText(translated, toLang);

    // 기록 저장
    addHistoryItem(text, translated, fromLang, toLang);

  } catch (outerErr) {
    console.error('triggerVoiceTranslate error:', outerErr);
    showToast('⚠️ 번역 중 오류가 발생했습니다. 다시 시도해 주세요.');
  } finally {
    // 🛡️ 어떤 에러가 발생해도 락을 100% 해제하여 다음 발화 대기
    isSessionProcessing = false;
    if (streamBox) streamBox.style.display = 'none';
  }
}

function handlePapagoAppLaunch(e) {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  if (isAndroid) {
    // 안드로이드는 <a> 태그의 표준 런처 인텐트가 처리하여 설치된 진짜 파파고 앱 실행
    return;
  }

  if (isIOS) {
    e.preventDefault();
    const appStoreUrl = 'https://apps.apple.com/kr/app/id1147874819';
    const now = Date.now();
    window.location.href = 'papago://';
    setTimeout(() => {
      if (Date.now() - now < 2200) {
        window.location.href = appStoreUrl;
      }
    }, 1500);
    return;
  }
}

// ==========================================
// 5. 사진 촬영 글자 해석(OCR) & 여행자 상세 설명 엔진
// ==========================================
let lastPhotoOriginalJa = '';
let lastPhotoTranslatedKo = '';

const japaneseKnowledgeBase = [
  // 라멘 & 면 요리
  { keywords: ['替玉', 'かえだま', '替え玉'], title: '替玉 (카에다마 - 면 추가)', desc: '면을 다 드신 후 남은 국물에 면만 추가하는 주문입니다. 면을 추가하려면 국물을 다 마시지 말고 반드시 남겨두셔야 합니다!' },
  { keywords: ['豚骨', 'とんこつ', 'トンコツ'], title: '豚骨 (돈코츠 - 돼지뼈 육수)', desc: '돼지 뼈를 센 불에서 장시간 푹 고아내어 뽀얗고 깊은 감칠맛을 내는 일본의 대표적인 라멘 국물입니다.' },
  { keywords: ['醤油', 'しょうゆ', 'ショウユ'], title: '醤油 (쇼유 - 간장 베이스)', desc: '맑고 깔끔한 일본 전통 간장으로 간을 맞춘 담백하고 개운한 국물입니다.' },
  { keywords: ['味噌', 'みそ', 'ミソ'], title: '味噌 (미소 - 된장 베이스)', desc: '일본 전통 된장으로 구수하고 진한 풍미를 낸 국물입니다.' },
  { keywords: ['つけ麺', 'つけめん', 'つけメン'], title: 'つけ麺 (츠케멘 - 찍어먹는 면)', desc: '삶은 면을 진하고 따뜻한 농축 육수에 한 입씩 푹 적셔 찍어 먹는 면 요리입니다.' },
  { keywords: ['味玉', '半熟卵', 'あじたま'], title: '味玉 (아지타마 - 반숙 양념 달걀)', desc: '노른자가 부드럽게 흐르는 반숙란을 간장 양념에 재워 라멘에 올리는 인기 토핑입니다.' },
  { keywords: ['チャーシュー', '叉焼'], title: 'チャーシュー (차슈 - 돼지고기 편육)', desc: '돼지고기 덩어리를 특제 간장 양념에 부드럽게 삶거나 구운 대표적인 라멘 고기 토핑입니다.' },
  { keywords: ['メンマ', '麺麻'], title: 'メンマ (멘마 - 죽순 절임)', desc: '죽순을 발효시켜 짭조름하게 조린 라멘의 아삭한 고명입니다.' },
  { keywords: ['かたさ', '硬さ', 'かため', 'ばりかた'], title: '麺の硬さ (면 익힘 정도)', desc: '카타메(단단하게), 후츠우(보통), 야와라카메(부드럽게) 중 면 익힘 정도를 고를 수 있습니다.' },

  // 이자카야 & 식당 문화
  { keywords: ['お通し', '席料', 'テーブルチャージ'], title: 'お通し / 席料 (오토시 / 자릿세)', desc: '일본 술집(이자카야)에 앉으면 주문하지 않아도 나오는 기본 안주 및 자릿세입니다. 1인당 보통 300~500엔이 영수증에 합산 청구되는 정상적인 일본 식문화입니다.' },
  { keywords: ['税込', '税込み'], title: '税込 (제이코미 - 세금 포함)', desc: '일본 소비세 10%가 이미 포함된 최종 결제 금액입니다. 적힌 금액 그대로 지불하시면 됩니다.' },
  { keywords: ['税抜', '税別', '本体価格'], title: '税抜 (제이누키 - 세금 별도)', desc: '소비세 10%가 제외된 금액입니다. 계산서에는 적힌 가격에 10% 세금이 추가 청구됩니다.' },
  { keywords: ['おすすめ', 'オススメ', 'お勧め'], title: 'おすすめ (오스스메 - 추천 메뉴)', desc: '이 식당에서 가장 자신 있게 추천하는 인기 간판 메뉴입니다.' },
  { keywords: ['限定', '数量限定', '期間限定'], title: '限定 (겐테이 - 한정 판매)', desc: '하루 정해진 수량만 팔거나 특정 계절에만 맛볼 수 있는 특별 한정 메뉴입니다.' },
  { keywords: ['食べ放題', 'バイキング'], title: '食べ放題 (타베호다이 - 무제한 식사)', desc: '정해진 시간(보통 90분~120분) 동안 메뉴판의 음식을 무제한으로 주문해 먹을 수 있는 뷔페 시스템입니다.' },
  { keywords: ['飲み放題'], title: '飲み放題 (노미호다이 - 무제한 주류/음료)', desc: '정해진 시간 동안 맥주, 사와, 사케, 하이볼, 소프트드링크를 무제한으로 주문할 수 있는 시스템입니다.' },
  { keywords: ['大盛り', '大盛'], title: '大盛り (오오모리 - 곱빼기)', desc: '밥이나 면의 양을 기본보다 넉넉하게 많이 주는 옵션입니다.' },
  { keywords: ['特盛'], title: '特盛 (토쿠모리 - 특대 사이즈)', desc: '오오모리보다 더 많은 특대 곱빼기 사이즈입니다.' },
  { keywords: ['並盛', '普通'], title: '並盛 (나미모리 - 기본 보통 사이즈)', desc: '일반적인 표준 1인분 양입니다.' },
  { keywords: ['小盛り', '少なめ'], title: '小盛り (코모리 - 작은 양)', desc: '밥이나 면의 양을 보통보다 적게 주는 옵션입니다.' },
  { keywords: ['定食', 'セット'], title: '定食 (테이쇼쿠 - 정식 세트)', desc: '메인 요리와 함께 밥, 미소된장국, 츠케모노(절임반찬)가 한 상으로 나오는 세트 식사입니다.' },
  { keywords: ['丼', 'どんぶり'], title: '丼 (돈부리 - 덮밥 요리)', desc: '큰 그릇에 밥을 담고 위에 고기, 해산물, 튀김 등의 재료를 얹어낸 일본식 덮밥입니다.' },

  // 오사카 대표 명물 요리
  { keywords: ['串カツ', '串かつ'], title: '串カツ (쿠시카츠 - 오사카 꼬치튀김)', desc: '고기, 해산물, 야채를 꼬치에 꿰어 바삭하게 튀긴 오사카 신세카이 명물입니다. ※ 테이블의 공용 소스는 위생상 [한 번만 찍기(두 번 찍기 절대 금지)] 룰이 있습니다.' },
  { keywords: ['たこ焼き', 'たこやき'], title: 'たこ焼き (타코야키 - 문어 풀빵)', desc: '오사카의 소울푸드로 큼직한 문어가 들어간 둥근 구이입니다. 겉은 바삭하고 속은 매우 뜨거운 크림 상태이니 입천장 데지 않게 조심하세요!' },
  { keywords: ['お好み焼き', 'おこのみやき'], title: 'お好み焼き (오코노미야키 - 철판 빈대떡)', desc: '양배추 반죽에 돼지고기, 오징어 등을 넣어 철판에 노릇하게 구운 뒤 데리야키 소스, 마요네즈, 가쓰오부시를 얹어 먹는 오사카 대표 철판 요리입니다.' },
  { keywords: ['牛カツ', '牛かつ'], title: '牛カツ (규카츠 - 소고기 튀김)', desc: '신선한 소고기에 얇은 튀김옷을 입혀 미디엄 레어로 살짝 튀겨낸 요리입니다. 테이블 위 미니 개인 화로에 원하는 굽기로 살짝 구워 와사비, 소금과 곁들여 드세요.' },
  { keywords: ['すき焼き'], title: 'すき焼き (스키야키 - 소고기 전골)', desc: '얇게 썬 고급 소고기와 야채를 달콤짭조름한 간장 베이스 육수에 자작하게 조린 후 날달걀을 풀어 찍어 먹는 일본 전통 요리입니다.' },
  { keywords: ['しゃぶしゃぶ'], title: 'しゃぶしゃぶ (샤브샤브)', desc: '끓는 육수에 얇은 고기와 채소를 살짝 흔들어 익힌 뒤 상큼한 폰즈 소스나 고소한 참깨 소스에 찍어 먹는 요리입니다.' },
  { keywords: ['うどん'], title: 'うどん (우동 - 일본식 가락국수)', desc: '쫄깃한 면발과 깔끔한 다시마/가쓰오부시 육수가 일품인 오사카 명물 면 요리입니다.' },
  { keywords: ['そば', '蕎麦'], title: 'そば (소바 - 메밀국수)', desc: '메밀가루로 만든 면 요리로, 시원한 쯔유에 적셔 먹는 자루소바 또는 따뜻한 온소바로 즐깁니다.' },
  { keywords: ['天ぷら', '天婦羅'], title: '天ぷら (덴푸라 - 일본식 튀김)', desc: '신선한 새우, 생선, 야채에 얇고 바삭한 튀김옷을 입혀 깨끗한 기름에 튀겨낸 요리입니다.' },
  { keywords: ['刺身', 'お造り'], title: '刺身 / お造り (사시미 - 생선회)', desc: '신선한 제철 생선을 얇게 썰어 간장과 와사비에 찍어 먹는 전통 요리입니다.' },
  { keywords: ['生ビール', '生中'], title: '生ビール (나마비루 - 생맥주)', desc: '식당이나 이자카야에서 주문하는 시원한 갓 따른 생맥주입니다. 보통 중간 크기 잔은 [나마츄]라고 부릅니다.' },
  { keywords: ['ハイボール'], title: 'ハイボール (하이볼 - 위스키 탄산수)', desc: '위스키에 탄산수와 레몬을 섞은 상쾌하고 시원한 일본 대표 대중 주류입니다.' },
  { keywords: ['サワー'], title: 'サワー (사와 - 과즙 탄산주)', desc: '일본 소주나 보드카에 레몬, 자몽 등의 과즙과 탄산수를 섞어 달콤하게 마시는 과일주입니다.' },

  // 주문 옵션 & 팁
  { keywords: ['ネギ抜き', 'ねぎ抜き'], title: 'ネギ抜き (네기누키 - 파 빼기)', desc: '요리에서 파(대파/실파)를 빼달라는 요청입니다.' },
  { keywords: ['わさ비抜き', 'ワサビ抜き', 'わさび抜き'], title: 'わさび抜き (와사비누키 - 와사비 빼기)', desc: '스시나 음식에서 와사비(고추냉이)를 빼달라는 요청입니다.' },
  { keywords: ['氷なし'], title: '氷なし (코오리나시 - 얼음 빼기)', desc: '음료나 물에서 얼음을 빼달라는 요청입니다.' },

  // 계산 & 결제 & 안내
  { keywords: ['現金のみ', '現金払い'], title: '現金のみ (겐킨노미 - 현금만 가능 ⚠️)', desc: '신용카드나 모바일 페이가 불가능하고 오직 엔화 현금으로만 결제할 수 있는 매장입니다. 현금을 준비하세요!' },
  { keywords: ['クレジットカード', 'カード可'], title: 'クレジットカード (신용카드 결제 가능)', desc: 'VISA, MASTER 등 해외 신용카드로 결제가 가능한 매장입니다.' },
  { keywords: ['別々', '個別会計'], title: '別々 (베츠베츠 - 각자 계산)', desc: '일행과 계산서를 나누어 각자 먹은 것을 따로따로 계산하는 방식입니다.' },
  { keywords: ['免税', 'TAX FREE', 'TaxFree'], title: '免税 (면세 - TAX FREE)', desc: '외국인 관광객 여권을 제시하면 세금(10%)을 즉시 환급받을 수 있습니다. 동일 매장 당일 5,000엔 이상(세금 제외) 구매 시 적용됩니다.' },
  { keywords: ['禁煙'], title: '禁煙 (킨엔 - 금연석 / 금연 매장)', desc: '전자담배를 포함하여 실내 흡연이 전면 금지된 구역입니다.' },
  { keywords: ['喫煙'], title: '喫煙 (키츠엔 - 흡연 가능 구역)', desc: '지정된 흡연실 또는 흡연이 허용된 좌석/매장입니다.' },
  { keywords: ['満席'], title: '満席 (만세키 - 만석)', desc: '현재 매장 좌석이 꽉 찬 상태입니다. 입구의 대기 명부(이름, 인원수)를 작성하고 대기하셔야 합니다.' },
  { keywords: ['準備中'], title: '準備中 (준비추 - 영업 준비 중 / 브레이크 타임)', desc: '현재 영업시간이 아니거나 오후 브레이크 타임 중입니다.' }
];

function generateTravelExplanation(jaText, koText) {
  const matched = [];
  const lowerJa = (jaText || '').toLowerCase();
  const lowerKo = (koText || '').toLowerCase();

  for (const item of japaneseKnowledgeBase) {
    for (const kw of item.keywords) {
      if (lowerJa.includes(kw.toLowerCase()) || lowerKo.includes(kw.toLowerCase())) {
        if (!matched.some(m => m.title === item.title)) {
          matched.push(item);
        }
        break;
      }
    }
  }

  if (matched.length > 0) {
    let html = '<ul style="margin: 4px 0 0; padding-left: 18px;">';
    matched.forEach(item => {
      html += `<li style="margin-bottom: 6px;"><strong>📌 ${escapeHtml(item.title)}</strong><br>${escapeHtml(item.desc)}</li>`;
    });
    html += '</ul>';
    return html;
  }

  return `
    <div style="font-size: 11.5px; color: #78350F; line-height: 1.5;">
      💡 <strong>여행자 안내</strong>: 위 텍스트는 사진에서 감지된 일본어 내용입니다.<br>
      • 식당 주문 시 <strong>[🔊 일본어 발음 듣기]</strong>를 눌러 점원에게 들려주거나, 화면을 직접 보여주시면 편리합니다.<br>
      • 더 궁금한 특정 단어(예: 替玉, お通し, 税込, 豚骨)는 아래 직접 입력창에 넣어보세요!
    </div>
  `;
}

async function processPhotoFile(file) {
  if (!file) return;

  const previewBox = document.getElementById('photo-preview-box');
  const previewImg = document.getElementById('photo-preview-img');
  const progressBox = document.getElementById('photo-progress-box');
  const progressText = document.getElementById('photo-progress-text');
  const progressPercent = document.getElementById('photo-progress-percent');
  const progressFill = document.getElementById('photo-progress-fill');
  const resultBox = document.getElementById('photo-result-box');
  const resOriginal = document.getElementById('photo-res-original');
  const resTranslated = document.getElementById('photo-res-translated');
  const resExplanation = document.getElementById('photo-res-explanation');

  unlockAudio();

  // 1. 즉시 사진 미리보기 표시 & 분석 프로그레스 시작 (사용자 지연 체감 제로화)
  let objectUrl = null;
  try {
    objectUrl = URL.createObjectURL(file);
    if (previewImg) previewImg.src = objectUrl;
  } catch(e) {
    const reader = new FileReader();
    reader.onload = (re) => { if (previewImg) previewImg.src = re.target.result; };
    reader.readAsDataURL(file);
  }

  if (previewBox) previewBox.style.display = 'flex';
  if (progressBox) progressBox.style.display = 'block';
  if (resultBox) resultBox.style.display = 'none';

  // 사용자가 분석 중임을 바로 볼 수 있게 프로그레스 영역으로 부드럽게 스크롤
  progressBox.scrollIntoView({ behavior: 'smooth', block: 'center' });

  function updateProgress(msg, pct) {
    if (progressText) progressText.innerText = msg;
    if (progressPercent) progressPercent.innerText = `${pct}%`;
    if (progressFill) progressFill.style.width = `${pct}%`;
  }

  updateProgress('📸 사진을 불러왔습니다! 글자 분석 준비 중... ⏳', 15);

  try {
    // 2. 이미지 로드 및 모바일 최적화 다운스케일링 (최대 800px로 가볍고 빠르게)
    const img = new Image();
    const loadPromise = new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('이미지 로딩 실패'));
    });
    img.src = objectUrl || previewImg.src;

    // 이미지 로딩 4초 타임아웃
    await Promise.race([
      loadPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('이미지 디코딩 시간 초과')), 4000))
    ]);

    const maxDim = 800;
    let w = img.width || 800;
    let h = img.height || 600;
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    // 흑백 및 대비 보정 (메뉴판 글자 인식률 대폭 향상)
    try {
      const imgData = ctx.getImageData(0, 0, w, h);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const enhanced = Math.min(255, Math.max(0, (gray - 128) * 1.25 + 128));
        d[i] = enhanced;
        d[i + 1] = enhanced;
        d[i + 2] = enhanced;
      }
      ctx.putImageData(imgData, 0, 0);
    } catch(e) {
      console.warn('Canvas filter pass');
    }

    updateProgress('일본어 고속 엔진 가동 중... 🤖', 35);

    // 3. Tesseract 고속 OCR 엔진 실행 (1.5MB 초경량 fast 모델 & 12초 타임아웃)
    if (typeof Tesseract === 'undefined') {
      throw new Error('TESSERACT_NOT_LOADED');
    }

    const ocrPromise = (async () => {
      const worker = await Tesseract.createWorker('jpn', 1, {
        langPath: 'https://cdn.jsdelivr.net/gh/naptha/tessdata@gh-pages/4.0.0_fast',
        logger: m => {
          if (m.status === 'recognizing text') {
            const p = Math.min(92, Math.round(40 + (m.progress || 0) * 52));
            updateProgress(`글자 판독 및 추출 중... (${p}%)`, p);
          }
        }
      });
      const ret = await worker.recognize(canvas);
      await worker.terminate();
      return ret.data && ret.data.text ? ret.data.text.trim() : '';
    })();

    const recognizedText = await Promise.race([
      ocrPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('OCR_TIMEOUT')), 12000))
    ]);

    if (!recognizedText || recognizedText.length < 2) {
      if (progressBox) progressBox.style.display = 'none';
      if (resultBox) {
        resultBox.style.display = 'block';
        if (resOriginal) resOriginal.innerText = '(글자가 또렷하지 않거나 감지되지 않았습니다)';
        if (resTranslated) {
          resTranslated.innerHTML = `
            <div style="line-height: 1.6;">
              💡 <strong>사진을 더 가깝고 밝게 다시 찍어보세요!</strong><br>
              • 실시간으로 메뉴판을 번역하고 싶다면 상단의 <strong>[🔍 구글 렌즈 실시간 번역]</strong>을 누르시면 카메라 화면 전체가 즉시 한국어로 바뀝니다.<br>
              • 아래의 <strong>[메뉴판 핵심 단어 칩]</strong>을 터치하시면 주요 일본어 표현을 즉시 확인하실 수 있습니다.
            </div>
          `;
        }
        if (resExplanation) resExplanation.innerHTML = generateTravelExplanation('', '');
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }

    updateProgress('한국어로 번역 및 꿀팁 분석 중... ✨', 95);

    // 4. 추출된 일본어 ➔ 한국어 번역
    let translatedText = '';
    try {
      const mUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(recognizedText)}&langpair=ja|ko`;
      const mResp = await fetch(mUrl);
      if (mResp.ok) {
        const mData = await mResp.json();
        if (mData && mData.responseData && mData.responseData.translatedText) {
          translatedText = mData.responseData.translatedText;
        }
      }
    } catch(e) {}

    if (!translatedText) {
      try {
        const cUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=ko&dt=t&q=${encodeURIComponent(recognizedText)}`;
        const cResp = await fetch(cUrl);
        if (cResp.ok) {
          const cData = await cResp.json();
          if (cData && cData[0]) {
            translatedText = cData[0].map(it => it[0]).join('');
          }
        }
      } catch (err) {
        console.warn('Translate error:', err);
      }
    }

    if (!translatedText) {
      translatedText = '번역 서버 연결 지연 (위 일본어 원문을 확인해 주세요)';
    }

    const explanationHtml = generateTravelExplanation(recognizedText, translatedText);

    lastPhotoOriginalJa = recognizedText;
    lastPhotoTranslatedKo = translatedText;

    if (progressBox) progressBox.style.display = 'none';
    if (resultBox) {
      resultBox.style.display = 'block';
      if (resOriginal) resOriginal.innerText = recognizedText;
      if (resTranslated) resTranslated.innerText = translatedText;
      if (resExplanation) resExplanation.innerHTML = explanationHtml;
      resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    showToast('🎉 사진 글자 해석 및 설명이 완료되었습니다!');

  } catch (err) {
    console.error('Photo OCR error:', err);
    if (progressBox) progressBox.style.display = 'none';

    // 오류 발생 시에도 화면이 텅 비지 않고 사용자에게 즉각 대안 솔루션 표시!
    if (resultBox) {
      resultBox.style.display = 'block';
      if (resOriginal) resOriginal.innerText = '(모바일 네트워크 지연으로 자동 분석 실패)';
      if (resTranslated) {
        resTranslated.innerHTML = `
          <div style="line-height: 1.6; color: #1E3A8A;">
            ⚡ <strong>가장 확실하고 빠른 실시간 번역 방법:</strong><br>
            상단의 <strong>[🔍 구글 렌즈 실시간 번역]</strong>을 누르시면 카메라를 비추는 순간 메뉴판 전체가 실시간 한국어로 증강현실 번역됩니다!<br>
            또는 아래의 <strong>[메뉴판 핵심 단어]</strong>를 터치하시면 0.1초 만에 상세 설명이 나옵니다.
          </div>
        `;
      }
      if (resExplanation) resExplanation.innerHTML = generateTravelExplanation('', '');
      resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    showToast('⚠️ 실시간 렌즈 번역 또는 단어 검색을 이용해 보세요.');
  }
}

async function executePhotoTextLookup(query) {
  if (!query || !query.trim()) return;
  const clean = query.trim();

  const resultBox = document.getElementById('photo-result-box');
  const resOriginal = document.getElementById('photo-res-original');
  const resTranslated = document.getElementById('photo-res-translated');
  const resExplanation = document.getElementById('photo-res-explanation');

  showToast('⏳ 단어 해석 및 설명 조회 중...');

  let translated = '';
  try {
    const mUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=ja|ko`;
    const mResp = await fetch(mUrl);
    if (mResp.ok) {
      const mData = await mResp.json();
      if (mData && mData.responseData && mData.responseData.translatedText) {
        translated = mData.responseData.translatedText;
      }
    }
  } catch(e) {}

  if (!translated) {
    try {
      const cUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ko&dt=t&q=${encodeURIComponent(clean)}`;
      const cResp = await fetch(cUrl);
      if (cResp.ok) {
        const cData = await cResp.json();
        if (cData && cData[0]) {
          translated = cData[0].map(it => it[0]).join('');
        }
      }
    } catch (e) {}
  }

  if (!translated) translated = clean;

  const explHtml = generateTravelExplanation(clean, translated);

  lastPhotoOriginalJa = clean;
  lastPhotoTranslatedKo = translated;

  if (resultBox) {
    resultBox.style.display = 'block';
    if (resOriginal) resOriginal.innerText = clean;
    if (resTranslated) resTranslated.innerText = translated;
    if (resExplanation) resExplanation.innerHTML = explHtml;
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function setupEventListeners() {
  // 5개 탭 전환
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // 🎙️ 양방향 음성 통역 버튼 이벤트 리스너 바인딩
  const voiceSpeakKoBtn = document.getElementById('voice-speak-ko-btn');
  if (voiceSpeakKoBtn) {
    voiceSpeakKoBtn.addEventListener('click', () => toggleVoiceSpeaker('ko'));
  }

  const voiceListenJaBtn = document.getElementById('voice-listen-ja-btn');
  if (voiceListenJaBtn) {
    voiceListenJaBtn.addEventListener('click', () => toggleVoiceSpeaker('ja'));
  }

  const voiceNowBtn = document.getElementById('voice-now-action-btn');
  if (voiceNowBtn) voiceNowBtn.addEventListener('click', () => commitVoiceTurn());

  const voiceRespeakBtn = document.getElementById('voice-respeak-btn');
  if (voiceRespeakBtn) {
    voiceRespeakBtn.addEventListener('click', () => {
      if (lastTranslatedText) {
        unlockAudio();
        state.isSpeakingNow = false;
        lastSpokenText = ''; // 🛡️ 누를 때마다 즉시 100% 강제 재생
        speakText(lastTranslatedText, lastTranslatedLang);
      } else {
        showToast('먼저 말씀해주세요.');
      }
    });
  }

  const voiceBigshowBtn = document.getElementById('voice-bigshow-btn');
  if (voiceBigshowBtn) {
    voiceBigshowBtn.addEventListener('click', () => {
      if (lastTranslatedText) {
        openShowingModal(lastTranslatedText, lastPronunciationText, lastOriginalText);
      } else {
        showToast('먼저 말씀해주세요.');
      }
    });
  }

  // 직접 글자 입력 번역
  const voiceManualInput = document.getElementById('voice-manual-input');
  const voiceManualBtn = document.getElementById('voice-manual-btn');
  function executeManualTranslate() {
    const val = voiceManualInput ? voiceManualInput.value.trim() : '';
    if (val) {
      unlockAudio();
      // 글자 입력은 기본 한국어 ➔ 일본어로 번역
      triggerVoiceTranslate(val, 'ko');
      if (voiceManualInput) voiceManualInput.value = '';
    }
  }
  if (voiceManualBtn) voiceManualBtn.addEventListener('click', executeManualTranslate);
  if (voiceManualInput) {
    voiceManualInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeManualTranslate();
      }
    });
  }

  // ⚡ 터치 즉시 일본어로 말해주는 1초 여행 표현 칩 이벤트 리스너
  document.querySelectorAll('.quick-speak-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const speakTextStr = btn.dataset.speak;
      const pronStr = btn.dataset.pron;
      const koStr = btn.dataset.ko;
      if (speakTextStr) {
        unlockAudio();
        const resultBox = document.getElementById('voice-result-box');
        const resultBadge = document.getElementById('voice-result-badge');
        const resOriginal = document.getElementById('voice-res-original');
        const resJapanese = document.getElementById('voice-res-japanese');
        const resReading = document.getElementById('voice-res-reading');

        if (resultBadge) resultBadge.innerText = '🇯🇵 일본어 낭독';
        if (resOriginal) resOriginal.innerText = `🇰🇷 나: "${koStr}"`;
        if (resJapanese) resJapanese.innerText = speakTextStr;
        if (resReading) {
          resReading.innerText = `🗣️ [발음] ${pronStr}`;
          resReading.style.display = 'inline-block';
        }
        if (resultBox) {
          resultBox.style.display = 'block';
          resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        lastOriginalText = koStr;
        lastTranslatedText = speakTextStr;
        lastTranslatedLang = 'ja';
        lastPronunciationText = pronStr;

        speakText(speakTextStr, 'ja');
      }
    });
  });

  // 📸 사진 촬영 & 갤러리 글자 해석(OCR) 및 여행 설명 이벤트 리스너 바인딩
  const photoFileInput = document.getElementById('photo-file-input');
  const photoCameraBtn = document.getElementById('photo-camera-btn');
  if (photoCameraBtn && photoFileInput) {
    photoCameraBtn.addEventListener('click', () => {
      unlockAudio();
      photoFileInput.click();
    });
  }
  if (photoFileInput) {
    photoFileInput.addEventListener('change', function(e) {
      if (e.target.files && e.target.files[0]) {
        processPhotoFile(e.target.files[0]);
      }
      this.value = '';
    });
  }

  const galleryFileInput = document.getElementById('gallery-file-input');
  const galleryFileBtn = document.getElementById('gallery-file-btn');
  if (galleryFileBtn && galleryFileInput) {
    galleryFileBtn.addEventListener('click', () => {
      unlockAudio();
      galleryFileInput.click();
    });
  }
  if (galleryFileInput) {
    galleryFileInput.addEventListener('change', function(e) {
      if (e.target.files && e.target.files[0]) {
        processPhotoFile(e.target.files[0]);
      }
      this.value = '';
    });
  }

  // 마이크 가이드 모달 닫기
  const micGuideModal = document.getElementById('mic-guide-modal');
  const micGuideCloseBtn = document.getElementById('mic-guide-close-btn');
  const micGuideConfirmBtn = document.getElementById('mic-guide-confirm-btn');
  function closeMicGuide() {
    if (micGuideModal) micGuideModal.classList.remove('active');
  }
  if (micGuideCloseBtn) micGuideCloseBtn.addEventListener('click', closeMicGuide);
  if (micGuideConfirmBtn) micGuideConfirmBtn.addEventListener('click', closeMicGuide);
  if (micGuideModal) {
    micGuideModal.addEventListener('click', (e) => {
      if (e.target === micGuideModal) closeMicGuide();
    });
  }

  // 메뉴판 핵심 단어 퀵 칩 터치 이벤트
  document.querySelectorAll('.photo-quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const word = chip.dataset.word;
      if (word) {
        unlockAudio();
        executePhotoTextLookup(word);
      }
    });
  });

  const photoRetryBtn = document.getElementById('photo-retry-btn');
  if (photoRetryBtn) {
    photoRetryBtn.addEventListener('click', () => {
      if (photoFileInput) photoFileInput.click();
    });
  }

  const photoLookupBtn = document.getElementById('photo-lookup-btn');
  const photoLookupInput = document.getElementById('photo-lookup-input');
  if (photoLookupBtn && photoLookupInput) {
    photoLookupBtn.addEventListener('click', () => {
      executePhotoTextLookup(photoLookupInput.value);
    });
    photoLookupInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executePhotoTextLookup(photoLookupInput.value);
      }
    });
  }

  const photoSpeakBtn = document.getElementById('photo-speak-btn');
  if (photoSpeakBtn) {
    photoSpeakBtn.addEventListener('click', () => {
      if (lastPhotoOriginalJa) {
        unlockAudio();
        speakText(lastPhotoOriginalJa, 'ja');
      } else {
        showToast('일본어 텍스트가 없습니다.');
      }
    });
  }

  const photoCopyBtn = document.getElementById('photo-copy-btn');
  if (photoCopyBtn) {
    photoCopyBtn.addEventListener('click', () => {
      if (lastPhotoTranslatedKo) {
        const textToCopy = `${lastPhotoOriginalJa}\n\n[한국어 번역]\n${lastPhotoTranslatedKo}`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(textToCopy).then(() => {
            showToast('📋 번역 내용이 복사되었습니다!');
          }).catch(() => {
            try {
              const ta = document.createElement('textarea');
              ta.value = textToCopy;
              document.body.appendChild(ta);
              ta.select();
              document.execCommand('copy');
              document.body.removeChild(ta);
              showToast('📋 번역 내용이 복사되었습니다!');
            } catch(e) {
              prompt('번역 내용을 복사하세요:', textToCopy);
            }
          });
        } else {
          try {
            const ta = document.createElement('textarea');
            ta.value = textToCopy;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showToast('📋 번역 내용이 복사되었습니다!');
          } catch(e) {
            prompt('번역 내용을 복사하세요:', textToCopy);
          }
        }
      } else {
        showToast('복사할 번역 내용이 없습니다.');
      }
    });
  }

  // 🦜 파파고 공식 앱 열기 버튼 이벤트 리스너
  const papagoDirectBtn = document.getElementById('papago-direct-app-btn');
  if (papagoDirectBtn) {
    papagoDirectBtn.addEventListener('click', handlePapagoAppLaunch);
  }

  // 파파고 마켓(스토어) 버튼 iOS 자동 분기
  const papagoMarketBtn = document.getElementById('papago-market-btn');
  if (papagoMarketBtn) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      papagoMarketBtn.href = 'https://apps.apple.com/kr/app/id1147874819';
      papagoMarketBtn.innerHTML = '<span>📲</span><span>2. [파파고 앱 설치하기] (App Store 이동)</span>';
    }
  }

  // 지도 & 길찾기 관련
  const mapMicBtn = document.getElementById('map-mic-btn');
  if (mapMicBtn) mapMicBtn.addEventListener('click', toggleMapSpeechRecognition);

  const mapSearchBtn = document.getElementById('map-search-btn');
  const mapSearchInput = document.getElementById('map-search-input');
  if (mapSearchBtn && mapSearchInput) {
    mapSearchBtn.addEventListener('click', () => searchPlace(mapSearchInput.value));
    mapSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') searchPlace(mapSearchInput.value);
    });
  }

  // 퀵 명소 칩
  document.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const name = chip.dataset.name;
      if (mapSearchInput) mapSearchInput.value = name;
      searchPlace(name);
    });
  });

  // 내 위치 버튼
  const myLocBtn = document.getElementById('my-location-btn');
  if (myLocBtn) myLocBtn.addEventListener('click', findMyLocation);

  // 목적지 발음 듣기
  const destSpeakBtn = document.getElementById('dest-speak-btn');
  if (destSpeakBtn) {
    destSpeakBtn.addEventListener('click', () => {
      if (state.selectedPlace) {
        speakText(state.selectedPlace.nameJa, 'ja');
      }
    });
  }

  // 목적지 기사님께 보여주기
  const destShowBtn = document.getElementById('dest-show-modal-btn');
  if (destShowBtn) destShowBtn.addEventListener('click', openShowingModalFromPlace);

  // 맛집 카테고리 필터
  document.querySelectorAll('.food-cat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.food-cat-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.currentFoodCategory = chip.dataset.cat;
      renderFoodList();
    });
  });

  // 회화 카테고리 필터
  document.querySelectorAll('.cat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.currentPhraseCategory = chip.dataset.cat;
      renderPhrases();
    });
  });

  // 일정 일차 선택
  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedDay = parseInt(btn.dataset.day, 10);
      renderPlans();
    });
  });

  const addPlanBtn = document.getElementById('add-plan-btn');
  const newPlanInput = document.getElementById('new-plan-input');
  if (addPlanBtn && newPlanInput) {
    addPlanBtn.addEventListener('click', () => addNewPlan());
    newPlanInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addNewPlan();
    });
  }

  // 쇼잉 모달 닫기
  const modalOverlay = document.getElementById('showing-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', () => closeModal());
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  const modalSpeakBtn = document.getElementById('modal-speak-btn');
  if (modalSpeakBtn) {
    modalSpeakBtn.addEventListener('click', () => {
      const jaText = document.getElementById('modal-ja-text').innerText;
      speakText(jaText, 'ja');
    });
  }
}

// 토스트 메시지
let toastTimeout = null;
function showToast(msg) {
  const toast = document.getElementById('toast-msg');
  if (!toast) return;

  toast.innerText = msg;
  toast.classList.add('show');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================
// 11. 실시간 동시 대화 통역 모달 로직
// ==========================================
function initLiveDialog() {
  const openBtn = document.getElementById('open-live-dialog-btn');
  const closeBtn = document.getElementById('live-dialog-close-btn');
  const modal = document.getElementById('live-dialog-modal');
  const micKoBtn = document.getElementById('dialog-mic-ko-btn');
  const micJaBtn = document.getElementById('dialog-mic-ja-btn');

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      modal.classList.add('active');
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
      if (state.dialogRecognition) {
        try { state.dialogRecognition.stop(); } catch(e){}
      }
      resetDialogButtons();
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        if (state.dialogRecognition) {
          try { state.dialogRecognition.stop(); } catch(e){}
        }
        resetDialogButtons();
      }
    });
  }

  if (micKoBtn) {
    micKoBtn.addEventListener('click', () => {
      startDialogSpeech('ko');
    });
  }

  if (micJaBtn) {
    micJaBtn.addEventListener('click', () => {
      startDialogSpeech('ja');
    });
  }
}

function startDialogSpeech(lang) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('이 기기는 음성 인식을 지원하지 않습니다.');
    return;
  }

  if (state.dialogRecognition) {
    try { state.dialogRecognition.stop(); } catch(e) {}
  }

  const micKoBtn = document.getElementById('dialog-mic-ko-btn');
  const micJaBtn = document.getElementById('dialog-mic-ja-btn');

  state.activeDialogSpeaker = lang;
  state.dialogRecognition = new SpeechRecognition();
  state.dialogRecognition.continuous = false;
  state.dialogRecognition.interimResults = false;
  state.dialogRecognition.lang = lang === 'ko' ? 'ko-KR' : 'ja-JP';

  state.dialogRecognition.onstart = () => {
    if (lang === 'ko' && micKoBtn) micKoBtn.classList.add('recording');
    if (lang === 'ja' && micJaBtn) micJaBtn.classList.add('recording');
    showToast(lang === 'ko' ? '한국어로 말씀해주세요...' : '日本語でお話しください...');
  };

  state.dialogRecognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    if (transcript) {
      await handleDialogUtterance(transcript, lang);
    }
  };

  state.dialogRecognition.onerror = (err) => {
    console.warn('Dialog STT Error:', err);
    showToast('음성을 인식하지 못했습니다.');
    resetDialogButtons();
  };

  state.dialogRecognition.onend = () => {
    resetDialogButtons();
  };

  try {
    state.dialogRecognition.start();
  } catch (e) {
    console.warn(e);
  }
}

function resetDialogButtons() {
  const micKoBtn = document.getElementById('dialog-mic-ko-btn');
  const micJaBtn = document.getElementById('dialog-mic-ja-btn');
  if (micKoBtn) micKoBtn.classList.remove('recording');
  if (micJaBtn) micJaBtn.classList.remove('recording');
}

async function handleDialogUtterance(text, fromLang) {
  const toLang = fromLang === 'ko' ? 'ja' : 'ko';
  const stream = document.getElementById('dialog-stream');
  if (!stream) return;

  let translated = '';
  let rawRomaji = '';

  try {
    const cUrl = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${fromLang}&tl=${toLang}&q=${encodeURIComponent(text)}`;
    const cResp = await fetch(cUrl);
    if (cResp.ok) {
      const cData = await cResp.json();
      if (Array.isArray(cData) && cData.length > 0 && typeof cData[0] === 'string') {
        translated = cData[0];
      }
    }
  } catch(e) {}

  if (!translated) {
    try {
      const mUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}&de=osakatrip2026@gmail.com`;
      const mResp = await fetch(mUrl);
      if (mResp.ok) {
        const mData = await mResp.json();
        translated = mData.responseData?.translatedText || '';
      }
    } catch(e) {}
  }

  if (!translated) {
    showToast('통역에 실패했습니다. 다시 말씀해주세요.');
    return;
  }

  let readingHtml = '';
  if (toLang === 'ja') {
    const pron = convertToKoreanPronunciation(translated, rawRomaji);
    if (pron) {
      readingHtml = `<div class="bubble-reading">🗣️ [발음] ${escapeHtml(pron)}</div>`;
    }
  }

  const bubble = document.createElement('div');
  bubble.className = `dialog-bubble ${fromLang}`;
  const senderName = fromLang === 'ko' ? '🇰🇷 나 (한국어)' : '🇯🇵 상대방 (日本語)';

  bubble.innerHTML = `
    <div class="bubble-sender">${senderName}</div>
    <div class="bubble-original">${escapeHtml(text)}</div>
    <div class="bubble-translated">${escapeHtml(translated)}</div>
    ${readingHtml}
  `;

  stream.appendChild(bubble);
  stream.scrollTop = stream.scrollHeight;

  // 상대방 언어로 즉시 음성 재생
  speakText(translated, toLang);
}
