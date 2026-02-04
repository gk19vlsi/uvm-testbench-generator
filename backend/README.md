# Backend - UVM Testbench Chatbot

Backend server for the UVM Testbench Chatbot system.

## Structure

```
backend/
├── src/
│   └── index.ts           # Express server entry point
├── Dockerfile             # Docker configuration
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── jest.config.js         # Jest test configuration
└── .env.example           # Environment variables template
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Type check
npm run type-check
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `PORT`: Server port (default: 4000)
- `NODE_ENV`: Environment (development/production)
- `MONGODB_URI`: MongoDB connection string
- `OPENAI_API_KEY`: OpenAI API key for LLM integration
- `CORS_ORIGIN`: Allowed CORS origin
- `LOG_LEVEL`: Logging level (debug/info/warn/error)

## API Endpoints

### Health Check

- `GET /health` - Server health status

### Projects (to be implemented)

- `POST /api/projects` - Create new project
- `GET /api/projects` - List all projects
- `GET /api/projects/:projectId` - Get project details
- `DELETE /api/projects/:projectId` - Delete project

### File Upload (to be implemented)

- `POST /api/projects/:projectId/files/upload` - Upload files
- `DELETE /api/projects/:projectId/files/:fileId` - Delete file

### Generation (to be implemented)

- `POST /api/projects/:projectId/generate` - Start testbench generation
- `GET /api/projects/:projectId/generation/:generationId/status` - Check status

### Results (to be implemented)

- `GET /api/projects/:projectId/results` - Get generation results
- `GET /api/projects/:projectId/download` - Download testbench ZIP

## WebSocket Events

### Connection

- Client connects with `projectId` query parameter
- Server joins client to project-specific room

### Messages

- `progress` - Agent execution progress updates
- `error` - Error notifications
- `complete` - Generation completion notification

## Testing

The backend uses Jest for testing:

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

Test files should be placed alongside source files with `.test.ts` or `.spec.ts` extension.
