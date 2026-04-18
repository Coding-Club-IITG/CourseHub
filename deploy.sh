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
SCRIPT_PATH="$REPO_DIR/$(basename "${BASH_SOURCE[0]}")"
CLIENT_DIR="$REPO_DIR/client"
ADMIN_DIR="$REPO_DIR/admin"
SERVER_DIR="$REPO_DIR/server"
NGINX_WEB_ROOT="/var/www/coursehub/client"
NGINX_ADMIN_WEB_ROOT="/var/www/coursehub/admin"
PM2_APP_NAME="coursehub-backend"
GIT_REMOTE="origin"
DEPLOY_BRANCH="prod"

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

ensure_script_is_executable() {
    if [[ ! -x "$SCRIPT_PATH" ]]; then
        log "Making deploy script executable for next runs (chmod +x)..."
        chmod +x "$SCRIPT_PATH" || warn "Could not chmod +x $SCRIPT_PATH"
    fi
}

sync_repo_to_deploy_branch() {
    header "Syncing Repository"

    log "Fetching latest '$DEPLOY_BRANCH' from '$GIT_REMOTE'..."
    git -C "$REPO_DIR" fetch "$GIT_REMOTE" "$DEPLOY_BRANCH"

    local current_branch
    current_branch="$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD)"
    if [[ "$current_branch" != "$DEPLOY_BRANCH" ]]; then
        log "Switching branch: $current_branch -> $DEPLOY_BRANCH"
        git -C "$REPO_DIR" checkout "$DEPLOY_BRANCH"
    else
        log "Already on branch '$DEPLOY_BRANCH'."
    fi

    log "Pulling only '$DEPLOY_BRANCH' from '$GIT_REMOTE'..."
    git -C "$REPO_DIR" pull --ff-only "$GIT_REMOTE" "$DEPLOY_BRANCH"

    success "Repository synced to '$GIT_REMOTE/$DEPLOY_BRANCH'."
}

# ── Argument parsing ─────────────────────────────────────────
TARGET="${1:-all}"  # all | frontend | admin | backend

deploy_frontend() {
    header "Deploying Frontend"

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

ensure_script_is_executable
sync_repo_to_deploy_branch

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
        header "Full Deployment"

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
