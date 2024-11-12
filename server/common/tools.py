from typing import List, Annotated
from langchain_core.tools import Tool
from pydantic import BaseModel, Field


class ToolParameter(BaseModel):
    name: str
    description: str
    required: bool
    type: str


class ColorByGeneSchema(BaseModel):
    gene: Annotated[
        str,
        Field(
            description="The gene symbol to color the visualization by. This should be a valid gene symbol (e.g., CD4, IL2, etc.)."
        ),
    ]


# Dummy functions for tools - actual execution happens on client
def dummy_tool(*args, **kwargs):
    return "Tool execution happens on client side"


# Define the tools as LangChain Tool objects
tools = [
    Tool(
        name="subset",
        description="Create a subset from the currently selected data points",
        func=dummy_tool,
        args_schema=None,  # No parameters needed
    ),
    Tool(
        name="unsubset",
        description="Reset the current subset and return to the full dataset",
        func=dummy_tool,
        args_schema=None,
    ),
    Tool(
        name="categorical_selection",
        description="Perform a categorical selection",
        func=dummy_tool,
        args_schema=None,
    ),
    Tool(
        name="histogram_selection",
        description="Perform a histogram selection",
        func=dummy_tool,
        args_schema=None,
    ),
    Tool(
        name="panning",
        description="Perform panning on the current view",
        func=dummy_tool,
        args_schema=None,
    ),
    Tool(
        name="zoom_in",
        description="Zoom in on the current view",
        func=dummy_tool,
        args_schema=None,
    ),
    Tool(
        name="zoom_out",
        description="Zoom out on the current view",
        func=dummy_tool,
        args_schema=None,
    ),
    Tool(
        name="color_by_gene",
        description="Color the visualization by gene expression",
        func=dummy_tool,
        args_schema=ColorByGeneSchema,
    ),
    Tool(
        name="color_by_geneset",
        description="Color the visualization by geneset",
        func=dummy_tool,
        args_schema=None,
    ),
    Tool(
        name="color_by_category",
        description="Color the visualization by category",
        func=dummy_tool,
        args_schema=None,
    ),
    Tool(
        name="color_by_continuous",
        description="Color the visualization by a continuous variable",
        func=dummy_tool,
        args_schema=None,
    ),
    Tool(
        name="create_geneset",
        description="Create a new geneset",
        func=dummy_tool,
        args_schema=None,
    ),
    Tool(
        name="xy_scatterplot",
        description="Create an XY scatterplot",
        func=dummy_tool,
        args_schema=None,
    ),
    Tool(
        name="show_cell_guide",
        description="Show the cell guide",
        func=dummy_tool,
        args_schema=None,
    ),
    Tool(
        name="show_gene_card",
        description="Show the gene card",
        func=dummy_tool,
        args_schema=None,
    ),
]
