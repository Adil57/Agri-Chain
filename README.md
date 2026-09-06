# 🌾 AgriChain — Setup & Deploy Guide

AI-powered platform connecting farmers directly with buyers.
Frontend: **React + Vite + Tailwind** · Backend: **Node + Express + SQLite** · AI grading: **Gemini** · 4 languages (English base + Hinglish + Hindi + Marathi).

---

## 📁 Project structure
```
agrichain-project/
├── frontend/          # React + Vite app
│   ├── src/
│   │   ├── pages/     # Landing, Login, Farmer, B2B, B2C, AI, Orders
│   │   ├── components/# Navbar, LanguageSwitcher, CartDrawer, TrackModal...
│   │   └── i18n/      # translation engine + dicts (en/hinglish/hi/mr)
│   ├── .env.example   # copy to .env
│   └── scripts/gen-i18n.mjs   # regenerate Hindi/Marathi translations
└── backend/           # Express API
    ├── server.js
    └── .env.example   # copy to .env  (PUT YOUR GEMINI KEYS HERE)
```

---

## 🚀 Local setup (run on your machine / server)

### 1. Backend
```bash
cd agrichain-project/backend
cp .env.example .env         # then edit .env and add your keys (see below)
npm install
node server.js               # runs on http://localhost:4000
```

### 2. Frontend (new terminal)
```bash
cd agrichain-project/frontend
cp .env.example .env         # set VITE_API_URL if backend isn't on localhost:4000
npm install
npm run dev                  # dev server: http://localhost:5173
# OR for production:
npm run build && npm run preview
```

Open the frontend URL. Demo login: **ramesh@demo.in** / **demo1234**

---

## 🔑 Environment variables (.env)

**backend/.env** — fill these:
```
PORT=4000
JWT_SECRET=<any-long-random-string>
CLIENT_ORIGIN=http://localhost:5173
GEMINI_KEYS=<your-gemini-key-1>,<your-gemini-key-2>   # comma-separated, auto-rotated
GEMINI_MODELS=gemini-2.5-flash
RAZORPAY_KEY_ID=      # optional
RAZORPAY_KEY_SECRET=  # optional
```

**frontend/.env**:
```
VITE_API_URL=http://localhost:4000
```

> ⚠️ **The keys I sent you go in `backend/.env` ONLY. Never commit `.env` to GitHub.**
> The `.gitignore` is already set up to block it — don't remove those lines.

---

## 🌐 Language system (4 languages)

- **English** = base language (source of truth in code).
- **Hinglish, Hindi, Marathi** switch instantly via the 🌐 button in the navbar (every page).
- Fully **offline** — no Google Translate, no runtime API. Translations are baked into the app.

### Regenerate Hindi/Marathi (only if you add/change English text)
```bash
cd agrichain-project/frontend
# 1. re-extract English keys (if you added new t('...') strings):
#    keys live in src/i18n/keys.json
# 2. regenerate:
node scripts/gen-i18n.mjs      # writes src/i18n/dicts/hi.js + mr.js
npm run build
```
To edit any translation by hand, open `src/i18n/dicts/hi.js`, `mr.js`, or `hinglish.js`.

---

## 📲 Push to GitHub from Termux

> Do this from inside the `agrichain-project` folder on your phone.

### First time (setup):
```bash
# install git in Termux if not already
pkg install git -y

# tell git who you are
git config --global user.name "Adil"
git config --global user.email "your-email@example.com"

cd agrichain-project
git init
git add .
git status          # CHECK: make sure NO .env file is listed (only .env.example)
git commit -m "AgriChain: 4-language support + full app"
```

### Create the repo on GitHub, then connect + push:
```bash
# replace with YOUR repo url
git remote add origin https://github.com/<your-username>/agrichain.git
git branch -M main
git push -u origin main
```
GitHub will ask for username + a **Personal Access Token** (not your password).
Make one at: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → generate with `repo` scope. Paste it as the password.

### Later pushes (after changes):
```bash
cd agrichain-project
git add .
git commit -m "describe your change"
git push
```

---

## ✅ Safety checklist before pushing public
- [ ] `git status` shows **`.env.example`** but NOT `.env`
- [ ] `node_modules/` and `dist/` are not staged (gitignore handles this)
- [ ] Your real Gemini keys are only in `backend/.env` (which stays local)

If you *ever* accidentally commit a key: delete that key in Google AI Studio and generate a new one — a leaked key is compromised for good.
