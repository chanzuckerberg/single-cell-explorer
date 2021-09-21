const VERSION_ONES = ["1.0.0", "1.1.0"];
const VERSION_TWOS = ["2.0.0"];

export function checkValidVersion(corporaProps: any) {
  if (!corporaProps) return false;

  // eslint-disable-next-line @typescript-eslint/naming-convention -- prop from BE
  const { version, schema_version } = corporaProps;

  const isValidVersionOne = VERSION_ONES.includes(
    version?.corpora_schema_version
  );
  const isValidVersionTwo = VERSION_TWOS.includes(schema_version);

  return isValidVersionOne || isValidVersionTwo;
}
