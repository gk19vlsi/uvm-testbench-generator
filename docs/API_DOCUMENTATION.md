# UVM Testbench Chatbot API Documentation

## Overview

The UVM Testbench Chatbot API provides RESTful endpoints for managing projects, uploading files, generating UVM testbenches, and retrieving results. The API uses JSON for request and response bodies.

**Base URL:** `http://localhost:3000/api`

**Authentication:** None (internal tool)

## Table of Contents

- [Project Management](#project-management)
- [File Upload](#file-upload)
- [Testbench Generation](#testbench-generation)
- [Results and Download](#results-and-download)
- [LLM Configuration](#llm-configuration)
- [WebSocket Communication](#websocket-communication)
- [Error Codes](#error-codes)

---

## Project Management

### Create Project

Create a new project for testbench generation.

**Endpoint:** `POST /api/projects`

**Request Body:**

```json
{
  "name": "AXI4 Slave Testbench",
  "description": "Testbench for AXI4 slave interface verification"
}
```

**Response:** `200 OK`

```json
{
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "AXI4 Slave Testbench",
  "description": "Testbench for AXI4 slave interface verification",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "status": "draft"
}
```

**Validation:**

- `name` (required): 1-100 characters, no special characters
- `description` (optional): String

**Rate Limit:** 100 requests per minute

---

### List Projects

Retrieve all projects.

**Endpoint:** `GET /api/projects`

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:** `200 OK`

```json
{
  "projects": [
    {
      "projectId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "AXI4 Slave Testbench",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "lastModified": "2024-01-15T11:45:00.000Z",
      "status": "completed",
      "readinessScore": 92
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

**Rate Limit:** 100 requests per minute

---

### Get Project Details

Retrieve detailed information about a specific project.

**Endpoint:** `GET /api/projects/:projectId`

**Path Parameters:**

- `projectId`: UUID of the project

**Response:** `200 OK`

```json
{
  "project": {
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "AXI4 Slave Testbench",
    "description": "Testbench for AXI4 slave interface verification",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "lastModified": "2024-01-15T11:45:00.000Z",
    "status": "completed",
    "generationConfig": {
      "mode": "production",
      "llmModel": "gpt-4"
    }
  },
  "files": [
    {
      "fileId": "file-123",
      "filename": "axi4_spec.pdf",
      "size": 1048576,
      "mimeType": "application/pdf",
      "uploadedAt": "2024-01-15T10:35:00.000Z"
    }
  ],
  "generationResults": {
    "readinessScore": 92,
    "generatedFiles": 15
  }
}
```

**Error Responses:**

- `404 Not Found`: Project not found

**Rate Limit:** 100 requests per minute

---

### Delete Project

Delete a project and all associated files.

**Endpoint:** `DELETE /api/projects/:projectId`

**Path Parameters:**

- `projectId`: UUID of the project

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

**Error Responses:**

- `404 Not Found`: Project not found

**Rate Limit:** 100 requests per minute

---

## File Upload

### Upload Files

Upload specification or RTL files to a project.

**Endpoint:** `POST /api/projects/:projectId/files/upload`

**Content-Type:** `multipart/form-data`

**Form Data:**

- `files`: File(s) to upload (max 10 files)
- `fileType`: "specification" or "rtl"

**Request Example:**

```bash
curl -X POST \
  http://localhost:3000/api/projects/550e8400-e29b-41d4-a716-446655440000/files/upload \
  -F "files=@spec.pdf" \
  -F "fileType=specification"
```

**Response:** `200 OK`

```json
{
  "uploadedFiles": [
    {
      "fileId": "file-123",
      "filename": "spec.pdf",
      "size": 1048576,
      "mimeType": "application/pdf",
      "uploadedAt": "2024-01-15T10:35:00.000Z",
      "storagePath": "projects/550e8400-e29b-41d4-a716-446655440000/uploads/specifications/spec.pdf"
    }
  ]
}
```

**File Constraints:**

- Max file size: 50MB per file
- Max project size: 200MB total
- Specification formats: PDF, DOCX, MD, TXT
- RTL formats: .sv, .v, .vh, .svh

**Error Responses:**

- `400 Bad Request`: Invalid file type, size exceeded, or invalid format
- `404 Not Found`: Project not found

**Rate Limit:** 10 uploads per minute

---

### Delete File

Remove an uploaded file from a project.

**Endpoint:** `DELETE /api/projects/:projectId/files/:fileId`

**Path Parameters:**

- `projectId`: UUID of the project
- `fileId`: ID of the file to delete

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

**Error Responses:**

- `404 Not Found`: Project or file not found

**Rate Limit:** 100 requests per minute

---

## Testbench Generation

### Start Generation

Initiate testbench generation for a project.

**Endpoint:** `POST /api/projects/:projectId/generate`

**Request Body:**

```json
{
  "mode": "production",
  "llmModel": "gpt-4"
}
```

**Parameters:**

- `mode` (required): "mvp", "production", or "advanced"
- `llmModel` (optional): "gpt-4", "gpt-3.5-turbo", or "gpt-4-turbo"

**Response:** `200 OK`

```json
{
  "generationId": "gen-456",
  "status": "queued",
  "websocketUrl": "ws://localhost:3000",
  "message": "Generation started successfully"
}
```

**Prerequisites:**

- Project must have at least one specification file
- Project must have at least one RTL file

**Error Responses:**

- `400 Bad Request`: Missing files or invalid mode
- `404 Not Found`: Project not found
- `429 Too Many Requests`: Rate limit exceeded (5 per hour)

**Rate Limit:** 5 generations per hour

---

### Get Generation Status

Check the status of a generation.

**Endpoint:** `GET /api/projects/:projectId/generation/:generationId/status`

**Path Parameters:**

- `projectId`: UUID of the project
- `generationId`: ID of the generation

**Response:** `200 OK`

```json
{
  "generationId": "gen-456",
  "status": "in_progress",
  "currentAgent": "ArchitectureAgent",
  "progress": 45,
  "startedAt": "2024-01-15T11:00:00.000Z",
  "estimatedCompletion": "2024-01-15T11:15:00.000Z"
}
```

**Status Values:**

- `queued`: Waiting to start
- `in_progress`: Currently generating
- `completed`: Generation finished successfully
- `failed`: Generation failed with errors

**Rate Limit:** 100 requests per minute

---

## Results and Download

### Get Results

Retrieve generation results including UVM tree and traceability matrix.

**Endpoint:** `GET /api/projects/:projectId/results`

**Response:** `200 OK`

```json
{
  "uvmTree": {
    "id": "env",
    "name": "axi4_env",
    "type": "env",
    "children": [
      {
        "id": "agent-1",
        "name": "axi4_agent",
        "type": "agent",
        "children": []
      }
    ]
  },
  "traceabilityMatrix": {
    "requirements": [
      {
        "id": "req-1",
        "text": "Support AXI4 write transactions",
        "covered": true
      }
    ],
    "components": [
      {
        "id": "comp-1",
        "name": "axi4_driver",
        "type": "driver"
      }
    ],
    "mappings": [
      {
        "requirementId": "req-1",
        "componentId": "comp-1",
        "covered": true
      }
    ],
    "coveragePercentage": 95
  },
  "readinessScore": {
    "overall": 92,
    "breakdown": {
      "completeness": 95,
      "connectivity": 90,
      "syntax": 100,
      "coverage": 85
    },
    "classification": "Ready"
  },
  "generatedFiles": [
    {
      "path": "tb_top.sv",
      "type": "top",
      "size": 2048
    }
  ]
}
```

**Rate Limit:** 100 requests per minute

---

### Download Testbench

Download complete testbench as ZIP archive.

**Endpoint:** `GET /api/projects/:projectId/download`

**Response:** `200 OK`

- Content-Type: `application/zip`
- Content-Disposition: `attachment; filename="testbench-{projectId}.zip"`

**ZIP Contents:**

- All generated SystemVerilog files
- Directory structure preserved
- README.md with compilation instructions

**Rate Limit:** 100 requests per minute

---

### Get File Content

Retrieve content of a specific generated file.

**Endpoint:** `GET /api/projects/:projectId/files/:filePath`

**Path Parameters:**

- `projectId`: UUID of the project
- `filePath`: Relative path to the file

**Response:** `200 OK`

```json
{
  "filePath": "agents/axi4_agent/axi4_driver.sv",
  "content": "class axi4_driver extends uvm_driver...",
  "language": "systemverilog"
}
```

**Rate Limit:** 100 requests per minute

---

### Update File Content

Update content of a generated file.

**Endpoint:** `PUT /api/projects/:projectId/files/:filePath`

**Request Body:**

```json
{
  "content": "class axi4_driver extends uvm_driver..."
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "syntaxErrors": []
}
```

**Error Responses:**

- `400 Bad Request`: Syntax errors detected

```json
{
  "success": false,
  "syntaxErrors": [
    {
      "line": 10,
      "column": 5,
      "message": "Expected semicolon"
    }
  ]
}
```

**Rate Limit:** 100 requests per minute

---

## LLM Configuration

### Get LLM Configuration

Retrieve current LLM configuration.

**Endpoint:** `GET /api/llm/config`

**Response:** `200 OK`

```json
{
  "provider": "openai",
  "defaultModel": "gpt-4",
  "models": ["gpt-4", "gpt-3.5-turbo", "gpt-4-turbo"],
  "validated": true,
  "validatedAt": "2024-01-15T09:00:00.000Z"
}
```

**Rate Limit:** 100 requests per minute

---

### Update LLM Configuration

Update LLM provider and model settings.

**Endpoint:** `POST /api/llm/config`

**Request Body:**

```json
{
  "provider": "openai",
  "model": "gpt-4"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "validated": true,
  "message": "LLM configuration updated successfully"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid provider or model
- `401 Unauthorized`: API key validation failed

**Rate Limit:** 10 requests per minute

---

## WebSocket Communication

### Connection

Connect to WebSocket server for real-time updates.

**URL:** `ws://localhost:3000`

**Connection Example:**

```javascript
const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Connected to WebSocket server");
});
```

---

### Join Project Room

Subscribe to updates for a specific project.

**Event:** `join-project`

**Payload:**

```json
{
  "projectId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response Event:** `joined-project`

```json
{
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Joined project room successfully"
}
```

---

### Progress Updates

Receive real-time progress updates during generation.

**Event:** `progress-update`

**Payload:**

```json
{
  "timestamp": "2024-01-15T11:05:00.000Z",
  "agentName": "SpecificationAgent",
  "status": "in_progress",
  "message": "Analyzing specification document...",
  "details": {
    "protocolsDetected": ["AXI4"],
    "transactionsFound": 5
  }
}
```

**Status Values:**

- `started`: Agent started execution
- `in_progress`: Agent is processing
- `completed`: Agent finished successfully
- `failed`: Agent encountered an error

---

### Error Notifications

Receive error notifications during generation.

**Event:** `error-notification`

**Payload:**

```json
{
  "timestamp": "2024-01-15T11:10:00.000Z",
  "severity": "critical",
  "agentName": "RTLAgent",
  "error": "Failed to parse RTL file",
  "details": {
    "file": "design.sv",
    "line": 45,
    "message": "Syntax error: unexpected token"
  },
  "recommendations": ["Check RTL file syntax", "Verify file encoding"]
}
```

**Severity Levels:**

- `critical`: Generation cannot continue
- `warning`: Issue detected but generation continues
- `info`: Informational message

---

### Generation Complete

Receive notification when generation completes.

**Event:** `generation-complete`

**Payload:**

```json
{
  "timestamp": "2024-01-15T11:15:00.000Z",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "generationId": "gen-456",
  "status": "completed",
  "readinessScore": {
    "overall": 92,
    "classification": "Ready"
  },
  "statistics": {
    "filesGenerated": 15,
    "executionTime": 900000,
    "tokensUsed": 15000
  }
}
```

---

## Error Codes

### HTTP Status Codes

| Code | Description                             |
| ---- | --------------------------------------- |
| 200  | Success                                 |
| 400  | Bad Request - Invalid input             |
| 401  | Unauthorized - Authentication failed    |
| 404  | Not Found - Resource not found          |
| 429  | Too Many Requests - Rate limit exceeded |
| 500  | Internal Server Error                   |

### Error Response Format

```json
{
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes

| Code                      | Description                    |
| ------------------------- | ------------------------------ |
| `INVALID_PROJECT_NAME`    | Project name validation failed |
| `INVALID_FILE_TYPE`       | Unsupported file format        |
| `FILE_SIZE_EXCEEDED`      | File exceeds size limit        |
| `PROJECT_NOT_FOUND`       | Project does not exist         |
| `GENERATION_FAILED`       | Testbench generation failed    |
| `RATE_LIMIT_EXCEEDED`     | Too many requests              |
| `MISSING_FILES`           | Required files not uploaded    |
| `INVALID_GENERATION_MODE` | Invalid generation mode        |
| `LLM_API_ERROR`           | LLM provider API error         |

---

## Rate Limiting

All endpoints are rate-limited to prevent abuse.

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-01-15T11:20:00.000Z
```

### Rate Limit Response

When rate limit is exceeded:

```json
{
  "error": "Too many requests, please try again later",
  "retryAfter": 60
}
```

**Headers:**

- `Retry-After`: Seconds until rate limit resets

---

## Examples

### Complete Workflow Example

```javascript
// 1. Create project
const project = await fetch("http://localhost:3000/api/projects", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "AXI4 Testbench",
    description: "Verification environment for AXI4 slave",
  }),
}).then((r) => r.json());

// 2. Upload specification
const specForm = new FormData();
specForm.append("files", specFile);
specForm.append("fileType", "specification");

await fetch(
  `http://localhost:3000/api/projects/${project.projectId}/files/upload`,
  {
    method: "POST",
    body: specForm,
  },
);

// 3. Upload RTL
const rtlForm = new FormData();
rtlForm.append("files", rtlFile);
rtlForm.append("fileType", "rtl");

await fetch(
  `http://localhost:3000/api/projects/${project.projectId}/files/upload`,
  {
    method: "POST",
    body: rtlForm,
  },
);

// 4. Start generation
const generation = await fetch(
  `http://localhost:3000/api/projects/${project.projectId}/generate`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "production" }),
  },
).then((r) => r.json());

// 5. Connect to WebSocket for progress
const socket = io("http://localhost:3000");
socket.emit("join-project", project.projectId);

socket.on("progress-update", (update) => {
  console.log(`${update.agentName}: ${update.message}`);
});

socket.on("generation-complete", async () => {
  // 6. Download results
  window.location.href = `http://localhost:3000/api/projects/${project.projectId}/download`;
});
```

---

## Support

For issues or questions:

- Check error messages and codes
- Review rate limit headers
- Verify request format matches documentation
- Check WebSocket connection status

---

**Version:** 1.0.0  
**Last Updated:** January 2024
