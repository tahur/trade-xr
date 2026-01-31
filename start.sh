#!/bin/bash

# ============================================
# Trade XR - Start Script
# ============================================
# Starts both frontend and backend servers
# Usage:
#   ./start.sh          Start servers
#   ./start.sh restart  Restart servers
#   ./start.sh stop     Stop all servers
#   ./start.sh status   Check if servers running
# ============================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# PID file locations
BACKEND_PID_FILE="$SCRIPT_DIR/.backend.pid"
FRONTEND_PID_FILE="$SCRIPT_DIR/.frontend.pid"

# Log files
BACKEND_LOG="$SCRIPT_DIR/backend.log"
FRONTEND_LOG="$SCRIPT_DIR/frontend.log"

# ============================================
# Helper Functions
# ============================================

print_header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}         ${BOLD}Trade XR${NC}                           ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}    Gesture-Controlled Trading Interface    ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
    echo ""
}

is_backend_running() {
    if [ -f "$BACKEND_PID_FILE" ]; then
        local pid=$(cat "$BACKEND_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

is_frontend_running() {
    if [ -f "$FRONTEND_PID_FILE" ]; then
        local pid=$(cat "$FRONTEND_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

stop_backend() {
    if [ -f "$BACKEND_PID_FILE" ]; then
        local pid=$(cat "$BACKEND_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${YELLOW}→${NC} Stopping backend (PID: $pid)..."
            kill "$pid" 2>/dev/null
            sleep 1
            # Force kill if still running
            if ps -p "$pid" > /dev/null 2>&1; then
                kill -9 "$pid" 2>/dev/null
            fi
        fi
        rm -f "$BACKEND_PID_FILE"
    fi
    # Also kill any uvicorn on port 8000
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
}

stop_frontend() {
    if [ -f "$FRONTEND_PID_FILE" ]; then
        local pid=$(cat "$FRONTEND_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${YELLOW}→${NC} Stopping frontend (PID: $pid)..."
            kill "$pid" 2>/dev/null
            sleep 1
            if ps -p "$pid" > /dev/null 2>&1; then
                kill -9 "$pid" 2>/dev/null
            fi
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi
    # Also kill any process on port 5173
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
}

stop_all() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}Stopping Trade XR...${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    stop_backend
    stop_frontend
    echo -e "${GREEN}✓${NC} All servers stopped"
    echo ""
}

start_backend() {
    echo -e "${YELLOW}→${NC} Starting backend server..."
    
    cd "$SCRIPT_DIR/backend"
    
    # Check if venv exists
    if [ ! -d "venv" ]; then
        echo -e "${RED}✗ Virtual environment not found${NC}"
        echo -e "  Please run ${GREEN}./setup.sh${NC} first"
        exit 1
    fi
    
    # Start uvicorn in background
    source venv/bin/activate
    nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > "$BACKEND_LOG" 2>&1 &
    local pid=$!
    echo $pid > "$BACKEND_PID_FILE"
    deactivate
    
    # Wait and check if started
    sleep 2
    if ps -p "$pid" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Backend started on ${CYAN}http://localhost:8000${NC} (PID: $pid)"
    else
        echo -e "${RED}✗ Backend failed to start${NC}"
        echo -e "  Check ${YELLOW}backend.log${NC} for errors"
        rm -f "$BACKEND_PID_FILE"
        return 1
    fi
    
    cd "$SCRIPT_DIR"
}

start_frontend() {
    echo -e "${YELLOW}→${NC} Starting frontend server..."
    
    cd "$SCRIPT_DIR/frontend"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${RED}✗ node_modules not found${NC}"
        echo -e "  Please run ${GREEN}./setup.sh${NC} first"
        exit 1
    fi
    
    # Start vite in background
    nohup npm run dev > "$FRONTEND_LOG" 2>&1 &
    local pid=$!
    echo $pid > "$FRONTEND_PID_FILE"
    
    # Wait for vite to start
    sleep 3
    if ps -p "$pid" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Frontend started on ${CYAN}http://localhost:5173${NC} (PID: $pid)"
    else
        echo -e "${RED}✗ Frontend failed to start${NC}"
        echo -e "  Check ${YELLOW}frontend.log${NC} for errors"
        rm -f "$FRONTEND_PID_FILE"
        return 1
    fi
    
    cd "$SCRIPT_DIR"
}

show_status() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}Server Status${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if is_backend_running; then
        local pid=$(cat "$BACKEND_PID_FILE")
        echo -e "${GREEN}●${NC} Backend:  ${GREEN}Running${NC} (PID: $pid) → http://localhost:8000"
    else
        echo -e "${RED}○${NC} Backend:  ${RED}Stopped${NC}"
    fi
    
    if is_frontend_running; then
        local pid=$(cat "$FRONTEND_PID_FILE")
        echo -e "${GREEN}●${NC} Frontend: ${GREEN}Running${NC} (PID: $pid) → http://localhost:5173"
    else
        echo -e "${RED}○${NC} Frontend: ${RED}Stopped${NC}"
    fi
    echo ""
}

start_all() {
    print_header
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}Starting Trade XR...${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Stop any existing processes first
    stop_backend > /dev/null 2>&1
    stop_frontend > /dev/null 2>&1
    
    start_backend
    start_frontend
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}${BOLD}✓ Trade XR is running!${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${CYAN}Frontend:${NC} http://localhost:5173"
    echo -e "  ${CYAN}Backend:${NC}  http://localhost:8000"
    echo -e "  ${CYAN}API Docs:${NC} http://localhost:8000/docs"
    echo ""
    echo -e "Commands:"
    echo -e "  ${GREEN}./start.sh restart${NC}  Restart servers"
    echo -e "  ${GREEN}./start.sh stop${NC}     Stop servers"
    echo -e "  ${GREEN}./start.sh status${NC}   Check status"
    echo -e "  ${GREEN}./start.sh logs${NC}     View logs"
    echo ""
    echo -e "${YELLOW}Tip:${NC} Press Ctrl+C in another terminal to keep these running"
    echo ""
}

show_logs() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}Viewing Logs (Ctrl+C to exit)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${CYAN}=== Backend Log ===${NC}"
    tail -20 "$BACKEND_LOG" 2>/dev/null || echo "(no logs yet)"
    echo ""
    echo -e "${CYAN}=== Frontend Log ===${NC}"
    tail -20 "$FRONTEND_LOG" 2>/dev/null || echo "(no logs yet)"
    echo ""
}

# ============================================
# Main Command Handler
# ============================================

case "${1:-start}" in
    start)
        start_all
        ;;
    restart)
        print_header
        stop_all
        sleep 1
        start_all
        ;;
    stop)
        print_header
        stop_all
        ;;
    status)
        print_header
        show_status
        ;;
    logs)
        show_logs
        ;;
    *)
        echo "Usage: $0 {start|restart|stop|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start    Start both servers (default)"
        echo "  restart  Stop and start servers"
        echo "  stop     Stop all servers"
        echo "  status   Show server status"
        echo "  logs     View recent logs"
        exit 1
        ;;
esac
