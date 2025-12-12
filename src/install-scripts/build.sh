#!/bin/bash

platforms=(
    "windows/amd64"
    "darwin/arm64"
    "linux/amd64"
)

# Get the script's directory and navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Create output directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/scripts"

# Change to the directory containing go.mod
cd "$SCRIPT_DIR"

for platform in "${platforms[@]}"; do
    GOOS=${platform%/*}
    GOARCH=${platform#*/}
    output="$PROJECT_ROOT/scripts/install-${GOOS}-${GOARCH}"
    [[ $GOOS == "windows" ]] && output="${output}.exe"
    
    echo "Building for $GOOS-$GOARCH..."
    GOOS=$GOOS GOARCH=$GOARCH go build -a -o "$output" main.go
done

echo "All builds completed in $PROJECT_ROOT/scripts!"
