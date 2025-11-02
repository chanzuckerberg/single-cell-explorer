import json
import logging
import sys
from http import HTTPStatus
from typing import Any, Dict, List, Literal, Optional

import anthropic
from flask import abort, current_app, jsonify, make_response
from pydantic import BaseModel

from server.common.anthropic_utils import get_cached_anthropic_api_key
from server.common.tools import create_tools


class AgentMessage(BaseModel):
    role: Literal["user", "assistant", "function"]
    content: str
    name: Optional[str] = None
    type: Literal["summary", "tool", "message"] = "message"
    tool_use_id: Optional[str] = None  # Required for tool results to reference the original tool_use


def get_system_prompt() -> str:
    """Create the system prompt string"""
    return """You are an assistant that helps users control an interface for visualizing single-cell data. Your primary task is to respond with the appropriate tool call and its input. The client will execute the tool and return to you for the next steps.

Guidelines:

- An execution workflow is a series of one or more actions taken in response to a user request
- Use the no_more_steps tool to summarize when a workflow is complete
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


def convert_to_anthropic_messages(messages: List[AgentMessage]) -> List[Dict[str, Any]]:
    """
    Convert application message format to Anthropic's message format.

    Anthropic expects messages with role (user/assistant) and content.
    Tool results are sent as user messages with tool_result content blocks.
    """
    anthropic_messages = []

    for msg in messages:
        if msg.role == "user":
            # Wrap content with type tags if present
            content = f"<{msg.type}>{msg.content}</{msg.type}>" if msg.type else msg.content
            anthropic_messages.append(
                {
                    "role": "user",
                    "content": content,
                }
            )
        elif msg.role == "assistant":
            # Check if this is a tool_use message (has tool_use_id and name)
            if msg.tool_use_id and msg.name:
                # This is an assistant message representing a tool_use
                # Convert to Anthropic's tool_use content block format
                tool_input = json.loads(msg.content) if isinstance(msg.content, str) else msg.content
                anthropic_messages.append(
                    {
                        "role": "assistant",
                        "content": [
                            {
                                "type": "tool_use",
                                "id": msg.tool_use_id,
                                "name": msg.name,
                                "input": tool_input,
                            }
                        ],
                    }
                )
            else:
                # Regular assistant message
                content = f"<{msg.type}>{msg.content}</{msg.type}>" if msg.type else msg.content
                anthropic_messages.append(
                    {
                        "role": "assistant",
                        "content": content,
                    }
                )
        elif msg.role == "function":
            # Function/tool results must be sent as user messages with tool_result content blocks
            # Anthropic requires the tool_use_id to link the result to the original tool call
            if not msg.tool_use_id:
                raise ValueError(f"function message missing required tool_use_id: {msg}")

            anthropic_messages.append(
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "tool_result",
                            "tool_use_id": msg.tool_use_id,
                            "content": msg.content,
                        }
                    ],
                }
            )

    return anthropic_messages


def agent_step_post(request, data_adaptor):
    """Handle agent step requests"""
    try:
        data = request.get_json()
        messages: List[AgentMessage] = [AgentMessage(**msg) for msg in data["messages"]]

        # Find index of last summary message
        last_summary_idx = -1
        for i in range(len(messages) - 1, -1, -1):
            if messages[i].type == "summary":
                last_summary_idx = i
                break

        # Split messages into chat history and current request
        chat_history = messages[: last_summary_idx + 1]
        current_request = messages[last_summary_idx + 1 :]

        print("chat_history:")
        for msg in chat_history:
            print(f"{msg.role} ({msg.type}): {msg.content[:100]}...")
        print("current_request:")
        for msg in current_request:
            print(f"{msg.role} ({msg.type}): {msg.content[:100]}...")

        # Convert to Anthropic format
        anthropic_chat_history = convert_to_anthropic_messages(chat_history)
        anthropic_current_request = convert_to_anthropic_messages(current_request)

        # Combine all messages for the API call
        all_messages = anthropic_chat_history + anthropic_current_request

        # Initialize Anthropic client and get tools
        api_key = get_cached_anthropic_api_key()
        client = anthropic.Anthropic(api_key=api_key)
        tools_data = create_tools(data_adaptor)
        tool_definitions = tools_data["definitions"]
        tool_functions = tools_data["functions"]

        # Add system message about conversation history if we have it
        system_prompt = get_system_prompt()
        if anthropic_chat_history:
            system_prompt += "\n\nThe following conversation history includes completed workflows. Use it to understand references and previous actions, but do not re-execute completed workflows unless specifically requested."
        system_prompt += "\n\nThe current request has not yet been completed. Process the request and take the next appropriate action."

        # Call Anthropic API
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=4096,
            system=system_prompt,
            messages=all_messages,
            tools=tool_definitions,
        )

        print(f"Response stop_reason: {response.stop_reason}")
        print(f"Response content: {response.content}")

        # Process the response
        response_data = {}

        if response.stop_reason == "tool_use":
            # Find the tool use block
            tool_use_block = None
            for content in response.content:
                if content.type == "tool_use":
                    tool_use_block = content
                    break

            if tool_use_block is None:
                raise ValueError("stop_reason is tool_use but no tool_use block found")

            tool_name = tool_use_block.name
            tool_input = tool_use_block.input
            tool_use_id = tool_use_block.id  # Preserve the ID for tool result tracking

            print(f"Tool use: {tool_name} (id: {tool_use_id}) with input: {tool_input}")

            # Handle no_more_steps specially
            if tool_name == "no_more_steps":
                response_data = {
                    "type": "summary",
                    "content": tool_input.get("summary", ""),
                }
            else:
                # Execute the tool
                if tool_name not in tool_functions:
                    error_message = f"Unknown tool: {tool_name}"
                    current_app.logger.error(error_message)
                    return abort_and_log(HTTPStatus.INTERNAL_SERVER_ERROR, error_message, loglevel=logging.ERROR)

                try:
                    tool_func = tool_functions[tool_name]
                    # Execute the tool with its arguments
                    tool_result = tool_func(**tool_input)

                    response_data = {
                        "type": "tool",
                        "tool": {
                            "name": tool_name,
                            "result": tool_result,
                            "tool_use_id": tool_use_id,  # Include ID for client to reference in next request
                        },
                        "assistant_tool_use": {
                            "tool_use_id": tool_use_id,
                            "tool_name": tool_name,
                            "tool_input": tool_input,
                        },
                    }
                except Exception as tool_error:
                    # Handle tool execution errors
                    error_message = f"Error executing tool {tool_name}: {str(tool_error)}"
                    current_app.logger.error(error_message, exc_info=True)
                    return abort_and_log(HTTPStatus.INTERNAL_SERVER_ERROR, error_message, loglevel=logging.ERROR)

        elif response.stop_reason == "end_turn":
            # Extract text content
            text_content = ""
            for content in response.content:
                if content.type == "text":
                    text_content += content.text

            # Strip any type tags from the output
            if text_content.startswith("<") and text_content.endswith(">"):
                # Find the first closing bracket and last opening bracket
                first_close = text_content.find(">")
                last_open = text_content.rfind("<")
                if first_close != -1 and last_open != -1:
                    text_content = text_content[first_close + 1 : last_open]

            response_data = {
                "type": "message",
                "content": text_content,
            }

        else:
            # Unexpected stop reason
            raise ValueError(f"Unexpected stop_reason: {response.stop_reason}")

        return make_response(jsonify(response_data), HTTPStatus.OK)

    except Exception as e:
        return abort_and_log(HTTPStatus.INTERNAL_SERVER_ERROR, str(e), loglevel=logging.ERROR)


def abort_and_log(code, logmsg, loglevel=logging.DEBUG):
    """Log the message, then abort with HTTP code"""
    print("ABORTING")
    exc_info = sys.exc_info()
    print(exc_info)
    current_app.logger.log(loglevel, logmsg, exc_info=exc_info)
    return abort(code)
