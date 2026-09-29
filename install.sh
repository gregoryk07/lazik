#!/usr/bin/bash
mkdir logs
SERVICE_FILE="lazik.service"
INSTALL_PATH=$(pwd)
if [ -f "main.py" ]; then
    cat << EOF > $SERVICE_FILE
[Unit]
Description=Łazik zdalnie sterowany
Conflicts=shutdown.target reboot.target
Before=shutdown.target reboot.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_PATH
ExecStart=/usr/bin/python3 -u "${INSTALL_PATH}/main.py"

KillMode=mixed
TimeoutStopSec=2s
SendSIGKILL=yes

Restart=on-failure
RestartSec=2s

StandardInput=null
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    sudo cp "$SERVICE_FILE" /etc/systemd/system/lazik.service
    sudo systemctl daemon-reload
    sudo systemctl enable lazik
    sudo systemctl restart lazik
    echo "Service successfully installed"
    echo "Waiting for service to start..."
    sleep 1
    for sec in {1..10}; do
        if systemctl is-active --quiet lazik; then
            echo -e "\nService successfully installed and started!"
            exit 0
            break
        elif systemctl is-failed --quiet lazik; then
            echo -e "\nService failed to start. Check logs using journalctl -u lazik"
            exit 1
        fi
        echo -n ". "
        sleep 1
    done
else
    echo "\"main.py\" not found in this directory, no changes have been made"
fi
