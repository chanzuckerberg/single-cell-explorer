import numpy as np
import pandas as pd
from flatbuffers import Builder
from scipy import sparse

from server.common.fbs.fbs_coders import serialize_typed_array
from server.common.fbs.fbs_coders import deserialize_typed_array
import server.common.fbs.NetEncoding.Column as Column
import server.common.fbs.NetEncoding.Matrix as Matrix
import server.common.fbs.NetEncoding.TypedFBArray as TypedFBArray


# Serialization helper


def serialize_column(builder, typed_arr):
    """Serialize NetEncoding.Column"""

    (u_type, u_value) = typed_arr
    Column.ColumnStart(builder)
    Column.ColumnAddUType(builder, u_type)
    Column.ColumnAddU(builder, u_value)
    return Column.ColumnEnd(builder)


# Serialization helper
def serialize_matrix(builder, n_rows, n_cols, columns, col_idx):
    """Serialize NetEncoding.Matrix"""

    Matrix.MatrixStart(builder)
    Matrix.MatrixAddNRows(builder, n_rows)
    Matrix.MatrixAddNCols(builder, n_cols)
    Matrix.MatrixAddColumns(builder, columns)
    if col_idx is not None:
        (u_type, u_val) = col_idx
        Matrix.MatrixAddColIndexType(builder, u_type)
        Matrix.MatrixAddColIndex(builder, u_val)
    return Matrix.MatrixEnd(builder)


def guess_at_mem_needed(matrix):
    (n_rows, n_cols) = matrix.shape
    if isinstance(matrix, np.ndarray) or sparse.issparse(matrix):
        guess = (n_rows * n_cols * matrix.dtype.itemsize) + 1024
    elif isinstance(matrix, pd.DataFrame):
        # XXX TODO - DataFrame type estimate
        guess = 1
    else:
        guess = 1

    # round up to nearest 1024 bytes
    guess = (guess + 0x400) & (~0x3FF)
    return guess


def encode_matrix_fbs(matrix, row_idx=None, col_idx=None):
    """
    Given a 2D DataFrame, ndarray or sparse equivalent, create and return a Matrix flatbuffer.

    :param matrix: 2D DataFrame, ndarray or sparse equivalent
    :param row_idx: array-like index for row dimension or pandas.Index (not supported)
    :param col_idx: array-like index for col dimension or pandas.Index

    NOTE: row indices are (currently) unsupported and must be None
    """

    if row_idx is not None:
        raise ValueError("row indexing not supported for FBS Matrix")
    if matrix.ndim != 2:
        raise ValueError("FBS Matrix must be 2D")

    if sparse.issparse(matrix):
        matrix = matrix.tocoo()

    (n_rows, n_cols) = matrix.shape
    # estimate size needed, so we don't unnecessarily realloc.
    builder = Builder(guess_at_mem_needed(matrix))

    columns = []
    for cidx in range(n_cols - 1, -1, -1):
        # serialize the typed array

        if isinstance(matrix, pd.DataFrame):
            col = matrix.iloc[:, cidx]
        elif sparse.issparse(matrix):
            filt = matrix.col == cidx
            s_row = matrix.row[filt]
            s_data = matrix.data[filt]
            s_col = np.zeros(s_row.size, dtype="int")
            col = sparse.coo_matrix((s_data, (s_row, s_col)), shape=(matrix.shape[0], 1))
        else:
            col = matrix[:, cidx]

        typed_arr = serialize_typed_array(builder, col)

        # serialize the Column union
        columns.append(serialize_column(builder, typed_arr))

    # Serialize Matrix.columns[]
    Matrix.MatrixStartColumnsVector(builder, n_cols)
    for c in columns:
        builder.PrependUOffsetTRelative(c)
    matrix_column_vec = builder.EndVector(n_cols)

    # serialize the colIndex if provided
    cidx = None
    if col_idx is not None:
        cidx = serialize_typed_array(builder, col_idx)

    # Serialize Matrix
    matrix = serialize_matrix(builder, n_rows, n_cols, matrix_column_vec, cidx)

    builder.Finish(matrix)
    return builder.Output()


def decode_matrix_fbs(fbs):
    """
    Given an FBS-encoded Matrix, return a Pandas DataFrame the contains the data and indices.
    """

    matrix = Matrix.Matrix.GetRootAsMatrix(fbs, 0)
    n_rows = matrix.NRows()
    n_cols = matrix.NCols()
    if n_rows == 0 or n_cols == 0:
        return pd.DataFrame()

    if matrix.RowIndexType() is not TypedFBArray.TypedFBArray.NONE:
        raise ValueError("row indexing not supported for FBS Matrix")

    columns_length = matrix.ColumnsLength()

    columns_index = deserialize_typed_array((matrix.ColIndexType(), matrix.ColIndex()))
    if columns_index is None:
        columns_index = range(0, n_cols)

    # sanity checks
    if len(columns_index) != n_cols or columns_length != n_cols:
        raise ValueError("FBS column count does not match number of columns in underlying matrix")

    columns_data = {}
    columns_type = {}
    for col_idx in range(0, columns_length):
        col = matrix.Columns(col_idx)
        tarr = (col.UType(), col.U())

        # the returned fields depend on the type of array
        data = deserialize_typed_array(tarr)
        columns_data[columns_index[col_idx]] = data
        if len(data) != n_rows:
            raise ValueError("FBS column length does not match number of rows")
        if col.UType() is TypedFBArray.TypedFBArray.JSONEncodedFBArray:
            columns_type[columns_index[col_idx]] = "category"

    df = pd.DataFrame.from_dict(data=columns_data).astype(columns_type, copy=False)

    # more sanity checks
    if not df.columns.is_unique or len(df.columns) != n_cols:
        raise KeyError("FBS column indices are not unique")

    return df
