# Quick Start Guide

Get the UVM Testbench Chatbot up and running in minutes.

## Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose (recommended)
- OpenAI API key

## Option 1: Docker Compose (Recommended)

This is the fastest way to get started with all services running.

### Step 1: Set up environment

```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit backend/.env and add your OpenAI API key
# OPENAI_API_KEY=sk-...
```

### Step 2: Start services

```bash
# Start all services (MongoDB, Backend, Frontend)
docker-compose up

# Or run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f
```

### Step 3: Access the application

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- MongoDB: localhost:27017

### Stop services

```bash
docker-compose down
```

## Option 2: Local Development

Run services locally without Docker.

### Step 1: Install dependencies

```bash
# Install all workspace dependencies
npm install
```

### Step 2: Set up environment

```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit backend/.env and configure:
# - OPENAI_API_KEY: Your OpenAI API key
# - MONGODB_URI: MongoDB connection string (use Atlas or local MongoDB)
```

### Step 3: Start MongoDB

If using local MongoDB:

```bash
# Start MongoDB (if installed locally)
mongod --dbpath /path/to/data

# Or use Docker for MongoDB only
docker run -d -p 27017:27017 --name mongo mongo:6
```

Or use MongoDB Atlas (connection string provided in design doc).

### Step 4: Start development servers

```bash
# Terminal 1 - Start backend
cd backend
npm run dev

# Terminal 2 - Start frontend
cd frontend
npm run dev
```

### Step 5: Access the application

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

## Verify Installation

### Check backend health

```bash
curl http://localhost:4000/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Check frontend

Open http://localhost:3000 in your browser. You should see the UVM Testbench Chatbot welcome page.

## Next Steps

1. **Create a project**: Click "New Project" on the dashboard
2. **Upload files**:
   - Specification documents (PDF, DOCX, MD, TXT)
   - RTL design files (.sv, .v)
3. **Generate testbench**: Click "Generate" and select mode
4. **Monitor progress**: Watch real-time updates
5. **Review results**: Explore UVM tree, traceability matrix, and code
6. **Download**: Get complete testbench package

## Useful Commands

```bash
# Development
make dev              # Start all services
make dev-backend      # Start backend only
make dev-frontend     # Start frontend only

# Testing
make test             # Run all tests
make test-coverage    # Run tests with coverage

# Code quality
make lint             # Lint all code
make format           # Format all code
make type-check       # Type check all code

# Docker
make docker-up        # Start Docker services
make docker-down      # Stop Docker services
make docker-logs      # View Docker logs
make docker-rebuild   # Rebuild Docker images

# Cleanup
make clean            # Remove build artifacts and node_modules
```

## Troubleshooting

### Port already in use

If ports 3000, 4000, or 27017 are already in use:

1. Stop the conflicting service
2. Or change ports in `docker-compose.yml` and `.env` files

### MongoDB connection failed

- Check MongoDB is running: `docker ps` or `mongosh`
- Verify connection string in `backend/.env`
- For Atlas, ensure IP is whitelisted

### OpenAI API errors

- Verify API key is correct in `backend/.env`
- Check API key has sufficient credits
- Ensure no rate limiting

### Frontend can't connect to backend

- Verify backend is running on port 4000
- Check CORS settings in `backend/.env`
- Verify `VITE_API_URL` in frontend environment

### Docker build fails

```bash
# Clean Docker cache and rebuild
docker-compose down
docker system prune -a
docker-compose build --no-cache
docker-compose up
```

## Development Workflow

1. **Make changes**: Edit code in `backend/src/` or `frontend/src/`
2. **Auto-reload**: Both servers support hot reload
3. **Run tests**: `npm run test` in respective workspace
4. **Lint and format**: `make lint && make format`
5. **Type check**: `make type-check`
6. **Commit**: Follow conventional commit messages

## Getting Help

- Check the main [README.md](README.md) for detailed documentation
- Review the design document in `.kiro/specs/uvm-testbench-chatbot/`
- Check workspace-specific READMEs:
  - [Backend README](backend/README.md)
  - [Frontend README](frontend/README.md)
  - [Shared Types README](packages/shared-types/README.md)

## What's Next?

Now that your development environment is set up, you can:

1. Explore the codebase structure
2. Review the multi-agent pipeline design
3. Start implementing backend API endpoints (Task 2+)
4. Build frontend components (Task 21+)
5. Write tests for new features

Happy coding! 🚀
