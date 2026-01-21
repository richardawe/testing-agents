"""
Example usage of the AI Agent Workflow
"""
import os
from dotenv import load_dotenv
from config import Config
from workflow import WorkflowOrchestrator

# Load environment variables
load_dotenv()


def example_simple_task():
    """Example: Simple writing task"""
    print("Example 1: Simple Writing Task")
    print("=" * 50)
    
    # Initialize orchestrator
    orchestrator = WorkflowOrchestrator()
    
    # Execute workflow
    task = "Create a one-page document explaining the benefits of remote work for employees"
    results = orchestrator.execute_workflow(task)
    
    print(f"Status: {results['status']}")
    print(f"Summary: {results.get('summary', 'N/A')}")
    return results


def example_research_task():
    """Example: Research and analysis task"""
    print("\nExample 2: Research Task")
    print("=" * 50)
    
    orchestrator = WorkflowOrchestrator()
    
    task = """Compare three project management tools (Asana, Trello, and Monday.com) 
    and provide a recommendation based on:
    - Cost
    - Features
    - Ease of use
    - Integration capabilities
    
    Assume we have a team of 25 people."""
    
    results = orchestrator.execute_workflow(task)
    
    print(f"Status: {results['status']}")
    print(f"Summary: {results.get('summary', 'N/A')}")
    return results


def example_with_context():
    """Example: Task with initial context"""
    print("\nExample 3: Task with Context")
    print("=" * 50)
    
    orchestrator = WorkflowOrchestrator()
    
    task = "Create a project proposal for upgrading our customer support system"
    
    initial_context = {
        "budget": "$50,000",
        "timeline": "6 months",
        "team_size": "10 people",
        "current_system": "Legacy ticketing system",
        "requirements": "Better integration, mobile support, analytics"
    }
    
    results = orchestrator.execute_workflow(task, initial_context)
    
    print(f"Status: {results['status']}")
    print(f"Summary: {results.get('summary', 'N/A')}")
    return results


def main():
    """Run examples"""
    # Validate configuration
    try:
        Config.validate()
    except ValueError as e:
        print(f"❌ Configuration Error: {str(e)}")
        print("Please set OPENROUTER_API_KEY in your .env file or environment variables")
        return
    
    print("\n🚀 AI Agent Workflow Examples")
    print("=" * 50)
    print(f"Model: {Config.MODEL_NAME}\n")
    
    # Run examples
    try:
        # Example 1
        example_simple_task()
        
        # Example 2
        # Uncomment to run additional examples
        # example_research_task()
        # example_with_context()
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
