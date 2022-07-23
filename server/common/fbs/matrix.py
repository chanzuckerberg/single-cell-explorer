import json
from json import JSONDecodeError
import numpy as np
import pandas as pd
from flatbuffers import Builder
from scipy import sparse

from server.common.utils.type_conversion_utils import get_encoding_dtype_of_array

import server.common.fbs.NetEncoding.Column as Column
import server.common.fbs.NetEncoding.Float32FBArray as Float32FBArray
import server.common.fbs.NetEncoding.Float64FBArray as Float64FBArray
import server.common.fbs.NetEncoding.Int32FBArray as Int32FBArray
import server.common.fbs.NetEncoding.JSONEncodedFBArray as JSONEncodedFBArray
import server.common.fbs.NetEncoding.Matrix as Matrix
import server.common.fbs.NetEncoding.TypedFBArray as TypedFBArray
import server.common.fbs.NetEncoding.Uint32FBArray as Uint32FBArray
import server.common.fbs.NetEncoding.CatInt16FBArray as CatInt16FBArray
import server.common.fbs.NetEncoding.CatInt32FBArray as CatInt32FBArray
import server.common.fbs.NetEncoding.CatInt8FBArray as CatInt8FBArray
import server.common.fbs.NetEncoding.SparseFloat32FBArray as SparseFloat32FBArray
import server.common.fbs.NetEncoding.SparseFloat64FBArray as SparseFloat64FBArray

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


# Serialization helper
def serialize_typed_array(builder, source_array, encoding_info):
    """
    Serialize any of the various typed arrays, eg, Float32FBArray. Specific means of serialization and type conversion
    are provided by type_info.
    """

    arr = source_array
    (array_type, as_type1, as_type2) = encoding_info(source_array)
    if isinstance(arr, pd.Index):
        arr = arr.to_series()

    types = [as_type1,as_type2,'int']
    
    if as_type1 == "json":
        as_json = arr.to_json(orient="records")
        arr = np.array(bytearray(as_json, "utf-8"))
        fields = [arr]
    else:
        if sparse.issparse(arr):
            row = arr.row
            data = arr.data
            size = np.array([max(arr.shape)],dtype='int')
            fields = [data,row,size]
        elif isinstance(arr, pd.Series):
            if arr.dtype.name == "category":
                secondary = np.array(bytearray(json.dumps(dict(enumerate(arr.cat.categories))),"utf-8"))
                arr = arr.cat.codes
                fields = [arr.to_numpy(),secondary]
            else:
                fields = [arr.to_numpy()]
        else:
            fields = [arr]
                

        for i,field_type in zip(range(len(fields)),types):
            if fields[i].dtype != field_type:
                fields[i] = fields[i].astype(field_type) 
            
            if fields[i].ndim == 2:
                if fields[i].shape[0] == 1:
                    fields[i] = fields[i][0]
                elif fields[i].shape[1] == 1:
                    fields[i] = fields[i].T[0]

    vecs = [builder.CreateNumpyVector(field) for field in fields]
    builder.StartObject(len(vecs))
    for i,vec in enumerate(vecs):
        builder.PrependUOffsetTRelativeSlot(i, vec, 0)
    array_value = builder.EndObject()
    return (array_type, array_value)


def column_encoding(arr):
    column_encoding_type_map = {
        # array protocol string:  ( array_type, as_type1, as_type2 )
        # as_type2 is used for flatbuffers with more than one slot
        np.dtype(np.float64).str: (TypedFBArray.TypedFBArray.Float32FBArray, np.float32, None),
        np.dtype(np.float32).str: (TypedFBArray.TypedFBArray.Float32FBArray, np.float32, None),
        np.dtype(np.float16).str: (TypedFBArray.TypedFBArray.Float32FBArray, np.float32, None),
        "cat8": (TypedFBArray.TypedFBArray.CatInt8FBArray, np.int8, np.uint8),
        "cat16": (TypedFBArray.TypedFBArray.CatInt16FBArray, np.int16, np.uint8),
        "cat32": (TypedFBArray.TypedFBArray.CatInt32FBArray, np.int32, np.uint8),
        np.dtype(np.int32).str: (TypedFBArray.TypedFBArray.Int32FBArray, np.int32, None),        
        np.dtype(np.int64).str: (TypedFBArray.TypedFBArray.Int32FBArray, np.int32, None),
        np.dtype(np.uint8).str: (TypedFBArray.TypedFBArray.Uint32FBArray, np.uint32, None),
        np.dtype(np.uint16).str: (TypedFBArray.TypedFBArray.Uint32FBArray, np.uint32, None),
        np.dtype(np.uint32).str: (TypedFBArray.TypedFBArray.Uint32FBArray, np.uint32, None),
        np.dtype(np.uint64).str: (TypedFBArray.TypedFBArray.Uint32FBArray, np.uint32, None),
        "sparse32": (TypedFBArray.TypedFBArray.SparseFloat32FBArray, np.float32, np.int32),
        "sparse64": (TypedFBArray.TypedFBArray.SparseFloat64FBArray, np.float64, np.int32),
    }
    column_encoding_default = (TypedFBArray.TypedFBArray.JSONEncodedFBArray, "json", None)

    encoding_dtype = get_encoding_dtype_of_array(arr)
    if not isinstance(encoding_dtype,str):
        encoding_dtype = np.dtype(encoding_dtype).str
    return column_encoding_type_map.get(encoding_dtype, column_encoding_default)


def index_encoding(arr):
    index_encoding_type_map = {
        # array protocol string:  ( array_type, as_type )
        np.dtype(np.int32).str: (TypedFBArray.TypedFBArray.Int32FBArray, np.int32, None),
        np.dtype(np.int64).str: (TypedFBArray.TypedFBArray.Int32FBArray, np.int32, None),
        np.dtype(np.uint32).str: (TypedFBArray.TypedFBArray.Uint32FBArray, np.uint32, None),
        np.dtype(np.uint64).str: (TypedFBArray.TypedFBArray.Uint32FBArray, np.uint32, None),
    }
    index_encoding_default = (TypedFBArray.TypedFBArray.JSONEncodedFBArray, "json", None)

    return index_encoding_type_map.get(arr.dtype.str, index_encoding_default)


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
    :param row_idx: index for row dimension, Index or ndarray
    :param col_idx: index for col dimension, Index or ndarray

    NOTE: row indices are (currently) unsupported and must be None
    """

    if row_idx is not None:
        raise ValueError("row indexing not supported for FBS Matrix")
    if matrix.ndim != 2:
        raise ValueError("FBS Matrix must be 2D")

    if sparse.issparse(matrix):
        matrix=matrix.tocoo()

    (n_rows, n_cols) = matrix.shape
    # estimate size needed, so we don't unnecessarily realloc.
    builder = Builder(guess_at_mem_needed(matrix))

    columns = []
    for cidx in range(n_cols - 1, -1, -1):
        # serialize the typed array
        if isinstance(matrix, pd.DataFrame):
            col = matrix.iloc[:, cidx]
        elif sparse.issparse(matrix):
            filt = matrix.col==cidx
            s_row = matrix.row[filt]
            s_data= matrix.data[filt]
            s_col = np.zeros(s_row.size,dtype='int')
            col = sparse.coo_matrix((s_data,(s_row,s_col)),shape=(matrix.shape[0],1))
        else:
            col = matrix[:, cidx]
        typed_arr = serialize_typed_array(builder, col, column_encoding)

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
        cidx = serialize_typed_array(builder, col_idx, index_encoding)

    # Serialize Matrix
    matrix = serialize_matrix(builder, n_rows, n_cols, matrix_column_vec, cidx)

    builder.Finish(matrix)
    return builder.Output()


def deserialize_typed_array(tarr):
    type_map = {
        TypedFBArray.TypedFBArray.NONE: None,
        TypedFBArray.TypedFBArray.Uint32FBArray: Uint32FBArray.Uint32FBArray,
        TypedFBArray.TypedFBArray.Int32FBArray: Int32FBArray.Int32FBArray,
        TypedFBArray.TypedFBArray.Float32FBArray: Float32FBArray.Float32FBArray,
        TypedFBArray.TypedFBArray.Float64FBArray: Float64FBArray.Float64FBArray,
        TypedFBArray.TypedFBArray.JSONEncodedFBArray: JSONEncodedFBArray.JSONEncodedFBArray,
        TypedFBArray.TypedFBArray.CatInt8FBArray: CatInt8FBArray.CatInt8FBArray,
        TypedFBArray.TypedFBArray.CatInt16FBArray: CatInt16FBArray.CatInt16FBArray,        
        TypedFBArray.TypedFBArray.CatInt32FBArray: CatInt32FBArray.CatInt32FBArray,
        TypedFBArray.TypedFBArray.SparseFloat32FBArray: SparseFloat32FBArray.SparseFloat32FBArray,        
        TypedFBArray.TypedFBArray.SparseFloat64FBArray: SparseFloat64FBArray.SparseFloat64FBArray,
    }
    (u_type, u) = tarr
    if u_type is TypedFBArray.TypedFBArray.NONE:
        return [None, None, None]

    TarType = type_map.get(u_type, None)
    if TarType is None:
        raise TypeError(f"FBS contains unknown data type: {u_type}")

    arr = TarType()
    arr.Init(u.Bytes, u.Pos)

    narr = arr.DataAsNumpy()
    if u_type == TypedFBArray.TypedFBArray.JSONEncodedFBArray:
        narr = json.loads(narr.tobytes().decode("utf-8"))
    
    
    result = [narr,None,None]
    if (u_type == TypedFBArray.TypedFBArray.CatInt8FBArray or
        u_type == TypedFBArray.TypedFBArray.CatInt16FBArray or
        u_type == TypedFBArray.TypedFBArray.CatInt32FBArray):
        narr2 = arr.CodesAsNumpy()
        narr2 = json.loads(narr2.tobytes().decode("utf-8"))
        result[1] = narr2
    elif (u_type == TypedFBArray.TypedFBArray.SparseFloat32FBArray or
          u_type == TypedFBArray.TypedFBArray.SparseFloat64FBArray):
        result[1] = arr.RowsAsNumpy()
        result[2] = arr.SizeAsNumpy()
    return result


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

    columns_index,_,_ = deserialize_typed_array((matrix.ColIndexType(), matrix.ColIndex()))
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
        arr1, arr2, arr3 = deserialize_typed_array(tarr)

        if (col.UType() is TypedFBArray.TypedFBArray.CatInt8FBArray or 
            col.UType() is TypedFBArray.TypedFBArray.CatInt16FBArray or 
            col.UType() is TypedFBArray.TypedFBArray.CatInt32FBArray):
            data = pd.Categorical.from_codes(arr1, categories=list(arr2.values()))
        elif (col.UType() is TypedFBArray.TypedFBArray.SparseFloat32FBArray or 
            col.UType() is TypedFBArray.TypedFBArray.SparseFloat64FBArray):
            data = np.zeros(arr3[0],dtype=arr1.dtype)
            data[arr2] = arr1
        else:
            data = arr1

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
