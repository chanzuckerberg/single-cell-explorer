export interface SparseFloat64ArrayProps {
  array: Float64Array;
  locs: Int32Array;
  size: number;
}
export class SparseFloat64Array extends Float64Array {
  locs: Int32Array;

  length: number;

  constructor(props: SparseFloat64ArrayProps) {
    const { locs, size, array } = props;
    super(array);
    this.locs = locs;
    this.length = size;
  }
}
