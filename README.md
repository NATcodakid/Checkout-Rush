# Checkout Rush 🛒

A 3D educational checkout game that helps kids ages 7–9 build practical number sense, addition fluency, and making-change skills through fast-paced, engaging gameplay.

## Play

Open `index.html` in any modern browser — no build step, no install required.

Or serve locally:
```bash
python3 -m http.server 8080
# Then open http://localhost:8080
```

## How It Works

You're a cashier! Customers bring items to your checkout counter. Your job:

1. **See the items** and their prices on the counter
2. **Check the total** — the game adds them up for you
3. **Customer pays** with a bill (e.g., $5)
4. **Make change** — click coins and bills from the cash drawer to return the correct amount
5. **Keep your streak going** for bonus points!

## Difficulty Levels

| Level | Items | Max Total | Timer | Hints |
|-------|-------|-----------|-------|-------|
| **Easy** | 1–2 | $10 | None | Strong visual help |
| **Medium** | 2–3 | $20 | 30s | Subtle hints |
| **Hard** | 3–4 | $50 | 20s | No hints |

## Tech Stack

- **Three.js** (r160) — 3D scene via ES module imports from CDN
- **Vanilla JavaScript** — game logic, UI, analytics
- **HTML/CSS** — all UI overlays, responsive design
- **No build tools** — runs directly in browser

## Project Structure

```
checkout-rush/
├── index.html          ← Entry point
├── css/
│   └── style.css       ← All styling
├── js/
│   ├── main.js         ← Game controller & UI
│   ├── scene.js        ← Three.js 3D scene
│   ├── gameData.js     ← Items, levels, round generator
│   └── analytics.js    ← Session tracking for Evidence Pack
└── README.md
```

## Educational Design

The math is **embedded in the gameplay**, not bolted on as a quiz:
- Players must **add item prices** to understand totals
- Players must **calculate change** (subtraction in context)
- Players practice **coin/bill value recognition**
- Difficulty scales from simple single-dollar amounts to complex multi-item transactions

## Analytics (for Evidence Pack)

The game automatically tracks:
- Sessions played, duration, scores
- Accuracy per session
- Most-missed change amounts
- Improvement over time (compares first vs. last quarter of sessions)

Access analytics in the browser console:
```javascript
import { Analytics } from './js/analytics.js';
console.log(Analytics.getSummary());
```

## Credits

- **Fonts**: [Fredoka](https://fonts.google.com/specimen/Fredoka), [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts
- **3D Engine**: [Three.js](https://threejs.org/) (r160)
- All 3D models are procedurally generated using Three.js primitives
