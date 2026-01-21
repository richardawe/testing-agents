# AI Agent Workflow System

A Python-based AI agent system that implements the 5-step workflow for day-to-day tasks using OpenRouter API.

## Overview

This system implements a multi-agent workflow where specialized AI agents collaborate to complete tasks through a structured 5-step process:

1. **Plan and Define Objectives** - Planning Agent
2. **Gather and Analyze Information** - Research Agent
3. **Execute the Task** - Execution Agent
4. **Review and Validate** - Quality Assurance Agent
5. **Refine and Complete** - Refinement Agent

## Features

- 🤖 Multi-agent architecture with specialized agents for each step
- 🔄 Automated workflow orchestration
- 📊 Structured output with full workflow history
- ✅ Quality assurance and refinement loops
- 📝 Comprehensive logging and documentation
- ⚙️ Configurable via environment variables

## Prerequisites

- Python 3.8 or higher
- OpenRouter API key (get one at https://openrouter.ai/keys)
- Model: `xiaomi/mimo-v2-flash:free` (configured, can be changed)

## Installation

1. **Clone or download this repository**

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables:**
   
   Create a `.env` file in the project root:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your OpenRouter API key:
   ```
   OPENROUTER_API_KEY=your-api-key-here
   ```

   Or export it directly:
   ```bash
   export OPENROUTER_API_KEY=your-api-key-here
   ```

## Usage

### Web Interface (Recommended)

Start the Flask web server:

```bash
python app.py
```

Then open your browser and navigate to:

```
http://localhost:5000
```

The web interface provides:
- ✅ Easy task input form
- 📊 Visual workflow progress tracking
- 📝 Formatted results with markdown support
- 🔍 Detailed step-by-step breakdown
- 💾 View raw JSON output

### Interactive Mode (CLI)

Run the main script without arguments:

```bash
python main.py
```

Then enter your task when prompted.

### Command Line Mode

Provide the task as a command-line argument:

```bash
python main.py "Create a project proposal for upgrading our communication tools"
```

### Python Script

Import and use in your own code:

```python
from workflow import WorkflowOrchestrator

orchestrator = WorkflowOrchestrator()
results = orchestrator.execute_workflow(
    task="Your task description here",
    initial_context={"key": "value"}  # Optional
)

print(results['status'])
print(results['summary'])
```

### Run Examples

```bash
python example.py
```

## Configuration

Edit `config.py` to customize:

- **Model**: Change `MODEL_NAME` to use a different model
- **API Settings**: Adjust `MAX_TOKENS`, `TEMPERATURE`, `TIMEOUT`
- **Logging**: Configure `LOG_LEVEL` and `ENABLE_LOGGING`

## Project Structure

```
.
├── main.py              # Main entry point
├── example.py           # Example usage
├── config.py            # Configuration settings
├── base_agent.py        # Base agent class with OpenRouter integration
├── agents.py            # Specialized agent implementations
├── workflow.py          # Workflow orchestrator
├── requirements.txt     # Python dependencies
├── .env.example         # Example environment variables
├── README.md            # This file
└── AI_AGENT_WORKFLOW.md # Workflow documentation
```

## Agents

### Orchestrator Agent
- Manages overall workflow
- Coordinates other agents
- Monitors progress

### Planning Agent
- Creates detailed plans
- Identifies objectives and constraints
- Breaks tasks into sub-tasks

### Research Agent
- Gathers relevant information
- Analyzes data and patterns
- Identifies information gaps

### Execution Agent
- Performs the actual work
- Creates deliverables
- Documents decisions

### Quality Assurance Agent
- Reviews outputs
- Validates against success criteria
- Identifies issues

### Refinement Agent
- Addresses issues from review
- Makes improvements
- Finalizes deliverables

### Communication Agent
- Formats outputs
- Creates summaries
- Manages documentation

## Workflow Process

1. **Orchestrator** receives the task
2. **Planning Agent** creates a detailed plan
3. **Research Agent** gathers necessary information
4. **Execution Agent** creates deliverables
5. **QA Agent** reviews for quality
6. **Refinement Agent** addresses issues (if any)
7. **Communication Agent** formats final output

## Example Output

The workflow returns a structured dictionary with:

```python
{
    "task": "Your task",
    "status": "completed",
    "summary": "Workflow summary",
    "steps": {
        "step1_plan": {...},
        "step2_research": {...},
        "step3_execution": {...},
        "step4_review": {...},
        "step5_refinement": {...}
    },
    "workflow_context": {...},
    "history": [...]
}
```

## Troubleshooting

### API Key Issues
- Ensure `OPENROUTER_API_KEY` is set correctly
- Check that your API key has credits/quota
- Verify the key is valid at https://openrouter.ai/keys

### Model Issues
- Check if the model `xiaomi/mimo-v2-flash:free` is available
- Update `MODEL_NAME` in `config.py` if needed

### Connection Issues
- Check your internet connection
- Verify OpenRouter API is accessible
- Review timeout settings in `config.py`

## Contributing

This is a basic implementation that can be extended with:

- Additional specialized agents
- Better error handling
- Parallel processing for sub-tasks
- Database storage for workflow history
- Web interface
- Custom agent behaviors

## License

This project is provided as-is for educational and practical use.

## References

- [OpenRouter API Documentation](https://openrouter.ai/docs)
- See `AI_AGENT_WORKFLOW.md` for detailed workflow documentation

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the workflow documentation
3. Verify your configuration
