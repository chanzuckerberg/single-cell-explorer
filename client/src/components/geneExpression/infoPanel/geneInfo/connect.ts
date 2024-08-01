export function useConnect({ geneSynonyms }: { geneSynonyms: string[] }) {
  let synonymList;
  if (geneSynonyms.length > 1) {
    synonymList = geneSynonyms.join(", ");
  } else if (geneSynonyms.length === 1) {
    synonymList = geneSynonyms[0];
  } else {
    synonymList = null;
  }
  return { synonymList };
}
