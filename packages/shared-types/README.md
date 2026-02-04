# Shared Types - UVM Testbench Chatbot

Shared TypeScript type definitions used across frontend and backend.

## Overview

This package contains all shared interfaces, types, and enums used throughout the UVM Testbench Chatbot application. It ensures type consistency between frontend and backend.

## Structure

```
shared-types/
├── src/
│   ├── agent.ts           # Agent-related types
│   ├── file.ts            # File handling types
│   ├── generation.ts      # Generation process types
│   ├── llm.ts             # LLM configuration types
│   ├── project.ts         # Project management types
│   ├── validation.ts      # Validation and scoring types
│   ├── websocket.ts       # WebSocket message types
│   ├── api.ts             # API convenience exports
│   └── index.ts           # Main export
├── package.json
└── tsconfig.json
```

## Usage

### In Backend

```typescript
import {
  Project,
  CreateProjectRequest,
  GenerateTestbenchRequest,
  ProgressUpdate,
} from "@uvm-chatbot/shared-types";
```

### In Frontend

```typescript
import {
  ProjectSummary,
  FileMetadata,
  UVMTreeNode,
  SimulationReadinessScore,
} from "@uvm-chatbot/shared-types";
```

## Type Categories

### Project Types

- `Project`: Complete project data model
- `ProjectSummary`: Project list item
- `CreateProjectRequest/Response`: Project creation
- `ProjectStatus`: Project state enum

### File Types

- `FileReference`: File metadata in database
- `FileMetadata`: File upload tracking
- `FileType`: Specification or RTL
- `FileStatus`: Upload status

### Generation Types

- `Generation`: Generation process record
- `GenerateTestbenchRequest/Response`: Generation API
- `GenerationStatus`: Process status
- `GeneratedFile`: Output file

### Agent Types

- `AgentInput/Output`: Agent interface
- `DetectedProtocol`: Protocol detection result
- `TransactionDefinition`: Transaction structure
- `ModuleDefinition`: RTL module structure
- `AgentMapping`: Alignment result

### Validation Types

- `UVMTreeNode`: Component hierarchy
- `TraceabilityMatrix`: Requirements mapping
- `SimulationReadinessScore`: Validation score
- `Recommendation`: Validation feedback

### WebSocket Types

- `ProgressMessage`: Agent progress update
- `ErrorMessage`: Error notification
- `CompleteMessage`: Completion notification

### LLM Types

- `LLMConfiguration`: LLM provider config
- `LLMModel`: Supported models
- `LLMProvider`: Provider enum

## Development

```bash
# Build types
npm run build

# Type check
npm run type-check

# Lint
npm run lint

# Clean build artifacts
npm run clean
```

## Adding New Types

1. Create or update a file in `src/`
2. Export the types from that file
3. Re-export from `src/index.ts` if needed
4. Rebuild the package: `npm run build`

## Best Practices

- Use descriptive names for types and interfaces
- Document complex types with JSDoc comments
- Use enums for fixed sets of values
- Prefer interfaces over types for object shapes
- Use type aliases for unions and complex types
- Keep types focused and single-purpose
