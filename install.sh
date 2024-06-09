#!/bin/bash

# 1. Check for necessary tools
if ! command -v git >/dev/null; then
    echo >&2 "Error: git is not installed or not accessible via \"git\" command (PATH missing?)."
    exit 1
fi

if ! command -v deno >/dev/null; then
    echo >&2 "Error: Deno is not installed or not accessible via \"deno\" command (PATH missing?)."
    exit 1
fi

if ! command -v systemctl >/dev/null; then
    echo >&2 "Error: systemctl not found, this script is intended for systems with systemd."
    exit 1
fi

# 2. Prompt user for input
DEFAULT_SERVICE_NAME="telegram-chatgpt-bot"
read -p "Enter the service name [${DEFAULT_SERVICE_NAME}]: " SERVICE_NAME
SERVICE_NAME=${SERVICE_NAME:-$DEFAULT_SERVICE_NAME}
ENV_FILE="/etc/${SERVICE_NAME}.env"

if [ -f "$ENV_FILE" ]; then
    # 2.1 Prompt for ovewriting existing env values
    export $(grep -v '^#' $ENV_FILE | xargs)
    read -p "Enter your OpenAI API key [${TCGB_API_KEY}]: " NEW_TCGB_API_KEY
    read -p "Enter your Telegram bot token [${TCGB_TOKEN}]: " NEW_TCGB_TOKEN
    read -p "Enter allowed users [${TCGB_ALLOWED_USERS}]: " NEW_TCGB_ALLOWED_USERS
    TCGB_API_KEY=${input_TCGB_API_KEY:-$TCGB_API_KEY}
    TCGB_TOKEN=${input_TCGB_TOKEN:-$TCGB_TOKEN}
    TCGB_ALLOWED_USERS=${input_TCGB_ALLOWED_USERS:-$TCGB_ALLOWED_USERS}
else
    # 2.1 Prompt for input env values
    read -p "Enter your OpenAI API key: " TCGB_API_KEY
    read -p "Enter your Telegram bot token: " TCGB_TOKEN
    read -p "Enter allowed users: " TCGB_ALLOWED_USERS
fi


# 3. Clone the repository
REPO_URL="https://github.com/0x2E757/Telegram-ChatGPT-bot"
DAEMON_DIR="/usr/local/lib/${SERVICE_NAME}"

if [ -d "$DAEMON_DIR" ]; then
    read -p "Directory $DAEMON_DIR already exists. Do you want to clone latest changes? [Y/n] " CLONE_REQUIRED
    case "$CLONE_REQUIRED" in
        [Nn]* ) 
            echo "Clone skipped."
            ;;
        * ) 
            echo "Deleting $DAEMON_DIR"
            sudo rm -rf "$DAEMON_DIR"
            echo "Cloning $REPO_URL (without history)"
            sudo git clone --depth 1 $REPO_URL $DAEMON_DIR
        ;;
    esac
else
    echo "Cloning $REPO_URL (without history)"
    sudo git clone --depth 1 $REPO_URL $DAEMON_DIR
fi

# 4. Create the environment variables file
sudo tee $ENV_FILE > /dev/null <<EOF
TCGB_API_KEY=${TCGB_API_KEY}
TCGB_TOKEN=${TCGB_TOKEN}
TCGB_ALLOWED_USERS=${TCGB_ALLOWED_USERS}
EOF

# 5. Create the systemd service file
DENO_BIN=$(which deno)
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
sudo tee $SERVICE_FILE > /dev/null <<EOF
[Unit]
Description=Telegram ChatGPT bot daemon (${SERVICE_NAME})
After=network.target
Wants=network.target

[Service]
EnvironmentFile=${ENV_FILE}
WorkingDirectory=${DAEMON_DIR}/src
ExecStart=${DENO_BIN} run --allow-all main.ts
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# 6. Reload systemd, enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable ${SERVICE_NAME}
sudo systemctl start ${SERVICE_NAME}

echo "The service ${SERVICE_NAME} has been successfully installed and started."
