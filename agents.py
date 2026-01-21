"""
Specialized Agent implementations for the 5-step workflow
"""
import logging
from typing import Dict, Any, Optional, List
from base_agent import BaseAgent

logger = logging.getLogger(__name__)


class OrchestratorAgent(BaseAgent):
    """Master controller that manages the overall workflow"""
    
    def __init__(self):
        instructions = """You are the Orchestrator Agent, responsible for managing the overall AI agent workflow.
Your role is to:
- Interpret initial task requests
- Break down tasks into the 5-step workflow
- Coordinate specialized agents
- Monitor progress and ensure quality
- Make decisions about when to proceed or iterate

Always think step by step and ensure clarity before proceeding."""
        
        super().__init__("Orchestrator", "Master Controller", instructions)
    
    def initialize_task(self, task_description: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Initialize a new task by creating a plan
        
        Args:
            task_description: User's task description
            context: Optional additional context
            
        Returns:
            Initialized task plan
        """
        prompt = f"""Analyze this task request and create an initial plan:

Task: {task_description}

Context: {context if context else 'None provided'}

Please provide:
1. A clear understanding of what needs to be accomplished
2. Initial breakdown into the 5-step workflow phases
3. Any immediate questions or clarifications needed

Format your response as structured JSON with keys: understanding, workflow_phases, questions."""
        
        response = self.call_llm(prompt)
        
        try:
            # Try to extract JSON from response
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0].strip()
            else:
                json_str = response.strip()
            
            import json
            plan = json.loads(json_str)
        except:
            # If JSON parsing fails, return raw response
            plan = {"raw_response": response}
        
        return self.format_output(plan)


class PlanningAgent(BaseAgent):
    """Agent specialized in Step 1: Planning and defining objectives"""
    
    def __init__(self):
        instructions = """You are the Planning Agent, specialized in Step 1: Plan and Define Objectives.
Your responsibilities:
- Extract clear objectives from user requests
- Identify requirements, constraints, and success criteria
- Break complex goals into smaller sub-tasks
- Determine what information needs to be gathered
- Create comprehensive plans before execution begins

Be thorough and detailed. Ask clarifying questions if needed."""
        
        super().__init__("Planning Agent", "Step 1 Specialist", instructions)
    
    def process(self, task: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create a detailed plan for the task"""
        
        prompt = f"""Create a comprehensive plan for this task:

Task: {task}

{self._format_context(context)}

Based on the 5-step workflow, create a detailed plan including:

1. CLEAR OBJECTIVES:
   - What exactly needs to be accomplished?
   - What does "done" look like?

2. REQUIREMENTS & CONSTRAINTS:
   - What are the non-negotiable requirements?
   - What constraints exist (time, budget, resources)?

3. SUB-TASKS:
   - Break the task into smaller, manageable sub-tasks

4. SUCCESS CRITERIA:
   - How will we know the task is successfully completed?
   - Create a checklist of success criteria

5. INFORMATION NEEDS:
   - What information needs to be gathered in Step 2?
   - What resources are needed?

Format your response in clear markdown with proper headings, sections, lists, and formatting."""
        
        response = self.call_llm(prompt)
        
        return self.format_output({
            "plan": response,
            "step": 1
        })
    
    def _format_context(self, context: Optional[Dict]) -> str:
        """Format context for prompt"""
        if not context:
            return "No additional context provided."
        
        context_str = "Additional Context:\n"
        for key, value in context.items():
            context_str += f"- {key}: {value}\n"
        return context_str


class ResearchAgent(BaseAgent):
    """Agent specialized in Step 2: Gathering and analyzing information"""
    
    def __init__(self):
        instructions = """You are the Research Agent, specialized in Step 2: Gather and Analyze Information.
Your responsibilities:
- Collect relevant data, context, and resources
- Review existing documentation or previous work
- Identify patterns, dependencies, and potential issues
- Organize information to support decision-making
- Flag information gaps that need to be addressed

Be thorough in gathering information and focus on what's relevant to the task."""
        
        super().__init__("Research Agent", "Step 2 Specialist", instructions)
    
    def process(self, task: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Gather and analyze information for the task"""
        
        plan = context.get("plan", "No plan provided") if context else "No plan provided"
        information_needs = context.get("information_needs", "General research needed") if context else "General research needed"
        
        prompt = f"""Based on this plan, gather and analyze relevant information:

Plan: {plan}

Information Needs: {information_needs}

Task: {task}

Please provide:

1. INFORMATION GATHERED:
   - Key facts and data relevant to the task
   - Relevant patterns or precedents
   - Important constraints or dependencies

2. KEY INSIGHTS:
   - What patterns or trends do you identify?
   - What dependencies exist?
   - What potential issues should be considered?

3. INFORMATION GAPS:
   - What information is still missing?
   - What needs further research or clarification?

4. ORGANIZED FINDINGS:
   - Structure your findings to support decision-making in Step 3

Format your response in clear markdown with proper headings, sections, lists, and formatting."""
        
        response = self.call_llm(prompt)
        
        return self.format_output({
            "research": response,
            "step": 2
        })


class ExecutionAgent(BaseAgent):
    """Agent specialized in Step 3: Executing the task"""
    
    def __init__(self):
        instructions = """You are the Execution Agent, specialized in Step 3: Execute the Task.
Your responsibilities:
- Work through each sub-task systematically
- Apply gathered information to create deliverables
- Make decisions based on objectives and constraints
- Create the actual work products (documents, code, analyses, etc.)
- Document decisions and rationale

Be thorough and ensure deliverables meet the plan's objectives."""
        
        super().__init__("Execution Agent", "Step 3 Specialist", instructions)
    
    def process(self, task: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute the task and create deliverables"""
        
        plan = context.get("plan", "No plan provided") if context else "No plan provided"
        research = context.get("research", "No research provided") if context else "No research provided"
        
        prompt = f"""Execute this task based on the plan and research:

Task: {task}

Plan: {plan}

Research Findings: {research}

Please execute the task by:

1. WORKING THROUGH SUB-TASKS:
   - Complete each sub-task systematically
   - Apply the research findings
   - Make decisions based on objectives and constraints

2. CREATING DELIVERABLES:
   - Produce the actual work products needed
   - Ensure deliverables are complete and usable

3. DOCUMENTING DECISIONS:
   - Document key decisions made
   - Explain rationale for decisions
   - Note any deviations from the original plan

4. PROGRESS NOTES:
   - What has been completed?
   - What remains to be done?
   - Any challenges encountered?

Provide your deliverables and documentation in clear markdown format with proper headings, sections, and formatting. If creating actual documents, present them in full with proper markdown structure."""
        
        response = self.call_llm(prompt)
        
        return self.format_output({
            "deliverables": response,
            "step": 3
        })


class QualityAssuranceAgent(BaseAgent):
    """Agent specialized in Step 4: Review and validate"""
    
    def __init__(self):
        instructions = """You are the Quality Assurance Agent, specialized in Step 4: Review and Validate.
Your responsibilities:
- Check outputs against success criteria from Step 1
- Verify quality, completeness, and accuracy
- Identify errors, inconsistencies, or gaps
- Assess alignment with original objectives
- Generate detailed review reports

Be thorough and objective in your review. Identify specific issues with clear descriptions."""
        
        super().__init__("Quality Assurance Agent", "Step 4 Specialist", instructions)
    
    def process(self, task: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Review and validate the deliverables"""
        
        plan = context.get("plan", "No plan provided") if context else "No plan provided"
        deliverables = context.get("deliverables", "No deliverables provided") if context else "No deliverables provided"
        success_criteria = context.get("success_criteria", "Check against plan objectives") if context else "Check against plan objectives"
        
        prompt = f"""Review and validate these deliverables against the plan:

Task: {task}

Original Plan: {plan}

Success Criteria: {success_criteria}

Deliverables: {deliverables}

Please provide:

1. VALIDATION RESULTS:
   - Does this meet the original objectives? (Yes/No with explanation)
   - Check each success criterion

2. QUALITY ASSESSMENT:
   - Are there any errors or inconsistencies?
   - Is the work complete?
   - Does it align with quality standards?

3. ISSUES IDENTIFIED:
   - List specific issues that need to be addressed
   - Prioritize issues (Critical, Major, Minor)
   - Provide specific recommendations for each issue

4. OVERALL ASSESSMENT:
   - What could be improved?
   - What works well?
   - Is this ready for use or does it need refinement?

Format your response in clear markdown with proper headings, sections, lists, and formatting."""
        
        response = self.call_llm(prompt)
        
        return self.format_output({
            "review": response,
            "step": 4
        })


class RefinementAgent(BaseAgent):
    """Agent specialized in Step 5: Refine and complete"""
    
    def __init__(self):
        instructions = """You are the Refinement Agent, specialized in Step 5: Refine and Complete.
Your responsibilities:
- Address issues identified in Step 4
- Make necessary improvements and corrections
- Enhance clarity and completeness
- Finalize documentation
- Ensure all issues are resolved

Be thorough in addressing all feedback and ensuring high quality."""
        
        super().__init__("Refinement Agent", "Step 5 Specialist", instructions)
    
    def process(self, task: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Refine the deliverables based on review feedback"""
        
        deliverables = context.get("deliverables", "No deliverables provided") if context else "No deliverables provided"
        review = context.get("review", "No review provided") if context else "No review provided"
        issues = context.get("issues", "No specific issues identified") if context else "No specific issues identified"
        
        prompt = f"""Refine these deliverables based on the review:

Task: {task}

Original Deliverables: {deliverables}

Review Results: {review}

Issues to Address: {issues}

Please:

1. ADDRESS ALL ISSUES:
   - Fix each issue identified in the review
   - Provide improved versions of problematic sections

2. MAKE IMPROVEMENTS:
   - Enhance clarity and completeness
   - Improve formatting and presentation
   - Ensure all objectives are met

3. FINALIZE WORK:
   - Provide the final, polished deliverables as a complete, readable document
   - Ensure everything is documented properly
   - Verify all issues are resolved

4. LESSONS LEARNED:
   - What worked well in this process?
   - What could be improved for future tasks?

IMPORTANT: Format your response as a complete, readable markdown document with proper headings, sections, and formatting. If the task was to create a document, provide the FULL FINAL DOCUMENT in markdown format at the top, followed by any additional notes or refinements. The final document should be ready for sharing and use."""
        
        response = self.call_llm(prompt)
        
        return self.format_output({
            "refined_deliverables": response,
            "step": 5,
            "status": "complete"
        })


class CommunicationAgent(BaseAgent):
    """Agent for formatting outputs and managing documentation"""
    
    def __init__(self):
        instructions = """You are the Communication Agent, responsible for formatting outputs and managing documentation.
Your responsibilities:
- Format outputs for readability
- Create summaries and reports
- Maintain clear documentation
- Ensure professional presentation

Focus on clarity and professional presentation."""
        
        super().__init__("Communication Agent", "Documentation Specialist", instructions)
    
    def format_for_presentation(self, content: Any, format_type: str = "summary") -> str:
        """Format content for presentation"""
        prompt = f"""Format this content as a {format_type}:

{content}

Make it clear, professional, and easy to understand."""
        
        return self.call_llm(prompt)
    
    def create_summary(self, workflow_results: Dict[str, Any]) -> str:
        """Create a summary of workflow results"""
        prompt = f"""Create a comprehensive summary of this workflow execution:

{workflow_results}

Include:
- Task overview
- Key steps completed
- Main deliverables
- Outcomes and results

Make it concise but informative."""
        
        return self.call_llm(prompt)
