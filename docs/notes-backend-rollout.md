# EchoNote Notes Backend Rollout

> Status: transitional experiment, no longer the recommended primary path for core notes data.
>
> The current recommended direction is documented in:
> - [ADR-001 data and backend architecture](/Users/owenfff/EchoNote/docs/adr-001-data-and-backend-architecture.md)
> - [Supabase setup](/Users/owenfff/EchoNote/docs/supabase-setup.md)

## What was added

- PostgreSQL connection layer in `backend/db/index.js`
- Initial schema in `backend/db/schema.sql`
- Single-user notes CRUD endpoints in `backend/server.js`
- Example env file in `backend/.env.example`

## Current API

- `GET /api/notes`
- `GET /api/notes/:id`
- `POST /api/notes`
- `PATCH /api/notes/:id`
- `DELETE /api/notes/:id`

Response shape is aligned with the mobile `Note` type:

```json
{
  "note": {
    "id": "note_123",
    "title": "Example",
    "content": "Body",
    "type": "text",
    "sourceUrl": "https://example.com",
    "snapshotHtml": "<article>...</article>",
    "createdAt": "2026-03-17T10:00:00.000Z",
    "updatedAt": "2026-03-17T10:00:00.000Z",
    "tags": ["收藏", "已读"],
    "todos": [],
    "emoji": "📝"
  }
}
```

## Suggested next steps

1. Provision a Postgres database.
2. Apply `backend/db/schema.sql`.
3. Set `DATABASE_URL` in the backend environment.
4. Start writing notes from mobile to `/api/notes`.
5. Keep `AsyncStorage` as a temporary offline cache only.

## Mobile migration strategy

1. Add a remote notes service in `mobile/src/services`.
2. Update `mobile/src/store/noteStore.ts` to:
   - fetch from `/api/notes`
   - write mutations to the backend
   - cache the last successful payload locally
3. Remove the `MOCK_NOTES_200` seed once remote fetch is stable.

## What this does not solve yet

- Authentication / multi-user isolation
- Conflict resolution
- AI proxying
- Cloud deployment
- Data migration for existing local notes
