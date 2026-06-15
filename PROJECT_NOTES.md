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

当前线上版本已经是资源模块版本，关键标记如下：

- `version: "4.0.0"`
- `id: "vod_max_stream_repair_20260615"`
- 包含 `loadResource`
- `loadResource` 的 `type` 为 `stream`

## 当前脚本做了什么

- 保留首页列表加载能力
- 新增详情页资源查找能力
- 进入详情页后会按标题去多个 VOD CMS 源搜索
- 对剧集会尝试匹配季、集
- 对结果做优先级、标题匹配、线路类型筛选

## 下次继续时建议优先做的事

1. 在 Forward 里删除旧模块并重新导入 raw 地址，避免缓存旧版。
2. 实测港剧、综艺、电影各选几部，记录哪些仍然“明明有资源但没命中”。
3. 如果继续优化，优先调整：
   - 标题清洗
   - 港剧/综艺分类加权
   - 剧集集数匹配
   - 资源源池扩展与超时策略

## Git 推送说明

当前本机已经配置并验证过 GitHub SSH：

- `git@github.com:wrs0918/forward-widgets.git`

如果后续需要提交，直接在本地仓库里正常使用 git 即可。
