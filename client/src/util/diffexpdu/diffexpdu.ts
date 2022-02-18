import { PduBuffer } from "./pdubuffer";
import { packPostingsLists, unpackPostingsLists } from "./postingslist";

/*
format is documented in dev_docs/diffexpdu.md
*/

export enum DiffExMode {
  TopN = 0,
  VarFilter = 1,
}

export interface DiffExArguments {
  mode: DiffExMode;
  params: {
    N: number;
  };
  set1: Uint32Array;
  set2: Uint32Array;
}

export function packDiffExPdu(args: DiffExArguments): Uint8Array {
  if (args.mode !== DiffExMode.TopN)
    throw new Error("Modes other than TopN are unsupported.");
  if (args.set1.length === 0 || args.set2.length === 0)
    throw new Error("Cell sets must be nonzero length");

  const pdu = new PduBuffer(1024);

  // diffex header
  packDiffExHeader(pdu, args.mode, args.params.N);

  // cell set 1 and 2
  packPostingsLists(pdu, [args.set1, args.set2], true);

  return pdu.asUint8Array();
}

function packDiffExHeader(pdu: PduBuffer, mode: number, N: number): void {
  pdu.addUint8(mode); // 0:1 - mode
  pdu.addUint8(0); // 1:2 - unused
  pdu.addUint16(N); // 2:4 - N
}

export function unpackDiffExPdu(buf: Uint8Array): DiffExArguments {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const { mode, N } = unpackDiffExHeader(dv);
  const [set1, set2] = unpackPostingsLists(buf.subarray(4));
  return {
    mode,
    params: {
      N,
    },
    set1,
    set2,
  };
}

function unpackDiffExHeader(dv: DataView): { mode: number; N: number } {
  const mode = dv.getUint8(0);
  const N = dv.getUint16(2, true);
  return { mode, N };
}
