# CashBoi - Landing Page Template

A modern, fast, and responsive Landing Page built with **React 19**, **Tailwind CSS v4**, and **TypeScript**.

---

## 🎨 Global Color Configuration (গ্লোবাল কালার পরিবর্তন)

পুরো ওয়েবসাইটের কালার একটি নির্দিষ্ট ফাইল থেকেই নিয়ন্ত্রণ করা যায়। 
[`src/index.css`](file:///c:/webens/Cash-Boi/src/index.css) ফাইলে গিয়ে `@theme` ব্লকের কালার কোড পরিবর্তন করলেই পুরো সাইটের বাটন, গ্রেডিয়েন্ট, টেক্সট হাইলাইট, বর্ডার ও ব্যাজের কালার অটোমেটিক আপডেট হয়ে যাবে:

```css
/* src/index.css */
@theme {
  /* Brand / Primary Color */
  --color-primary: #4f46e5;
  --color-primary-hover: #4338ca;
  --color-primary-light: #eef2ff;
  --color-primary-dark: #3730a3;
  --color-primary-muted: rgba(79, 70, 229, 0.12);

  /* Accent Color */
  --color-accent: #06b6d4;
  --color-accent-hover: #0891b2;
  --color-accent-light: #ecfeff;

  /* Gradient Colors for Banners / Logos / Hero */
  --color-brand-from: #4f46e5;
  --color-brand-to: #7c3aed;
}
```

---

## 🚀 Tech Stack

- **Core**: React 19 + React DOM 19
- **Routing**: React Router v7
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Icons**: React Icons
- **Theme**: Dark & Light mode toggle with persistent state
- **Language**: TypeScript with `@/*` aliases

---

## 📁 Project Structure

```text
src/
├── assets/             # Static assets & icons
├── components/
│   ├── common/         # UI primitives (Button, Card, Badge, Input)
│   └── layout/         # Layout components (Navbar, Footer)
├── context/            # Theme context provider
├── hooks/              # Custom hooks (useTheme)
├── layouts/            # Page layout wrapper (RootLayout)
├── pages/              # Landing page (Home.tsx, NotFound.tsx)
├── routes/             # Route configurations
├── types/              # TypeScript types
├── utils/              # Helper utilities (cn, formatters)
├── App.tsx             # Root application
└── index.css           # Tailwind CSS & Global Color Tokens
```

---

## 🛠️ Development Scripts

```bash
# Start development server
npm run dev

# Production build
npm run build

# Code lint check
npm run lint
```
