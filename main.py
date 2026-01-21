"""
Main entry point for AI Agent Workflow
"""
import os
import sys
import logging
from dotenv import load_dotenv
from config import Config
from workflow import WorkflowOrchestrator

# Load environment variables
load_dotenv()

logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    """Main entry point"""
    # Validate configuration
    try:
        Config.validate()
    except ValueError as e:
        logger.error(str(e))
        print(f"\n❌ Configuration Error: {str(e)}\n")
        print("Please set your OPENROUTER_API_KEY environment variable.")
        print("Get your API key from: https://openrouter.ai/keys")
        print("\nYou can set it in a .env file or export it:")
        print("  export OPENROUTER_API_KEY='your-api-key-here'")
        sys.exit(1)
    
    # Initialize orchestrator
    orchestrator = WorkflowOrchestrator()
    
    # Example usage
    if len(sys.argv) > 1:
        # Task provided as command line argument
        task = " ".join(sys.argv[1:])
        logger.info(f"Executing task from command line: {task}")
        results = orchestrator.execute_workflow(task)
    else:
        # Interactive mode
        print("\n🤖 AI Agent Workflow System")
        print("=" * 50)
        print(f"Model: {Config.MODEL_NAME}")
        print("=" * 50)
        print("\nEnter a task for the AI agents to work on.")
        print("The workflow will go through:")
        print("  1. Plan and Define Objectives")
        print("  2. Gather and Analyze Information")
        print("  3. Execute the Task")
        print("  4. Review and Validate")
        print("  5. Refine and Complete")
        print("\nPress Ctrl+C to exit\n")
        
        try:
            task = input("Enter your task: ").strip()
            
            if not task:
                print("No task provided. Exiting.")
                sys.exit(0)
            
            logger.info(f"Executing task: {task}")
            print(f"\n🔄 Processing task: {task}\n")
            
            results = orchestrator.execute_workflow(task)
            
            # Display results
            print("\n" + "=" * 50)
            print("📋 WORKFLOW RESULTS")
            print("=" * 50)
            print(f"\nStatus: {results['status']}\n")
            
            if results['status'] == 'completed':
                print("Summary:")
                print("-" * 50)
                print(results.get('summary', 'No summary available'))
                print("\n" + "-" * 50)
                print("\n✅ Workflow completed successfully!")
                print("\nDetailed results are available in the workflow output.")
                
                # Option to save results
                save = input("\nSave results to file? (y/n): ").strip().lower()
                if save == 'y':
                    filename = input("Enter filename (default: results.json): ").strip() or "results.json"
                    import json
                    with open(filename, 'w') as f:
                        json.dump(results, f, indent=2)
                    print(f"Results saved to {filename}")
            else:
                print(f"❌ Workflow failed: {results.get('error', 'Unknown error')}")
                
        except KeyboardInterrupt:
            print("\n\nExiting...")
            sys.exit(0)
        except Exception as e:
            logger.error(f"Error during workflow execution: {str(e)}", exc_info=True)
            print(f"\n❌ Error: {str(e)}")
            sys.exit(1)
    
    return results


if __name__ == "__main__":
    main()
