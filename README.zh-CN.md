# Agent Context Lens

面向 AI 编程代理的仓库指令调试器。选择任意文件，查看 Codex、Claude Code、Cursor 与 GitHub Copilot 会加载哪些规则、加载顺序、匹配原因、Token 估算和潜在冲突。

## 特点

- 完全本地运行，不上传仓库内容
- 无需 API Key
- 只读，不执行规则中的任何命令
- 支持文件级上下文追踪与多代理对比
- 明确标注 `verified`、`documented`、`inferred`、`unknown` 证据等级
- 检测冲突、重复、失效引用、疑似密钥与危险命令

## 运行

```bash
npm install
npm run build
node apps/cli/dist/index.js serve . --file src/index.ts
```

纯命令行：

```bash
node apps/cli/dist/index.js inspect . --file src/index.ts --agent all
```

## 重要限制

该工具只解析能够从仓库中确定的规则。用户级、企业托管策略和代理内部隐藏提示词不在扫描范围内。Cursor 中由模型根据描述自行选择的规则属于非确定行为，会显示为 `manual`，不会伪装成已确定加载。

详细设计见英文 [README](README.md) 与 [适配器证据说明](docs/ADAPTERS.md)。
