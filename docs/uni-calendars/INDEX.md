# University Academic Calendars — Index

Goal: move-in/out, breaks, graduation, and exam weeks for US universities and colleges. Drives demand shifts for businesses near campuses.

| Sub-API | Auth | Latency | Test file | Doc | Status |
|---|---|---|---|---|---|
| 25Live / CollegeNET | none | ~4 s (4 feeds, parallel) | `tests/uni-calendars/25live.js` | [25Live.md](25Live.md) | ✓ PASS |
| PredictHQ Events API | Bearer token (`PREDICTHQ_TOKEN`) | ~11 s (3 label queries, parallel) | `tests/uni-calendars/predicthq.js` | [PredictHQ.md](PredictHQ.md) | ✓ PASS |
