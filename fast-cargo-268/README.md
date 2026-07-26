# FastCargo 268 — Final-Mile Delivery Platform

Last-mile logistics for Antigua & Barbuda. Customs tracking, pin-drop delivery locations, driver dispatch, and live driver tracking.

---

## Free deployment stack

| Service    | What it does              | Free tier                        |
|------------|---------------------------|----------------------------------|
| Supabase   | PostgreSQL database        | 500MB, unlimited API calls       |
| Render     | Backend (Node/Express)     | 750 hrs/month (enough for 1 app) |
| Vercel     | Frontend (React)           | Unlimited                        |
| Mapbox     | Maps + pin drop            | 50,000 map loads/month           |
| Resend     | Email notifications        | 3,000 emails/month               |

**Total cost: $0**

---

## Step-by-step deployment

### Step 1 — Push to GitHub

1. Create a free account at **github.com**
2. Create a new repository called `fast-cargo-268`
3. Upload this entire folder to the repo (drag and drop works on GitHub)

### Step 2 — Set up Supabase (database)

1. Go to **supabase.com** → Sign up free
2. Click **New project** → give it a name → set a database password → **Create**
3. Wait ~2 minutes for it to start
4. Go to **Settings → Database → Connection string**
5. Copy two URLs:
   - **Transaction** mode (port 6543) → this is your `DATABASE_URL`
   - **Session** mode (port 5432) → this is your `DIRECT_URL`
6. Both URLs look like: `postgresql://postgres.[ref]:[password]@...`

### Step 3 — Deploy backend to Render

1. Go to **render.com** → Sign up with GitHub → **New → Web Service**
2. Connect your `fast-cargo-268` GitHub repo
3. Settings:
   - **Root directory**: `backend`
   - **Build command**: `npm install && npm run build`
   - **Start command**: `npm run db:migrate && npm start`
   - **Instance type**: Free
4. Add environment variables (click **Environment**):
   ```
   DATABASE_URL   = [your Supabase Transaction URL]
   DIRECT_URL     = [your Supabase Session URL]
   JWT_SECRET     = [any long random string, e.g. paste 40 random characters]
   FRONTEND_URL   = https://fast-cargo-268.vercel.app  (set after step 4)
   APP_BASE_URL   = https://fast-cargo-268.vercel.app  (set after step 4)
   ```
5. Click **Create Web Service** — Render will build and deploy
6. Your backend URL will be something like `https://fast-cargo-268-api.onrender.com`
7. Once deployed, open the URL + `/health` to confirm it's running

> **Note**: Free Render services sleep after 15 minutes of inactivity and take ~30s to wake up. This is fine for testing. Upgrade to $7/month to keep it always-on.

### Step 4 — Deploy frontend to Vercel

1. Go to **vercel.com** → Sign up with GitHub → **Add New Project**
2. Import your `fast-cargo-268` GitHub repo
3. Set **Root directory** to `frontend`
4. Add environment variables:
   ```
   VITE_API_URL      = https://fast-cargo-268-api.onrender.com/api
   VITE_MAPBOX_TOKEN = pk.your_token (see Step 5)
   ```
5. Click **Deploy**
6. Your frontend URL will be something like `https://fast-cargo-268.vercel.app`

### Step 5 — Get Mapbox token (free maps)

1. Go to **mapbox.com** → Sign up free
2. Go to **Account → Tokens → Create a token**
3. Default scopes are fine → **Create**
4. Copy the token (starts with `pk.`)
5. Add it to Vercel: **Project → Settings → Environment Variables → VITE_MAPBOX_TOKEN**
6. Redeploy from Vercel dashboard

### Step 6 — Set up email notifications (optional but recommended)

1. Go to **resend.com** → Sign up free
2. **API Keys → Create API key** → copy it
3. Go to **Domains → Add Domain** → verify your domain (or use `onboarding@resend.dev` for testing)
4. Add to Render environment variables:
   ```
   RESEND_API_KEY = re_your_key
   FROM_EMAIL     = notifications@yourdomain.com
   ```

### Step 7 — Seed the database with demo accounts

After deploying, run the seed from your local machine once:

```bash
cd backend
# Copy your .env with the Supabase DATABASE_URL and DIRECT_URL
npm install
npx prisma generate
node prisma/seed.js
```

Or in Render: go to your service → **Shell** tab → run `node prisma/seed.js`

### Step 8 — Update CORS

Once you have your Vercel URL, update the `FRONTEND_URL` and `APP_BASE_URL` env vars in Render to match.

---

## Login credentials (after seeding)

| Role        | Phone          | Password     |
|-------------|----------------|--------------|
| Dispatcher  | +12680000001   | dispatch123  |
| Driver      | +12680000002   | driver123    |
| Customer    | +12680000010   | customer123  |

---

## Running locally

```bash
# Terminal 1 — backend
cd backend
cp .env.example .env    # fill in your Supabase URLs
npm install
npx prisma generate
npx prisma migrate dev
node prisma/seed.js
npm run dev             # → http://localhost:3001

# Terminal 2 — frontend
cd frontend
cp .env.example .env    # add VITE_MAPBOX_TOKEN
npm install
npm run dev             # → http://localhost:5173
```

---

## Key features

- **Role-based access**: Customers, drivers, and dispatchers each see only their view
- **Pin-drop delivery**: Customers drop a precise GPS pin — no address needed
- **Live driver tracking**: Dispatcher sees all drivers on a live map, updated every 15s
- **Customs tracking**: Log entry/clearance times, see average customs duration
- **Email notifications**: Pin requests, customs clearance, driver assignment, delivery confirmation
- **Public tracking**: Anyone can track a package without logging in at `/track`
- **Auto-navigate**: Drivers get a one-tap Google Maps link to the customer's pin
