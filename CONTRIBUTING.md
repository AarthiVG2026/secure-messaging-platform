# Contributing to Signal Clone

First off, thank you for considering contributing to the Signal Clone project! It's people like you that make the open-source community such an amazing place to learn, inspire, and create.

## 🤝 How Can I Contribute?

### 1. Reporting Bugs
If you find a bug, please open an issue. Provide as much information as possible:
- A clear, descriptive title.
- Exact steps to reproduce the issue.
- The expected behavior vs. the actual behavior.
- Screenshots or console logs if applicable.

### 2. Suggesting Enhancements
Have an idea to make the application better? We'd love to hear it!
- Check if a similar feature request already exists.
- Open a new issue outlining the feature, why it's needed, and how it should work.

### 3. Pull Requests
We actively welcome your pull requests.

1. **Fork the repo** and create your branch from `main`.
   ```bash
   git checkout -b feature/amazing-feature
   ```
2. **Setup your environment** (See README.md for instructions).
3. **Write clean code.** Follow the existing style guides.
   - Frontend: Prettier and ESLint configurations are provided. Use functional components and hooks.
   - Backend: Follow PEP 8 guidelines. Ensure Pydantic schemas strictly type your inputs/outputs.
4. **Test your code.** Make sure you haven't broken any existing WebSocket flows or REST APIs.
5. **Commit your changes** using semantic commit messages:
   - `feat: Add awesome new feature`
   - `fix: Resolve WebSocket disconnect issue`
   - `docs: Update API documentation`
6. **Push to your fork** and submit a Pull Request to the `main` branch.

## 👩‍💻 Development Guidelines

### Frontend
- All new UI components should use TailwindCSS.
- Use `lucide-react` for any new icons.
- Avoid introducing new global state unless absolutely necessary; rely on React Query for caching server state.

### Backend
- All new database models must inherit from `Base` in `app/db/session.py`.
- Ensure you generate an Alembic migration if you change the database schema (if configured), or update `seed_db.py`.
- Do not put SQL queries in routers. Use the repository pattern in `app/repositories/`.

## 📜 Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in your communication.
