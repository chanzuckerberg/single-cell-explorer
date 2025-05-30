# automatically generated by the FlatBuffers compiler, do not modify

# namespace: NetEncoding

import flatbuffers
from flatbuffers.compat import import_numpy

np = import_numpy()


class Matrix(object):
    __slots__ = ["_tab"]

    @classmethod
    def GetRootAs(cls, buf, offset=0):
        n = flatbuffers.encode.Get(flatbuffers.packer.uoffset, buf, offset)
        x = Matrix()
        x.Init(buf, n + offset)
        return x

    @classmethod
    def GetRootAsMatrix(cls, buf, offset=0):
        """This method is deprecated. Please switch to GetRootAs."""
        return cls.GetRootAs(buf, offset)

    # Matrix
    def Init(self, buf, pos):
        self._tab = flatbuffers.table.Table(buf, pos)

    # Matrix
    def NRows(self):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(4))
        if o != 0:
            return self._tab.Get(flatbuffers.number_types.Uint32Flags, o + self._tab.Pos)
        return 0

    # Matrix
    def NCols(self):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(6))
        if o != 0:
            return self._tab.Get(flatbuffers.number_types.Uint32Flags, o + self._tab.Pos)
        return 0

    # Matrix
    def Columns(self, j):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(8))
        if o != 0:
            x = self._tab.Vector(o)
            x += flatbuffers.number_types.UOffsetTFlags.py_type(j) * 4
            x = self._tab.Indirect(x)
            from server.common.fbs.NetEncoding.Column import Column

            obj = Column()
            obj.Init(self._tab.Bytes, x)
            return obj
        return None

    # Matrix
    def ColumnsLength(self):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(8))
        if o != 0:
            return self._tab.VectorLen(o)
        return 0

    # Matrix
    def ColumnsIsNone(self):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(8))
        return o == 0

    # Matrix
    def ColIndexType(self):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(10))
        if o != 0:
            return self._tab.Get(flatbuffers.number_types.Uint8Flags, o + self._tab.Pos)
        return 0

    # Matrix
    def ColIndex(self):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(12))
        if o != 0:
            from flatbuffers.table import Table

            obj = Table(bytearray(), 0)
            self._tab.Union(obj, o)
            return obj
        return None

    # Matrix
    def RowIndexType(self):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(14))
        if o != 0:
            return self._tab.Get(flatbuffers.number_types.Uint8Flags, o + self._tab.Pos)
        return 0

    # Matrix
    def RowIndex(self):
        o = flatbuffers.number_types.UOffsetTFlags.py_type(self._tab.Offset(16))
        if o != 0:
            from flatbuffers.table import Table

            obj = Table(bytearray(), 0)
            self._tab.Union(obj, o)
            return obj
        return None


def Start(builder):
    builder.StartObject(7)


def MatrixStart(builder):
    """This method is deprecated. Please switch to Start."""
    return Start(builder)


def AddNRows(builder, nRows):
    builder.PrependUint32Slot(0, nRows, 0)


def MatrixAddNRows(builder, nRows):
    """This method is deprecated. Please switch to AddNRows."""
    return AddNRows(builder, nRows)


def AddNCols(builder, nCols):
    builder.PrependUint32Slot(1, nCols, 0)


def MatrixAddNCols(builder, nCols):
    """This method is deprecated. Please switch to AddNCols."""
    return AddNCols(builder, nCols)


def AddColumns(builder, columns):
    builder.PrependUOffsetTRelativeSlot(2, flatbuffers.number_types.UOffsetTFlags.py_type(columns), 0)


def MatrixAddColumns(builder, columns):
    """This method is deprecated. Please switch to AddColumns."""
    return AddColumns(builder, columns)


def StartColumnsVector(builder, numElems):
    return builder.StartVector(4, numElems, 4)


def MatrixStartColumnsVector(builder, numElems):
    """This method is deprecated. Please switch to Start."""
    return StartColumnsVector(builder, numElems)


def AddColIndexType(builder, colIndexType):
    builder.PrependUint8Slot(3, colIndexType, 0)


def MatrixAddColIndexType(builder, colIndexType):
    """This method is deprecated. Please switch to AddColIndexType."""
    return AddColIndexType(builder, colIndexType)


def AddColIndex(builder, colIndex):
    builder.PrependUOffsetTRelativeSlot(4, flatbuffers.number_types.UOffsetTFlags.py_type(colIndex), 0)


def MatrixAddColIndex(builder, colIndex):
    """This method is deprecated. Please switch to AddColIndex."""
    return AddColIndex(builder, colIndex)


def AddRowIndexType(builder, rowIndexType):
    builder.PrependUint8Slot(5, rowIndexType, 0)


def MatrixAddRowIndexType(builder, rowIndexType):
    """This method is deprecated. Please switch to AddRowIndexType."""
    return AddRowIndexType(builder, rowIndexType)


def AddRowIndex(builder, rowIndex):
    builder.PrependUOffsetTRelativeSlot(6, flatbuffers.number_types.UOffsetTFlags.py_type(rowIndex), 0)


def MatrixAddRowIndex(builder, rowIndex):
    """This method is deprecated. Please switch to AddRowIndex."""
    return AddRowIndex(builder, rowIndex)


def End(builder):
    return builder.EndObject()


def MatrixEnd(builder):
    """This method is deprecated. Please switch to End."""
    return End(builder)
