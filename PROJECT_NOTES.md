# Forward Widgets Project Notes

## 当前仓库

- 本地仓库路径：`/Users/gongweihuashui/forward-widgets`
- GitHub 仓库：`wrs0918/forward-widgets`
- 当前主要模块：`widgets/normal/VodMax.js`

## 当前可用地址

- 仓库文件页：
  - `https://github.com/wrs0918/forward-widgets/blob/main/widgets/normal/VodMax.js`
- Forward 导入地址：
  - `https://raw.githubusercontent.com/wrs0918/forward-widgets/main/widgets/normal/VodMax.js`

## 这次改动的关键结论

Forward 详情页资源加载不能只靠普通 `list` 模块。

要让进入影视详情页后自动查资源，模块里必须包含资源模块配置：

- `id: "loadResource"`
- `functionName: "loadResource"`
- `type: "stream"`

如果只有普通列表模块，即使首页能看到模块，进入详情页时也可能仍然显示“暂无资源”。

## 当前 VodMax.js 的状态

当前版本是纯资源模块版本，关键标记如下：

- `version: "5.0.0"`
- `id: "vod_max_stream_smart_20260615"`
- 包含 `loadResource`
- `loadResource` 的 `type` 为 `stream`
- 不再包含首页 `list` 模块

## 当前脚本做了什么

- 只做详情页资源查找能力
- 进入详情页后会按标题去多个 VOD CMS 源搜索
- 对综艺、剧集、动漫会尝试匹配季、集、期、日期期数
- 对电影会优先完整标题，避免预告、解说、旧作抢占
- 对结果做优先级、标题匹配、线路类型筛选
- 慢源、坏源、非 JSON 源不放进默认高优先级源池

## 源评估脚本

- 路径：`scripts/evaluate-sources.js`
- 命令：`node scripts/evaluate-sources.js`
- 覆盖：电影、港剧、综艺、美剧、英剧、韩剧、动漫
- 输出：命中类型数、播放地址提示、错误数、平均响应时间、样例命中

## 回归测试脚本

- 路径：`scripts/test-vodmax.js`
- 命令：`node scripts/test-vodmax.js`
- 覆盖：电影完整标题、续作数字空格、剧集第一/第二季防串季、国内综艺日期期/普通期/加更期、美剧、动漫
- 规则：修改 `VodMax.js` 匹配逻辑后必须先跑此脚本，避免修综艺时影响其他类型

## 下次继续时建议优先做的事

1. 在 Forward 里删除旧模块并重新导入 raw 地址，避免缓存旧版。
2. 实测港剧、综艺、电影、美剧、英剧、韩剧、动漫各选几部，记录哪些仍然“明明有资源但没命中”。
3. 如果继续优化，优先调整：
   - 标题清洗
   - 综艺季/期兼容
   - 剧集/动漫集数匹配
   - 资源源池扩展与超时策略

## Git 推送说明

当前本机已经配置并验证过 GitHub SSH：

- `git@github.com:wrs0918/forward-widgets.git`

如果后续需要提交，直接在本地仓库里正常使用 git 即可。
