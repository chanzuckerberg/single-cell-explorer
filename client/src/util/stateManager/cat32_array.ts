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
