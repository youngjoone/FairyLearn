#!/usr/bin/env bash
set -euo pipefail

echo "[cleanup] Removing heavy artifacts..."

rm -rf frontend/node_modules
rm -rf frontend/.next frontend/.nuxt frontend/.turbo frontend/.vite frontend/dist frontend/out frontend/coverage frontend/.eslintcache

rm -rf backend/build backend/out backend/target backend/.gradle

rm -rf ai-python/.venv ai-python/venv ai-python/__pycache__ ai-python/.pytest_cache ai-python/.mypy_cache ai-python/.ruff_cache

find . -name "__pycache__" -type d -prune -exec rm -rf {} +
find . -name "*.log" -type f -delete

echo "[cleanup] Done."