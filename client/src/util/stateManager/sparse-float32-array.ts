export interface SparseFloat32ArrayProps {
  array: Float32Array;
  locs: Int32Array;
  size: number;
}
export class SparseFloat32Array extends Float32Array {
  locs: Int32Array;

  length: number;

  constructor(props: SparseFloat32ArrayProps) {
    const { locs, size, array } = props;
    super(array);
    this.locs = locs;
    this.length = size;
  }
}
