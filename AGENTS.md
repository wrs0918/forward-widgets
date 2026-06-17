# forward-widgets 开发规范

这个仓库主要托管可被 Forward 通过 GitHub Raw 直接导入的 Widget。当前核心模块是 `widgets/normal/VodMax.js`，它是纯 `stream` 资源模块，不负责首页、列表页或其他 UI 模块兼容。

## 通用原则

- 默认用中文维护项目文档，代码里的作者名保持 `工位划水冠军`。
- `VodMax.js` 需要保持单文件可运行，除非确认 Forward 支持跨文件依赖，否则不要把运行时代码拆成 import 模块。
- 不要为了某一部片、某一个综艺、某一个动漫写死专用匹配逻辑。新增规则必须能解释为通用命名规律，并补回归样本。
- 不要恢复具体作品别名兜底表。标题别名优先来自 Forward 字段、TMDB、Wikidata、TVMaze、Jikan、Bangumi 等动态来源；本地只保留繁简、异体字、常见写法差异这类通用归一化。
- 源池调整必须基于测试结果。慢、坏、非 JSON、广告/网盘风险高或命中率低的源不要放进默认源池。
- 每次修改都要检查是否需要同步 `README.md`、版本号和测试说明。影响用户行为、匹配规则、源池、文档入口时必须更新版本。

## VodMax 匹配边界

- 国内综艺不能优先相信 Forward/TMDB 的 `episode` 数字。只要有 `episodeName`、TMDB 单集标题、日期、期号、上中下、先导/加更/纯享/超前/会员版等身份信息，就优先按期身份匹配。
- Forward 有时不会把详情页可见的单集标题传进资源模块；此时允许用 `tmdbId + season + episode` 通过 `Widget.tmdb.get` 补单集标题和播出日期。
- 国内综艺有明确期身份时，`airDate` 只作为排序或辅助信号，不要一票否决不同日期的 VOD 标签，因为 TMDB 与平台日期可能差一天。
- 普通剧集、美剧、英剧、韩剧、港剧仍要保持严格季集匹配，避免第一季误入第二季或反过来。
- 长篇动漫优先利用 VOD 总集数、播放列表长度和全局集数匹配，不依赖作品名单。
- 第 0 季、OVA、SP、特别篇必须有特别篇证据，宁可少返回，也不要回落到普通季第 1 集。
- 动漫、综艺、普通剧集的规则要互相隔离。动漫外部别名源不能污染综艺搜索，综艺期身份也不能影响普通剧集。

## 代码维护

- 优先做低风险修改：增加测试、注释、文档、源评估，再调整匹配分数。
- 如果要改 `VodMax.js` 评分，先定位对应层级：搜索候选评分、播放分组评分、单集匹配评分、最终过滤。不要在多个层级同时大改。
- 复杂正则要配套测试样本，尤其是国内综艺的 `第N期/上中下/先导/加更/还有加更/纯享/超前/会员版/花絮`。
- 不要删除已经覆盖的回归样本，除非确认样本本身已经失效，并在提交说明里写清楚原因。
- 保持返回项包含 Forward 可用的 `name`、`description`、`url`。

## 提交前检查

至少执行：

```bash
node --check widgets/normal/VodMax.js
node scripts/test-vodmax.js
```

涉及动漫或综艺规则时继续执行：

```bash
node scripts/compare-anime-matching.js
node scripts/compare-variety-identity.js
```

涉及源池时继续执行：

```bash
node scripts/evaluate-sources.js
```

提交前再执行：

```bash
git diff --check
git status --short
```

确认通过后提交并推送到 GitHub。
