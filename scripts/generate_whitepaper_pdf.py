#!/usr/bin/env python3
"""
Generate PDF version of the Wagers.bet whitepaper
Requires: pip install markdown2 pdfkit
Also requires wkhtmltopdf: brew install --cask wkhtmltopdf (macOS) or apt-get install wkhtmltopdf (Linux)
"""

import os
import sys
try:
    import markdown2
    import pdfkit
except ImportError:
    print("Installing required packages...")
    os.system("pip install markdown2 pdfkit")
    import markdown2
    import pdfkit

def generate_pdf():
    # Read the markdown file
    if not os.path.exists("WHITEPAPER.md"):
        print("Error: WHITEPAPER.md not found. Run from project root.")
        sys.exit(1)
    
    print("📄 Generating Wagers.bet Whitepaper PDF")
    print("======================================")
    
    with open("WHITEPAPER.md", "r") as f:
        markdown_content = f.read()
    
    # Convert markdown to HTML with styling
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Wagers.bet Whitepaper</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
            
            body {{
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 40px 60px;
                background: white;
            }}
            
            h1 {{
                color: #1a1a1a;
                font-size: 2.5em;
                font-weight: 700;
                margin-bottom: 0.5em;
                border-bottom: 3px solid #4F46E5;
                padding-bottom: 0.3em;
            }}
            
            h2 {{
                color: #2d2d2d;
                font-size: 1.8em;
                font-weight: 600;
                margin-top: 1.5em;
                margin-bottom: 0.5em;
            }}
            
            h3 {{
                color: #404040;
                font-size: 1.4em;
                font-weight: 600;
                margin-top: 1.2em;
                margin-bottom: 0.5em;
            }}
            
            h4 {{
                color: #525252;
                font-size: 1.2em;
                font-weight: 600;
                margin-top: 1em;
                margin-bottom: 0.5em;
            }}
            
            p {{
                margin-bottom: 1em;
                text-align: justify;
            }}
            
            ul, ol {{
                margin-bottom: 1em;
                padding-left: 2em;
            }}
            
            li {{
                margin-bottom: 0.5em;
            }}
            
            strong {{
                font-weight: 600;
                color: #1a1a1a;
            }}
            
            em {{
                font-style: italic;
            }}
            
            code {{
                background: #f4f4f4;
                padding: 2px 6px;
                border-radius: 3px;
                font-family: 'Courier New', monospace;
                font-size: 0.9em;
            }}
            
            pre {{
                background: #f4f4f4;
                padding: 15px;
                border-radius: 5px;
                overflow-x: auto;
                margin-bottom: 1em;
            }}
            
            pre code {{
                background: none;
                padding: 0;
            }}
            
            blockquote {{
                border-left: 4px solid #4F46E5;
                margin: 1em 0;
                padding-left: 20px;
                color: #666;
                font-style: italic;
            }}
            
            table {{
                border-collapse: collapse;
                width: 100%;
                margin: 1em 0;
            }}
            
            th, td {{
                border: 1px solid #ddd;
                padding: 12px;
                text-align: left;
            }}
            
            th {{
                background-color: #f8f8f8;
                font-weight: 600;
            }}
            
            tr:nth-child(even) {{
                background-color: #f9f9f9;
            }}
            
            a {{
                color: #4F46E5;
                text-decoration: none;
            }}
            
            a:hover {{
                text-decoration: underline;
            }}
            
            hr {{
                border: none;
                border-top: 2px solid #eee;
                margin: 2em 0;
            }}
            
            .page-break {{
                page-break-after: always;
            }}
            
            @media print {{
                body {{
                    font-size: 11pt;
                }}
                
                h1 {{
                    font-size: 24pt;
                }}
                
                h2 {{
                    font-size: 18pt;
                }}
                
                h3 {{
                    font-size: 14pt;
                }}
                
                a {{
                    color: #000;
                    text-decoration: underline;
                }}
            }}
        </style>
    </head>
    <body>
        {markdown2.markdown(markdown_content, extras=['tables', 'fenced-code-blocks', 'header-ids'])}
        
        <div style="margin-top: 100px; text-align: center; color: #666; font-size: 0.9em;">
            <p>© 2025 Wagers.bet. All rights reserved.</p>
            <p>Website: wagers.bet | GitHub: github.com/wagers-bet</p>
        </div>
    </body>
    </html>
    """
    
    # Create output directory
    os.makedirs("documents", exist_ok=True)
    
    # Configure PDF options
    options = {
        'page-size': 'A4',
        'margin-top': '1in',
        'margin-right': '1in',
        'margin-bottom': '1in',
        'margin-left': '1in',
        'encoding': "UTF-8",
        'no-outline': None,
        'enable-local-file-access': None
    }
    
    try:
        # Generate PDF
        print("🔄 Converting to PDF...")
        pdfkit.from_string(html_content, 'documents/Wagers.bet-Whitepaper.pdf', options=options)
        
        # Check if successful
        if os.path.exists('documents/Wagers.bet-Whitepaper.pdf'):
            file_size = os.path.getsize('documents/Wagers.bet-Whitepaper.pdf')
            print(f"✅ PDF generated successfully!")
            print(f"📍 Location: documents/Wagers.bet-Whitepaper.pdf")
            print(f"📊 File size: {file_size / 1024:.1f} KB")
            print("\n🎉 Done! The whitepaper PDF is ready for distribution.")
        else:
            print("❌ Error: PDF generation failed")
            
    except Exception as e:
        print(f"❌ Error generating PDF: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure wkhtmltopdf is installed:")
        print("   macOS: brew install --cask wkhtmltopdf")
        print("   Linux: sudo apt-get install wkhtmltopdf")
        print("2. Try the bash script instead: ./scripts/generate-whitepaper-pdf.sh")

if __name__ == "__main__":
    generate_pdf()