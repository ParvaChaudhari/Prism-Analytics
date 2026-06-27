# Prism Analytics 🔮

Prism Analytics is a next-generation, AI-powered data analytics platform. It transforms raw CSV datasets into beautiful, interactive dashboards and actionable insights in seconds. 

Say goodbye to complex BI tools. With Prism, you can upload a dataset, run an automated health check, and let the AI instantly generate a comprehensive dashboard tailored to your data.

## ✨ Core Features

- **Automated Data Health Checkup**: Instantly scans uploaded CSVs for missing values, outliers, and type mismatches.
- **One-Click Dashboard Generation**: Automatically builds an interactive dashboard with optimized charts (bar, line, scatter, pie, stats) based on your dataset's schema.
- **Magic AI Charts**: Don't see the chart you want? Just type what you need in plain English (e.g., *"Show me a bar chart of sales by region"*), and Prism's Magic AI will build it instantly.
- **AI Data Analyst Chat**: Talk directly to your data. Ask complex questions and receive deep, contextual insights powered by LLMs.
- **Premium UI/UX**: Built with a sleek, modern, glassmorphic design system featuring fluid animations and a stunning dark mode.

## 🚀 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **AI Integration**: OpenAI / Vercel AI SDK (for Magic AI and Chat)
- **Language**: TypeScript

## 🛠️ Getting Started

First, ensure you have your `.env.local` configured with your Supabase and AI provider credentials.

Then, install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## 📁 Project Structure

- `/app` - Next.js App Router pages and API routes.
- `/components` - Reusable React components (UI, Dashboard, Chat, Auth).
- `/lib` - Core utilities, AI prompts, data parsing, and Supabase clients.
- `/types` - TypeScript type definitions.
- `/docs` - Additional project documentation and plans.

---

> [!WARNING]
> **Disclaimer**: This is a demo project. Prism Analytics AI can make mistakes. Please double-check any generated insights or charts before relying on them for critical decisions.
