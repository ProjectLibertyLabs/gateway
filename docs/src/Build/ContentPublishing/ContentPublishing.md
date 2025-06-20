# Content Publishing Service

The Content Publishing Service allows users to create, post, and manage content on the Frequency network. It supports various content types such as text, images, and videos.

## API Reference

- [REST API](./Api.md) (<a target="_blank" href="https://projectlibertylabs.github.io/gateway/content-publishing">Full docs</a>)

## Configuration

{{#include ../../../../developer-docs/content-publishing/ENVIRONMENT.md:2:}}

## Best Practices

- **Metadata Management**: Always ensure metadata is correctly associated with content to maintain data integrity.
- **Content Validation**: Validate content to prevent the submission of inappropriate or harmful material.
- **Batch Processing**: When uploading multiple files, use the batch announcement endpoint (v3/content/batchAnnouncement) for better performance and efficiency.
  - Ensure schema IDs match the number of files being uploaded
  - Keep file sizes within the configured limits (see FILE_UPLOAD_MAX_SIZE_IN_BYTES)
  - Monitor the batch processing status using the provided reference IDs
