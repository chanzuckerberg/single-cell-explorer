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
    return {
        "gene": gene.upper(),
    }


def expand_gene(gene: str):
    return {
        "gene": gene.upper(),
    }


def color_by_geneset(geneset: str, available_genesets: List[str] | None = None):
    if available_genesets is None:
        return {}

    prompt = f"The geneset the user wishes to perform color by is: {geneset}."
    prompt += f"The available genesets are: {available_genesets}."
    prompt += "Please select one of the available genesets to color by."

    class GenesetSelectionSchema(BaseModel):
        geneset: str

    return call_llm_with_structured_output(prompt, GenesetSelectionSchema)


def color_by_metadata(data_adaptor, metadata_name: str):
    schema = data_adaptor.get_schema()
    prompt = f"The metadata name the user wishes to perform color by is: {metadata_name}."
    prompt += f"The valid metadata columns are: {schema['annotations']['obs']['columns']}. Please select one of the valid column names to color by. Do NOT select any of the values in the column."
    prompt += "Metadata can be categorical or continuous, which can be inferred from the schema."

    class MetadataSelectionSchema(BaseModel):
        metadata_name: str

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
    prompt += f"The valid metadata columns are: {schema['annotations']['obs']['columns']}. Please select one of the valid column names to expand by. Do NOT select any of the values in the column."

    class CategorySelectionSchema(BaseModel):
        category_name: str

    return call_llm_with_structured_output(prompt, CategorySelectionSchema)


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


def create_tools(data_adaptor):
    return [
        Tool(
            name="subset",
            description="Subset down to the selected data points. Note that this is different from selection. Subsetting means to filter down to the currently selected data points.",
            func=subset,
        ),
        Tool(
            name="unsubset",
            description="Reset the current subset and return to the full dataset",
            func=unsubset,
        ),
        Tool(
            name="categorical_selection",
            description="Perform a categorical selection. This is NOT subsetting. It is merely highlighting the data points that match the category value.",
            func=partial(select_category, data_adaptor),
            args_schema=CategoricalSelectionSchema,
        ),
        Tool(
            name="histogram_selection",
            description="Perform a histogram selection",
            func=histogram_selection,
        ),
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
            description="Color the visualization by a geneset. If the set of available genesets is not provided, the tool will first return that it decided to perform the color by geneset action. Then, the tool will receive the list of available genesets and will be able to select one to color by.",
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
    ]
