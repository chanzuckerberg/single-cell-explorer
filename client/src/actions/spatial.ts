import * as globals from "../globals";

export const requestSpatialMetadata = () => async (dispatch: any) => {
  dispatch({ type: "request spatial metadata started" });

  try {
    if (!globals.API) throw new Error("API not set");
    console.log("requestSpatialMetadata", globals.API);

    const res = await fetch(
      `${globals.API.prefix}${globals.API.version}spatial/meta`,
      {
        method: "GET",
        headers: new Headers({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
        credentials: "include",
      }
    );
    console.log(res);

    if (!res.ok || res.headers.get("Content-Type") !== "application/json") {
      return null; // TODO need a dispatch //dispatchDiffExpErrors(dispatch, res);
    }

    const response = await res.json();

    /* then send the success case action through */
    return dispatch({
      type: "request spatial metadata success",
      data: response,
    });
  } catch (error) {
    return dispatch({
      type: "request spatial metadata error",
      error,
    });
  }
};
