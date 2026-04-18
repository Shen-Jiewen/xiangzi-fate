// 骆驼祥子 · 命运测试 — SPA 逻辑
import { SITE, STARTS, ARCHETYPES, QUESTIONS, KEY_QUESTIONS, SHARE_HINTS } from "./content.js";

const STATE_KEY = "xiangzi-fate-state";
const KEY_WEIGHT = 1.5;

const DIMENSIONS = ["drive", "grit", "calc", "kind"];

// --- 状态 ------------------------------------------------------------

const defaultState = () => ({
  step: "cover",         // cover | start | quiz | result | archive | card
  startId: null,
  answers: [],           // [optionIndex, ...]
  archetypeId: null,     // 决定后再写入
  viewingArchetype: null // 档案馆查看某个原型
});

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {}
}

function resetState() {
  state = defaultState();
  saveState();
}

// --- 计分 ------------------------------------------------------------
// 用户向量 = 所有选项权重加和（从 0 起步，即偏离中性状态）
// 匹配：先减去"随机答题的期望偏移"中心化，再用余弦相似度与每个原型的 delta 比较
// 这样可以避免结果被"所有题平均正权重"系统性拉向 gaoma/huniu

const BIAS = computeRandomBias();

function computeRandomBias() {
  const b = { drive: 0, grit: 0, calc: 0, kind: 0 };
  QUESTIONS.forEach((q, qi) => {
    const m = KEY_QUESTIONS.includes(qi) ? KEY_WEIGHT : 1;
    DIMENSIONS.forEach((d) => {
      const avg = q.options.reduce((s, o) => s + (o.w[d] || 0), 0) / q.options.length;
      b[d] += avg * m;
    });
  });
  return b;
}

function computeVector(answers) {
  const v = { drive: 0, grit: 0, calc: 0, kind: 0 };
  answers.forEach((optIdx, qIdx) => {
    const question = QUESTIONS[qIdx];
    if (!question || optIdx == null) return;
    const option = question.options[optIdx];
    if (!option) return;
    const multiplier = KEY_QUESTIONS.includes(qIdx) ? KEY_WEIGHT : 1;
    DIMENSIONS.forEach((d) => {
      v[d] += (option.w[d] || 0) * multiplier;
    });
  });
  return v;
}

function matchArchetype(userVector) {
  // 中心化：减去随机基线，只看用户相对偏离
  const centered = {};
  DIMENSIONS.forEach((d) => { centered[d] = userVector[d] - BIAS[d]; });

  // 如果用户几乎没偏离（全中性），默认给 laoma（佛系）
  const userMag = Math.sqrt(DIMENSIONS.reduce((s, d) => s + centered[d] ** 2, 0));
  if (userMag < 0.5) return ARCHETYPES.find(a => a.id === "laoma") || ARCHETYPES[0];

  let best = null;
  let bestScore = -Infinity;
  for (const arch of ARCHETYPES) {
    const aDelta = {};
    DIMENSIONS.forEach((d) => { aDelta[d] = arch.vector[d] - 5; });
    const aMag = Math.sqrt(DIMENSIONS.reduce((s, d) => s + aDelta[d] ** 2, 0));
    const dot = DIMENSIONS.reduce((s, d) => s + centered[d] * aDelta[d], 0);
    const score = dot / (userMag * aMag + 0.001);
    if (score > bestScore) {
      bestScore = score;
      best = arch;
    }
  }
  return best;
}

// --- 渲染 ------------------------------------------------------------

const app = document.getElementById("app");

function render() {
  const html = (() => {
    switch (state.step) {
      case "cover":   return renderCover();
      case "start":   return renderStart();
      case "quiz":    return renderQuiz();
      case "result":  return renderResult();
      case "archive": return renderArchive();
      case "card":    return renderArchetypeCard();
      default:        return renderCover();
    }
  })();
  app.innerHTML = html;
  window.scrollTo({ top: 0, behavior: "instant" });
  bindHandlers();
}

function renderCover() {
  return `
    <section class="view cover">
      <div class="banner">
        <div class="banner-date">${SITE.bannerDate}</div>
      </div>
      <h1 class="title">${SITE.title}</h1>
      <p class="subtitle">${SITE.subtitle}</p>
      <div class="divider"></div>
      <p class="lede">${SITE.cover.lede}</p>
      <p class="tagline">${SITE.cover.tagline}</p>
      <button class="btn btn-primary" data-action="to-start">${SITE.cover.startButton}</button>
      <p class="meta">不到五分钟 · 十个问题 · 一张剪报</p>
    </section>`;
}

function renderStart() {
  return `
    <section class="view start">
      <div class="banner">
        <div class="banner-date">${SITE.bannerDate}</div>
        <div class="banner-chapter">第 壹 幕 · 從哪兒開始</div>
      </div>
      <h2 class="chapter-title">你在哪儿落脚？</h2>
      <p class="chapter-sub">每个起点，决定你这辈子头一句话</p>
      <div class="starts-grid">
        ${STARTS.map(s => `
          <div class="start-card" data-action="pick-start" data-start="${s.id}">
            <div class="start-name">${s.name}</div>
            <div class="start-sub">${s.subtitle}</div>
            <div class="start-blurb">${s.blurb}</div>
          </div>
        `).join("")}
      </div>
      <div class="nav-row">
        <button class="btn btn-ghost" data-action="to-cover">返回</button>
      </div>
    </section>`;
}

function renderQuiz() {
  const qIdx = state.answers.length;
  if (qIdx >= QUESTIONS.length) {
    state.step = "result";
    finalizeResult();
    saveState();
    return renderResult();
  }
  const question = QUESTIONS[qIdx];
  const isKey = KEY_QUESTIONS.includes(qIdx);
  return `
    <section class="view quiz">
      <div class="banner">
        <div class="banner-date">${SITE.bannerDate}</div>
        <div class="banner-chapter">第 貳 幕 · 第 ${toCJKNumber(qIdx + 1)} 問${isKey ? " · <span class='key'>要緊題</span>" : ""}</div>
      </div>
      <div class="progress">
        <div class="progress-bar" style="width:${((qIdx) / QUESTIONS.length) * 100}%"></div>
        <div class="progress-label">${qIdx + 1} / ${QUESTIONS.length}</div>
      </div>
      <div class="narration">${question.narration}</div>
      <div class="options-list">
        ${question.options.map((o, i) => `
          <button class="option" data-action="answer" data-opt="${i}">
            <span class="opt-label">${["壹","貳","叁","肆"][i]}</span>
            <span class="opt-text">${o.text}</span>
          </button>
        `).join("")}
      </div>
      <div class="nav-row">
        ${qIdx > 0 ? `<button class="btn btn-ghost" data-action="prev-question">上一题</button>` : ""}
        <button class="btn btn-ghost" data-action="to-cover">放弃</button>
      </div>
    </section>`;
}

function finalizeResult() {
  const v = computeVector(state.answers);
  const arch = matchArchetype(v);
  state.archetypeId = arch.id;
}

function renderResult() {
  const arch = ARCHETYPES.find(a => a.id === state.archetypeId);
  const start = STARTS.find(s => s.id === state.startId);
  if (!arch) return renderCover();
  const story = (start ? start.storyOpening + "\n\n" : "") + arch.story;
  const shareUrl = buildShareUrl(arch.id);

  return `
    <section class="view result">
      <div class="banner">
        <div class="banner-date">${SITE.bannerDate}</div>
        <div class="banner-chapter">尾 聲 · 你 的 判 詞</div>
      </div>
      <div id="result-card" class="result-card">
        <div class="rc-header">
          <div class="rc-stamp">判詞</div>
          <div class="rc-date">${SITE.bannerDate}</div>
        </div>
        <div class="rc-body">
          <h2 class="rc-name">${arch.name}</h2>
          <p class="rc-tagline">「${arch.tagline}」</p>
          <ul class="rc-features">
            ${arch.features.map(f => `<li>${f}</li>`).join("")}
          </ul>
          <div class="rc-footer">— 骆驼祥子命运测试 · xiangzi-fate.pages.dev</div>
        </div>
      </div>

      <div class="story-block">
        <h3 class="story-title">你的命</h3>
        <div class="story-text">${renderStoryHtml(story)}</div>
      </div>

      <div class="share-block">
        <h3 class="share-title">${SITE.shareIntro}</h3>
        <p class="share-hint">${SHARE_HINTS[Math.floor(Math.random() * SHARE_HINTS.length)]}</p>
        <div class="share-actions">
          <button class="btn btn-primary" data-action="download-card">${SITE.downloadCard}</button>
          <button class="btn btn-ghost" data-action="copy-link" data-url="${shareUrl}">${SITE.copyLink}</button>
        </div>
      </div>

      <div class="nav-row">
        <button class="btn btn-ghost" data-action="to-archive">看看其他人的命</button>
        <button class="btn btn-ghost" data-action="restart">${SITE.restart}</button>
      </div>
    </section>`;
}

function renderArchive() {
  return `
    <section class="view archive">
      <div class="banner">
        <div class="banner-date">${SITE.bannerDate}</div>
        <div class="banner-chapter">檔 · 案 · 館</div>
      </div>
      <h2 class="chapter-title">${SITE.archiveIntro}</h2>
      <p class="chapter-sub">${SITE.archiveSubtitle}</p>
      <div class="archive-grid">
        ${ARCHETYPES.map(a => `
          <div class="archive-card ${a.id === state.archetypeId ? 'self' : ''}" data-action="view-archetype" data-arch="${a.id}">
            <div class="ac-name">${a.name}</div>
            <div class="ac-tagline">${a.tagline}</div>
            ${a.id === state.archetypeId ? '<div class="ac-self">← 你是这个</div>' : ''}
          </div>
        `).join("")}
      </div>
      <div class="nav-row">
        <button class="btn btn-ghost" data-action="${state.archetypeId ? 'to-result' : 'to-cover'}">返回</button>
      </div>
    </section>`;
}

function renderArchetypeCard() {
  const arch = ARCHETYPES.find(a => a.id === state.viewingArchetype);
  if (!arch) return renderArchive();
  return `
    <section class="view archetype-view">
      <div class="banner">
        <div class="banner-date">${SITE.bannerDate}</div>
        <div class="banner-chapter">檔 · 案 · 館</div>
      </div>
      <h2 class="chapter-title">${arch.name}</h2>
      <p class="chapter-sub">「${arch.tagline}」</p>
      <ul class="archetype-features">
        ${arch.features.map(f => `<li>${f}</li>`).join("")}
      </ul>
      <div class="story-block">
        <h3 class="story-title">他 / 她 的 命</h3>
        <div class="story-text">${renderStoryHtml(arch.story)}</div>
      </div>
      <div class="nav-row">
        <button class="btn btn-ghost" data-action="to-archive">返回档案馆</button>
      </div>
    </section>`;
}

// --- helpers ---------------------------------------------------------

function renderStoryHtml(text) {
  return text
    .split(/\n+/)
    .filter(Boolean)
    .map(p => `<p>${escapeHtml(p)}</p>`)
    .join("");
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toCJKNumber(n) {
  const digits = ["零","壹","貳","叁","肆","伍","陸","柒","捌","玖","拾"];
  if (n <= 10) return digits[n];
  if (n < 20) return "拾" + digits[n - 10];
  return String(n);
}

function buildShareUrl(archId) {
  const base = window.location.origin + window.location.pathname.replace(/index\.html?$/, "");
  return base.replace(/\/$/, "") + "/r/" + archId + ".html";
}

// --- events ----------------------------------------------------------

function bindHandlers() {
  app.querySelectorAll("[data-action]").forEach(el => {
    el.addEventListener("click", onAction);
  });
}

async function onAction(e) {
  const el = e.currentTarget;
  const action = el.dataset.action;

  switch (action) {
    case "to-cover": {
      state.step = "cover";
      break;
    }
    case "to-start": {
      state.step = "start";
      state.answers = [];
      state.archetypeId = null;
      break;
    }
    case "pick-start": {
      state.startId = el.dataset.start;
      state.step = "quiz";
      state.answers = [];
      break;
    }
    case "answer": {
      const optIdx = parseInt(el.dataset.opt, 10);
      state.answers = [...state.answers, optIdx];
      if (state.answers.length >= QUESTIONS.length) {
        finalizeResult();
        state.step = "result";
      }
      break;
    }
    case "prev-question": {
      state.answers = state.answers.slice(0, -1);
      break;
    }
    case "to-result": {
      state.step = "result";
      break;
    }
    case "to-archive": {
      state.step = "archive";
      break;
    }
    case "view-archetype": {
      state.viewingArchetype = el.dataset.arch;
      state.step = "card";
      break;
    }
    case "restart": {
      resetState();
      break;
    }
    case "copy-link": {
      const url = el.dataset.url;
      try {
        await navigator.clipboard.writeText(url);
        showToast(SITE.copied);
      } catch {
        prompt("复制这个链接：", url);
      }
      return;
    }
    case "download-card": {
      await downloadResultCard();
      return;
    }
  }

  saveState();
  render();
}

function showToast(text) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 300);
  }, 1800);
}

async function downloadResultCard() {
  const card = document.getElementById("result-card");
  if (!card) return;
  showToast(SITE.generating);
  const h2c = await ensureHtml2Canvas();
  try {
    const canvas = await h2c(card, {
      backgroundColor: "#f4ede1",
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const a = document.createElement("a");
    const arch = ARCHETYPES.find(x => x.id === state.archetypeId);
    a.download = `骆驼祥子-${arch ? arch.name : "结果"}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  } catch (err) {
    console.error(err);
    showToast("画剪报时出了点岔子");
  }
}

function ensureHtml2Canvas() {
  if (window.html2canvas) return Promise.resolve(window.html2canvas);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
    s.onload = () => resolve(window.html2canvas);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// --- boot ------------------------------------------------------------

// 若 URL 带 ?viewed=<id>，直接进档案馆查看该原型
const params = new URLSearchParams(window.location.search);
const viewed = params.get("viewed");
if (viewed && ARCHETYPES.find(a => a.id === viewed)) {
  state.viewingArchetype = viewed;
  state.step = "card";
}

render();
