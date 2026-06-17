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

当前这版 `VodMax.js` 是纯资源模块，重点优化了这些问题：

1. 默认只启用实测更稳定的普通影视 VOD 源，慢源和坏源不放进默认源池。
2. 进入 Forward 详情页后，会按标题、季数、集数、日期期数去多个 VOD 源补搜，尽量避免“暂无可用资源”。
3. 增强综艺、港剧、美剧、英剧、韩剧、动漫和电影的命名兼容，减少第二季误匹配第一季的问题。
4. 国内综艺优先按 `episodeName` 里的日期、期号、上中下、先导/加更/纯享/超前/会员版等期身份匹配，`episode` 数字只在没有明确身份时作为弱兜底。
5. 对长篇动漫按全局集数匹配，对第 0 季/OVA/特别篇要求有特别篇证据，避免串到普通季。

这版不是写死某几个片名，而是按 Forward 传入的 `title`、`seriesName`、`episodeName`、`season`、`episode`、`airDate` 等字段做通用补源。

## 源评估

可以用下面的脚本测试候选源质量：

```bash
node scripts/evaluate-sources.js
```

脚本会用电影、港剧、综艺、美剧、英剧、韩剧、动漫关键词测试源的 JSON 可用性、响应速度、命中类型和播放地址提示。

## 回归测试

修改匹配规则后，先跑完整回归测试：

```bash
node scripts/test-vodmax.js
```

测试覆盖电影、续作数字、剧集跨季、国内综艺日期期/普通期/加更期/先导片/上中下/纯享，以及美剧、韩剧、港剧、普通动漫、长篇动漫和第 0 季 OVA，避免修一种类型时影响其他类型。

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
