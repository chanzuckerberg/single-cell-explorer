import { CodeMapping } from "./code_mapping_interfaces";

export interface Cat8ArrayProps {
  codeMapping: CodeMapping;
  array: Int8Array;
}
export class CatInt8Array extends Int8Array {
  codeMapping: CodeMapping;

  constructor(props: Cat8ArrayProps) {
    const { codeMapping: codes, array } = props;
    super(array);
    this.codeMapping = codes;
  }

  vat = (index: number): string | undefined => this.codeMapping[this[index]];
}
