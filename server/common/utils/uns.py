from typing import Dict, Optional, Tuple, TypedDict, Union

import numpy as np
from numpy.typing import NDArray


class ImageProperties(TypedDict):
    resolution: str
    crop_coords: Optional[Tuple[int, int, int, int]]
    width: int
    height: int


class Images(TypedDict):
    hires: NDArray[np.uint8]
    fullres: NDArray[np.uint8]


class Scalefactors(TypedDict):
    spot_diameter_fullres: float
    tissue_hires_scalef: float


class SpatialLibrary(TypedDict):
    image_properties: ImageProperties
    images: Images
    scalefactors: Scalefactors


Spatial = Dict[str, SpatialLibrary]


def spatial_metadata_get(spatial: Spatial) -> Dict[str, Union[int, float, str, Optional[Tuple[int, int, int, int]]]]:
    """
    Returns an object containing spatial metadata, including image width and image height.
    """
    try:
        library_id = next(iter(spatial))
        image_properties = spatial[library_id]["image_properties"]
        resolution = image_properties["resolution"]
        scalefactors = spatial[library_id]["scalefactors"]

        scaleref = 1 if resolution == "fullres" else scalefactors["tissue_hires_scalef"]
        h, w = image_properties["height"], image_properties["width"]
        spot_diameter_fullres = scalefactors["spot_diameter_fullres"]
        crop_coords = image_properties.get("crop_coords")

    except KeyError as e:
        raise Exception(f"Spatial information does not contain requested resolution '{resolution}'") from e

    return {
        "image_width": w,
        "image_height": h,
        "resolution": resolution,
        "scaleref": scaleref,
        "spot_diameter_fullres": spot_diameter_fullres,
        "crop_coords": crop_coords,
    }
