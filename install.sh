#!/bin/bash

# 1. Check for necessary tools
if ! command --version git >/dev/null; then
  echo >&2 "Error: git is not installed or not accessible via \"git\" command (PATH missing?)."
  exit 1
fi

if ! command --version deno >/dev/null; then
  echo >&2 "Error: Deno is not installed or not accessible via \"deno\" command (PATH missing?)."
  exit 1
fi

if ! command --version systemctl >/dev/null; then
  echo >&2 "Error: systemctl not found, this script is intended for systems with systemd."
  exit 1
fi

# 2. Prompt user for input
DEFAULT_SERVICE_NAME="telegram-chatgpt-bot"
read -p "Enter the service name [${DEFAULT_SERVICE_NAME}]: " SERVICE_NAME
read -p "Enter your OpenAI API key (TCGB_API_KEY): " TCGB_API_KEY
read -p "Enter your Telegram bot token (TCGB_TOKEN): " TCGB_TOKEN
read -p "Enter allowed users (TCGB_ALLOWED_USERS): " TCGB_ALLOWED_USERS
SERVICE_NAME=${SERVICE_NAME:-$DEFAULT_SERVICE_NAME}

# 3. Clone the repository
REPO_URL="https://github.com/0x2E757/Telegram-ChatGPT-bot"
DAEMON_DIR="/usr/local/lib/${SERVICE_NAME}"
sudo git clone --depth 1 $REPO_URL $DAEMON_DIR

# 4. Create the environment variables file
ENV_FILE="/etc/${SERVICE_NAME}.env"
echo "TCGB_API_KEY=${TCGB_API_KEY}" | sudo tee $ENV_FILE
echo "TCGB_TOKEN=${TCGB_TOKEN}" | sudo tee -a $ENV_FILE
echo "TCGB_ALLOWED_USERS=${TCGB_ALLOWED_USERS}" | sudo tee -a $ENV_FILE

# 5. Create the systemd service file
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
sudo bash -c "cat > $SERVICE_FILE <<EOL
[Unit]
Description=Telegram ChatGPT bot daemon (${SERVICE_NAME})
After=network.target
Wants=network.target

[Service]
EnvironmentFile=${ENV_FILE}
WorkingDirectory=${DAEMON_DIR}/src
ExecStart=deno run --allow-all main.ts
Restart=always

[Install]
WantedBy=multi-user.target
EOL"

# 6. Reload systemd, enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable ${SERVICE_NAME}
sudo systemctl start ${SERVICE_NAME}

echo "The service ${SERVICE_NAME} has been successfully installed and started."
