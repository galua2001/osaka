/* ==========================================================================
   OsakaGo - 오사카 여행 번역기 & 음성 길찾기 & 맛집 가이드 메인 스크립트
   ========================================================================== */

const CURRENT_VERSION = '10.0';

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
  try { renderAlbumFeed(); } catch(e) { console.warn('renderAlbumFeed error:', e); }
  try { initCultureGuide(); } catch(e) { console.warn('initCultureGuide error:', e); }
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
let audioUnlocker = null;
function unlockAudio() {
  if ('speechSynthesis' in window) {
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0.01;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  try {
    if (!audioUnlocker) {
      audioUnlocker = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
    }
    audioUnlocker.play().then(() => { audioUnlocker.pause(); }).catch(() => {});
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
  let dualFinalTranscript = '';

  // 번역 실행 헬퍼 (중복 실행 방지)
  async function triggerTranslation(text) {
    const cleanText = (text || '').trim();

    if (hasExecutedTranslation || !cleanText) return;
    hasExecutedTranslation = true;

    if (speechSilenceTimer) {
      clearTimeout(speechSilenceTimer);
      speechSilenceTimer = null;
    }

    try { rec.stop(); } catch (e) {}

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
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const result = event.results[i];
      const transcript = result[0] ? result[0].transcript : '';
      if (result.isFinal) {
        dualFinalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    const currentText = (dualFinalTranscript + interimTranscript).trim();
    if (currentText) {
      recognizedTextBuffer = currentText;
      const inputEl = document.getElementById('source-text');
      if (inputEl) inputEl.value = currentText;
      updateMonitorUI('listening', '말씀 감지됨! 👂', `인식 중: "${currentText}"`);

      // ⏱️ 묵음 자동 감지 타이머 (0.8초간 말이 멈추면 100% 즉시 번역 트리거)
      if (speechSilenceTimer) clearTimeout(speechSilenceTimer);
      speechSilenceTimer = setTimeout(() => {
        if (!hasExecutedTranslation && recognizedTextBuffer.trim()) {
          triggerTranslation(recognizedTextBuffer);
        }
      }, 800);
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

  // 🛡️ 발화 중복 원천 차단 (현재 말하고 있거나 2.5초 이내 동일 문장이면 발화 무시)
  const now = Date.now();
  if (state.isSpeakingNow || (text === lastSpokenText && (now - lastSpokenTime) < 2500)) {
    if (onEndCallback) onEndCallback();
    return;
  }
  lastSpokenText = text;
  lastSpokenTime = now;

  // 이전 오디오 및 발화 즉시 정지
  if (currentTtsAudio) {
    try {
      currentTtsAudio.pause();
      currentTtsAudio.currentTime = 0;
    } catch (e) {}
    currentTtsAudio = null;
  }
  if ('speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }

  let callbackFired = false;
  const finishSpeech = () => {
    if (!callbackFired) {
      callbackFired = true;
      state.isSpeakingNow = false;
      if (currentTtsAudio) {
        try { currentTtsAudio.pause(); } catch(e) {}
        currentTtsAudio = null;
      }
      if (onEndCallback) onEndCallback();
    }
  };

  const safetyTimeout = setTimeout(finishSpeech, Math.max(2500, text.length * 300));
  state.isSpeakingNow = true;
  showToast(lang === 'ja' ? '🔊 [일본어] 음성 안내 중...' : '🔊 [한국어] 음성 안내 중...');

  // 1차 우선: 기기 내장 네이티브 음성 합성 (Chrome 이중 발화 버그 방지 규격)
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel(); // 큐 초기화

      if (!state.voices || state.voices.length === 0) {
        state.voices = window.speechSynthesis.getVoices() || [];
      }

      const utterance = new SpeechSynthesisUtterance(text);
      const langCode = lang === 'ko' ? 'ko-KR' : 'ja-JP';
      utterance.lang = langCode;
      utterance.rate = 0.95;
      utterance.volume = 1.0;

      const voice = (state.voices || []).find(v => v.lang === langCode || (v.lang && v.lang.replace('_', '-').startsWith(lang)));
      if (voice) utterance.voice = voice;

      utterance.onend = () => {
        clearTimeout(safetyTimeout);
        finishSpeech();
      };

      utterance.onerror = () => {
        clearTimeout(safetyTimeout);
        finishSpeech();
      };

      // 🛡️ Chrome Web Speech API 알려진 이중 발화 큐 버그 패치:
      // cancel() 후 60ms 딜레이를 주어 브라우저 큐가 비워진 후 단 1회만 깨끗하게 speak 실행!
      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);
        } catch (spkErr) {
          console.warn('speak error, trying fallback:', spkErr);
          fallbackAudioStream();
        }
      }, 60);
      return;
    } catch (e) {
      console.warn('SpeechSynthesis exception:', e);
    }
  }

  // 2차 백업 (speechSynthesis가 아예 지원되지 않는 환경에서만 오디오 스트림 시도)
  fallbackAudioStream();

  function fallbackAudioStream() {
    try {
      const gTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(text)}`;
      const audio = new Audio(gTtsUrl);
      currentTtsAudio = audio;

      audio.onended = () => {
        clearTimeout(safetyTimeout);
        finishSpeech();
      };

      audio.onerror = () => {
        clearTimeout(safetyTimeout);
        finishSpeech();
      };

      const p = audio.play();
      if (p !== undefined) {
        p.catch(() => {
          clearTimeout(safetyTimeout);
          finishSpeech();
        });
      }
    } catch (err) {
      clearTimeout(safetyTimeout);
      finishSpeech();
    }
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
let voiceTurnFinalBuffer = ''; // isFinal로 확정된 음성 텍스트 누적 버퍼
let voiceSilenceTimer = null;
let isTranslatingVoiceTurn = false; // 번역 진행 중 중복 호출 방지 락
let isVoiceTurnDispatched = false; // 세션당 1회 번역 트리거 보장 플래그
let lastRequestedText = '';
let lastRequestedTimestamp = 0;
let lastTranslatedText = '';
let lastTranslatedLang = 'ja';
let lastOriginalText = '';
let lastPronunciationText = '';

function toggleVoiceSpeaker(speakerLang) {
  if (activeVoiceSpeaker) {
    if (activeVoiceSpeaker === speakerLang) {
      // 🗣️ 말하던 중 같은 버튼을 다시 누름: 즉시 말끝 인식 & 1회만 정확히 번역!
      stopVoiceTurn(true);
    } else {
      // 다른 언어 버튼을 누름: 이전 인식 취소하고 새 언어로 전환
      stopVoiceTurn(false);
      startVoiceTurn(speakerLang);
    }
  } else {
    startVoiceTurn(speakerLang);
  }
}

function startVoiceTurn(speakerLang) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    const micModal = document.getElementById('mic-guide-modal');
    if (micModal) {
      micModal.classList.add('active');
    } else {
      showToast('⚠️ 음성 인식을 지원하지 않는 브라우저입니다. Chrome 앱으로 열어주세요.');
    }
    return;
  }

  // 모바일 오디오 재생 락 즉시 사전 해제 (Autoplay Policy 필수 하네스)
  unlockAudio();

  // 🛡️ 마이크를 켤 때 이전 낭독 중이던 오디오 즉시 정지 (스피커 소리가 마이크로 재유입되는 현상 차단)
  if (state.isSpeakingNow) {
    if (currentTtsAudio) {
      try { currentTtsAudio.pause(); } catch(e) {}
      currentTtsAudio = null;
    }
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch(e) {}
    }
    state.isSpeakingNow = false;
  }

  // 1. 이전 세션 타이머, 버퍼, 인스턴스 완전 초기화 (Clean Reset)
  if (voiceSilenceTimer) {
    clearTimeout(voiceSilenceTimer);
    voiceSilenceTimer = null;
  }

  if (voiceTurnRec) {
    try {
      voiceTurnRec.onresult = null;
      voiceTurnRec.onerror = null;
      voiceTurnRec.onend = null;
      voiceTurnRec.onstart = null;
      voiceTurnRec.abort();
    } catch(e) {}
    voiceTurnRec = null;
  }

  voiceTurnBuffer = '';
  voiceTurnFinalBuffer = '';
  isVoiceTurnDispatched = false;
  activeVoiceSpeaker = speakerLang;

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

  // 🗣️ 음성 인식 시작 시 실시간 자막 박스(#voice-res-original) 즉시 안내 반영
  const resOriginalInit = document.getElementById('voice-res-original');
  if (resOriginalInit) {
    resOriginalInit.innerText = speakerLang === 'ko' 
      ? '🎙️ 말씀하시는 내용을 듣고 있습니다...' 
      : '👂 일본인 상대방의 말씀을 듣고 있습니다...';
  }

  try {
    const rec = new SpeechRecognition();
    voiceTurnRec = rec;
    rec.lang = speakerLang === 'ko' ? 'ko-KR' : 'ja-JP';
    rec.continuous = false; // 🛡️ 단일 턴 통역의 핵심: continuous=false로 설정하여 브라우저의 중복 누적 버그를 원천 차단!
    rec.interimResults = true; // 말하는 동안 실시간 자막 피드백

    rec.onresult = (event) => {
      // 이미 번역이 실행되었거나 세션이 종료되었으면 무시
      if (isVoiceTurnDispatched || isTranslatingVoiceTurn || !activeVoiceSpeaker) return;

      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = 0; i < event.results.length; ++i) {
        const result = event.results[i];
        const text = result[0] ? result[0].transcript : '';
        if (result.isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }

      // 외부 변수에 누적(+=)하지 않고 이벤트마다 깨끗한 단일 문장 추출
      let currentSpoken = (finalTranscript || interimTranscript || '').trim();
      currentSpoken = deduplicateSpeechText(currentSpoken);

      if (currentSpoken) {
        voiceTurnBuffer = currentSpoken;
        if (streamText) streamText.innerText = `🗣️ "${currentSpoken}"`;

        // 🗣️ 음성 인식 중간(onresult) 시 실시간 자막 출력
        const resOriginal = document.getElementById('voice-res-original');
        if (resOriginal) {
          resOriginal.innerText = '🗣️ ' + currentSpoken;
        }

        // ⏱️ 사용자가 말을 멈추었을 때 0.8초 후 자동 번역 트리거
        if (voiceSilenceTimer) clearTimeout(voiceSilenceTimer);
        voiceSilenceTimer = setTimeout(() => {
          stopVoiceTurn(true);
        }, 800);
      }
    };

    rec.onerror = (err) => {
      if (voiceSilenceTimer) {
        clearTimeout(voiceSilenceTimer);
        voiceSilenceTimer = null;
      }
      if (err.error === 'not-allowed' || err.error === 'service-not-allowed') {
        alert('🎙️ 마이크 권한이 차단되었거나 지원하지 않는 브라우저입니다!\n\n💡 카카오톡/네이버 앱 내부 창이라면 우측 상단 메뉴를 눌러\n👉 [다른 브라우저로 열기] (Chrome 앱 등)를 선택해주세요.');
        resetVoiceTurnUI();
      } else if (err.error !== 'no-speech' && err.error !== 'aborted') {
        if (streamText) streamText.innerText = `[오류 발생] ${err.error}`;
        resetVoiceTurnUI();
      }
    };

    rec.onend = () => {
      if (voiceSilenceTimer) {
        clearTimeout(voiceSilenceTimer);
        voiceSilenceTimer = null;
      }
      // 음성 인식이 끝났을 때: 아직 번역되지 않은 발화가 있으면 1회만 실행
      if (!isVoiceTurnDispatched && activeVoiceSpeaker && voiceTurnBuffer.trim()) {
        stopVoiceTurn(true);
      } else if (!isVoiceTurnDispatched) {
        resetVoiceTurnUI();
      }
    };

    rec.start();
  } catch (err) {
    console.error('STT Start Error:', err);
    resetVoiceTurnUI();
    showToast('마이크를 시작할 수 없습니다. Chrome 브라우저를 확인해 주세요.');
  }
}

// 🛡️ 문장/단어 2번 반복 완벽 정제 엔진 (어미를 파괴하지 않고 순수 중복만 1개로 합침)
function deduplicateSpeechText(str) {
  if (!str) return '';
  let s = str.trim();

  // 1. 동일 문장이 앞뒤로 통째로 2번 반복된 경우 ("도톤보리 어디예요 도톤보리 어디예요" -> "도톤보리 어디예요")
  const halfLen = Math.floor(s.length / 2);
  for (let len = halfLen; len >= 2; len--) {
    const part1 = s.substring(0, len).trim();
    const part2 = s.substring(len).trim();
    if (part1 && part1 === part2) {
      return part1;
    }
  }

  // 2. 단어/구절 단위로 연달아 2번 중복된 경우 ("안녕하세요 안녕하세요 화장실" -> "안녕하세요 화장실")
  const words = s.split(/\s+/);
  if (words.length >= 2) {
    const dedup = [];
    for (let i = 0; i < words.length; i++) {
      if (i > 0 && words[i] === words[i - 1]) {
        continue;
      }
      dedup.push(words[i]);
    }
    s = dedup.join(' ');
  }

  return s;
}

function stopVoiceTurn(doTranslate = false) {
  if (voiceSilenceTimer) {
    clearTimeout(voiceSilenceTimer);
    voiceSilenceTimer = null;
  }

  const rawText = (voiceTurnBuffer || '').trim();
  const textToTranslate = deduplicateSpeechText(rawText);
  const currentSpeaker = activeVoiceSpeaker;

  voiceTurnBuffer = '';
  voiceTurnFinalBuffer = '';
  activeVoiceSpeaker = null;

  if (voiceTurnRec) {
    try {
      voiceTurnRec.onresult = null;
      voiceTurnRec.onerror = null;
      voiceTurnRec.onend = null;
      voiceTurnRec.abort();
    } catch(e) {}
    voiceTurnRec = null;
  }

  resetVoiceTurnUI();

  // 이번 턴에서 딱 1회만 깨끗하게 triggerVoiceTranslate 호출
  if (doTranslate && !isVoiceTurnDispatched && textToTranslate && currentSpeaker) {
    isVoiceTurnDispatched = true;
    triggerVoiceTranslate(textToTranslate, currentSpeaker);
  }
}

function resetVoiceTurnUI() {
  activeVoiceSpeaker = null;
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
  if (koStatus) koStatus.innerText = '내가 말하기 ➔ 일본어로 번역 및 낭독';
  if (jaStatus) jaStatus.innerText = '상대방 듣기 ➔ 한국어로 번역 및 낭독';
}

async function triggerVoiceTranslate(text, fromLang) {
  let cleanText = deduplicateSpeechText(text || '');

  // 빈 텍스트이거나 이미 번역 중이면 중복 실행 차단
  if (!cleanText || isTranslatingVoiceTurn) return;

  // 🛡️ 동일 문장 1.5초 내 중복 번역 방지 (두 번 번역되는 현상 원천 차단)
  const now = Date.now();
  if (cleanText === lastRequestedText && (now - lastRequestedTimestamp) < 1500) {
    return;
  }
  lastRequestedText = cleanText;
  lastRequestedTimestamp = now;

  isTranslatingVoiceTurn = true;

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
  if (streamText) streamText.innerText = `⏳ ${destLangName}로 번역 중입니다: "${cleanText}"`;

  showToast(`⏳ ${destLangName}로 번역 중입니다...`);

  let translated = '';
  let rawRomaji = '';

  try {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // 1순위: 로컬호스트 전용 프록시 (CORS 및 구글 봇 차단 100% 우회)
    if (isLocalhost) {
      try {
        const localUrl = `/api/translate?q=${encodeURIComponent(cleanText)}&sl=${fromLang}&tl=${toLang}`;
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
        const cUrl = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${fromLang}&tl=${toLang}&q=${encodeURIComponent(cleanText)}`;
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
        const mUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${fromLang}|${toLang}`;
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
        const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&dt=rm&q=${encodeURIComponent(cleanText)}`;
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

    lastOriginalText = cleanText;
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
      resOriginal.innerText = `${speakerPrefix}: "${cleanText}"`;
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
    addHistoryItem(cleanText, translated, fromLang, toLang);

  } catch (outerErr) {
    console.error('triggerVoiceTranslate error:', outerErr);
    showToast('⚠️ 번역 중 오류가 발생했습니다. 다시 시도해 주세요.');
  } finally {
    // 🛡️ 어떤 에러가 발생해도 락을 100% 해제하여 영구 먹통 방지
    isTranslatingVoiceTurn = false;
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
// 5. 사진 촬영 글자 해석(OCR) & 여행자 상세 설명 엔진 (파파고급 고도화)
// ==========================================
let lastPhotoOriginalJa = '';
let lastPhotoTranslatedKo = '';

// 전역 오디오 낭독 헬퍼 (모바일 오디오 언락 보장 & 즉각 재생)
window.speakPhotoItem = function(text) {
  if (!text) return;
  unlockAudio();
  speakText(text, 'ja');
};

window.speakPhotoOrder = function(text) {
  if (!text) return;
  unlockAudio();
  const orderText = `${text}、これください`;
  speakText(orderText, 'ja');
  showToast('🗣️ "これください (이거 주세요)" 낭독 중!');
};

window.copyPhotoText = function(text) {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('📋 복사되었습니다!');
    }).catch(() => {
      copyFallback(text);
    });
  } else {
    copyFallback(text);
  }
};

function copyFallback(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('📋 복사되었습니다!');
  } catch(e) {
    prompt('내용을 복사하세요:', text);
  }
}

// 📚 일본 음식 & 여행 지식베이스 (150+개 대폭 확충 백과사전)
const japaneseKnowledgeBase = [
  // ----------------------------------------------------
  // 1. 라멘 & 면류 (26개)
  // ----------------------------------------------------
  {
    keywords: ['豚骨', 'とんこつ', 'トンコツ'],
    title: '豚骨 (돈코츠 라멘)',
    pron: '돈코츠',
    desc: '돼지 뼈를 센 불에서 장시간 푹 고아내어 뽀얗고 진한 감칠맛과 고소한 육수가 일품인 일본 대표 라멘입니다.',
    tip: '국물이 진하므로 생강 절임(베니쇼가)이나 마늘을 넣어 느끼함을 잡으면 훨씬 맛있습니다.',
    order: '豚骨ラーメンを一つください'
  },
  {
    keywords: ['醤油', 'しょうゆ', 'ショウユ'],
    title: '醤油 (쇼유 라멘 - 간장 베이스)',
    pron: '쇼유',
    desc: '맑은 닭이나 멸치 육수에 전통 양조간장으로 간을 맞춘 개운하고 깔끔한 맛의 정통 도쿄풍 라멘입니다.',
    tip: '기름진 음식이 부담스러울 때 추천하며, 시치미(고춧가루)를 살짝 곁들이면 칼칼합니다.',
    order: '醤油ラーメンをお願いします'
  },
  {
    keywords: ['味噌', 'みそ', 'ミソ'],
    title: '味噌 (미소 라멘 - 된장 베이스)',
    pron: '미소',
    desc: '일본 전통 된장을 볶아 육수와 섞은 구수하고 묵직한 풍미의 홋카이도 삿포로 발상 라멘입니다.',
    tip: '버터나 옥수수 토핑(콘버터)을 추가하면 고소함이 배가됩니다.',
    order: '味噌ラーメンをください'
  },
  {
    keywords: ['塩', 'しお', 'シオ'],
    title: '塩 (시오 라멘 - 소금 베이스)',
    pron: '시오',
    desc: '천연 소금으로 간을 하여 해산물과 닭 육수 본연의 맑고 담백한 맛을 극대화한 라멘입니다.',
    tip: '자극적이지 않아 해장용이나 늦은 밤 야식으로 가장 인기 있습니다.',
    order: '塩ラーメンを一つお願いします'
  },
  {
    keywords: ['つけ麺', 'つけめん', 'つけメン'],
    title: 'つけ麺 (츠케멘 - 찍어먹는 농축 면)',
    pron: '츠케멘',
    desc: '차갑게 헹군 탄력 있는 굵은 면을 따뜻하고 아주 진한 농축 육수(츠케지루)에 한 입씩 적셔 먹는 면 요리입니다.',
    tip: '면을 다 먹은 후 남은 소스에 따뜻한 육수를 부어 마시는 "스프와리(スープ割り)"를 꼭 요청하세요!',
    order: 'つけ麺を一つ、スープ割りもお願いします'
  },
  {
    keywords: ['替玉', 'かえだま', '替え玉'],
    title: '替玉 (카에다마 - 사리/면 추가)',
    pron: '카에다마',
    desc: '면을 다 먹은 후 남은 국물에 삶은 면만 추가하는 시스템입니다.',
    tip: '국물을 다 마시면 추가할 수 없으니 국물을 반드시 1/3 이상 남겨두고 주문하세요!',
    order: '替玉を一つお願いします (카에다마 오 히토츠 오네가이시마스)'
  },
  {
    keywords: ['味玉', 'あじたま', '半熟卵', '味付け玉子'],
    title: '味玉 (아지타마 - 반숙 양념 달걀)',
    pron: '아지타마',
    desc: '노른자가 부드럽게 흐르는 반숙 달걀을 특제 가쓰오 간장에 재워 감칠맛이 밴 필수 라멘 토핑입니다.',
    tip: '반으로 갈라 노른자에 진한 라멘 국물을 살짝 적셔 드세요.',
    order: '味玉をトッピングでお願いします'
  },
  {
    keywords: ['チャーシュー', '叉焼'],
    title: 'チャーシュー (차슈 - 돼지고기 편육)',
    pron: '차-슈-',
    desc: '돼지고기 삼겹살이나 목살을 묶어 달콤짭조름한 간장에 푹 삶거나 불에 구운 부드러운 고기 고명입니다.',
    tip: '고기를 듬뿍 즐기고 싶을 때는 차슈멘(チャーシューメン)을 주문하세요.',
    order: 'チャーシューメンをください'
  },
  {
    keywords: ['メンマ', '麺麻'],
    title: 'メンマ (멘마 - 발효 죽순 절임)',
    pron: '멘마',
    desc: '죽순을 유산 발효시켜 참기름과 간장에 조려낸 꼬들꼬들 아삭한 라멘 대표 고명입니다.',
    tip: '느끼한 국물 사이에서 입안을 상쾌하게 정돈해 주는 식감 요정입니다.',
    order: 'メンマ多めでお願いします'
  },
  {
    keywords: ['バリカタ', 'ばりかた'],
    title: 'バリカタ (바리카타 - 아주 단단한 면)',
    pron: '바리카타',
    desc: '하카타 돈코츠 라멘에서 면을 끓는 물에 5~10초만 살짝 데쳐 면 심지가 살아있게 먹는 꼬들한 익힘 정도입니다.',
    tip: '현지인들이 가장 선호하는 탄력 있는 식감입니다.',
    order: '麺はバリカタでお願いします'
  },
  {
    keywords: ['かため', '硬め', '固め'],
    title: '固め (카타메 - 단단하고 꼬들한 면)',
    pron: '카타메',
    desc: '면을 보통보다 살짝 덜 익혀 쫄깃하고 씹는 맛을 살린 옵션입니다.',
    tip: '한국인 입맛에 가장 잘 맞는 대중적인 라멘 익힘 정도입니다.',
    order: '麺固めでお願いします'
  },
  {
    keywords: ['ふつう', '普通'],
    title: '普通 (후츠우 - 보통)',
    pron: '후츠우',
    desc: '면 익힘, 국물 진함, 기름기 등을 주방장의 표준 정량 레시피로 조리하는 옵션입니다.',
    tip: '가게 고유의 본래 맛을 보고 싶을 때 기본으로 선택하세요.',
    order: '普通でお願いします'
  },
  {
    keywords: ['やわらかめ', '柔らかめ'],
    title: '柔らかめ (야와라카메 - 부드러운 면)',
    pron: '야와라카메',
    desc: '면을 푹 삶아 부드럽고 소화가 잘 되도록 익힌 옵션입니다.',
    tip: '어린이나 어르신, 부드러운 식감을 선호하는 분께 좋습니다.',
    order: '麺は柔らかめでお願いします'
  },
  {
    keywords: ['背脂', 'せあぶら'],
    title: '背脂 (세아부라 - 돼지 등지방 토핑)',
    pron: '세아부라',
    desc: '돼지 등지방을 체에 걸러 눈꽃처럼 국물 위에 흩뿌려 진한 고소함과 바디감을 살린 토핑입니다.',
    tip: '담백한 것을 좋아하시면 "세아부라 스쿠나메(背脂少なめ: 적게)"를 외치세요.',
    order: '背脂少なめでお願いします'
  },
  {
    keywords: ['こってり'],
    title: 'こってり (콧테리 - 진하고 걸쭉한 맛)',
    pron: '콧테리',
    desc: '육수 농도가 매우 짙고 지방과 콜라겐이 듬뿍 녹아들어 걸쭉하고 리치한 맛입니다.',
    tip: '텐카잇핀(天下一品)의 시그니처 육수로 유명합니다.',
    order: 'こってりでお願いします'
  },
  {
    keywords: ['あっさり'],
    title: 'あっさり (앗사리 - 담백하고 깔끔한 맛)',
    pron: '앗사리',
    desc: '기름기가 적고 맑고 시원하게 넘어가는 개운한 스타일의 국물입니다.',
    tip: '식후 부담 없이 깔끔하게 드시고 싶을 때 제격입니다.',
    order: 'あっさりでお願いします'
  },
  {
    keywords: ['辛味噌', 'からみそ'],
    title: '辛味噌 (카라미소 - 매콤한 된장 라멘)',
    pron: '카라미소',
    desc: '고추 양념을 된장에 섞어 한국인 입맛에 딱 맞게 칼칼하고 얼큰하게 끓여낸 라멘입니다.',
    tip: '매운맛 단계를 1辛, 2辛 등으로 고를 수 있는 매장이 많습니다.',
    order: '辛味噌ラーメンをお願いします'
  },
  {
    keywords: ['油そば', 'あぶらそば'],
    title: '油そば (아부라소바 - 비빔 라멘)',
    pron: '아부라소바',
    desc: '국물 없이 면 아래 깔린 특제 간장 기름 소스에 식초와 고추기름(라유)을 두 바퀴 두른 뒤 뜨거울 때 비벼 먹는 면입니다.',
    tip: '식초와 고추기름을 망설이지 말고 듬뿍 둘러야 제맛이 납니다!',
    order: '油そばを一つください'
  },
  {
    keywords: ['まぜそば'],
    title: 'まぜそば (마제소바 - 나고야식 비빔면)',
    pron: '마제소바',
    desc: '다진 고기 볶음, 부추, 대파, 김가루, 마늘가루와 생달걀 노른자를 면과 비벼 먹는 중독성 강한 비빔면입니다.',
    tip: '면을 다 먹고 소스가 남았을 때 "오이메시(追い飯: 밥 추가)"를 요청하면 무료로 밥을 비벼주는 곳이 많습니다.',
    order: '追い飯をお願いします (오이메시 오네가이시마스)'
  },
  {
    keywords: ['担々麺', 'たんたんめん'],
    title: '担々麺 (탄탄멘 - 참깨 매운 라멘)',
    pron: '탄탄멘',
    desc: '고소한 볶음 참깨 페이스트와 매콤한 산초, 고추기름, 다진 고기가 어우러진 칼칼한 면 요리입니다.',
    tip: '알싸한 산초(마라 향)의 얼얼함을 즐길 수 있습니다.',
    order: '担々麺をください'
  },
  {
    keywords: ['鶏白湯', 'とりぱいたん'],
    title: '鶏白湯 (토리파이탄 - 닭 백탕 라멘)',
    pron: '토리파이탄',
    desc: '신선한 닭을 장시간 고아 삼계탕처럼 크리미하고 부드러우며 잡내 없는 고급스러운 뽀얀 라멘입니다.',
    tip: '돼지 냄새에 민감하신 분들에게 가장 강력 추천하는 라멘입니다.',
    order: '鶏白湯ラーメンを一つお願いします'
  },
  {
    keywords: ['煮干し', 'にぼし'],
    title: '煮干し (니보시 - 멸치 육수 라멘)',
    pron: '니보시',
    desc: '말린 멸치와 디포리를 듬뿍 넣어 특유의 쌉싸름하고 깊은 바다 감칠맛을 우려낸 개성 넘치는 라멘입니다.',
    tip: '해산물 육수 애호가들에게 사랑받는 진한 풍미입니다.',
    order: '煮干しラーメンをください'
  },
  {
    keywords: ['魚介', 'ぎょかい'],
    title: '魚介 (교카이 - 해산물 베이스)',
    pron: '교카이',
    desc: '가쓰오부시, 고등어포, 조개 등 다양한 해산물로 육수를 내어 감칠맛이 폭발하는 라멘/츠케멘 육수입니다.',
    tip: '돈코츠와 해산물을 반반 섞은 "더블 스프(Wスープ)"가 특히 유명합니다.',
    order: '魚介豚骨ラーメンをお願いします'
  },
  {
    keywords: ['汁なし', 'しるなし'],
    title: '汁なし (시루나시 - 국물 없는 스타일)',
    pron: '시루나시',
    desc: '국물 없이 소스에 비벼 먹는 면 요리 옵션입니다.',
    tip: '여름철이나 면의 쫄깃함을 집중해서 즐기고 싶을 때 좋습니다.',
    order: '汁なしでお願いします'
  },
  {
    keywords: ['もやし'],
    title: 'もやし (모야시 - 숙주나물 토핑)',
    pron: '모야시',
    desc: '아삭한 숙주나물을 산더미처럼 올려 라멘의 느끼함을 덜어주는 인기 고명입니다.',
    tip: '지로계(二郎系) 라멘에서는 기본으로 엄청난 양이 올라옵니다.',
    order: 'もやしマシでお願いします'
  },
  {
    keywords: ['紅生姜', 'べにしょうが'],
    title: '紅生姜 (베니쇼가 - 붉은 초생강)',
    pron: '베니쇼가',
    desc: '빨갛게 절인 채 썬 생강으로, 돈코츠 라멘이나 규동의 기름진 맛을 개운하게 씻어줍니다.',
    tip: '테이블 위에 무료 통으로 놓여있는 경우가 많으니 적당량 덜어 드세요.',
    order: '紅生姜をください'
  },

  // ----------------------------------------------------
  // 2. 야키니쿠 & 고기 요리 (25개)
  // ----------------------------------------------------
  {
    keywords: ['カルビ', 'かるび'],
    title: 'カルビ (카루비 - 소갈비살)',
    pron: '카루비',
    desc: '적절한 마블링과 기름진 육즙이 풍부한 일본 야키니쿠의 부동의 인기 1위 부위입니다.',
    tip: '양념(타레)과 소금(시오) 중 고를 수 있으며, 쌀밥과 찰떡궁합입니다.',
    order: 'カルビを2인분(二人前: 니닌마에) ください'
  },
  {
    keywords: ['ロース', 'ろーす'],
    title: 'ロース (로스 - 소등심)',
    pron: '로-스',
    desc: '부드러운 살코기 위주로 기름기가 적고 담백하며 고기 본연의 씹는 맛과 풍미가 뛰어납니다.',
    tip: '너무 오래 구우면 퍽퍽해지므로 살짝 익혀 미디엄 레어로 드세요.',
    order: '上ロースを一つお願いします'
  },
  {
    keywords: ['牛タン', 'タン', 'ぎゅうたん'],
    title: '牛タン (규탄 - 소 혀/우설 구이)',
    pron: '규탄',
    desc: '쫄깃쫄깃하면서도 사각거리는 특유의 식감이 매력적인 소 혀 구이입니다. 야키니쿠 식사의 시작 메뉴로 필수입니다.',
    tip: '레몬즙을 살짝 짜서 뿌려 먹으면 기름기가 싹 잡히고 감칠맛이 극대화됩니다.',
    order: '牛タンを一つ、レモンでお願いします'
  },
  {
    keywords: ['ネギ塩', 'ねぎしお'],
    title: 'ネギ塩牛タン (네기시오 규탄 - 파소금 우설)',
    pron: '네기시오 규탄',
    desc: '다진 대파와 참기름, 소금으로 버무린 양념을 듬뿍 올린 우설 구이입니다.',
    tip: '파가 화로 아래로 떨어지지 않게 고기 한쪽 면만 굽고 반으로 접어 드세요!',
    order: 'ネギ塩タンをお願いします'
  },
  {
    keywords: ['ハラミ', 'はらみ'],
    title: 'ハラミ (하라미 - 소 안창살)',
    pron: '하라미',
    desc: '소의 횡격막 부위로, 겉보기엔 붉은 살코기 같지만 부드럽고 육즙이 매우 풍부한 최고 인기 부위입니다.',
    tip: '기름진 갈비보다 덜 물리고 부드러워 여성과 현지인에게 압도적인 지지를 받습니다.',
    order: 'ハラミを一人前お願いします'
  },
  {
    keywords: ['ホルモン', 'ほるもん'],
    title: 'ホルモン (호르몬 - 소/돼지 내장구이/대창)',
    pron: '호르몬',
    desc: '오사카 방언 "호루몬(버리는 것)"에서 유래된 대창, 곱창 등 내장 구이로, 고소한 기름과 쫄깃함이 일품입니다.',
    tip: '기름이 많아 불쇼가 일어나기 쉬우니 얼음 조각을 불판에 올려 불길을 잡으세요.',
    order: 'ホルモン盛り合わせをください'
  },
  {
    keywords: ['シマチョウ', 'しまちょう'],
    title: 'シマチョウ (시마쵸 - 소 대창)',
    pron: '시마쵸-',
    desc: '줄무늬(시마) 모양이 있는 소의 대장 부위로, 씹을수록 팡팡 터지는 고소한 지방이 최고입니다.',
    tip: '껍질 쪽을 먼저 바삭하게 굽고 지방 쪽은 살짝만 익혀 드세요.',
    order: 'シマチョウをタレでお願いします'
  },
  {
    keywords: ['マルチョウ', 'まるちょう'],
    title: 'マルチョウ (마루쵸 - 소 소창/곱창)',
    pron: '마루쵸-',
    desc: '원통형으로 뒤집어 곱과 지방을 가둔 부위로, 입안에 넣는 순간 사르르 녹아내립니다.',
    tip: '겉을 노릇노릇하게 굴려가며 구워야 겉은 바삭하고 속은 촉촉합니다.',
    order: 'マルチョウを塩でください'
  },
  {
    keywords: ['ミノ', 'みの', '上ミノ'],
    title: 'ミノ (미노 - 소 양깃머리)',
    pron: '미노',
    desc: '소의 첫 번째 위 부위로, 지방이 거의 없고 조개관자처럼 사각사각 꼬들꼬들하게 씹히는 식감이 예술입니다.',
    tip: '매콤한 미소 양념(카라미소)과 가장 잘 어울립니다.',
    order: '上ミノをタレでお願いします'
  },
  {
    keywords: ['レバー', 'ればー'],
    title: 'レバー (레바 - 간 구이)',
    pron: '레바-',
    desc: '철분과 비타민이 풍부한 소/돼지의 신선한 간으로 부드럽고 녹진한 맛입니다.',
    tip: '안전상 반드시 속까지 완전히 익혀 드셔야 합니다.',
    order: 'レバーをよく焼いて食べます'
  },
  {
    keywords: ['ユッケ', 'ゆっけ'],
    title: 'ユッケ (유케 - 육회)',
    pron: '유케',
    desc: '엄격한 위생 검사를 통과한 신선한 생소고기를 참기름, 달콤한 간장, 달걀노른자와 버무려 먹는 육회입니다.',
    tip: '일본 보건소 허가를 받은 전문점에서만 맛볼 수 있는 귀한 메뉴입니다.',
    order: '桜ユッケ(말고기)または牛ユッケをください'
  },
  {
    keywords: ['センマイ', 'せんまい'],
    title: 'センマイ (센마이 - 천엽)',
    pron: '센마이',
    desc: '소의 세 번째 위 부위로, 회(센마이자시)로 참기름소금이나 초장에 찍어 꼬들하게 즐깁니다.',
    tip: '기름기가 전혀 없어 칼로리가 낮고 안주로 훌륭합니다.',
    order: '白センマイ刺しをお願いします'
  },
  {
    keywords: ['ハツ', 'はつ'],
    title: 'ハツ (하츠 - 소/돼지 심장/염통)',
    pron: '하츠',
    desc: '근육 조직으로 기름기가 없고 담백하며 쫄깃하게 씹히는 부위입니다.',
    tip: '소금구이(시오)로 구워 생와사비를 얹어 드시면 깔끔합니다.',
    order: 'ハツを塩でお願いします'
  },
  {
    keywords: ['サガリ', 'さがり'],
    title: 'サガリ (사가리 - 소 토시살)',
    pron: '사가리',
    desc: '안창살(하라미)과 인접한 부위로 기름기가 적고 부드러우며 고기 본연의 깊은 맛이 납니다.',
    tip: '소고기 특유의 피 맛이나 육향을 좋아하시는 분께 강력 추천합니다.',
    order: 'サガリを一人前ください'
  },
  {
    keywords: ['和牛', 'わぎゅう'],
    title: '和牛 (와규 - 일본산 고급 소고기)',
    pron: '와규',
    desc: '마블링이 눈처럼 촘촘하여 입안에 넣자마자 녹아내리는 일본 고유 품종의 최고급 소고기입니다.',
    tip: 'A4, A5 등급이 최상급이며, 소금과 생와사비만 곁들여 먹는 것이 가장 맛있습니다.',
    order: '和牛カルビをお願いします'
  },
  {
    keywords: ['黒毛和牛', 'くろげわぎゅう'],
    title: '黒毛和牛 (쿠로게와규 - 흑모 화우)',
    pron: '쿠로게와규',
    desc: '와규 중에서도 90% 이상을 차지하는 최상급 검은 털 품종으로, 고소한 향기와 녹아내리는 육질의 정점입니다.',
    tip: '코스 요리나 특선 단품으로 맛보시면 절대 후회하지 않습니다.',
    order: '特選黒毛和牛盛り合わせをください'
  },
  {
    keywords: ['サーロイン', 'さーろいん'],
    title: 'サーロイン (사-로인 - 등심 스테이크)',
    pron: '사-로인',
    desc: '소 허리 부위의 최고급 등심으로 부드러움과 풍미, 육즙이 완벽한 조화를 이룹니다.',
    tip: '겉만 센 불에 빠르게 구워 육즙을 가두어 드세요.',
    order: 'サーロインステーキをお願いします'
  },
  {
    keywords: ['ヒレ', 'ひれ', 'フィレ'],
    title: 'ヒレ (히레 - 안심)',
    pron: '히레',
    desc: '소 한 마리에서 극소량만 나오는 가장 부드러운 부위로, 지방이 거의 없어 담백합니다.',
    tip: '지방이 부담스럽지만 부드러운 고급 부위를 원하실 때 최고의 선택입니다.',
    order: 'ヒレ肉を一つください'
  },
  {
    keywords: ['牛カツ', '牛かつ', 'ぎゅうかつ'],
    title: '牛カツ (규카츠 - 소고기 튀김 카츠)',
    pron: '규카츠',
    desc: '신선한 소고기에 얇은 빵가루를 입혀 60초간 고온에서 튀겨낸 미디엄 레어 비프 카츠입니다.',
    tip: '테이블 위 개인 미니 돌판 화로에 원하는 굽기로 살짝 구워 와사비와 간장, 소금에 찍어 드세요!',
    order: '牛カツ定食をお願いします'
  },
  {
    keywords: ['すき焼き', 'すきやき'],
    title: 'すき焼き (스키야키 - 소고기 전골)',
    pron: '스키야키',
    desc: '얇게 썬 고급 소고기와 야채, 두부를 달콤짭조름한 간장(와리시타)에 자작하게 조려낸 일본 대표 전통 요리입니다.',
    tip: '잘 익은 뜨거운 고기를 신선한 날달걀 푼 그릇에 푹 적셔 드시면 떫은맛 없이 고소함이 폭발합니다.',
    order: 'すき焼きコースを二人前お願いします'
  },
  {
    keywords: ['しゃぶしゃぶ'],
    title: 'しゃぶしゃぶ (샤브샤브)',
    pron: '샤브샤브',
    desc: '끓는 맑은 육수에 얇은 고기와 채소를 살짝 흔들어 익혀 먹는 담백하고 건강한 요리입니다.',
    tip: '고기는 상큼한 폰즈 소스에, 야채는 고소한 참깨(고마) 소스에 찍어 드시면 가장 궁합이 좋습니다.',
    order: 'しゃぶしゃぶをお願いします'
  },
  {
    keywords: ['豚トロ', 'とんとろ', 'トントロ'],
    title: '豚トロ (톤토로 - 돼지 항정살)',
    pron: '톤토로',
    desc: '돼지 목살 안쪽의 살코기로 기름기가 풍부하고 사각사각 씹히는 식감이 매력적입니다.',
    tip: '소금구이로 구워 레몬즙을 살짝 찍어 드시면 느끼함이 사라집니다.',
    order: '豚トロを塩でください'
  },
  {
    keywords: ['豚カルビ', 'サムギョプサル'],
    title: '豚カルビ (부타카루비 - 돼지 삼겹살 구이)',
    pron: '부타카루비',
    desc: '고소한 기름기가 듬뿍 밴 돼지 삼겹살 및 갈비살 구이입니다.',
    tip: '상추(산츄)를 추가 주문해서 쌈장과 함께 싸 드세요.',
    order: '豚カルビとサンチュをお願いします'
  },
  {
    keywords: ['せせり', '鶏せせり'],
    title: 'せせり (세세리 - 닭 목살)',
    pron: '세세리',
    desc: '닭이 목을 계속 움직여 살이 탄력 있고 쫄깃하며 육즙이 가득한 희소 부위입니다.',
    tip: '야키니쿠 집이나 야키토리 집에서 보이면 무조건 시켜야 하는 별미입니다.',
    order: 'せせりを塩でお願いします'
  },
  {
    keywords: ['焼肉', 'やきにく'],
    title: '焼肉 (야키니쿠 - 일본식 숯불고기 구이)',
    pron: '야키니쿠',
    desc: '식탁 위 화로에서 고기를 한 점씩 구워 먹는 일본의 대표 외식 문화입니다.',
    tip: '고기 부위별로 1인분씩 다양하게 시켜 맛을 비교해 보세요.',
    order: 'おすすめの盛り合わせをお願いします'
  },

  // ----------------------------------------------------
  // 3. 스시 & 해산물 (30개)
  // ----------------------------------------------------
  {
    keywords: ['大トロ', 'オオトロ', 'おおとろ'],
    title: '大トロ (오도로 - 참치 대뱃살)',
    pron: '오-도로',
    desc: '참치 부위 중 지방 마블링이 가장 풍부하여 혀에 닿자마자 사르르 녹아내리는 최고급 초밥입니다.',
    tip: '기름기가 많으므로 와사비를 평소보다 넉넉히 올려도 맵지 않고 달콤합니다.',
    order: '大トロを一貫(いっかん)ください'
  },
  {
    keywords: ['中トロ', 'チュウトロ', 'ちゅうとろ'],
    title: '中トロ (쥬도로 - 참치 중뱃살)',
    pron: '쥬-도로',
    desc: '지방의 고소함과 붉은살의 산뜻한 산미가 환상적인 밸런스를 이루는 참치 인기 1위 부위입니다.',
    tip: '너무 기름진 대뱃살이 부담스러운 분에게 가장 완벽한 선택입니다.',
    order: '中トロをお願いします'
  },
  {
    keywords: ['赤身', 'あかみ', 'アカミ'],
    title: '赤身 (아카미 - 참치 붉은살)',
    pron: '아카미',
    desc: '기름기 없이 참치 본연의 묵직하고 깔끔한 감칠맛과 산미를 느낄 수 있는 살코기 부위입니다.',
    tip: '간장에 살짝 절인 즈케(づけ) 스타일로 드시면 더욱 깊은 맛이 납니다.',
    order: 'マグロの赤身をください'
  },
  {
    keywords: ['マグロ', 'まぐろ', '鮪'],
    title: 'マグロ (마구로 - 참치/다랑어)',
    pron: '마구로',
    desc: '일본 스시의 상징이자 기초가 되는 참치입니다.',
    tip: '모둠 스시(모리아와세)에 기본으로 포함되어 나옵니다.',
    order: 'マグロづくしをお願いします'
  },
  {
    keywords: ['サーモン', 'さーもん'],
    title: 'サーモン (사몬 - 연어 초밥)',
    pron: '사-몬',
    desc: '부드러운 식감과 고소한 기름기로 남녀노소 누구나 좋아하는 대중적인 연어 초밥입니다.',
    tip: '양파와 마요네즈를 올린 스타일도 별미입니다.',
    order: 'サーモンを二貫ください'
  },
  {
    keywords: ['炙り', 'あぶり'],
    title: '炙りサーモン (아부리 사몬 - 불에 그을린 연어)',
    pron: '아부리 사-몬',
    desc: '토치로 표면을 살짝 불꽃으로 구워 고소한 기름과 불향을 극대화한 초밥입니다.',
    tip: '소금이나 치즈를 얹은 버전도 인기가 매우 높습니다.',
    order: '炙りサーモンチーズをお願いします'
  },
  {
    keywords: ['ウニ', 'うに', '雲丹'],
    title: 'ウニ (우니 - 성게알 군함)',
    pron: '우니',
    desc: '바다의 녹진한 향과 달콤하고 크리미한 풍미가 가득 찬 고급 해산물입니다.',
    tip: '신선한 우니는 전혀 비리지 않고 달콤합니다. 간장을 밥 쪽에 살짝만 찍어 드세요.',
    order: '生ウニの軍艦を一貫ください'
  },
  {
    keywords: ['いくら', 'イクラ'],
    title: 'いくら (이쿠라 - 연어알 군함)',
    pron: '이쿠라',
    desc: '간장에 절여 입안에서 톡톡 터지며 감칠맛 나는 육즙이 퍼지는 보석 같은 연어알입니다.',
    tip: '김의 바삭함이 살아있을 때 나오자마자 바로 드셔야 제맛입니다.',
    order: 'いくら軍艦をお願いします'
  },
  {
    keywords: ['うなぎ', 'ウナギ', '鰻'],
    title: 'うなぎ (우나기 - 민물장어)',
    pron: '우나기',
    desc: '달콤한 특제 간장 타레 소스를 발라 숯불에 노릇하게 구워낸 보양식 민물장어입니다.',
    tip: '산초 가루(산쇼)를 살짝 톡톡 뿌려 드시면 향긋함이 배가됩니다.',
    order: 'うなぎの握りをください'
  },
  {
    keywords: ['あなご', '穴子'],
    title: '穴子 (아나고 - 붕장어/바다장어)',
    pron: '아나고',
    desc: '특제 육수에 부드럽게 푹 쪄내어 혀 위에서 사르르 부서지는 바다장어 초밥입니다.',
    tip: '민물장어보다 담백하고 포슬포슬 부드러운 식감이 특징입니다.',
    order: '煮穴子を一本握りでお願いします'
  },
  {
    keywords: ['海老', 'えび', 'エビ'],
    title: '海老 (에비 - 새우)',
    pron: '에비',
    desc: '살짝 데쳐 단맛과 탱글탱글한 탄력을 살린 정통 새우 초밥입니다.',
    tip: '스시의 클래식한 기본 메뉴입니다.',
    order: 'エビをお願いします'
  },
  {
    keywords: ['甘エビ', 'あまえび'],
    title: '甘エビ (아마에비 - 단새우)',
    pron: '아마에비',
    desc: '날것 그대로의 생새우로 입안에 쫀득하게 감기는 달콤함이 일품입니다.',
    tip: '초간장에 와사비를 살짝 풀어 찍어 드세요.',
    order: '甘エビをください'
  },
  {
    keywords: ['タコ', 'たこ', '蛸'],
    title: 'タコ (타코 - 문어)',
    pron: '타코',
    desc: '살짝 데쳐내어 씹을수록 단맛과 쫄깃한 식감이 배어 나오는 문어 초밥입니다.',
    tip: '오사카의 자랑 문어를 초밥으로 즐겨보세요.',
    order: 'タコを一貫お願いします'
  },
  {
    keywords: ['イカ', 'いか', '烏賊'],
    title: 'イカ (이카 - 오징어/한치)',
    pron: '이카',
    desc: '칼집을 촘촘히 내어 쫀득쫀득하고 은은한 단맛이 퍼지는 오징어 초밥입니다.',
    tip: '시소(일본 깻잎) 잎이나 유자 껍질을 곁들여 상큼하게 먹는 매장이 많습니다.',
    order: 'ヤリイカをお願いします'
  },
  {
    keywords: ['ホタテ', 'ほたて', '帆立'],
    title: 'ホタテ (호타테 - 가리비 관자)',
    pron: '호타테',
    desc: '도톰하고 큼직한 가리비 관자의 부드럽고 달콤한 살이 입안 가득 차오릅니다.',
    tip: '살짝 불에 그을린 "아부리 호타테"도 버터 향과 어우러져 환상적입니다.',
    order: '生ホタテをください'
  },
  {
    keywords: ['アジ', 'あじ', '鯵'],
    title: 'アジ (아지 - 전갱이)',
    pron: '아지',
    desc: '등푸른생선 중 가장 대중적이며, 기름진 고소함과 감칠맛이 뛰어난 생선입니다.',
    tip: '비린내를 잡기 위해 위에 다진 생강(쇼가)과 쪽파를 기본으로 얹어줍니다.',
    order: 'アジを生姜のせでお願いします'
  },
  {
    keywords: ['サバ', 'さば', '鯖', '〆さば'],
    title: '〆さば (시메사바 - 고등어 초절임)',
    pron: '시메사바',
    desc: '신선한 고등어를 소금과 식초에 절여 비린내를 없애고 감칠맛을 농축시킨 정통 초밥입니다.',
    tip: '등푸른생선 매니아들이 가장 사랑하는 깊은 맛입니다.',
    order: '〆さばを一貫ください'
  },
  {
    keywords: ['タイ', 'たい', '鯛'],
    title: '鯛 (타이 - 참돔/도미)',
    pron: '타이',
    desc: '쫄깃하고 단단한 육질과 담백하고 은은한 단맛을 자랑하는 고급 흰살 생선의 제왕입니다.',
    tip: '일본 축하 자리에서 빠지지 않는 길조의 생선입니다.',
    order: '真鯛(マダイ)をお願いします'
  },
  {
    keywords: ['ブリ', 'ぶり', '鰤'],
    title: 'ブリ (부리 - 방어)',
    pron: '부리',
    desc: '추운 겨울철 살이 통통하게 오르고 기름기가 꽉 찬 고소한 대방어 초밥입니다.',
    tip: '와사비 간장에 푹 찍어도 기름기가 풍부해 달콤합니다.',
    order: '寒ブリをください'
  },
  {
    keywords: ['ハマチ', 'はまち'],
    title: 'ハマチ (하마치 - 새끼 방어)',
    pron: '하마치',
    desc: '방어의 어린 시절로, 너무 기름지지 않고 탄력 있는 쫄깃함이 돋보입니다.',
    tip: '가성비가 좋아 일본 회전초밥집에서 매우 인기입니다.',
    order: 'ハマチをお願いします'
  },
  {
    keywords: ['カンパチ', 'かんぱち'],
    title: 'カンパチ (칸파치 - 잿방어)',
    pron: '칸파치',
    desc: '방어과 생선 중 살이 가장 단단하고 찰지며 고급스러운 식감을 자랑합니다.',
    tip: '사각사각 씹히는 흰살/붉은살 경계의 탄력이 매력적입니다.',
    order: 'カンパチを二貫ください'
  },
  {
    keywords: ['えんがわ', 'エンガワ', '縁側'],
    title: 'えんがわ (엔가와 - 광어/도다리 지느러미)',
    pron: '엔가와',
    desc: '생선이 지느러미를 움직이며 발달한 부위로 오독오독 씹히는 식감과 진한 기름맛이 터집니다.',
    tip: '불에 살짝 그을린 "아부리 엔가와"는 고소함이 3배로 증폭됩니다.',
    order: '炙りえんがわをお願いします'
  },
  {
    keywords: ['カツオ', 'かつお', '鰹'],
    title: 'カツオ (가쓰오 - 가다랑어)',
    pron: '가쓰오',
    desc: '겉면만 짚불에 살짝 구운 "타타키" 스타일로 마늘 편과 폰즈 소스에 곁들여 먹는 붉은살 생선입니다.',
    tip: '특유의 훈연 불향과 산뜻한 산미가 매력적입니다.',
    order: 'カツオのタタキをください'
  },
  {
    keywords: ['玉子', 'たまご', 'タマゴ'],
    title: '玉子 (타마고 - 달걀말이 초밥)',
    pron: '타마고',
    desc: '가쓰오 육수를 듬뿍 넣어 달콤하고 폭신폭신 카스텔라처럼 부드럽게 구워낸 초밥입니다.',
    tip: '스시집 주방장의 기본 실력을 가늠하는 척도로 여겨지는 메뉴입니다.',
    order: '玉子を一貫お願いします'
  },
  {
    keywords: ['赤貝', 'あかがい'],
    title: '赤貝 (아카가이 - 피조개)',
    pron: '아카가이',
    desc: '오독오독 씹히는 탄력과 바다의 향긋한 조개 감칠맛이 뛰어난 고급 조개 초밥입니다.',
    tip: '주방장이 도마에 탕 내리쳐 근육을 수축시킨 뒤 쥐어줍니다.',
    order: '赤貝をお願いします'
  },
  {
    keywords: ['アワビ', 'あわび', '鮑'],
    title: 'アワビ (아와비 - 전복)',
    pron: '아와비',
    desc: '생전복의 단단하고 오독오독한 식감, 또는 술에 쪄내어(무시아와비) 부드러운 식감으로 즐깁니다.',
    tip: '전복 내장(게우) 소스를 곁들여 먹으면 풍미가 극대화됩니다.',
    order: '蒸しアワビをください'
  },
  {
    keywords: ['カニ', 'かに', '蟹'],
    title: 'カニ (카니 - 게살 초밥)',
    pron: '카니',
    desc: '대게나 홍게 살을 발라내어 달콤하고 부드러운 게장(카니미소)과 함께 얹은 초밥입니다.',
    tip: '카니미소(カニミソ: 게 내장) 군함말이도 고소함의 극치입니다.',
    order: 'カニミソ軍艦をお願いします'
  },
  {
    keywords: ['鉄火巻', 'てっかまき'],
    title: '鉄火巻 (텟카마키 - 참치 김초밥)',
    pron: '텟카마키',
    desc: '김 위에 밥을 펴고 참치 붉은살을 넣어 둥글게 말아낸 깔끔한 김초밥입니다.',
    tip: '식사 마무리로 산뜻하게 배를 채우기 좋습니다.',
    order: '鉄火巻きを一本ください'
  },
  {
    keywords: ['ネギトロ', 'ねぎとろ'],
    title: 'ネギトロ (네기토로 - 다진 참치와 파)',
    pron: '네기토로',
    desc: '뼈 사이의 부드러운 참치 살을 숟가락으로 긁어내어(네기토리) 대파를 곁들인 군함말이입니다.',
    tip: '기름지고 부드러워 입안에서 사르르 녹아내립니다.',
    order: 'ネギトロ軍艦をお願いします'
  },
  {
    keywords: ['シャリ', 'しゃり'],
    title: 'シャリ (샤리 - 초밥의 밥)',
    pron: '샤리',
    desc: '스시에서 회 밑에 깔리는 식초와 소금, 설탕으로 간을 맞춘 초밥 밥입니다.',
    tip: '밥 양을 줄이고 싶을 때는 "샤리 코마메(シャリ小さめ: 밥 적게)"라고 요청하세요.',
    order: 'シャリ小さめでお願いします'
  },

  // ----------------------------------------------------
  // 4. 꼬치구이 & 튀김류 (20개)
  // ----------------------------------------------------
  {
    keywords: ['串カツ', '串かつ', 'くしかつ'],
    title: '串カツ (쿠시카츠 - 오사카 신세카이 명물 꼬치튀김)',
    pron: '쿠시카츠',
    desc: '소고기, 돼지고기, 새우, 메추리알, 아스파라거스 등을 꼬치에 꿰어 얇고 바삭하게 튀겨낸 오사카 대표 음식입니다.',
    tip: '⚠️ 위생을 위해 테이블 위 공용 소스통에는 [소스 한 번만 찍기(두 번 찍기 절대 금지 / 二度漬け禁止)] 룰이 필수입니다! 부족하면 양배추로 소스를 떠서 얹으세요.',
    order: '串カツ盛り合わせをお願いします'
  },
  {
    keywords: ['焼き鳥', 'やきとり', 'ヤキトリ'],
    title: '焼き鳥 (야키토리 - 닭꼬치 구이)',
    pron: '야키토리',
    desc: '신선한 닭고기 부위별로 꼬치에 꿰어 숯불에 구워내는 일본 선술집 대표 안주입니다.',
    tip: '주문 시 달콤한 양념인 [타레(タレ)] 또는 담백한 소금구이인 [시오(塩)] 중 맛을 선택할 수 있습니다.',
    order: '焼き鳥をおまかせで5本、塩でお願いします'
  },
  {
    keywords: ['ねぎま', 'ネギマ'],
    title: 'ねぎま (네기마 - 닭다리 대파 꼬치)',
    pron: '네기마',
    desc: '촉촉한 닭다리살 사이에 달콤하게 구워진 대파를 번갈아 끼운 야키토리의 가장 대표적인 간판 메뉴입니다.',
    tip: '파의 은은한 단맛과 닭기름의 조화가 환상적입니다.',
    order: 'ねぎまをタレで2本ください'
  },
  {
    keywords: ['もも', 'モモ'],
    title: 'もも (모모 - 닭다리살 꼬치)',
    pron: '모모',
    desc: '육즙이 풍부하고 부드러운 닭다리 정육 부위 꼬치입니다.',
    tip: '호불호 없이 누구나 가장 맛있게 먹을 수 있는 부위입니다.',
    order: 'ももを塩でお願いします'
  },
  {
    keywords: ['つくね', 'ツクネ'],
    title: 'つくね (츠쿠네 - 닭고기 완자 꼬치)',
    pron: '츠쿠네',
    desc: '다진 닭고기에 연골과 채소를 뭉쳐 부드럽게 빚은 완자 꼬치입니다.',
    tip: '달콤한 타레 소스에 구워 신선한 생달걀 노른자(오란)를 터뜨려 찍어 먹으면 꿀맛입니다.',
    order: '月見つくね(달걀 노른자 포함)をください'
  },
  {
    keywords: ['かわ', '鶏皮', '皮', 'とりかわ'],
    title: 'かわ (카와 - 닭 껍질 꼬치)',
    pron: '카와',
    desc: '바삭하게 구우면 과자 같고 속은 쫄깃하며 기름진 고소함이 응축된 닭 껍질 구이입니다.',
    tip: '바삭한 식감을 좋아하시면 "카리와리(カリカリ: 바삭하게)" 구워달라고 하세요.',
    order: '皮をよく焼きでお願いします'
  },
  {
    keywords: ['砂肝', 'すなぎも', 'ズリ'],
    title: '砂肝 (스나기모 / 즈리 - 닭 모래집/똥집)',
    pron: '스나기모',
    desc: '기름기 없이 아삭아삭하고 꼬들꼬들하게 씹히는 식감이 일품인 모래주머니 부위입니다.',
    tip: '소금구이(시오)에 레몬즙을 살짝 짜서 맥주 안주로 드세요.',
    order: '砂肝を塩でください'
  },
  {
    keywords: ['なんこつ', '軟骨'],
    title: 'なんこつ (난코츠 - 닭 연골 꼬치)',
    pron: '난코츠',
    desc: '오독오독 씹히는 닭 가슴 연골 또는 무릎 연골 부위로 칼로리가 낮고 씹는 재미가 훌륭합니다.',
    tip: '튀김(가라아게)으로 만든 난코츠 가라아게도 인기 만점입니다.',
    order: 'なんこつ揚げをお願いします'
  },
  {
    keywords: ['ぼんじり', 'ボンジリ'],
    title: 'ぼんじり (본지리 - 닭 꽁지살)',
    pron: '본지리',
    desc: '닭 엉덩이 쪽의 삼각형 살코기로, 닭 한 마리에서 극소량만 나오며 기름기가 아주 풍부하고 육즙이 폭발합니다.',
    tip: '기름진 부위를 좋아하시는 분들에게 최고의 숨은 별미입니다.',
    order: 'ぼんじりを塩で2本ください'
  },
  {
    keywords: ['天ぷら', 'てんぷら', '天婦羅'],
    title: '天ぷら (덴푸라 - 일본식 튀김)',
    pron: '덴푸라',
    desc: '얼음물 반죽으로 얇고 눈꽃처럼 바삭하게 튀겨내어 식재료 본연의 맛을 살린 일본 정통 튀김 요리입니다.',
    tip: '간장 소스(텐쯔유)에 간 무(다이콘오로시)를 듬뿍 풀어서 찍어 드시거나 맛소금에 살짝 찍어 드세요.',
    order: '天ぷら盛り合わせをお願いします'
  },
  {
    keywords: ['から揚げ', '唐揚げ', 'からあげ'],
    title: '唐揚げ (가라아게 - 일본식 닭튀김)',
    pron: '가라아게',
    desc: '간장, 생강, 마늘 양념에 재운 닭다리살에 전분을 얇게 묻혀 바삭하게 튀겨낸 겉바속촉 닭튀김입니다.',
    tip: '레몬 조각이 함께 나오며, 일행에게 레몬을 뿌려도 되는지 물어보고 뿌리는 것이 일본 식사 예절입니다.',
    order: '若鶏の唐揚げを一つください'
  },
  {
    keywords: ['とんかつ', 'トンカツ', '豚カツ'],
    title: 'とんかつ (돈카츠 - 돼지고기 돈까스)',
    pron: '돈카츠',
    desc: '두툼한 돼지고기에 굵은 생빵가루를 묻혀 깨끗한 기름에 튀겨낸 일본 국민 외식 메뉴입니다.',
    tip: '첫 점은 소스 없이 소금이나 겨자만 살짝 얹어 고기 육즙 본연의 맛을 느껴보세요.',
    order: 'ロースかつ定食をお願いします'
  },
  {
    keywords: ['ロースカツ', 'ろーすかつ'],
    title: 'ロースカツ (로스카츠 - 등심 돈까스)',
    pron: '로-스카츠',
    desc: '살코기 끝부분에 고소한 지방층이 적절히 붙어있어 씹을수록 풍미가 진한 등심 돈까스입니다.',
    tip: '고소하고 기름진 육즙을 좋아하시는 분께 추천합니다.',
    order: '特上ロースカツをください'
  },
  {
    keywords: ['ヒレカツ', 'ひれかつ'],
    title: 'ヒレカツ (히레카츠 - 안심 돈까스)',
    pron: '히레카츠',
    desc: '지방이 전혀 없이 둥글고 두툼하게 튀겨낸 안심 돈까스로, 젓가락으로 잘릴 만큼 극강의 부드러움을 자랑합니다.',
    tip: '담백하고 연한 고기를 선호하시는 분께 강력 추천합니다.',
    order: 'ヒレカツ定食をお願いします'
  },
  {
    keywords: ['カキフライ', 'かきふらい'],
    title: 'カキフライ (카키후라이 - 굴 튀김)',
    pron: '카키후라이',
    desc: '통통하고 신선한 제철 굴에 바삭한 튀김옷을 입혀 튀겨낸 겨울철 별미입니다.',
    tip: '상큼하고 고소한 타르타르 소스와 양배추 샐러드를 듬뿍 곁들여 드세요.',
    order: 'カキフライをタルタルソースでお願いします'
  },
  {
    keywords: ['エビフライ', 'えびふらい'],
    title: 'エビフライ (에비후라이 - 왕새우 튀김)',
    pron: '에비후라이',
    desc: '큼직한 새우를 통째로 길게 바삭하게 튀겨낸 요리입니다.',
    tip: '정식 세트나 카레 토핑으로 아주 인기가 높습니다.',
    order: 'エビフライ定食をください'
  },
  {
    keywords: ['コロッケ', 'ころっけ'],
    title: 'コロッケ (고로케 - 감자 고로케)',
    pron: '고로케',
    desc: '포슬포슬한 감자에 다진 고기와 양파를 섞어 바삭하게 튀긴 정겨운 일본 길거리 간식입니다.',
    tip: '우스터소스를 살짝 뿌려 드시면 더욱 달콤짭조름합니다.',
    order: '手作りコロッケを2個ください'
  },
  {
    keywords: ['メンチカツ', 'めんちかつ'],
    title: 'メンチカツ (멘치카츠 - 다진 고기 카츠)',
    pron: '멘치카츠',
    desc: '소고기와 돼지고기를 잘게 다져 양파와 양념을 넣고 둥글게 튀긴 고기 고로케로, 한입 베어 물면 육즙이 뚝뚝 떨어집니다.',
    tip: '정육점(니쿠야)에서 갓 튀긴 멘치카츠는 최고의 가성비 간식입니다.',
    order: 'メンチカツを一つお願いします'
  },
  {
    keywords: ['タレ', 'たれ'],
    title: 'タレ (타레 - 간장 양념 소스)',
    pron: '타레',
    desc: '간장, 미림, 사케, 설탕을 오랜 세월 끓여 숙성시킨 달콤짭조름한 비법 양념장입니다.',
    tip: '야키토리나 야키니쿠 주문 시 짭조름한 단맛을 원하시면 선택하세요.',
    order: 'タレ味でお願いします'
  },
  {
    keywords: ['塩', 'しお'],
    title: '塩 (시오 - 소금구이)',
    pron: '시오',
    desc: '양념 소스 없이 천일염으로만 간을 맞추어 구워내는 담백한 조리 방식입니다.',
    tip: '신선한 고기나 해산물 본연의 순수한 감칠맛을 느끼고 싶을 때 추천합니다.',
    order: '塩でお願いします'
  },

  // ----------------------------------------------------
  // 5. 오사카 명물 & 식사/덮밥 (25개)
  // ----------------------------------------------------
  {
    keywords: ['たこ焼き', 'たこやき'],
    title: 'たこ焼き (타코야키 - 오사카 문어 풀빵)',
    pron: '타코야키',
    desc: '밀가루 반죽에 큼직한 문어 조각, 텐카스, 파, 생강을 넣고 동그랗게 구워낸 오사카의 영혼이 담긴 소울푸드입니다.',
    tip: '⚠️ 겉은 바삭해 보여도 속은 용암처럼 뜨거운 크림 상태이니 절대 한입에 다 넣지 마시고 반을 쪼개 식혀 드세요!',
    order: 'たこ焼きを8個、ソースマヨでお願いします'
  },
  {
    keywords: ['お好み焼き', 'おこのみやき'],
    title: 'お好み焼き (오코노미야키 - 오사카식 철판 부침)',
    pron: '오코노미야키',
    desc: '채 썬 양배추와 마 반죽에 삼겹살, 해산물을 듬뿍 얹어 두툼하게 구운 뒤 데리야키 소스, 마요네즈, 파란 김가루, 가쓰오부시를 얹어 먹는 철판 요리입니다.',
    tip: '미니 철판 뒤집개(코테)로 피자처럼 잘라 철판 위에서 따뜻하게 드세요.',
    order: '豚玉(돼지고기 오코노미야키)を一つください'
  },
  {
    keywords: ['焼きそば', 'やきそば'],
    title: '焼きそば (야키소바 - 철판 볶음면)',
    pron: '야키소바',
    desc: '중화면과 돼지고기, 양배추, 숙주를 센 불의 철판에서 우스터소스와 함께 볶아낸 감칠맛 넘치는 볶음면입니다.',
    tip: '위에 반숙 계란후라이를 추가(메다마야키 노세)하면 훨씬 부드럽습니다.',
    order: '焼きそばに目玉焼きトッピングをお願いします'
  },
  {
    keywords: ['モダン焼き', 'モダンやき'],
    title: 'モダン焼き (모단야키 - 오코노미야키+면 합체)',
    pron: '모단야키',
    desc: '오코노미야키 반죽 사이에 야키소바 면을 두툼하게 끼워 함께 구워낸 든든한 양의 오사카 인기 메뉴입니다.',
    tip: '한 판으로 오코노미야키와 야키소바를 둘 다 맛보고 싶을 때 최선의 선택입니다.',
    order: 'モダン焼きを一つお願いします'
  },
  {
    keywords: ['ねぎ焼き', 'ねぎやき'],
    title: 'ねぎ焼き (네기야키 - 오사카 대파 전)',
    pron: '네기야키',
    desc: '양배추 대신 잘게 썬 대파를 산더미처럼 넣고 소 스지(힘줄)와 곤약을 넣어 간장 소스로 담백하게 구워낸 전통 전입니다.',
    tip: '달콤한 소스 대신 간장(쇼유)과 레몬즙으로 먹어 아주 깔끔하고 개운합니다.',
    order: 'すじねぎ焼きを醤油味でください'
  },
  {
    keywords: ['どて焼き', 'どてやき'],
    title: 'どて焼き (도테야키 - 소 스지 된장 조림)',
    pron: '도테야키',
    desc: '소의 스지(힘줄)와 사태 살을 달콤하고 구수한 백된장(시로미소) 양념에 몇 시간 동안 푹 조려낸 오사카 대표 선술집 안주입니다.',
    tip: '시치미(고춧가루)를 톡톡 뿌려 시원한 나마비루(생맥주)와 함께 드시면 극락입니다.',
    order: 'どて焼きを一皿お願いします'
  },
  {
    keywords: ['かつ丼', 'カツ丼', 'かつどん'],
    title: 'かつ丼 (가츠동 - 돈까스 덮밥)',
    pron: '가츠동',
    desc: '갓 튀긴 바삭한 돈까스와 얇게 썬 양파를 달콤짭조름한 가쓰오 쯔유에 살짝 조리고 달걀물을 풀어 밥 위에 얹은 덮밥입니다.',
    tip: '촉촉하게 스며든 밥과 부드러운 고기가 완벽한 한 끼 식사를 완성합니다.',
    order: 'かつ丼を並盛りでお願いします'
  },
  {
    keywords: ['牛丼', 'ぎゅうどん'],
    title: '牛丼 (규동 - 소고기 덮밥)',
    pron: '규동',
    desc: '얇게 썬 소고기와 달콤한 양파를 특제 간장 양념에 자작하게 끓여 따뜻한 밥 위에 얹어낸 일본 국민 패스트푸드입니다.',
    tip: '생강 절임(베니쇼가)을 듬뿍 얹고 날달걀(온센타마고)을 풀어 비벼 드세요.',
    order: '牛丼並盛り、生卵セットでお願いします'
  },
  {
    keywords: ['親子丼', 'おやこどん'],
    title: '親子丼 (오야코동 - 닭고기 달걀 덮밥)',
    pron: '오야코동',
    desc: '부모(닭)와 자식(달걀)이 함께 들어갔다는 이름의 덮밥으로, 쫄깃한 닭다리살과 반숙 달걀의 부드러움이 일품입니다.',
    tip: '시치미나 산초 가루를 살짝 뿌려 드시면 느끼하지 않습니다.',
    order: '親子丼を一つください'
  },
  {
    keywords: ['天丼', 'てんどん'],
    title: '天丼 (텐동 - 모둠 튀김 덮밥)',
    pron: '텐동',
    desc: '갓 튀겨낸 바삭한 새우, 생선, 가지, 김, 꽈리고추 튀김을 밥 위에 얹고 달콤한 타레 소스를 둘러낸 덮밥입니다.',
    tip: '튀김이 눅눅해지지 않도록 그릇 뚜껑에 튀김을 덜어두고 밥과 번갈아 드세요.',
    order: '上天丼をお願いします'
  },
  {
    keywords: ['うな重', 'うな丼', 'うなじゅう', 'うなどん'],
    title: 'うな重 / うな丼 (우나쥬 / 우나동 - 장어 덮밥)',
    pron: '우나쥬- / 우나동',
    desc: '특제 양념을 발라 불에 구운 장어를 밥 위에 얹은 고급 보양식 덮밥입니다. 찬합(네모난 칠기)에 나오면 우나쥬, 둥근 그릇에 나오면 우나동입니다.',
    tip: '산초 가루를 살짝 뿌려 장어의 흙내를 잡고 풍미를 돋워 드세요.',
    order: 'うな重の特上をお願いします'
  },
  {
    keywords: ['海鮮丼', 'かいせんどん'],
    title: '海鮮丼 (카이센동 - 해산물 덮밥)',
    pron: '카이센동',
    desc: '참치, 연어, 성게알(우니), 연어알(이쿠라), 새우 등 싱싱한 제철 회를 그릇 가득 화려하게 올린 덮밥입니다.',
    tip: '간장에 와사비를 푼 뒤 덮밥 전체에 골고루 살짝 둘러서 드세요.',
    order: '特選海鮮丼を一つお願いします'
  },
  {
    keywords: ['カレーライス', 'カレー'],
    title: 'カレーライス (카레라이스 - 일본식 카레)',
    pron: '카레-라이스',
    desc: '양파를 캐러멜라이징하여 갈색빛이 날 때까지 푹 끓여 진하고 묵직한 감칠맛과 단맛이 나는 일본 정통 카레입니다.',
    tip: '돈까스(카츠카레)나 치즈, 반숙 달걀을 토핑으로 올리면 환상적입니다.',
    order: 'カツカレーの中辛(보통 매운맛)をお願いします'
  },
  {
    keywords: ['きつねうどん'],
    title: 'きつねうどん (키츠네 우동 - 유부 우동)',
    pron: '키츠네 우동',
    desc: '오사카에서 탄생한 우동으로, 달콤짭조름하게 조려낸 손바닥만 한 대형 유부가 면을 덮고 있는 대표 온우동입니다.',
    tip: '다시마와 가쓰오부시로 우려낸 맑고 깊은 오사카식 황금 육수가 예술입니다.',
    order: 'きつねうどんを一杯ください'
  },
  {
    keywords: ['肉うどん', 'にくうどん'],
    title: '肉うどん (니쿠 우동 - 고기 우동)',
    pron: '니쿠 우동',
    desc: '달콤한 불고기 양념에 볶은 소고기가 푸짐하게 올라가 국물까지 달달하고 진한 우동입니다.',
    tip: '오사카 난바의 우동 명가 카스우동(소 곱창 튀김 우동)도 꼭 함께 드셔보세요.',
    order: '肉うどんをお願いします'
  },
  {
    keywords: ['カレーうどん'],
    title: 'カレーうどん (카레 우동)',
    pron: '카레- 우동',
    desc: '다시마 육수에 일본식 카레를 풀고 전분으로 걸쭉하게 끓여내어 면에 양념이 듬뿍 묻어나는 따뜻한 별미 우동입니다.',
    tip: '⚠️ 국물이 옷에 튀기 쉬우니 "카미에프로(紙エプロン: 일회용 종이 앞치마)"를 꼭 요청하세요!',
    order: '紙エプロンをいただけますか？'
  },
  {
    keywords: ['ぶっかけうどん', 'ぶっかけ'],
    title: 'ぶっかけうどん (붓카케 우동 - 비빔 우동)',
    pron: '붓카케 우동',
    desc: '탱글탱글하게 헹군 쫄깃한 면 위에 진한 쯔유 소스를 자작하게 부어 생강, 쪽파, 튀김 부스러기와 비벼 먹는 우동입니다.',
    tip: '면발 본연의 극강의 탄력과 쫄깃함을 느끼고 싶다면 냉(히야시) 붓카케를 고르세요.',
    order: '冷たいぶっかけうどんを一つお願いします'
  },
  {
    keywords: ['ざるそば', 'ざる蕎麦'],
    title: 'ざるそば (자루 소바 - 판 메밀국수)',
    pron: '자루소바',
    desc: '대나무 발(자루) 위에 시원하게 올린 메밀면을 쯔유 간장 소스에 와사비와 파를 넣고 살짝 찍어 후루룩 먹는 면 요리입니다.',
    tip: '면을 쯔유에 전부 담그지 말고 아래 1/3만 살짝 담가 먹어야 메밀 향이 살아납니다.',
    order: 'ざるそばを大盛りでお願いします'
  },
  {
    keywords: ['鴨南蛮', 'かもなんばん'],
    title: '鴨南蛮 (카모난반 - 오리고기 대파 소바/우동)',
    pron: '카모난반',
    desc: '구운 대파의 단맛과 훈연 오리고기의 진한 기름 육즙이 따뜻한 국물에 녹아든 전통 고급 소바입니다.',
    tip: '겨울철 따뜻하게 몸을 녹여주는 대표 메뉴입니다.',
    order: '鴨南蛮そばを一つください'
  },
  {
    keywords: ['おでん'],
    title: 'おでん (오뎅 - 일본식 정통 어묵 조림)',
    pron: '오뎅',
    desc: '무(다이콘), 달걀, 곤약, 유부 주머니, 다양한 수제 어묵을 맑은 가쓰오 육수에 푹 끓여낸 겨울철 대표 음식입니다.',
    tip: '국물이 푹 배어 숟가락으로 부드럽게 잘리는 [다이콘(무)]은 절대 빼놓지 말고 주문하세요! 노란 겨자(카라시)를 찍어 먹습니다.',
    order: '大根、たまご、牛すじをお願いします'
  },
  {
    keywords: ['もつ鍋', 'モツ鍋', 'もつなべ'],
    title: 'もつ鍋 (모츠나베 - 소 대창 전골)',
    pron: '모츠나베',
    desc: '신선한 소 대창과 부추, 양배추, 마늘, 고추를 넣고 간장이나 미소 육수에 바글바글 끓여 먹는 고소한 전골 요리입니다.',
    tip: '건더기를 다 먹은 후 남은 국물에 짬뽕면(챤폰멘)이나 밥을 넣어 죽(조스이)으로 마무리하세요.',
    order: 'もつ鍋を二人前、醤油味でお願いします'
  },
  {
    keywords: ['ちゃんこ鍋', 'ちゃんこなべ'],
    title: 'ちゃんこ鍋 (창코나베 - 스모선수 영양 전골)',
    pron: '창코나베',
    desc: '닭고기, 완자, 해산물, 배추, 버섯 등 영양가 높은 재료를 가득 넣고 끓여낸 든든하고 담백한 전통 전골입니다.',
    tip: '자극적이지 않고 개운해 가족 단위 여행객에게 안성맞춤입니다.',
    order: 'ちゃんこ鍋をお願いします'
  },
  {
    keywords: ['釜飯', 'かまめし'],
    title: '釜飯 (가마메시 - 1인 솥밥)',
    pron: '가마메시',
    desc: '작은 쇠솥에 쌀과 닭고기, 버섯, 죽순, 밤, 해산물을 넣고 즉석에서 불을 피워 갓 지어낸 정성 가득한 솥밥입니다.',
    tip: '밥을 덜어내고 솥 바닥에 눌어붙은 고소한 누룽지(오코게)를 꼭 긁어 드세요.',
    order: '五目釜飯を一つお願いします'
  },
  {
    keywords: ['オムライス', 'おむらいす'],
    title: 'オムライス (오므라이스)',
    pron: '오무라이스',
    desc: '케첩 치킨 볶음밥 위에 노릇하고 폭신한 반숙 달걀 오믈렛을 얹고 데미글라스 소스를 얹은 오사카 홋쿄쿠세이 발상 경양식입니다.',
    tip: '반숙 오믈렛 가운데를 칼로 가르면 좌우로 사르르 펼쳐지는 비주얼이 예술입니다.',
    order: 'オムライスをデミグラスソースでください'
  },
  {
    keywords: ['卵かけご飯', 'TKG', 'たまごかけごはん'],
    title: '卵かけご飯 (타마고카케고한 / TKG - 날달걀 비빔밥)',
    pron: '타마고카케 고한',
    desc: '갓 지은 뜨거운 쌀밥 위에 신선한 날달걀을 톡 깨 넣고 전용 간장을 둘러 비벼 먹는 일본의 대표 아침 식사입니다.',
    tip: '일본 달걀은 철저한 살균 세척을 거쳐 날것으로 먹어도 비리지 않고 안전합니다.',
    order: '卵かけご飯セットをお願いします'
  },

  // ----------------------------------------------------
  // 6. 이자카야 안주 & 주류 (25개)
  // ----------------------------------------------------
  {
    keywords: ['枝豆', 'えだまめ', 'エダマメ'],
    title: '枝豆 (에다마메 - 자숙 풋콩)',
    pron: '에다마메',
    desc: '껍질째 끓는 소금물에 삶아낸 풋콩으로, 껍질을 눌러 콩알을 입안에 쏙 빼먹는 기본 안주입니다.',
    tip: '생맥주를 주문할 때 첫 번째로 시키면 30초 만에 나오는 신속 안주입니다.',
    order: 'とりあえず枝豆と生ビールをください'
  },
  {
    keywords: ['たこわさ', 'たこわさび'],
    title: 'たこわさ (타코와사비 - 알싸한 생문어 무침)',
    pron: '타코와사비',
    desc: '잘게 썬 쫄깃한 생문어를 코끝 찡한 생와사비 양념에 버무려낸 인기 선술집 안주입니다.',
    tip: '기름진 요리를 먹는 중간에 입가심용으로 최고입니다.',
    order: 'たこわさをお願いします'
  },
  {
    keywords: ['餃子', 'ギョーザ', 'ぎょうざ'],
    title: '餃子 (야키교자 - 일본식 군만두)',
    pron: '교-자',
    desc: '밑바닥은 기름에 바삭하게 튀기듯 굽고 윗면은 수증기로 쪄내어 육즙이 가득한 만두입니다.',
    tip: '식초와 간장, 고추기름(라유)을 1:1:0.5 비율로 섞어 찍어 드세요.',
    order: '焼き餃子を一人前ください'
  },
  {
    keywords: ['ポテトサラダ', 'ポテサラ'],
    title: 'ポテトサラダ (포테토 사라다 - 감자 샐러드)',
    pron: '포테토 사라다',
    desc: '삶은 감자를 으깨어 마요네즈, 오이, 양파, 훈제 베이컨, 반숙 달걀과 버무린 일본 이자카야의 대표 필수 안주입니다.',
    tip: '가게마다 독창적인 토핑(훈제 단무지, 후추 등)을 얹어 맛을 비교하는 재미가 있습니다.',
    order: 'ポテトサラダを一つお願いします'
  },
  {
    keywords: ['チャンジャ'],
    title: 'チャンジャ (창자 - 창란젓 안주)',
    pron: '챤쟈',
    desc: '명태 내장을 매콤하고 짭조름하게 무쳐낸 한국식 창란젓으로, 일본 이자카야에서 주류 안주로 큰 인기입니다.',
    tip: '크림치즈와 함께 김에 싸 먹는 "창자 크림치즈" 메뉴가 특히 여성분들에게 인기입니다.',
    order: 'チャンジャクリームチーズをください'
  },
  {
    keywords: ['塩辛', 'しおから'],
    title: '塩辛 (시오카라 - 오징어 젓갈)',
    pron: '시오카라',
    desc: '오징어 살을 내장과 함께 소금에 발효시킨 쌉싸름하고 짭짤한 일본 전통 젓갈입니다.',
    tip: '니혼슈(사케)나 갓 구운 감자 버터구이 위에 얹어 먹으면 별미입니다.',
    order: 'イカの塩辛をお願いします'
  },
  {
    keywords: ['冷奴', 'ひややっこ'],
    title: '冷奴 (히야얏코 - 차가운 연두부)',
    pron: '히야얏코',
    desc: '차가운 연두부 위에 가쓰오부시, 송송 썬 쪽파, 다진 생강을 올리고 간장을 뿌려먹는 담백한 안주입니다.',
    tip: '더운 날씨에 입안을 상쾌하게 정돈해 주는 훌륭한 웰빙 메뉴입니다.',
    order: '冷奴を一つください'
  },
  {
    keywords: ['出汁巻き', 'だし巻き卵', 'だしまき'],
    title: '出汁巻き卵 (다시마키 타마고 - 육수 품은 달걀말이)',
    pron: '다시마키 타마고',
    desc: '가쓰오부시 육수를 듬뿍 넣어 젓가락으로 누르면 맑은 육수가 배어 나오는 촉촉하고 폭신한 달걀말이입니다.',
    tip: '함께 나오는 간 무(다이콘오로시)에 간장을 살짝 떨구어 얹어 드세요.',
    order: '出汁巻き卵をお願いします'
  },
  {
    keywords: ['エイヒレ', 'えいひれ'],
    title: 'エイヒレ (에이히레 - 가오리 날개포 구이)',
    pron: '에이히레',
    desc: '가오리 날개 지느러미를 말려 달콤짭조름하게 구운 포 안주입니다.',
    tip: '함께 나오는 마요네즈와 시치미(고춧가루)에 푹 찍어 드시면 맥주가 끝없이 들어갑니다.',
    order: 'エイヒレの炙りをお願いします'
  },
  {
    keywords: ['生ビール', '生中', 'なまびーる'],
    title: '生ビール (나마비루 - 생맥주)',
    pron: '나마비-루 (중간 잔: 나마츄-)',
    desc: '주문 즉시 탭에서 따라주는 크리미한 거품과 청량감을 자랑하는 시원한 생맥주입니다.',
    tip: '식당에 들어서자마자 외치는 "토리아에즈 나마!(とりあえず生: 우선 생맥주 먼저 주세요!)"는 일본 직장인의 마법의 주문입니다.',
    order: 'とりあえず生中を二つください (우선 생맥주 중간 잔 2개 주세요)'
  },
  {
    keywords: ['瓶ビール', 'びんびーる'],
    title: '瓶ビール (빙비루 - 병맥주)',
    pron: '빙비-루',
    desc: '아사히 수퍼드라이, 기린 이치방, 삿포로 블랙라벨 등 클래식한 유리병에 담긴 맥주입니다.',
    tip: '작은 맥주잔에 일행끼리 서로 따라주는 전통적인 술자리 분위기를 즐길 수 있습니다.',
    order: '瓶ビールを一本ください'
  },
  {
    keywords: ['ハイボール', 'はいぼーる'],
    title: 'ハイボール (하이볼 - 위스키 탄산수)',
    pron: '하이보-루',
    desc: '산토리 가쿠빈 등의 위스키에 톡 쏘는 탄산수와 레몬 조각을 섞어 만든 상쾌하고 칼로리 낮은 대표 주류입니다.',
    tip: '단맛이 전혀 없는 정통 스타일이 기본입니다. 달콤함을 원하시면 "진저 하이볼"이나 "콜라 하이볼"을 주문하세요.',
    order: '角ハイボールをお願いします'
  },
  {
    keywords: ['メガハイボール', 'メガ'],
    title: 'メガハイボール (메가 하이볼 - 2배 대용량)',
    pron: '메가 하이보-루',
    desc: '일반 하이볼 잔의 약 2배 크기(700ml~1L) 잔에 가득 채워주는 가성비 대용량 하이볼입니다.',
    tip: '술을 자주 주문하기 귀찮거나 주량이 센 분들에게 강력 추천합니다.',
    order: 'メガハイボールをください'
  },
  {
    keywords: ['サワー', 'さわー'],
    title: 'サワー (사와 - 과일 탄산 칵테일)',
    pron: '사와-',
    desc: '소주나 보드카에 과즙과 탄산수를 섞어 달콤하고 알코올 도수가 부드러운 과일주입니다.',
    tip: '술맛이 거의 나지 않아 가볍게 음료수처럼 마시기 좋습니다.',
    order: 'グレープフルーツサワーをお願いします'
  },
  {
    keywords: ['レモンサワー', 'れもんさわー'],
    title: 'レモンサワー (레몬 사와 - 생레몬 탄산주)',
    pron: '레몬 사와-',
    desc: '생레몬을 갓 짜 넣어 상큼함이 터지는 일본 이자카야 최고의 대세 주류입니다.',
    tip: '얼린 레몬을 탑처럼 쌓아주는 "메가 레몬사와"를 파는 매장도 많습니다.',
    order: '生搾りレモンサワーを一つください'
  },
  {
    keywords: ['日本酒', '地酒', 'にほんしゅ'],
    title: '日本酒 / 地酒 (니혼슈 / 지자케 - 일본 전통 사케)',
    pron: '니혼슈 / 지자케',
    desc: '쌀과 누룩, 맑은 물만으로 발효시켜 빚어낸 일본의 전통 맑은 청주(사케)입니다.',
    tip: '차갑게 마시는 냉주(레이슈: 冷酒), 실온(조온: 常温), 따뜻하게 데워 마시는 온사케(아츠칸: 熱燗) 중 취향에 맞게 온도를 고를 수 있습니다.',
    order: 'おすすめの辛口日本酒を冷やでお願いします'
  },
  {
    keywords: ['熱燗', 'あつかん'],
    title: '熱燗 (아츠칸 - 따뜻하게 데운 사케)',
    pron: '아츠칸',
    desc: '도쿠리(호리병)에 담긴 사케를 뜨거운 물에 50도 안팎으로 중탕하여 그윽한 향과 알코올 기운을 돋운 술입니다.',
    tip: '추운 날씨나 기름진 안주, 오뎅탕과 곁들이면 몸이 사르르 녹아내립니다.',
    order: '日本酒を一合、熱燗でお願いします'
  },
  {
    keywords: ['焼酎', 'しょうちゅう'],
    title: '焼酎 (쇼츄 - 일본 정통 증류식 소주)',
    pron: '쇼-츄-',
    desc: '고구마(이모: 芋), 보리(무기: 麦), 쌀(코메: 米)을 증류하여 빚은 깊은 풍미의 전통 증류주입니다.',
    tip: '물과 타는 [미즈와리(水割り)], 얼음만 넣는 [록(ロック)], 따뜻한 물과 타는 [오유와리(お湯割り)] 중 음용법을 선택해야 합니다.',
    order: '麦焼酎を水割りでお願いします'
  },
  {
    keywords: ['ウーロンハイ', 'うーろんはい'],
    title: 'ウーロンハイ (우롱하이 - 소주+우롱차)',
    pron: '우-롱하이',
    desc: '소주에 고소하고 깔끔한 우롱차를 섞어 칼로리가 없고 숙취가 적은 깔끔한 술입니다.',
    tip: '단맛이 전혀 없어 기름진 고기나 튀김 요리와 가장 깔끔하게 어울립니다.',
    order: 'ウーロンハイをください'
  },
  {
    keywords: ['緑茶ハイ', 'りょくちゃはい'],
    title: '緑茶ハイ (료쿠차하이 - 소주+녹차)',
    pron: '료쿠차하이',
    desc: '녹차(말차)에 소주를 섞어 쌉싸름한 카테킨 향이 퍼지는 담백한 칵테일입니다.',
    tip: '초록빛 색감이 예쁘고 입안이 개운해집니다.',
    order: '緑茶ハイをお願いします'
  },
  {
    keywords: ['梅酒', 'うめしゅ'],
    title: '梅酒 (우메슈 - 매실주)',
    pron: '우메슈',
    desc: '청매실을 술과 설탕에 숙성시켜 달콤새콤한 풍미를 낸 전통 과실주입니다.',
    tip: '탄산수를 섞은 [소다와리(ソーダ割り)]로 주문하면 스파클링 와인처럼 달콤하고 청량합니다.',
    order: '梅酒ソーダ割りを一つお願いします'
  },
  {
    keywords: ['ノンアルコール', 'ノンアル'],
    title: 'ノンアルコール (논알콜 맥주/음료)',
    pron: '논아루코-루',
    desc: '알코올 0.00%의 무알콜 맥주 또는 칵테일입니다.',
    tip: '술을 못 드시거나 운전을 해야 하는 여행자에게 안전하고 완벽한 대안입니다.',
    order: 'ノンアルコールビールはありますか？'
  },
  {
    keywords: ['ソフトドリンク'],
    title: 'ソフトドリンク (소프트 드링크 - 무알콜 탄산/음료)',
    pron: '소후토 도린쿠',
    desc: '콜라, 진저에일, 오렌지주스, 우롱차 등 알코올이 없는 일반 음료 메뉴입니다.',
    tip: '주류 주문이 필수인 이자카야에서 술 대신 주문하기 좋습니다.',
    order: 'ジンジャーエールをお願いします'
  },
  {
    keywords: ['カルピス', 'かるぴす'],
    title: 'カルピス (칼피스 - 유산균 소다)',
    pron: '카루피스',
    desc: '달콤새콤한 일본 국민 유산균 발효 음료(한국의 밀키스, 암바사와 유사)입니다.',
    tip: '성인은 물론 아이들에게도 최고의 인기 음료입니다.',
    order: 'カルピスソーダをください'
  },
  {
    keywords: ['お通し', '席料', 'テーブルチャージ'],
    title: 'お通し / 席料 (오토시 / 자릿세)',
    pron: '오토-시',
    desc: '이자카야(술집)에 앉으면 주문하지 않아도 웰컴 개념으로 나오는 작은 기본 안주와 자릿세입니다.',
    tip: '1인당 보통 300~500엔이 영수증에 자동 합산 청구되는 합법적인 일본 전통 식문화이니 바가지로 오해하지 마세요!',
    order: 'お通しは何ですか？'
  },

  // ----------------------------------------------------
  // 7. 식당 필수 용어 & 결제 (25개)
  // ----------------------------------------------------
  {
    keywords: ['おすすめ', 'オススメ', 'お勧め'],
    title: 'おすすめ (오스스메 - 추천 메뉴)',
    pron: '오스스메',
    desc: '이 식당에서 주방장이 가장 자신 있게 권하는 시그니처 대표 메뉴입니다.',
    tip: '메뉴판이 너무 복잡해 무엇을 먹을지 고민될 때는 점원에게 "오스스메와 난데스카?(おすすめは何ですか?)"라고 물어보세요.',
    order: 'おすすめは何ですか？ (추천 메뉴가 무엇인가요?)'
  },
  {
    keywords: ['限定', '数量限定', '期間限定'],
    title: '限定 (겐테이 - 한정 판매)',
    pron: '겐테이',
    desc: '하루에 정해진 수량(수량 한정)만 판매하거나 특정 계절에만 맛볼 수 있는 특별 메뉴입니다.',
    tip: '품절(우리키레: 売り切れ)되기 쉬우므로 보이면 바로 주문하는 것이 좋습니다.',
    order: '限定メニューはまだありますか？'
  },
  {
    keywords: ['定食', 'セット'],
    title: '定食 (테이쇼쿠 - 정식 세트)',
    pron: '테이쇼쿠',
    desc: '메인 요리와 함께 흰쌀밥, 미소된장국, 츠케모노(절임반찬)가 한 상으로 균형 있게 나오는 식사입니다.',
    tip: '단품(탄핑: 単品)보다 훨씬 가성비가 뛰어나 점심 식사로 최고입니다.',
    order: '定食でお願いします'
  },
  {
    keywords: ['大盛り', '大盛'],
    title: '大盛り (오오모리 - 곱빼기)',
    pron: '오-모리',
    desc: '밥이나 면의 양을 일반 1인분보다 푸짐하게 늘려주는 곱빼기 옵션입니다.',
    tip: '무료로 곱빼기를 해주는 착한 식당도 많습니다.',
    order: 'ご飯大盛りでお願いします (밥 곱빼기로 주세요)'
  },
  {
    keywords: ['特盛', '特盛り'],
    title: '特盛 (토쿠모리 - 특대 사이즈)',
    pron: '토쿠모리',
    desc: '오오모리(곱빼기)보다 더 많은 특대형 점보 사이즈입니다.',
    tip: '배가 아주 많이 고프거나 대식가 분들에게 제격입니다.',
    order: '特盛を一つください'
  },
  {
    keywords: ['並盛', '普通'],
    title: '並盛 (나미모리 - 기본 보통 사이즈)',
    pron: '나미모리',
    desc: '가장 일반적인 표준 1인분 정량 사이즈입니다.',
    tip: '기본 크기로 주문하고 싶을 때 선택하세요.',
    order: '並盛りでお願いします'
  },
  {
    keywords: ['小盛り', '少なめ'],
    title: '小盛り (코모리 - 작은 양)',
    pron: '코모리',
    desc: '밥이나 면의 양을 보통보다 적게 담아주는 옵션입니다.',
    tip: '여러 맛집을 돌며 길거리 음식을 더 드시고 싶을 때 배를 아끼기 좋습니다.',
    order: 'ご飯少なめでお願いします (밥 적게 주세요)'
  },
  {
    keywords: ['おかわり'],
    title: 'おかわり (오카와리 - 한 그릇 더 리필)',
    pron: '오카와리',
    desc: '밥이나 미소된장국, 양배추 샐러드를 한 그릇 더 달라는 리필 요청입니다.',
    tip: '돈까스 전문점에서는 밥과 양배추, 된장국이 무료 무한 리필(무료 오카와리)인 경우가 많습니다.',
    order: 'ご飯のおかわりをお願いします'
  },
  {
    keywords: ['わさび抜き', 'サビ抜き'],
    title: 'わさび抜き (와사비누키 - 와사비 빼기)',
    pron: '와사비누키',
    desc: '초밥이나 요리에 고추냉이(와사비)를 넣지 말고 만들어 달라는 요청입니다.',
    tip: '매운 것을 못 먹는 어린이나 어른들이 초밥을 주문할 때 필수 표현입니다.',
    order: '全部わさび抜きでお願いします (전부 와사비 빼주세요)'
  },
  {
    keywords: ['ネギ抜き', 'ねぎ抜き'],
    title: 'ネギ抜き (네기누키 - 파 빼기)',
    pron: '네기누키',
    desc: '라멘이나 우동, 덮밥에서 파(대파, 쪽파)를 넣지 말아 달라는 요청입니다.',
    tip: '파의 아린 맛이나 향을 기피하시는 분께 유용합니다.',
    order: 'ネギ抜きでお願いします'
  },
  {
    keywords: ['氷なし', 'こおりなし'],
    title: '氷なし (코오리나시 - 얼음 빼기)',
    pron: '코-리나시',
    desc: '차가운 음료나 물에서 얼음을 빼고 달라는 요청입니다.',
    tip: '얼음이 녹아 음료가 묽어지는 것을 방지하거나 차가운 물을 피하고 싶을 때 쓰세요.',
    order: '氷なしでお願いします'
  },
  {
    keywords: ['税込', '税込み'],
    title: '税込 (제이코미 - 소비세 10% 포함)',
    pron: '제이코미',
    desc: '일본 소비세(10%)가 이미 계산되어 포함된 최종 결제 금액입니다.',
    tip: '메뉴판에 적힌 가격 그대로 엔화를 지불하시면 됩니다.',
    order: '税込価格ですか？'
  },
  {
    keywords: ['税抜', '税別', '本体価格'],
    title: '税抜 (제이누키 - 세금 10% 별도 ⚠️)',
    pron: '제이누키',
    desc: '소비세 10%가 제외된 순수 상품 가격입니다.',
    tip: '계산서에는 적힌 금액에 10% 세금이 추가 청구됩니다. (예: 1,000엔 적힘 ➔ 실제 계산 시 1,100엔 지불)',
    order: 'これは税抜き価格ですか？'
  },
  {
    keywords: ['現金のみ', '現金払い'],
    title: '現金のみ (겐킨노미 - 현금 결제만 가능 ⚠️)',
    pron: '겐킨노미',
    desc: '신용카드나 모바일 페이(카카오페이 등)가 전혀 불가능하고 오직 일본 엔화 지폐와 동전으로만 결제할 수 있는 매장입니다.',
    tip: '일본의 전통 맛집, 라멘 자판기 식권 매장 등은 현금만 받는 곳이 많으니 항상 1만 엔 이상의 현금을 휴대하세요!',
    order: 'カードは使えますか？現金のみですか？'
  },
  {
    keywords: ['クレジットカード', 'カード可'],
    title: 'クレジットカード (신용카드 결제 가능)',
    pron: '쿠레짓토 카-도',
    desc: '해외 신용카드(트래블로그, 트래블월렛, 비자, 마스터 등)로 결제가 가능한 매장입니다.',
    tip: '점원에게 카드를 건네며 "카-도데 오네가이시마스(カードでお願いします)"라고 하시면 됩니다.',
    order: 'カードでお願いします'
  },
  {
    keywords: ['電子マネー', '交通系'],
    title: '電子マネー (덴시마네 - 교통카드/전자머니 결제)',
    pron: '덴시마네-',
    desc: '이코카(ICOCA), 스이카(Suica), 파스모(PASMO) 등 교통카드를 단말기에 태그하여 1초 만에 결제하는 방식입니다.',
    tip: '편의점이나 식당에서 잔돈 동전 생기는 게 싫으실 때 가장 편리합니다.',
    order: '交通系IC(ICOCA)で払えますか？'
  },
  {
    keywords: ['会計', 'お会計', 'お勘定'],
    title: 'お会計 (오카이케이 - 계산/결제)',
    pron: '오카이케이',
    desc: '식사를 마친 후 계산을 요청하는 표현입니다.',
    tip: '양손 검지로 X자 모양을 만들거나 점원에게 "오카이케이 오네가이시마스"라고 말하면 영수증을 건네줍니다.',
    order: 'お会計をお願いします (오카이케이 오네가이시마스)'
  },
  {
    keywords: ['別々', '個別会計'],
    title: '別々 (베츠베츠 - 각자 따로 계산)',
    pron: '베츠베츠',
    desc: '일행끼리 먹은 금액을 한 사람씩 따로따로 나누어 분할 결제하는 방식입니다.',
    tip: '바쁜 피크 시간대에는 분할 결제를 거절하는 식당도 있으니 사전에 문의하세요.',
    order: '別々でお願いします (베츠베츠데 오네가이시마스)'
  },
  {
    keywords: ['一括', 'まとめて'],
    title: 'まとめて (마토메테 - 한 번에 일괄 계산)',
    pron: '마토메테',
    desc: '계산서 1장으로 총액을 한 사람이 대표로 한 번에 결제하는 방식입니다.',
    tip: '식당 입장에서 가장 선호하고 빠르게 결제할 수 있는 방법입니다.',
    order: 'まとめて支払います'
  },
  {
    keywords: ['領収書', 'レシート'],
    title: '領収書 (료슈쇼 - 공식 영수증)',
    pron: '료-슈-쇼',
    desc: '회사 경비 청구 등에 필요한 직인이 찍힌 정식 영수증입니다.',
    tip: '상세 구매 내역이 적힌 일반 영수증은 "레시-토(レシート)"라고 부릅니다.',
    order: '領収書をいただけますか？'
  },
  {
    keywords: ['お冷', 'おひや', 'お水'],
    title: 'お冷 (오히야 - 시원한 냉수)',
    pron: '오히야',
    desc: '식당에서 무료로 제공되는 얼음이 든 시원한 냉수입니다.',
    tip: '일본 식당은 사계절 내내 얼음물이 기본으로 나옵니다.',
    order: 'お冷をいただけますか？ (오히야 오 이타다케마스카?)'
  },
  {
    keywords: ['お湯', '白湯'],
    title: 'お湯 (오유 - 따뜻한 맹물)',
    pron: '오유',
    desc: '얼음물이 너무 차가울 때 따뜻한 물을 달라는 요청입니다.',
    tip: '몸이 안 좋거나 어린아이를 위해 온수가 필요할 때 유용합니다.',
    order: '温かいお湯をいただけますか？'
  },
  {
    keywords: ['禁煙'],
    title: '禁煙 (킨엔 - 금연석 / 금연 매장)',
    pron: '킨엔',
    desc: '전자담배를 포함하여 실내 흡연이 전면 금지된 구역/매장입니다.',
    tip: '일본 법 개정으로 대부분의 일반 식당은 금연이지만, 일부 노포 이자카야는 여전히 흡연 가능하므로 아이 동반 시 확인하세요.',
    order: '禁煙席でお願いします'
  },
  {
    keywords: ['喫煙'],
    title: '喫煙 (키츠엔 - 흡연 가능)',
    pron: '키츠엔',
    desc: '좌석에서 담배를 피울 수 있거나 매장 내 전용 흡연실이 마련되어 있는 곳입니다.',
    tip: '비흡연자나 어린이를 동반한 여행자는 쾌적한 금연 식당을 이용하세요.',
    order: '喫煙所はどこですか？'
  },
  {
    keywords: ['満席'],
    title: '満席 (만세키 - 좌석 만석)',
    pron: '만세키',
    desc: '현재 식당 내부의 자리가 꽉 차서 대기가 필요한 상태입니다.',
    tip: '입구에 대기자 명부(웨이팅 보드)가 있으면 영문 이름(KIM 등)과 인원수를 적고 기다리세요.',
    order: '何分くらい待ちますか？ (몇 분 정도 기다려야 하나요?)'
  },
  {
    keywords: ['準備中'],
    title: '準備中 (준비추 - 브레이크 타임 / 영업 준비 중)',
    pron: '준비츄-',
    desc: '현재 매장이 영업 중이 아니거나 오후 브레이크 타임(보통 15:00~17:00) 중인 상태입니다.',
    tip: '영업 중인 팻말은 "에이교츄(営業中: 営業中)"입니다.',
    order: '何時からオープンですか？ (몇 시부터 오픈인가요?)'
  }
];

// 🌐 고품질 구글 번역 & 로마자 독음 추출 함수 (translate.googleapis.com client=gtx 최우선)
async function translateJaToKoWithGoogle(text) {
  if (!text || !text.trim()) return { translated: '', reading: '' };
  const clean = text.trim();

  // 1차: Google Translate Single API (gtx client) - 고품질 번역 + 독음/로마자
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=ko&dt=t&dt=rm&q=${encodeURIComponent(clean)}`;
    const resp = await fetch(url);
    if (resp.ok) {
      const data = await resp.json();
      let trans = '';
      let reading = '';
      if (Array.isArray(data) && Array.isArray(data[0])) {
        trans = data[0].map(chunk => (chunk && chunk[0]) ? chunk[0] : '').join('');
        // dt=rm으로 반환되는 독음 탐색
        for (const item of data[0]) {
          if (item && item.length >= 4 && item[3]) {
            reading = item[3];
            break;
          } else if (item && item.length >= 3 && item[2] && typeof item[2] === 'string' && !trans.includes(item[2])) {
            reading = item[2];
          }
        }
      }
      if (trans && trans.trim()) {
        return { translated: trans.trim(), reading: (reading || '').trim() };
      }
    }
  } catch (err) {
    console.warn('Google gtx translate error:', err);
  }

  // 2차: Google clients5 API 백업
  try {
    const cUrl = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=ja&tl=ko&q=${encodeURIComponent(clean)}`;
    const resp = await fetch(cUrl);
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data) && data[0]) {
        const trans = Array.isArray(data[0]) ? data[0].join('') : String(data[0]);
        if (trans && trans.trim()) return { translated: trans.trim(), reading: '' };
      }
    }
  } catch (err) {
    console.warn('Google clients5 translate error:', err);
  }

  // 3차: MyMemory 번역기 (최후의 보루 백업)
  try {
    const mUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=ja|ko`;
    const resp = await fetch(mUrl);
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.responseData && data.responseData.translatedText) {
        return { translated: data.responseData.translatedText.trim(), reading: '' };
      }
    }
  } catch (err) {}

  return { translated: clean, reading: '' };
}

// 💰 가격(엔화) 감지 및 원화 환산 / 소비세 10% 분석 헬퍼
function extractPriceInfo(text) {
  if (!text) return null;
  // 엔화 패턴: ¥850, ￥850, 850円, 850 yen, 850Yen
  const priceRegex = /(?:[¥￥]\s*(\d{1,3}(?:,\d{3})*|\d+))|(?:(\d{1,3}(?:,\d{3})*|\d+)\s*(?:円|yen|Yen))/i;
  const match = text.match(priceRegex);
  if (!match) return null;

  const priceStr = match[1] || match[2];
  const num = parseInt(priceStr.replace(/,/g, ''), 10);
  if (isNaN(num) || num <= 0 || num > 500000) return null;

  // 대략적인 원화 환산 (현재 기준 100엔당 약 910원 내외, 9.1배 곱)
  const krw = Math.round((num * 9.1) / 10) * 10;

  const hasTaxIncluded = /税込|内税/.test(text);
  const hasTaxExcluded = /税抜|税別|本体/.test(text);

  let taxNote = '';
  if (hasTaxIncluded) {
    taxNote = '소비세 10% 포함(税込)';
  } else if (hasTaxExcluded) {
    const withTax = Math.round(num * 1.1);
    const withTaxKrw = Math.round((withTax * 9.1) / 10) * 10;
    taxNote = `세금 10% 별도(税抜) ➔ 결제 시 ¥${withTax.toLocaleString()} (약 ${withTaxKrw.toLocaleString()}원)`;
  } else {
    const withTax = Math.round(num * 1.1);
    taxNote = `세금 별도 시 결제액: ¥${withTax.toLocaleString()} (10% 추가)`;
  }

  return {
    raw: match[0],
    yen: num,
    krwApprox: krw,
    taxNote: taxNote,
    hasTaxIncluded: hasTaxIncluded,
    hasTaxExcluded: hasTaxExcluded
  };
}

// 🔍 텍스트에서 150+ 백과사전 항목 매칭
function findKnowledgeMatches(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const matched = [];

  for (const item of japaneseKnowledgeBase) {
    for (const kw of item.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        if (!matched.some(m => m.title === item.title)) {
          matched.push(item);
        }
        break;
      }
    }
  }
  return matched;
}

// 💡 여행자 꿀팁 & 150+ 백과사전 상세 카드 생성기
function generateTravelExplanation(jaText, koText, lineItems = []) {
  const combinedText = `${jaText || ''} ${koText || ''}`;
  const matched = findKnowledgeMatches(combinedText);

  // 가격이 하나라도 감지된 경우 종합 세금/환율 가이드 박스 생성
  let priceGuidanceHtml = '';
  const allPrices = [];
  if (lineItems && lineItems.length > 0) {
    lineItems.forEach(item => {
      if (item.priceInfo) allPrices.push(item.priceInfo);
    });
  } else {
    const singlePrice = extractPriceInfo(combinedText);
    if (singlePrice) allPrices.push(singlePrice);
  }

  if (allPrices.length > 0) {
    priceGuidanceHtml = `
      <div style="background: #FEF3C7; border: 1.5px solid #FCD34D; border-radius: 12px; padding: 10px 12px; margin-bottom: 12px;">
        <div style="font-weight: 800; color: #92400E; font-size: 13px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
          <span>💴</span> <span>엔화 결제 & 소비세(10%) 계산 꿀팁</span>
        </div>
        <div style="font-size: 11.5px; color: #78350F; line-height: 1.55;">
          • <strong>환율 안내</strong>: 현재 대략 <strong>100엔 ≒ 약 910원</strong> (엔화 가격에 <strong>×9.1</strong> 하시면 대략적인 원화 금액이 나옵니다).<br>
          • <strong>세금 주의</strong>: <strong>[税抜 (제이누키 / 세금 별도)]</strong> 표기 시 계산서에는 적힌 금액에 <strong>10% 소비세가 가산</strong>됩니다. <strong>[税込 (제이코미)]</strong> 표기된 곳은 적힌 가격 그대로 내시면 됩니다.<br>
          • <strong>현금 확인</strong>: 노포 라멘집이나 이자카야는 <strong>[現金のみ (현금만 가능)]</strong>인 경우가 많으니 엔화 현금을 미리 준비하세요!
        </div>
      </div>
    `;
  }

  if (matched.length > 0) {
    let html = priceGuidanceHtml;
    html += '<div style="display: flex; flex-direction: column; gap: 10px;">';
    matched.forEach(item => {
      const escapedTitle = escapeHtml(item.title);
      const escapedPron = escapeHtml(item.pron || '');
      const escapedDesc = escapeHtml(item.desc);
      const escapedTip = escapeHtml(item.tip || '');
      const orderTarget = item.keywords[0] || item.title.split(' ')[0];
      const jsOrderTarget = escapeHtml(orderTarget).replace(/'/g, "\\'");

      html += `
        <div style="background: #FFFFFF; border: 1.5px solid #FDE68A; border-radius: 12px; padding: 12px; box-shadow: 0 2px 6px rgba(245,158,11,0.08);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
            <div>
              <div style="font-size: 14.5px; font-weight: 800; color: #92400E;">
                📌 ${escapedTitle}
              </div>
              ${escapedPron ? `<div style="font-size: 12px; font-weight: 700; color: #DC2626; margin-top: 2px;">🗣️ [한글 발음] ${escapedPron}</div>` : ''}
            </div>
          </div>
          <div style="font-size: 12.5px; color: #334155; line-height: 1.55; margin-bottom: 6px;">
            ${escapedDesc}
          </div>
          ${escapedTip ? `
            <div style="background: #FFFBEB; border-radius: 8px; padding: 6px 10px; font-size: 11.5px; color: #B45309; line-height: 1.5; margin-bottom: 8px;">
              💡 <strong>주문/먹는 꿀팁:</strong> ${escapedTip}
            </div>
          ` : ''}
          <div style="display: flex; gap: 6px;">
            <button type="button" onclick="window.speakPhotoItem('${jsOrderTarget}')" class="photo-btn-mini">
              <span>🔊</span> <span>발음 듣기</span>
            </button>
            <button type="button" onclick="window.speakPhotoOrder('${jsOrderTarget}')" class="photo-btn-mini order-btn">
              <span>🗣️</span> <span>"이거 주세요" 낭독</span>
            </button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  }

  return priceGuidanceHtml + `
    <div style="font-size: 12px; color: #78350F; line-height: 1.6;">
      💡 <strong>여행자 맞춤 안내</strong>: 위 텍스트는 사진에서 감지된 일본어 내용입니다.<br>
      • 식당 주문 시 <strong>[🗣️ "이거 주세요" 낭독]</strong>을 누르시면 일본 점원에게 정확한 발음으로 주문 소리가 나옵니다.<br>
      • 더 궁금한 특정 단어(예: 替玉, お通し, 税込, 豚骨, 生ビール 등)는 아래의 <strong>단어 칩</strong>이나 <strong>직접 입력창</strong>을 이용해 보세요!
    </div>
  `;
}

// ==========================================
// 📸 둘만의 오사카 여행 사진 & 동영상 추억 앨범 (IndexedDB 영구 저장소)
// ==========================================
const ALBUM_DB_NAME = 'osaka_travel_db';
const ALBUM_DB_VERSION = 1;
const ALBUM_STORE_NAME = 'media';

let albumDBPromise = null;

// IndexedDB 초기화 및 연결 보장
function getAlbumDB() {
  if (!albumDBPromise) {
    albumDBPromise = new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(ALBUM_DB_NAME, ALBUM_DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(ALBUM_STORE_NAME)) {
            const store = db.createObjectStore(ALBUM_STORE_NAME, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.error('[IndexedDB] 미디어 저장소 열기 실패:', req.error);
          reject(req.error);
        };
      } catch (err) {
        console.error('[IndexedDB] 예외 발생:', err);
        reject(err);
      }
    });
  }
  return albumDBPromise;
}

// 미디어 아이템 저장
async function saveAlbumMedia(mediaItem) {
  const db = await getAlbumDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ALBUM_STORE_NAME, 'readwrite');
    const store = tx.objectStore(ALBUM_STORE_NAME);
    const req = store.put(mediaItem);
    req.onsuccess = () => resolve(mediaItem);
    req.onerror = () => reject(req.error);
  });
}

// 전체 미디어 아이템 조회 (최신 등록순 내림차순 정렬)
async function getAllAlbumMedia() {
  const db = await getAlbumDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ALBUM_STORE_NAME, 'readonly');
    const store = tx.objectStore(ALBUM_STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const list = req.result || [];
      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

// 개별 미디어 삭제
async function deleteAlbumMedia(id) {
  const db = await getAlbumDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ALBUM_STORE_NAME, 'readwrite');
    const store = tx.objectStore(ALBUM_STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

// 날짜 시각 표시 포맷 (예: 09/21 16:30)
function formatAlbumDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${m}/${day} ${h}:${min}`;
}

// 모바일 최적화 이미지 다운스케일 & 압축 (가로/세로 최대 1280px, JPEG 82% 퀄리티)
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1280;
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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve(dataUrl);
        } catch (canvasErr) {
          // 캔버스 압축 실패 시 FileReader 결과 그대로 사용
          resolve(e.target.result);
        }
      };
      img.onerror = () => reject(new Error('이미지 디코딩 실패'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsDataURL(file);
  });
}

// 둘만의 여행 앨범 피드 렌더링 & URL 생명주기 관리
let createdObjectUrls = [];
function revokeAlbumUrls() {
  createdObjectUrls.forEach(u => {
    try { URL.revokeObjectURL(u); } catch(e) {}
  });
  createdObjectUrls = [];
}

async function renderAlbumFeed() {
  const feed = document.getElementById('travel-album-feed');
  const countBadge = document.getElementById('album-count-badge');
  if (!feed) return;

  try {
    revokeAlbumUrls();
    const list = await getAllAlbumMedia();

    if (countBadge) {
      countBadge.innerText = `${list.length}장`;
    }

    if (!list || list.length === 0) {
      feed.innerHTML = `
        <div class="album-empty-state">
          <span class="album-empty-icon">🌸</span>
          <div class="album-empty-title">둘만의 소중한 오사카 여행 순간을 여기에 모두 담아보세요!</div>
          <div class="album-empty-sub">
            여행 중 카메라/갤러리 앱을 따로 찾을 필요 없이,<br>
            위의 <strong>[사진 촬영]</strong>이나 <strong>[동영상 촬영]</strong>을 누르면<br>
            둘만의 추억이 여기에 타임라인으로 예쁘게 보관됩니다 ✨
          </div>
        </div>
      `;
      return;
    }

    feed.innerHTML = '';

    list.forEach(item => {
      const card = document.createElement('div');
      card.className = 'album-item-card';

      let mediaHtml = '';
      if (item.type === 'video') {
        let videoSrc = '';
        if (typeof item.data === 'string') {
          videoSrc = item.data;
        } else if (item.data instanceof Blob) {
          videoSrc = URL.createObjectURL(item.data);
          createdObjectUrls.push(videoSrc);
        }
        mediaHtml = `
          <video src="${videoSrc}" class="album-item-media" preload="metadata" muted playsinline></video>
          <div class="album-video-badge"><span>🎥</span><span>동영상</span></div>
          <div class="album-play-icon">
            <div class="album-play-triangle"></div>
          </div>
        `;
      } else {
        const imgSrc = typeof item.data === 'string' ? item.data : '';
        mediaHtml = `
          <img src="${imgSrc}" class="album-item-media" alt="여행 사진" loading="lazy">
        `;
      }

      const dateStr = formatAlbumDate(item.timestamp);

      card.innerHTML = `
        ${mediaHtml}
        <div class="album-item-overlay">
          <span class="album-item-date">${dateStr}</span>
          <button type="button" class="album-delete-btn" title="이 추억 삭제">🗑️</button>
        </div>
      `;

      // 카드 터치 시 전체화면 확대 뷰어
      card.addEventListener('click', () => {
        openMediaViewer(item);
      });

      // 개별 삭제 버튼 이벤트
      const delBtn = card.querySelector('.album-delete-btn');
      if (delBtn) {
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm('이 여행 추억을 삭제할까요?')) {
            await deleteAlbumMedia(item.id);
            showToast('🗑️ 추억이 삭제되었습니다.');
            renderAlbumFeed();
          }
        });
      }

      feed.appendChild(card);
    });

  } catch (err) {
    console.error('renderAlbumFeed error:', err);
    feed.innerHTML = '<div style="grid-column:1/-1; padding:20px; text-align:center; color:#EF4444; font-size:12px;">앨범을 불러오는 중 오류가 발생했습니다.</div>';
  }
}

// 전체화면 미디어 뷰어
let activeViewerItem = null;
function openMediaViewer(item) {
  const modal = document.getElementById('media-viewer-modal');
  const body = document.getElementById('media-viewer-body');
  const title = document.getElementById('media-viewer-title');
  const time = document.getElementById('media-viewer-time');
  if (!modal || !body) return;

  activeViewerItem = item;
  body.innerHTML = '';

  if (title) {
    title.innerText = item.type === 'video' ? '🎥 여행 동영상' : '📸 여행 사진';
  }
  if (time) {
    time.innerText = formatAlbumDate(item.timestamp);
  }

  if (item.type === 'video') {
    let videoSrc = '';
    if (typeof item.data === 'string') {
      videoSrc = item.data;
    } else if (item.data instanceof Blob) {
      videoSrc = URL.createObjectURL(item.data);
      createdObjectUrls.push(videoSrc);
    }
    const video = document.createElement('video');
    video.src = videoSrc;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    body.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src = item.data;
    img.alt = '여행 사진 확대';
    body.appendChild(img);
  }

  modal.classList.add('active');
}

function closeMediaViewer() {
  const modal = document.getElementById('media-viewer-modal');
  const body = document.getElementById('media-viewer-body');
  if (!modal) return;
  if (body) {
    const video = body.querySelector('video');
    if (video) {
      video.pause();
      video.src = '';
    }
    body.innerHTML = '';
  }
  modal.classList.remove('active');
  activeViewerItem = null;
}

// 촬영 및 갤러리 미디어 업로드 처리 파이프라인
async function handleMediaUpload(files, forcedType) {
  if (!files || files.length === 0) return;

  const progressBox = document.getElementById('album-progress-box');
  const progressText = document.getElementById('album-progress-text');
  const progressFill = document.getElementById('album-progress-fill');
  const progressPercent = document.getElementById('album-progress-percent');

  if (progressBox) progressBox.style.display = 'block';

  const total = files.length;
  let successCount = 0;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const pct = Math.round(((i + 1) / total) * 100);
    if (progressText) progressText.innerText = `추억 저장 중... (${i + 1}/${total}) ⏳`;
    if (progressPercent) progressPercent.innerText = `${pct}%`;
    if (progressFill) progressFill.style.width = `${pct}%`;

    try {
      const isVideo = forcedType === 'video' || (file.type && file.type.startsWith('video/'));
      const id = 'media_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

      if (isVideo) {
        // 비디오: Blob으로 IndexedDB에 영구 보존
        const item = {
          id: id,
          type: 'video',
          data: file, // File은 Blob 상속
          name: file.name || '동영상',
          timestamp: Date.now()
        };
        await saveAlbumMedia(item);
        successCount++;
      } else {
        // 사진: 캔버스 압축 후 DataURL로 IndexedDB에 저장
        const dataUrl = await compressImage(file);
        const item = {
          id: id,
          type: 'image',
          data: dataUrl,
          name: file.name || '사진',
          timestamp: Date.now()
        };
        await saveAlbumMedia(item);
        successCount++;
      }
    } catch(err) {
      console.error('File save error:', err);
    }
  }

  if (progressBox) progressBox.style.display = 'none';

  if (successCount > 0) {
    showToast(`🎉 ${successCount}개의 소중한 추억이 앨범에 저장되었습니다!`);
    await renderAlbumFeed();
  } else {
    showToast('⚠️ 파일 저장에 실패했습니다. 다시 시도해 주세요.');
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
  if (voiceNowBtn) voiceNowBtn.addEventListener('click', () => stopVoiceTurn(true));

  const voiceRespeakBtn = document.getElementById('voice-respeak-btn');
  if (voiceRespeakBtn) {
    voiceRespeakBtn.addEventListener('click', () => {
      if (lastTranslatedText) {
        unlockAudio();
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

  // 📋 번역 결과 클립보드 복사 버튼
  const voiceCopyBtn = document.getElementById('voice-copy-btn');
  if (voiceCopyBtn) {
    voiceCopyBtn.addEventListener('click', () => {
      if (lastTranslatedText) {
        const textToCopy = lastTranslatedText;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(textToCopy).then(() => {
            showToast('📋 번역 텍스트가 복사되었습니다!');
          }).catch(() => {
            copyTextFallback(textToCopy);
          });
        } else {
          copyTextFallback(textToCopy);
        }
      } else {
        showToast('복사할 번역 결과가 없습니다.');
      }
    });
  }

  function copyTextFallback(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('📋 번역 텍스트가 복사되었습니다!');
    } catch (e) {
      showToast('복사에 실패했습니다.');
    }
  }

  // ✏️ 말하기 대신 글자 직접 입력 & 번역기 (#voice-direct-input, #voice-direct-trans-btn)
  const voiceDirectInput = document.getElementById('voice-direct-input') || document.getElementById('voice-manual-input');
  const voiceDirectTransBtn = document.getElementById('voice-direct-trans-btn') || document.getElementById('voice-manual-btn');

  function executeDirectTranslate() {
    const inputEl = document.getElementById('voice-direct-input') || document.getElementById('voice-manual-input');
    const val = inputEl ? inputEl.value.trim() : '';
    if (val) {
      unlockAudio();
      // 글자 입력은 한국어 ➔ 일본어로 즉시 번역
      triggerVoiceTranslate(val, 'ko');
      if (inputEl) inputEl.value = '';
    } else {
      showToast('✏️ 번역할 단어나 문장을 입력해 주세요. (예: 얼마예요)');
    }
  }

  if (voiceDirectTransBtn) {
    voiceDirectTransBtn.addEventListener('click', executeDirectTranslate);
  }
  const voiceManualBtnLegacy = document.getElementById('voice-manual-btn');
  if (voiceManualBtnLegacy && voiceManualBtnLegacy !== voiceDirectTransBtn) {
    voiceManualBtnLegacy.addEventListener('click', executeDirectTranslate);
  }

  const attachDirectEnterListener = (el) => {
    if (!el) return;
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeDirectTranslate();
      }
    });
  };
  attachDirectEnterListener(document.getElementById('voice-direct-input'));
  attachDirectEnterListener(document.getElementById('voice-manual-input'));

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

  // 📸 둘만의 여행 앨범 사진 & 동영상 이벤트 바인딩
  const albumTakePhotoBtn = document.getElementById('album-take-photo-btn');
  const albumCameraInput = document.getElementById('album-camera-input');
  if (albumTakePhotoBtn && albumCameraInput) {
    albumTakePhotoBtn.addEventListener('click', () => {
      unlockAudio();
      albumCameraInput.click();
    });
    albumCameraInput.addEventListener('change', function(e) {
      if (e.target.files && e.target.files.length > 0) {
        handleMediaUpload(e.target.files, 'image');
      }
      this.value = '';
    });
  }

  const albumTakeVideoBtn = document.getElementById('album-take-video-btn');
  const albumVideoInput = document.getElementById('album-video-input');
  if (albumTakeVideoBtn && albumVideoInput) {
    albumTakeVideoBtn.addEventListener('click', () => {
      unlockAudio();
      albumVideoInput.click();
    });
    albumVideoInput.addEventListener('change', function(e) {
      if (e.target.files && e.target.files.length > 0) {
        handleMediaUpload(e.target.files, 'video');
      }
      this.value = '';
    });
  }

  const albumPickGalleryBtn = document.getElementById('album-pick-gallery-btn');
  const albumGalleryInput = document.getElementById('album-gallery-input');
  if (albumPickGalleryBtn && albumGalleryInput) {
    albumPickGalleryBtn.addEventListener('click', () => {
      unlockAudio();
      albumGalleryInput.click();
    });
    albumGalleryInput.addEventListener('change', function(e) {
      if (e.target.files && e.target.files.length > 0) {
        handleMediaUpload(e.target.files);
      }
      this.value = '';
    });
  }

  // 8. 미디어 뷰어 모달 닫기 & 삭제 이벤트 바인딩
  const viewerCloseBtn = document.getElementById('media-viewer-close-btn');
  const viewerBackdrop = document.getElementById('media-viewer-backdrop');
  const viewerDeleteBtn = document.getElementById('media-viewer-delete-btn');

  if (viewerCloseBtn) viewerCloseBtn.addEventListener('click', closeMediaViewer);
  if (viewerBackdrop) viewerBackdrop.addEventListener('click', closeMediaViewer);

  if (viewerDeleteBtn) {
    viewerDeleteBtn.addEventListener('click', async () => {
      if (activeViewerItem) {
        if (confirm('이 여행 추억을 삭제할까요?')) {
          await deleteAlbumMedia(activeViewerItem.id);
          closeMediaViewer();
          showToast('🗑️ 추억이 삭제되었습니다.');
          renderAlbumFeed();
        }
      }
    });
  }

  // ==========================================================================
  // 🗺️ 구글 지도(Google Maps) 실시간 길찾기 딥링크 / 웹 연동 엔진 (v9.8)
  // ==========================================================================
  function openGoogleMapsLive() {
    showToast('🗺️ 구글 지도 길찾기를 실행합니다...');

    const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';
    const isAndroid = /Android/i.test(userAgent);
    const isIOS = (/iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && !window.MSStream;

    if (isAndroid) {
      // 안드로이드: 구글 지도 공식 앱 인텐트 실행 (미설치 시 웹 브라우저 fallback)
      const intentUrl = 'intent://maps.google.com/maps?hl=ko#Intent;scheme=https;package=com.google.android.apps.maps;S.browser_fallback_url=https%3A%2F%2Fwww.google.com%2Fmaps%3Fhl%3Dko;end';
      try {
        window.location.href = intentUrl;
      } catch (err) {
        window.location.href = 'https://www.google.com/maps?hl=ko';
      }
      return;
    }

    if (isIOS) {
      // iOS: comgooglemaps 커스텀 URL 스킴 호출 후 미설치 시 웹 fallback
      const gmapsScheme = 'comgooglemaps://?directionsmode=transit';
      const fallbackWebUrl = 'https://www.google.com/maps?hl=ko';
      const startTime = Date.now();
      window.location.href = gmapsScheme;
      setTimeout(() => {
        if (Date.now() - startTime < 2000) {
          window.location.href = fallbackWebUrl;
        }
      }, 1200);
      return;
    }

    // PC 및 일반 브라우저: 구글 지도 공식 사이트(한국어) 새 창 열기
    window.open('https://www.google.com/maps?hl=ko', '_blank', 'noopener,noreferrer');
  }

  // 🗺️ 구글 지도(Google Maps) 실시간 길찾기 큼직한 네모 카드 버튼 이벤트
  const quickMapBtn = document.getElementById('quick-nav-map-btn');
  if (quickMapBtn) {
    quickMapBtn.addEventListener('click', (e) => {
      e.preventDefault();
      unlockAudio();
      openGoogleMapsLive();
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

  // 상단 파파고 카메라 원클릭 바로가기 버튼 이벤트 (아이폰/안드로이드 대응)
  const photoPapagoLaunchBtn = document.getElementById('photo-papago-launch-btn');
  if (photoPapagoLaunchBtn) {
    photoPapagoLaunchBtn.addEventListener('click', handlePapagoAppLaunch);
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

// ==========================================================================
// 🏛️ 오사카 역사 & 문화 AI 가이드 (글과 말로 질문 가능) 엔진 (v10.0)
// ==========================================================================

const cultureKnowledgeBase = [
  {
    id: 'osaka-castle',
    title: '🏯 도요토미 히데요시와 오사카성의 유구한 역사',
    keywords: ['오사카성', '천수각', '도요토미', '히데요시', '오사카조', '성채', '여름의진', '겨울의진', '성', '축조'],
    html: `오사카성은 1583년 일본 전국시대를 통일한 <strong>도요토미 히데요시</strong>가 자신의 절대 권력을 과시하고 천하 통일의 본거지로 삼기 위해 축조한 난공불락의 대성채입니다.<br><br>
이후 1614~1615년 오사카 겨울·여름 전투에서 도쿠가와 이에야스 군대에 의해 함락되어 소실되었고, 에도 막부에 의해 재건되었으나 벼락 화재 등으로 천수각이 다시 불타는 비운을 겪었습니다.<br><br>
지금 우리가 보는 황금빛 장식의 웅장한 천수각은 <strong>1931년 오사카 시민들의 자발적인 성금 모금</strong>으로 철근 콘크리트로 재건된 것으로, 내부에는 엘리베이터와 박물관이 현대적으로 갖춰져 있으며 8층 전망대에서는 오사카 시내 전경을 360도로 한눈에 조망할 수 있습니다!`,
    speechText: '오사카성은 1583년 일본 전국시대를 통일한 도요토미 히데요시가 권력을 과시하고 본거지로 삼기 위해 축조한 대성채입니다. 이후 전쟁과 벼락으로 불타는 아픔을 겪었으나, 1931년 오사카 시민들의 자발적인 성금으로 웅장하게 재건되었습니다. 8층 전망대에서는 오사카 시내를 한눈에 내려다볼 수 있습니다.'
  },
  {
    id: 'shrine-etiquette',
    title: '⛩️ 신사(神社) 참배 예절: 2례 2박수 1례의 법칙',
    keywords: ['신사', '참배', '예절', '2례', '박수', '절', '토리이', '인사', '5엔', '소원'],
    html: `일본 신사(진자)를 방문할 때 현지인처럼 정중하게 참배하는 핵심 규칙입니다.<br><br>
1. <strong>토리이(붉은 문) 통과:</strong> 토리이 문은 신의 영역으로 들어가는 입구입니다. 통과하기 전 가볍게 목례를 하고, 가운데 길은 '신의 통로'이므로 좌우 가장자리로 걷는 것이 예의입니다.<br>
2. <strong>동전 넣기 (새전함):</strong> 보통 <strong>5엔(五円) 동전</strong>을 많이 넣습니다. 5엔은 일본어로 '고엔'이라 읽는데, '좋은 인연(ご縁, 고엔)'과 발음이 같아 신과 좋은 인연을 맺는다는 뜻이 담겨 있습니다.<br>
3. <strong>2례 2박수 1례 (二礼二拍手一礼):</strong><br>
   - 새전함 위의 방울 줄을 흔들어 소리를 냅니다.<br>
   - 허리를 90도로 <strong>두 번 정중히 숙여 절(2례)</strong>합니다.<br>
   - 가슴 높이에서 손뼉을 <strong>두 번 '탁! 탁!' 칩니다(2박수)</strong>.<br>
   - 두 손을 모아 마음속으로 간절히 소원을 빕니다.<br>
   - 마지막으로 허리를 다시 <strong>한 번 깊이 숙여 절(1례)</strong>하고 물러납니다.`,
    speechText: '일본 신사 참배의 기본은 2례 2박수 1례입니다. 토리이 문을 통과할 때는 가운데 대신 가장자리로 걷고, 새전함에는 좋은 인연을 뜻하는 5엔 동전을 넣습니다. 종을 울린 후 두 번 절하고, 두 번 박수를 친 뒤 소원을 빌고, 마지막으로 한 번 절을 하시면 됩니다.'
  },
  {
    id: 'temizuya-washing',
    title: '💧 테미즈야(手水舎): 참배 전 손과 입을 정화하는 법',
    keywords: ['손 씻', '손씻기', '테미즈야', '물', '정화', '약수터', '국자', '입 헹구기'],
    html: `신사나 절 입구에 물이 졸졸 흐르는 정화 공간을 <strong>테미즈야(手水舎)</strong>라고 합니다. 마시는 약수가 아니라 신을 만나기 전 몸과 마음을 정갈히 씻는 의식입니다.<br><br>
<strong>올바른 손 씻기 4단계 (국자 1번의 물로 끝내기):</strong><br>
1. 오른손으로 국자를 들어 물을 가득 뜬 후, <strong>왼손</strong>을 씻습니다.<br>
2. 국자를 왼손으로 바꿔 쥐고 <strong>오른손</strong>을 씻습니다.<br>
3. 다시 오른손으로 국자를 잡고, <strong>왼손 손바닥에 물을 받아 입을 헹굽니다.</strong> (⚠️ 절대 국자에 직접 입을 대면 안 됩니다!)<br>
4. 남은 물이 국자 손잡이를 타고 아래로 흘러내리도록 국자를 수직으로 세워 손잡이를 씻은 뒤 제자리에 엎어둡니다.`,
    speechText: '신사 입구의 테미즈야는 마시는 물이 아니라 몸과 마음을 정화하는 곳입니다. 국자로 물을 떠서 왼손, 오른손 순서로 씻고, 손바닥에 물을 받아 입을 가볍게 헹굽니다. 국자에 직접 입을 대지 않는 것이 가장 중요한 에티켓입니다.'
  },
  {
    id: 'glico-man-origin',
    title: '🏃 도톤보리 글리코상의 100년 역사와 만세 포즈의 비밀',
    keywords: ['글리코', '글리코상', '도톤보리', '마라톤', '에비스', '만세', '포즈', '캐러멜'],
    html: `오사카 도톤보리 에비스 다리에서 누구나 만세 포즈로 사진을 찍는 <strong>글리코 러너(Glico Sign)</strong>는 1935년에 처음 세워졌습니다.<br><br>
<strong>왜 마라톤 골인 포즈일까요?</strong><br>
식품회사 에자키 글리코의 창업자 에자키 리이치는 굴에 풍부한 영양소인 '글리코겐'을 넣은 건강 캐러멜을 만들었습니다. 이 캐러멜 한 알의 열량이 15.3칼로리였는데, 이는 <strong>"키 165cm, 체중 55kg의 사람이 300미터를 달릴 때 소모하는 에너지"</strong>와 정확히 일치했습니다!<br><br>
그래서 <em>"한 알에 300미터!"</em>라는 건강과 활력의 상징으로 결승선을 통과하는 마라톤 선수의 힘찬 모습을 간판으로 제작한 것입니다. 현재의 간판은 2014년에 교체된 <strong>제6대 LED 전광판</strong>으로, 밤이 되면 14만 개의 LED가 켜지며 배경이 오사카 명소로 시시각각 바뀝니다.`,
    speechText: '도톤보리 글리코상은 1935년에 처음 설치된 활력의 상징입니다. 글리코 캐러멜 한 알의 열량이 300미터를 달리는 에너지와 같다는 점에서 착안하여 마라톤 결승선을 통과하는 힘찬 만세 포즈를 취하게 되었습니다. 현재는 6대째 LED 간판으로 밤마다 아름답게 빛납니다.'
  },
  {
    id: 'otoshi-culture',
    title: '🍢 이자카야 오토시(お通し, 자릿세) 문화의 이해',
    keywords: ['오토시', '자릿세', '기본안주', '이자카야', '영수증', '테이블차지', '술집'],
    html: `일본 이자카야(선술집)에 가면 시키지도 않은 작은 안주(절임류, 완두콩, 조림 등)가 인원수대로 나오고, 영수증에 300~500엔가량이 청구되어 당황하는 여행객이 많습니다. 이를 <strong>오토시(お通し)</strong>라고 부릅니다.<br><br>
<strong>오토시 문화가 생긴 이유:</strong><br>
1. <strong>손님을 환영하는 자리비(Table Charge):</strong> 술과 본 안주가 나오기 전까지 손님이 입가심하며 기다릴 수 있도록 배려하는 환영의 의미입니다.<br>
2. <strong>팁이 없는 일본의 서비스 요금:</strong> 일본은 팁(Tip) 문화가 전혀 없습니다. 대신 매장을 이용하는 기본 좌석 요금과 공간 청결 유지비가 오토시에 포함되어 있습니다.<br><br>
💡 <em>팁:</em> 대부분의 이자카야에서 오토시는 식당의 전통 룰이므로 거절하기 어렵지만, 식전에 미리 "오토시와 다이죠부데스(오토시는 괜찮습니다)"라고 정중히 물어보면 제외해 주는 가게도 있습니다.`,
    speechText: '이자카야에서 주문하지 않아도 나오는 기본 안주와 비용을 오토시라고 부릅니다. 이는 팁 문화가 없는 일본에서 자리를 마련하고 환영한다는 의미의 테이블 자릿세 성격입니다. 보통 300엔에서 500엔 선이며 일본 특유의 선술집 문화로 이해하시면 좋습니다.'
  },
  {
    id: 'kushikatsu-rule',
    title: '🍢 쿠시카츠(꼬치튀김) 소스 두 번 찍기 절대 금지 룰!',
    keywords: ['쿠시카츠', '소스', '두번', '신세카이', '금지', '양배추', '튀김', '니도즈케'],
    html: `오사카 신세카이의 명물 꼬치튀김 '쿠시카츠' 가게 벽면에는 어디나 <strong>"소스 두 번 찍기 절대 금지(ソースの二度づけ禁止, 니도즈케 킨시)"</strong>라는 경고문이 붙어 있습니다.<br><br>
<strong>왜 두 번 찍으면 안 될까요?</strong><br>
테이블 위에 놓인 검은 우스터 우마미 소스 통은 나 혼자 쓰는 것이 아니라 <strong>여러 손님이 함께 사용하는 공용 소스 통</strong>이기 때문입니다. 한 입 베어 문 꼬치를 다시 소스 통에 담그는 것은 위생상 심각한 결례입니다.<br><br>
<strong>오사카 현지인의 2가지 꿀팁:</strong><br>
1. 먹기 전에 꼬치 전체를 소스 통에 푹 담가 소스를 듬뿍 묻혀둡니다.<br>
2. 먹다가 소스가 부족하면, 기본으로 제공되는 <strong>생양배추 조각으로 소스를 숟가락처럼 푹 떠서</strong> 꼬치 위에 흘려뿌려 드시면 됩니다!`,
    speechText: '오사카 쿠시카츠의 철칙은 소스 두 번 찍기 절대 금지입니다. 테이블의 소스 통을 여러 손님이 함께 쓰기 때문에 위생을 위한 배려입니다. 소스가 부족할 때는 기본 제공되는 양배추로 소스를 푹 떠서 꼬치 위에 뿌려 드시면 됩니다.'
  },
  {
    id: 'tsutenkaku-billiken',
    title: '🗼 신세카이 츠텐카쿠와 발바닥 긁는 행운의 신 빌리켄',
    keywords: ['츠텐카쿠', '신세카이', '빌리켄', '발바닥', '소원', '타워', '행운'],
    html: `오사카 서민 정취가 물씬 풍기는 신세카이의 랜드마크 <strong>츠텐카쿠(通天閣)</strong>는 "하늘과 통하는 높은 건물"이라는 뜻으로 1912년에 처음 지어졌습니다.<br><br>
<strong>발바닥을 긁으면 행운이 오는 빌리켄(Billiken):</strong><br>
츠텐카쿠 전망대에는 뾰족한 머리와 익살스러운 표정으로 발을 앞으로 쑥 내밀고 있는 황금빛 목각상 <strong>'빌리켄'</strong>이 있습니다.<br>
1908년 미국의 여류 예술가 플로렌스 프레츠가 꿈속에서 본 신의 모습을 본떠 만든 것으로, 전 세계적인 행운의 마스코트가 되었습니다.<br><br>
빌리켄의 <strong>양 발바닥을 두 손으로 정성스럽게 긁어주며 소원을 빌면</strong> 그 소원이 반드시 이루어진다고 전해져 지금도 수많은 여행객들의 손길로 발바닥이 움푹 파여 반질반질 빛나고 있습니다!`,
    speechText: '신세카이의 츠텐카쿠 타워에는 익살스러운 표정의 행운의 신 빌리켄 상이 있습니다. 팔이 짧아 스스로 발을 긁지 못하는 빌리켄의 발바닥을 정성껏 긁어주면 소원이 이루어진다는 재미있는 전설이 있어 여행객들의 필수 코스입니다.'
  },
  {
    id: 'onsen-etiquette',
    title: '♨️ 일본 온천 & 대욕탕 에티켓: 머리 위 수건과 문신 규정',
    keywords: ['온천', '목욕탕', '센토', '수건', '머리', '문신', '타투', '에티켓'],
    html: `일본의 료칸 온천이나 대욕탕을 이용할 때 지켜야 할 전통적인 목욕 에티켓입니다.<br><br>
1. <strong>탕에 들어가기 전 샤워 필수:</strong> 온천수는 모두가 함께 몸을 담그는 깨끗한 물입니다. 들어가기 전 앉아서 샤워기로 몸을 비누칠하여 깨끗이 씻은 후 입수합니다.<br>
2. <strong>수건을 탕에 담그지 않기:</strong> 작은 세면 수건(테누구이)을 탕물에 넣는 것은 물을 오염시킨다고 여겨집니다. <strong>접어서 머리 위에 올려두거나</strong> 탕가에 얹어둡니다.<br>
3. <strong>머리카락 묶기:</strong> 긴 머리는 물에 닿지 않도록 고무줄로 묶어 올려야 합니다.<br>
4. <strong>문신(타투) 규정:</strong> 일본 온천은 전통적으로 야쿠자와의 연관성 때문에 문신이 있는 고객의 입장을 제한하는 곳이 많습니다. 작은 타투는 방수 스티커나 살색 테이프로 가리고 들어가며, 크기가 큰 경우 프라이빗 가족탕(전세탕)을 예약하는 것을 추천합니다.`,
    speechText: '일본 온천에 들어갈 때는 반드시 먼저 샤워를 깨끗이 하고 들어가야 합니다. 수건은 물에 담그지 않고 머리 위에 올려두며, 탕 안에서 수영을 하거나 물을 튀기지 않습니다. 문신이 있는 경우 살색 테이프로 가리거나 전세탕을 이용하는 것이 좋습니다.'
  },
  {
    id: 'osaka-vs-tokyo',
    title: '🚄 오사카(간사이)와 도쿄(간토)의 재미있는 문화 차이',
    keywords: ['도쿄', '간사이', '간토', '차이', '에스컬레이터', '우동', '국물', '성격'],
    html: `오사카와 도쿄는 역사와 기질이 달라 여러 방면에서 정반대의 문화를 보여줍니다.<br><br>
1. <strong>에스컬레이터 서는 위치:</strong><br>
   - <strong>오사카(간사이): 오른쪽</strong>에 서고, 왼쪽을 급한 사람을 위해 비워둡니다. (1970년 오사카 만국박람회 당시 세계 기준을 따르며 정착)<br>
   - <strong>도쿄(간토): 왼쪽</strong>에 서고, 오른쪽을 비워둡니다. (과거 칼을 찬 사무라이들이 부딪히지 않기 위해 좌측통행하던 풍습)<br><br>
2. <strong>우동 국물(다시):</strong><br>
   - 오사카: <strong>다시마(콘부) 베이스</strong>로 맑고 투명하며 은은한 감칠맛.<br>
   - 도쿄: <strong>가쓰오부시와 진간장 베이스</strong>로 진하고 어두운 색감.<br><br>
3. <strong>사람들의 기질:</strong> 도쿄는 조용하고 정중하며 개인적인 분위기인 반면, 오사카는 상인의 도시답게 정이 많고 농담을 좋아하며 처음 보는 사람과도 금방 친구가 되는 활기찬 매력이 있습니다.`,
    speechText: '오사카와 도쿄는 문화가 매우 다릅니다. 에스컬레이터를 탈 때 오사카는 오른쪽에 서고, 도쿄는 왼쪽에 섭니다. 우동 국물도 오사카는 다시마를 우려낸 맑은 국물인 반면 도쿄는 진한 간장 국물입니다. 오사카 특유의 활기차고 정 많은 상인 기질도 큰 매력입니다.'
  },
  {
    id: 'convenience-store-manner',
    title: '🏪 일본 편의점 & 계산대 매너: 돈 트레이와 봉투',
    keywords: ['편의점', '계산', '트레이', '봉투', '돈', '동전', '로손', '세븐일레븐'],
    html: `일본 편의점(로손, 세븐일레븐, 패밀리마트)과 상점에서 결제할 때 알아두면 좋은 매너입니다.<br><br>
1. <strong>돈과 카드는 계산 트레이(카센)에 놓기:</strong> 점원의 손에 직접 현금이나 카드를 건네지 않고, 계산대 위 작은 사각 트레이에 올려놓습니다. 이는 잔돈을 명확히 확인하고 상대방과의 불필요한 신체 접촉을 피하는 정중한 배려입니다. 점원도 거스름돈을 줄 때 영수증과 지폐, 동전을 차례대로 트레이나 손바닥에 정성껏 건네줍니다.<br><br>
2. <strong>비닐봉투 유료화:</strong> 일본은 환경 정책으로 비닐봉투가 2~5엔 유료입니다.<br>
   - 봉투가 필요할 때: <em>"후쿠로 오네가이시마스 (봉투 부탁합니다)"</em><br>
   - 봉투가 필요 없을 때: <em>"다이죠부데스 (괜찮습니다)"</em> 또는 <em>"후쿠로와 이리마센 (봉투는 필요 없습니다)"</em>`,
    speechText: '일본 편의점에서는 현금이나 카드를 점원의 손에 직접 주지 않고 계산대 위 파란 트레이에 올려놓는 것이 예절입니다. 비닐봉투는 유료이므로 필요하지 않다면 다이죠부데스라고 말씀하시면 됩니다.'
  },
  {
    id: 'takoyaki-history',
    title: '🐙 타코야키의 유래와 오사카인의 소울푸드 이야기',
    keywords: ['타코야키', '문어', '유래', '아이즈야', '소울푸드', '간식', '밀가루'],
    html: `오사카 하면 가장 먼저 떠오르는 길거리 음식 <strong>타코야키(たこ焼き)</strong>는 1935년 오사카의 포장마차 '아이즈야(会津屋)'의 창업자 엔도 토메키치가 처음 개발했습니다.<br><br>
원래는 쇠고기와 곤약을 넣은 '라디오야키'였는데, 효고현 아카시 지방의 문어 요리(아카시야키)에서 영감을 받아 <strong>간장 맛 반죽 속에 큼직한 문어 조각</strong>을 넣어 구운 것이 폭발적인 인기를 끌며 전국으로 퍼져나갔습니다.<br><br>
오사카 사람들은 <em>"오사카 집에는 집집마다 타코야키 전용 불판이 하나씩 있다"</em>고 말할 정도로 타코야키에 대한 자부심이 대단하며, 주말마다 온 가족이 모여 타코야키 파티(타코파)를 여는 정겨운 문화가 있습니다.`,
    speechText: '타코야키는 1935년 오사카 아이즈야에서 큼직한 문어를 밀가루 반죽에 넣어 구워낸 것에서 시작되었습니다. 오사카 가정집마다 타코야키 불판이 구비되어 있을 만큼 오사카 사람들의 영혼이 담긴 소울푸드입니다.'
  },
  {
    id: 'okonomiyaki-history',
    title: '🥞 오코노미야키: 내 취향대로 철판에서 구워 먹는 맛',
    keywords: ['오코노미야키', '철판', '야키소바', '양배추', '헤라', '취향'],
    html: `<strong>오코노미야키(お好み焼き)</strong>는 '오코노미(기호, 취향)'와 '야키(구이)'가 결합된 말로, "내가 좋아하는 재료를 마음껏 넣어 철판에 구워 먹는다"는 뜻입니다.<br><br>
제2차 세계대전 직후 식량이 부족하던 시절, 밀가루 반죽에 값싸고 아삭한 양배추를 듬뿍 넣어 배를 채우던 서민 요리에서 출발했습니다.<br><br>
<strong>오사카식과 히로시마식의 차이:</strong><br>
오사카식은 반죽에 양배추, 계란, 삼겹살, 해산물을 <strong>모두 섞어서 두툼하게</strong> 부쳐내며, 전용 작은 뒤집개인 <strong>'헤라(테코)'</strong>로 피자처럼 잘라 뜨거운 철판 위에서 직접 베어 먹는 것이 제맛입니다!`,
    speechText: '오코노미야키는 좋아하는 재료를 취향껏 철판에 구워 먹는다는 뜻입니다. 오사카식은 양배추와 고기, 해산물을 반죽에 함께 섞어 두툼하게 부쳐내며, 전용 뒤집개인 헤라로 직접 잘라 먹는 재미가 일품입니다.'
  },
  {
    id: 'no-tipping-culture',
    title: '🪙 일본에 팁(Tip) 문화가 절대 없는 이유',
    keywords: ['팁', '봉사료', '잔돈', '택시', '호텔', '서비스', '식당'],
    html: `미국이나 서구권과 달리 일본에는 <strong>팁 문화가 아예 존재하지 않습니다.</strong><br><br>
식당, 택시, 호텔, 미용실 등 어떤 곳에서도 음식값이나 요금 외에 추가로 돈을 얹어줄 필요가 없습니다. 일본에서는 손님에게 최상의 서비스를 제공하는 것이 직원의 당연한 도리(오모테나시)로 여겨지며, 서비스 비용은 이미 청구된 가격에 정직하게 포함되어 있기 때문입니다.<br><br>
⚠️ <em>주의:</em> 테이블 위에 호의로 잔돈이나 지폐를 두고 나가면, 점원이 <strong>"손님, 잊고 가신 돈이 있습니다!"</strong>라며 길거리까지 헐레벌떡 뛰어나와 돌려주는 진풍경을 겪게 됩니다. 고마운 마음은 돈 대신 "고치소사마데시타(잘 먹었습니다)"라는 따뜻한 인사말로 전하세요!`,
    speechText: '일본에는 팁 문화가 전혀 없습니다. 최상의 서비스를 제공하는 것이 당연한 직업 윤리로 여겨지기 때문입니다. 테이블 위에 돈을 두고 나가면 깜빡 잊은 줄 알고 쫓아와 돌려주므로, 잘 먹었다는 따뜻한 말 한마디로 감사를 표현해 주세요.'
  },
  {
    id: 'umeda-sky-building',
    title: '🏙️ 우메다 스카이빌딩 공중정원의 건축적 비밀',
    keywords: ['우메다', '스카이빌딩', '공중정원', '전망대', '야경', '건축', '루미스카이'],
    html: `지상 173m 높이에서 오사카를 내려다보는 <strong>우메다 스카이빌딩</strong>은 세계적인 건축가 하라 히로시가 설계하여 1993년에 완공된 현대 건축의 걸작입니다.<br><br>
영국의 권위 있는 건축 전문지 타임스가 아테네 파르테논 신전, 로마 콜로세움 등과 함께 <strong>'세계 20대 건축물'</strong> 중 하나로 선정한 바 있습니다.<br><br>
<strong>건축의 비밀:</strong><br>
두 개의 초고층 빌딩을 먼저 지은 뒤, 지상에서 미리 완성한 거대한 도넛 모양의 옥상 공중정원을 와이어 크레인으로 들어 올려 꼭대기에 도킹시키는 '리프트업(Lift-up) 공법'으로 지어졌습니다. 밤에는 옥상 바닥에 형광석이 별자리처럼 푸른빛으로 반짝이는 '루미 스카이워크'가 펼쳐져 환상적인 야경을 선사합니다.`,
    speechText: '우메다 스카이빌딩 공중정원은 두 개의 고층 빌딩 상부를 공중에서 도킹하여 연결한 세계적인 명건축물입니다. 360도 야외 옥상 전망대에서는 오사카 야경을 감상할 수 있으며, 밤에는 발밑 바닥이 별자리처럼 빛납니다.'
  },
  {
    id: 'namba-yasaka-shrine',
    title: '🦁 난바 야사카 신사: 액운을 삼키는 거대한 사자머리',
    keywords: ['야사카', '사자머리', '난바', '신사', '포토존', '금전운', '승리'],
    html: `도톤보리에서 도보 10분 거리의 주택가에 자리 잡은 <strong>난바 야사카 신사(難波八阪神社)</strong>는 오사카 여행객들에게 압도적인 포토존으로 유명합니다.<br><br>
신사 마당에 들어서면 높이 12미터, 폭 11미터, 깊이 10미터에 달하는 <strong>거대한 황금 눈의 사자머리 무대(시시덴)</strong>가 입을 쩍 벌리고 서 있습니다.<br><br>
사자가 벌린 거대한 입은 <strong>주변의 모든 사악한 액운과 귀신을 한 번에 집어삼키고, 그 대신 승리와 성공, 금전운(재물복)을 불러온다</strong>는 영험한 믿음이 깃들어 있어 시험 합격이나 사업 번창을 기원하는 참배객들의 발길이 끊이지 않습니다.`,
    speechText: '난바 야사카 신사는 12미터 높이의 거대한 사자머리 사당으로 유명합니다. 쩍 벌린 사자의 입이 모든 나쁜 액운을 집어삼키고 승리와 재물운을 가져다준다고 하여 사진 명소이자 소원 성취 명소로 큰 사랑을 받고 있습니다.'
  },
  {
    id: 'shitennouji-temple',
    title: '📿 시텐노지(사천왕사): 1400년 역사의 일본 최초 관립 사찰',
    keywords: ['시텐노지', '사천왕사', '쇼토쿠', '사찰', '절', '불교', '5층탑'],
    html: `오사카 텐노지 구에 위치한 <strong>시텐노지(四天王寺)</strong>는 서기 593년, 일본 역사상 가장 존경받는 위인 중 한 명인 <strong>쇼토쿠 태자</strong>가 창건한 일본 최초의 국립(관립) 불교 사찰입니다.<br><br>
사천왕을 모셔 국가의 평안과 백성의 안녕을 기원하며 세워졌습니다. 1400여 년 동안 수많은 전쟁과 태풍, 공습으로 소실과 재건을 반복했으나, 남대문·중문·5층 목탑·금당·강당이 남북으로 일직선상에 늘어서는 <strong>초기 아스카 시대의 고대 가람 배치 양식</strong>을 완벽하게 계승하고 있습니다.<br><br>
경내의 거대한 5층 목탑은 계단을 통해 꼭대기까지 직접 걸어 올라가 부처님의 사리를 모신 공간을 친견할 수 있습니다.`,
    speechText: '시텐노지는 서기 593년 쇼토쿠 태자가 창건한 1400년 역사의 일본 최초 관립 사찰입니다. 남북으로 일직선을 이루는 고대 아스카 시대 가람 배치를 간직하고 있으며, 웅장한 5층 목탑을 직접 감상할 수 있습니다.'
  },
  {
    id: 'osaka-tenmangu',
    title: '🏮 오사카 텐만구와 일본 3대 축제 텐진마츠리',
    keywords: ['텐만구', '학문', '스가와라', '텐진마츠리', '마츠리', '축제', '미치자네'],
    html: `오사카 기타구에 위치한 <strong>오사카 텐만구(大阪天満宮)</strong>는 헤이안 시대의 천재 학자이자 정치가였던 <strong>스가와라 no 미치자네(학문의 신)</strong>를 주신으로 모시는 신사입니다. 입시철이면 일본 전역에서 수험생과 학부모들이 합격 부적(오마모리)을 사기 위해 인산인해를 이룹니다.<br><br>
<strong>일본 3대 여름 축제, 텐진마츠리:</strong><br>
매년 7월 24일과 25일에 열리는 텐진마츠리는 1,000년 이상의 역사를 자랑합니다. 3,000명이 넘는 사람들이 화려한 헤이안 시대 복장을 입고 행진하는 육상 행렬과, 해 질 녘 오오카와 강 위에 100여 척의 배가 줄지어 등불을 밝히는 선상 행렬, 밤하늘을 수놓는 5,000여 발의 봉납 불꽃놀이가 어우러지는 오사카 최고의 여름 장관입니다.`,
    speechText: '오사카 텐만구는 학문의 신 스가와라노 미치자네를 모시는 신사로 수험생들의 필수 방문지입니다. 매년 7월 말 열리는 텐진마츠리는 강 위에 수많은 배와 등불, 불꽃놀이가 어우러지는 일본 3대 전통 축제 중 하나입니다.'
  },
  {
    id: 'kansai-dialect',
    title: '🗣️ 정겹고 유쾌한 오사카 사투리(간사이벤) 배우기',
    keywords: ['사투리', '간사이벤', '난데야넹', '오오키니', '혼마', '마이도', '말투'],
    html: `오사카 사람들은 표준어보다 자신들의 고유한 <strong>간사이벤(関西弁, 오사카 사투리)</strong>을 매우 자랑스럽게 여깁니다. 만담(코미디)의 중심지답게 억양이 리드미컬하고 말끝에 정이 넘쳐납니다.<br><br>
<strong>여행 중 써먹는 대표 간사이벤 5가지:</strong><br>
1. <strong>오오키니 (おおきに):</strong> "감사합니다(아리가토)". 상점이나 식당을 나설 때 "오오키니!" 하고 인사하면 사장님이 함박웃음을 짓습니다.<br>
2. <strong>난데야넹 (なんでやねん):</strong> "왜 그래!", "말도 안 돼!" (상대방의 엉뚱한 농담에 딴지를 거는 오사카의 국민 유행어)<br>
3. <strong>혼마? (ほんま?):</strong> "진짜? 정말로?" (표준어 '혼토?')<br>
4. <strong>마이도 (まいど):</strong> "늘 신세 집니다, 안녕하십니까!" (상인들이 손님을 맞이할 때 쓰는 친근한 인사)<br>
5. <strong>마케테 (まけて):</strong> "좀 깎아주세요!" (오사카 상인과의 정겨운 가격 흥정 단어)`,
    speechText: '오사카 사투리 간사이벤은 특유의 리듬감과 유쾌함이 특징입니다. 감사합니다를 뜻하는 오오키니, 진짜냐고 묻는 혼마, 농담에 맞받아치는 난데야넹 같은 정겨운 표현을 현지 식당에서 가볍게 써보시면 좋습니다.'
  },
  {
    id: 'kuromon-market',
    title: '🐟 쿠로몬 시장(흑문시장): 200년 전통 오사카의 부엌',
    keywords: ['쿠로몬', '흑문시장', '해산물', '와규', '가리비', '시장', '참치'],
    html: `난바역 동쪽에 위치한 <strong>쿠로몬 시장(黒門市場)</strong>은 에도 시대 후기인 1822년부터 이어져 온 오사카 최대의 전통 재래시장으로, <strong>'오사카의 부엌'</strong>이라는 별명을 갖고 있습니다.<br><br>
<strong>이름의 유래:</strong><br>
시장 근처에 있던 유서 깊은 사찰 '엔묘지'에 거대하고 웅장한 검은 산문(黒門, 쿠로몬)이 있었던 것에서 시장 이름이 유래되었습니다.<br><br>
약 580m 길이의 아케이드 골목에 150여 개의 점포가 줄지어 있으며, 신선한 참치 뱃살(오토로) 초밥, 대왕 가리비 버터구이, 성게알(우니), A5 등급 마블링 와규 꼬치를 눈앞의 철판과 숯불에서 즉석으로 구워 먹을 수 있어 여행객들의 식도락 천국입니다.`,
    speechText: '쿠로몬 시장은 200년 역사를 자랑하는 오사카의 부엌입니다. 인근 사찰의 검은 문에서 이름이 유래되었으며, 신선한 참치와 와규, 해산물 꼬치를 즉석에서 맛볼 수 있는 대표적인 미식 시장입니다.'
  },
  {
    id: 'chopstick-etiquette',
    title: '🥢 일본 젓가락(하시) 사용 시 절대 하지 말아야 할 금기',
    keywords: ['젓가락', '하시', '금기', '식사', '예절', '꽂기', '밥그릇'],
    html: `일본에서는 식사할 때 숟가락보다 젓가락을 주로 사용하므로, 젓가락에 얽힌 독특한 식사 예절과 금기 사항이 엄격합니다.<br><br>
<strong>절대 금지 3가지 (장례 의식을 연상시킴):</strong><br>
1. <strong>하시와타시 (箸渡し):</strong> 젓가락으로 음식을 집어 다른 사람의 젓가락으로 직접 건네받는 행위. (일본 전통 화장터에서 유골을 수습할 때만 행하는 방식이므로 절대 금기)<br>
2. <strong>츠키하시 (突き立て箸):</strong> 밥공기 한가운데에 젓가락을 수직으로 푹 꽂아두는 행위. (망자의 제사상에 올리는 밥을 연상시킴)<br>
3. <strong>네부리하시 (ねぶり箸):</strong> 젓가락 끝에 묻은 소스를 쪽쪽 빨아먹는 행위.<br><br>
💡 <em>바람직한 매너:</em> 국물이 있는 밥그릇이나 국그릇은 한 손으로 들고 입 가까이에 대고 젓가락으로 국물을 마시거나 건더기를 건져 먹는 것이 단정한 예의입니다.`,
    speechText: '일본에서 젓가락으로 음식을 다른 사람 젓가락에 직접 건네거나, 밥 위에 젓가락을 꽂는 것은 장례식을 연상시키므로 절대 금기입니다. 젓가락을 내려놓을 때는 젓가락 받침대를 사용하고, 그릇을 손에 들고 먹는 것이 예절입니다.'
  },
  {
    id: 'transit-etiquette',
    title: '🚇 일본 지하철 & 대중교통 이용 에티켓 3대 수칙',
    keywords: ['지하철', '전철', '매너', '통화', '가방', '백팩', '버스', '매너모드'],
    html: `오사카의 미도스지선 지하철이나 한큐, 난카이 전철을 이용할 때 지켜야 할 매너입니다.<br><br>
1. <strong>전철 내 전화 통화 절대 금지:</strong> 차내에서는 휴대전화를 '매너모드'로 설정하고, 통화는 절대 하지 않는 것이 철칙입니다. 전화가 오면 끊거나 문자로 "지금 전철 안입니다"라고 답합니다.<br>
2. <strong>백팩(가방)은 앞으로 메거나 선반에:</strong> 혼잡한 전철 안에서 등에 멘 커다란 배낭은 뒤사람을 치거나 통행을 방해합니다. 가슴 앞으로 돌려 메거나, 좌석 위 선반에 올리거나, 발밑에 내려놓습니다.<br>
3. <strong>우선석(노약자석) 부근 전원 주의:</strong> 심장 박동기 등 의료기기에 영향을 줄 수 있어 혼잡 시에는 휴대전화 전원을 끄거나 비행기 모드로 전환하도록 안내 방송이 나옵니다.`,
    speechText: '일본 지하철에서는 통화가 엄격히 금지되어 있으므로 휴대전화는 매너모드로 해두셔야 합니다. 혼잡한 차내에서는 백팩을 앞으로 메어 다른 승객을 배려하는 것이 중요한 대중교통 매너입니다.'
  },
  {
    id: 'trash-can-reason',
    title: '🗑️ 일본 길거리에 쓰레기통이 없는 역사적 이유',
    keywords: ['쓰레기통', '쓰레기', '분리수거', '길거리', '사린가스', '자판기', '페트병'],
    html: `일본 여행 중 가장 신기한 점 중 하나는 <strong>"길거리가 너무 깨끗한데 쓰레기통은 도무지 찾을 수 없다"</strong>는 것입니다.<br><br>
<strong>쓰레기통이 사라진 이유:</strong><br>
1. <strong>1995년 도쿄 지하철 사린가스 테러 사건:</strong> 옴진리교 종교 집단이 지하철 쓰레기통에 독가스를 살포한 끔찍한 사건 이후, 공공장소 테러 물질 은닉을 방지하기 위해 전국의 길거리 쓰레기통을 대대적으로 철거했습니다.<br>
2. <strong>자기 쓰레기는 자기가 챙기는 시민의식:</strong> 일본인들은 외출 시 작은 비닐봉지를 챙겨 자신의 쓰레기를 가방에 넣어 집에 가져가 분리수거하는 문화가 정착되었습니다.<br><br>
💡 <em>여행자 꿀팁:</em> 마신 음료 캔이나 페트병은 길거리 곳곳에 있는 <strong>음료 자판기 옆 전용 투입구</strong>에 버리시면 됩니다!`,
    speechText: '일본 길거리에 쓰레기통이 없는 이유는 1995년 도쿄 지하철 사린 테러 이후 안전을 위해 철거했기 때문입니다. 여행 중 발생한 쓰레기는 호텔로 가져가거나, 음료 캔은 자판기 옆 재활용 수거함에 버리시면 됩니다.'
  },
  {
    id: 'coin-wallet-essential',
    title: '👛 일본 여행 시 칸 나뉜 동전 지갑이 필수인 이유',
    keywords: ['동전', '지갑', '소비세', '1엔', '5엔', '100엔', '잔돈', '현금'],
    html: `일본은 신용카드 사용이 늘었지만, 여전히 전통 맛집, 자판기, 신사, 코인 로커 등에서 <strong>현금 동전</strong>이 매우 많이 사용됩니다.<br><br>
<strong>동전이 폭발적으로 늘어나는 이유:</strong><br>
일본의 지폐는 1,000엔부터 시작하며, 1엔, 5엔, 10엔, 50엔, 100엔, 500엔까지 무려 <strong>6종류의 동전</strong>이 존재합니다. 여기에 일본의 소비세(식품 8%, 일반 10%)가 붙어 108엔, 324엔처럼 끝자리가 떨어지면서 잔돈이 쏟아져 나옵니다.<br><br>
💡 <em>꿀팁:</em> 1엔, 10엔, 100엔 등 칸이 분리된 전용 동전 지갑을 챙기시면 계산대 앞에서 허둥대지 않고 현지인처럼 빠르게 계산할 수 있습니다!`,
    speechText: '일본은 1000엔 미만이 모두 6종류의 동전으로 되어 있고 소비세가 붙기 때문에 잔돈이 많이 생깁니다. 칸이 나뉜 동전 지갑을 챙기시면 식당과 편의점에서 빠르고 편리하게 계산할 수 있습니다.'
  },
  {
    id: 'vending-machine-paradise',
    title: '🥤 자판기 천국 일본: 따뜻한 빨강과 차가운 파랑',
    keywords: ['자판기', '음료', '빨강', '파랑', '콘스프', '앗타카이', '츠메타이'],
    html: `일본은 인구 30명당 1대꼴로 자판기가 보급되어 있는 세계 제1의 '자판기 왕국'입니다.<br><br>
<strong>버튼 색상의 비밀:</strong><br>
- <strong>파란색 버튼 (つめたい, 츠메타이):</strong> 얼음장처럼 시원한 차가운 음료.<br>
- <strong>빨간색 버튼 (あたたかい, 앗타카이):</strong> 캔을 쥐었을 때 손난로처럼 따뜻한 온음료.<br><br>
가을과 겨울에는 커피뿐만 아니라 <strong>따끈따끈한 옥수수 콘스프 캔, 팥죽(시루코), 된장국(미소시루)</strong>까지 자판기에서 따뜻하게 뽑아 마실 수 있어 추위를 녹여주는 최고의 여행 동반자입니다!`,
    speechText: '일본은 어디서나 자판기를 만날 수 있는 자판기 천국입니다. 파란 버튼은 시원한 음료, 빨간 버튼은 따뜻한 음료를 뜻합니다. 겨울철에는 따뜻한 커피뿐 아니라 옥수수 콘스프와 단팥죽까지 자판기에서 즐기실 수 있습니다.'
  },
  {
    id: 'denden-town-subculture',
    title: '🎮 닛폰바시 덴덴타운: 서일본 최대의 서브컬처 성지',
    keywords: ['덴덴타운', '닛폰바시', '피규어', '애니', '오타쿠', '건담', '전자상가'],
    html: `도쿄에 아키하바라가 있다면, 오사카에는 <strong>덴덴타운(でんでんタウン)</strong>이 있습니다!<br><br>
난바역과 닛폰바시역 남쪽에 펼쳐진 전자상가 거리로, 원래는 라디오 부품과 가전제품을 파는 거리였으나 현재는 <strong>피규어, 건담 프라모델, 레트로 게임팩, 코스프레, 가챠퐁 캡슐토이, 메이드 카페</strong>가 밀집한 서일본 최고의 오타쿠 성지가 되었습니다.<br><br>
아키하바라보다 가격대가 저렴하고 희귀한 고전 애니메이션 굿즈나 중고 게임기를 발굴하는 재미가 쏠쏠해 전 세계 매니아들의 발길이 끊이지 않습니다.`,
    speechText: '덴덴타운은 도쿄 아키하바라와 어깨를 나란히 하는 서일본 최고의 애니메이션 및 전자상가 성지입니다. 정교한 피규어부터 레트로 비디오 게임, 굿즈까지 매니아들을 위한 천국 같은 곳입니다.'
  },
  {
    id: 'donki-tax-free',
    title: '🐧 돈키호테 & 드럭스토어 10% 면세(Tax-Free) 꿀팁',
    keywords: ['돈키호테', '면세', '쇼핑', '여권', '드럭스토어', '할인', '소비세'],
    html: `오사카 도톤보리의 거대 관람차가 달린 돈키호테나 마츠모토 키요시 등에서 쇼핑할 때 필수 체크 사항입니다.<br><br>
<strong>면세(Tax-Free) 받는 법:</strong><br>
1. <strong>여권 필수 지참:</strong> 본인의 실물 여권(사본 불가)을 반드시 제시해야 합니다.<br>
2. <strong>금액 기준:</strong> 동일 매장에서 하루 결제 금액이 <strong>세금 제외 5,000엔 이상</strong>일 때 10% 소비세 전액이 즉시 면세됩니다.<br>
3. <strong>면세 물품 밀봉 봉투:</strong> 화장품, 의약품, 간식 등 소모품은 특수 비닐에 밀봉되며, <strong>"일본 출국 전까지 국내에서 개봉하여 사용하지 않는다"</strong>는 조건이 붙습니다. 귀국하기 전에 일본 내에서 드실 간식은 일반 결제로 따로 나누어 계산하셔야 합니다.`,
    speechText: '돈키호테와 드럭스토어에서는 세금 제외 5000엔 이상 구매 시 실물 여권을 제시하면 10퍼센트 면세 혜택을 받으실 수 있습니다. 면세 처리된 물품은 일본 출국 전까지 뜯지 않아야 하므로 바로 드실 간식은 따로 결제하세요.'
  },
  {
    id: 'tonkatsu-cabbage',
    title: '🥩 돈카츠 옆에 채 썬 양배추가 산더미로 나오는 이유',
    keywords: ['돈카츠', '돈까스', '양배추', '비타민', '소화', '리필'],
    html: `일본 돈카츠 전문점에 가면 바삭한 돈카츠 옆에 채 썬 양배추가 산처럼 수북하게 나오는 모습을 보게 됩니다.<br><br>
<strong>영양학적 지혜와 소화의 비밀:</strong><br>
1. <strong>천연 소화제 비타민 U:</strong> 양배추에는 위장 점막을 보호하고 재생하는 비타민 U와 식이섬유가 풍부하여, 기름에 튀긴 고기를 먹을 때 생기는 위산 과다와 더부룩함을 말끔히 예방해 줍니다.<br>
2. <strong>입안을 개운하게:</strong> 기름진 돈카츠 한 점에 참깨 드레싱이나 유자 폰즈 소스를 뿌린 아삭한 양배추를 곁들이면 느끼함이 싹 가십니다.<br><br>
💡 대부분의 정통 돈카츠 집에서는 밥, 장국, 그리고 <strong>양배추 리필이 무료(오카와리 무료)</strong>이므로 마음껏 곁들여 드셔도 좋습니다!`,
    speechText: '돈카츠 옆에 채 썬 양배추가 나오는 이유는 양배추의 비타민 U 성분이 기름진 튀김 음식의 소화를 돕고 위벽을 보호해 주기 때문입니다. 대부분의 가게에서 양배추는 무료 리필이 가능합니다.'
  },
  {
    id: 'midosuji-subway',
    title: '🚇 빨간색 1호선 미도스지선: 오사카 지하철의 대동맥',
    keywords: ['미도스지', '지하철', '우메다', '난바', '텐노지', '신오사카', '1호선'],
    html: `오사카 여행 중 가장 많이 타게 되는 <strong>빨간색 노선 미도스지선(御堂筋線)</strong>은 1933년에 개통된 오사카 최초이자 일본 최초의 공영 지하철입니다.<br><br>
신칸센이 서는 <strong>신오사카역</strong>부터 시작하여, 북쪽의 번화가 <strong>우메다</strong>, 중심 상업지구 <strong>혼마치</strong>, 젊음의 거리 <strong>신사이바시 & 난바</strong>, 그리고 남쪽의 <strong>텐노지</strong>까지 오사카의 핵심 남북 축을 직선으로 완벽하게 관통합니다.<br><br>
승강장이 고풍스럽고 천장이 돔형으로 높게 설계되어 있어 오사카 근대 건축의 웅장함을 느낄 수 있는 대표적인 노선입니다.`,
    speechText: '빨간색 미도스지선은 1933년 개통된 오사카 최초의 지하철로 오사카 교통의 핵심 대동맥입니다. 신오사카, 우메다, 신사이바시, 난바, 텐노지를 한 번에 이어주어 여행 시 가장 유용한 노선입니다.'
  },
  {
    id: 'ramen-slurping',
    title: '🍜 라멘 면발을 후루룩 소리 내어 먹는 이유',
    keywords: ['라멘', '면', '소리', '후루룩', '즈루즈루', '국물', '에티켓'],
    html: `서양 식사 예절에서는 소리 내어 음식을 먹는 것이 금기이지만, 일본 라멘집이나 메밀소바 집에서는 <strong>"후루룩! 쯧쯧!" (즈루즈루)</strong> 소리를 내며 면을 들이마시는 사람들을 흔히 봅니다.<br><br>
<strong>소리를 내는 2가지 과학적 이유:</strong><br>
1. <strong>향을 극대화(에어로졸 효과):</strong> 면과 함께 공기를 강하게 들이마시면 코로 라멘 국물의 깊은 육수 향이 퍼지며 미각과 후각을 동시에 자극해 맛이 훨씬 풍부해집니다.<br>
2. <strong>뜨거운 면 식히기:</strong> 펄펄 끓는 뜨거운 면발을 공기와 함께 빠르게 흡입하여 입안을 데이지 않고 맛있게 즐길 수 있습니다.<br>
3. <strong>주방장에 대한 최고의 찬사:</strong> <em>"소리 날 만큼 너무 맛있게 잘 먹고 있다"</em>는 긍정적인 신호로 여겨집니다.`,
    speechText: '일본에서 라멘이나 소바를 후루룩 소리 내어 먹는 것은 면과 공기를 함께 들이마셔 향을 극대화하고 면을 식히는 전통 방식입니다. 주방장에게 음식이 맛있다는 찬사의 의미도 담겨 있습니다.'
  },
  {
    id: 'matcha-culture',
    title: '🍵 일본의 맛차(말차)와 다도 문화: 일기일회(一期一会)',
    keywords: ['맛차', '말차', '녹차', '다도', '우지', '일기일회', '전통차'],
    html: `오사카 근교의 교토 '우지(宇治)'는 일본 최고 품질의 녹차와 맛차 산지입니다. 찻잎을 쪄서 말린 후 맷돌로 곱게 갈아낸 초록빛 가루를 거품 내어 마시는 것이 <strong>맛차(抹茶)</strong>입니다.<br><br>
<strong>다도의 정신, 일기일회(一期一会, 이치고이치에):</strong><br>
16세기 오사카 사카이 출신의 다도 대가 <strong>센노 리큐</strong>가 정립한 다도 철학의 핵심입니다.<br>
<em>"지금 마주한 이 차 한 잔과 만남은 내 평생 단 한 번뿐인 소중한 인연이다."</em>라는 뜻으로, 상대방을 위해 정성을 다해 차를 대접하는 마음가짐입니다. 쌉싸름한 차를 마시기 전에 먼저 달콤한 화과자(와가시)를 입에 물어 쓴맛과 단맛의 조화를 즐기는 것이 정통 음용법입니다.`,
    speechText: '일본의 맛차 문화는 평생 단 한 번뿐인 인연을 소중히 여긴다는 일기일회의 다도 정신에 뿌리를 두고 있습니다. 쌉싸름한 말차를 마시기 전 달콤한 전통 과자를 곁들이면 조화로운 풍미를 느끼실 수 있습니다.'
  },
  {
    id: 'nakanoshima-hall',
    title: '🏛️ 나카노시마와 오사카 중앙공회당: 상인 정신의 상징',
    keywords: ['나카노시마', '공회당', '중앙공회당', '근대건축', '강', '상인', '기부'],
    html: `오사카 시내를 흐르는 도지마강과 도사보리강 사이에 떠 있는 모래톱 섬 <strong>나카노시마(中之島)</strong>는 오사카의 행정, 문화, 예술의 중심지입니다.<br><br>
이곳의 상징인 붉은 벽돌의 <strong>오사카시 중앙공회당</strong>은 1918년에 지어진 네오 르네상스 양식의 국가 중요문화재입니다.<br><br>
<strong>오사카 상인의 위대한 유산:</strong><br>
이 화려한 공회당은 공공 세금이 아니라, 오사카의 주식 중개인이었던 상인 <strong>이와모토 에이노스케</strong>가 거액의 사재 100만 엔(현재 가치 수백억 원)을 사회에 쾌척하여 지어졌습니다. 공공을 위해 아낌없이 부를 베풀었던 오사카 상인들의 자랑스러운 기부 문화가 살아 숨 쉬는 곳입니다.`,
    speechText: '나카노시마에 위치한 붉은 벽돌의 오사카 중앙공회당은 국가 중요문화재입니다. 오사카 상인이었던 이와모토 에이노스케의 자발적인 기부금으로 세워진 건물로, 공공을 위하는 오사카 상인 정신의 대표적인 상징입니다.'
  },
  {
    id: 'osaka-expo-tower',
    title: '☀️ 1970 오사카 만국박람회와 신비로운 태양의 탑',
    keywords: ['엑스포', '만박', '태양의탑', '오카모토', '공원', '박람회', '1970'],
    html: `오사카 북부 만박기념공원에 우뚝 솟아 있는 거대한 조형물 <strong>'태양의 탑(太陽の塔)'</strong>은 1970년 아시아 최초로 열렸던 <strong>오사카 만국박람회(EXPO \'70)</strong>의 상징 조형물입니다.<br><br>
일본의 전설적인 전위 예술가 <strong>오카모토 타로</strong>가 디자인한 높이 70m의 거대 조각으로, 3개의 얼굴을 갖고 있습니다.<br>
1. 꼭대기의 황금 가면: 빛나는 미래를 상징<br>
2. 정면 몸통의 태양 얼굴: 생동하는 현재를 상징<br>
3. 뒷면의 검은 태양: 근원적인 과거를 상징<br><br>
2025년 오사카·간사이 엑스포 개최를 계기로 다시금 전 세계적인 주목을 받고 있는 오사카의 대표 예술 유산입니다.`,
    speechText: '만박기념공원의 태양의 탑은 1970년 아시아 최초 오사카 엑스포를 위해 세워진 70미터 높이의 전설적인 예술 건축물입니다. 과거, 현재, 미래를 상징하는 세 개의 얼굴을 지니고 있으며 깊은 영감을 줍니다.'
  },
  {
    id: 'sake-beer-pouring',
    title: '🍶 일본 술자리 에티켓: 상대방 잔 채워주기(오샤쿠)',
    keywords: ['사케', '맥주', '술자리', '오샤쿠', '예절', '건배', '잔'],
    html: `일본 동료나 친구와 술자리를 가질 때 지켜야 할 매너입니다.<br><br>
1. <strong>자작보다 서로 따라주기 (오샤쿠, お酌):</strong> 일본에서는 혼자 자기 잔을 채우는 것보다 상대방의 잔이 비었을 때 술을 권하며 채워주는 것을 정다운 배려로 여깁니다. 상대방 잔이 3분의 1 이하로 줄어들면 "오히토츠 이카가데스카(한잔 더 어떠세요?)" 하고 권해보세요.<br>
2. <strong>술을 받을 때의 자세:</strong> 술을 따라줄 때는 잔을 테이블에 그대로 두지 않고, <strong>한 손으로 잔을 들고 다른 한 손으로 잔 밑바닥을 가볍게 받쳐주는 것</strong>이 정중한 예절입니다.<br>
3. <strong>첫 잔은 다 함께 건배 (간파이, 乾杯):</strong> 주문한 음료가 모두 나오고 나면 잔을 부딪히며 "간파이!"를 외친 후 함께 마시기 시작합니다.`,
    speechText: '일본 술자리에서는 서로 잔을 채워주는 배려 문화가 있습니다. 술을 받을 때는 두 손으로 잔을 살짝 받쳐 들고, 첫 잔은 모두가 잔을 채운 후 간파이라는 구호와 함께 동시에 건배를 합니다.'
  },
  {
    id: 'hozenji-yokocho',
    title: '🏮 도톤보리 뒷골목 호젠지 요코초와 물 뿌리는 부동명왕',
    keywords: ['호젠지', '요코초', '부동명왕', '물', '이끼', '골목', '소원'],
    html: `화려하고 번쩍이는 도톤보리 메인 거리에서 불과 1분만 골목 안으로 들어가면, 에도 시대의 운치 있는 돌바닥 골목 <strong>호젠지 요코초(法善寺横丁)</strong>가 나타납니다.<br><br>
골목 중심에 위치한 작은 사찰 호젠지에는 전신이 짙푸른 초록빛 이끼로 뒤덮인 신비로운 불상 <strong>'미즈카케 후도손(水掛け不動尊)'</strong>이 모셔져 있습니다.<br><br>
<strong>소원 비는 방법:</strong><br>
바가지로 우물물을 떠서 불상 위에 세 번 시원하게 끼얹으며 소원을 빕니다. 한 어머니가 아들의 건강을 빌며 정성껏 물을 뿌리기 시작한 것이 유래가 되어, 수십 년 동안 수많은 사람들의 소원과 물길이 모여 불상 전체가 부드러운 초록 이끼 옷을 입게 된 감동적인 명소입니다.`,
    speechText: '호젠지 요코초는 도톤보리 뒤편의 고즈넉한 돌바닥 골목입니다. 이곳 사찰의 부동명왕 불상에 시원한 물을 끼얹으며 소원을 비는 전통이 있어, 불상 온몸이 푸른 이끼로 아름답게 뒤덮여 있습니다.'
  },
  {
    id: 'onigiri-wrapping',
    title: '🍙 일본 편의점 삼각김밥(오니기리) 바삭하게 뜯는 1-2-3 법칙',
    keywords: ['삼각김밥', '오니기리', '편의점', '뜯는법', '김', '테이프'],
    html: `일본 편의점의 삼각김밥(오니기리)은 밥과 바삭한 김 사이에 얇은 비닐이 들어있어 뜯는 번호 순서를 잘 지켜야 김이 찢어지지 않습니다.<br><br>
<strong>실패 없는 1-2-3 뜯기 순서:</strong><br>
1. <strong>가운데 빨간 라벨 1번:</strong> 위쪽 꼭짓점의 테이프를 잡고 <strong>아래쪽 끝까지 쭉 당긴 뒤 뒷면까지</strong> 한 바퀴 빙 돌려 완전히 뜯어냅니다.<br>
2. <strong>우측 2번 모서리:</strong> 오른쪽 모서리 비닐을 바깥쪽으로 부드럽게 쏙 잡아당겨 벗깁니다.<br>
3. <strong>좌측 3번 모서리:</strong> 김이 흐트러지지 않도록 살짝 쥐고 왼쪽 모서리 비닐을 쏙 잡아당겨 벗겨내면 갓 구운 듯 바삭바삭한 김이 밥을 완벽하게 감쌉니다!`,
    speechText: '일본 편의점 삼각김밥은 번호 순서대로 뜯어야 김이 찢어지지 않습니다. 가운데 일 번 테이프를 아래로 당겨 뒤쪽까지 완전히 가른 다음, 오른쪽 이번과 왼쪽 삼번 모서리를 차례로 벗겨내시면 됩니다.'
  }
];

// 전역 문화 가이드 상태
let cultureGuideState = {
  activeSpeechText: '',
  activeTitle: '',
  isSpeaking: false,
  recognition: null,
  isListening: false
};

function initCultureGuide() {
  const micBtn = document.getElementById('culture-mic-btn');
  const queryInput = document.getElementById('culture-query-input');
  const askBtn = document.getElementById('culture-ask-btn');
  const ttsBtn = document.getElementById('culture-tts-btn');
  const copyBtn = document.getElementById('culture-copy-btn');
  const chipBtns = document.querySelectorAll('.culture-chip-btn');

  // 1. 추천 질문 칩 클릭 이벤트 연동
  chipBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.getAttribute('data-query');
      if (q) {
        if (queryInput) queryInput.value = q;
        processCultureQuery(q);
      }
    });
  });

  // 2. 질문하기 버튼 클릭
  if (askBtn) {
    askBtn.addEventListener('click', () => {
      const q = queryInput ? queryInput.value.trim() : '';
      if (!q) {
        showToast('💡 궁금한 질문을 입력하거나 마이크로 말씀하세요!');
        if (queryInput) queryInput.focus();
        return;
      }
      processCultureQuery(q);
    });
  }

  // 3. 엔터 키 입력 시 질문 실행
  if (queryInput) {
    queryInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = queryInput.value.trim();
        if (q) processCultureQuery(q);
      }
    });
  }

  // 4. 음성 마이크 STT 버튼 연동
  if (micBtn) {
    micBtn.addEventListener('click', () => {
      toggleCultureSpeechRecognition();
    });
  }

  // 5. 음성으로 해설 듣기 TTS 버튼 연동
  if (ttsBtn) {
    ttsBtn.addEventListener('click', () => {
      toggleCultureTts();
    });
  }

  // 6. 해설 복사 버튼 연동
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      copyCultureGuideAnswer();
    });
  }

  // 초기 기본값 설정
  if (cultureKnowledgeBase.length > 0) {
    cultureGuideState.activeTitle = cultureKnowledgeBase[0].title;
    cultureGuideState.activeSpeechText = cultureKnowledgeBase[0].speechText;
  }
}

// 음성 질문 인식 (STT) 시작 / 중지 토글
function toggleCultureSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('⚠️ 현재 브라우저는 마이크 음성 인식을 지원하지 않습니다. Chrome을 권장합니다.');
    return;
  }

  const micBtn = document.getElementById('culture-mic-btn');
  const statusBox = document.getElementById('culture-mic-status');
  const statusText = document.getElementById('culture-mic-status-text');
  const queryInput = document.getElementById('culture-query-input');

  if (cultureGuideState.isListening && cultureGuideState.recognition) {
    try {
      cultureGuideState.recognition.stop();
    } catch(e) {}
    return;
  }

  try {
    const recognition = new SpeechRecognition();
    cultureGuideState.recognition = recognition;
    recognition.lang = 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      cultureGuideState.isListening = true;
      if (micBtn) micBtn.classList.add('recording');
      if (statusBox) statusBox.style.display = 'block';
      if (statusText) statusText.innerText = '🎙️ 질문을 듣고 있습니다... 편하게 말씀하세요!';
      showToast('🎙️ 질문을 말씀해 주세요...');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript && transcript.trim()) {
        if (queryInput) queryInput.value = transcript;
        showToast('✨ 음성 인식 완료: "' + transcript + '"');
        processCultureQuery(transcript);
      }
    };

    recognition.onerror = (err) => {
      console.warn('Culture STT Error:', err);
      showToast('⚠️ 음성을 명확히 듣지 못했습니다. 다시 시도해 주세요.');
    };

    recognition.onend = () => {
      cultureGuideState.isListening = false;
      if (micBtn) micBtn.classList.remove('recording');
      if (statusBox) statusBox.style.display = 'none';
    };

    recognition.start();
  } catch (err) {
    console.error('Culture Recognition Start Error:', err);
    showToast('⚠️ 마이크를 시작할 수 없습니다.');
    cultureGuideState.isListening = false;
    if (micBtn) micBtn.classList.remove('recording');
    if (statusBox) statusBox.style.display = 'none';
  }
}

// 지식 검색 및 스마트 답변 생성 엔진
function findCultureAnswer(query) {
  if (!query || typeof query !== 'string') return cultureKnowledgeBase[0];
  const q = query.toLowerCase().replace(/[^a-zA-Z0-9가-힣\s]/g, ' ').trim();
  const qTokens = q.split(/\s+/).filter(t => t.length > 0);

  let bestMatch = null;
  let highestScore = 0;

  for (const item of cultureKnowledgeBase) {
    let score = 0;
    // 1. 키워드 완전/부분 매칭 점수
    for (const kw of item.keywords) {
      const kwLower = kw.toLowerCase();
      if (q.includes(kwLower)) {
        score += 10;
      }
      for (const token of qTokens) {
        if (token.length >= 2 && (kwLower.includes(token) || token.includes(kwLower))) {
          score += 4;
        }
      }
    }
    // 2. 제목 매칭 점수
    if (item.title.toLowerCase().includes(q)) {
      score += 15;
    }
    for (const token of qTokens) {
      if (token.length >= 2 && item.title.toLowerCase().includes(token)) {
        score += 3;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = item;
    }
  }

  // 매칭된 항목이 있는 경우 반환
  if (bestMatch && highestScore >= 4) {
    return bestMatch;
  }

  // 매칭 점수가 낮은 경우 일반 질문에 대한 지능형 친절 해설 제공
  return {
    id: 'custom-guide-' + Date.now(),
    title: `💡 오사카 AI 도슨트: "${escapeHtml(query)}" 안내`,
    html: `오사카와 일본 문화에 대해 질문해 주신 <strong>"${escapeHtml(query)}"</strong>에 대해 안내해 드립니다.<br><br>
오사카는 과거부터 일본의 물류와 상업을 주도해 온 <strong>'천하의 부엌(天下の台所)'</strong>으로 불리며, 타인을 먼저 배려하고 융통성 있게 소통하는 따뜻한 상인 문화가 깊게 자리 잡고 있습니다.<br><br>
여행 중 현지인을 대할 때는 항상 눈을 마주치며 가벼운 목례와 함께 <strong>"스미마센(실례합니다/감사합니다)"</strong>, <strong>"아리가토 고자이마스(대단히 감사합니다)"</strong>를 생활화하시면 어디서나 환한 미소와 친절한 대접을 받으실 수 있습니다.<br><br>
더 구체적인 내용이 궁금하시다면 상단의 <em>🏯 오사카성 역사</em>, <em>⛩️ 신사 참배 & 손 씻기</em>, <em>🏃 글리코상 유래</em>, <em>🍢 오토시 문화</em> 칩을 터치해 보세요!`,
    speechText: `${query}에 대해 안내해 드립니다. 오사카는 인정과 실용성을 가장 소중히 여기는 상인의 도시입니다. 스미마센과 아리가토 고자이마스 같은 공손한 인사말을 자주 건네시면 현지인들의 따뜻한 배려와 친절을 느끼실 수 있습니다.`
  };
}

// 질문 처리 메인 프로세서
function processCultureQuery(query) {
  const item = findCultureAnswer(query);
  const titleEl = document.getElementById('culture-res-title');
  const bodyEl = document.getElementById('culture-res-body');
  const timeEl = document.getElementById('culture-result-time');
  const resultCard = document.getElementById('culture-guide-result');

  if (titleEl) titleEl.innerHTML = item.title;
  if (bodyEl) bodyEl.innerHTML = item.html;
  if (timeEl) {
    const now = new Date();
    const timeStr = (now.getHours() < 12 ? '오전 ' : '오후 ') + (now.getHours() % 12 || 12) + ':' + String(now.getMinutes()).padStart(2, '0');
    timeEl.innerText = timeStr + ' 답변';
  }

  cultureGuideState.activeTitle = item.title;
  cultureGuideState.activeSpeechText = item.speechText;

  // 카드 부드러운 포커스
  if (resultCard) {
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  showToast('🏛️ AI 가이드 해설이 준비되었습니다!');
}

// 음성 낭독 (TTS) 토글
function toggleCultureTts() {
  const ttsBtn = document.getElementById('culture-tts-btn');
  const ttsText = document.getElementById('culture-tts-btn-text');

  if (cultureGuideState.isSpeaking) {
    // 낭독 정지
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch(e) {}
    }
    cultureGuideState.isSpeaking = false;
    state.isSpeakingNow = false;
    if (ttsBtn) ttsBtn.classList.remove('speaking');
    if (ttsText) ttsText.innerText = '음성으로 해설 듣기';
    showToast('⏹️ 음성 해설을 정지했습니다.');
    return;
  }

  const textToSpeak = cultureGuideState.activeSpeechText || '해설 내용이 없습니다.';
  if (ttsBtn) ttsBtn.classList.add('speaking');
  if (ttsText) ttsText.innerText = '⏹️ 낭독 정지';
  cultureGuideState.isSpeaking = true;

  speakText(textToSpeak, 'ko', () => {
    cultureGuideState.isSpeaking = false;
    if (ttsBtn) ttsBtn.classList.remove('speaking');
    if (ttsText) ttsText.innerText = '음성으로 해설 듣기';
  });
}

// 해설 복사하기
function copyCultureGuideAnswer() {
  const bodyEl = document.getElementById('culture-res-body');
  const titleEl = document.getElementById('culture-res-title');
  if (!bodyEl) return;

  const titleText = titleEl ? titleEl.innerText.trim() + '\n\n' : '';
  const plainText = titleText + bodyEl.innerText.trim() + '\n\n[출처: OsakaGo 오사카 역사 & 문화 AI 가이드]';

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(plainText).then(() => {
      showToast('📋 해설이 클립보드에 복사되었습니다!');
    }).catch(() => {
      fallbackCopy(plainText);
    });
  } else {
    fallbackCopy(plainText);
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      showToast('📋 해설이 복사되었습니다!');
    } catch (e) {
      showToast('⚠️ 복사에 실패했습니다.');
    }
    document.body.removeChild(ta);
  }
}

