# Quality Dimension Generator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-1.6+-purple.svg)](https://modelcontextprotocol.io/)

A sophisticated **Model Context Protocol (MCP) server** that generates comprehensive quality evaluation dimensions and assessment criteria for any task or project. Transform vague requirements into precise, measurable quality standards with AI-powered analysis.

## 🎯 What It Does

Quality Dimension Generator analyzes your tasks and automatically creates professional evaluation frameworks with:

- **📊 Multi-dimensional Assessment** - Generate 1-10 customizable evaluation dimensions
- **🎯 Precise Scoring Criteria** - Clear 0-10 point scoring guidelines for each dimension  
- **🔄 Intelligent Task Refinement** - AI-powered task description optimization
- **📝 Professional Documentation** - Export ready-to-use evaluation standards
- **⚙️ Flexible Configuration** - Adapt to different project types and quality standards

## 🌟 Key Features

### Core Capabilities
- **Enhanced Workflow Guidance** - Step-by-step progress tracking with clear next-action instructions
- **Intelligent Task Analysis** - Extract and refine core tasks with LLM-generated semantic naming
- **Dynamic Dimension Generation** - Create custom evaluation frameworks with professional standards
- **Flat File Architecture** - Streamlined storage with `taskId_TaskName.md` naming for easy organization
- **Progressive Status Tracking** - Visual progress indicators (Stage 1/3 → Stage 2/3 → Stage 3/3 Complete)
- **Enhanced Error Handling** - Comprehensive troubleshooting guidance with specific recovery steps
- **Smart Deduplication** - Avoid duplicate work with content-based hashing
- **Timezone Intelligence** - Automatic detection and localization

### Quality Standards
- **Three-Tier Scoring** - 6 (acceptable), 8 (excellent), 10 (outstanding) guidelines
- **Full Range Flexibility** - Support for any 0-10 scoring within dimensions
- **Professional Output** - Markdown-formatted, publication-ready documentation
- **Configurable Strictness** - Adjust evaluation rigor based on project needs

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- TypeScript 5.8 or higher
- MCP-compatible client (Claude Desktop, VS Code, etc.)

### Installation

Install from the **Smithery AI Model Context Protocol Registry**:

🔗 **[Get Quality Dimension Generator on Smithery](https://smithery.ai/server/@magenie33/quality-dimension-generator)**

The server will be automatically configured and ready to use with your MCP-compatible client.

### Configuration

#### Automatic Setup
Once installed from Smithery, the server is automatically configured in your MCP client. No manual configuration required!

#### Project Configuration

The tool automatically creates a `.qdg` directory in your project:

```
.qdg/
├── config/
│   └── qdg.config.json                    # Configuration settings
└── tasks/
    ├── task_[timestamp]_[hash]_TaskName.md     # Quality evaluation standards (flat files)
    ├── task_[timestamp]_[hash]_AnotherTask.md  # LLM-generated semantic naming  
    └── task_[timestamp]_[hash]_ThirdTask.md   # Organized by content, not folders
```

Configure dimensions and scoring in `.qdg/config/qdg.config.json`:
```json
{
  "settings": {
    "dimensionCount": 5,    // Number of evaluation dimensions (1-10)
    "expectedScore": 8      // Target quality level (0-10)
  }
}
```

## 📖 Usage Guide

## 🔄 Three-Stage Workflow

### Stage 1: Task Analysis with Workflow Guidance
```javascript
// Enhanced with progress tracking and next-step instructions
generate_task_analysis_prompt
```
**Features**: 
- ✅ Clear progress indicators (Stage 1/3 Complete)
- 📋 Detailed next-step instructions
- ⚠️ Important reminders for LLM execution
- 🔧 Enhanced error handling with troubleshooting guidance

**Output**: Structured LLM prompt with workflow guidance

### Stage 2: Quality Dimensions with Progress Tracking  
```javascript
// Enhanced with critical step emphasis and completion guidance
generate_quality_dimensions_prompt
```
**Features**:
- 🎯 Stage completion confirmation (Stage 2/3 Complete)
- 📋 Critical next-steps highlighting
- 🔄 TWO-STAGE output emphasis
- 🔧 Detailed error recovery procedures

**Output**: Professional evaluation dimensions with save instructions

### Stage 3: Enhanced Results Saving
```javascript
// Enhanced with workflow completion celebration and file details
save_quality_dimensions  
```
**Features**:
- 🎉 Complete workflow success confirmation
- ✅ Full progress tracking (Stage 1/3 ✅ Stage 2/3 ✅ Stage 3/3)
- 📁 Flat file structure with semantic naming
- 🚀 Ready-for-execution guidance

**Output**: Saved evaluation standards with detailed file information

### Advanced Usage

#### Custom Scoring Targets
Adjust evaluation strictness by setting target scores:
- **6-7**: Lenient evaluation for learning projects
- **8**: Standard professional quality (default)
- **9-10**: Strict evaluation for critical systems

#### Multiple Project Support
Each project maintains its own `.qdg` directory with independent configurations and task histories.

#### Intelligent Deduplication
The system automatically detects similar tasks using content hashing, preventing duplicate evaluation frameworks.

## 🛠 API Reference

### Tools Overview

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `generate_task_analysis_prompt` | Analyze user tasks | Message, history, context | Analysis prompt |
| `generate_quality_dimensions_prompt` | Create evaluation framework | Task analysis, config | Dimension prompt |
| `save_quality_dimensions` | Store evaluation standards | Task data, dimensions | Saved file path |
| `get_current_time_context` | Get temporal context | Locale, timezone | Time information |
| `diagnose_working_directory` | Debug environment | None | Diagnostic info |

### Tool Details

#### generate_task_analysis_prompt
Extracts and analyzes core tasks from user conversations.

**Parameters:**
- `userMessage` (string, required) - Primary user message
- `conversationHistory` (array, optional) - Previous conversation context
- `context` (object, optional) - Additional contextual information

**Returns:** Structured analysis prompt for LLM processing

#### generate_quality_dimensions_prompt
Generates comprehensive evaluation dimension prompts.

**Parameters:**
- `taskAnalysisJson` (string, required) - JSON result from task analysis
- `targetScore` (number, optional) - Target quality score (0-10, default: 8)
- `timezone` (string, optional) - Timezone for temporal context
- `locale` (string, optional) - Localization setting (default: "en-US")
- `projectPath` (string, optional) - Project directory path

**Returns:** Professional LLM prompt for dimension generation

#### save_quality_dimensions
Saves LLM-generated evaluation standards to project directory.

**Parameters:**
- `taskId` (string, required) - Unique task identifier
- `projectPath` (string, required) - Target project directory
- `refinedTaskDescription` (string, required) - LLM-refined task description
- `dimensionsContent` (string, required) - Generated evaluation dimensions
- `taskAnalysisJson` (string, optional) - Original task analysis for reference

**Returns:** Confirmation message with saved file location

## 💡 Examples

### Software Development Project
```markdown
# Task: Build REST API
## Evaluation Dimensions:
1. **Code Quality** (0-10) - Architecture, patterns, maintainability
2. **Security** (0-10) - Authentication, data protection, vulnerability handling
3. **Performance** (0-10) - Response times, scalability, resource efficiency
4. **Documentation** (0-10) - API docs, code comments, user guides
5. **Testing** (0-10) - Unit tests, integration tests, coverage
```

### Content Creation Task
```markdown
# Task: Write Technical Blog Post
## Evaluation Dimensions:
1. **Technical Accuracy** (0-10) - Correctness, depth, current best practices
2. **Clarity & Readability** (0-10) - Structure, language, accessibility
3. **Practical Value** (0-10) - Actionable insights, real-world applicability
4. **Engagement** (0-10) - Interest level, examples, storytelling
5. **SEO & Discoverability** (0-10) - Keywords, structure, metadata
```

## 🔧 Configuration Options

### Dimension Count
Control the number of evaluation dimensions (1-10):
```json
{
  "settings": {
    "dimensionCount": 3  // Fewer dimensions for simple tasks
  }
}
```

### Expected Score
Set quality expectations (0-10):
```json
{
  "settings": {
    "expectedScore": 9  // Higher standards for critical projects
  }
}
```

### Environment Variables
- `PROJECT_PATH` - Default project directory
- `QDG_DEBUG` - Enable debug logging
- `QDG_LOCALE` - Default localization setting

## 🐛 Troubleshooting

### Common Issues

#### "No .qdg directories found"
**Solution:** Ensure you're running the tool from a project directory or provide the `projectPath` parameter.

#### "Failed to initialize .qdg directory"
**Solution:** Check write permissions for your project directory.

#### "Task analysis parsing failed"
**Solution:** Verify the task analysis JSON is properly formatted.

### Debug Mode
Enable detailed logging:
```bash
QDG_DEBUG=true quality-dimension-generator
```

### Diagnostic Tool
Use the built-in diagnostic tool to check your environment:
```javascript
// Use diagnose_working_directory tool
// Returns detailed environment information and configuration suggestions
```

## 🤝 Contributing

We welcome contributions! Please see our [contributing guidelines](CONTRIBUTING.md) for details.

### Development Setup
For contributors working on the source code:
```bash
git clone https://github.com/magenie33/quality-dimension-generator
cd quality-dimension-generator
npm install
npm run dev
```

### Running Tests
```bash
npm test
npm run test:server
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built on the [Model Context Protocol](https://modelcontextprotocol.io/) standard
- Powered by TypeScript and Node.js ecosystem
- Inspired by quality engineering best practices

## 🔗 Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Quality Assurance Best Practices](https://example.com/qa-best-practices)

---


**Ready to transform your quality standards?** Start generating professional evaluation dimensions today! 🚀
