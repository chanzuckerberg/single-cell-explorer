from typing import List, Annotated, TypeVar, Type
from langchain_core.tools import Tool
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI


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


class GenericRequestSchema(BaseModel):
    user_request: Annotated[
        str,
        Field(description="The user's request for a category to perform a categorical selection on."),
    ]


# Dummy functions for tools - actual execution happens on client
def noop(*args, **kwargs):
    pass


def select_category(user_request: str, data_adaptor):
    schema = data_adaptor.get_schema()
    prompt = f"The user's request for categorical selection is: {user_request}. The valid metadata columns are: {schema['annotations']['obs']['columns']}. Please select one of the valid categories along with the name of the column."

    class CategorySelectionSchema(BaseModel):
        category_value: str
        column_name: str

    return call_llm_with_structured_output(prompt, CategorySelectionSchema)


T = TypeVar("T", bound=BaseModel)


def call_llm_with_structured_output(query: str, schema: Type[T]) -> T:
    llm = ChatOpenAI(temperature=0, model_name="gpt-4o-mini").with_structured_output(schema)
    return llm.invoke(query)


# Define the tools as LangChain Tool objects
def create_tools(data_adaptor):
    return [
        Tool(
            name="subset",
            description="Create a subset from the currently selected data points",
            func=noop,
        ),
        Tool(
            name="unsubset",
            description="Reset the current subset and return to the full dataset",
            func=noop,
        ),
        Tool(
            name="categorical_selection",
            description="Perform a categorical selection",
            func=lambda params: select_category(params.user_request, data_adaptor),
            args_schema=GenericRequestSchema,
        ),
        Tool(
            name="histogram_selection",
            description="Perform a histogram selection",
            func=noop,
        ),
        Tool(
            name="panning",
            description="Perform panning on the current view",
            func=noop,
        ),
        Tool(
            name="zoom_in",
            description="Zoom in on the current view",
            func=noop,
        ),
        Tool(
            name="zoom_out",
            description="Zoom out on the current view",
            func=noop,
        ),
        Tool(
            name="color_by_gene",
            description="Color the visualization by gene expression",
            func=noop,
            args_schema=ColorByGeneSchema,
        ),
        Tool(
            name="color_by_geneset",
            description="Color the visualization by geneset",
            func=noop,
        ),
        Tool(
            name="color_by_category",
            description="Color the visualization by category",
            func=noop,
        ),
        Tool(
            name="color_by_continuous",
            description="Color the visualization by a continuous variable",
            func=noop,
        ),
        Tool(
            name="create_geneset",
            description="Create a new geneset",
            func=noop,
        ),
        Tool(
            name="xy_scatterplot",
            description="Create an XY scatterplot",
            func=noop,
        ),
        Tool(
            name="show_cell_guide",
            description="Show the cell guide",
            func=noop,
        ),
        Tool(
            name="show_gene_card",
            description="Show the gene card",
            func=noop,
        ),
    ]
