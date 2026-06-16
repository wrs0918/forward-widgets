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

测试覆盖电影、续作数字、剧集跨季、国内综艺日期期/普通期/加更期，以及美剧和动漫，避免修综艺时影响其他类型。

## 如何导入到 Forward

在 Forward 中添加 Widget 时，直接填入上面的 Raw 地址即可。

如果后续更新了脚本，只要仓库路径不变，Raw 地址也可以继续复用。

## 仓库结构

```text
widgets/
  normal/
    VodMax.js
scripts/
  evaluate-sources.js
  test-vodmax.js
```

## 说明

本仓库目前主要用于自用和测试。后续如果增加新的 Widget，也会继续放在 `widgets/` 目录下统一管理。
