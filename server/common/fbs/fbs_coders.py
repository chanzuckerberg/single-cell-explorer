import numpy as np
import pandas as pd
from scipy import sparse as sp
import json

from server.common.utils.type_conversion_utils import get_encoding_dtype_of_array
import server.common.fbs.NetEncoding.TypedFBArray as TypedFBArray
import server.common.fbs.NetEncoding.Float32FBArray as Float32FBArray
import server.common.fbs.NetEncoding.Float64FBArray as Float64FBArray
import server.common.fbs.NetEncoding.Int32FBArray as Int32FBArray
import server.common.fbs.NetEncoding.JSONEncodedFBArray as JSONEncodedFBArray
import server.common.fbs.NetEncoding.Uint32FBArray as Uint32FBArray
import server.common.fbs.NetEncoding.DictEncoded16FBArray as DictEncoded16FBArray
import server.common.fbs.NetEncoding.DictEncoded32FBArray as DictEncoded32FBArray
import server.common.fbs.NetEncoding.DictEncoded8FBArray as DictEncoded8FBArray
import server.common.fbs.NetEncoding.SparseFloat32FBArray as SparseFloat32FBArray
import server.common.fbs.NetEncoding.SparseFloat64FBArray as SparseFloat64FBArray


def _get_array_class(array):
    # return the generic type of array - category, sparse, or dense
    # this determines which coder should be used.
    if isinstance(array, pd.Series) and array.dtype.name == "category":
        return "category"
    elif sp.issparse(array):
        return "sparse"
    else:
        return "dense"


def serialize_typed_array(builder, source_array):
    if isinstance(source_array, pd.Index):
        source_array = source_array.to_series()

    array_class = _get_array_class(source_array)

    # depending on the array class, compute the encoding data type from
    # the corresponding attribute of the source array. e.g. for pandas Categoricals,
    # the encoding data type is computed from the codes array.
    if array_class == "category":
        encoding_dtype = np.dtype(source_array.cat.codes.values.dtype).str
    elif array_class == "sparse":
        encoding_dtype = np.dtype(get_encoding_dtype_of_array(source_array.data)).str
    else:
        encoding_dtype = np.dtype(get_encoding_dtype_of_array(source_array)).str

    # two-layer mapper (1) array_class, (2) encoding_dtype
    # this is necessary as an int32 codes array will require a different coder
    # than an int32 numeric array.
    arrayEncoder = {
        "dense": {
            np.dtype(np.float64).str: (DenseNumericCoder, TypedFBArray.TypedFBArray.Float32FBArray),
            np.dtype(np.float32).str: (DenseNumericCoder, TypedFBArray.TypedFBArray.Float32FBArray),
            np.dtype(np.float16).str: (DenseNumericCoder, TypedFBArray.TypedFBArray.Float32FBArray),
            np.dtype(np.int8).str: (DenseNumericCoder, TypedFBArray.TypedFBArray.Int32FBArray),
            np.dtype(np.int16).str: (DenseNumericCoder, TypedFBArray.TypedFBArray.Int32FBArray),
            np.dtype(np.int32).str: (DenseNumericCoder, TypedFBArray.TypedFBArray.Int32FBArray),
            np.dtype(np.int64).str: (DenseNumericCoder, TypedFBArray.TypedFBArray.Int32FBArray),
            np.dtype(np.uint8).str: (DenseNumericCoder, TypedFBArray.TypedFBArray.Uint32FBArray),
            np.dtype(np.uint16).str: (DenseNumericCoder, TypedFBArray.TypedFBArray.Uint32FBArray),
            np.dtype(np.uint32).str: (DenseNumericCoder, TypedFBArray.TypedFBArray.Uint32FBArray),
            np.dtype(np.uint64).str: (DenseNumericCoder, TypedFBArray.TypedFBArray.Uint32FBArray),
        },
        "sparse": {
            np.dtype(np.float64).str: (SparseNumericCoder, TypedFBArray.TypedFBArray.SparseFloat64FBArray),
            np.dtype(np.float32).str: (SparseNumericCoder, TypedFBArray.TypedFBArray.SparseFloat32FBArray),
            # below is to handle cases where integer sparse arrays are encoded - densify in this case.
            np.dtype(np.int8).str: (DenseNumericCoder, TypedFBArray.TypedFBArray.Int32FBArray),
            np.dtype(np.int16).str: (DenseNumericCoder, TypedFBArray.TypedFBArray.Int32FBArray),
            np.dtype(np.int32).str: (DenseNumericCoder, TypedFBArray.TypedFBArray.Int32FBArray),
            np.dtype(np.int64).str: (DenseNumericCoder, TypedFBArray.TypedFBArray.Int32FBArray),
        },
        "category": {
            np.dtype(np.int8).str: (CategoricalCoder, TypedFBArray.TypedFBArray.DictEncoded8FBArray),
            np.dtype(np.int16).str: (CategoricalCoder, TypedFBArray.TypedFBArray.DictEncoded16FBArray),
            np.dtype(np.int32).str: (CategoricalCoder, TypedFBArray.TypedFBArray.DictEncoded32FBArray),
        },
    }
    # the default coder will assume the data is polymorphic and yield a JSON encoded array
    defaultCoder = (PolymorphicCoder, TypedFBArray.TypedFBArray.JSONEncodedFBArray)
    Coder, array_type = arrayEncoder[array_class].get(encoding_dtype, defaultCoder)

    coder_obj = Coder()
    # for encoding, we require the source array, flatbuffer builder, and encoding data type
    array_value = coder_obj.encode_array(source_array, builder, encoding_dtype)
    return (array_type, array_value)


def deserialize_typed_array(tarr):
    type_map = {
        TypedFBArray.TypedFBArray.NONE: (None, None),
        TypedFBArray.TypedFBArray.Uint32FBArray: (DenseNumericCoder, Uint32FBArray.Uint32FBArray),
        TypedFBArray.TypedFBArray.Int32FBArray: (DenseNumericCoder, Int32FBArray.Int32FBArray),
        TypedFBArray.TypedFBArray.Float32FBArray: (DenseNumericCoder, Float32FBArray.Float32FBArray),
        TypedFBArray.TypedFBArray.Float64FBArray: (DenseNumericCoder, Float64FBArray.Float64FBArray),
        TypedFBArray.TypedFBArray.JSONEncodedFBArray: (PolymorphicCoder, JSONEncodedFBArray.JSONEncodedFBArray),
        TypedFBArray.TypedFBArray.DictEncoded8FBArray: (CategoricalCoder, DictEncoded8FBArray.DictEncoded8FBArray),
        TypedFBArray.TypedFBArray.DictEncoded16FBArray: (CategoricalCoder, DictEncoded16FBArray.DictEncoded16FBArray),
        TypedFBArray.TypedFBArray.DictEncoded32FBArray: (CategoricalCoder, DictEncoded32FBArray.DictEncoded32FBArray),
        TypedFBArray.TypedFBArray.SparseFloat32FBArray: (SparseNumericCoder, SparseFloat32FBArray.SparseFloat32FBArray),
        TypedFBArray.TypedFBArray.SparseFloat64FBArray: (SparseNumericCoder, SparseFloat64FBArray.SparseFloat64FBArray),
    }

    (u_type, u) = tarr
    if u_type is TypedFBArray.TypedFBArray.NONE:
        return None

    Coder, TarType = type_map.get(u_type, None)
    if TarType is None:
        raise TypeError(f"FBS contains unknown data type: {u_type}")
    # for decoding, we require the encoded column and the type of typed array
    return Coder().decode_array(u, TarType)


class DenseNumericCoder:
    n_slots = 1

    def encode_array(self, array, builder, dtype):
        # convert pandas series to numpy array
        if isinstance(array, pd.Series):
            array = array.to_numpy()
        elif sp.issparse(array):
            array=array.A.flatten()
        # convert to the specified dtype
        if np.dtype(array.dtype).str != dtype:
            array = array.astype(dtype)

        vec = builder.CreateNumpyVector(array)
        builder.StartObject(self.n_slots)
        builder.PrependUOffsetTRelativeSlot(0, vec, 0)
        return builder.EndObject()

    def decode_array(self, u, TarType):
        arr = TarType()
        arr.Init(u.Bytes, u.Pos)
        return arr.DataAsNumpy()


class CategoricalCoder:
    n_slots = 2

    def encode_array(self, array, builder, dtype):
        if isinstance(array, pd.Series) and array.dtype.name == "category":
            # create the code-to-value dictionary and encode in utf-8 as a byte array
            dictionary = np.array(bytearray(json.dumps(dict(enumerate(array.cat.categories))), "utf-8"))
            codes = array.cat.codes.values

            # this type safeguard is likely unecessary but can't hurt to include
            if np.dtype(codes.dtype).str != dtype:
                codes = codes.astype(dtype)

            vec_codes = builder.CreateNumpyVector(codes)
            vec_dictionary = builder.CreateNumpyVector(dictionary)
            builder.StartObject(self.n_slots)
            builder.PrependUOffsetTRelativeSlot(0, vec_codes, 0)
            builder.PrependUOffsetTRelativeSlot(1, vec_dictionary, 0)
            return builder.EndObject()
        else:
            raise ValueError("Input array must be pandas Categorical.")

    def decode_array(self, u, TarType):
        # returns a pandas Categorical
        arr = TarType()
        arr.Init(u.Bytes, u.Pos)
        codes = arr.CodesAsNumpy()
        dictionary = arr.DictAsNumpy()
        dictionary = json.loads(dictionary.tobytes().decode("utf-8"))
        return pd.Categorical.from_codes(codes, categories=list(dictionary.values()))


class SparseNumericCoder:
    n_slots = 3

    def encode_array(self, array, builder, dtype):
        # ensure array is columnar and sparse format
        if sp.issparse(array) and array.shape[1] == 1:
            array = array.tocoo()  # cast to COO
            row_coords = np.uint32(array.row)  # ensure this is uint32 to match schema
            nnz_data = array.data
            size = np.uint32(array.shape[0])  # ensure this is uint32 to match schema
            if np.dtype(nnz_data.dtype).str != dtype:
                nnz_data = nnz_data.astype(dtype)

            vec_nnz_data = builder.CreateNumpyVector(nnz_data)
            vec_row_coords = builder.CreateNumpyVector(row_coords)
            builder.StartObject(self.n_slots)
            builder.PrependUOffsetTRelativeSlot(0, vec_nnz_data, 0)
            builder.PrependUOffsetTRelativeSlot(1, vec_row_coords, 0)
            builder.PrependUint32Slot(2, size, 0)
            return builder.EndObject()
        else:
            raise ValueError("Input array must be a sparse column")

    def decode_array(self, u, TarType):
        arr = TarType()
        arr.Init(u.Bytes, u.Pos)
        data = arr.DataAsNumpy()
        rows = arr.RowsAsNumpy()
        size = arr.Size()
        dense_data = np.zeros(size, dtype=data.dtype)
        dense_data[rows] = data
        return dense_data


class PolymorphicCoder:
    n_slots = 1
    # dtype is unused here as array is just getting slammed into a JSON
    def encode_array(self, array, builder, dtype=None):
        if sp.issparse(array):
            array=array.A.flatten()
        array = pd.Series(array)
        as_json = array.to_json(orient="records")
        json_array = np.array(bytearray(as_json, "utf-8"))

        vec = builder.CreateNumpyVector(json_array)
        builder.StartObject(self.n_slots)
        builder.PrependUOffsetTRelativeSlot(0, vec, 0)
        return builder.EndObject()

    def decode_array(self, u, TarType):
        arr = TarType()
        arr.Init(u.Bytes, u.Pos)
        narr = arr.DataAsNumpy()
        return np.array(json.loads(narr.tobytes().decode("utf-8")))
