# Spatial Mode Deep Zoom Feature

The Deep Zoom feature in CELLxGENE Explorer enhances the spatial exploration of datasets by allowing users to zoom in and out of high-resolution images smoothly. This functionality is critical for detailed examination of spatial data, such as those from Slide-seq V2 or Visium, providing fine-grained insight into tissue samples and cellular interactions.

It is built on the OpenSeadragon (OSD) JavaScript library, integrated into the Explorer’s frontend to deliver a responsive zooming experience. The backend handles the generation and storage of deep zoom image tiles, making it efficient to load and view high-resolution spatial data across environments (dev, staging, prod).

## Frontend Integration (Explorer FE)

- [OpenSeadragon (OSD)](https://openseadragon.github.io/): The OSD library is imported into the frontend to handle interactive zoom and pan operations. OSD dynamically loads image tiles based on the user’s zoom level and position.
- Zoom & Pan Synchronization: Zooming and panning are kept in sync with spatial layers (e.g., dot layers) in the Explorer to ensure smooth interaction across different dataset views.
- Dynamic Resource Loading: URLs for the image tiles are generated based on the current environment (local, dev, staging, prod), ensuring the correct assets are fetched dynamically.

## Backend Image Processing & Storage

- CXG Conversion Script: The backend uses a CXG conversion pipeline to process high-resolution spatial images and generate the necessary image tiles and manifest files (DZI format) for deep zoom.
- Storage on S3: The generated deep zoom assets (tiles and DZI files) are uploaded to a dedicated Amazon S3 bucket (spatial-deep-zoom). Each dataset has its own folder in the bucket (e.g., spatial-deep-zoom/{DATASET_VERSION_ID}).

## Content Delivery

- AWS CloudFront: CloudFront is used to cache and deliver deep zoom assets, improving performance by serving assets from the nearest available server to the user. This minimizes latency, ensuring a smooth experience during zooming and panning.

## Validation & Testing

- Frontend Tests: Screenshot testing ensures correct tile rendering across different zoom levels. Functional testing verifies that image export, toggle, and panning features work seamlessly.
- Backend Tests: Ensure that the CXG conversion process correctly generates deep zoom tiles, uploads them to S3, and that CloudFront caches the assets properly.

### Resources and Links
[Spatial Mode Deep Zooming Tech Spec Design Doc](https://docs.google.com/document/d/1Jp5ePtAk6uXYZjY8XVkdfr0jf1IG0MJj8H_clPuRdFY)
[CELLxGENE Platform Technical Overview](https://docs.google.com/document/d/19IZbojtc7eofV75NnL5C6fCgBJB13KIswWNOn12xAa0)

