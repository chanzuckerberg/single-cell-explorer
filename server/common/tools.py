from enum import Enum
from functools import partial
from typing import Annotated, List, Type, TypeVar

from langchain_core.tools import Tool
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from server.common.openai_utils import get_cached_openai_api_key


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


def select_category(data_adaptor, category_value: str, column_name: str | None = None):
    schema = data_adaptor.get_schema()

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
        schema = data_adaptor.get_schema()
        prompt = f"The metadata name the user wishes to perform histogram selection on is: {histogram_name}."
        cols = [i["name"] for i in schema["annotations"]["obs"]["columns"] if "categories" not in i and i != "name_0"]
        prompt += f"The valid metadata columns are: {cols}. Please select one of the column names to perform histogram selection on."
        prompt += "Metadata can be categorical or continuous. Please only select one of the continuous columns to perform histogram selection on."

        class MetadataSelectionSchema(BaseModel):
            metadata_name: str

        response = {
            "histogram_name": call_llm_with_structured_output(prompt, MetadataSelectionSchema)["metadata_name"],
            "histogram_type": histogram_type,
            "range_low": range_low,
            "range_high": range_high,
        }
        print(response)
        return response
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


def color_by_metadata(data_adaptor, metadata_name: str):
    schema = data_adaptor.get_schema()
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


def expand_category(data_adaptor, category_name: str):
    schema = data_adaptor.get_schema()
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


def call_llm_with_structured_output(query: str, schema: Type[T]) -> T:
    llm = ChatOpenAI(temperature=0, model_name="gpt-4o", api_key=get_cached_openai_api_key()).with_structured_output(
        schema
    )
    return llm.invoke(query).model_dump()


def create_tools(data_adaptor):
    return [
        # TODO, FIXME: This is still summarizing actions that were already taken.
        Tool(
            name="no_more_steps",
            description="When a workflow is complete, this tool MUST BE USED to summarize the actions taken. Do NOT summarize the previous conversation history when using this tool.",
            func=no_more_steps,
            args_schema=SummarySchema,
        ),
        Tool(
            name="subset",
            description="Filter dataset to show only currently selected data points",
            func=subset,
        ),
        Tool(
            name="unsubset",
            description="Reset the current subset and return to the full dataset",
            func=unsubset,
        ),
        Tool(
            name="categorical_selection",
            description="Highlight data points matching a specific category value (does not filter/subset the data)",
            func=partial(select_category, data_adaptor),
            args_schema=CategoricalSelectionSchema,
        ),
        Tool(
            name="histogram_selection",
            description="Perform a histogram selection. For geneset histograms, returns a flag if available genesets aren't provided, expecting them in a subsequent call.",
            func=partial(histogram_selection, data_adaptor),
            args_schema=HistogramSelectionSchema,
        ),
        Tool(
            name="color_by_gene",
            description="Color the visualization by gene expression",
            func=color_by_gene,
            args_schema=ColorByGeneSchema,
        ),
        Tool(
            name="expand_gene",
            description="Expand the gene element to show more information about the gene",
            func=expand_gene,
            args_schema=ExpandGeneSchema,
        ),
        Tool(
            name="color_by_geneset",
            description="Color by average expression of a geneset. Returns a flag if available genesets aren't provided, expecting them in a subsequent call.",
            func=color_by_geneset,
            args_schema=ColorByGenesetSchema,
        ),
        Tool(
            name="color_by_metadata",
            description="Color the visualization by metadata",
            func=partial(color_by_metadata, data_adaptor),
            args_schema=MetadataColorBySchema,
        ),
        Tool(
            name="expand_category",
            description="Expand the category element to show more information about the category",
            func=partial(expand_category, data_adaptor),
            args_schema=ExpandCategorySchema,
        ),
        Tool(
            name="create_geneset",
            description="Create a new geneset",
            func=create_geneset,
            args_schema=CreateGenesetSchema,
        ),
        # Tool(
        #     name="xy_scatterplot",
        #     description="Create an XY scatterplot",
        #     func=xy_scatterplot,
        # ),
        # Tool(
        #     name="show_cell_guide",
        #     description="Show the cell guide",
        #     func=show_cell_guide,
        # ),
        # Tool(
        #     name="show_gene_card",
        #     description="Show the gene card",
        #     func=show_gene_card,
        # ),
        # Tool(
        #     name="panning",
        #     description="Perform panning on the current view",
        #     func=panning,
        # ),
        # Tool(
        #     name="zoom_in",
        #     description="Zoom in on the current view",
        #     func=zoom_in,
        # ),
        # Tool(
        #     name="zoom_out",
        #     description="Zoom out on the current view",
        #     func=zoom_out,
        # ),
    ]
