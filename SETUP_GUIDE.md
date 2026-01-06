# Easy Development Setup for Beginners

## Option 1: Manual Refresh (Simplest)
1. Keep index.html open in your browser
2. Edit files in any text editor
3. Press F5 to refresh and see changes

## Option 2: Auto-Reload (Recommended)
1. Download VS Code: https://code.visualstudio.com
2. Open the keepsake folder in VS Code
3. Install "Live Server" extension (click Extensions icon, search "Live Server")
4. Right-click index.html → "Open with Live Server"
5. Now any changes auto-reload in your browser!

## Option 3: Simple Server
In the keepsake folder, run:
```
python3 -m http.server 8000
```
Then visit: http://localhost:8000
(You'll need to manually refresh with F5 when you make changes)
