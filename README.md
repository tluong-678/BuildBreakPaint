
# Build, Break, Paint!

A browser-based 3D sandbox game where you can build, break, and paint blocks.

Official website: https://buildbreakpaint.netlify.app

> This project is an independent game project. You may use it as a reference, but please make your own changes and improvements.

## Features

- 3D block sandbox
- Build, Break, and Paint tools
- Custom block colors
- Save and load worlds
- Automatic world saving
- Multiplayer public world
- Shared block editing
- Player movement synchronization
- Realtime multiplayer chat
- Mobile joystick and jump button
- Keyboard controls for desktop
- English, Vietnamese, and Chinese language support

## Controls

### Computer

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

## Requirements

- Node.js 20.9 or newer
- npm
- A Supabase project

Google OAuth credentials are optional.

## Installation

Clone the repository:

```bash
git clone https://github.com/tluong-678/BuildBreakPaint.git
```

Open the project folder:

```bash
cd BuildBreakPaint
```

Install dependencies:

```bash
npm install
```

## Supabase Setup

1. Create a project at https://supabase.com.
2. Copy `.env.example` to `.env.local`.
3. Add your Supabase project URL and public key.
4. Open the Supabase SQL Editor.
5. Run the SQL from `supabase/schema.sql`.

Example environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Never put your Supabase service-role key in browser code.

## Run the Game

Start the development server:

```bash
npm run dev
```

Open:

http://localhost:3000

## Production Build

Build the project:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

## Deployment

The official website is hosted at:

https://buildbreakpaint.netlify.app

You can deploy your own copy using Netlify or another platform that supports Next.js.

Configure the required environment variables in your hosting platform before deployment.

## Languages

The game supports:

- English
- Vietnamese
- Chinese

Language settings are managed by the project's language system.

## Authentication

The project includes authentication features such as:

- Username and password
- Google sign-in, when configured

Google authentication may require additional Supabase and Google Cloud configuration.

## Project

GitHub repository:

https://github.com/tluong-678/BuildBreakPaint

Official website:

finding LOL

## Disclaimer

This project is a work in progress.

Some features may be incomplete or require additional configuration.

Please report bugs and contribute improvements through the GitHub repository.
