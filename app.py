"""
Flask web application for AI Agent Workflow System
"""
import os
import json
import logging
from flask import Flask, render_template, request, jsonify, stream_with_context, Response
from flask_cors import CORS
from dotenv import load_dotenv
from config import Config
from workflow import WorkflowOrchestrator

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=getattr(logging, Config.LOG_LEVEL))
logger = logging.getLogger(__name__)

# Validate configuration on startup
try:
    Config.validate()
except ValueError as e:
    logger.warning(f"Configuration warning: {str(e)}")


@app.route('/')
def index():
    """Main page"""
    return render_template('index.html', model_name=Config.MODEL_NAME)


@app.route('/api/execute', methods=['POST'])
def execute_workflow():
    """Execute workflow via API"""
    try:
        data = request.json
        task = data.get('task', '').strip()
        context = data.get('context', {})
        
        if not task:
            return jsonify({
                'success': False,
                'error': 'Task is required'
            }), 400
        
        # Validate API key
        try:
            Config.validate()
        except ValueError as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400
        
        # Initialize orchestrator and execute workflow
        orchestrator = WorkflowOrchestrator()
        results = orchestrator.execute_workflow(task, context)
        
        return jsonify({
            'success': True,
            'results': results
        })
    
    except Exception as e:
        logger.error(f"Error executing workflow: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/status', methods=['GET'])
def get_status():
    """Get API status and configuration"""
    try:
        api_key_set = bool(Config.OPENROUTER_API_KEY and Config.OPENROUTER_API_KEY.strip())
        api_key_valid = api_key_set and Config.OPENROUTER_API_KEY.strip() != "your-api-key-here"
        
        return jsonify({
            'success': True,
            'api_configured': api_key_set,
            'api_key_valid': api_key_valid,
            'model': Config.MODEL_NAME,
            'api_key_format_valid': api_key_valid and Config.OPENROUTER_API_KEY.startswith("sk-or-") if api_key_valid else False
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/validate', methods=['POST'])
def validate_api_key():
    """Validate API key without executing workflow"""
    try:
        Config.validate()
        return jsonify({
            'success': True,
            'message': 'API key is configured'
        })
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
