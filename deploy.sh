#!/bin/bash

# ============================================================
#  CourseHub Deployment Script
#  Usage:
#    ./deploy.sh          — deploy both frontend & backend
#    ./deploy.sh frontend — deploy frontend only
#    ./deploy.sh admin    — deploy admin frontend only
#    ./deploy.sh backend  — deploy backend only
# ============================================================

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$REPO_DIR/client"
ADMIN_DIR="$REPO_DIR/admin"
SERVER_DIR="$REPO_DIR/server"
NGINX_WEB_ROOT="/var/www/coursehub/client"
NGINX_ADMIN_WEB_ROOT="/var/www/coursehub/admin"
PM2_APP_NAME="coursehub-backend"

# ── Colours ─────────────────────────────────────────────────
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
CYAN="\033[0;36m"
BOLD="\033[1m"
RESET="\033[0m"

log()     { echo -e "${CYAN}[•]${RESET} $*"; }
success() { echo -e "${GREEN}[✔]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[!]${RESET} $*"; }
error()   { echo -e "${RED}[✘]${RESET} $*" >&2; }
header()  { echo -e "\n${BOLD}${CYAN}══ $* ══${RESET}\n"; }

# ── Argument parsing ─────────────────────────────────────────
TARGET="${1:-all}"  # all | frontend | admin | backend

deploy_frontend() {
    header "Deploying Frontend"

    log "Pulling latest changes..."
    git -C "$REPO_DIR" pull

    log "Installing client dependencies..."
    cd "$CLIENT_DIR"
    npm install

    log "Building frontend..."
    npm run build

    log "Replacing files in $NGINX_WEB_ROOT ..."
    # Clear old build and copy new one
    sudo rm -rf "${NGINX_WEB_ROOT:?}"/*
    sudo cp -r "$CLIENT_DIR/dist/." "$NGINX_WEB_ROOT/"
    log "Reloading nginx..."
    sudo systemctl reload nginx
    sudo nginx -s reload

    success "Frontend deployed successfully!"
}

deploy_admin() {
    header "Deploying Admin Frontend"

    log "Pulling latest changes..."
    git -C "$REPO_DIR" pull

    log "Installing admin dependencies..."
    cd "$ADMIN_DIR"
    npm install

    log "Building admin frontend..."
    npm run build

    log "Replacing files in $NGINX_ADMIN_WEB_ROOT ..."
    sudo mkdir -p "$NGINX_ADMIN_WEB_ROOT"
    sudo rm -rf "${NGINX_ADMIN_WEB_ROOT:?}"/*
    sudo cp -r "$ADMIN_DIR/dist/." "$NGINX_ADMIN_WEB_ROOT/"
    log "Reloading nginx..."
    sudo systemctl reload nginx
    sudo nginx -s reload

    success "Admin frontend deployed successfully!"
}

deploy_backend() {
    header "Deploying Backend"

    log "Pulling latest changes..."
    git -C "$REPO_DIR" pull

    log "Installing server dependencies..."
    cd "$SERVER_DIR"
    npm install

    log "Restarting PM2 app: $PM2_APP_NAME ..."
    pm2 restart "$PM2_APP_NAME"

    success "Backend deployed successfully!"
}

# ── Main ─────────────────────────────────────────────────────
echo -e "\n${BOLD}CourseHub Deployment${RESET}  —  target: ${YELLOW}${TARGET}${RESET}"
START=$(date +%s)

case "$TARGET" in
    frontend)
        deploy_frontend
        ;;
    admin)
        deploy_admin
        ;;
    backend)
        deploy_backend
        ;;
    all)
        # Pull once, deploy both
        header "Full Deployment"
        log "Pulling latest changes..."
        git -C "$REPO_DIR" pull

        # Frontend
        log "Installing client dependencies..."
        cd "$CLIENT_DIR"
        npm install
        log "Building frontend..."
        npm run build
        log "Replacing files in $NGINX_WEB_ROOT ..."
        sudo rm -rf "${NGINX_WEB_ROOT:?}"/*
        sudo cp -r "$CLIENT_DIR/dist/." "$NGINX_WEB_ROOT/"

        # Admin frontend
        log "Installing admin dependencies..."
        cd "$ADMIN_DIR"
        npm install
        log "Building admin frontend..."
        npm run build
        log "Replacing files in $NGINX_ADMIN_WEB_ROOT ..."
        sudo mkdir -p "$NGINX_ADMIN_WEB_ROOT"
        sudo rm -rf "${NGINX_ADMIN_WEB_ROOT:?}"/*
        sudo cp -r "$ADMIN_DIR/dist/." "$NGINX_ADMIN_WEB_ROOT/"

        log "Reloading nginx..."
        sudo systemctl reload nginx
        sudo nginx -s reload
        success "Frontend and admin deployed!"

        # Backend
        log "Installing server dependencies..."
        cd "$SERVER_DIR"
        npm install
        log "Restarting PM2 app: $PM2_APP_NAME ..."
        pm2 restart "$PM2_APP_NAME"
        success "Backend deployed!"
        ;;
    *)
        error "Unknown target: '$TARGET'"
        echo "Usage: $0 [all|frontend|admin|backend]"
        exit 1
        ;;
esac

END=$(date +%s)
echo -e "\n${GREEN}${BOLD}✔ Deployment complete${RESET} in $(( END - START ))s\n"
