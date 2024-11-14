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

IMPORTANT: You must continue processing until ALL requested actions are complete. Do not output a final response until all actions have been performed.

When there are multiple actions to perform, execute them one at a time and wait for the result of each action before proceeding to the next one.

Concepts:
- Subsetting: Subsetting means to filter down to the currently selected/highlighted data points.
- Selection: Selection means to highlight a subset of the data points.
- Coloring: Coloring means to color the data points by a particular feature.
- Expanding: Expanding means to show more information about a particular feature.

You should only respond with the next tool to be called given the tools that have already been invoked.
The tools that have already been invoked will be provided to you as a sequence of JSON tool call objects.
If there are no next steps, you should terminate the conversation.

IMPORTANT: DO NOT SUBSET UNLESS THE USER SPECIFICALLY REQUESTS IT.
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

        # Convert messages to LangChain format
        formatted_messages = []
        for msg in messages:
            if msg.role == "user":
                formatted_messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                formatted_messages.append(AIMessage(content=msg.content))
            elif msg.role == "function":
                formatted_messages.append(FunctionMessage(content=msg.content, name=msg.name or "function"))

        # Initialize LLM and create agent with data_adaptor-aware tools
        llm = ChatOpenAI(temperature=0, model_name="gpt-4o-mini")
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

        response = {}
        if isinstance(next_step, AgentFinish):
            output = agent.invoke(
                {
                    "input": "Please succinctly summarize the actions you took in the above conversation. Do not mention the tools you used, only the actions. Do not add any additional text like 'no further actions required' or 'let me know if you need anything else'.",
                    "chat_history": formatted_messages,
                    "intermediate_steps": [],
                }
            )
            response = {"type": "final", "content": output.return_values["output"]}
        elif isinstance(next_step, list) and isinstance(next_step[0], ToolAgentAction):
            tool_action = next_step[0]  # Get first (and only) action

            # Find the matching tool
            selected_tool = next(tool for tool in tools if tool.name == tool_action.tool)

            # Execute the tool with its arguments
            # If the tool input is a string, then there is no argument schema and so we have no arguments.
            tool_arguments = {} if isinstance(tool_action.tool_input, str) else tool_action.tool_input

            try:
                # Execute the tool and get results
                tool_result = selected_tool.func(**tool_arguments)

                response = {
                    "type": "tool",
                    "tool": {"name": tool_action.tool, "result": tool_result},
                }
            except Exception as tool_error:
                # Handle tool execution errors
                error_message = f"Error executing tool {tool_action.tool}: {str(tool_error)}"
                current_app.logger.error(error_message, exc_info=True)
                return abort_and_log(HTTPStatus.INTERNAL_SERVER_ERROR, error_message, loglevel=logging.ERROR)
        else:
            raise ValueError(f"Unknown agent step type: {type(next_step)}")

        return make_response(jsonify(response), HTTPStatus.OK)

    except Exception as e:
        return abort_and_log(HTTPStatus.INTERNAL_SERVER_ERROR, str(e), loglevel=logging.ERROR)


def abort_and_log(code, logmsg, loglevel=logging.DEBUG):
    """Log the message, then abort with HTTP code"""
    print("ABORTING")
    exc_info = sys.exc_info()
    print(exc_info)
    current_app.logger.log(loglevel, logmsg, exc_info=exc_info)
    return abort(code)
