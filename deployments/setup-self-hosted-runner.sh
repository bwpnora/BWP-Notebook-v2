#!/usr/bin/env bash
# ==============================================================================
# Setup GitHub Actions Self-Hosted Runner on Debian Server (192.168.3.168)
# Repository: https://github.com/bwpnora/BWP-Notebook-v2
# ==============================================================================

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <GITHUB_RUNNER_REGISTRATION_TOKEN>"
  echo "Get token from: https://github.com/bwpnora/BWP-Notebook-v2/settings/actions/runners/new?arch=x64&os=linux"
  exit 1
fi

TOKEN="$1"
RUNNER_DIR="$HOME/actions-runner"
RUNNER_VERSION="2.322.0"
REPO_URL="https://github.com/bwpnora/BWP-Notebook-v2"

echo "=== 1. Checking prerequisites ==="
sudo usermod -aG docker "$USER" || true
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

echo "=== 2. Downloading GitHub Actions Runner v${RUNNER_VERSION} ==="
if [ ! -f "actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz" ]; then
  curl -o "actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz" -L "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
fi

echo "=== 3. Extracting runner package ==="
tar xzf "./actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"

echo "=== 4. Configuring runner ==="
./config.sh --url "$REPO_URL" --token "$TOKEN" --unattended --replace

echo "=== 5. Installing and starting systemd service ==="
sudo ./svc.sh install "$USER"
sudo ./svc.sh start
sudo ./svc.sh status

echo "=== SUCCESS: GitHub Actions Runner is installed, running and listening for jobs! ==="
