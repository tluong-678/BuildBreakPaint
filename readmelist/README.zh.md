
# Build, Break, Paint!

一个 3D 沙盒游戏，你可以在其中建造、破坏和给方块上色。

<p align="center">
  <a href="README.md">🇬🇧 English</a> |
  <a href="README.vi.md">🇻🇳 Tiếng Việt</a> |
  <a href="README.zh.md">🇨🇳 中文</a>
</p>

<p align="center">
  <a href="https://google.com/">
    <strong>🎮 开始游戏</strong>
  </a>
</p>

## ✨ 游戏功能

- 3D 方块沙盒
- 建造、破坏和涂色工具
- 自定义方块颜色
- 保存和加载世界
- 自动保存
- 多人公共世界
- 共同编辑方块
- 玩家移动同步
- 实时多人聊天
- 手机摇杆和跳跃按钮
- 键盘控制
- 支持英语、越南语和中文

## 🎮 操作方式

### 电脑

| 按键 | 操作 |
|---|---|
| W / ↑ | 向前移动 |
| A / ← | 向左移动 |
| S / ↓ | 向后移动 |
| D / → | 向右移动 |
| Space | 跳跃 |
| 鼠标 | 查看周围并进行互动 |

### 手机

- 使用摇杆移动。
- 点击跳跃按钮进行跳跃。
- 点击方块进行互动。

## 🛠️ 环境要求

- Node.js 20.9 或更高版本
- npm
- Supabase 项目

## 📦 安装

克隆仓库：

```bash
git clone https://github.com/tluong-678/BuildBreakPaint.git
cd BuildBreakPaint
npm install
```

## 🔐 配置 Supabase

1. 在 [Supabase](https://supabase.com) 创建项目。
2. 将 `.env.example` 复制为 `.env.local`。
3. 配置 Supabase URL 和公开密钥。
4. 打开 Supabase SQL Editor。
5. 执行 `supabase/schema.sql` 中的 SQL。

`.env.local` 示例：

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

不要在浏览器代码中公开 Supabase service-role 密钥。

## 🚀 本地运行

```bash
npm run dev
```

打开 http://localhost:3000。

## 🏗️ 生产环境构建

```bash
npm run build
npm run start
```

## 🌐 官方网站

nope

## 📁 GitHub 仓库

[https://github.com/tluong-678/BuildBreakPaint](https://github.com/tluong-678/BuildBreakPaint)

## 📝 说明

本项目仍在开发中。

部分功能可能需要额外配置或改进。

Google 登录需要在 Supabase 和 Google Cloud 中进行额外配置。
