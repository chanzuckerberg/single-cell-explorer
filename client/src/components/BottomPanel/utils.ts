export const formatSelectedGene = (rawSelectedGene: string) => {
  const parts = rawSelectedGene.split("_");
  return parts.length <= 1 ? rawSelectedGene : parts.slice(0, -1).join("_");
};
