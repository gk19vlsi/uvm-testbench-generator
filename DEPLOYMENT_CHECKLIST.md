# Render Deployment Checklist

Use this checklist to ensure a smooth deployment process.

## Pre-Deployment

- [ ] Code is pushed to GitHub repository
- [ ] All changes are committed
- [ ] MongoDB Atlas account created
- [ ] OpenAI API key obtained
- [ ] Render account created

## MongoDB Atlas Setup

- [ ] Created free M0 cluster
- [ ] Created database user with password
- [ ] Allowed access from anywhere (0.0.0.0/0)
- [ ] Copied connection string
- [ ] Replaced `<password>` in connection string
- [ ] Added database name to connection string

## Backend Deployment

- [ ] Created new Web Service on Render
- [ ] Connected GitHub repository
- [ ] Set build command: `npm install && npm run build:backend`
- [ ] Set start command: `npm run start --workspace=backend`
- [ ] Added all environment variables:
  - [ ] NODE_ENV=production
  - [ ] PORT=4000
  - [ ] MONGODB_URI=(your connection string)
  - [ ] OPENAI_API_KEY=(your API key)
  - [ ] CORS_ORIGIN=(will update after frontend)
  - [ ] LOG_LEVEL=info
  - [ ] UPLOAD_DIR=./projects
- [ ] Added persistent disk:
  - [ ] Name: uvm-projects
  - [ ] Mount path: /opt/render/project/src/projects
  - [ ] Size: 1GB
- [ ] Clicked "Create Web Service"
- [ ] Waited for deployment to complete
- [ ] Copied backend URL
- [ ] Tested health endpoint: `https://your-backend.onrender.com/health`

## Frontend Deployment

- [ ] Created new Static Site on Render
- [ ] Connected same GitHub repository
- [ ] Set root directory: `frontend`
- [ ] Set build command: `npm install && npm run build`
- [ ] Set publish directory: `dist`
- [ ] Added environment variables:
  - [ ] VITE_API_URL=(your backend URL)
  - [ ] VITE_WS_URL=(your backend URL)
- [ ] Clicked "Create Static Site"
- [ ] Waited for deployment to complete
- [ ] Copied frontend URL

## Post-Deployment Configuration

- [ ] Updated backend CORS_ORIGIN with frontend URL
- [ ] Waited for backend to redeploy
- [ ] Tested frontend URL in browser
- [ ] Created a test project
- [ ] Uploaded test files
- [ ] Ran a test generation
- [ ] Verified WebSocket connection works
- [ ] Verified file download works

## Optional Enhancements

- [ ] Set up UptimeRobot to prevent backend spin-down
- [ ] Configure custom domain
- [ ] Set up monitoring alerts
- [ ] Create backup strategy
- [ ] Document API endpoints

## Troubleshooting

If something doesn't work:

1. Check Render logs for errors
2. Verify all environment variables are correct
3. Test backend health endpoint
4. Check browser console for frontend errors
5. Verify MongoDB connection string
6. Ensure OpenAI API key is valid

## Success Criteria

✅ Backend health check returns "ok"
✅ Frontend loads without errors
✅ Can create projects
✅ Can upload files
✅ Can generate testbenches
✅ Real-time progress updates work
✅ Can view generated files
✅ Can download ZIP files

---

**Deployment Complete! 🎉**

Your application is now live at:

- Frontend: https://your-frontend.onrender.com
- Backend: https://your-backend.onrender.com
