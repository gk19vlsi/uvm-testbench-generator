# UVM Testbench Chatbot

An AI-powered verification automation system that generates complete, runnable UVM testbenches from natural-language specifications and RTL designs, with integrated simulation and waveform visualization capabilities.

## Overview

The UVM Testbench Chatbot employs a multi-agent architecture to transform verification intent into production-ready UVM code with full traceability from specification to implementation. The system features:

- **Multi-agent pipeline**: 7 specialized AI agents for specification parsing, RTL analysis, alignment, architecture planning, code generation, sequence creation, and validation
- **Protocol auto-detection**: Automatic identification of communication protocols (AXI, APB, UART, I2C, SPI)
- **Integrated simulation**: Support for multiple HDL simulators (ModelSim, VCS, Xcelium, Verilator, Icarus)
- **Waveform visualization**: Real-time VCD parsing and interactive waveform viewing
- **Real-time feedback**: WebSocket-based progress tracking during generation
- **Single-page UX**: Unified interface for file uploads, generation controls, simulation, and results viewing
- **Full traceability**: Mapping between specification requirements and UVM components

## Architecture

### Technology Stack

**Frontend**:

- React 18+ with TypeScript
- Tailwind CSS for styling
- React Query for server state management
- Socket.io client for real-time updates
- Monaco Editor for code editing
- D3.js for waveform visualization
- Recharts for component diagrams
- Vite for build tooling

**Backend**:

- Node.js 20+ with Express
- TypeScript for type safety
- Socket.io for WebSocket communication
- MongoDB 6+ for data persistence
- LangChain for LLM integration
- OpenAI API for AI capabilities
- Multi-simulator support (ModelSim, VCS, Xcelium, Verilator, Icarus)

**Infrastructure**:

- Docker Compose for development environment
- MongoDB Atlas for cloud database
- Render for production deployment
- Monorepo structure with workspaces

## Project Structure

```
uvm-testbench-chatbot/
├── packages/
│   └── shared-types/              # Shared TypeScript types
│       ├── src/
│       │   ├── agent.ts           # Agent-related types
│       │   ├── file.ts            # File handling types
│       │   ├── generation.ts      # Generation types
│       │   ├── llm.ts             # LLM configuration types
│       │   ├── project.ts         # Project types
│       │   ├── validation.ts      # Validation types
│       │   ├── websocket.ts       # WebSocket message types
│       │   └── index.ts           # Main export
│       ├── package.json
│       └── tsconfig.json
│
├── backend/
│   ├── src/
│   │   ├── agents/                # AI Agent implementations
│   │   │   ├── AlignmentAgent.ts
│   │   │   ├── ArchitectureAgent.ts
│   │   │   ├── BaseAgent.ts
│   │   │   ├── GeneratorAgent.ts
│   │   │   ├── RTLAgent.ts
│   │   │   ├── SequenceAgent.ts
│   │   │   ├── SpecificationAgent.ts
│   │   │   ├── ValidationAgent.ts
│   │   │   └── index.ts
│   │   ├── config/                # Configuration
│   │   │   ├── database.ts
│   │   │   ├── env.ts
│   │   │   ├── logger.ts
│   │   │   └── multer.ts
│   │   ├── controllers/           # Request handlers
│   │   │   ├── fileController.ts
│   │   │   ├── generationController.ts
│   │   │   ├── llmController.ts
│   │   │   ├── projectController.ts
│   │   │   ├── resultsController.ts
│   │   │   └── simulationController.ts
│   │   ├── middleware/            # Express middleware
│   │   │   ├── errorHandler.ts
│   │   │   ├── rateLimiter.ts
│   │   │   ├── requestLogger.ts
│   │   │   └── validation.ts
│   │   ├── models/                # MongoDB models
│   │   │   ├── Generation.ts
│   │   │   ├── LLMConfiguration.ts
│   │   │   ├── Project.ts
│   │   │   └── index.ts
│   │   ├── parsers/               # File parsers
│   │   │   ├── rtlParser.ts
│   │   │   └── specificationParser.ts
│   │   ├── prompts/               # LLM prompts
│   │   │   └── templates.ts
│   │   ├── routes/                # API routes
│   │   │   ├── llm.ts
│   │   │   ├── projects.ts
│   │   │   └── testRoutes.ts
│   │   ├── services/              # Business logic
│   │   │   ├── ErrorRecoveryService.ts
│   │   │   ├── FileStorageService.ts
│   │   │   ├── LLMService.ts
│   │   │   ├── PipelineOrchestrator.ts
│   │   │   ├── SimulatorService.ts
│   │   │   └── WebSocketService.ts
│   │   ├── templates/             # Code templates
│   │   │   ├── protocols/         # Protocol-specific templates
│   │   │   │   ├── apb_driver_logic.sv.template
│   │   │   │   ├── axi_driver_logic.sv.template
│   │   │   │   ├── axi_monitor_logic.sv.template
│   │   │   │   ├── i2c_driver_logic.sv.template
│   │   │   │   ├── spi_driver_logic.sv.template
│   │   │   │   └── uart_driver_logic.sv.template
│   │   │   └── uvm/               # UVM component templates
│   │   │       ├── agent.sv.template
│   │   │       ├── base_sequence.sv.template
│   │   │       ├── directed_sequence.sv.template
│   │   │       ├── driver.sv.template
│   │   │       ├── environment.sv.template
│   │   │       ├── error_sequence.sv.template
│   │   │       ├── interface.sv.template
│   │   │       ├── monitor.sv.template
│   │   │       ├── random_sequence.sv.template
│   │   │       ├── random_test.sv.template
│   │   │       ├── scoreboard.sv.template
│   │   │       ├── sequencer.sv.template
│   │   │       ├── smoke_test.sv.template
│   │   │       ├── tb_top.sv.template
│   │   │       └── transaction.sv.template
│   │   ├── utils/                 # Utility functions
│   │   │   ├── coverageGenerator.ts
│   │   │   ├── factoryGenerator.ts
│   │   │   ├── generationModeConfig.ts
│   │   │   ├── namingConvention.ts
│   │   │   ├── protocolDetection.ts
│   │   │   ├── resetGenerator.ts
│   │   │   ├── scoreboardGenerator.ts
│   │   │   ├── signalClassification.ts
│   │   │   └── templateEngine.ts
│   │   ├── __tests__/             # Unit & integration tests
│   │   │   ├── integration/
│   │   │   └── *.test.ts
│   │   └── index.ts               # Express server entry
│   ├── projects/                  # Generated testbenches storage
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── components/            # React components
│   │   │   ├── __tests__/         # Component tests
│   │   │   ├── ComponentDetailsPanel.tsx
│   │   │   ├── ComponentDiagram.tsx
│   │   │   ├── CreateProjectDialog.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── DeleteConfirmDialog.tsx
│   │   │   ├── DownloadManager.tsx
│   │   │   ├── EventVisualization.tsx
│   │   │   ├── FileUploadSection.tsx
│   │   │   ├── GeneratedFilesList.tsx
│   │   │   ├── GenerationControls.tsx
│   │   │   ├── GenerationInterface.tsx
│   │   │   ├── InlineCodeEditor.tsx
│   │   │   ├── LazyMonacoEditor.tsx
│   │   │   ├── LLMSettingsDialog.tsx
│   │   │   ├── ProgressIndicator.tsx
│   │   │   ├── ProgressTracker.tsx
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── ReadinessScoreDisplay.tsx
│   │   │   ├── ResultsSection.tsx
│   │   │   ├── SequenceCreator.tsx
│   │   │   ├── SimulationConfigDialog.tsx
│   │   │   ├── SimulationControls.tsx
│   │   │   ├── SimulationErrorDisplay.tsx
│   │   │   ├── SimulationProgressDisplay.tsx
│   │   │   ├── SimulationRunner.tsx
│   │   │   ├── Timeline.tsx
│   │   │   ├── TraceabilityMatrix.tsx
│   │   │   ├── UVMTreeViewer.tsx
│   │   │   ├── VCDFileUpload.tsx
│   │   │   ├── VirtualList.tsx
│   │   │   ├── VisualizationPanel.tsx
│   │   │   └── WaveformDisplay.tsx
│   │   ├── contexts/              # React contexts
│   │   │   ├── __tests__/
│   │   │   └── SimulationContext.tsx
│   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── __tests__/
│   │   │   ├── useProjects.ts
│   │   │   ├── useProjectSwitch.ts
│   │   │   ├── useSpecificationUpdates.ts
│   │   │   ├── useVisualizationInitializer.ts
│   │   │   ├── useVisualizationSettings.ts
│   │   │   └── useWebSocket.ts
│   │   ├── pages/                 # Page components
│   │   │   └── VisualizationDemo.tsx
│   │   ├── services/              # API & business logic
│   │   │   ├── __tests__/
│   │   │   ├── api.ts
│   │   │   ├── ColorPalette.ts
│   │   │   ├── ComponentGraphBuilder.ts
│   │   │   ├── InterfaceParser.ts
│   │   │   ├── llmService.ts
│   │   │   ├── projectService.ts
│   │   │   ├── SignalTimeSeries.ts
│   │   │   ├── SimulationEngine.ts
│   │   │   ├── SpecificationParser.ts
│   │   │   ├── VCDParser.ts
│   │   │   ├── VisualizationPersistence.ts
│   │   │   ├── WaveformRenderer.ts
│   │   │   └── websocket.ts
│   │   ├── types/                 # TypeScript types
│   │   │   ├── __tests__/
│   │   │   ├── index.ts
│   │   │   ├── simulation.ts
│   │   │   └── vcd.ts
│   │   ├── App.tsx                # Main React component
│   │   ├── main.tsx               # React entry point
│   │   ├── index.css              # Global styles
│   │   ├── setupTests.ts          # Test configuration
│   │   └── vite-env.d.ts          # Vite types
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── jest.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── README.md
│
├── e2e/                           # End-to-end tests
│   ├── fixtures/
│   ├── utils/
│   ├── 01-project-creation.spec.ts
│   ├── 02-file-upload.spec.ts
│   ├── 03-generation-workflow.spec.ts
│   ├── 04-results-viewing.spec.ts
│   ├── 05-code-editing.spec.ts
│   ├── 06-download.spec.ts
│   └── README.md
│
├── docs/                          # Documentation
│   ├── API_DOCUMENTATION.md
│   ├── DEPLOYMENT_GUIDE.md
│   └── USER_GUIDE.md
│
├── .github/                       # GitHub configuration
├── .kiro/                         # Kiro AI assistant specs
├── .vscode/                       # VS Code settings
├── docker-compose.yml             # Development environment
├── docker-compose.prod.yml        # Production environment
├── package.json                   # Root package with workspaces
├── tsconfig.json                  # Base TypeScript config
├── .eslintrc.json                 # ESLint configuration
├── .prettierrc.json               # Prettier configuration
├── playwright.config.ts           # Playwright E2E config
├── Makefile                       # Build automation
├── render.yaml                    # Render deployment config
├── QUICKSTART.md                  # Quick start guide
├── DEPLOYMENT_CHECKLIST.md        # Deployment checklist
├── RENDER_DEPLOYMENT.md           # Render deployment guide
└── README.md                      # This file
```

## Getting Started

### Prerequisites

- Node.js 20+ and npm 9+
- Docker and Docker Compose (for containerized development)
- OpenAI API key
- MongoDB Atlas account (or local MongoDB 6+)
- HDL Simulator (optional, for simulation features):
  - ModelSim/QuestaSim (UVM support)
  - Synopsys VCS (UVM support)
  - Cadence Xcelium (UVM support)
  - Verilator (basic SystemVerilog)
  - Icarus Verilog (basic Verilog)

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/gk19vlsi/uvm-testbench-generator.git
   cd uvm-testbench-generator
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up environment variables**:

   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env and configure:
   # - OPENAI_API_KEY: Your OpenAI API key
   # - MONGODB_URI: Your MongoDB connection string
   # - PORT: Backend port (default: 4000)
   # - CORS_ORIGIN: Frontend URL (default: http://localhost:3000)

   # Frontend
   cp frontend/.env.example frontend/.env
   # Edit frontend/.env if needed (defaults work for local development)
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

6. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - API Documentation: http://localhost:4000/api

### Development

**Run all workspaces**:

```bash
npm run dev          # Start both frontend and backend
npm run build        # Build all workspaces
npm run test         # Run all tests
npm run test:coverage # Run tests with coverage
npm run lint         # Lint all workspaces
npm run format       # Format code with Prettier
npm run type-check   # TypeScript type checking
```

**Run specific workspace**:

```bash
npm run dev:backend      # Start backend only
npm run dev:frontend     # Start frontend only
npm run test:backend     # Test backend only
npm run test:frontend    # Test frontend only
npm run build:backend    # Build backend only
npm run build:frontend   # Build frontend only
```

**E2E Testing**:

```bash
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:ui      # Run E2E tests with UI
```

## Configuration

### Environment Variables

**Backend** (`backend/.env`):

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/uvm-chatbot?retryWrites=true&w=majority

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...

# File Storage
UPLOAD_DIR=./projects
MAX_FILE_SIZE=52428800        # 50MB
MAX_PROJECT_SIZE=209715200    # 200MB

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=debug
```

**Frontend** (`frontend/.env`):

```env
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
```

### MongoDB Configuration

For development, you can use either:

1. **Docker Compose MongoDB** (included in docker-compose.yml)
2. **MongoDB Atlas** (cloud-hosted, recommended for production)

The default configuration uses MongoDB Atlas. To use local MongoDB:

```env
MONGODB_URI=mongodb://localhost:27017/uvm-chatbot
```

### Simulator Configuration

The system automatically detects installed simulators. Supported simulators:

**UVM-Compatible** (for UVM testbenches):

- ModelSim/QuestaSim
- Synopsys VCS
- Cadence Xcelium

**Basic SystemVerilog/Verilog**:

- Verilator
- Icarus Verilog

**Note**: UVM testbenches require UVM-compatible simulators. The system will validate simulator compatibility before running simulations.

## Testing

The project uses Jest for unit and integration testing, and Playwright for E2E testing:

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

**Testing approach**:

- **Unit tests**: Specific examples and edge cases for individual functions/components
- **Property-based tests**: Universal properties across all inputs (using fast-check)
- **Integration tests**: Multi-component workflows and API endpoints
- **E2E tests**: Full user workflows from project creation to download (using Playwright)

**Test Coverage**:

- Backend: Agents, services, controllers, parsers, utilities
- Frontend: Components, hooks, services, contexts
- E2E: Complete user workflows

## Code Quality

**Linting**:

```bash
npm run lint              # Lint all workspaces
npm run lint:backend      # Lint backend only
npm run lint:frontend     # Lint frontend only
```

**Formatting**:

```bash
npm run format            # Format all files
npm run format:check      # Check formatting without changes
```

**Type checking**:

```bash
npm run type-check        # Check types in all workspaces
```

**Pre-commit hooks**:
The project uses Husky for pre-commit hooks that automatically:

- Run linting
- Check formatting
- Run type checking
- Run relevant tests

## Project Workflow

1. **Create a project**: Name your verification project and provide description
2. **Upload files**:
   - Specification documents (PDF, DOCX, MD, TXT)
   - RTL design files (.sv, .v, .vh)
3. **Configure LLM** (optional): Select model and adjust parameters
4. **Generate testbench**:
   - Select generation mode (MVP, Production, Advanced)
   - Monitor real-time progress via WebSocket
   - View agent execution logs
5. **Review results**:
   - UVM component tree visualization
   - Traceability matrix (requirements → components)
   - Simulation readiness score
   - Generated file structure
6. **Edit code** (optional): Inline code editor with syntax highlighting
7. **Run simulation** (optional):
   - Select simulator (ModelSim, VCS, Xcelium, etc.)
   - Configure simulation parameters
   - Monitor simulation progress
   - View VCD waveforms
8. **Visualize waveforms** (optional):
   - Interactive waveform viewer
   - Signal grouping and filtering
   - Time-based navigation
   - Component diagram with signal flow
9. **Download**: Complete testbench package as ZIP

## Multi-Agent Pipeline

The system uses 7 specialized agents working in sequence:

1. **Specification Agent**:
   - Parses specification documents (PDF, DOCX, MD, TXT)
   - Identifies communication protocols (AXI, APB, UART, I2C, SPI)
   - Extracts functional requirements and constraints
   - Outputs structured specification data

2. **RTL Agent**:
   - Analyzes RTL design files (SystemVerilog/Verilog)
   - Extracts module hierarchy and port definitions
   - Identifies signal types and directions
   - Detects clock and reset signals
   - Outputs RTL structure data

3. **Alignment Agent**:
   - Maps specification requirements to RTL signals
   - Creates traceability matrix
   - Identifies coverage gaps
   - Validates requirement completeness
   - Outputs alignment mapping

4. **Architecture Agent**:
   - Plans UVM testbench structure
   - Determines required agents and interfaces
   - Designs sequence hierarchy
   - Plans scoreboard and coverage strategy
   - Outputs architecture plan

5. **Generator Agent**:
   - Generates UVM component code
   - Creates drivers, monitors, agents
   - Implements interfaces and transactions
   - Generates environment and configuration
   - Applies protocol-specific templates
   - Outputs UVM component files

6. **Sequence Agent**:
   - Creates stimulus sequences
   - Generates directed and random tests
   - Implements error injection sequences
   - Creates test scenarios
   - Outputs sequence and test files

7. **Validation Agent**:
   - Validates code completeness
   - Checks UVM compliance
   - Calculates simulation readiness score
   - Identifies missing components
   - Provides improvement recommendations
   - Outputs validation report

## Features

### Core Features

- ✅ Multi-format specification input (PDF, DOCX, MD, TXT)
- ✅ SystemVerilog/Verilog RTL parsing
- ✅ Protocol auto-detection (AXI, APB, UART, I2C, SPI)
- ✅ UVM component generation (drivers, monitors, agents, env, tests)
- ✅ Sequence and test generation (directed, random, error injection)
- ✅ Functional coverage model generation
- ✅ Scoreboard generation with reference model
- ✅ Real-time progress tracking via WebSocket
- ✅ Traceability matrix (requirements → components)
- ✅ Simulation readiness scoring
- ✅ Inline code editing with Monaco Editor
- ✅ Complete testbench download as ZIP

### Simulation Features

- ✅ Multi-simulator support (ModelSim, VCS, Xcelium, Verilator, Icarus)
- ✅ Automatic simulator detection
- ✅ UVM compatibility validation
- ✅ Simulation configuration dialog
- ✅ Real-time simulation progress tracking
- ✅ VCD file generation
- ✅ Simulation error reporting

### Visualization Features

- ✅ Interactive waveform viewer with D3.js
- ✅ VCD file parsing and rendering
- ✅ Signal grouping and hierarchy
- ✅ Time-based navigation and zooming
- ✅ Component diagram with signal flow
- ✅ Event visualization timeline
- ✅ Signal search and filtering
- ✅ Waveform export capabilities

### Developer Features

- ✅ TypeScript for type safety
- ✅ Monorepo structure with workspaces
- ✅ Comprehensive test coverage (unit, integration, E2E)
- ✅ Property-based testing with fast-check
- ✅ ESLint and Prettier for code quality
- ✅ Docker support for development and production
- ✅ CI/CD ready
- ✅ API documentation
- ✅ Deployment guides

## Deployment

### Production Deployment on Render

The application is configured for deployment on Render with:

- Automatic builds from GitHub
- Environment variable management
- MongoDB Atlas integration
- Static site hosting for frontend
- Web service for backend

See [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) for detailed instructions.

### Docker Deployment

```bash
# Build and run production containers
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop containers
docker-compose -f docker-compose.prod.yml down
```

### Manual Deployment

See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for complete deployment steps.

## API Documentation

API endpoints are documented in [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md).

Key endpoints:

- `POST /api/projects` - Create new project
- `POST /api/projects/:id/files` - Upload files
- `POST /api/projects/:id/generate` - Start generation
- `GET /api/projects/:id/generation/:genId/status` - Get generation status
- `POST /api/projects/:id/simulate` - Start simulation
- `GET /api/projects/:id/simulate/:jobId/status` - Get simulation status
- `GET /api/simulators` - Get available simulators

WebSocket events:

- `generation:progress` - Generation progress updates
- `generation:complete` - Generation completion
- `generation:error` - Generation errors

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the TypeScript style guide
4. Write tests for new features
5. Ensure all tests pass (`npm run test`)
6. Format code with Prettier (`npm run format`)
7. Lint code (`npm run lint`)
8. Commit changes (`git commit -m 'Add amazing feature'`)
9. Push to branch (`git push origin feature/amazing-feature`)
10. Open a Pull Request

### Commit Message Convention

Follow conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test additions or changes
- `chore:` - Build process or auxiliary tool changes

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- Documentation: [docs/](docs/)
- Issues: [GitHub Issues](https://github.com/gk19vlsi/uvm-testbench-generator/issues)
- Discussions: [GitHub Discussions](https://github.com/gk19vlsi/uvm-testbench-generator/discussions)

## Acknowledgments

- OpenAI for GPT models
- LangChain for LLM orchestration
- MongoDB for database
- React and Vite communities
- UVM community for verification methodology
