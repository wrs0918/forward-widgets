# forward-widgets

个人使用的 Forward Widget 仓库，主要用于托管可直接通过 GitHub Raw 导入到 Forward 的模块文件。

## 当前可用模块

### VodMax

路径：`widgets/normal/VodMax.js`

Raw 地址：

```text
https://raw.githubusercontent.com/wrs0918/forward-widgets/main/widgets/normal/VodMax.js
```

### Forward MSaber Adapter

独立项目：

```text
https://github.com/wrs0918/forward-msaber-adapter
```

用于把 Forward 的 MoviePilot 风格服务器订阅请求转接到 MSaber，支持 Docker 部署到 NAS。

## 这个版本做了什么

当前 `VodMax.js` 版本：`5.4.3`。这是纯资源模块，重点优化了这些问题：

1. 默认只启用实测更稳定的普通影视 VOD 源，慢源和坏源不放进默认源池；新增 `电影天堂资源` 为默认快源，`无尽、360、魔都` 等作为 fallback 候选。
2. 进入 Forward 详情页后，会先用快源和精准关键词返回首批结果，结果不足时再查 fallback 源和更宽关键词，避免慢源拖住详情页。
3. 增强综艺、港剧、美剧、英剧、韩剧、动漫和电影的命名兼容，减少第二季误匹配第一季的问题。
4. 国内综艺优先按 `episodeName` 里的期身份匹配，覆盖日期、期号、上中下、先导/序篇、加更/还有加更/特别加更、纯享/舞台纯享、超前营业/超前集结、会员版/APP 专享、彩蛋/花絮/直拍/采访/名场面等平台常见标签。
5. 国内综艺如果已经有明确期身份，`airDate` 只做排序参考，不再一票否决；这样可以兼容 TMDB 日期和 VOD 平台日期相差一天的情况，例如 `第1期下` 不会被误杀或退回 `第4期`。
6. 如果 Forward 没有传 `episodeName`，国内综艺不会再把 `episode=4` 直接当成 `第4期`；会按 VOD 播放列表里的有效节目单顺序兜底，避免 `现在就出发第三季` 第4集显示暂无资源。
7. 资源排序会弱加分 `1080p/HD/蓝光/高码/正片`，并降权 `TC/CAM/抢先/预告/解说/网盘分享页/疑似广告线路`。
8. 对长篇动漫按全局集数匹配，对第 0 季/OVA/特别篇要求有特别篇证据，避免串到普通季。
9. 如果 Forward 的资源模块没有传 `episodeName/airDate`，但传了 `tmdbId + season + episode`，会先用 TMDB 单集接口补全集标题和播出日期，再进入综艺期身份匹配；如果补不到标题，也会走国内综艺播放列表序号兜底。

这版不是写死某几个片名，而是按 Forward 传入的 `title`、`seriesName`、`episodeName`、`season`、`episode`、`airDate` 等字段做通用补源。

## 源评估

可以用下面的脚本测试候选源质量：

```bash
node scripts/evaluate-sources.js
```

脚本会用电影、港剧、综艺、美剧、英剧、韩剧、动漫关键词测试源的 JSON 可用性、响应速度、命中类型、播放地址提示、高清提示和广告/网盘风险提示。输出里的 `hdHint` 表示清晰度提示命中数，`adRisk` 表示疑似广告、网盘、抢先版等风险提示命中数。

## 回归测试

修改匹配规则后，先跑完整回归测试：

```bash
node scripts/test-vodmax.js
```

测试覆盖电影、续作数字、剧集跨季、国内综艺日期期/普通期/加更期/先导片/上中下/纯享/超前/会员/直拍，以及美剧、韩剧、港剧、普通动漫、长篇动漫和第 0 季 OVA，避免修一种类型时影响其他类型。

国内综艺命名对照可以用下面的只读脚本查看：

```bash
node scripts/compare-variety-identity.js
```

脚本会把爱奇艺、腾讯视频、优酷、芒果 TV、B站常见节目单命名样式，以及 VOD 源播放列表标签，统一输出成日期、期号、上下篇和正片/加更/纯享/超前等期身份字段。

动漫匹配对照可以用下面的只读脚本查看：

```bash
node scripts/compare-anime-matching.js
```

脚本会展示新番别名、长篇动漫全局集数、第 0 季/OVA 的搜索关键词、匹配模式和最终资源。

## 如何导入到 Forward

在 Forward 中添加 Widget 时，直接填入上面的 Raw 地址即可。

如果后续更新了脚本，只要仓库路径不变，Raw 地址也可以继续复用。

## 原始项目与致谢

本仓库是在个人使用场景下维护的 Forward Widget 集合，感谢下面项目和作者提供的基础能力、开发文档和原始实现思路：

1. [ForwardWidgets](https://github.com/InchStudio/ForwardWidgets)：Forward Widget 官方示例与开发文档，本仓库的模块结构和 `stream` 资源模块接入方式参考了该项目。
2. [MakkaPakka518/FW - VodMax.js](https://github.com/MakkaPakka518/FW/blob/main/widgets/normal/VodMax.js)：原始 VodMax 资源聚合模块，本仓库的 `VodMax.js` 在其思路基础上做了源池筛选、季集匹配、国内综艺期身份匹配、长篇动漫和第 0 季/OVA 等自用增强。

如果你需要更通用或更贴近官方示例的 Widget，可以优先查看原始项目；本仓库主要服务于作者自己的 Forward 使用习惯和 NAS/家庭网络环境。

## 仓库结构

```text
widgets/
  normal/
    VodMax.js
scripts/
  evaluate-sources.js
  test-vodmax.js
  compare-variety-identity.js
  compare-anime-matching.js
```

## 说明

本仓库目前主要用于自用和测试。后续如果增加新的 Widget，也会继续放在 `widgets/` 目录下统一管理。
