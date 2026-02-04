# Frontend - UVM Testbench Chatbot

React-based frontend application for the UVM Testbench Chatbot system.

## Structure

```
frontend/
├── src/
│   ├── App.tsx            # Main application component
│   ├── main.tsx           # React entry point
│   ├── index.css          # Global styles with Tailwind
│   └── setupTests.ts      # Test setup
├── index.html             # HTML template
├── Dockerfile             # Docker configuration
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite build configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── jest.config.js         # Jest test configuration
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Type check
npm run type-check
```

## Features

### Planned Components

1. **Project Dashboard**
   - List all projects
   - Create new project
   - Delete projects
   - Navigate to generation page

2. **Unified Generation Interface**
   - File upload (drag-and-drop)
   - Generation controls
   - Real-time progress tracking
   - Results visualization

3. **UVM Tree Viewer**
   - Hierarchical component visualization
   - Component details panel
   - Code preview

4. **Traceability Matrix**
   - Requirements to components mapping
   - Coverage visualization
   - Interactive cells

5. **Inline Code Editor**
   - Monaco Editor integration
   - SystemVerilog syntax highlighting
   - Save and validate

6. **Download Manager**
   - ZIP download
   - Individual file download

## Styling

The application uses Tailwind CSS for styling:

- Utility-first CSS framework
- Responsive design
- Custom color palette
- Component-based styling

## State Management

- **React Query**: Server state management and caching
- **React Context**: Global UI state (if needed)
- **Local State**: Component-specific state with useState/useReducer

## API Integration

The frontend communicates with the backend via:

- **REST API**: HTTP requests using axios
- **WebSocket**: Real-time updates using socket.io-client

API base URL is configured via environment variable `VITE_API_URL`.

## Testing

The frontend uses Jest and React Testing Library:

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

Test files should be placed alongside components with `.test.tsx` or `.spec.tsx` extension.

## Build and Deployment

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

The build output is in the `dist/` directory and can be served by any static file server.
