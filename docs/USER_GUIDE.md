# UVM Testbench Chatbot - User Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Creating a Project](#creating-a-project)
4. [Uploading Files](#uploading-files)
5. [Generating Testbenches](#generating-testbenches)
6. [Viewing Results](#viewing-results)
7. [Editing Code](#editing-code)
8. [Downloading Testbenches](#downloading-testbenches)
9. [Understanding Readiness Scores](#understanding-readiness-scores)
10. [Troubleshooting](#troubleshooting)

---

## Introduction

The UVM Testbench Chatbot is an AI-powered tool that automatically generates complete, runnable UVM testbenches from your verification specifications and RTL designs. It uses a multi-agent AI pipeline to transform your requirements into production-ready SystemVerilog code.

### Key Features

- **Automatic testbench generation** from specifications and RTL
- **Protocol auto-detection** (AXI, APB, UART, I2C, SPI)
- **Real-time progress tracking** during generation
- **Interactive code editing** with syntax highlighting
- **Traceability matrix** linking requirements to components
- **Readiness scoring** to assess simulation readiness
- **Complete file structure** with compilation instructions

---

## Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, or Edge)
- Specification documents (PDF, DOCX, MD, or TXT)
- RTL design files (SystemVerilog .sv or Verilog .v)

### Accessing the Application

1. Open your web browser
2. Navigate to `http://localhost:5173` (or your deployment URL)
3. You'll see the project dashboard

---

## Creating a Project

### Step 1: Open the Dashboard

The dashboard displays all your projects. Click the **"Create New Project"** button to start.

### Step 2: Enter Project Details

Fill in the project creation form:

- **Project Name** (required): A descriptive name for your project
  - Example: "AXI4 Slave Verification"
  - Must be 1-100 characters
  - Avoid special characters

- **Description** (optional): Additional details about the project
  - Example: "UVM testbench for AXI4 slave interface with full protocol coverage"

### Step 3: Create the Project

Click **"Create Project"** to proceed. You'll be taken to the generation interface.

---

## Uploading Files

### Supported File Formats

#### Specification Files

- **PDF** (.pdf) - Specification documents
- **DOCX** (.docx) - Microsoft Word documents
- **Markdown** (.md) - Markdown files
- **Text** (.txt) - Plain text files

#### RTL Files

- **SystemVerilog** (.sv, .svh) - SystemVerilog design files
- **Verilog** (.v, .vh) - Verilog design files

### File Size Limits

- **Maximum file size**: 50MB per file
- **Maximum project size**: 200MB total

### Uploading Specification Files

1. Locate the **"Specification Files"** upload area
2. Click the upload area or drag and drop your files
3. Select one or more specification files
4. Wait for the upload to complete (progress bar will show status)
5. Uploaded files will appear in the list below

### Uploading RTL Files

1. Locate the **"RTL Files"** upload area
2. Click the upload area or drag and drop your files
3. Select one or more RTL design files
4. Wait for the upload to complete
5. Uploaded files will appear in the list below

### Removing Files

To remove an uploaded file:

1. Find the file in the uploaded files list
2. Click the **trash icon** next to the filename
3. Confirm the deletion

---

## Generating Testbenches

### Generation Modes

Choose the appropriate generation mode for your needs:

#### MVP Mode

**Best for:** Quick prototyping and initial exploration

**Features:**

- Single agent testbench
- Basic driver and monitor
- One test and one sequence
- Minimal coverage
- Fast generation (5-10 minutes)

**Use when:**

- You want to quickly validate the concept
- You need a starting point for manual development
- You're exploring different approaches

#### Production Mode (Recommended)

**Best for:** Complete verification environments

**Features:**

- Multi-agent testbench
- Full driver, monitor, and sequencer
- Multiple tests and sequences
- Scoreboard with checking
- Functional coverage
- Randomization with constraints
- Moderate generation time (10-15 minutes)

**Use when:**

- You need a complete verification environment
- You want comprehensive coverage
- You're ready for serious verification work

#### Advanced Mode

**Best for:** Complex designs with multiple protocols

**Features:**

- All Production mode features
- Automatic protocol detection
- Multi-DUT support
- Advanced error injection
- Stress testing sequences
- Longer generation time (15-20 minutes)

**Use when:**

- Your design has multiple protocols
- You need advanced verification features
- You have complex verification requirements

### Starting Generation

1. Ensure you've uploaded at least one specification file and one RTL file
2. Select your desired **generation mode**
3. (Optional) Select a specific LLM model in settings
4. Click the **"Generate Testbench"** button
5. The generation process will begin

### Monitoring Progress

During generation, you'll see real-time updates:

- **Current Agent**: Which AI agent is currently working
- **Progress Percentage**: Overall completion status
- **Status Messages**: Detailed progress information
- **Agent Details**: Specific findings (protocols detected, files generated, etc.)

The generation process includes 7 agents:

1. **Specification Agent** - Analyzes your requirements
2. **RTL Agent** - Parses your design files
3. **Alignment Agent** - Maps requirements to signals
4. **Architecture Agent** - Plans testbench structure
5. **Generator Agent** - Creates UVM components
6. **Sequence Agent** - Generates tests and sequences
7. **Validation Agent** - Validates completeness

---

## Viewing Results

### UVM Tree Viewer

The UVM tree shows your testbench hierarchy:

**Viewing the Tree:**

1. After generation completes, scroll to the **"UVM Tree"** section
2. Click the expand/collapse icons to navigate the hierarchy
3. Click on any component to view its details

**Component Types:**

- **Environment** (env) - Top-level testbench environment
- **Agent** - Verification component for a specific interface
- **Driver** - Drives transactions to the DUT
- **Monitor** - Observes DUT signals
- **Sequencer** - Manages sequence execution
- **Scoreboard** - Checks DUT correctness
- **Interface** - SystemVerilog interface definition
- **Sequence** - Stimulus generation
- **Test** - Test case

**Component Details:**

- Click a component to see its code
- View component description and purpose
- See connections to other components

### Traceability Matrix

The traceability matrix shows how requirements map to components:

**Understanding the Matrix:**

- **Rows**: Specification requirements
- **Columns**: UVM components
- **Green cells**: Requirement is covered by component
- **Red cells**: Requirement is not covered
- **Coverage percentage**: Overall requirement coverage

**Using the Matrix:**

1. Click on any cell to see details
2. View the requirement text
3. See which components implement it
4. Identify coverage gaps

### Readiness Score

The readiness score indicates how ready your testbench is for simulation.

**Score Breakdown:**

- **Completeness** (35%): All required components present
- **Connectivity** (35%): All signals properly connected
- **Syntax** (20%): Code follows SystemVerilog syntax
- **Coverage** (10%): Coverage model completeness

**Classifications:**

- **Ready** (90-100): Testbench is simulation-ready
- **Needs Review** (70-89): Minor issues to address
- **Not Ready** (<70): Significant issues require attention

**Recommendations:**

- Review the recommendations list
- Address critical issues first
- Fix warnings for better quality

---

## Editing Code

### Opening the Code Editor

1. Click on any file in the UVM tree
2. The code editor will open in a panel
3. You'll see syntax-highlighted SystemVerilog code

### Editing Features

**Syntax Highlighting:**

- Keywords, types, and comments are color-coded
- Makes code easier to read and understand

**Line Numbers:**

- Every line is numbered for easy reference
- Helps with debugging and collaboration

**Find and Replace:**

- Press `Ctrl+F` (Windows/Linux) or `Cmd+F` (Mac) to find text
- Press `Ctrl+H` (Windows/Linux) or `Cmd+H` (Mac) to replace text

**Keyboard Shortcuts:**

- `Ctrl+S` / `Cmd+S`: Save changes
- `Ctrl+Z` / `Cmd+Z`: Undo
- `Ctrl+Y` / `Cmd+Y`: Redo
- `Ctrl+F` / `Cmd+F`: Find
- `Ctrl+H` / `Cmd+H`: Replace

### Saving Changes

1. Make your edits in the code editor
2. Click the **"Save"** button or press `Ctrl+S` / `Cmd+S`
3. The system will validate syntax
4. If errors are found, they'll be highlighted
5. Fix errors and save again

### Creating New Sequences

1. Click the **"Create Sequence"** button
2. Enter a sequence name (e.g., "burst_write_seq")
3. Select sequence type:
   - **Directed**: Specific test scenario
   - **Random**: Constrained-random stimulus
   - **Error**: Error injection
4. Click **"Create"**
5. The editor will open with a template
6. Customize the sequence logic
7. Save your changes

---

## Downloading Testbenches

### Downloading Complete Testbench

1. Scroll to the **"Download"** section
2. Click the **"Download ZIP"** button
3. A ZIP file will be downloaded containing:
   - All generated SystemVerilog files
   - Complete directory structure
   - README.md with compilation instructions
   - Makefile (if applicable)

### Downloading Individual Files

1. In the UVM tree, hover over a file
2. Click the **download icon**
3. The individual file will be downloaded

### ZIP Contents

The downloaded ZIP includes:

```
testbench-{projectId}/
├── tb_top.sv                 # Top-level testbench
├── interfaces/               # Interface definitions
│   └── {protocol}_if.sv
├── agents/                   # Agent directories
│   └── {agent_name}/
│       ├── {agent}_driver.sv
│       ├── {agent}_monitor.sv
│       ├── {agent}_sequencer.sv
│       └── {agent}_agent.sv
├── sequences/                # Sequence files
│   ├── base_seq.sv
│   ├── directed_seq.sv
│   └── random_seq.sv
├── tests/                    # Test files
│   ├── smoke_test.sv
│   └── random_test.sv
├── scoreboard/               # Scoreboard
│   └── scoreboard.sv
├── env/                      # Environment
│   └── env.sv
└── README.md                 # Compilation instructions
```

---

## Understanding Readiness Scores

### Score Components

#### Completeness Score (35% weight)

**What it measures:**

- All required UVM components are generated
- No missing drivers, monitors, or agents
- Environment hierarchy is complete

**How to improve:**

- Ensure all interfaces are covered
- Verify all agents are instantiated
- Check for missing components in recommendations

#### Connectivity Score (35% weight)

**What it measures:**

- All DUT ports are connected to testbench
- Virtual interfaces are properly configured
- Config_db paths are correct

**How to improve:**

- Review unconnected signals in recommendations
- Verify interface connections
- Check config_db set/get calls

#### Syntax Score (20% weight)

**What it measures:**

- Generated code follows SystemVerilog syntax
- No compilation errors
- Proper UVM methodology usage

**How to improve:**

- Fix syntax errors highlighted in editor
- Review compiler error messages
- Ensure proper UVM macro usage

#### Coverage Score (10% weight)

**What it measures:**

- Functional coverage model completeness
- Coverage points for key signals
- Cross-coverage for related signals

**How to improve:**

- Add missing coverpoints
- Define cross-coverage
- Sample coverage at appropriate events

### Score Classifications

#### Ready (90-100)

✅ **Your testbench is simulation-ready!**

**What this means:**

- All components are present and connected
- No critical syntax errors
- Coverage model is complete
- You can proceed to simulation

**Next steps:**

1. Download the testbench
2. Compile with your simulator
3. Run tests
4. Review coverage reports

#### Needs Review (70-89)

⚠️ **Minor issues to address**

**What this means:**

- Testbench is mostly complete
- Some warnings or minor issues
- May work but could be improved

**Next steps:**

1. Review recommendations list
2. Address warnings
3. Test critical functionality
4. Consider fixing issues before full regression

#### Not Ready (<70)

❌ **Significant issues require attention**

**What this means:**

- Critical components missing
- Major connectivity issues
- Syntax errors present
- Not ready for simulation

**Next steps:**

1. Review all critical recommendations
2. Fix missing components
3. Resolve connectivity issues
4. Fix syntax errors
5. Re-validate after fixes

---

## Troubleshooting

### Common Issues

#### "Generate button is disabled"

**Cause:** Missing required files

**Solution:**

- Upload at least one specification file
- Upload at least one RTL file
- Wait for uploads to complete

#### "File upload failed"

**Possible causes:**

- File size exceeds 50MB
- Invalid file format
- Network connection issue

**Solutions:**

- Check file size and compress if needed
- Verify file format is supported
- Check your internet connection
- Try uploading again

#### "Generation failed"

**Possible causes:**

- Specification is ambiguous or incomplete
- RTL has syntax errors
- LLM API error

**Solutions:**

- Review error message details
- Check specification clarity
- Validate RTL syntax
- Try generation again
- Contact support if issue persists

#### "Low readiness score"

**Cause:** Issues detected in generated testbench

**Solution:**

- Review recommendations carefully
- Address critical issues first
- Fix connectivity problems
- Resolve syntax errors
- Consider regenerating with different mode

#### "WebSocket disconnected"

**Cause:** Network connection lost

**Solution:**

- Check your internet connection
- Refresh the page
- Generation will continue on server
- Check generation status after reconnecting

### Getting Help

If you encounter issues:

1. **Check error messages** - They often contain helpful information
2. **Review recommendations** - The system provides actionable guidance
3. **Try different generation mode** - MVP mode is faster and simpler
4. **Check file formats** - Ensure files are supported formats
5. **Verify file content** - Make sure specifications are clear and RTL is valid

---

## Best Practices

### Writing Good Specifications

1. **Be specific** - Clearly define requirements
2. **Include examples** - Show expected behavior
3. **Define protocols** - Specify communication standards
4. **List coverage goals** - What needs to be verified
5. **Describe error cases** - How should errors be handled

### Preparing RTL Files

1. **Clean syntax** - Ensure RTL compiles
2. **Clear naming** - Use descriptive signal names
3. **Add comments** - Explain complex logic
4. **Include interfaces** - Define interface boundaries
5. **Document parameters** - Explain configuration options

### Choosing Generation Modes

- **Start with MVP** for quick validation
- **Use Production** for complete testbenches
- **Choose Advanced** for complex designs
- **Iterate** - Generate, review, refine, regenerate

### Reviewing Results

1. **Check readiness score** first
2. **Review traceability matrix** for coverage
3. **Examine UVM tree** for structure
4. **Read recommendations** carefully
5. **Test critical paths** before full regression

---

## Appendix

### Keyboard Shortcuts

| Action  | Windows/Linux | Mac   |
| ------- | ------------- | ----- |
| Save    | Ctrl+S        | Cmd+S |
| Find    | Ctrl+F        | Cmd+F |
| Replace | Ctrl+H        | Cmd+H |
| Undo    | Ctrl+Z        | Cmd+Z |
| Redo    | Ctrl+Y        | Cmd+Y |

### File Format Reference

| Type          | Extensions             | MIME Types                                                                                                          |
| ------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Specification | .pdf, .docx, .md, .txt | application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/markdown, text/plain |
| RTL           | .sv, .v, .vh, .svh     | text/plain                                                                                                          |

### Generation Time Estimates

| Mode       | Typical Time  | Complexity |
| ---------- | ------------- | ---------- |
| MVP        | 5-10 minutes  | Low        |
| Production | 10-15 minutes | Medium     |
| Advanced   | 15-20 minutes | High       |

_Times vary based on design complexity and specification detail_

---

**Version:** 1.0.0  
**Last Updated:** January 2024

For technical support or questions, please refer to the API documentation or contact your system administrator.
