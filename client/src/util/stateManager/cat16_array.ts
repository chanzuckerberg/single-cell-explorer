/**
 * This module exports a subclass of Int16Array for
 * categorical data types. The subclass contains the
 * `codeMapping` dictionary which maps codes to values,
 * and a helper function `vat` that returns the value at
 * a particular index.
 */
import { CodeMapping } from "./code_mapping_interfaces";

export interface Cat16ArrayProps {
  codeMapping: CodeMapping;
  array: Int16Array;
}
export class CatInt16Array extends Int16Array {
  codeMapping: CodeMapping;

  constructor(props: Cat16ArrayProps) {
    const { codeMapping: codes, array } = props;
    super(array);
    this.codeMapping = codes;
  }

  vat = (index: number): string => this.codeMapping[this[index]] ?? "NaN";
}
