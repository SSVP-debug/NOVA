# CI patch: run checks on every push

New file:
- .github/workflows/check.yml   runs `npm ci`, `npm run check`, `npm run build` on every push to main and every pull request

Unzip over the project root, commit, and push. Then open the "Actions" tab on GitHub.
No other files change. You can delete this note after applying.
