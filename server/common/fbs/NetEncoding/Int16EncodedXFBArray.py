# automatically generated by the FlatBuffers compiler, do not modify

# namespace: NetEncoding

import flatbuffers
from flatbuffers.compat import import_numpy

np = import_numpy()


class Int16EncodedXFBArray(object):
    __slots__ = ["_tab"]

    @classmethod
    def GetRootAs(cls, buf, offset=0):
        n = flatbuffers.encode.Get(flatbuffers.packer.uoffset, buf, offset)
        x = Int16EncodedXFBArray()
        x.Init(buf, n + offset)
        return x

    @classmethod
    def GetRootAsInt16EncodedXFBArray(cls, buf, offset=0):
        """This method is deprecated. Please switch to GetRootAs."""
        return cls.GetRootAs(buf, offset)

    # Int16EncodedXFBArray
    def Init(self, buf, pos):
        self._tab = flatbuffers.table.Table(buf, pos)

    # Int16EncodedXFBArray
    def Codes(self, j):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(4))
        if o != 0:
            a = self._tab.Vector(o)
            return self._tab.Get(
                flatbuffers.number_types.Int16Flags, a + flatbuffers.number_types.UOffsetTFlags.py_type(j * 2)
            )
        return 0

    # Int16EncodedXFBArray
    def CodesAsNumpy(self):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(4))
        if o != 0:
            return self._tab.GetVectorAsNumpy(flatbuffers.number_types.Int16Flags, o)
        return 0

    # Int16EncodedXFBArray
    def CodesLength(self):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(4))
        if o != 0:
            return self._tab.VectorLen(o)
        return 0

    # Int16EncodedXFBArray
    def CodesIsNone(self):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(4))
        return o == 0

    # Int16EncodedXFBArray
    def Max(self):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(6))
        if o != 0:
            return self._tab.Get(flatbuffers.number_types.Float32Flags, o + self._tab.Pos)
        return 0.0

    # Int16EncodedXFBArray
    def Min(self):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(8))
        if o != 0:
            return self._tab.Get(flatbuffers.number_types.Float32Flags, o + self._tab.Pos)
        return 0.0

    # Int16EncodedXFBArray
    def Nbins(self):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(10))
        if o != 0:
            return self._tab.Get(flatbuffers.number_types.Int32Flags, o + self._tab.Pos)
        return 0


def Start(builder):
    builder.StartObject(4)


def Int16EncodedXFBArrayStart(builder):
    """This method is deprecated. Please switch to Start."""
    return Start(builder)


def AddCodes(builder, codes):
    builder.PrependUOffsetTRelativeSlot(0, flatbuffers.number_types.UOffsetTFlags.py_type(codes), 0)


def Int16EncodedXFBArrayAddCodes(builder, codes):
    """This method is deprecated. Please switch to AddCodes."""
    return AddCodes(builder, codes)


def StartCodesVector(builder, numElems):
    return builder.StartVector(2, numElems, 2)


def Int16EncodedXFBArrayStartCodesVector(builder, numElems):
    """This method is deprecated. Please switch to Start."""
    return StartCodesVector(builder, numElems)


def AddMax(builder, max):
    builder.PrependFloat32Slot(1, max, 0.0)


def Int16EncodedXFBArrayAddMax(builder, max):
    """This method is deprecated. Please switch to AddMax."""
    return AddMax(builder, max)


def AddMin(builder, min):
    builder.PrependFloat32Slot(2, min, 0.0)


def Int16EncodedXFBArrayAddMin(builder, min):
    """This method is deprecated. Please switch to AddMin."""
    return AddMin(builder, min)


def AddNbins(builder, nbins):
    builder.PrependInt32Slot(3, nbins, 0)


def Int16EncodedXFBArrayAddNbins(builder, nbins):
    """This method is deprecated. Please switch to AddNbins."""
    return AddNbins(builder, nbins)


def End(builder):
    return builder.EndObject()


def Int16EncodedXFBArrayEnd(builder):
    """This method is deprecated. Please switch to End."""
    return End(builder)
