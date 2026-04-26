# DEPLOYMENT.md — ClimateSafe Route

Step-by-step deployment to Vercel (frontend) and Railway (backend + database). Follow in order. Do not skip steps.

---

## Prerequisites

Before deploying, you need:
- GitHub account with the repository pushed
- Vercel account (vercel.com) — free tier is sufficient
- Railway account (railway.app) — free tier is sufficient
- Mapbox account with a public token (mapbox.com)
- OpenAI API key (platform.openai.com)

---

## Step 1 — Prepare the Repository

Ensure these files exist and are committed before deploying:

```
backend/Dockerfile          ← Railway uses this to build the backend image
backend/requirements.txt    ← Python dependencies
frontend/next.config.js     ← Next.js config
frontend/package.json       ← Node dependencies
docker-compose.yml          ← Local dev only, not used by Railway or Vercel
.gitignore                  ← Must include backend/data/ and all .env files
```

**.gitignore must include:**
```
backend/data/
backend/.env
frontend/.env.local
.env
__pycache__/
*.pyc
.DS_Store
node_modules/
.next/
```

---

## Step 2 — Deploy the Database on Railway

### 2a. Create a Railway project

1. Go to https://railway.app/new
2. Click "Empty Project"
3. Name it `climatesafe-route`

### 2b. Add PostgreSQL

1. Click "+ New" → "Database" → "PostgreSQL"
2. Wait for provisioning (30–60 seconds)
3. Click the PostgreSQL service → "Connect" tab
4. Copy the `DATABASE_URL` value — you will need it in Step 3b and Step 4

### 2c. Enable PostGIS

1. In the PostgreSQL service, click the "Shell" tab (or use the "Connect" button to open psql)
2. Run:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
\q
```
3. Verify: `SELECT PostGIS_Version();` should return a version string

### 2d. Create the schema

Copy the entire SQL block from `DATABASE.md` (the "Schema" section) and run it in the Railway shell.

Verify tables exist:
```sql
\dt
```
Should show: `climate_hvi`, `climate_canopy`, `climate_flood`, `street_edges`

---

## Step 3 — Deploy the Backend on Railway

### 3a. Add the backend service

1. In your Railway project, click "+ New" → "GitHub Repo"
2. Select your repository
3. Railway will detect the Dockerfile automatically
4. Set "Root Directory" to `backend`
5. Click "Deploy"

The first build will take 3–5 minutes (installing GeoPandas and dependencies).

### 3b. Set environment variables

In the backend service, go to "Variables" tab and add:

```
DATABASE_URL=<paste the value from Step 2b>
OPENAI_API_KEY=sk-proj-...
ENVIRONMENT=production
```

Railway automatically sets `PORT` — do not override it. The Dockerfile uses port 8000 which Railway proxies.

### 3c. Verify the backend is running

1. Go to "Settings" tab → copy the public domain (e.g. `backend.up.railway.app`)
2. Open `https://your-backend-domain.up.railway.app/health` in a browser
3. Should return `{"status": "ok"}`
4. Open `https://your-backend-domain.up.railway.app/docs` to see the FastAPI Swagger UI

If the service is crashing, check the "Logs" tab for errors.

### 3d. Run data ingestion

**Important:** The `backend/data/` folder is not in the repository (it's gitignored). You must upload the raw data files to Railway before running ingestion scripts.

Option A — Upload via Railway Volume (recommended):
1. In the Railway backend service, go to "Volumes" → add a volume mounted at `/app/data`
2. Use the Railway CLI to upload files:
```bash
npm install -g @railway/cli
railway login
railway link <project-id>
railway run cp /local/path/to/hvi.geojson /app/data/hvi.geojson
```

Option B — Download inside Railway shell:
Open the Railway shell and run curl commands to download directly from NYC Open Data:
```bash
curl -L "https://data.cityofnewyork.us/api/geospatial/2jr8-rugk?method=export&type=GeoJSON" -o data/hvi.geojson
curl -L "https://data.cityofnewyork.us/api/geospatial/by9k-vhck?method=export&type=GeoJSON" -o data/canopy.geojson
curl -L "https://data.cityofnewyork.us/api/geospatial/8qam-4vqv?method=export&type=GeoJSON" -o data/flood.geojson
```

Once data files are in place, run ingestion scripts via the Railway shell:
```bash
cd /app
python scripts/ingest_hvi.py
python scripts/ingest_canopy.py
python scripts/ingest_flood.py
python scripts/precompute_graph.py   # takes 5–15 min
```

### 3e. Restart the backend

After ingestion completes, restart the service so the graph loads into memory on startup:
1. Railway service → "..." menu → "Restart"
2. Check logs — should see `Graph loaded: X nodes, X edges`

---

## Step 4 — Deploy the Frontend on Vercel

### 4a. Import project

1. Go to https://vercel.com/new
2. Click "Import Git Repository" → select your repository
3. Set "Root Directory" to `frontend`
4. Framework preset will auto-detect as "Next.js"

### 4b. Set environment variables

In the Vercel project settings, add:

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.ey...
NEXT_PUBLIC_API_URL=https://your-backend-domain.up.railway.app
```

`NEXT_PUBLIC_API_URL` is the Railway backend public domain from Step 3c. Include `https://` and no trailing slash.

### 4c. Deploy

Click "Deploy". Vercel will:
1. Install Node dependencies
2. Run `next build`
3. Deploy to the Vercel edge network

Build takes 1–3 minutes. You will get a URL like `climatesafe-route.vercel.app`.

### 4d. Update CORS on the backend

Go to Railway backend → "Variables" → add:

```
FRONTEND_URL=https://climatesafe-route.vercel.app
```

Then update `backend/app/main.py` to include this domain in `allow_origins`. Redeploy the backend.

### 4e. Test end to end

1. Open `https://climatesafe-route.vercel.app`
2. Enter "Times Square, New York" and "Brooklyn Bridge, New York"
3. Submit — you should see two routes on the map within 3–5 seconds
4. Verify the LLM explanation appears in the side panel

---

## Environment Variable Reference

### Backend (Railway)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string from Railway |
| `OPENAI_API_KEY` | Yes | OpenAI API key (used by `gpt-5-mini`) |
| `ENVIRONMENT` | Yes | Set to `production` |
| `FRONTEND_URL` | Yes | Vercel frontend URL for CORS |

### Frontend (Vercel)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Yes | Mapbox public token (starts with `pk.`) |
| `NEXT_PUBLIC_API_URL` | Yes | Railway backend public URL |

---

## Redeployment

### Backend code changes
Push to the main branch. Railway auto-deploys on push if "Auto-Deploy" is enabled in the service settings.

### Frontend code changes
Push to the main branch. Vercel auto-deploys on push.

### Climate data refresh
Re-run ingestion scripts in the Railway shell, then restart the backend service. No code changes needed.

---

## Monitoring

### Railway
- Logs: Railway service → "Logs" tab — real-time stdout from FastAPI
- Memory usage: Railway "Metrics" tab — watch for spikes during graph load on startup
- The graph load on startup uses approximately 500MB–1GB RAM depending on borough coverage

### Vercel
- Function logs: Vercel dashboard → "Functions" tab
- Analytics: Vercel dashboard → "Analytics" tab (requires Vercel Pro for detailed metrics)

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Backend returns 500 on all `/route` requests | Graph not loaded (startup failed) | Check Railway logs for startup error; verify DATABASE_URL is correct |
| `Graph loaded: 0 nodes, 0 edges` in logs | `street_edges` table is empty | Re-run `precompute_graph.py` |
| Geocoding always returns 422 | Nominatim rate limiting | Add `asyncio.sleep(1)` between geocoding calls; verify User-Agent header is set |
| Map doesn't render | Invalid Mapbox token | Check `NEXT_PUBLIC_MAPBOX_TOKEN` is set correctly in Vercel |
| CORS errors in browser console | Frontend URL not in allow_origins | Update `FRONTEND_URL` env var and redeploy backend |
| `precompute_graph.py` runs out of memory | Too many boroughs | Reduce to Manhattan only first, expand later |
| Railway build fails | Missing system deps | Verify the Dockerfile apt-get installs libgdal-dev, libgeos-dev, libproj-dev |
