# Changelog

## 0.1.3

- **Fully Remote** added to Job Create and Update: one toggle publishes a role
  open to candidates anywhere.
- **External ID** can now be changed on Job Update, not only set on Create.
- Job Create and Update explain that every job needs a company, and reject
  Company ID and Company Name together before the request is sent.
- Publish and Expire now send the body the API expects, instead of failing on
  an empty request.
- Expires At accepts a date expression as well as the date picker, and clears
  an expiry when left empty on an update.
- The trigger re-subscribes when you change the selected events, and revives a
  subscription Cavuno paused after repeated delivery failures — previously the
  workflow stayed active while receiving nothing.
- A subscription is no longer recreated when the check that verifies it fails
  temporarily, which could leave a duplicate delivering to a lost secret.

## 0.1.2

- Trigger error messages now surface the API's own explanation, with a hint
  about the public HTTPS webhook requirement for self-hosted instances.
- The trigger retires its old webhook endpoint when the instance URL changes
  instead of leaving it behind.
- `usableAsTool` set on both nodes for the community-package scanner.

## 0.1.1

- First published release (publishing pipeline fixes).

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
