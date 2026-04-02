# Deployment Guide — BarrierFree-Web

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude Haiku typo correction |

The `/api/typo-check` route uses Edge Runtime and calls `claude-haiku-4-5-20251001`. Without this key the route returns a 500 with graceful fallback (original text returned, no crash).

---

## Deploying to Vercel

### First deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (preview)
vercel

# Add environment variable
vercel env add ANTHROPIC_API_KEY

# Promote to production
vercel --prod
```

### Subsequent deployments

Push to the `main` branch. Vercel auto-deploys on every push if the project is linked via the Vercel dashboard.

```bash
git push origin main
```

---

## Local Development

```bash
cp .env.example .env.local
# Edit .env.local and set ANTHROPIC_API_KEY

npm install
npm run dev
# → http://localhost:3000
```

---

## Vercel Project Settings

The `vercel.json` at the project root sets `"framework": "nextjs"`. No additional configuration is required for the standard Next.js 14 App Router setup.

The `/api/typo-check` route uses `export const runtime = 'edge'` and is deployed as a Vercel Edge Function automatically.

---

## Monitoring

- **Deployments**: Vercel dashboard → Project → Deployments tab
- **Edge Function logs**: Vercel dashboard → Project → Functions tab → `api/typo-check`
- **Build logs**: Vercel dashboard → Deployment detail → Build Logs

---

## How to Update and Redeploy

1. Make changes locally
2. Run `npm run build` to verify no build errors
3. Commit and push to `main`
4. Vercel auto-deploys; monitor the Deployments tab for status

---

## Browser Requirements

| Browser | Platform | TTS Support |
|---------|----------|-------------|
| Chrome 90+ | macOS, Windows | ✅ Full |
| Safari 15+ | macOS | ✅ Full |
| Firefox | Any | ⚠️ Limited (SpeechSynthesis varies) |
| Mobile browsers | iOS/Android | ⚠️ Not targeted for v1 |

The app requires `window.speechSynthesis`. On unsupported browsers the `isSupported` flag in `useTTS` will be `false` and TTS will silently skip.
