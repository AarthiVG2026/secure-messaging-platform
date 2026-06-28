# Changelog

All notable changes to the Signal Clone project will be documented in this file.

## [v1.0.0] - 2026-06-28

### Features
- **Full-Stack Architecture:** Next.js frontend with FastAPI backend and SQLite WAL database.
- **Authentication:** Mock OTP and Session Persistence via JWT.
- **Contact Management:** Search and add contacts strictly by phone number. Added privacy controls preventing users from chatting with non-contacts.
- **Real-Time Messaging:** Socket.IO integration for instant message delivery without page reloads.
- **Delivery Receipts:** Sent, Delivered, and Read status indicators.
- **Typing Indicators:** Animated real-time typing awareness bubbles.
- **Group Chats:** Create groups, add/remove members, and promote/demote admins via the Group Info Drawer.
- **UI/UX:** Pixel-perfect Dark Theme inspired by Signal Desktop, complete with Framer Motion transitions.

### Bug Fixes
- **Input Focus Loss:** Resolved a critical React rendering issue in `AllModals.tsx` where typing in the Add Contact input caused the component to unmount and lose focus on every keystroke.
- **Message Sorting:** Fixed an issue where conversations were not correctly sorted by `updated_at`.
- **Duplicate Contacts:** Added strict backend validation to prevent adding the same contact multiple times or adding oneself.

### Known Issues
- Image/File attachments currently display placeholder UI and do not upload to a persistent CDN.
- SQLite database may wipe upon restart if deployed to ephemeral containers without a persistent disk mount.
- True End-to-End Encryption is visually simulated rather than cryptographically enforced.
