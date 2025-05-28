#!/bin/bash

# Script to generate PDF from the whitepaper Markdown file
# Requires: pandoc and LaTeX (for PDF generation)

echo "📄 Generating Wagers.bet Whitepaper PDF"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "WHITEPAPER.md" ]; then
    echo "❌ Error: WHITEPAPER.md not found. Run from project root."
    exit 1
fi

# Check for required tools
if ! command -v pandoc &> /dev/null; then
    echo "❌ Pandoc not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        echo "Installing via Homebrew..."
        brew install pandoc
        brew install --cask basictex  # For PDF support
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        echo "Installing via apt..."
        sudo apt-get update
        sudo apt-get install -y pandoc texlive-latex-base texlive-fonts-recommended texlive-latex-extra
    else
        echo "Please install pandoc manually: https://pandoc.org/installing.html"
        exit 1
    fi
fi

# Create output directory
mkdir -p documents

# Generate PDF with custom styling
echo "🔄 Converting Markdown to PDF..."

pandoc WHITEPAPER.md \
    -o documents/Wagers.bet-Whitepaper.pdf \
    --pdf-engine=xelatex \
    --toc \
    --toc-depth=2 \
    -V documentclass=report \
    -V geometry:margin=1in \
    -V colorlinks=true \
    -V linkcolor=blue \
    -V urlcolor=blue \
    -V toccolor=gray \
    --highlight-style=tango \
    -V mainfont="Helvetica Neue" \
    -V sansfont="Helvetica Neue" \
    -V monofont="Courier New" \
    -V fontsize=11pt \
    -V linestretch=1.25 \
    --metadata title="Wagers.bet: A Decentralized, User-Generated Prediction Market Protocol" \
    --metadata author="Wagers.bet Team" \
    --metadata date="January 2025" \
    --metadata subtitle="Revolutionizing Prediction Markets Through Permissionless Innovation"

# Check if PDF was created successfully
if [ -f "documents/Wagers.bet-Whitepaper.pdf" ]; then
    echo "✅ PDF generated successfully!"
    echo "📍 Location: documents/Wagers.bet-Whitepaper.pdf"
    
    # Get file size
    if [[ "$OSTYPE" == "darwin"* ]]; then
        SIZE=$(stat -f%z "documents/Wagers.bet-Whitepaper.pdf" | awk '{ split( "B KB MB GB" , v ); s=1; while( $1>1024 ){ $1/=1024; s++ } printf "%.1f %s", $1, v[s] }')
    else
        SIZE=$(stat -c%s "documents/Wagers.bet-Whitepaper.pdf" | awk '{ split( "B KB MB GB" , v ); s=1; while( $1>1024 ){ $1/=1024; s++ } printf "%.1f %s", $1, v[s] }')
    fi
    
    echo "📊 File size: $SIZE"
else
    echo "❌ Error: PDF generation failed"
    exit 1
fi

echo ""
echo "🎉 Done! The whitepaper PDF is ready for distribution."