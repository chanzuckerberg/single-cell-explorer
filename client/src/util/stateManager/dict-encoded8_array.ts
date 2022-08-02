/**
 * This module exports a subclass of Int8Array for
 * categorical data types. The subclass contains the
 * `codeMapping` dictionary which maps codes to values,
 * and a helper function `vat` that returns the value at
 * a particular index.
 */
import { CodeMapping } from "./code_mapping_interfaces";

export interface DictEncoded8ArrayProps {
  codeMapping: CodeMapping;
  array: Int8Array;
}
export class DictEncoded8Array extends Int8Array {
  codeMapping: CodeMapping;

  codes: Int8Array;

  constructor(props: DictEncoded8ArrayProps) {
    const { codeMapping: codeMap, array } = props;
    super(array);
    this.codeMapping = codeMap;
    this.codes = array;
  }

  vat = (index: number): string => this.codeMapping[this[index]] ?? "NaN";
}
