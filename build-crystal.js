const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf-8');

// Replace fonts
html = html.replace(
  /<link[\s\S]*?family=Inter[\s\S]*?>/,
  '<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Noto+Serif+SC:wght@300;400;700&display=swap" rel="stylesheet">'
);

// Replace root variables
html = html.replace(
  /\:root \{[\s\S]*?\}/,
  `:root {
      --bg-app: #0a0412;
      --bg-surface: rgba(255, 255, 255, 0.04);
      --bg-surface-alt: rgba(255, 255, 255, 0.08);
      --text-main: #ffffff;
      --text-muted: #e6d9ff;
      --text-faint: #b399ff;
      --border-subtle: rgba(255, 255, 255, 0.15);
      --border-strong: rgba(255, 255, 255, 0.4);
      --border-accent: #dca3ff;
      --accent: #aa44ff;
      --accent-hover: #c488ff;
      --danger: #ff4d6d;
      --success: #4dffb8;
      --font-heading: 'Cinzel', 'Noto Serif SC', serif;
      --font-text: 'Noto Serif SC', serif;
      --font-mono: monospace;
      --radius-sm: 4px;
      --radius-md: 8px;
      --radius-lg: 16px;
      --btn-radius: 4px;
      --shadow-main: 0 15px 35px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2);
      --header-border: 1px solid rgba(255, 255, 255, 0.1);
    }`
);

// Body styling & infinite dimension background
html = html.replace(
  /body \{[\s\S]*?animation: pageFadeIn[\s\S]*?\}/,
  `@keyframes tunnelMove {
      0% { transform: perspective(600px) rotateX(60deg) translateY(0); }
      100% { transform: perspective(600px) rotateX(60deg) translateY(60px); }
    }
    @keyframes pulseGlow {
      0%, 100% { opacity: 0.8; box-shadow: 0 0 30px rgba(170, 68, 255, 0.2); }
      50% { opacity: 1; box-shadow: 0 0 50px rgba(170, 68, 255, 0.5); }
    }
    
    .bg-gradient {
      position: fixed;
      inset: 0;
      background: radial-gradient(circle at center top, #2b0b4c 0%, #0a0412 80%);
      z-index: -3;
    }
    
    .infinite-mirror {
      position: fixed;
      top: -50%; left: -50%; width: 200%; height: 200%;
      background: 
        linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
      background-size: 60px 60px;
      z-index: -2;
      animation: tunnelMove 4s linear infinite;
      transform-origin: center 30%;
      mask-image: linear-gradient(to bottom, transparent 0%, black 40%, black 100%);
      -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 40%, black 100%);
    }
    
    .crystal-overlay {
      position: fixed;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.03) 100%);
      backdrop-filter: blur(1px);
      z-index: -1;
      pointer-events: none;
    }

    body {
      background: transparent;
      color: var(--text-main);
      font-family: var(--font-text);
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      font-size: 15px;
      line-height: 1.6;
      animation: pageFadeIn 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    }

    .shell {
      background: rgba(20, 10, 40, 0.45);
      backdrop-filter: blur(30px) saturate(130%);
      -webkit-backdrop-filter: blur(30px) saturate(130%);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-top: 1px solid rgba(255, 255, 255, 0.4);
      border-left: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: var(--radius-lg);
      box-shadow: 0 30px 60px rgba(0,0,0,0.6), inset 0 1px 20px rgba(255,255,255,0.1);
      margin: 40px auto;
      width: calc(100% - 48px);
      max-width: 1000px;
      padding: 32px;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 32px;
      position: relative;
      overflow: hidden;
      animation: pulseGlow 6s infinite alternate;
    }

    .card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-top: 1px solid rgba(255,255,255,0.3);
      border-left: 1px solid rgba(255,255,255,0.2);
      border-radius: var(--radius-md);
      padding: 24px;
      box-shadow: var(--shadow-main);
      backdrop-filter: blur(12px);
      transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .card:hover {
      transform: translateY(-4px);
      background: var(--bg-surface-alt);
      border-color: var(--border-strong);
      box-shadow: 0 15px 40px rgba(170, 68, 255, 0.2), inset 0 1px 0 rgba(255,255,255,0.4);
    }

    .metric-card {
      display: flex;
      flex-direction: column;
      padding: 24px;
      background: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01));
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-top: 1px solid rgba(255, 255, 255, 0.4);
      border-left: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: var(--radius-md);
      box-shadow: 0 10px 20px rgba(0,0,0,0.3);
      transition: all 0.4s ease;
      position: relative;
    }
    .metric-card:hover {
      transform: translateY(-5px);
      border-color: rgba(255,255,255,0.6);
      box-shadow: 0 15px 30px rgba(170, 68, 255, 0.3), inset 0 0 10px rgba(170, 68, 255, 0.2);
    }
    .metric-val {
      font-family: var(--font-heading);
      font-size: 38px;
      color: #ffffff;
      text-shadow: 0 0 15px rgba(255,255,255,0.6), 0 0 30px var(--accent);
      font-weight: 700;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 24px;
      font-size: 16px;
      font-family: var(--font-heading);
      letter-spacing: 2px;
      border-radius: var(--btn-radius);
      border: 1px solid rgba(255,255,255,0.4);
      background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0));
      color: #fff;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 5px 15px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
      text-transform: uppercase;
      cursor: pointer;
    }
    .btn:hover:not(:disabled) {
      background: linear-gradient(135deg, rgba(170,68,255,0.4), rgba(170,68,255,0.1));
      border-color: #fff;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.6), 0 0 20px rgba(170, 68, 255, 0.6);
      transform: translateY(-2px);
    }
    
    .section-title {
      font-family: var(--font-heading);
      font-size: 24px;
      color: #fff;
      letter-spacing: 3px;
      text-transform: uppercase;
      text-shadow: 0 0 15px rgba(170, 68, 255, 0.8);
      border-bottom: 1px solid rgba(255,255,255,0.1);
      padding-bottom: 10px;
    }

    input, select {
      font-family: var(--font-text) !important;
      background: rgba(0,0,0,0.3) !important;
      color: #fff !important;
      border: 1px solid rgba(255,255,255,0.2) !important;
      border-radius: 4px !important;
      box-shadow: inset 0 2px 5px rgba(0,0,0,0.5);
    }
    input:focus, select:focus {
      border-color: var(--accent-hover) !important;
      box-shadow: 0 0 15px rgba(170, 68, 255, 0.4), inset 0 2px 5px rgba(0,0,0,0.5);
      outline: none;
    }
    
    .status-badge {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255,255,255,0.2);
      backdrop-filter: blur(5px);
    }
    .status-badge.active {
      background: rgba(77, 255, 184, 0.2);
      border-color: #4dffb8;
      box-shadow: 0 0 15px rgba(77, 255, 184, 0.4);
      color: #4dffb8;
    }
`
);

// Add the background elements
html = html.replace('<body>', `<body>
  <div class="bg-gradient"></div>
  <div class="infinite-mirror"></div>
  <div class="crystal-overlay"></div>`);

// Update dropdown
html = html.replace(
  '<option value="manga-color">Theme: Pop-Art (Color Manga)</option>',
  '<option value="manga-color">Theme: Pop-Art (Color Manga)</option>\n          <option value="crystal" selected>Theme: Imperial Crystal (Purple/White)</option>'
);
html = html.replace('<option value="normal" selected>', '<option value="normal">');

// Update changeTheme
html = html.replace(
  "else if (themeName === 'manga-color') window.location.href = '/public/admin-manga-color.html';",
  "else if (themeName === 'manga-color') window.location.href = '/public/admin-manga-color.html';\n        else if (themeName === 'crystal') window.location.href = '/public/admin-crystal.html';"
);

fs.writeFileSync('public/admin-crystal.html', html);
console.log('admin-crystal.html created!');
