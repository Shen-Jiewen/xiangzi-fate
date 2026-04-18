# 骆驼祥子 · 命运测试

一次关于宿命的黑色幽默——老北平人物 × 当代生存焦虑。

灵感来自 [百年孤独版命运测试](https://www.readinglife.com/meks.html)，换成《骆驼祥子》+黑色幽默基调。

## 技术栈

- 纯静态：HTML + CSS + ES Module JS，无框架、无构建步骤
- 计分：四维人格向量（卷度/韧性/算计/善意）+ 中心化余弦相似度
- 结果导出：`html2canvas`（CDN 引入），生成 PNG 剪报
- 分享：8 个预生成的 `r/<id>.html` 静态页，带 OG 标签

## 本地预览

```bash
python3 -m http.server 8000
# 访问 http://localhost:8000
```

## 重新生成分享页

改完 `assets/content.js` 后跑一遍：

```bash
node scripts/gen-share-pages.mjs
```

## 部署（Cloudflare Pages）

1. 推到 GitHub（仓库可以公开）
2. CF Pages Dashboard → Create project → Connect to Git
3. Build output directory 填 `/`（根目录就是构建产物，无构建命令）
4. 拿 `xxx.pages.dev` 域名

或者用 wrangler 直接推：

```bash
npx wrangler pages deploy . --project-name=xiangzi-fate
```

## 文件结构

```
xiangzi-fate/
├── index.html              SPA 入口
├── assets/
│   ├── content.js          题目、原型、文案（所有内容在这里）
│   ├── app.js              逻辑（视图切换、计分、持久化）
│   └── style.css           民国报刊风样式
├── r/<id>.html             8 个原型的静态分享页
├── scripts/
│   └── gen-share-pages.mjs 生成分享页
├── docs/specs/             设计文档
└── README.md
```

## 后续 TODO

- 为每个原型生成静态 OG 图（当前 `og:image` 指向尚不存在的 `/og/<id>.png`，微信/钉钉预览会没有缩略图）
- 绑定自定义域名
- 统计：若需要轻量分析，可接 Plausible 或 Umami（目前无追踪）

## License

MIT
