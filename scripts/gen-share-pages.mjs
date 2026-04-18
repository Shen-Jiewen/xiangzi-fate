// 根据 content.js 生成 8 个静态分享页（带 OG meta）
// 用法：node scripts/gen-share-pages.mjs

import { ARCHETYPES, SITE } from "../assets/content.js";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const outDir = resolve(rootDir, "r");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const escape = (s) => String(s)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

// 假设部署到 xiangzi-fate.pages.dev；改这里即可
const ORIGIN = process.env.PUBLIC_ORIGIN || "https://xiangzi-fate.pages.dev";

const template = (arch) => `<!DOCTYPE html>
<html lang="zh-Hans">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
  <title>${escape(arch.name)} · 骆驼祥子命运测试</title>
  <meta name="description" content="${escape(arch.tagline)} —— ${escape(SITE.title)}" />
  <meta name="theme-color" content="#f4ede1" />

  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escape(arch.name)} · 骆驼祥子命运测试" />
  <meta property="og:description" content="${escape(arch.tagline)}" />
  <meta property="og:image" content="${ORIGIN}/og/${arch.id}.png" />
  <meta property="og:url" content="${ORIGIN}/r/${arch.id}.html" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escape(arch.name)} · 骆驼祥子命运测试" />
  <meta name="twitter:description" content="${escape(arch.tagline)}" />
  <meta name="twitter:image" content="${ORIGIN}/og/${arch.id}.png" />

  <link rel="stylesheet" href="../assets/style.css" />
</head>
<body>
  <main id="app">
    <section class="view">
      <div class="banner">
        <div class="banner-date">${SITE.bannerDate}</div>
        <div class="banner-chapter">檔 · 案 · 館</div>
      </div>

      <h1 class="chapter-title">${escape(arch.name)}</h1>
      <p class="chapter-sub">「${escape(arch.tagline)}」</p>

      <div class="result-card">
        <div class="rc-header">
          <div class="rc-stamp">判詞</div>
          <div class="rc-date">${SITE.bannerDate}</div>
        </div>
        <div class="rc-body">
          <h2 class="rc-name">${escape(arch.name)}</h2>
          <p class="rc-tagline">「${escape(arch.tagline)}」</p>
          <ul class="rc-features">
            ${arch.features.map(f => `<li>${escape(f)}</li>`).join("\n            ")}
          </ul>
          <div class="rc-footer">— 骆驼祥子命运测试 · xiangzi-fate.pages.dev</div>
        </div>
      </div>

      <div class="story-block">
        <h3 class="story-title">他 / 她 的 命</h3>
        <div class="story-text">
          ${arch.story.split(/\n+/).filter(Boolean).map(p => `<p>${escape(p)}</p>`).join("\n          ")}
        </div>
      </div>

      <a class="btn btn-primary share-page-cta" href="${ORIGIN}/">测测你是谁</a>
    </section>
  </main>
</body>
</html>
`;

let count = 0;
for (const arch of ARCHETYPES) {
  const path = resolve(outDir, `${arch.id}.html`);
  writeFileSync(path, template(arch));
  count++;
  console.log(`  wrote ${path}`);
}
console.log(`\n✓ Generated ${count} share pages at ${outDir}`);
