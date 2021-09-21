export function checkValidVersion(corporaProps: any) {
  const isValidVersionOne =
    ["1.0.0", "1.1.0"].indexOf(corporaProps?.version?.corpora_schema_version) >
    -1;

  // For newer CXGs, the version can be found here
  const isValidVersionTwo =
    ["2.0.0"].indexOf(corporaProps?.schema_version) > -1;

  return isValidVersionOne || isValidVersionTwo;
}
