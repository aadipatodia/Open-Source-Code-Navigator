#!/usr/bin/env bash
set -euo pipefail

minor="$(python -c 'import sys; print(sys.version_info.minor)')"
if [[ "${minor}" -ge 14 ]]; then
  echo "ERROR: Render is using Python 3.${minor}."
  echo "Fix: In Render → Environment, set PYTHON_VERSION=3.12.8, clear build cache, redeploy."
  echo "Or switch Runtime to Docker and set Dockerfile path to backend/Dockerfile."
  exit 1
fi

pip install --upgrade pip
pip install -r requirements.txt
