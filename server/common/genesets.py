"""
Utility code for gene sets handling
"""

import re
import csv
import hashlib


def summarizeQueryHash(raw_query):
    """generate a cache key (hash) from the raw query string"""
    return hashlib.sha1(raw_query).hexdigest()


def validate_gene_sets(genesets, var_names, context=None):
    """
    Check validity of gene sets, return if correct, else raise error.
    May also modify the gene set for conditions that should be resolved,
    but which do not warrant a hard error.

    Argument gene sets may be either the REST OTA format (list of dicts) or the internal
    format (dict of dicts, keyed by the gene set name).

    Will return a modified gene sets (eg, remove warnings) of the same type as the
    provided argument. Ie, dict->dict, list->list

    Rules:

    0. All gene set names must be unique. [error]
    1. Gene set names must conform to the following: [error]
        * Names must be comprised of 1 or more ASCII characters 32-126
        * No leading or trailing spaces (ASCII 32)
        * No multi-space (ASCII 32) runs
    2. Gene symbols must be part of the current var_index. [warning]
       If gene symbol is not in the var_index, generate a warning and remove the symbol
       from the gene sets.
    3. Gene symbols must not be duplicated in a gene set.  [warning]
       Duplications will be silently de-duped.

    Items marked [error] will generate a hard error, causing the validation to fail.

    Items marked [warning] will generate a warning, and will be resolved without failing
    the validation (typically by removing the offending item from the gene sets).
    """

    messagefn = context["messagefn"] if context else (lambda x: None)

    # accept genesets args as either the internal (dict) or REST (list) format,
    # as they are identical except for the dict being keyed by geneset_name.
    if not isinstance(genesets, dict) and not isinstance(genesets, list):
        raise ValueError("Gene sets must be either dict or list.")
    genesets_iterable = genesets if isinstance(genesets, list) else genesets.values()

    # 0. check for uniqueness of geneset names
    geneset_names = [gs["geneset_name"] for gs in genesets_iterable]
    if len(set(geneset_names)) != len(geneset_names):
        raise KeyError("All gene set names must be unique.")

    # 1. check gene set character set and format
    illegal_name = re.compile(r"^\s|  |[\u0000-\u001F\u007F-\uFFFF]|\s$")
    for name in geneset_names:
        if type(name) != str or len(name) == 0:
            raise KeyError("Gene set names must be non-null string.")
        if illegal_name.search(name):
            messagefn(
                "Error: "
                f"Gene set name {name} "
                "is not valid. Leading, trailing, and multiple spaces within a name are not allowed."
            )
            raise KeyError(
                "Gene set name is not valid. Leading, trailing, and multiple spaces within a name are not allowed."
            )

    # 2. & 3. check for duplicate gene symbols, and those not present in the dataset. They will
    # generate a warning and be removed.
    for geneset in genesets_iterable:
        if not isinstance(geneset, dict):
            raise ValueError("Each gene set must be a dict.")
        geneset_name = geneset["geneset_name"]
        genes = geneset["genes"]
        if not isinstance(genes, list):
            raise ValueError("Gene set genes field must be a list")
        geneset.setdefault("geneset_description", "")
        gene_symbol_already_seen = set()
        new_genes = []
        for gene in genes:
            gene_symbol = gene["gene_symbol"]
            if not isinstance(gene_symbol, str) or len(gene_symbol) == 0:
                raise ValueError("Gene symbol must be non-null string.")
            if gene_symbol in gene_symbol_already_seen:
                # duplicate check
                messagefn(
                    f"Warning: a duplicate of gene {gene_symbol} was found in gene set {geneset_name}, "
                    "and will be ignored."
                )
                continue

            if gene_symbol not in var_names:
                messagefn(
                    f"Warning: {gene_symbol}, used in gene set {geneset_name}, "
                    "was not found in the dataset and will be ignored."
                )
                continue

            gene_symbol_already_seen.add(gene_symbol)
            gene.setdefault("gene_description", "")
            new_genes.append(gene)

        geneset["genes"] = new_genes

    return genesets
