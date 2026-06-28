# Security & Privacy

This document outlines the security architecture, assumptions, and known limitations of the Signal Clone demonstration project.

> ⚠️ **IMPORTANT WARNING:** This project is a clone built for educational and demonstration purposes. It does not possess the rigorous cryptographic guarantees of the actual Signal Protocol. Do not use this codebase for transmitting sensitive or real-world private data.

---

## 🔒 Implemented Security Features

### 1. Password Hashing
All user passwords are mathematically hashed before being stored in the SQLite database.
- **Algorithm:** `bcrypt`
- **Work Factor:** Automatically tuned by Passlib.
- **Verification:** Plain text passwords are never stored or logged. They are verified against the hash in memory during login.

### 2. Session Handling
The application uses stateless JSON Web Tokens (JWT) for authentication.
- **Access Tokens:** Short-lived tokens used for standard API authentication.
- **Signatures:** Tokens are signed using the `HS256` algorithm with a secret key (`SECRET_KEY` environment variable).
- **Socket Authentication:** WebSocket connections require the JWT to be passed in the initial handshake payload to prevent unauthorized socket subscriptions.

### 3. Input Validation & SQL Injection Prevention
- **Pydantic Validation:** All incoming REST payloads are strictly validated against Pydantic schemas. Unexpected fields are stripped, and invalid types return a `422 Unprocessable Entity` before reaching application logic.
- **SQLAlchemy ORM:** All database interactions utilize SQLAlchemy's parameter binding, effectively neutralizing SQL injection attack vectors.

---

## 🎭 Mocked Features & Limitations

### 1. Mock Authentication
To allow recruiters and engineers to evaluate the application without setting up Twilio or burning SMS credits, the 2FA flow is entirely mocked.
- **Mock OTP:** The application hardcodes `123456` as the only valid OTP.
- **No Rate Limiting:** There is no rate limiting on OTP attempts in this demo.

### 2. Simulated End-to-End Encryption
True E2E encryption requires complex client-side key generation (e.g., using the WebCrypto API), public key distribution via a central server, and the Double Ratchet algorithm.
- **Current State:** Messages are sent as plain JSON over HTTPS/WSS.
- **Simulation:** The UI displays a "Decrypted Locally" padlock to mimic the aesthetic of Signal, but the server *does* store messages in plain text in the SQLite database.

### 3. Database Security
- **SQLite:** SQLite stores data in a local file (`signal.db`). While perfectly secure in a properly configured container, it does not support advanced row-level security or network-level firewalling inherent to standalone databases like PostgreSQL.

---

## 🚀 Future Security Improvements

To upgrade this clone into a production-ready secure messenger, the following steps must be taken:

1. **Implement the Signal Protocol:**
   - Integrate `libsignal-protocol-javascript` on the client.
   - Set up PreKey generation on registration.
   - Have the FastAPI server act strictly as an encrypted payload relay rather than storing plain text.
2. **Real SMS Verification:**
   - Integrate Twilio Verify or AWS SNS for actual SMS OTP delivery.
3. **Rate Limiting:**
   - Add Redis-backed rate limiting using `slowapi` to prevent brute-forcing of the login and registration endpoints.
4. **Content Security Policy (CSP):**
   - Implement strict CSP headers in Next.js to prevent XSS attacks.
