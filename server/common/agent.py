import logging
import sys
import json
from http import HTTPStatus
from flask import abort, current_app, jsonify, make_response
from typing import List, Dict, Literal, Optional
from pydantic import BaseModel
from langchain.agents.output_parsers.tools import ToolAgentAction, AgentAction
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
    return """You are an assistant that helps users control an interface for visualizing single-cell data. Your primary task is to respond with the appropriate tool call and its input. The client will execute the tool and return to you for the next steps.

Guidelines:

- Process all requested actions until complete; do not output a final response until all actions are performed.
- When multiple actions are requested, execute them one at a time, waiting for each result before proceeding.
- If a tool requires additional information (e.g., available_genesets), still invoke it; the tool will indicate what information is needed, which you will receive in a subsequent call.
- If asked about your capabilities, list the available tools.
- If a user requests an action already done, execute the tool again.
- Respond only with the next tool to be called, based on prior invocations.
- Terminate the conversation if there are no further steps.
- Do not perform subsetting unless specifically requested.
- Assist only with queries related to single-cell data analysis and visualization.

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
            ("system", "Now focus on the current request."),
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

        # Find index of last human message
        last_human_idx = len(formatted_messages) - 1
        for i in range(len(formatted_messages) - 1, -1, -1):
            if isinstance(formatted_messages[i], HumanMessage):
                last_human_idx = i
                break

        # Split messages into chat history and current request
        chat_history = formatted_messages[:last_human_idx]
        current_request = formatted_messages[last_human_idx:]

        # Initialize LLM and create agent with data_adaptor-aware tools
        llm = ChatOpenAI(temperature=0, model_name="gpt-4o")
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
            response = {"type": "final", "content": next_step.return_values["output"]}
        elif isinstance(next_step, list) and isinstance(next_step[0], ToolAgentAction):
            tool_action = next_step[0]  # Get first (and only) action
            if tool_action.tool == "no_more_steps":
                # Hmm, this technically works okay-ish but i don't like the fact we have to summarize.
                # Failure mode: when we do complex sequence of actions, the final step is a summary of only the previous action.
                # The agent should just decide when to stop and it should be able to do that without having to say "no further steps".
                # What if we summarize just the status messages SINCE THE LAST SUMMARY MESSAGE?
                # Summary message only generated when the no more steps message is received.
                # We can have a flag for it marking messages as summary messages.
                # We can generate summary of everything since the last summary message.
                action_history = []
                for msg in messages[last_human_idx + 1 :]:
                    if not isinstance(msg, FunctionMessage):
                        action_history.append(msg.content)

                output = agent.invoke(
                    {
                        "input": [
                            HumanMessage(
                                content="Please summarize these actions in a succinct, neutral, efficient way."
                            )
                        ],
                        "chat_history": action_history,
                        "intermediate_steps": [],
                    }
                )
                response = {"type": "final", "content": output.return_values["output"]}
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
