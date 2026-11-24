
# Build, Break, Paint!

A 3D sandbox game where you can build, break, and paint blocks.

<p align="center">
  <a href="./README.md">🇬🇧 English</a> |
  <a href="./README.vi.md">🇻🇳 Tiếng Việt</a> |
  <a href="./README.zh.md">🇨🇳 中文</a>
</p>

<p align="center">
  <a href="https://google.com/">
    <strong>🎮 Play Build, Break, Paint!</strong>
  </a>
</p>

## ✨ Features

- 3D block sandbox
- Build, Break, and Paint tools
- Custom block colors
- Save and load worlds
- Automatic saving
- Multiplayer public world
- Shared block editing
- Player movement synchronization
- Realtime multiplayer chat
- Mobile joystick and jump button
- Keyboard controls
- English, Vietnamese, and Chinese languages

## 🎮 Controls

### Desktop

| Key | Action |
|---|---|
| W / ↑ | Move forward |
| A / ← | Move left |
| S / ↓ | Move backward |
| D / → | Move right |
| Space | Jump |
| Mouse | Look around and interact |

### Mobile

- Use the joystick to move.
- Press the jump button to jump.
- Tap blocks to interact with them.

## 🛠️ Requirements

- Node.js 20.9 or newer
- npm
- A Supabase project

## 📦 Installation

Clone the repository:

```bash
git clone https://github.com/tluong-678/BuildBreakPaint.git
cd BuildBreakPaint
npm install
```

## 🔐 Supabase Setup

1. Create a project at [Supabase](https://supabase.com).
2. Copy `.env.example` to `.env.local`.
3. Configure your Supabase URL and public key.
4. Open the Supabase SQL Editor.
5. Run the SQL in `supabase/schema.sql`.

Example `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Never expose your Supabase service-role key in browser code.

## 🚀 Run Locally

```bash
npm run dev
```

Open http://localhost:3000.

## 🏗️ Production Build

```bash
npm run build
npm run start
```

## 🌐 Official Website

finding LOL

## 📁 GitHub Repository

[https://github.com/tluong-678/BuildBreakPaint](https://github.com/tluong-678/BuildBreakPaint)

## 📝 Notes

This project is still under development.

Some features may require additional configuration or improvements.

Google sign-in requires additional Supabase and Google Cloud configuration.
