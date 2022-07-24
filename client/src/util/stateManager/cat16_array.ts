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
