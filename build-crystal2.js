const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf-8');

// Replace fonts
html = html.replace(
  /<link[\s\S]*?family=Inter[\s\S]*?>/,
  '<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;700&family=Noto+Sans+SC:wght@400;700;900&display=swap" rel="stylesheet">'
);

// Replace root variables
html = html.replace(
  /\:root \{[\s\S]*?\}/,
  `:root {
      --bg-app: #070310;
      --bg-surface: rgba(20, 10, 35, 0.6);
      --bg-surface-alt: rgba(30, 15, 50, 0.8);
      --text-main: #ffffff;
      --text-muted: #bbaadd;
      --text-faint: #8877aa;
      --border-subtle: rgba(255, 255, 255, 0.1);
      --border-strong: rgba(255, 255, 255, 0.3);
      --border-accent: #aa44ff;
      --accent: #7722ff;
      --accent-hover: #9944ff;
      --danger: #ff2255;
      --success: #00eeaa;
      --font-heading: 'Rajdhani', 'Noto Sans SC', sans-serif;
      --font-text: 'Noto Sans SC', sans-serif;
      --font-mono: monospace;
      --radius-sm: 0px;
      --radius-md: 0px;
      --radius-lg: 0px;
      --btn-radius: 3px;
      --shadow-main: 0 20px 40px rgba(0, 0, 0, 0.8);
      --header-border: 1px solid rgba(255, 255, 255, 0.05);
    }`
);

// Body styling & background
html = html.replace(
  /body \{[\s\S]*?animation: pageFadeIn[\s\S]*?\}/,
  `@keyframes shardMove {
      0% { transform: translateY(0) rotate(45deg); opacity: 0.3; }
      50% { opacity: 0.8; }
      100% { transform: translateY(-50px) rotate(45deg); opacity: 0.3; }
    }
    
    .bg-gradient {
      position: fixed;
      inset: 0;
      background: radial-gradient(ellipse at center top, #1c0a30 0%, #070310 100%);
      z-index: -3;
    }
    
    .sharp-shards {
      position: fixed;
      inset: 0;
      z-index: -2;
      overflow: hidden;
      pointer-events: none;
    }
    .shard {
      position: absolute;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
      box-shadow: 0 0 20px rgba(170, 68, 255, 0.3);
      animation: shardMove 10s infinite alternate;
    }
    .shard-1 { top: -20%; left: 20%; width: 2px; height: 150%; }
    .shard-2 { top: -10%; right: 30%; width: 1px; height: 150%; transform: rotate(-35deg) !important; animation-delay: -3s; box-shadow: 0 0 30px rgba(255, 255, 255, 0.2); }
    .shard-3 { top: 30%; left: -20%; width: 4px; height: 150%; transform: rotate(70deg) !important; opacity: 0.1; }

    .crystal-overlay {
      position: fixed;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.01) 0%, transparent 50%, rgba(255,255,255,0.02) 100%);
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
      animation: pageFadeIn 0.5s ease-out forwards;
      letter-spacing: 0.5px;
    }

    .shell {
      background: rgba(12, 6, 20, 0.7);
      backdrop-filter: blur(40px);
      -webkit-backdrop-filter: blur(40px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      border-left: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: var(--radius-lg);
      box-shadow: 0 40px 80px rgba(0,0,0,0.9);
      margin: 40px auto;
      width: calc(100% - 48px);
      max-width: 1050px;
      padding: 32px;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 32px;
      position: relative;
    }

    .card {
      background: var(--bg-surface);
      border: 1px solid rgba(255,255,255,0.05);
      border-top: 1px solid rgba(255,255,255,0.15);
      border-left: 1px solid rgba(255,255,255,0.1);
      border-radius: var(--radius-md);
      padding: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
    }
    .card:hover {
      background: var(--bg-surface-alt);
      border-color: rgba(255,255,255,0.15);
    }

    .metric-card {
      display: flex;
      flex-direction: column;
      padding: 24px;
      background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(0,0,0,0.4));
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: var(--radius-md);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 15px 25px rgba(0,0,0,0.6);
      transition: all 0.3s ease;
      position: relative;
    }
    .metric-card:hover {
      border-top-color: var(--accent);
      box-shadow: inset 0 1px 0 rgba(170, 68, 255, 0.4), 0 20px 30px rgba(0,0,0,0.8);
      background: linear-gradient(135deg, rgba(170, 68, 255, 0.1), rgba(0,0,0,0.6));
    }
    .metric-val {
      font-family: var(--font-heading);
      font-size: 42px;
      color: #ffffff;
      text-shadow: 0 0 20px rgba(255,255,255,0.4);
      font-weight: 700;
      line-height: 1;
      margin-bottom: 8px;
    }
    .metric-lbl {
      text-transform: uppercase;
      font-family: var(--font-heading);
      letter-spacing: 2px;
      font-size: 13px;
      color: var(--text-faint);
    }

    /* Skeuomorphic Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px 28px;
      font-size: 15px;
      font-family: var(--font-heading);
      font-weight: 700;
      letter-spacing: 2px;
      border-radius: var(--btn-radius);
      border: 1px solid #2a0b4d;
      background: linear-gradient(to bottom, #5919a3, #3a0d70);
      color: #fff;
      box-shadow: 
        inset 0 1px 1px rgba(255,255,255,0.3),
        inset 0 10px 20px rgba(255,255,255,0.05),
        inset 0 -2px 5px rgba(0,0,0,0.4),
        0 4px 6px rgba(0,0,0,0.6),
        0 10px 15px rgba(0,0,0,0.4);
      text-shadow: 0 -1px 0 rgba(0,0,0,0.8);
      transition: all 0.1s ease;
      text-transform: uppercase;
      cursor: pointer;
    }
    .btn:hover:not(:disabled) {
      background: linear-gradient(to bottom, #6922b8, #441285);
      box-shadow: 
        inset 0 1px 1px rgba(255,255,255,0.4),
        inset 0 10px 20px rgba(255,255,255,0.1),
        inset 0 -2px 5px rgba(0,0,0,0.4),
        0 6px 8px rgba(0,0,0,0.7),
        0 12px 20px rgba(170, 68, 255, 0.3);
    }
    .btn:active:not(:disabled) {
      background: linear-gradient(to bottom, #3a0d70, #4c148f);
      box-shadow: 
        inset 0 3px 8px rgba(0,0,0,0.8),
        inset 0 1px 2px rgba(0,0,0,0.4),
        0 1px 1px rgba(255,255,255,0.1);
      transform: translateY(4px);
    }
    
    .section-title {
      font-family: var(--font-heading);
      font-size: 20px;
      color: #fff;
      letter-spacing: 4px;
      text-transform: uppercase;
      border-left: 3px solid var(--accent);
      padding-left: 12px;
      margin-bottom: 24px;
      font-weight: 700;
    }

    input, select {
      font-family: var(--font-heading) !important;
      background: #080312 !important;
      color: #fff !important;
      border: 1px solid #221133 !important;
      border-top: 2px solid #000 !important;
      border-left: 2px solid #000 !important;
      border-radius: 2px !important;
      box-shadow: inset 0 2px 6px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.05);
      font-size: 14px;
      letter-spacing: 1px;
      padding: 10px 14px !important;
    }
    input:focus, select:focus {
      border-color: var(--accent) !important;
      box-shadow: inset 0 2px 6px rgba(0,0,0,0.8), 0 0 10px rgba(170, 68, 255, 0.4);
      outline: none;
    }
    
    .status-badge {
      background: #110822;
      border: 1px solid #331155;
      border-radius: 2px;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.05);
      font-family: var(--font-heading);
      letter-spacing: 1px;
      font-size: 12px;
    }
    .status-badge.active {
      background: #0d2a20;
      border-color: #00eeaa;
      color: #00eeaa;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.8), 0 0 10px rgba(0,238,170,0.2);
    }
    
    /* Table Sharpness */
    .data-table th {
      font-family: var(--font-heading);
      text-transform: uppercase;
      letter-spacing: 2px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      font-size: 13px;
    }
    .data-table td {
      border-bottom: 1px solid rgba(255,255,255,0.02);
    }
    .data-list::-webkit-scrollbar { display: block; width: 6px; }
    .data-list::-webkit-scrollbar-track { background: #070310; border-radius: 0; box-shadow: inset 0 0 5px rgba(0,0,0,1); }
    .data-list::-webkit-scrollbar-thumb { background: #3a0d70; border-radius: 0; border: 1px solid #5919a3; }
`
);

// Add the background elements
html = html.replace('<body>', `<body>
  <div class="bg-gradient"></div>
  <div class="sharp-shards">
    <div class="shard shard-1"></div>
    <div class="shard shard-2"></div>
    <div class="shard shard-3"></div>
  </div>
  <div class="crystal-overlay"></div>`);

fs.writeFileSync('public/admin-crystal.html', html);
console.log('admin-crystal.html rewritten!');
