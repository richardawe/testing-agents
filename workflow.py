"""
Workflow Orchestrator - Coordinates agents through the 5-step workflow
"""
import logging
from typing import Dict, Any, Optional, List
from agents import (
    OrchestratorAgent,
    PlanningAgent,
    ResearchAgent,
    ExecutionAgent,
    QualityAssuranceAgent,
    RefinementAgent,
    CommunicationAgent
)

logger = logging.getLogger(__name__)


class WorkflowOrchestrator:
    """Orchestrates the 5-step AI agent workflow"""
    
    def __init__(self):
        """Initialize orchestrator with all agents"""
        self.orchestrator = OrchestratorAgent()
        self.planning_agent = PlanningAgent()
        self.research_agent = ResearchAgent()
        self.execution_agent = ExecutionAgent()
        self.qa_agent = QualityAssuranceAgent()
        self.refinement_agent = RefinementAgent()
        self.communication_agent = CommunicationAgent()
        
        self.workflow_context: Dict[str, Any] = {}
        self.workflow_history: List[Dict[str, Any]] = []
    
    def execute_workflow(self, task: str, initial_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Execute the complete 5-step workflow
        
        Args:
            task: Task description from user
            initial_context: Optional initial context
            
        Returns:
            Complete workflow results
        """
        logger.info(f"Starting workflow execution for task: {task}")
        
        # Initialize workflow context
        self.workflow_context = {
            "task": task,
            "initial_context": initial_context or {},
            "step": 0,
            "iteration": 0
        }
        
        try:
            # Step 1: Plan and Define Objectives
            logger.info("Step 1: Plan and Define Objectives")
            step1_result = self._step1_plan()
            self.workflow_context["plan"] = step1_result["result"]
            self._add_to_history("Step 1", step1_result)
            
            # Step 2: Gather and Analyze Information
            logger.info("Step 2: Gather and Analyze Information")
            step2_result = self._step2_gather()
            self.workflow_context["research"] = step2_result["result"]
            self._add_to_history("Step 2", step2_result)
            
            # Step 3: Execute the Task
            logger.info("Step 3: Execute the Task")
            step3_result = self._step3_execute()
            self.workflow_context["deliverables"] = step3_result["result"]
            self._add_to_history("Step 3", step3_result)
            
            # Step 4: Review and Validate
            logger.info("Step 4: Review and Validate")
            step4_result = self._step4_review()
            self.workflow_context["review"] = step4_result["result"]
            self._add_to_history("Step 4", step4_result)
            
            # Check if refinement is needed
            issues_found = self._check_for_issues(step4_result)
            
            if issues_found:
                # Step 5: Refine and Complete
                logger.info("Step 5: Refine and Complete")
                step5_result = self._step5_refine()
                self.workflow_context["refined_deliverables"] = step5_result["result"]
                self._add_to_history("Step 5", step5_result)
                
                # Re-review after refinement
                logger.info("Re-reviewing after refinement")
                final_review = self._step4_review()
                self._add_to_history("Final Review", final_review)
            else:
                logger.info("No issues found, proceeding to completion")
                step5_result = {"result": "No refinement needed", "status": "complete"}
                self._add_to_history("Step 5", step5_result)
            
            # Create summary
            summary = self.communication_agent.create_summary(self.workflow_context)
            
            # Compile final results
            results = {
                "task": task,
                "status": "completed",
                "summary": summary,
                "steps": {
                    "step1_plan": step1_result,
                    "step2_research": step2_result,
                    "step3_execution": step3_result,
                    "step4_review": step4_result,
                    "step5_refinement": step5_result
                },
                "workflow_context": self.workflow_context,
                "history": self.workflow_history
            }
            
            logger.info("Workflow execution completed successfully")
            return results
            
        except Exception as e:
            logger.error(f"Workflow execution failed: {str(e)}", exc_info=True)
            return {
                "task": task,
                "status": "failed",
                "error": str(e),
                "workflow_context": self.workflow_context,
                "history": self.workflow_history
            }
    
    def _step1_plan(self) -> Dict[str, Any]:
        """Execute Step 1: Plan and Define Objectives"""
        task = self.workflow_context["task"]
        context = self.workflow_context.get("initial_context", {})
        
        return self.planning_agent.process(task, context)
    
    def _step2_gather(self) -> Dict[str, Any]:
        """Execute Step 2: Gather and Analyze Information"""
        task = self.workflow_context["task"]
        context = {
            "plan": self.workflow_context.get("plan", {}),
            "task": task
        }
        
        # Extract information needs from plan
        plan_result = self.workflow_context.get("plan", {})
        if isinstance(plan_result, dict) and "plan" in plan_result:
            context["information_needs"] = plan_result.get("plan", "")
        else:
            context["information_needs"] = str(plan_result)
        
        return self.research_agent.process(task, context)
    
    def _step3_execute(self) -> Dict[str, Any]:
        """Execute Step 3: Execute the Task"""
        task = self.workflow_context["task"]
        context = {
            "plan": self.workflow_context.get("plan", {}),
            "research": self.workflow_context.get("research", {})
        }
        
        return self.execution_agent.process(task, context)
    
    def _step4_review(self) -> Dict[str, Any]:
        """Execute Step 4: Review and Validate"""
        task = self.workflow_context["task"]
        context = {
            "plan": self.workflow_context.get("plan", {}),
            "deliverables": self.workflow_context.get("deliverables", {}),
            "refined_deliverables": self.workflow_context.get("refined_deliverables", {})
        }
        
        # Use refined deliverables if available, otherwise use original
        if context.get("refined_deliverables"):
            context["deliverables"] = context["refined_deliverables"]
        
        # Extract success criteria from plan
        plan_result = self.workflow_context.get("plan", {})
        if isinstance(plan_result, dict):
            context["success_criteria"] = plan_result.get("plan", "")
        else:
            context["success_criteria"] = str(plan_result)
        
        return self.qa_agent.process(task, context)
    
    def _step5_refine(self) -> Dict[str, Any]:
        """Execute Step 5: Refine and Complete"""
        task = self.workflow_context["task"]
        context = {
            "deliverables": self.workflow_context.get("deliverables", {}),
            "review": self.workflow_context.get("review", {})
        }
        
        # Extract issues from review
        review_result = self.workflow_context.get("review", {})
        if isinstance(review_result, dict) and "review" in review_result:
            context["issues"] = review_result.get("review", "")
        else:
            context["issues"] = str(review_result)
        
        return self.refinement_agent.process(task, context)
    
    def _check_for_issues(self, review_result: Dict[str, Any]) -> bool:
        """Check if review identified any issues"""
        result_content = review_result.get("result", {})
        
        # Check for common issue indicators in the review
        review_text = str(result_content).lower()
        
        issue_indicators = [
            "issue",
            "problem",
            "error",
            "missing",
            "incorrect",
            "needs improvement",
            "should be",
            "recommend"
        ]
        
        # If review mentions issues, assume refinement is needed
        for indicator in issue_indicators:
            if indicator in review_text:
                return True
        
        return False
    
    def _add_to_history(self, step_name: str, result: Dict[str, Any]):
        """Add step result to workflow history"""
        self.workflow_history.append({
            "step": step_name,
            "agent": result.get("agent", "Unknown"),
            "timestamp": self._get_timestamp(),
            "result": result
        })
    
    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.now().isoformat()
    
    def get_workflow_status(self) -> Dict[str, Any]:
        """Get current workflow status"""
        return {
            "current_step": self.workflow_context.get("step", 0),
            "context": self.workflow_context,
            "history": self.workflow_history
        }
