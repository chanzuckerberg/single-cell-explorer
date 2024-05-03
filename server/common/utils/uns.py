import base64
import io

import numpy as np
from PIL import Image

from server.common.constants import SPATIAL_IMAGE_DEFAULT_RES


def crop_box(image_size):  # type: ignore
    """
    Calculate the cropping box for a 1:1 aspect ratio for spatial images
    """
    width, height = image_size

    # The new dimensions will be the smaller of the width or height
    new_dimension = min(width, height)

    # Calculate the cropping box
    left = (width - new_dimension) / 2
    upper = (height - new_dimension) / 2
    right = (width + new_dimension) / 2
    lower = (height + new_dimension) / 2

    return (left, upper, right, lower)


def spatial_metadata_get(spatial):  # type: ignore
    """
    Returns an object containing spatial metadata, including image width and image height
    """
    resolution = SPATIAL_IMAGE_DEFAULT_RES

    try:
        library_id = list(spatial.keys())[0]
        image_array = spatial[library_id]["images"][resolution]
    except KeyError as e:
        raise Exception(f"spatial information does not contain requested resolution '{resolution}'") from e

    response_image = io.BytesIO()

    image = Image.fromarray(np.uint8(image_array * 255))
    image = image.crop(crop_box(image.size))  # type: ignore
    image.save(response_image, format="WEBP", quality=90)

    image_str = base64.b64encode(response_image.getvalue()).decode()

    (h, w, _) = image_array.shape
    h = w = min(h, w)  # adjust for 1:1 aspect ratio

    spatial_metadata = {
        "spatial": {
            "imageWidth": h,
            "imageHeight": w,
            "libraryId": library_id,
            "image": image_str,
        }
    }

    return spatial_metadata
