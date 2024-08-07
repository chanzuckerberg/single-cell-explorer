// automatically generated by the FlatBuffers compiler, do not modify
// @ts-nocheck
import { DictEncoded16FBArray } from "../net-encoding/dict-encoded16-f-b-array";
import { DictEncoded32FBArray } from "../net-encoding/dict-encoded32-f-b-array";
import { DictEncoded8FBArray } from "../net-encoding/dict-encoded8-f-b-array";
import { Float32FBArray } from "../net-encoding/float32-f-b-array";
import { Float64FBArray } from "../net-encoding/float64-f-b-array";
import { Int16EncodedXFBArray } from "../net-encoding/int16-encoded-x-f-b-array";
import { Int32FBArray } from "../net-encoding/int32-f-b-array";
import { JSONEncodedFBArray } from "../net-encoding/j-s-o-n-encoded-f-b-array";
import { Uint32FBArray } from "../net-encoding/uint32-f-b-array";

export enum TypedFBArray {
  NONE = 0,
  Float32FBArray = 1,
  Int32FBArray = 2,
  Uint32FBArray = 3,
  Float64FBArray = 4,
  JSONEncodedFBArray = 5,
  DictEncoded8FBArray = 6,
  DictEncoded16FBArray = 7,
  DictEncoded32FBArray = 8,
  Int16EncodedXFBArray = 9,
}

export function unionToTypedFBArray(
  type: TypedFBArray,
  accessor: (
    obj:
      | DictEncoded16FBArray
      | DictEncoded32FBArray
      | DictEncoded8FBArray
      | Float32FBArray
      | Float64FBArray
      | Int16EncodedXFBArray
      | Int32FBArray
      | JSONEncodedFBArray
      | Uint32FBArray
  ) =>
    | DictEncoded16FBArray
    | DictEncoded32FBArray
    | DictEncoded8FBArray
    | Float32FBArray
    | Float64FBArray
    | Int16EncodedXFBArray
    | Int32FBArray
    | JSONEncodedFBArray
    | Uint32FBArray
    | null
):
  | DictEncoded16FBArray
  | DictEncoded32FBArray
  | DictEncoded8FBArray
  | Float32FBArray
  | Float64FBArray
  | Int16EncodedXFBArray
  | Int32FBArray
  | JSONEncodedFBArray
  | Uint32FBArray
  | null {
  switch (TypedFBArray[type]) {
    case "NONE":
      return null;
    case "Float32FBArray":
      return accessor(new Float32FBArray())! as Float32FBArray;
    case "Int32FBArray":
      return accessor(new Int32FBArray())! as Int32FBArray;
    case "Uint32FBArray":
      return accessor(new Uint32FBArray())! as Uint32FBArray;
    case "Float64FBArray":
      return accessor(new Float64FBArray())! as Float64FBArray;
    case "JSONEncodedFBArray":
      return accessor(new JSONEncodedFBArray())! as JSONEncodedFBArray;
    case "DictEncoded8FBArray":
      return accessor(new DictEncoded8FBArray())! as DictEncoded8FBArray;
    case "DictEncoded16FBArray":
      return accessor(new DictEncoded16FBArray())! as DictEncoded16FBArray;
    case "DictEncoded32FBArray":
      return accessor(new DictEncoded32FBArray())! as DictEncoded32FBArray;
    case "Int16EncodedXFBArray":
      return accessor(new Int16EncodedXFBArray())! as Int16EncodedXFBArray;
    default:
      return null;
  }
}

export function unionListToTypedFBArray(
  type: TypedFBArray,
  accessor: (
    index: number,
    obj:
      | DictEncoded16FBArray
      | DictEncoded32FBArray
      | DictEncoded8FBArray
      | Float32FBArray
      | Float64FBArray
      | Int16EncodedXFBArray
      | Int32FBArray
      | JSONEncodedFBArray
      | Uint32FBArray
  ) =>
    | DictEncoded16FBArray
    | DictEncoded32FBArray
    | DictEncoded8FBArray
    | Float32FBArray
    | Float64FBArray
    | Int16EncodedXFBArray
    | Int32FBArray
    | JSONEncodedFBArray
    | Uint32FBArray
    | null,
  index: number
):
  | DictEncoded16FBArray
  | DictEncoded32FBArray
  | DictEncoded8FBArray
  | Float32FBArray
  | Float64FBArray
  | Int16EncodedXFBArray
  | Int32FBArray
  | JSONEncodedFBArray
  | Uint32FBArray
  | null {
  switch (TypedFBArray[type]) {
    case "NONE":
      return null;
    case "Float32FBArray":
      return accessor(index, new Float32FBArray())! as Float32FBArray;
    case "Int32FBArray":
      return accessor(index, new Int32FBArray())! as Int32FBArray;
    case "Uint32FBArray":
      return accessor(index, new Uint32FBArray())! as Uint32FBArray;
    case "Float64FBArray":
      return accessor(index, new Float64FBArray())! as Float64FBArray;
    case "JSONEncodedFBArray":
      return accessor(index, new JSONEncodedFBArray())! as JSONEncodedFBArray;
    case "DictEncoded8FBArray":
      return accessor(index, new DictEncoded8FBArray())! as DictEncoded8FBArray;
    case "DictEncoded16FBArray":
      return accessor(
        index,
        new DictEncoded16FBArray()
      )! as DictEncoded16FBArray;
    case "DictEncoded32FBArray":
      return accessor(
        index,
        new DictEncoded32FBArray()
      )! as DictEncoded32FBArray;
    case "Int16EncodedXFBArray":
      return accessor(
        index,
        new Int16EncodedXFBArray()
      )! as Int16EncodedXFBArray;
    default:
      return null;
  }
}
