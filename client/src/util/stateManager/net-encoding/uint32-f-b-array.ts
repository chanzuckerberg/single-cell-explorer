// automatically generated by the FlatBuffers compiler, do not modify

import { flatbuffers } from 'flatbuffers';
export class Uint32FBArray {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):Uint32FBArray {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsUint32FBArray(bb:flatbuffers.ByteBuffer, obj?:Uint32FBArray):Uint32FBArray {
  return (obj || new Uint32FBArray()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsUint32FBArray(bb:flatbuffers.ByteBuffer, obj?:Uint32FBArray):Uint32FBArray {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new Uint32FBArray()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

data(index: number):number|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.readUint32(this.bb!.__vector(this.bb_pos + offset) + index * 4) : 0;
}

dataLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

dataArray():Uint32Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? new Uint32Array(this.bb!.bytes().buffer, this.bb!.bytes().byteOffset + this.bb!.__vector(this.bb_pos + offset), this.bb!.__vector_len(this.bb_pos + offset)) : null;
}

static startUint32FBArray(builder:flatbuffers.Builder) {
  builder.startObject(1);
}

static addData(builder:flatbuffers.Builder, dataOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, dataOffset, 0);
}

static createDataVector(builder:flatbuffers.Builder, data:number[]|Uint32Array):flatbuffers.Offset;
/**
 * @deprecated This Uint8Array overload will be removed in the future.
 */
static createDataVector(builder:flatbuffers.Builder, data:number[]|Uint8Array):flatbuffers.Offset;
static createDataVector(builder:flatbuffers.Builder, data:number[]|Uint32Array|Uint8Array):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addInt32(data[i]!);
  }
  return builder.endVector();
}

static startDataVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static endUint32FBArray(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createUint32FBArray(builder:flatbuffers.Builder, dataOffset:flatbuffers.Offset):flatbuffers.Offset {
  Uint32FBArray.startUint32FBArray(builder);
  Uint32FBArray.addData(builder, dataOffset);
  return Uint32FBArray.endUint32FBArray(builder);
}
}