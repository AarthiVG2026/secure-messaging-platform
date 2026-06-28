# Testing Guide

This guide details how to thoroughly test the functionality of the Signal Clone manually.

## 🧪 Functional Testing Overview

Testing this application requires at least **two browser windows** (or two different browsers/incognito mode) side-by-side to verify real-time WebSocket events.

---

## 🔐 1. Authentication Testing

1. **Register a new user:**
   - Attempt to register with a username shorter than 3 characters (Should fail).
   - Attempt to register without a phone number (Should fail).
   - Register valid details. Ensure the OTP prompt appears.
   - Enter invalid OTP (e.g., `000000`) (Should fail).
   - Enter `123456`. You should be routed to the home screen.
2. **Login an existing user:**
   - Use username `amit` and password `password123`.
   - Ensure OTP step prompts for `123456`.
   - Verify that logging out successfully destroys the session and redirects to the login page.
3. **Session Persistence:**
   - Refresh the page while logged in. You should remain logged in without flickering to the login screen.

---

## 📇 2. Contact Testing

1. **Empty State:**
   - Register a fresh user. Ensure the screen says "Welcome to Signal" with an empty state, instead of "No chats found".
2. **Adding a Contact:**
   - Try to add a phone number that doesn't exist. Ensure the exact error "No Signal user found with this phone number" appears.
   - Try to add a valid user (e.g., `+91 9000000001`). Ensure "Contact added successfully" appears.
   - Try to add the same number again. Ensure "This contact already exists" appears.
3. **Demo Import:**
   - Click "Import Demo Contacts" from the empty state. Ensure Amit, Priya, Kevin, Divya, and Rahul are added to your address book immediately.

---

## 💬 3. Messaging & WebSocket Testing

*Prerequisite: Open Window A (logged in as User 1) and Window B (logged in as User 2).*

1. **Create Chat:**
   - In Window A, click "New Chat" and select User 2.
   - Ensure the chat opens instantly.
2. **Sending Messages (Real-time):**
   - Type a message in Window A and hit send.
   - Verify it appears instantly in Window A with a single gray tick (Sent).
   - Verify it appears instantly in Window B.
3. **Delivery Receipts:**
   - The moment Window B receives it (even if they are on a different chat), Window A's tick mark should change to a double gray tick (Delivered).
4. **Read Receipts:**
   - In Window B, click into the chat with User A.
   - Window A's tick mark should change to a double blue tick (Read).
5. **Typing Indicators:**
   - In Window A, start typing.
   - In Window B, a typing bubble should appear above the input area.
   - Stop typing in Window A for 2 seconds. The bubble in Window B should disappear.

---

## 👥 4. Group Testing

1. **Creation:**
   - Create a group. Ensure you can only select from your added contacts.
   - Verify the group immediately appears in the conversation list for all selected members.
2. **Admin Controls:**
   - Open the group Info Drawer (Right Drawer).
   - As the creator, try promoting another user to Admin.
   - Try demoting them back.
   - Try removing a user. Ensure they disappear from the member list.
3. **Group Messaging:**
   - Send a message to the group.
   - Verify that Read Receipts only turn blue when *all* members of the group have read the message. (Note: Group delivery receipt logic requires all members to report delivery/read).

---

## 🎨 5. UI & Responsive Testing

1. **Responsiveness:**
   - Resize the browser window to mobile width (<1024px).
   - Ensure the Sidebar takes up 100% of the screen.
   - Click a chat. Ensure the Sidebar hides and the Chat Area takes up 100% of the screen.
   - Use the "Back" arrow in the Chat Header to return to the Sidebar.
2. **Theme Toggling:**
   - Open Settings > Appearance.
   - Toggle between Light and Dark mode. Ensure text colors remain accessible and background colors switch accurately.
3. **Edge Cases:**
   - Test sending a very long message with no spaces. Ensure `break-words` CSS prevents it from overflowing the chat bubble.
   - Scroll up in a long chat history to trigger infinite scrolling (if implemented) or ensure the layout doesn't break.
