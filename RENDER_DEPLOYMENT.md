# Render Deployment Guide for UVM Testbench Chatbot

This guide will help you deploy the full-stack UVM Testbench Chatbot application on Render.

## Prerequisites

1. **GitHub Account** - Your code should be pushed to GitHub
2. **Render Account** - Sign up at [render.com](https://render.com)
3. **MongoDB Atlas Account** - For the database (free tier available)
4. **OpenAI API Key** - For AI-powered generation

---

## Part 1: Set Up MongoDB Atlas (Database)

### Step 1: Create MongoDB Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up or log in
3. Click **"Build a Database"**
4. Select **"M0 Free"** tier
5. Choose a cloud provider and region (preferably same as Render - Oregon)
6. Click **"Create Cluster"**

### Step 2: Configure Database Access

1. Go to **"Database Access"** in the left sidebar
2. Click **"Add New Database User"**
3. Create a username and strong password (save these!)
4. Set privileges to **"Read and write to any database"**
5. Click **"Add User"**

### Step 3: Configure Network Access

1. Go to **"Network Access"** in the left sidebar
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (0.0.0.0/0)
4. Click **"Confirm"**

### Step 4: Get Connection String

1. Go to **"Database"** in the left sidebar
2. Click **"Connect"** on your cluster
3. Select **"Connect your application"**
4. Copy the connection string (looks like: `mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/`)
5. Replace `<password>` with your actual password
6. Add database name at the end: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/uvm-chatbot`

---

## Part 2: Deploy Backend on Render

### Step 1: Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select the **"uvm-testbench-generator"** repository

### Step 2: Configure Backend Service

Fill in the following settings:

- **Name**: `uvm-testbench-backend`
- **Region**: `Oregon (US West)`
- **Branch**: `main`
- **Root Directory**: Leave empty
- **Runtime**: `Node`
- **Build Command**:
  ```bash
  npm install && npm run build:backend
  ```
- **Start Command**:
  ```bash
  npm run start --workspace=backend
  ```
- **Plan**: `Free`

### Step 3: Add Environment Variables

Click **"Advanced"** and add these environment variables:

| Key              | Value                                                                            |
| ---------------- | -------------------------------------------------------------------------------- |
| `NODE_ENV`       | `production`                                                                     |
| `PORT`           | `4000`                                                                           |
| `MONGODB_URI`    | `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/uvm-chatbot`         |
| `OPENAI_API_KEY` | `sk-...` (your OpenAI API key)                                                   |
| `CORS_ORIGIN`    | `https://uvm-testbench-frontend.onrender.com` (update after frontend deployment) |
| `LOG_LEVEL`      | `info`                                                                           |
| `UPLOAD_DIR`     | `./projects`                                                                     |

### Step 4: Add Persistent Disk (Important!)

1. Scroll down to **"Disk"**
2. Click **"Add Disk"**
3. Configure:
   - **Name**: `uvm-projects`
   - **Mount Path**: `/opt/render/project/src/projects`
   - **Size**: `1 GB` (free tier)

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes)
3. Once deployed, copy the service URL (e.g., `https://uvm-testbench-backend.onrender.com`)

---

## Part 3: Deploy Frontend on Render

### Step 1: Create Static Site

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Static Site"**
3. Select the same GitHub repository

### Step 2: Configure Frontend Service

Fill in the following settings:

- **Name**: `uvm-testbench-frontend`
- **Region**: `Oregon (US West)`
- **Branch**: `main`
- **Root Directory**: `frontend`
- **Build Command**:
  ```bash
  npm install && npm run build
  ```
- **Publish Directory**: `dist`

### Step 3: Add Environment Variables

Click **"Advanced"** and add these environment variables:

| Key            | Value                                        |
| -------------- | -------------------------------------------- |
| `VITE_API_URL` | `https://uvm-testbench-backend.onrender.com` |
| `VITE_WS_URL`  | `https://uvm-testbench-backend.onrender.com` |

### Step 4: Configure Redirects

1. After deployment, go to **"Redirects/Rewrites"**
2. Add a rewrite rule:
   - **Source**: `/api/*`
   - **Destination**: `https://uvm-testbench-backend.onrender.com/api/:splat`
   - **Type**: `Rewrite`

### Step 5: Deploy

1. Click **"Create Static Site"**
2. Wait for deployment (3-5 minutes)
3. Once deployed, copy the service URL (e.g., `https://uvm-testbench-frontend.onrender.com`)

---

## Part 4: Update Backend CORS

### Step 1: Update Backend Environment Variable

1. Go to your backend service on Render
2. Go to **"Environment"**
3. Update `CORS_ORIGIN` to your frontend URL:
   ```
   https://uvm-testbench-frontend.onrender.com
   ```
4. Click **"Save Changes"**
5. The backend will automatically redeploy

---

## Part 5: Verify Deployment

### Step 1: Check Backend Health

1. Visit: `https://uvm-testbench-backend.onrender.com/health`
2. You should see:
   ```json
   {
     "status": "ok",
     "database": {
       "connected": true,
       "healthy": true
     }
   }
   ```

### Step 2: Check Frontend

1. Visit: `https://uvm-testbench-frontend.onrender.com`
2. You should see the UVM Testbench Chatbot dashboard
3. Try creating a project and uploading files

### Step 3: Test Full Workflow

1. Create a new project
2. Upload specification and RTL files
3. Click "Generate Testbench"
4. Watch the real-time progress
5. View the generated files

---

## Important Notes

### Free Tier Limitations

- **Backend**: Spins down after 15 minutes of inactivity (first request after spin-down takes ~30 seconds)
- **Disk Storage**: 1GB limit (sufficient for ~50-100 projects)
- **Build Minutes**: 500 minutes/month
- **Bandwidth**: 100GB/month

### Keeping Backend Alive (Optional)

To prevent spin-down, you can use a service like:

- **UptimeRobot** (free) - Ping your backend every 14 minutes
- **Cron-job.org** (free) - Schedule health check requests

### Upgrading to Paid Plan

If you need:

- No spin-down
- More storage
- Better performance
- Custom domains

Consider upgrading to Render's **Starter Plan** ($7/month per service)

---

## Troubleshooting

### Backend Won't Start

1. Check logs in Render dashboard
2. Verify MongoDB connection string is correct
3. Ensure OpenAI API key is valid
4. Check that all environment variables are set

### Frontend Can't Connect to Backend

1. Verify `VITE_API_URL` and `VITE_WS_URL` are correct
2. Check backend CORS_ORIGIN includes frontend URL
3. Ensure backend is running (check health endpoint)

### WebSocket Connection Issues

1. Render supports WebSockets on all plans
2. Check browser console for connection errors
3. Verify `VITE_WS_URL` uses `https://` (not `ws://`)

### File Upload Fails

1. Check disk is properly mounted at `/opt/render/project/src/projects`
2. Verify disk has available space
3. Check backend logs for permission errors

---

## Monitoring

### View Logs

1. Go to your service in Render dashboard
2. Click **"Logs"** tab
3. View real-time logs

### Check Metrics

1. Go to your service in Render dashboard
2. Click **"Metrics"** tab
3. View CPU, memory, and bandwidth usage

---

## Custom Domain (Optional)

### Add Custom Domain

1. Go to your frontend service
2. Click **"Settings"** → **"Custom Domains"**
3. Add your domain (e.g., `uvm-testbench.yourdomain.com`)
4. Update DNS records as instructed
5. Update backend `CORS_ORIGIN` to include your custom domain

---

## Backup and Maintenance

### Database Backups

1. MongoDB Atlas automatically backs up your data
2. Free tier: Daily backups retained for 2 days
3. Paid tier: Continuous backups with point-in-time recovery

### Generated Files Backup

1. Render's persistent disk is backed up
2. For additional safety, consider:
   - Periodic exports to cloud storage (S3, Google Cloud Storage)
   - Download important projects locally

---

## Cost Estimate

### Free Tier (Recommended for Testing)

- Backend: $0/month
- Frontend: $0/month
- MongoDB Atlas: $0/month
- **Total: $0/month**

### Production Tier (Recommended for Production)

- Backend (Starter): $7/month
- Frontend (Starter): $7/month
- MongoDB Atlas (M10): $10/month
- **Total: $24/month**

---

## Support

If you encounter issues:

1. Check Render documentation: https://render.com/docs
2. Check MongoDB Atlas documentation: https://docs.atlas.mongodb.com
3. Review application logs in Render dashboard
4. Check GitHub issues for known problems

---

## Next Steps

After successful deployment:

1. ✅ Test all features thoroughly
2. ✅ Set up monitoring and alerts
3. ✅ Configure custom domain (optional)
4. ✅ Set up UptimeRobot to prevent spin-down
5. ✅ Create backups of important data
6. ✅ Share the URL with your team!

---

**Congratulations! Your UVM Testbench Chatbot is now live! 🎉**
