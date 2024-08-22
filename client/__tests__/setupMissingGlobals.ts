/*
Define globals which are present in the client, but not in node (and therefore not in
the jest test environment).
*/

import { TextDecoder, TextEncoder } from "util";

import { ReadableStream } from "node:stream/web";

// @ts-expect-error ts-migrate(2322) FIXME: Type 'typeof TextDecoder' is not assignable to typ... Remove this comment to see the full error message
global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;
// @ts-expect-error ts-migrate(2322) FIXME: Type 'typeof ReadableStream' is not assignable to typ... Remove this comment to see the full error message
global.ReadableStream = ReadableStream;
