from typing import List, Annotated, TypeVar, Type
from langchain_core.tools import Tool
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from functools import partial


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


class CategoricalSelectionSchema(BaseModel):
    category_value: Annotated[
        str,
        Field(description="The category a user wishes to perform selection on."),
    ]
    column_name: Annotated[
        str | None,
        Field(
            description="The column name that the category value belongs to. If not provided, the tool will attempt to infer the column name from the category value.",
            default=None,
        ),
    ]


def subset():
    return {"status": "success"}


def unsubset():
    return {"status": "success"}


def select_category(data_adaptor, category_value: str, column_name: str | None = None):
    schema = data_adaptor.get_schema()
    prompt = f"The category value the user wishes to perform selection on is: {category_value}."
    if column_name is not None:
        prompt += f"The column name that the category value belongs to is: {column_name}."
    prompt += f"The valid metadata columns are: {schema['annotations']['obs']['columns']}. Please select one of the valid categories along with the name of the column that most closely matches the user's request."

    class CategorySelectionSchema(BaseModel):
        category_value: str
        column_name: str

    return call_llm_with_structured_output(prompt, CategorySelectionSchema)


def histogram_selection():
    return {"status": "success"}


def panning():
    return {"status": "success"}


def zoom_in():
    return {"status": "success"}


def zoom_out():
    return {"status": "success"}


def color_by_gene(gene: str):
    return {"status": "success", "gene": gene}


def color_by_geneset():
    return {"status": "success"}


def color_by_category():
    return {"status": "success"}


def color_by_continuous():
    return {"status": "success"}


def create_geneset():
    return {"status": "success"}


def xy_scatterplot():
    return {"status": "success"}


def show_cell_guide():
    return {"status": "success"}


def show_gene_card():
    return {"status": "success"}


T = TypeVar("T", bound=BaseModel)


def call_llm_with_structured_output(query: str, schema: Type[T]) -> T:
    llm = ChatOpenAI(temperature=0, model_name="gpt-4o-mini").with_structured_output(schema)
    return llm.invoke(query).model_dump()


# Define the tools as LangChain Tool objects
def create_tools(data_adaptor):
    return [
        Tool(
            name="subset",
            description="Create a subset from the currently selected data points",
            func=subset,
        ),
        Tool(
            name="unsubset",
            description="Reset the current subset and return to the full dataset",
            func=unsubset,
        ),
        Tool(
            name="categorical_selection",
            description="Perform a categorical selection",
            func=partial(select_category, data_adaptor),
            args_schema=CategoricalSelectionSchema,
        ),
        Tool(
            name="histogram_selection",
            description="Perform a histogram selection",
            func=histogram_selection,
        ),
        Tool(
            name="panning",
            description="Perform panning on the current view",
            func=panning,
        ),
        Tool(
            name="zoom_in",
            description="Zoom in on the current view",
            func=zoom_in,
        ),
        Tool(
            name="zoom_out",
            description="Zoom out on the current view",
            func=zoom_out,
        ),
        Tool(
            name="color_by_gene",
            description="Color the visualization by gene expression",
            func=color_by_gene,
            args_schema=ColorByGeneSchema,
        ),
        Tool(
            name="color_by_geneset",
            description="Color the visualization by geneset",
            func=color_by_geneset,
        ),
        Tool(
            name="color_by_category",
            description="Color the visualization by category",
            func=color_by_category,
        ),
        Tool(
            name="color_by_continuous",
            description="Color the visualization by a continuous variable",
            func=color_by_continuous,
        ),
        Tool(
            name="create_geneset",
            description="Create a new geneset",
            func=create_geneset,
        ),
        Tool(
            name="xy_scatterplot",
            description="Create an XY scatterplot",
            func=xy_scatterplot,
        ),
        Tool(
            name="show_cell_guide",
            description="Show the cell guide",
            func=show_cell_guide,
        ),
        Tool(
            name="show_gene_card",
            description="Show the gene card",
            func=show_gene_card,
        ),
    ]
