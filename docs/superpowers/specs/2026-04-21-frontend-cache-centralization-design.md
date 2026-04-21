# Frontend Cache Centralization Design (Client App)

## Problem

Caching behavior in the client frontend is currently spread across multiple reducers and screens. Direct `localStorage` and `sessionStorage` access appears in several files, which makes cache behavior harder to reason about and document consistently.

## Scope

In scope:

- Client frontend only (`client/`)
- Centralization of course-related caching access
- Preserve current persistence behavior:
  - `AllCourses` remains `sessionStorage` scoped
  - `LocalCourses` remains `localStorage` scoped
- Add explicit cache documentation at `docs/frontend-caching.md`

Out of scope:

- Admin frontend changes
- Backend/server caching changes
- Auth token persistence changes (`profile` in API interceptors)

## Chosen Approach

Implement a single cache service module as the storage boundary for all course cache operations.

Recommended and approved approach:

1. Create `client/src/utils/frontendCache.js`
2. Move all course-cache storage reads/writes/clear operations behind this module
3. Replace direct storage usage in existing callsites with service calls
4. Keep behavior unchanged while reducing storage logic duplication

## Architecture

### New Cache Service

`client/src/utils/frontendCache.js` will provide:

- `readAllCoursesCache()`  
  Read and sanitize `AllCourses` from `sessionStorage`
- `writeAllCoursesCache(courses)`  
  Sanitize and persist `AllCourses` to `sessionStorage`
- `clearAllCoursesCache()`
- `readLocalCoursesCache()`  
  Read and sanitize `LocalCourses` from `localStorage`
- `writeLocalCoursesCache(courses)`  
  Sanitize and persist `LocalCourses` to `localStorage`
- `upsertLocalCourseCache(course)`  
  Add one course if not present by normalized course code
- `clearLocalCoursesCache()`
- `migrateLegacyLocalCoursesFromSession()`  
  Move any legacy `LocalCourses` from `sessionStorage` into `localStorage` and sanitize

Sanitization utilities from existing code will be reused:

- `sanitizeCourseCache` / `findCachedCourse` / `hasUsableCourseTree` from `courseCache.js`

For local-course specific sanitization, service-level normalization will dedupe by course code while preserving existing data shape.

## Files to Update

- `client/src/App.jsx`  
  Replace startup migration/parsing logic with cache service migration/read calls
- `client/src/reducers/filebrowser_reducer.js`  
  Replace direct `sessionStorage` write with `writeAllCoursesCache`
- `client/src/reducers/user_reducer.js`  
  Replace direct `localStorage` read/write/remove with local cache service methods
- `client/src/screens/browse/index.jsx`  
  Replace direct reads/writes/clear of `AllCourses` with cache service
- `client/src/screens/browse/components/collapsible/index.jsx`  
  Replace direct fallback read of `AllCourses` with cache service read
- `client/src/screens/dashboard/index.jsx`  
  Replace direct `AllCourses` bootstrap read and `LocalCourses` session clear with cache service
- `client/src/screens/landing/index.jsx`  
  Replace `LocalCourses` session clear with cache migration/clear helper

## Data Flow

1. Bootstrapping:
   - App runs local course migration helper
   - App loads sanitized local courses through cache service
2. Course tree browsing:
   - Browse screen loads sanitized `AllCourses` cache once
   - Reducer writes updated `AllCourses` through centralized cache writer
   - Components read cached courses via service fallback only
3. Local course additions:
   - User reducer writes local additions via centralized local cache upsert

## Error Handling

- Cache service handles parse errors per key:
  - Clear only the affected key
  - Return safe empty result (`[]`/`null` as appropriate)
- No broad swallow in callsites; callsites rely on explicit service return contracts
- Existing behavior remains user-safe and non-breaking

## Testing and Validation

Validation target:

- No direct `localStorage` / `sessionStorage` access remains in course-caching callsites
- Existing user flows preserved:
  - Browse cache load
  - Course switch fallback
  - Local course persistence and startup load

Project checks:

- Build `client` and `admin` frontends with existing scripts

## Documentation Plan

Create `docs/frontend-caching.md` with:

- Cache keys and exact payload shapes (`AllCourses`, `LocalCourses`)
- Lifetime and storage medium per key
- New cache service function index (what each function does)
- Callsite map (which file uses which function)
- Notes on what is *not* treated as cache (e.g., auth profile token)
