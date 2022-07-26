/**
 * This module exports a subclass of Int32Array for
 * categorical data types. The subclass contains the
 * `codeMapping` dictionary which maps codes to values,
 * and a helper function `vat` that returns the value at
 * a particular index.
 */
import { CodeMapping } from "./code_mapping_interfaces";

export interface Cat32ArrayProps {
  codeMapping: CodeMapping;
  array: Int32Array;
}
export class CatInt32Array extends Int32Array {
  codeMapping: CodeMapping;

  constructor(props: Cat32ArrayProps) {
    const { codeMapping: codes, array } = props;
    super(array);
    this.codeMapping = codes;
  }

  vat = (index: number): string => this.codeMapping[this[index]] ?? "NaN";
}
