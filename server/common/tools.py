from enum import Enum
from functools import partial
from typing import Any, Dict, List, Type, TypeVar

import anthropic
from pydantic import BaseModel, Field
from typing_extensions import Annotated

from server.common.anthropic_utils import get_anthropic_api_key


# Default Claude model to use
CLAUDE_MODEL = "claude-sonnet-4-5-20250929"


def get_claude_model() -> str:
    """Get the Claude model name to use. Can be overridden via environment variable ANTHROPIC_MODEL."""
    import os
    return os.getenv("ANTHROPIC_MODEL", CLAUDE_MODEL)


class ColorByGeneSchema(BaseModel):
    gene: Annotated[
        str,
        Field(
            description="The gene symbol to color the visualization by. This should be a valid gene symbol (e.g., CD4, IL2, etc.)."
        ),
    ]


class SummarySchema(BaseModel):
    summary: Annotated[
        str,
        Field(
            description="A summary of the actions taken in this workflow execution after the <start_summary/> tag in a concise manner to the user."
        ),
    ]


class HistogramType(Enum):
    METADATA = "metadata"
    GENE = "gene"
    GENESET = "geneset"


class HistogramSelectionSchema(BaseModel):
    range_low: Annotated[
        float,
        Field(description="The low end of the range to select. If not provided, the tool will set the low end to 0."),
    ]
    range_high: Annotated[
        float | None,
        Field(
            description="The high end of the range to select. If not provided, the tool will set the high end to None."
        ),
    ]
    histogram_type: Annotated[
        HistogramType,
        Field(
            description="The type of histogram to select - gene, geneset, or metadata. IMPORTANT: GENES MUST BE GENE SYMBOLS."
        ),
    ]
    available_genesets: Annotated[
        List[str] | None,
        Field(description="The list of available genesets to select from. Only used if the histogram type is geneset."),
    ]
    histogram_name: Annotated[
        str,
        Field(
            description="The name of the histogram to select. This can be a metadata column name, gene, or geneset name. IMPORTANT: GENES MUST BE GENE SYMBOLS."
        ),
    ]


class ColorByGenesetSchema(BaseModel):
    geneset: Annotated[
        str,
        Field(description="The name of the geneset to color the visualization by."),
    ]
    available_genesets: Annotated[
        List[str] | None,
        Field(description="The list of available genesets to color the visualization by."),
    ]


class ExpandGeneSchema(BaseModel):
    gene: Annotated[
        str,
        Field(description="The gene symbol to expand."),
    ]


class CreateGenesetSchema(BaseModel):
    geneset_name: Annotated[
        str,
        Field(description="The name of the geneset to create."),
    ]
    geneset_description: Annotated[
        str,
        Field(
            description="The description of the geneset to create. If not provided by the user, the tool will set the description to an empty string."
        ),
    ]
    genes_to_populate_geneset: Annotated[
        List[str],
        Field(
            description="The genes to populate the geneset with. If not provided by the user, the tool will set the genes to an empty list."
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


class ExpandCategorySchema(BaseModel):
    category_name: Annotated[
        str,
        Field(description="The name of the category to expand."),
    ]


class MetadataColorBySchema(BaseModel):
    metadata_name: Annotated[
        str,
        Field(description="The name of the metadata to color the visualization by."),
    ]


def subset():
    return {"status": "success"}


def unsubset():
    return {"status": "success"}


def select_category(data_adaptor, category_value: str, column_name: str | None = None, user_id: str | None = None):
    schema = data_adaptor.get_schema(user_id=user_id)

    prompt = "IMPORTANT: Be flexible with matching - for example, 'B cells' should match 'B cell', plurals should match singular forms, and common variations should be recognized. Only return an error if there is no conceptually matching category.\n"
    prompt += "IMPORTANT: You must return the exact category value from the dataset, not the user's input value.\n"
    prompt += f"The category value the user wishes to perform selection on is: {category_value}.\n"
    if column_name is not None:
        prompt += f"The column name that the category value belongs to is: {column_name}.\n"
    cols = [i for i in schema["annotations"]["obs"]["columns"] if "categories" in i]
    prompt += f"The valid categorical metadata labels are: {cols}.\n"
    prompt += "Please select one of the valid category labels along with the name of the column that most closely matches the user's request."

    class CategorySelectionSchema(BaseModel):
        category_value: str
        column_name: str
        error: str | None = None

    return call_llm_with_structured_output(prompt, CategorySelectionSchema)


def histogram_selection(
    data_adaptor,
    histogram_name: str,
    histogram_type: HistogramType,
    range_low: float,
    range_high: float | None = None,
    available_genesets: List[str] | None = None,
    user_id: str | None = None,
):
    if histogram_type == HistogramType.GENESET.value:
        if available_genesets is None:
            return {
                "histogram_type": histogram_type,
                "status": "need_available_genesets",
            }
        prompt = f"The geneset the user wishes to perform histogram selection on is: {histogram_name}."
        prompt += f"The available genesets are: {available_genesets}."
        prompt += "Please select one of the available genesets to perform histogram selection on."

        class GenesetSelectionSchema(BaseModel):
            geneset: str

        return {
            "histogram_name": call_llm_with_structured_output(prompt, GenesetSelectionSchema)["geneset"],
            "histogram_type": histogram_type,
            "range_low": range_low,
            "range_high": range_high,
        }
    elif histogram_type == HistogramType.METADATA.value:
        schema = data_adaptor.get_schema(user_id=user_id)
        prompt = f"The metadata name the user wishes to perform histogram selection on is: {histogram_name}."
        cols = [i["name"] for i in schema["annotations"]["obs"]["columns"] if "categories" not in i and i != "name_0"]
        prompt += f"The valid metadata columns are: {cols}. Please select one of the column names to perform histogram selection on."
        prompt += "Metadata can be categorical or continuous. Please only select one of the continuous columns to perform histogram selection on."

        class MetadataSelectionSchema(BaseModel):
            metadata_name: str

        return {
            "histogram_name": call_llm_with_structured_output(prompt, MetadataSelectionSchema)["metadata_name"],
            "histogram_type": histogram_type,
            "range_low": range_low,
            "range_high": range_high,
        }
    elif histogram_type == HistogramType.GENE.value:
        return {
            "histogram_name": histogram_name.upper(),
            "histogram_type": histogram_type,
            "range_low": range_low,
            "range_high": range_high,
        }


def panning():
    return {"status": "success"}


def zoom_in():
    return {"status": "success"}


def zoom_out():
    return {"status": "success"}


def color_by_gene(gene: str):
    return {
        "gene": gene.upper(),
    }


def expand_gene(gene: str):
    return {
        "gene": gene.upper(),
    }


def color_by_geneset(geneset: str, available_genesets: List[str] | None = None):
    if available_genesets is None:
        return {
            "status": "need_available_genesets",
        }

    prompt = f"The geneset the user wishes to color by is: {geneset}."
    prompt += f"The available genesets are: {available_genesets}."
    prompt += "Please select one of the available genesets to color by."

    class GenesetSelectionSchema(BaseModel):
        geneset: str

    return call_llm_with_structured_output(prompt, GenesetSelectionSchema)


def color_by_metadata(data_adaptor, metadata_name: str, user_id: str | None = None):
    schema = data_adaptor.get_schema(user_id=user_id)
    prompt = "IMPORTANT: Be flexible with matching - for example, 'cell types' should match 'cell_type', plurals should match singular forms, and common variations should be recognized. Only return an error if there is no conceptually matching metadata.\n"
    prompt += "IMPORTANT: You must return the exact metadata name from the dataset, not the user's input value.\n"
    prompt += f"The metadata name the user wishes to color by is: {metadata_name}.\n"
    cols = [i["name"] for i in schema["annotations"]["obs"]["columns"]]
    prompt += f"The valid metadata columns are: {cols}.\n"
    prompt += "Please select one of the valid metadata columns that most closely matches the user's request."

    class MetadataSelectionSchema(BaseModel):
        metadata_name: str
        error: str | None = None

    return call_llm_with_structured_output(prompt, MetadataSelectionSchema)


def create_geneset(geneset_name: str, geneset_description: str, genes_to_populate_geneset: List[str]):
    return {
        "geneset_name": geneset_name,
        "geneset_description": geneset_description,
        "genes_to_populate_geneset": [i.upper() for i in genes_to_populate_geneset],
    }


def expand_category(data_adaptor, category_name: str, user_id: str | None = None):
    schema = data_adaptor.get_schema(user_id=user_id)
    prompt = f"The category name the user wishes to perform expand by is: {category_name}."
    categorical_cols = [i["name"] for i in schema["annotations"]["obs"]["columns"] if "categories" in i]
    prompt += f"The valid categorical metadata columns are: {categorical_cols}."
    prompt += "Please select one of the valid categorical metadata columns to expand by."

    class CategorySelectionSchema(BaseModel):
        category_name: str

    return call_llm_with_structured_output(prompt, CategorySelectionSchema)


def xy_scatterplot():
    return {"status": "success"}


def show_cell_guide():
    return {"status": "success"}


def show_gene_card():
    return {"status": "success"}


def no_more_steps(summary: str):
    return {"status": "no_more_steps", "summary": summary}


T = TypeVar("T", bound=BaseModel)


def pydantic_to_anthropic_schema(schema: Type[BaseModel]) -> Dict[str, Any]:
    """Convert a Pydantic model to Anthropic tool input schema format."""
    json_schema = schema.model_json_schema()

    # Anthropic expects a simplified JSON schema
    properties = {}
    required = json_schema.get("required", [])

    for field_name, field_info in json_schema.get("properties", {}).items():
        properties[field_name] = {
            "type": field_info.get("type", "string"),
            "description": field_info.get("description", ""),
        }
        # Handle enum types
        if "enum" in field_info:
            properties[field_name]["enum"] = field_info["enum"]
        # Handle array types
        if field_info.get("type") == "array":
            properties[field_name]["items"] = field_info.get("items", {})

    return {
        "type": "object",
        "properties": properties,
        "required": required,
    }


def call_llm_with_structured_output(query: str, schema: Type[T]) -> Dict[str, Any]:
    """Use Anthropic's tool forcing pattern to get structured output."""
    client = anthropic.Anthropic(api_key=get_anthropic_api_key())

    # Create a tool definition from the schema
    tool_name = "structured_output"
    tool_def = {
        "name": tool_name,
        "description": "Provide structured output matching the required schema",
        "input_schema": pydantic_to_anthropic_schema(schema),
    }

    # Force the model to use this tool
    response = client.messages.create(
        model=get_claude_model(),
        max_tokens=4096,
        tools=[tool_def],
        tool_choice={"type": "tool", "name": tool_name},
        messages=[{"role": "user", "content": query}],
    )

    # Extract the tool use from the response
    for content in response.content:
        if content.type == "tool_use" and content.name == tool_name:
            return content.input

    raise ValueError("No tool use found in response")


def create_tools(data_adaptor, user_id=None) -> Dict[str, Any]:
    """
    Create tools for Anthropic API.

    Args:
        data_adaptor: The data adaptor instance
        user_id: Optional user ID for including user annotations

    Returns a dict with:
    - 'definitions': List of tool definitions for Anthropic API
    - 'functions': Dict mapping tool names to their callable functions
    """

    # Define all tools with their metadata
    tool_specs = [
        {
            "name": "no_more_steps",
            "description": "When a workflow is complete, this tool MUST BE USED to summarize the actions taken. Do NOT summarize the previous conversation history when using this tool.",
            "schema": SummarySchema,
            "func": no_more_steps,
        },
        {
            "name": "subset",
            "description": "Filter dataset to show only currently selected data points",
            "schema": None,
            "func": subset,
        },
        {
            "name": "unsubset",
            "description": "Reset the current subset and return to the full dataset",
            "schema": None,
            "func": unsubset,
        },
        {
            "name": "categorical_selection",
            "description": "Highlight data points matching a specific category value (does not filter/subset the data)",
            "schema": CategoricalSelectionSchema,
            "func": partial(select_category, data_adaptor, user_id=user_id),
        },
        {
            "name": "histogram_selection",
            "description": "Perform a histogram selection. For geneset histograms, returns a flag if available genesets aren't provided, expecting them in a subsequent call.",
            "schema": HistogramSelectionSchema,
            "func": partial(histogram_selection, data_adaptor, user_id=user_id),
        },
        {
            "name": "color_by_gene",
            "description": "Color the visualization by gene expression",
            "schema": ColorByGeneSchema,
            "func": color_by_gene,
        },
        {
            "name": "expand_gene",
            "description": "Expand the gene element to show more information about the gene",
            "schema": ExpandGeneSchema,
            "func": expand_gene,
        },
        {
            "name": "color_by_geneset",
            "description": "Color by average expression of a geneset. Returns a flag if available genesets aren't provided, expecting them in a subsequent call.",
            "schema": ColorByGenesetSchema,
            "func": color_by_geneset,
        },
        {
            "name": "color_by_metadata",
            "description": "Color the visualization by metadata",
            "schema": MetadataColorBySchema,
            "func": partial(color_by_metadata, data_adaptor, user_id=user_id),
        },
        {
            "name": "expand_category",
            "description": "Expand the category element to show more information about the category",
            "schema": ExpandCategorySchema,
            "func": partial(expand_category, data_adaptor, user_id=user_id),
        },
        {
            "name": "create_geneset",
            "description": "Create a new geneset",
            "schema": CreateGenesetSchema,
            "func": create_geneset,
        },
    ]

    # Convert to Anthropic format
    definitions = []
    functions = {}

    for spec in tool_specs:
        # Create tool definition
        tool_def = {
            "name": spec["name"],
            "description": spec["description"],
        }

        # Add input schema if provided
        if spec["schema"]:
            tool_def["input_schema"] = pydantic_to_anthropic_schema(spec["schema"])
        else:
            # Tools without parameters still need an empty schema
            tool_def["input_schema"] = {
                "type": "object",
                "properties": {},
                "required": [],
            }

        definitions.append(tool_def)
        functions[spec["name"]] = spec["func"]

    return {
        "definitions": definitions,
        "functions": functions,
    }
