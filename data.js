// 게임 내용: 성격, 대사, 적, 장소, 기술. 숫자는 전부 여기서 정한다(AI는 이름·말만 짓는다).

export const SPECIES = '불꽃용';

export const IMG = {
  egg: 'img/egg.webp', baby: 'img/baby.webp', adult: 'img/adult.webp',
  baby_back: 'img/baby_back.webp', adult_back: 'img/adult_back.webp',
  mush: 'img/mush.webp', slime: 'img/slime.webp', bat: 'img/bat.webp', golem: 'img/golem.webp',
  bg_nest: 'img/bg_home.webp', bg_forest: 'img/bg_forest.webp', bg_cave: 'img/bg_cave.webp',
};

export const NAMES = ['불꽃이', '콩이', '용용이', '화롱이', '뽀삐', '꾸앙이'];

// 아기 때는 성격과 상관없이 서툰 말을 한다. babyIdle만 성격마다 다르다.
export const BABY_LINES = {
  idle: ['꾸앙?', '주인… 주인!', '꾸우…'],
  eat: ['냠냠! 맛있어!', '꾸앙! 더!'],
  full: ['배불러… 꾸으…'],
  hungry: ['배고파… 밥…'],
  play: ['꺄! 또! 또!', '꾸앙꾸앙!'],
  battle: ['꾸앙! 덤벼!', '이익… 안 무서워!'],
  win: ['이겼다! 꾸앙!', '주인! 봤어? 봤어?'],
  lose: ['아파… 꾸우…'],
  enhance: ['힘이 나! 꾸앙!'],
  levelup: ['커졌다! 꾸앙!'],
  tired: ['졸려… 꾸우…'],
};

export const PERSONALITIES = {
  먹보: {
    desc: '먹는 걸 세상에서 제일 좋아한다',
    style: '해맑고 느긋하다. 무슨 얘기를 하든 먹을 것 얘기를 섞는다',
    babyIdle: '냠… 냠냠?',
    lines: {
      idle: ['오늘 저녁 뭐야? 고기야?', '구름이 꼭 솜사탕 같다…', '배에서 꼬르륵 소리 났어. 들었어?'],
      eat: ['우와! 이거 진짜 맛있다!', '한 그릇 더 있지? 있지?'],
      full: ['배 터지겠어… 근데 디저트 배는 따로 있어.'],
      hungry: ['배고파서 아무것도 못 하겠어…'],
      play: ['놀고 나면 밥이 더 맛있지!', '헤헤, 재밌다! 이제 간식?'],
      battle: ['너 혹시 맛있게 생겼니?', '이기면 간식이다!'],
      win: ['이겼다! 이제 밥 먹으러 가자!', '배고파서 힘이 났나 봐!'],
      lose: ['배가 고파서 진 거야… 분명해…'],
      enhance: ['힘이 솟아! 밥 두 그릇은 먹겠다!'],
      levelup: ['커졌으니까 밥도 더 먹어야겠다!'],
      tired: ['힘없어… 밥 먹고 쉬자…'],
    },
  },
  겁쟁이: {
    desc: '겁이 많고 소심하지만 주인을 많이 따른다',
    style: '소심하고 말을 더듬는다("ㅇ, 응…"). 무서우면 주인 뒤에 숨으려 한다',
    babyIdle: '주, 주인… 어디 가…?',
    lines: {
      idle: ['ㅂ, 방금 무슨 소리 났어…?', '주인 옆에 있으면 안 무서워…', '그림자가 움직인 것 같아…'],
      eat: ['고, 고마워… 맛있어…', '천천히 먹을게…'],
      full: ['배, 배불러… 이제 그만…'],
      hungry: ['배고픈데… 말하기 미안해서…'],
      play: ['ㅎ, 헤헤… 재밌다…', '주인이랑 놀면 하나도 안 무서워!'],
      battle: ['ㅁ, 무서워… 그래도 해볼게!', '주인이 보고 있으니까…!'],
      win: ['ㅇ, 이겼어…? 내가?', '휴… 다리가 아직도 떨려…'],
      lose: ['미안해… 너무 무서웠어…'],
      enhance: ['조, 조금 용감해진 것 같아!'],
      levelup: ['나 이제 조금 더 강해졌어…!'],
      tired: ['힘들어… 둥지에서 쉬고 싶어…'],
    },
  },
  건방짐: {
    desc: '잘난 척을 하지만 사실 주인을 아주 좋아한다(츤데레)',
    style: '잘난 척하고 "흥"을 자주 한다. 칭찬받으면 쑥스러워하며 딴소리를 한다',
    babyIdle: '흥! 꾸앙!',
    lines: {
      idle: ['흥, 내가 이 둥지에서 제일 멋있지.', '심심하면 나랑 놀아도 돼. 특별히.', '뭘 봐? …그래, 멋있지?'],
      eat: ['흥, 나쁘지 않네.', '…한 그릇 더 줘도 되고.'],
      full: ['흥, 이제 됐어. 배불러서 그런 거 아니거든.'],
      hungry: ['배고픈 거 아니거든! …밥 줘.'],
      play: ['흥, 어쩔 수 없이 놀아주는 거야.', '…조금 재밌었어. 조금!'],
      battle: ['흥, 상대가 안 되겠는데?', '내 실력 똑똑히 봐 둬!'],
      win: ['당연한 결과지! 흥!', '봤지? 내가 최고야!'],
      lose: ['오, 오늘은 컨디션이 안 좋았을 뿐이야!'],
      enhance: ['흥, 이제 아무도 날 못 이겨!'],
      levelup: ['더 멋있어졌네. 역시 나야.'],
      tired: ['피곤한 거 아니야… 그냥 좀 쉬는 거야.'],
    },
  },
  수다쟁이: {
    desc: '말이 많고 늘 신나 있다',
    style: '말이 많고 느낌표를 많이 쓴다. 묻지도 않은 얘기를 꺼낸다',
    babyIdle: '꾸앙꾸앙꾸앙! 있잖아!',
    lines: {
      idle: ['있잖아! 아까 나비 봤는데 엄청 컸어!', '주인! 내 얘기 들어볼래? 들어봐!', '오늘 하늘 봤어? 진짜 파래!'],
      eat: ['우와! 이거 뭐야? 맛있다! 또 뭐 있어?', '먹으면서 얘기해도 돼? 돼지?'],
      full: ['배불러! 근데 할 얘기는 아직 많아!'],
      hungry: ['배고파! 배고프면 말이 줄어든다구!'],
      play: ['또 하자! 또! 한 번만 더!', '진짜 재밌다! 내일도 하자!'],
      battle: ['우와! 쟤 봐! 싸우자!', '내가 이기면 자랑할 거야!'],
      win: ['이겼다! 다 봤지? 다 말할 거야!', '대박! 나 완전 멋있었지!'],
      lose: ['으앙… 근데 다음엔 이길 거야!'],
      enhance: ['우와! 힘이 넘쳐! 이거 봐봐!'],
      levelup: ['나 컸어! 주인 나 컸다구!'],
      tired: ['힘들어… 그래도 말할 힘은 있어…'],
    },
  },
  느긋함: {
    desc: '만사태평하고 잠이 많다',
    style: '느릿느릿 말하고 말끝을 "~"로 늘인다. 뭐든 태평하다',
    babyIdle: '꾸우~ 졸려~',
    lines: {
      idle: ['햇살 좋다~ 낮잠 자기 딱 좋네~', '서두를 거 없어~ 천천히~', '흐아암~ 주인도 같이 누울래~?'],
      eat: ['음~ 맛있다~ 천천히 먹을게~', '냠~ 고마워~'],
      full: ['배부르니까~ 졸리다~'],
      hungry: ['배고프다~ 근데 움직이기 귀찮다~'],
      play: ['헤헤~ 좋다~', '조금만 놀고~ 또 쉬자~'],
      battle: ['음~ 싸워야 해~? 그래~', '빨리 끝내고 낮잠 자자~'],
      win: ['이겼네~ 이제 자도 되지~?', '휴~ 수고했다~'],
      lose: ['졌네~ 뭐 괜찮아~ 자고 나면 나아~'],
      enhance: ['오~ 힘이 좀 나네~'],
      levelup: ['어~ 나 컸네~ 신기하다~'],
      tired: ['졸려~ 둥지 가고 싶어~'],
    },
  },
};

export const START_SKILLS = [
  { name: '몸통 박치기', type: 'attack', power: 10, desc: '온몸으로 들이받는다.', shout: '에잇!', fx: 'tackle' },
  { name: '불씨 뱉기', type: 'attack', power: 13, desc: '작은 불씨를 퉤 뱉는다.', shout: '퉷!', fx: 'ember' },
];

// 기술은 키운 방식대로 생긴다. 횟수가 at에 닿으면 그 칸의 기술을 하나 배운다.
export const SKILL_UNLOCKS = {
  play: { label: '놀기', icon: '🎾', at: [5, 15, 30], type: 'debuff', power: [7, 10, 14],
    fx: 'tickle', reason: '주인이랑 많이 놀아서', desc: '장난을 쳐서 상대 공격력을 낮춘다.' },
  adv: { label: '모험', icon: '🗺️', at: [2, 6, 12], type: 'attack', power: [16, 21, 27],
    fx: 'rock', reason: '모험을 많이 다녀서', desc: '거칠게 몰아붙이는 강한 공격.' },
  win: { label: '승리', icon: '⚔️', at: [3, 10, 25], type: 'attack', power: [14, 18, 23], crit: 0.2,
    fx: 'bite', reason: '싸움에서 여러 번 이겨서', desc: '급소를 노리는 공격. 치명타가 잘 터진다.' },
  chat: { label: '말 걸기', icon: '💬', at: [5, 20, 40], type: 'buff', power: [0, 0, 0],
    fx: 'aura', reason: '주인이랑 이야기를 많이 해서', desc: '기운을 끌어올려 공격력을 높인다.' },
  eat: { label: '밥', icon: '🍖', at: [5, 20], type: 'heal', power: [35, 50],
    fx: 'heal', reason: '밥을 잘 먹어서', desc: '체력을 회복한다.' },
  evolve: { label: '진화', icon: '✨', at: [], type: 'attack', power: [30],
    fx: 'flamethrower', reason: '다 자란 용으로 진화해서', desc: '진화한 용의 필살기.' },
};

export const FALLBACK_SKILL_NAMES = {
  play: ['간지럼 공격', '꼬리 흔들기', '메롱 도발'],
  adv: ['바위 박치기', '돌진 할퀴기', '회오리 꼬리'],
  win: ['급소 물기', '번개 발톱', '필중 박치기'],
  chat: ['힘내자 함성', '불꽃 다짐', '용의 기합'],
  eat: ['든든한 한 입', '배부른 숨 고르기'],
  evolve: ['화염 숨결'],
};

export const TYPE_LABEL = { attack: '공격', heal: '회복', buff: '힘↑', debuff: '약화' };

export const ENEMIES = {
  mush: { name: '독버섯', hp: 22, atk: 6, spd: 4, skills: [{ name: '포자 뿜기', power: 9, fx: 'spore' }, { name: '몸통 박기', power: 11, fx: 'tackle' }] },
  slime: { name: '잎새 슬라임', hp: 26, atk: 5, spd: 7, skills: [{ name: '끈적 몸통', power: 10, fx: 'slime' }, { name: '잎날 던지기', power: 12, fx: 'leaf' }] },
  bat: { name: '동굴 박쥐', hp: 30, atk: 8, spd: 12, skills: [{ name: '초음파', power: 11, fx: 'sonic' }, { name: '송곳니', power: 14, fx: 'bite' }] },
  golem: { name: '돌 골렘', hp: 45, atk: 10, spd: 3, skills: [{ name: '돌주먹', power: 14, fx: 'punch' }, { name: '바위 굴리기', power: 17, fx: 'rock' }] },
};

export const PLACES = {
  forest: { name: '초록 숲', bg: 'bg_forest', minLv: 1, lvBase: 1, spread: 1, steps: 4, enemies: ['mush', 'slime'], goldMul: 1 },
  cave: { name: '수정 동굴', bg: 'bg_cave', minLv: 4, lvBase: 4, spread: 2, steps: 5, enemies: ['bat', 'golem'], goldMul: 2 },
};

// AI가 없을 때 쓰는 만남 이야기
export const MEETS = [
  '길 잃은 아기 토끼를 만나 굴까지 데려다줬다.',
  '떠돌이 상인 할아버지가 말린 과일을 나눠줬다.',
  '나무 위 다람쥐가 도토리를 툭 던져줬다.',
  '반딧불이 떼가 길을 비춰줬다.',
  '늙은 거북이가 옛날이야기를 들려줬다.',
];
