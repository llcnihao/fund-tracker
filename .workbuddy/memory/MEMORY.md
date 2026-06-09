# 基金追踪面板 - 项目备忘录

## 项目概述
- 类型：基金/ETF 收益率实时追踪面板
- 参考：web.345569.xyz
- 用户 GitHub: llcnihao, 仓库: fund-tracker

## 技术栈
- 前端：React 19 + TypeScript + Vite + Tailwind CSS
- 爬虫：Python 3 + requests
- 定时：GitHub Actions
- 数据源：天天基金网 API

## 关键文件
- 前端代码：app/src/App.tsx
- 爬虫脚本：app/scripts/crawler.py
- GitHub Actions：.github/workflows/update-funds.yml
- 数据输出：data/data.json
- 前端数据 URL：https://raw.githubusercontent.com/llcnihao/fund-tracker/main/data/data.json

## 部署流程
1. 上传代码到 GitHub
2. 启用 Actions (Settings > Actions > Read and write)
3. 手动触发爬虫
4. 本地 npm run dev 或用 CloudStudio 部署

## 用户环境
- 无代理，国内网络
- 已安装 Git for Windows
- 使用 Windows
