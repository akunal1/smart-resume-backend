# Deployment Instructions for Render

## Quick Fix for Current Issue

The deployment is failing because Render can't find the compiled JavaScript files. Here's what I've fixed:

### 1. Package.json Updates

- Added `"postinstall": "npm run build"` script to automatically build after npm install
- Moved TypeScript and required @types packages to `dependencies` (Render needs them to compile)
- Build process now runs automatically during deployment

### 2. Environment Configuration

- Updated `env.ts` to handle production environment properly
- Default port changed to 10000 (Render's default)
- Environment variables now load correctly for production

## Deployment Steps

### Option 1: Re-deploy Current Setup

1. Push these changes to your GitHub repository
2. In Render dashboard, trigger a new deployment
3. The build should now work correctly

### Option 2: Manual Render Configuration

If you want to be explicit, set these in Render:

**Build Command:**

```bash
npm install && npm run build
```

**Start Command:**

```bash
npm start
```

**Environment Variables:**

```
NODE_ENV=production
PORT=10000
CLIENT_ORIGIN=https://your-frontend-domain.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
JWT_SECRET=your-secret-key
```

### 3. Required Environment Variables for Render

Set these in your Render service's Environment tab:

| Variable             | Value                | Required |
| -------------------- | -------------------- | -------- |
| `NODE_ENV`           | `production`         | Yes      |
| `CLIENT_ORIGIN`      | Your frontend URL    | Yes      |
| `EMAIL_USER`         | Gmail address        | Yes      |
| `EMAIL_PASS`         | Gmail app password   | Yes      |
| `JWT_SECRET`         | Random secret string | Yes      |
| `PERPLEXITY_API_KEY` | Your API key         | Optional |

### 4. Important Notes

- **Gmail Setup**: Use an app-specific password, not your regular Gmail password
- **CORS**: Make sure `CLIENT_ORIGIN` matches your frontend domain exactly
- **Health Check**: The app exposes `/api/health` for Render's health checks

### 5. Troubleshooting

If deployment still fails:

1. Check Render logs for specific error messages
2. Verify all required environment variables are set
3. Ensure your Gmail app password is correct
4. Check that the repository is connected properly to Render

The key fix was adding the `postinstall` script and moving TypeScript to dependencies so Render can compile your TypeScript code during deployment.
