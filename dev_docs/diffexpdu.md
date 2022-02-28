# Differential Expression REST API parameter encoding (diffex PDU)

The cellxgene REST API encodes parameters for differential expression requests using
a binary format. The format comprises several simple parameters and two sets of cells. The
cell sets are encoded as increasing monotone integer lists, aka postings list.

All multi-byte integral types are encoded in little-endian format. Type names should be self-explanatory,
eg, Uint16 is a 2 byte, little endian, unsigned integer.

## Request encoding (diffex PDU)

The request parameters are encoded in the following format:

| Field  | Format      | Notes                                                                                                         |
| ------ | ----------- | ------------------------------------------------------------------------------------------------------------- |
| magic  | byte        | Constant value, currently 0xDE.                                                                               |
| mode   | byte        | Specifies differential expression mode of top N (0) or VarFilter ( 1). Currently, only 0 (TopN) is supported. |
| params | ModeParams  | Mode-specific parameters.                                                                                     |
| set1   | PostingList | first cell set                                                                                                |
| set2   | PostingList | second cell set                                                                                               |

ModeParams for the TopN mode are encoded as:

| Field | Format | Notes           |
| ----- | ------ | --------------- |
| N     | Uint16 | The N parameter |

## PostingList encoding

All postings lists are monotone (increasing) integer lists, and are designed to store _sets_ of 32-bit
integers. The 32-bit integer domain is partitioned into 2^16 regions based upon the most significant
16 bits. Each partition which contain values is encoded as a _block_, which will contain elements
from the postings list which share common 16 most significant bits.

Each block is encoded in one of three binary formats, typically selected to minimize space:

- Bitarray - positional encoding using a bitarray of length 2^16 bits.
- Uint16 list - a list of Uint16.
- Inverted Uint16 list - a list of Uint16, encoding elements _missing_ from the block.

The PostingList type is encoded as:

| Field             | Format                     | Notes                                                                                |
| ----------------- | -------------------------- | ------------------------------------------------------------------------------------ |
| magic             | byte                       | Constant value, currently 0xCE.                                                      |
| N_Lists-1         | byte                       | Number of lists minus one (ie, if N_Lists == 1, encoded as 0x00). 1 <= N_Lists <= 8. |
| N_blocks-1        | Uint16                     | Number of blocks minus one (ie, if n_blocks == 1, encoded as 0)                      |
| BlockDescriptions | BlockDescription[N_blocks] | Array of block descriptions [0..N_blocks-1].                                         |
| Block             | Block[N_blocks]            | Each block, [0..N_blocks-1]                                                          |

Each BlockDescription is encoded as:

| Field          | Format | Notes                                                                              |
| -------------- | ------ | ---------------------------------------------------------------------------------- |
| block_type     | byte   | Byte indicating block type.                                                        |
| list_id_mask   | byte   | Bitmask indicating which list IDs are encoded in the block (eg, 0x01) is list zero |
| n_elements - 1 | Uint16 | Number of elements in the block, minus one. (ie, 1 element is encoded as 0x0000)   |
| key            | Uint16 | Most significant 16 bits for elements encoded in this block.                       |
| n_bytes        | Uint16 | Length of block, in bytes.                                                         |

Current block types are (name, binary code):

- BitArray = 0
- Uint16 list = 1
- Inverted Uint16 list = 2

The lists in any given block are encoded in the `list_id_mask` field. Currently, all block types
support a *single* list, and therefore this mask will have a single bit set. A mask was selected
to enable future addition of multi-list blocks, should they become useful.

Blocks are encoded in a block*type-specific format. *All\* blocks are deflate-compressed.

### Sub-block encoding formats

Multiple block types utilize common sub-block encoding formats.

#### Delta coding

The term is used to signify encoding a monotonically increasing list of integers as the difference
between subsequent integers, prefaced by the value of the first element. This operation is the inverse
of a cumulative sum operation.

For example, the list `[1, 8, 99]` would be delta coded as `[1, 7, 91]`.

#### Byteshuffle

The byteshuffle operation signifies reorganizing a list of multi-byte integers such that the
least signficant bytes _of all values_ are stored first, following by the next most significant byte of all values,
until all bytes are so stored.

For example, the list of Uint16 `[0x0001, 0x0002, 0x0300]` would be stored as the byte sequence `[0x01, 0x02, 0x00, 0x00, 0x00, 0x03]`

### Bitarray block type

Bitarray blocks are encoded as a positional bitarray (little endian). In other words, for the element `i`, the
bit at position block[i % 8][i//8] will be set to one.

### Uint16 list block type

Uint16 list blocks are encoded as a list of little-endian Uint16, where each value represents the lower two bytes of the
element value. The list of two-byte unsigned integers are delta and byte shuffled with least significant bytes first.

For example, the list partition `[0, 1, 3, 259]`, aka `[0x0000, 0x0001, 0x0003, 0x0111]` would be encoded as the
_little endian_ byte array `[0x00 0x01 0x02 0x00 0x00 0x00 0x00 0x01]`. Illustration of steps:

1. `delta([0, 1, 3, 259])` -> `[0x0000, 0x0001, 0x0002, 0x0100]`
2. `byteshuffle([0x0000, 0x0001, 0x0002, 0x0100])` -> `[0x00 0x01 0x02 0x00 0x00 0x00 0x00 0x01]`

### Inverted Uint16 block type

Inverted Uint16 lists encode elements _missing_ from range of values in the original partition. In other words, the
values `[0, 1, 2, 4]` would be encoded as:

- the element values interval, encoded as a half-open range specified by two Uint16 values. Iin this example, it would be encoded as [0, 5)
- the _missing_ elements encoded as in Uint16 lists, ie, `[3]` in the above example

For example, the list partition `[1, 3, 4, 6]` would be encoded in the following manner:

1. Value interval is determined, ie, [1, 7), to be encoded as two Uint16s: 0x0001 0x0007
2. Missing elements from this range are determined, eg, [2, 5] and encoded as Uint16, eg, [0x0200, 0x0500]
3. Missing elements are delta coded ([2, 3]), eg, `delta([2, 5])` -> `[0x0002, 0x0003]`
4. `byteshuffle([0x0002, 0x0003])` -> `[0x02, 0x03, 0x00, 0x00]`
5. And the results of steps 1 and 4 are concatenated, resulting in: `[0x01, 0x00, 0x07, 0x00, 0x02, 0x03, 0x00, 0x00]`

## Choosing a block type

During the process of encoding a postings list block, a block type must be selected. The block type
is commonly selected to (approximately) minimize the size of the final encoded block.
Because there are multiple formats (bitarray, list, and inverted list), _and_ `deflate` is applied post-encoding, it
is challenging to predict which block type will be optimal.

The amount of compression is highly dependent on the information content of the list, and short of
prospectively trying all block types (which is computationally expensive), the current implementation
applies a heuristic to select a block type.

The heuristic uses a set of thresholds to determine block type. The thresholds were empirically tuned on
a very large set of test cases, using real data, to determine reasonably optimal cutoffs. The primary
heuristic is the number of elements in the list, and largely conforms to expected first principles:

- small sets are best encoded with a discrete list
- very large sets are best encoded with an inverted discrete list
- others with bitarray

This is augmented with a density clamp which controls for a very rough correlate of entropy, refining the
heuristic guess of how well `deflate` will work.

The actual cutoffs for both heuristics were validated empirically to work well across a wide range of
actual data.

Note that the computational cost of applying the heuristics also need to be traded against the
cost of various `deflate` compression levels. The current configuration (both heuristic thresholds
and deflate level) where evaluated empirically, and with the goal of keeping computational cost low.
