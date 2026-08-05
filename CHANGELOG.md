# Changelog

## 0.1.0

Initial release.

- **Cavuno** node: Job (Create, Get, Get Many, Update, Delete, Publish,
  Expire), Company (Create, Find or Create, Get, Get Many, Update, Delete),
  Candidate (Get, Get Many, Delete), Marketing Permission (Get Many,
  Withdraw).
- **Cavuno Trigger** node: subscribes to the eleven Cavuno webhook events
  with Standard Webhooks signature verification (HMAC-SHA256, five-minute
  timestamp tolerance).
- **Cavuno API** credential: per-board base URL + `cavuno_live_` API key.
