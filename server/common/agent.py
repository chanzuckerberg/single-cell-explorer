import logging
import sys
from http import HTTPStatus
from flask import abort, current_app, jsonify, make_response
from typing import List, Dict, Literal, Optional
from pydantic import BaseModel
from langchain.agents.output_parsers.tools import ToolAgentAction
from langchain_core.agents import AgentFinish
from langchain_openai import ChatOpenAI
from langchain.agents import create_openai_tools_agent
from langchain.schema import HumanMessage, AIMessage, FunctionMessage, SystemMessage
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder

from server.common.tools import create_tools


class ToolSpec(BaseModel):
    name: str
    arguments: Dict[str, str]


class AgentStep(BaseModel):
    type: Literal["tool", "final"]
    content: str
    tool: Optional[ToolSpec] = None


class AgentMessage(BaseModel):
    role: Literal["user", "assistant", "function"]
    content: str
    name: Optional[str] = None


def get_system_prompt() -> str:
    """Create the system prompt string"""
    return f"""You are an assistant that helps users control an interface for visualizing single-cell data.

Your sole job is to respond with the appropriate tool call and its input. The client will handle execution of the tool and will come back to you for next steps.
If there are no next steps, you should respond with final.
"""


def get_prompt_template() -> ChatPromptTemplate:
    """Create the chat prompt template"""
    return ChatPromptTemplate.from_messages(
        [
            ("system", get_system_prompt()),
            MessagesPlaceholder(variable_name="chat_history", optional=True),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ]
    )


def agent_step_post(request, data_adaptor):
    """Handle agent step requests"""
    try:
        data = request.get_json()
        messages: List[AgentMessage] = [AgentMessage(**msg) for msg in data["messages"]]
        tool_results: Optional[str] = data.get("toolResults")

        # Convert messages to LangChain format
        formatted_messages = []
        for msg in messages:
            if msg.role == "user":
                formatted_messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                formatted_messages.append(AIMessage(content=msg.content))
            elif msg.role == "function":
                formatted_messages.append(FunctionMessage(content=msg.content, name=msg.name or "function"))

        # Add tool results if present
        if tool_results:
            formatted_messages.append(FunctionMessage(content=tool_results, name="function"))

        # Initialize LLM and create agent with data_adaptor-aware tools
        llm = ChatOpenAI(temperature=0, model_name="gpt-4o")
        tools = create_tools(data_adaptor)
        agent = create_openai_tools_agent(llm, tools, get_prompt_template())

        # Add system message to formatted messages
        formatted_messages = [SystemMessage(content=get_system_prompt())] + formatted_messages

        # Get structured response
        next_step = agent.invoke(
            {
                "input": formatted_messages[-1].content,  # Latest user message
                "chat_history": formatted_messages[:-1],  # Previous messages
                "intermediate_steps": [],  # For tool execution tracking
            }
        )

        if isinstance(next_step, AgentFinish):
            response = {"type": "final", "content": next_step.return_values["output"]}
        elif isinstance(next_step, list) and isinstance(next_step[0], ToolAgentAction):
            tool_action = next_step[0]  # Get first (and only) action
            # Convert string arguments to a dictionary format
            tool_arguments = (
                {"input": tool_action.tool_input} if isinstance(tool_action.tool_input, str) else tool_action.tool_input
            )
            response = {
                "type": "tool",
                "tool": {"name": tool_action.tool, "arguments": tool_arguments},
                "content": tool_action.log,
            }
        else:
            raise ValueError(f"Unknown agent step type: {type(next_step)}")

        return make_response(jsonify(response), HTTPStatus.OK)

    except Exception as e:
        return abort_and_log(HTTPStatus.INTERNAL_SERVER_ERROR, str(e), loglevel=logging.ERROR, include_exc_info=True)


def abort_and_log(code, logmsg, loglevel=logging.DEBUG, include_exc_info=False):
    """Log the message, then abort with HTTP code"""
    exc_info = sys.exc_info() if include_exc_info else False
    current_app.logger.log(loglevel, logmsg, exc_info=exc_info)
    return abort(code)
