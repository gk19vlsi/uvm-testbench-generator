# E2E Tests for UVM Testbench Chatbot

This directory contains end-to-end tests for the complete UVM Testbench Chatbot application using Playwright.

## Test Structure

```
e2e/
├── fixtures/              # Test data files
│   ├── sample-spec.md    # Sample specification document
│   └── sample-rtl.sv     # Sample RTL design file
├── utils/                 # Test utilities and helpers
│   └── test-helpers.ts   # Common test helper functions
├── 01-project-creation.spec.ts    # Project creation workflow tests
├── 02-file-upload.spec.ts         # File upload workflow tests
├── 03-generation-workflow.spec.ts # Generation workflow tests
├── 04-results-viewing.spec.ts     # Results viewing workflow tests
├── 05-code-editing.spec.ts        # Code editing workflow tests
└── 06-download.spec.ts            # Download workflow tests
```

## Running Tests

### Run all E2E tests

```bash
npm run test:e2e
```

### Run tests in UI mode (interactive)

```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)

```bash
npm run test:e2e:headed
```

### Run tests in debug mode

```bash
npm run test:e2e:debug
```

### Run specific test file

```bash
npx playwright test e2e/01-project-creation.spec.ts
```

### Run tests matching a pattern

```bash
npx playwright test --grep "should create"
```

## Test Coverage

### 01-project-creation.spec.ts

- Create new project from dashboard
- Validate project name requirement
- List existing projects
- Delete project
- Navigate to project generation page

### 02-file-upload.spec.ts

- Upload specification file
- Upload RTL file
- Upload multiple files
- Show upload progress
- Remove uploaded file
- Validate file format
- Enable generate button when files uploaded
- Display file size and type

### 03-generation-workflow.spec.ts

- Start generation workflow
- Display real-time progress updates
- Complete generation with real LLM (skipped by default)
- Handle generation errors
- Allow canceling generation
- Persist generation state on page reload

### 04-results-viewing.spec.ts

- Display UVM tree after generation
- Expand and collapse tree nodes
- Display component details on selection
- Display traceability matrix
- Highlight coverage in matrix
- Display coverage percentage
- Display readiness score
- Display readiness classification
- Display score breakdown
- Display recommendations
- Filter recommendations by severity

### 05-code-editing.spec.ts

- Open code editor on file selection
- Display syntax highlighting
- Edit and save code
- Display syntax errors
- Create new sequence
- Close editor without saving
- Support keyboard shortcuts
- Show line numbers
- Support find and replace

### 06-download.spec.ts

- Download complete testbench as ZIP
- Download individual file
- Show download progress
- Include README in ZIP
- Preserve directory structure in ZIP
- Handle download errors
- Allow re-downloading
- Display file count in download button
- Show download size estimate

## Environment Variables

The tests use the following environment variables:

- `E2E_BASE_URL`: Base URL for the application (default: http://localhost:5173)
- `TEST_MONGODB_URI`: MongoDB connection string for test database
- `OPENAI_API_KEY`: OpenAI API key for LLM tests (optional)

## Test Database

The tests use a separate test database to avoid affecting production data. The test database is automatically cleaned up before and after each test.

## Fixtures

Test fixtures are located in the `fixtures/` directory:

- `sample-spec.md`: AXI4 slave interface specification
- `sample-rtl.sv`: AXI4 slave RTL implementation

## Test Helpers

The `utils/test-helpers.ts` file provides common utilities:

- `TestHelpers`: Helper methods for interacting with the application
  - `waitForApiResponse()`: Wait for API response
  - `waitForWebSocketMessage()`: Wait for WebSocket message
  - `uploadFile()`: Upload file to application
  - `waitForElement()`: Wait for element to be visible
  - `waitForDownload()`: Wait for download to complete
  - `getFixturePath()`: Get path to fixture file

- `DatabaseHelpers`: Helper methods for database operations
  - `cleanupTestDatabase()`: Clean up test database
  - `createTestProject()`: Create test project via API
  - `deleteTestProject()`: Delete test project via API

## CI/CD Integration

The E2E tests are designed to run in CI/CD pipelines:

1. Tests run in headless mode by default
2. Screenshots and videos are captured on failure
3. Test results are exported in JSON format
4. Retries are configured for flaky tests

## Debugging Tests

### View test report

```bash
npx playwright show-report
```

### Run single test in debug mode

```bash
npx playwright test e2e/01-project-creation.spec.ts --debug
```

### Use Playwright Inspector

The debug mode automatically opens Playwright Inspector for step-by-step debugging.

## Best Practices

1. **Use data-testid attributes**: All interactive elements should have `data-testid` attributes
2. **Wait for elements**: Always wait for elements to be visible before interacting
3. **Clean up after tests**: Use beforeEach/afterEach to clean up test data
4. **Isolate tests**: Each test should be independent and not rely on other tests
5. **Use fixtures**: Store test data in fixtures directory
6. **Handle async operations**: Use proper async/await patterns
7. **Test real workflows**: E2E tests should test complete user workflows

## Known Issues

1. **LLM tests skipped**: Tests requiring real LLM calls are skipped by default to avoid API costs
2. **WebSocket timing**: Some WebSocket tests may be flaky due to timing issues
3. **File upload**: File upload tests require fixture files to exist

## Contributing

When adding new E2E tests:

1. Follow the existing test structure
2. Use descriptive test names
3. Add comments for complex test logic
4. Update this README with new test coverage
5. Ensure tests pass locally before committing
