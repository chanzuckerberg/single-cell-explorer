/**
 * (#337, alec): I ran into circular dependencies issues so
 * I am temporarily exporting these interfaces in a separate file.
 */
export interface CodeMapping {
  [key: number]: string;
}
export interface InvCodeMapping {
  [key: string]: number;
}
