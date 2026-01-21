#!/usr/bin/env python3
"""
GitHub Actions workflow runner script
Executes the AI workflow and saves results
"""
import json
import os
import sys
from datetime import datetime
from workflow import WorkflowOrchestrator

def main():
    # Get event path (GitHub Actions provides this)
    event_path = os.environ.get('GITHUB_EVENT_PATH', '')
    
    if not event_path or not os.path.exists(event_path):
        print("Error: GITHUB_EVENT_PATH not found")
        sys.exit(1)
    
    # Read event data
    with open(event_path, 'r') as f:
        event = json.load(f)
    
    # Extract task and request_id
    task = None
    request_id = None
    
    # Try workflow_dispatch inputs first
    if 'inputs' in event:
        task = event['inputs'].get('task', '')
        request_id = event['inputs'].get('request_id', '')
    
    # Try repository_dispatch client_payload
    if not task and 'client_payload' in event:
        task = event['client_payload'].get('task', '')
        request_id = event['client_payload'].get('request_id', '')
    
    if not task or not request_id:
        print("Error: Missing task or request_id in event")
        print(f"Event data: {json.dumps(event, indent=2)}")
        sys.exit(1)
    
    print(f"Executing workflow for request: {request_id}")
    print(f"Task: {task}")
    
    # Create results directory
    os.makedirs('results', exist_ok=True)
    
    try:
        # Save initial status
        status_file = f'results/{request_id}.status.json'
        with open(status_file, 'w') as f:
            json.dump({
                'status': 'running',
                'request_id': request_id,
                'started_at': datetime.now().isoformat(),
                'task': task
            }, f, indent=2)
        
        # Execute workflow
        orchestrator = WorkflowOrchestrator()
        results = orchestrator.execute_workflow(task, {})
        
        # Save results
        result_file = f'results/{request_id}.json'
        with open(result_file, 'w') as f:
            json.dump({
                'success': True,
                'request_id': request_id,
                'completed_at': datetime.now().isoformat(),
                'results': results
            }, f, indent=2)
        
        # Update status
        with open(status_file, 'w') as f:
            json.dump({
                'status': 'completed',
                'request_id': request_id,
                'completed_at': datetime.now().isoformat()
            }, f, indent=2)
        
        print(f"Workflow completed successfully. Results saved to {result_file}")
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        traceback.print_exc()
        
        # Save error
        error_file = f'results/{request_id}.json'
        with open(error_file, 'w') as f:
            json.dump({
                'success': False,
                'request_id': request_id,
                'error': error_msg,
                'completed_at': datetime.now().isoformat()
            }, f, indent=2)
        
        status_file = f'results/{request_id}.status.json'
        with open(status_file, 'w') as f:
            json.dump({
                'status': 'failed',
                'request_id': request_id,
                'error': error_msg,
                'completed_at': datetime.now().isoformat()
            }, f, indent=2)
        
        print(f"Error: {error_msg}")
        sys.exit(1)

if __name__ == '__main__':
    main()
