#!/bin/bash

# ============================================
# Trade XR - Setup Script
# ============================================
# Run this once to install all dependencies
# Usage: ./setup.sh
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Get script directory (works even if called from another location)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}         ${BOLD}Trade XR - Setup${NC}                   ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}    Gesture-Controlled Trading Interface    ${CYAN}║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
echo ""

# ============================================
# Check Prerequisites
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Step 1: Checking Prerequisites${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓${NC} Node.js installed: $NODE_VERSION"
else
    echo -e "${RED}✗ Node.js not found${NC}"
    echo -e "  Please install Node.js 20+ from: ${CYAN}https://nodejs.org${NC}"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓${NC} npm installed: v$NPM_VERSION"
else
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✓${NC} $PYTHON_VERSION"
else
    echo -e "${RED}✗ Python3 not found${NC}"
    echo -e "  Please install Python 3.10+ from: ${CYAN}https://python.org${NC}"
    exit 1
fi

# Check pip
if command -v pip3 &> /dev/null; then
    echo -e "${GREEN}✓${NC} pip3 installed"
else
    echo -e "${RED}✗ pip3 not found${NC}"
    exit 1
fi

echo ""

# ============================================
# Backend Setup
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Step 2: Setting up Backend (Python)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd "$SCRIPT_DIR/backend"

# Create virtual environment if doesn't exist
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}→${NC} Creating Python virtual environment..."
    python3 -m venv venv
    echo -e "${GREEN}✓${NC} Virtual environment created"
else
    echo -e "${GREEN}✓${NC} Virtual environment already exists"
fi

# Activate venv and install dependencies
echo -e "${YELLOW}→${NC} Installing Python dependencies..."
source venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt
echo -e "${GREEN}✓${NC} Python dependencies installed"

# Create .env if doesn't exist
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓${NC} Created .env from .env.example"
        echo -e "${YELLOW}  ⚠ Please edit backend/.env with your Kite API credentials${NC}"
    fi
else
    echo -e "${GREEN}✓${NC} .env file exists"
fi

deactivate
cd "$SCRIPT_DIR"
echo ""

# ============================================
# Frontend Setup
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Step 3: Setting up Frontend (Node.js)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd "$SCRIPT_DIR/frontend"

# Install npm dependencies
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}→${NC} Installing npm dependencies (this may take a minute)..."
    npm install --silent
    echo -e "${GREEN}✓${NC} npm dependencies installed"
else
    echo -e "${GREEN}✓${NC} node_modules already exists"
    echo -e "${YELLOW}→${NC} Updating dependencies..."
    npm install --silent
    echo -e "${GREEN}✓${NC} Dependencies updated"
fi

cd "$SCRIPT_DIR"
echo ""

# ============================================
# Done!
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${BOLD}✓ Setup Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Next steps:"
echo -e "  ${CYAN}1.${NC} Configure your Kite API credentials in ${YELLOW}backend/.env${NC}"
echo -e "  ${CYAN}2.${NC} Run ${GREEN}./start.sh${NC} to start the application"
echo ""
echo -e "Commands:"
echo -e "  ${GREEN}./start.sh${NC}          Start both servers"
echo -e "  ${GREEN}./start.sh restart${NC}  Restart both servers"
echo -e "  ${GREEN}./start.sh stop${NC}     Stop all servers"
echo ""
