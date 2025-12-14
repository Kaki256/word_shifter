// 静的フロントエンドで finder.py のロジックを再現します
const knownDicts = [
  'dictionary/kobuta.txt',
  'dictionary/ippan.txt'
];

const el = id => document.getElementById(id);

// Grid 定義
const GRID_ROWS = 5;
const GRID_COLS = 18;
const GRID_STORAGE_KEY_KEY = 'ws_alt_grid_key';
const GRID_STORAGE_KEY_VALUE = 'ws_alt_grid_value';

const defaultKeyGrid = [
  'ぱ＃ばだざが＃んわらやまはなたさかあ',
  'ぴ＃びぢじぎ＃＃＃り＃みひにちしきい',
  'ぷ＃びぢじぎ＃＃＃るゆむふぬつすくう',
  'ぺ＃べでぜげ＃＃＃れ＃めへねてせけえ',
  'ぽ＃ぼどぞご＃＃をろよもほのとそこお'
];

const defaultValueGrid = [
  'ぴ＃びぢじぎ＃あをりゆみひにちしきい',
  'ぷ＃ぶづずぐ＃＃＃る＃むふぬつすくう',
  'ぺ＃べでぜげ＃＃＃れよめへねてせけえ',
  'ぽ＃ぼどぞご＃＃＃ろ＃もほのとそこお',
  '＿＃＿だばざ＃＃んわらやまはなたさか'
];

function createGrid(containerId){
  const grid = el(containerId); if(!grid) return;
  grid.innerHTML = '';
  for(let r=0;r<GRID_ROWS;r++){
    for(let c=0;c<GRID_COLS;c++){
      const idx = r*GRID_COLS + c;
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.contentEditable = 'true';
      cell.dataset.index = String(idx);
      cell.addEventListener('input', ()=> saveGridToStorage(containerId));
      cell.addEventListener('blur', ()=> normalizeCell(cell));
      grid.appendChild(cell);
    }
  }
}

function normalizeCell(cell){
  let t = (cell.textContent || '').trim();
  if(t === ''){ cell.textContent = ''; return; }
  const ch = Array.from(t)[0];
  cell.textContent = ch;
}

function loadGridFromLines(containerId, lines){
  createGrid(containerId);
  const grid = el(containerId);
  const cells = Array.from(grid.children);
  const keyChars = getDefaultGridChars(defaultKeyGrid);
  for(let r=0;r<GRID_ROWS;r++){
    const line = lines[r] || '';
    const chars = Array.from(line);
    for(let c=0;c<GRID_COLS;c++){
      const i = r*GRID_COLS + c;
      const ch = chars[c] || '';
      // disabled is determined by key map (where key has #)
      const disabled = (keyChars[i] === '#' || keyChars[i] === '＃');
      cells[i].textContent = ch;
      if(disabled){
        cells[i].classList.add('disabled');
        cells[i].contentEditable = 'false';
        cells[i].setAttribute('aria-disabled','true');
        // always show block char for disabled cells
        cells[i].textContent = '＃';
      } else {
        cells[i].classList.remove('disabled');
        cells[i].contentEditable = 'true';
        cells[i].removeAttribute('aria-disabled');
      }
    }
  }
}

function saveGridToStorage(containerId){
  const grid = el(containerId); if(!grid) return;
  const cells = Array.from(grid.children);
  const lines = [];
  for(let r=0;r<GRID_ROWS;r++){
    const slice = cells.slice(r*GRID_COLS,(r+1)*GRID_COLS).map(c=>c.textContent || '').join('');
    lines.push(slice);
  }
  try{
    if(containerId === 'altGridKey') localStorage.setItem(GRID_STORAGE_KEY_KEY, JSON.stringify(lines));
    if(containerId === 'altGridValue') localStorage.setItem(GRID_STORAGE_KEY_VALUE, JSON.stringify(lines));
    // update unified alt CSV in localStorage to keep CSV/grid synchronized
    if(containerId === 'altGridValue'){
      try{ localStorage.setItem('ws_alt', buildAltFromTwoGrids()); }catch(err){ console.warn(err); }
      // also update textarea so CSV view reflects grid edits immediately
      const ta = el('altTextarea'); if(ta) ta.value = buildAltFromTwoGrids();
    }
  }catch(e){ console.warn(e); }
}

function loadGridFromStorageOrDefault(){
  let linesV = null;
  try{ const rawV = localStorage.getItem(GRID_STORAGE_KEY_VALUE); if(rawV) linesV = JSON.parse(rawV); }catch(err){ console.warn('Failed to load/parse grid from storage', err); linesV = null; }
  if(!linesV) linesV = defaultValueGrid;
  loadGridFromLines('altGridValue', linesV);
}

// Apply CSV text (src,dst rows) to the visible Value grid by matching keys from defaultKeyGrid
function applyCSVToValueGrid(csvText){
  if(!csvText) return;
  const map = new Map();
  csvText.split(/\r?\n/).forEach(line=>{
    const row = line.split(',').map(c=>c.trim());
    if(row.length>=2 && row[0] !== '') map.set(row[0], row[1]);
  });
  const gv = el('altGridValue'); if(!gv) return;
  const cells = Array.from(gv.children);
  const scan = getScanIndices();
  const keyChars = getDefaultGridChars(defaultKeyGrid);
  const n = Math.min(scan.length, cells.length, keyChars.length);
  for(let j=0;j<n;j++){
    const idx = scan[j];
    const k = keyChars[idx];
    // do not overwrite disabled cells (where key has '#')
    if(k === '#' || k === '＃'){
      cells[idx].classList.add('disabled');
      cells[idx].contentEditable = 'false';
      cells[idx].setAttribute('aria-disabled','true');
      // always show block char for disabled cells
      cells[idx].textContent = '＃';
      continue;
    }
    const v = map.has(k) ? map.get(k) : '';
    cells[idx].textContent = v;
    cells[idx].classList.remove('disabled');
    cells[idx].contentEditable = 'true';
    cells[idx].removeAttribute('aria-disabled');
    normalizeCell(cells[idx]);
  }
}

function getScanIndices(){
  const indices = [];
  for(let col = GRID_COLS - 1; col >= 0; col--){
    for(let row = 0; row < GRID_ROWS; row++){
      indices.push(row * GRID_COLS + col);
    }
  }
  return indices;
}

function getDefaultGridChars(gridArr){
  // return array of length GRID_ROWS*GRID_COLS in row-major order
  const chars = new Array(GRID_ROWS * GRID_COLS).fill('');
  for(let r=0;r<GRID_ROWS;r++){
    const row = gridArr[r] || '';
    const arr = Array.from(row);
    for(let c=0;c<GRID_COLS;c++){
      const i = r * GRID_COLS + c;
      chars[i] = arr[c] || '';
    }
  }
  return chars;
}

function setInputMode(mode){
  window._inputMode = mode;
  const grid = el('altGridValue'); const ta = el('altTextarea');
  if(mode === 'grid'){
    if(grid) grid.style.display = '';
    if(ta) ta.style.display = 'none';
  } else {
    if(grid) grid.style.display = 'none';
    if(ta) ta.style.display = '';
  }
}

function buildAltFromTwoGrids(){
  const gv = el('altGridValue'); if(!gv) return '';
  const cells = Array.from(gv.children);
  const scan = getScanIndices();
  const keyChars = getDefaultGridChars(defaultKeyGrid);
  const rows = [];
  const n = Math.min(scan.length, cells.length, keyChars.length);
  for(let j=0;j<n;j++){
    const idx = scan[j];
    const k = keyChars[idx];
    if(!k || k === '#' || k === '＃') continue;
    const v = (cells[idx] && (cells[idx].textContent || '').trim()) || '';
    const dest = (!v || v === '#' || v === '＃') ? '？' : v;
    rows.push(`${k},${dest}`);
  }
  return rows.join('\n');
}

function downloadAltCSVText(text, filename='alt.csv'){
  const blob = new Blob([text],{type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

async function fetchIfExists(url){
  try{
    const r = await fetch(url);
    if(!r.ok) return null;
    return await r.text();
  }catch(err){
    console.debug('fetchIfExists error', err);
    return null;
  }
}

function parseDict(text){
  const s = new Set();
  text.split(/\r?\n/).forEach(l=>{
    const w = l.trim(); if(w) s.add(w);
  });
  return s;
}

function parseAlt(csvText){
  const map = new Map();
  csvText.split(/\r?\n/).forEach(line=>{
    const row = line.split(',').map(c=>c.trim());
    if(row.length>=2 && row[0]!==''){
      map.set(row[0], row[1]);
    }
  });
  return map;
}

function findPairs(wordSet, charMap){
  const pairs = [];
  for(const w of wordSet){
    let out = '';
    for(const ch of w){ out += (charMap.has(ch)? charMap.get(ch) : ch); }
    if(wordSet.has(out)) pairs.push([w,out]);
  }
  pairs.sort((a,b)=> b[0].length - a[0].length);
  return pairs;
}

function showStatus(s){ el('status').textContent = s; }

function renderResults(pairs){
  const tbody = el('resultsTable').querySelector('tbody'); tbody.innerHTML = '';
  pairs.forEach(p=>{
    const tr = document.createElement('tr');
    const td1 = document.createElement('td'); td1.textContent = p[0];
    const td2 = document.createElement('td'); td2.textContent = p[1];
    tr.appendChild(td1); tr.appendChild(td2); tbody.appendChild(tr);
  });
}

function downloadCSV(pairs){
  const rows = pairs.map(p => `${p[0]},${p[1]}`);
  const blob = new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'results.csv';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// Pagination: show page of pairs (10 per page)
const PAGE_SIZE = 10;
function showPage(page){
  const pairs = window._lastPairs || [];
  const total = pairs.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  let p = Number(page) || 1; if(p < 1) p = 1; if(p > totalPages) p = totalPages;
  window._ws_page = p;
  const start = (p-1) * PAGE_SIZE;
  const slice = pairs.slice(start, start + PAGE_SIZE);
  renderResults(slice);
  // update controls
  const info = `${p} / ${totalPages}`;
  const pageInfoEl = el('pageInfo'); if(pageInfoEl) pageInfoEl.textContent = info;
  const prev = el('prevPageBtn'); const next = el('nextPageBtn');
  if(prev) prev.disabled = (p <= 1);
  if(next) next.disabled = (p >= totalPages);
  // handle jump buttons
  const back10 = el('back10Btn'); const back100 = el('back100Btn');
  const fwd10 = el('fwd10Btn'); const fwd100 = el('fwd100Btn');
  if(back10) back10.disabled = (p <= 1);
  if(back100) back100.disabled = (p <= 1);
  if(fwd10) fwd10.disabled = (p >= totalPages);
  if(fwd100) fwd100.disabled = (p >= totalPages);
}

function changePageBy(offset){
  const pairs = window._lastPairs || [];
  const total = pairs.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  let newPage = Number(window._ws_page || 1) + Number(offset || 0);
  // normalize: clamp between 1 and totalPages
  if(newPage < 1) newPage = 1;
  if(newPage > totalPages) newPage = totalPages;
  showPage(newPage);
}

async function init(){
  // 辞書候補のうち存在するものだけ列挙
  const select = el('dictSelect');
  for(const p of knownDicts){
    const text = await fetchIfExists(p);
    if(text!==null){
      const opt = document.createElement('option'); opt.value = p; opt.textContent = p.replace(/^dictionary\//,'');
      select.appendChild(opt);
    }
  }
  // グリッドを読み込む（localStorage or default）
  loadGridFromStorageOrDefault();

  // ページネーション初期化
  el('back100Btn').addEventListener('click', ()=> changePageBy(-100));
  el('back10Btn').addEventListener('click', ()=> changePageBy(-10));
  el('prevPageBtn').addEventListener('click', ()=> changePageBy(-1));
  el('nextPageBtn').addEventListener('click', ()=> changePageBy(1));
  el('fwd10Btn').addEventListener('click', ()=> changePageBy(10));
  el('fwd100Btn').addEventListener('click', ()=> changePageBy(100));
  window._ws_page = 1;

  // input mode selector
  const modeSel = el('inputModeSelect');
  if(modeSel){
    modeSel.addEventListener('change', ()=> setInputMode(modeSel.value));
  }
  // default mode
  setInputMode('grid');
  // initialize unified alt CSV and sync representations
  const storedAlt = localStorage.getItem('ws_alt');
  if(storedAlt){
    // populate textarea and apply to grid
    const ta = el('altTextarea'); if(ta) ta.value = storedAlt;
    applyCSVToValueGrid(storedAlt);
    // ensure grid storage matches
    saveGridToStorage('altGridValue');
  } else {
    // no stored alt: set default CSV from defaults and persist
    const keyGridChars = getDefaultGridChars(defaultKeyGrid);
    const valChars = getDefaultGridChars(defaultValueGrid);
    const rows = [];
    const scan = getScanIndices();
    const n = Math.min(scan.length, keyGridChars.length, valChars.length);
    for(let j=0;j<n;j++){
      const idx = scan[j];
      const k = keyGridChars[idx]; if(!k || k==='＃' || k==='#') continue;
      const v = valChars[idx] || '？'; rows.push(`${k},${v}`);
    }
    const defaultCsv = rows.join('\n');
    try{ localStorage.setItem('ws_alt', defaultCsv); }catch(e){}
    const ta = el('altTextarea'); if(ta) ta.value = defaultCsv;
    // grid was already loaded from defaultValueGrid by loadGridFromStorageOrDefault
  }

  // textarea <-> grid synchronization
  const ta = el('altTextarea');
  if(ta){
    ta.addEventListener('input', ()=>{
      try{ localStorage.setItem('ws_alt', ta.value); }catch(e){}
      applyCSVToValueGrid(ta.value);
      saveGridToStorage('altGridValue');
    });
  }

  showStatus('辞書とグリッドが読み込まれました。編集は自動で同期されます。');
}

// load/reset/save buttons removed — CSV <-> Grid は双方向で自動同期します

el('downloadAltBtn').addEventListener('click', ()=>{
  if(window._inputMode === 'csv'){
    downloadAltCSVText(el('altTextarea').value || '', 'alt.csv');
  } else {
    const csv = buildAltFromTwoGrids();
    downloadAltCSVText(csv, 'alt.csv');
  }
});

el('loadDictBtn').addEventListener('click', async ()=>{
  const sel = el('dictSelect').value; const txt = await fetchIfExists(sel);
  if(!txt) showStatus('辞書が読み込めませんでした。'); else showStatus(`${sel} を読み込みました。`);
});

el('runBtn').addEventListener('click', async ()=>{
  const sel = el('dictSelect').value; if(!sel){ showStatus('辞書を選んでください'); return; }
  showStatus('処理中...');
  const dictText = await fetchIfExists(sel);
  if(dictText===null){ showStatus('辞書を読み込めませんでした'); return; }
  const wordSet = parseDict(dictText);
  // グリッドがある場合は Value グリッドと内部の Key マップから CSV を生成して優先的に使う
  let charMap;
  if(el('altGridValue')){
    const csv = buildAltFromTwoGrids();
    charMap = parseAlt(csv);
  } else {
    charMap = parseAlt(el('altTextarea').value || '');
  }
  const pairs = findPairs(wordSet, charMap);
  // store and show first page
  window._lastPairs = pairs;
  window._ws_page = 1;
  showPage(1);
  showStatus(`見つかったペア: ${pairs.length} 組`);
});

el('downloadBtn').addEventListener('click', ()=>{
  if(!window._lastPairs) { showStatus('先に検索を実行してください'); return; }
  downloadCSV(window._lastPairs);
});

init();
