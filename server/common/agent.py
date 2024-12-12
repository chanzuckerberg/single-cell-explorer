import logging
import os
import sys
from http import HTTPStatus
from typing import List, Literal, Optional

from flask import abort, current_app, jsonify, make_response
from langchain.agents import create_openai_tools_agent
from langchain.agents.output_parsers.tools import ToolAgentAction
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import AIMessage, FunctionMessage, HumanMessage
from langchain_core.agents import AgentFinish
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from server.common.tools import create_tools
from server.common.utils.aws_secret_utils import get_secret_key


def get_openai_api_key():
    deployment_stage = os.getenv("DEPLOYMENT_STAGE", "test")
    if deployment_stage == "test":
        return os.getenv("OPENAI_API_KEY")
    return get_secret_key(f"{deployment_stage}/explorer/agent", region_name="us-west-2")["OPENAI_API_KEY"]


def get_cached_openai_api_key():
    """Get OpenAI API key from cache or fetch it if not cached"""
    if not hasattr(current_app, "openai_api_key"):
        current_app.openai_api_key = get_openai_api_key()
    return current_app.openai_api_key


class AgentMessage(BaseModel):
    role: Literal["user", "assistant", "function"]
    content: str
    name: Optional[str] = None
    type: Literal["summary", "tool", "message"] = "message"


def get_system_prompt() -> str:
    """Create the system prompt string"""
    return """You are an assistant that helps users control an interface for visualizing single-cell data. Your primary task is to respond with the appropriate tool call and its input. The client will execute the tool and return to you for the next steps.

Guidelines:

- When an execution workflow is complete (i.e. there are no more steps to be taken), use the no_more_steps tool.
- Execute ONE action at a time and wait for user input
- Be concise in your responses - avoid listing all possible next actions unless specifically asked
- Process all requested actions until complete
- If a tool requires additional information, invoke it to get the needed information
- If asked about capabilities, list the available tools
- Do not perform subsetting unless specifically requested
- Assist only with queries related to single-cell data analysis and visualization

Concepts:

- **Subsetting**: Filtering the data to only the currently selected or highlighted data points.
- **Selection**: Highlighting a subset of data points based on categorical or continuous data. For continuous data, selections use histograms in the UI to select value ranges.
- **Coloring**: Applying colors to data points based on a specific feature.
- **Expanding**: Displaying more information about a particular feature.

Terminology:

- **Genesets**: Collections of genes curated by the user.
- **Genes**: Individual genes curated by the user.
- **Metadata**: Any other information about the data points that is not a gene or geneset."""


def get_prompt_template() -> ChatPromptTemplate:
    """Create the chat prompt template"""
    return ChatPromptTemplate.from_messages(
        [
            ("system", get_system_prompt()),
            (
                "system",
                "The following conversation history provides context. Use it to understand references and previous actions, but do not re-execute completed workflows unless specifically requested:",
            ),
            MessagesPlaceholder(variable_name="chat_history", optional=True),
            (
                "system",
                "Now focus on the current request. When an execution workflow is complete, use the no_more_steps tool.",
            ),
            AIMessage(content="<start_summary/>"),
            MessagesPlaceholder(variable_name="input"),
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

        # Find index of last summary message
        last_summary_idx = -1
        for i in range(len(messages) - 1, -1, -1):
            if messages[i].type == "summary":
                last_summary_idx = i
                break

        # Split messages into chat history and current request
        chat_history = formatted_messages[: last_summary_idx + 1]
        current_request = formatted_messages[last_summary_idx + 1 :]
        print("chat_history:")
        for msg in chat_history:
            print(f"  {msg}")
        print("current_request:")
        for msg in current_request:
            print(f"  {msg}")
        # Initialize LLM and create agent with data_adaptor-aware tools

        api_key = get_cached_openai_api_key()
        llm = ChatOpenAI(temperature=0, model_name="gpt-4o", api_key=api_key)
        tools = create_tools(data_adaptor)
        agent = create_openai_tools_agent(llm, tools, get_prompt_template())
        # Get structured response with split history
        next_step = agent.invoke(
            {
                "input": current_request,
                "chat_history": chat_history,
                "intermediate_steps": [],
            }
        )

        response = {}
        if isinstance(next_step, AgentFinish):
            # Remove start summary tag from output
            response = {
                "type": "message",
                "content": next_step.return_values["output"],
            }
        elif isinstance(next_step, list) and isinstance(next_step[0], ToolAgentAction):
            tool_action = next_step[0]
            if tool_action.tool == "no_more_steps":
                response = {"type": "summary", "content": tool_action.tool_input["summary"]}
            else:
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
