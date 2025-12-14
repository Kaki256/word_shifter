// 静的フロントエンドで finder.py のロジックを再現します
const knownDicts = [
  'dictionary/kobuta.txt',
  'dictionary/ippan.txt'
];

const el = id => document.getElementById(id);

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
  // alt.csv はまず localStorage を参照し、なければリポジトリ上の alt.csv を取得
  const storageKey = 'ws_alt';
  const localAlt = localStorage.getItem(storageKey);
  if(localAlt !== null){
    el('altTextarea').value = localAlt;
  } else {
    const altText = await fetchIfExists('alt.csv');
    if(altText!==null) el('altTextarea').value = altText;
  }

  // textarea の変更は localStorage に保存
  const saveAlt = () => { localStorage.setItem(storageKey, el('altTextarea').value); };
  el('altTextarea').addEventListener('input', saveAlt);

  showStatus('辞書とaltが読み込まれました。編集は自動で保存されます。');
}

el('loadAltBtn').addEventListener('click', async ()=>{
  const txt = await fetchIfExists('alt.csv');
  if(txt===null) {
    showStatus('alt.csv が見つかりませんでした。');
  } else {
    el('altTextarea').value = txt;
    try{ localStorage.setItem('ws_alt', txt); }catch(err){ console.warn('localStorage set failed', err); }
    showStatus('alt.csv を読み込み、保存しました。');
  }
});

el('resetAltBtn').addEventListener('click', ()=>{
  const sample = 'A,Ａ\na,ａ\nｦ,ヲ';
  el('altTextarea').value = sample;
  try{ localStorage.setItem('ws_alt', sample); }catch(err){ console.warn('localStorage set failed', err); }
  showStatus('サンプルにリセットしました（保存済み）。');
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
  const charMap = parseAlt(el('altTextarea').value || '');
  const pairs = findPairs(wordSet, charMap);
  renderResults(pairs);
  showStatus(`見つかったペア: ${pairs.length} 組`);
  // store for download
  window._lastPairs = pairs;
});

el('downloadBtn').addEventListener('click', ()=>{
  if(!window._lastPairs) { showStatus('先に検索を実行してください'); return; }
  downloadCSV(window._lastPairs);
});

init();
