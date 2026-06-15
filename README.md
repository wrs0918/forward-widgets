# forward-widgets

个人使用的 Forward Widget 仓库，主要用于托管可直接通过 GitHub Raw 导入到 Forward 的模块文件。

## 当前可用模块

### VodMax

路径：`widgets/normal/VodMax.js`

Raw 地址：

```text
https://raw.githubusercontent.com/wrs0918/forward-widgets/main/widgets/normal/VodMax.js
```

## 这个版本做了什么

当前这版 `VodMax.js` 重点优化了两个问题：

1. 默认优先更快、更稳定、命中更高的 VOD 源。
2. 从 Forward 首页点进详情后，如果当前源没有可播线路，会自动按标题去更多 VOD 源补搜，尽量避免“暂无可用资源”。

这版不是写死某几个片名，而是按当前条目的标题、年份、分类信息做通用补源。

## 如何导入到 Forward

在 Forward 中添加 Widget 时，直接填入上面的 Raw 地址即可。

如果后续更新了脚本，只要仓库路径不变，Raw 地址也可以继续复用。

## 仓库结构

```text
widgets/
  normal/
    VodMax.js
```

## 说明

本仓库目前主要用于自用和测试。后续如果增加新的 Widget，也会继续放在 `widgets/` 目录下统一管理。
