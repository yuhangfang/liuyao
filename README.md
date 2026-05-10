# Liuyao Divination Assistant

A React + TypeScript web app for Liuyao (Six-Line) divination.  
Users enter a question and divination time, set six coin groups to generate the primary and changing hexagrams, review structured hexagram details, and use AI models for layered interpretation and follow-up Q&A.

## English

### Product Overview

This project turns the traditional Liuyao process into an interactive product with three main goals:

- Lower the entry barrier with click-based coin input
- Improve readability with structured hexagram presentation
- Support decision-making with AI-assisted interpretation and follow-up

It is suitable for personal divination, Liuyao learning, and demos of a "rule-based charting + AI explanation" workflow.

### Key Features

- Interactive six-group coin charting (`字/花` toggle)
- Automatic primary/changing hexagram generation (including moving lines)
- Structured panel for six gods, six relations, shi/ying, hidden spirits, stems/branches, and five elements
- Beijing-time divination with local timezone display
- AI interpretation and follow-up chat with streaming output
- Multiple model providers: OpenAI / Anthropic / Google / DeepSeek

### Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS

### Quick Start

#### 1) Install dependencies

```bash
npm install
```

#### 2) Configure environment variables

Create `.env.local` in the project root and set one or more API keys:

```bash
NEXT_PUBLIC_OPENAI_API_KEY=
NEXT_PUBLIC_ANTHROPIC_API_KEY=
NEXT_PUBLIC_GOOGLE_API_KEY=
NEXT_PUBLIC_DEEPSEEK_API_KEY=
```

> At least one valid key is required for model selection in the AI panel.

#### 3) Start development server

```bash
npm run dev
```

### Build and Preview

```bash
npm run build
npm run preview
```

### Usage Flow

1. Enter your question
2. Select/sync divination time (Beijing time)
3. Set six coin groups from bottom line to top line
4. Click `起卦` to generate the hexagram result
5. Click `解卦` to get AI interpretation
6. Ask follow-up questions with more context to refine guidance

### Notes

- This project is for divination charting and analysis assistance only.
- Different schools may vary in detailed rules (e.g., use-god selection, hidden movement).

---

## 中文

# 六爻起卦与解卦助手

一个基于 React + TypeScript 的六爻起卦产品。  
用户输入占问与起卦时间，按六组硬币结果排出本卦/变卦，并查看六神、六亲、世应、伏神等信息；随后可调用多厂商大模型进行分层解卦与追问。

## 产品介绍

本项目把传统六爻流程做成了可交互网页，核心目标是：

- 降低起卦门槛：用点击硬币的方式完成六爻记录
- 提升可读性：结构化展示本卦、变卦、世应、六神、伏神与爻位关系
- 辅助决策：通过 AI 进行多层次解读，并支持继续追问细节

适合用于个人占问、学习六爻排盘逻辑，以及快速演示「规则排盘 + AI 解释」的产品形态。

## 主要功能

- 六组硬币交互排卦（字/花切换，自动判定老阴/少阳/少阴/老阳）
- 本卦与变卦自动生成（含动爻变化）
- 卦面信息展示（六神、六亲、世应、伏神、干支与五行）
- 北京时间起卦与本地时区显示
- AI 解卦与追问（流式输出，分层分析）
- 多模型可选：OpenAI / Anthropic / Google / DeepSeek

## 技术栈

- React 18
- TypeScript
- Vite
- Tailwind CSS

## 快速开始

### 1) 安装依赖

```bash
npm install
```

### 2) 配置环境变量

在项目根目录创建 `.env.local`，按需填写任意一家或多家的 API Key：

```bash
NEXT_PUBLIC_OPENAI_API_KEY=
NEXT_PUBLIC_ANTHROPIC_API_KEY=
NEXT_PUBLIC_GOOGLE_API_KEY=
NEXT_PUBLIC_DEEPSEEK_API_KEY=
```

> 至少配置一个可用 Key，页面中的 AI 模型下拉框才会出现可选项。

### 3) 启动开发环境

```bash
npm run dev
```

默认会启动 Vite 本地开发服务。

## 构建与预览

```bash
npm run build
npm run preview
```

## 使用流程

1. 输入占问内容
2. 选择/同步起卦时间（北京时间）
3. 从下到上设置六爻硬币结果
4. 点击「起卦」查看卦象结果
5. 点击「解卦」获取 AI 分析
6. 在右侧继续追问，结合具体背景修正判断

## 说明

- 本项目用于六爻排盘与分析辅助，不替代专业判断。
- 不同流派对取用神、暗动等细则存在差异，建议结合你的体系解读。
