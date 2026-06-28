# API Documentation

The Signal Clone backend exposes a RESTful JSON API for persistent state and a Socket.IO WebSocket interface for real-time ephemeral events.

## 🔐 Authentication

All authenticated REST endpoints require a Bearer token in the Authorization header.
`Authorization: Bearer <access_token>`

---

## 📡 REST Endpoints

### Auth Endpoints

#### 1. Register User
- **Method:** `POST`
- **Endpoint:** `/api/auth/register`
- **Auth Required:** No
- **Request Body:**
```json
{
  "phone": "+1234567890",
  "username": "johndoe",
  "display_name": "John Doe",
  "password": "password123",
  "otp": "123456"
}
```
- **Response (200 OK):**
```json
{
  "access_token": "jwt_token",
  "refresh_token": "jwt_token",
  "user": { "id": "uuid", "username": "johndoe", ... }
}
```
- **Error Responses:** `400 Bad Request` (Phone/Username taken, Invalid OTP)

#### 2. Login User
- **Method:** `POST`
- **Endpoint:** `/api/auth/login`
- **Auth Required:** No
- **Request Body:**
```json
{
  "identifier": "+1234567890",
  "password": "password123",
  "otp": "123456"
}
```
- **Response (200 OK):** Auth object with tokens.

---

### Contacts Endpoints

#### 1. Get Contacts
- **Method:** `GET`
- **Endpoint:** `/api/contacts`
- **Auth Required:** Yes
- **Response (200 OK):**
```json
[
  {
    "id": "uuid",
    "nickname": "John",
    "contact_user": { "id": "uuid", "display_name": "John Doe", "phone": "..." }
  }
]
```

#### 2. Add Contact
- **Method:** `POST`
- **Endpoint:** `/api/contacts`
- **Auth Required:** Yes
- **Request Body:**
```json
{
  "identifier": "+1234567890",
  "nickname": "Work Colleague"
}
```
- **Response (200 OK):** Contact object.
- **Error Responses:** `404 Not Found` (No Signal user found with this phone number). `400 Bad Request` (Contact already exists).

---

### Conversations & Groups Endpoints

#### 1. Get All Conversations
- **Method:** `GET`
- **Endpoint:** `/api/conversations`
- **Auth Required:** Yes
- **Response (200 OK):** Array of Conversation objects sorted by `updated_at`.

#### 2. Start Direct Message
- **Method:** `POST`
- **Endpoint:** `/api/conversations/direct`
- **Auth Required:** Yes
- **Request Body:**
```json
{
  "recipient_id": "uuid"
}
```
- **Response (200 OK):** Conversation object.

#### 3. Create Group
- **Method:** `POST`
- **Endpoint:** `/api/conversations/group`
- **Auth Required:** Yes
- **Request Body:**
```json
{
  "name": "Weekend Plans",
  "description": "Hiking this saturday",
  "member_ids": ["uuid1", "uuid2"]
}
```
- **Response (200 OK):** Conversation object.

---

### Messages Endpoints

#### 1. Get Messages
- **Method:** `GET`
- **Endpoint:** `/api/conversations/{conversation_id}/messages?limit=50&offset=0`
- **Auth Required:** Yes
- **Response (200 OK):** Array of Message objects including sender details and statuses.

#### 2. Send Message (REST Fallback)
- **Method:** `POST`
- **Endpoint:** `/api/messages`
- **Auth Required:** Yes
- **Request Body:**
```json
{
  "conversation_id": "uuid",
  "text": "Hello World",
  "message_type": "text"
}
```
- **Response (200 OK):** Message object.

---

## ⚡ WebSocket Events (Socket.IO)

Clients must connect to the Socket.IO server at `/` with their JWT token passed in the `auth` payload.

### Connection
- `connect`: Emitted when connection is established. Client must send `{"token": "..."}`.
- `disconnect`: Emitted on disconnect. Backend automatically broadcasts `user_offline`.

### Client -> Server Events (Emitting)
1. **`send_message`**: Sends a new message to a conversation. Server saves to DB and broadcasts `receive_message`.
2. **`typing`**: `{ conversation_id: "uuid" }`. Broadcasts typing indicator to others in the room.
3. **`read_receipt`**: `{ message_id: "uuid" }`. Marks a message as read in DB and broadcasts.
4. **`delivery_receipt`**: `{ message_id: "uuid" }`. Marks a message as delivered.

### Server -> Client Events (Listening)
1. **`receive_message`**: Fired when a new message is posted in an active conversation.
2. **`typing`**: `{ conversation_id: "uuid", user_id: "uuid" }`. Show typing bubble in UI.
3. **`read_receipt` / `delivery_receipt`**: Updates message tick marks in UI.
4. **`group_created` / `group_updated`**: Refreshes sidebar when group metadata or members change.
5. **`user_online` / `user_offline`**: Updates presence indicators.
