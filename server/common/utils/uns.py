import base64
import io

import numpy as np
from PIL import Image

from server.common.constants import SPATIAL_IMAGE_DEFAULT_RES

import pyvips


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
    Returns an object containing spatial metadata, including image width and image height.
    """
    resolution = SPATIAL_IMAGE_DEFAULT_RES

    try:
        library_id = list(spatial.keys())[0]
        image_array = spatial[library_id]["images"][resolution]
    except KeyError as e:
        raise Exception(f"spatial information does not contain requested resolution '{resolution}'") from e

    # Convert the image to a uint8 numpy array scaled to 0-255
    image_array_uint8 = np.uint8(image_array * 255)

    # Convert the numpy array to a PIL Image
    image_pil = Image.fromarray(image_array_uint8)

    # Crop the image using a predefined crop_box function
    image_pil = image_pil.crop(crop_box(image_pil.size))

    # Save the cropped PIL image to a BytesIO stream in WEBP format
    response_image = io.BytesIO()
    image_pil.save(response_image, format="WEBP", quality=90)
    image_str = base64.b64encode(response_image.getvalue()).decode()

    # Preparing data for pyvips from the cropped numpy array

    # NOTE: Flip the image vertically, since somehow the client flips the image
    image_pil = image_pil.transpose(Image.FLIP_TOP_BOTTOM)

    # Convert the flipped PIL Image back to a numpy array
    flipped_array_uint8 = np.array(image_pil)

    h, w, bands = flipped_array_uint8.shape
    linear = flipped_array_uint8.reshape(w * h * bands)
    vipsImage = pyvips.Image.new_from_memory(linear.data, w, h, bands, "uchar")

    # Save as Deep Zoom Image (this will create a directory with tiles and a .dzi file)
    vipsImage.dzsave("./server/common/web/static/deep_zoom/spatial", suffix=".jpeg")

    h = w = min(h, w)  # Adjust for 1:1 aspect ratio

    spatial_metadata = {
        "spatial": {
            "imageWidth": w,
            "imageHeight": h,
            "libraryId": library_id,
            "image": image_str,
        }
    }

    return spatial_metadata
