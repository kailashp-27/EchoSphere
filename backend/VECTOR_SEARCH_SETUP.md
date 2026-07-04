# MongoDB Atlas Vector Search Setup

This guide provides the exact configuration required to create a Vector Search Index on your `documents` collection in MongoDB Atlas.

## Instructions

1. Log into your [MongoDB Atlas Dashboard](https://cloud.mongodb.com/).
2. Navigate to your Cluster and click on the **Atlas Search** tab.
3. Click **Create Search Index**.
4. Choose the **JSON Editor** option.
5. Select your Database (`echosphere` by default) and Collection (`documents`).
6. Give your index a name (e.g., `vector_index`).
7. Paste the following JSON configuration into the editor:

```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embedding": {
        "dimensions": 1536,
        "similarity": "cosine",
        "type": "knnVector"
      }
    }
  }
}
```

8. Click **Next** and then **Create Search Index**.
9. Wait for the index to finish building (it usually takes a few moments).

Once completed, your application can perform semantic vector searches via `$vectorSearch` aggregations targeting the `embedding` field!