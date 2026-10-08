// Claude API 연결. 키는 이 기기의 localStorage에만 저장한다.
// AI는 말과 이름만 짓는다. 숫자(피해, 보상)는 game.js가 정한다.
// 키가 없거나 실패하면 null을 돌려주고, 게임은 기본 대사로 계속 돌아간다.
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk';
import { PERSONALITIES, SPECIES, TYPE_LABEL } from './data.js';

const KEY = 'monnest_apikey';
const MODEL = 'monnest_model';

export const MODELS = [
  { id: 'claude-opus-5-5', label: 'Opus 5.5 — 제일 똑똑함 (한 마디 15원쯤)' },
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5 — 중간 (한 마디 8원쯤)' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5 — 제일 싸고 빠름 (한 마디 3원쯤)' },
];

function store(k, v) {
  try {
    if (v === undefined) return localStorage.getItem(k);
    if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
  } catch { /* 저장소를 못 쓰는 브라우저 */ }
  return null;
}
export const getKey = () => store(KEY) || '';
export const setKey = k => store(KEY, k ? k.trim() : null);
export const getModel = () => store(MODEL) || MODELS[0].id;
export const setModel = m => store(MODEL, m);
export const hasKey = () => !!getKey();

let onError = () => {};
export const setErrorHandler = fn => { onError = fn; };

let client = null, clientKey = '';
function getClient() {
  const k = getKey();
  if (!k) return null;
  if (!client || clientKey !== k) {
    client = new Anthropic({ apiKey: k, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 45000 });
    clientKey = k;
  }
  return client;
}

function explain(e) {
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError)
    return 'API 키가 틀린 것 같아. ⚙️에서 확인해줘';
  if (e instanceof Anthropic.RateLimitError) return '요청이 너무 많대. 잠깐 쉬었다 하자';
  if (e instanceof Anthropic.APIConnectionError) return '인터넷 연결을 확인해줘';
  if (e instanceof Anthropic.APIError) return `AI 오류 ${e.status ?? ''}: ${(e.message || '').slice(0, 80)}`;
  return 'AI 연결 실패 — 기본 대사로 할게';
}

async function call({ system, messages, schema, maxTokens = 2000 }) {
  const c = getClient();
  if (!c) return null;
  const model = getModel();
  const params = { model, max_tokens: maxTokens, system, messages };
  const oc = {};
  if (schema) oc.format = { type: 'json_schema', schema };
  if (!model.startsWith('claude-haiku')) oc.effort = 'low'; // 대사는 짧으니 생각을 짧게(빠르고 싸게)
  if (Object.keys(oc).length) params.output_config = oc;

  let res;
  try {
    if (model === 'claude-opus-5-5' || model === 'claude-sonnet-5-5') {
      // 안전 필터에 걸리면 다른 모델이 대신 대답하게 한다
      try {
        res = await c.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
      } catch (e) {
        if (!(e instanceof Anthropic.BadRequestError)) throw e;
        res = await c.messages.create(params);
      }
    } else {
      res = await c.messages.create(params);
    }
  } catch (e) {
    console.warn(e);
    onError(explain(e));
    return null;
  }
  if (res.stop_reason === 'refusal') return null;
  const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
  if (!schema) return text.replace(/^["“]|["”]$/g, '') || null;
  try { return JSON.parse(text); } catch { return null; }
}

const obj = (props) => ({
  type: 'object',
  properties: Object.fromEntries(Object.entries(props).map(([k, v]) => [k, typeof v === 'string' ? { type: v } : v])),
  required: Object.keys(props),
  additionalProperties: false,
});

function loveWord(v) {
  return v >= 80 ? '주인을 무척 사랑함' : v >= 50 ? '주인을 많이 좋아함' : v >= 25 ? '주인과 친해지는 중' : '아직 주인이 조금 낯섦';
}

function speech(S) {
  const p = PERSONALITIES[S.personality];
  const base = S.stage === 'baby'
    ? '아직 아기라서 말이 서툴다. 한 번에 2~8단어만, 짧고 귀엽게 말한다. 가끔 "꾸앙", "꾸우" 같은 울음소리를 섞는다.'
    : '다 자란 용이라 말을 잘한다. 한 번에 1~3문장으로 말한다.';
  return `${base} 반말을 쓴다. 성격에 따른 말투: ${p.style}.`;
}

export function profile(S, stats) {
  const p = PERSONALITIES[S.personality];
  const day = Math.max(1, Math.floor((Date.now() - S.born) / 86400000) + 1);
  const skills = S.skills.map(s => `${s.name}(${TYPE_LABEL[s.type]})`).join(', ');
  const mem = S.memory.slice(-12).map(m => `- ${m}`).join('\n') || '- 아직 별일 없음';
  return `너는 휴대폰 몬스터 키우기 게임 속 몬스터 "${S.name}"이다.
종족: ${SPECIES}(빨간 비늘의 용). 단계: ${S.stage === 'baby' ? '아기' : '다 자란 용'}. 레벨 ${S.lv}${S.enh ? `, 강화 +${S.enh}` : ''}.
성격: ${S.personality} — ${p.desc}.
주인과의 사이: 친밀도 ${Math.round(S.love)}/100 (${loveWord(S.love)}).
지금 상태: 배부름 ${Math.round(S.full)}/100, 체력 ${Math.round(S.hp)}/${stats.maxHp}. 알에서 깬 지 ${day}일째.
아는 기술: ${skills}.
최근 기억:
${mem}
말투: ${speech(S)}
지킬 것: 너는 이 게임 속 몬스터일 뿐이며 AI라는 말을 하지 않는다. 게임에 없는 물건이나 보상을 주겠다고 약속하지 않는다. 대사만 쓰고 지문이나 따옴표는 쓰지 않는다.`;
}

// 주인과 대화
export async function chat(S, stats) {
  const msgs = S.chat.slice(-16).map(m => ({ role: m.role, content: m.content }));
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (!msgs.length) return null;
  return call({
    system: profile(S, stats) + '\n\n주인이 말을 걸었다. 몬스터로서 대답해라.',
    messages: msgs,
    maxTokens: 1500,
  });
}

// 모험 시작 때 한 번에 모든 장면 대사를 받는다(전투 중에는 기다리지 않게)
export async function adventure(S, stats, place, lines) {
  const list = lines.map((d, i) => `${i + 1}) ${d}`).join('\n');
  const out = await call({
    system: profile(S, stats) + '\n\n이번에는 몬스터의 모험을 들려주는 해설자 역할도 맡는다.',
    messages: [{ role: 'user', content:
`장소: ${place.name}
모험 중에 이 순서대로 일이 벌어진다:
${list}

각 일마다 두 가지를 써줘.
- narration: 그 장면을 보여주는 해설 1~2문장. 몬스터 이름을 써서 3인칭으로. 장소 분위기를 살려서.
- reaction: 그 순간 몬스터가 하는 짧은 말 한마디(위 말투 그대로).
전투는 아직 결과를 모르니 이겼다/졌다는 쓰지 마. 보상 숫자는 바꾸지 마. 일의 개수(${lines.length}개)와 순서를 그대로 지켜.` }],
    schema: obj({ events: { type: 'array', items: obj({ narration: 'string', reaction: 'string' }) } }),
    maxTokens: 3000,
  });
  return out?.events || null;
}

// 모험에서 돌아와 들려주는 모험담
export async function story(S, stats, place, log) {
  return call({
    system: profile(S, stats),
    messages: [{ role: 'user', content:
`방금 ${place.name} 모험에서 둥지로 돌아왔다. 있었던 일:
${log.map(l => `- ${l}`).join('\n')}

주인에게 모험담을 들려줘. 위 말투 그대로, ${S.stage === 'baby' ? '서툰 말로 2~3마디' : '2~4문장'}. 있었던 일만 말하고 지어내지 마.` }],
    maxTokens: 1500,
  });
}

const FX_WORDS = {
  tackle: '몸으로 들이받기', ember: '불덩이 쏘기', flamethrower: '불길 뿜기', slash: '발톱으로 할퀴기', bite: '이빨로 물기',
  rock: '바위 떨어뜨리기', punch: '아주 세게 후려치기', leaf: '잎사귀 날리기', sonic: '음파 쏘기',
  tickle: '간지럼·장난치기', charm: '하트 날리며 애교', growl: '으르렁 겁주기', aura: '기운 끌어올리기', heal: '회복의 빛',
};

// 새 기술 이름 짓기. fx는 정해진 이펙트 중에서 이름에 맞는 걸 고른다
export async function skillName(S, stats, reason, effect, fxChoices) {
  return call({
    system: profile(S, stats) + '\n\n이번에는 이 몬스터가 새로 깨우친 기술의 이름을 짓는다.',
    messages: [{ role: 'user', content:
`${S.name}이(가) ${reason} 새 기술을 깨우쳤다. 효과: ${effect}.
이미 아는 기술: ${S.skills.map(s => s.name).join(', ')} (겹치지 않게).
- name: 기술 이름. 한국어 2~7글자, 귀엽고 게임스럽게. 깨우친 계기와 성격이 묻어나게.
- desc: 기술 설명 한 문장.
- shout: 기술을 쓸 때 몬스터가 외치는 짧은 말(위 말투 그대로, 10글자 안팎).
- fx: 기술 연출. 이 중에서 이름과 어울리는 걸 골라: ${fxChoices.map(f => `${f}(${FX_WORDS[f]})`).join(', ')}` }],
    schema: obj({ name: 'string', desc: 'string', shout: 'string', fx: { type: 'string', enum: fxChoices } }),
    maxTokens: 1500,
  });
}

// 진화 직후 첫마디
export async function evolveLine(S, stats) {
  return call({
    system: profile(S, stats),
    messages: [{ role: 'user', content: '방금 아기 용에서 다 자란 용으로 진화했다. 처음으로 또박또박 말할 수 있게 됐다. 주인에게 하는 첫마디를 해줘.' }],
    maxTokens: 1000,
  });
}
