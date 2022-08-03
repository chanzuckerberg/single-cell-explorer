/**
 * This module exports a subclass of Int32Array for
 * categorical data types. The subclass contains the
 * `codeMapping` dictionary which maps codes to values,
 * and a helper function `vat` that returns the value at
 * a particular index.
 */
import { CodeMapping } from "./code_mapping_interfaces";

export interface DictEncoded32ArrayProps {
  codeMapping: CodeMapping;
  array: Int32Array;
}
export class DictEncoded32Array extends Int32Array {
  codeMapping: CodeMapping;

  constructor(props: DictEncoded32ArrayProps) {
    const { codeMapping: codeMap, array } = props;
    super(array);
    this.codeMapping = codeMap;
  }

  vat = (index: number): string => this.codeMapping[this[index]] ?? "NaN";
}
