# CLUES LIFE SCORE

**Legal Independence & Freedom Evaluation**

Compare cities across 100 freedom metrics in 6 categories. Part of the CLUES (Comprehensive Location & Utility Evaluation System) platform.

## Features

- 100 Freedom Metrics across 6 categories
- City-to-city comparison
- Real-time scoring with Claude AI + Web Search
- Modern React + TypeScript + Vite stack
- Turnkey Vercel deployment

## Categories

| Category | Metrics | Weight |
|----------|---------|--------|
| Personal Freedom & Morality | 15 | 20% |
| Housing, Property & HOA Control | 20 | 20% |
| Business & Work Regulation | 25 | 20% |
| Transportation & Daily Movement | 15 | 15% |
| Policing, Courts & Enforcement | 15 | 15% |
| Speech, Lifestyle & Culture | 10 | 10% |

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Deploy to Vercel

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit"
   gh repo create clues-life-score --public --push
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel auto-detects Vite - click "Deploy"

3. **Environment Variables (for API integration):**
   ```
   VITE_ANTHROPIC_API_KEY=your-api-key
   ```

## Tech Stack

- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite 7
- **Styling:** CSS with CSS Variables
- **Deployment:** Vercel
- **AI:** Claude Sonnet (for web search scoring)

## Project Structure

```
src/
├── api/          # API services (scoring engine)
├── components/   # React components
├── data/         # 100 metrics definitions
├── hooks/        # Custom React hooks
├── styles/       # Global styles
└── types/        # TypeScript types
```

## License

UNLICENSED - John E. Desautels & Associates
