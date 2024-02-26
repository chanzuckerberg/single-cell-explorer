import * as globals from "../globals";

export const requestSpatialMetadata = () => async (dispatch: any) => {
  dispatch({ type: "request spatial metadata started" });

  try {
    if (!globals.API) throw new Error("API not set");
    const res = await fetch(
      `${globals.API.prefix}${globals.API.version}spatial/meta`
    );
    if (!res.ok || res.headers.get("Content-Type") !== "application/json") {
      return null;
    }
    const data = await res.json();
    return dispatch({
      type: "request spatial metadata success",
      data,
    });
  } catch (error) {
    return dispatch({
      type: "request spatial metadata error",
      error,
    });
  }
};
