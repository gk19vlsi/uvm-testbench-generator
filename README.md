# UVM Testbench Chatbot

An AI-powered verification automation system that generates complete, runnable UVM testbenches from natural-language specifications and RTL designs.

## Overview

The UVM Testbench Chatbot employs a multi-agent architecture to transform verification intent into production-ready UVM code with full traceability from specification to implementation. The system features:

- **Multi-agent pipeline**: 7 specialized AI agents for specification parsing, RTL analysis, alignment, architecture planning, code generation, sequence creation, and validation
- **Protocol auto-detection**: Automatic identification of communication protocols (AXI, APB, UART, I2C, SPI)
- **Real-time feedback**: WebSocket-based progress tracking during generation
- **Single-page UX**: Unified interface for file uploads, generation controls, and results viewing
- **Full traceability**: Mapping between specification requirements and UVM components

## Architecture

### Technology Stack

**Frontend**:

- React 18+ with TypeScript
- Tailwind CSS for styling
- React Query for server state management
- Socket.io client for real-time updates
- Monaco Editor for code editing
- Vite for build tooling

**Backend**:

- Node.js 18+ with Express
- TypeScript for type safety
- Socket.io for WebSocket communication
- MongoDB for data persistence
- LangChain for LLM integration
- OpenAI API for AI capabilities

**Infrastructure**:

- Docker Compose for development environment
- MongoDB 6+ for database
- Monorepo structure with workspaces

## Project Structure

```
uvm-testbench-chatbot/
├── packages/
│   └── shared-types/          # Shared TypeScript types
│       ├── src/
│       │   ├── agent.ts       # Agent-related types
│       │   ├── file.ts        # File handling types
│       │   ├── generation.ts  # Generation types
│       │   ├── llm.ts         # LLM configuration types
│       │   ├── project.ts     # Project types
│       │   ├── validation.ts  # Validation types
│       │   ├── websocket.ts   # WebSocket message types
│       │   └── index.ts       # Main export
│       └── package.json
├── backend/
│   ├── src/
│   │   └── index.ts           # Express server entry point
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.js
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Main React component
│   │   ├── main.tsx           # React entry point
│   │   └── index.css          # Global styles
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── jest.config.js
├── docker-compose.yml         # Development environment
├── package.json               # Root package with workspaces
├── tsconfig.json              # Base TypeScript config
├── .eslintrc.json             # ESLint configuration
├── .prettierrc.json           # Prettier configuration
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose (for containerized development)
- OpenAI API key

### Installation

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd uvm-testbench-chatbot
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up environment variables**:

   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env and add your OPENAI_API_KEY
   ```

4. **Start development environment with Docker**:

   ```bash
   docker-compose up
   ```

   This will start:
   - MongoDB on port 27017
   - Backend server on port 4000
   - Frontend application on port 3000

5. **Or run locally without Docker**:

   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

### Development

**Run all workspaces**:

```bash
npm run dev          # Start both frontend and backend
npm run build        # Build all workspaces
npm run test         # Run all tests
npm run lint         # Lint all workspaces
npm run format       # Format code with Prettier
```

**Run specific workspace**:

```bash
npm run dev:backend      # Start backend only
npm run dev:frontend     # Start frontend only
npm run test:backend     # Test backend only
npm run test:frontend    # Test frontend only
```

**Type checking**:

```bash
npm run type-check       # Check types in all workspaces
```

## Configuration

### Environment Variables

**Backend** (`.env`):

```env
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
OPENAI_API_KEY=your_key_here
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug
```

**Frontend** (Vite environment):

```env
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
```

### MongoDB Configuration

For development, you can use either:

1. **Docker Compose MongoDB** (included in docker-compose.yml)
2. **MongoDB Atlas** (cloud-hosted, connection string in design doc)

The default configuration uses MongoDB Atlas with the provided connection string.

## Testing

The project uses Jest for both unit and property-based testing:

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

**Testing approach**:

- **Unit tests**: Specific examples and edge cases
- **Property-based tests**: Universal properties across all inputs (using fast-check)
- **Integration tests**: End-to-end workflows
- **E2E tests**: Full user workflows (using Playwright)

## Code Quality

**Linting**:

```bash
npm run lint
```

**Formatting**:

```bash
npm run format        # Format all files
npm run format:check  # Check formatting
```

**Type checking**:

```bash
npm run type-check
```

## Project Workflow

1. **Create a project**: Name your verification project
2. **Upload files**:
   - Specification documents (PDF, DOCX, MD, TXT)
   - RTL design files (.sv, .v)
3. **Generate testbench**: Select generation mode (MVP, Production, Advanced)
4. **Monitor progress**: Real-time updates via WebSocket
5. **Review results**:
   - UVM component tree
   - Traceability matrix
   - Simulation readiness score
6. **Edit code**: Inline code editor with syntax highlighting
7. **Download**: Complete testbench package as ZIP

## Multi-Agent Pipeline

The system uses 7 specialized agents:

1. **Specification Agent**: Parses specs, identifies protocols, extracts requirements
2. **RTL Agent**: Analyzes RTL design, extracts module hierarchy and signals
3. **Alignment Agent**: Maps specification requirements to RTL signals
4. **Architecture Agent**: Plans UVM testbench structure
5. **Generator Agent**: Produces UVM component code
6. **Sequence Agent**: Creates stimulus sequences and tests
7. **Validation Agent**: Validates completeness and calculates readiness score

## Features

- ✅ Multi-format specification input (PDF, DOCX, MD, TXT)
- ✅ SystemVerilog/Verilog RTL parsing
- ✅ Protocol auto-detection (AXI, APB, UART, I2C, SPI)
- ✅ UVM component generation (drivers, monitors, agents, env, tests)
- ✅ Sequence and test generation
- ✅ Functional coverage model generation
- ✅ Scoreboard generation
- ✅ Real-time progress tracking
- ✅ Traceability matrix
- ✅ Simulation readiness scoring
- ✅ Inline code editing
- ✅ Complete testbench download

## Contributing

1. Follow the TypeScript style guide
2. Write tests for new features
3. Ensure all tests pass before submitting
4. Format code with Prettier
5. Follow conventional commit messages

## License

MIT

## Support

For issues and questions, please refer to the design document in `.kiro/specs/uvm-testbench-chatbot/`.
