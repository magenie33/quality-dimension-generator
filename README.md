# Quality Dimension Generator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-1.6+-purple.svg)](https://modelcontextprotocol.io/)

An **MCP server** that generates quality evaluation standards for any task. Transform vague requirements into precise, measurable quality criteria with AI-powered analysis, ultimately improving your final work quality.

## 🎯 What It Does

- **📊 Analyzes your tasks** - Understand what needs to be accomplished
- **🎯 Creates evaluation standards** - Generate specific quality dimensions with scoring criteria
- **📈 Sets target scores** - Define expected quality levels (e.g., 8/10)
- **✅ Guides execution** - Help you complete tasks with clear quality standards

## 🚀 Quick Start

### Installation

Install from the **Smithery AI Model Context Protocol Registry**:

🔗 **[Get Quality Dimension Generator on Smithery](https://smithery.ai/server/@magenie33/quality-dimension-generator)**

### Basic Usage

**Step 1:** Generate task analysis
```javascript
generate_task_analysis_prompt({
  userMessage: "Write a 1000-word article about AI"
})
```

**Step 2:** Generate quality standards
```javascript
generate_quality_dimensions_prompt({
  taskAnalysisJson: "..." // JSON from step 1
})
```

**Result:** Get comprehensive quality evaluation criteria with target scores, then complete your task following those standards.

## 📋 Example Output

For the task "Write a technical blog post":

```json
{
  "expectedScore": 8,
  "scoreCalculation": "Average of all 5 dimension scores",
  "dimensions": [
    {
      "name": "Technical Accuracy",
      "description": "Correctness and depth of technical content",
      "importance": "Ensures readers get reliable information",
      "scoring": {
        "10": "All technical details verified and comprehensive",
        "8": "Mostly accurate with minor gaps",
        "6": "Generally correct but lacks depth"
      }
    }
    // ... 4 more dimensions
  ]
}
```

## 💡 Use Cases

- **Software Development** - Code quality, testing, documentation standards
- **Content Creation** - Writing quality, SEO, engagement metrics
- **Project Management** - Deliverable criteria, timeline adherence
- **Research** - Methodology, accuracy, presentation standards

## 🤝 Contributing

Contributions welcome! This project is open source under the MIT License.

## 🔗 Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/docs)
- [Smithery MCP Registry](https://smithery.ai/)

---

**Transform your work quality today!** 🚀
