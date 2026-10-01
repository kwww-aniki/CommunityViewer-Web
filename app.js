const STORAGE = 'communityviewer.web.v1';
const app = document.querySelector('#app');
const importFile = document.querySelector('#import-file');
let catalog = [];
let state = { tab: 'favorites', siteId: null, query: '', expandedSection: null, favorites: [] };
let toastTimer;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
}
function cleanUrl(value) {
  try {
    const url = new URL(String(value).trim());
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}
function urlKey(value) {
  const url = cleanUrl(value);
  return url ? url.replace(/\/$/, '').toLowerCase() : '';
}
function host(value) { try { return new URL(value).hostname; } catch { return ''; } }
function persist() {
  localStorage.setItem(STORAGE, JSON.stringify({favorites:state.favorites}));
}
function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) || '{}');
    if (Array.isArray(saved.favorites)) {
      const seen = new Set();
      state.favorites = saved.favorites.filter(item => {
        const key = urlKey(item.url);
        if (!key || seen.has(key) || typeof item.name !== 'string') return false;
        seen.add(key); return true;
      }).map(item => ({name:item.name.trim().slice(0,100),url:cleanUrl(item.url),group:String(item.group || '기타').slice(0,100)}));
    }
  } catch { /* Corrupt local data starts with an empty list. */ }
}
function notify(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}
function isSaved(url) { return state.favorites.some(item => urlKey(item.url) === urlKey(url)); }
function addFavorite(name, url, group) {
  const normalized = cleanUrl(url);
  if (!normalized) return notify('올바른 웹 주소를 입력해주세요.');
  if (isSaved(normalized)) return notify('이미 추가된 게시판입니다.');
  state.favorites.push({name:name.trim().slice(0,100),url:normalized,group:group || '기타'});
  persist(); render(); notify('즐겨찾기에 추가했습니다.');
}
function removeFavorite(url) {
  state.favorites = state.favorites.filter(item => urlKey(item.url) !== urlKey(url));
  persist(); render(); notify('즐겨찾기에서 제거했습니다.');
}
function openBoard(url) {
  const safe = cleanUrl(url);
  if (safe) window.open(safe, '_blank', 'noopener,noreferrer');
}
function intro(title, description) { return `<h1>${title}</h1><p class="lead">${description}</p>`; }
function renderFavorites() {
  let html = intro('즐겨찾기','자주 보는 게시판을 모아 빠르게 열어보세요.');
  if (!state.favorites.length) {
    html += `<div class="empty"><div class="empty-icon">☆</div>아직 추가한 게시판이 없습니다.<br>커뮤니티에서 원하는 게시판을 골라보세요.<div class="button-row" style="justify-content:center"><button class="primary" data-tab="explore" type="button">커뮤니티 둘러보기</button></div></div>`;
  } else {
    html += `<div class="favorite-list">${state.favorites.map((item,index) => `<div class="favorite-row" data-index="${index}"><button class="favorite-open" data-open="${escapeHtml(item.url)}" type="button"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.group)} · ${escapeHtml(host(item.url))}</small></button><button class="icon-button" data-remove="${escapeHtml(item.url)}" title="즐겨찾기 제거" aria-label="${escapeHtml(item.name)} 제거" type="button">×</button><button class="icon-button drag" data-drag="${index}" title="순서 변경" aria-label="${escapeHtml(item.name)} 순서 변경" type="button">☰</button></div>`).join('')}</div><p class="notice">☰ 손잡이를 끌어 순서를 바꿀 수 있습니다. 키보드에서는 손잡이에 초점을 두고 위·아래 방향키를 누르세요.</p>`;
  }
  return html;
}
function renderSiteList() {
  const query = state.query.trim().toLocaleLowerCase();
  const matches = catalog.filter(site => !query || site.name.toLocaleLowerCase().includes(query) || site.boards.some(board => board.name.toLocaleLowerCase().includes(query)));
  return intro('커뮤니티','사이트 → 구역 → 게시판 순서로 찾아보세요.') + `<input class="search" id="search" type="search" placeholder="사이트 또는 게시판 검색" value="${escapeHtml(state.query)}" aria-label="사이트 또는 게시판 검색"><h2>사이트 <span class="section-count">${matches.length}개</span></h2><div class="site-list">${matches.map(site => `<button class="card site-card" data-site="${escapeHtml(site.id)}" type="button"><span class="site-icon">◎</span><span class="site-text"><span class="site-name">${escapeHtml(site.name)}</span><span class="site-meta">${escapeHtml(site.group)} · 게시판 ${site.boards.length}개</span></span><span class="chevron">›</span></button>`).join('')}</div>${matches.length ? '' : '<div class="empty">검색 결과가 없습니다.</div>'}`;
}
function renderSite(site) {
  const query = state.query.trim().toLocaleLowerCase();
  const boards = site.boards.filter(board => !query || board.name.toLocaleLowerCase().includes(query) || site.name.toLocaleLowerCase().includes(query));
  const sections = new Map();
  for (const board of boards) {
    const name = board.section || '게시판';
    if (!sections.has(name)) sections.set(name, []);
    sections.get(name).push(board);
  }
  return `<button class="back" data-back type="button">‹ 전체 사이트</button>` + intro(escapeHtml(site.name), `${escapeHtml(site.group)} · 게시판 ${site.boards.length}개`) + `<input class="search" id="search" type="search" placeholder="${escapeHtml(site.name)} 게시판 검색" value="${escapeHtml(state.query)}" aria-label="게시판 검색">` + [...sections].map(([section,items],index) => {const expanded=sections.size===1 || Boolean(query) || state.expandedSection===index;return `<section class="section"><button class="section-toggle" data-section="${index}" type="button"><span>${escapeHtml(section)} <span class="section-count">${items.length}개</span></span><span>${expanded ? '⌄' : '›'}</span></button><div class="board-list" data-section-body="${index}" ${expanded ? '' : 'hidden'}>${items.map(board => `<div class="board-row"><button class="board-info" data-open="${escapeHtml(board.url)}" type="button"><span class="board-name">${escapeHtml(board.name)}</span><span class="board-meta">${escapeHtml(host(board.url))} ↗</span></button><button class="action ${isSaved(board.url) ? 'added' : ''}" data-toggle="${escapeHtml(board.url)}" data-name="${escapeHtml(board.name)}" data-group="${escapeHtml(site.name)}" type="button">${isSaved(board.url) ? '✓ 추가됨' : '+ 추가'}</button></div>`).join('')}</div></section>`}).join('') + (!sections.size ? '<div class="empty">검색 결과가 없습니다.</div>' : '');
}
function renderSettings() {
  return intro('더보기','웹버전 설정과 즐겨찾기 백업') + `<section class="settings-card"><h2>게시판 직접 추가</h2><p>목록에 없는 게시판의 주소를 입력하세요.</p><form id="manual-form"><label class="field">게시판 이름<input name="name" required maxlength="100" placeholder="예: 자유게시판"></label><label class="field">웹 주소<input name="url" required type="url" placeholder="https://example.com/board"></label><button class="primary" type="submit">즐겨찾기에 추가</button></form></section><section class="settings-card"><h2>즐겨찾기 백업</h2><p>Android 앱에서 내보낸 JSON 파일을 불러올 수 있습니다. 웹에서 내보낸 파일도 Android 앱에서 불러올 수 있습니다.</p><div class="button-row"><button class="secondary" data-export type="button">백업 파일 저장</button><button class="secondary" data-import type="button">백업 파일 불러오기</button></div><p class="notice">즐겨찾기는 현재 브라우저에 저장됩니다. 다른 기기에서는 백업 파일을 불러오세요.</p></section><section class="settings-card"><h2>웹버전 안내</h2><p>게시판을 누르면 원래 사이트가 새 탭에서 열립니다. 사이트 안의 광고 숨김과 글자 크기 조절은 Android 앱에서만 지원합니다.</p></section>`;
}
function render() {
  document.querySelectorAll('.nav-button').forEach(button => {button.classList.toggle('active',button.dataset.tab === state.tab); button.setAttribute('aria-current',button.dataset.tab === state.tab ? 'page' : 'false')});
  app.innerHTML = state.tab === 'favorites' ? renderFavorites() : state.tab === 'settings' ? renderSettings() : state.siteId ? renderSite(catalog.find(site => site.id === state.siteId)) : renderSiteList();
}
function selectTab(tab) { state.tab = tab; state.siteId = null; state.query = ''; state.expandedSection=null; render(); window.scrollTo(0,0); }
function exportBackup() {
  const boards = state.favorites.map((item,index) => ({id:Date.now()+index,name:item.name,url:item.url,group:item.group,isFavorite:true,showOnHome:true,isUserAdded:true}));
  const backup = {format:'CommunityViewerFavorites',version:1,createdAt:Date.now(),boards};
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
  link.download = 'CommunityViewerFavorites.json'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href),1000);
}
async function importBackup(file) {
  if (!file) return;
  try {
    if (file.size > 5_000_000) throw new Error('파일이 너무 큽니다.');
    const data = JSON.parse(await file.text());
    if (data.format !== 'CommunityViewerFavorites' || data.version !== 1 || !Array.isArray(data.boards)) throw new Error('지원하지 않는 백업 파일입니다.');
    const incoming = [];
    for (const item of data.boards) {
      const url = cleanUrl(item.url);
      if (!url || typeof item.name !== 'string' || !item.name.trim()) throw new Error('잘못된 게시판 정보가 있습니다.');
      if (!isSaved(url) && !incoming.some(board => urlKey(board.url) === urlKey(url))) incoming.push({name:item.name.trim().slice(0,100),url,group:String(item.group || '기타').slice(0,100)});
    }
    state.favorites.push(...incoming);persist(); render(); notify(`${incoming.length}개 게시판을 불러왔습니다.`);
  } catch(error) { notify(error.message || '백업 파일을 읽지 못했습니다.'); }
  importFile.value = '';
}
document.addEventListener('click',event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.tab) return selectTab(button.dataset.tab);
  if (button.hasAttribute('data-back')) {state.siteId=null;state.query='';state.expandedSection=null;render();return}
  if (button.dataset.site) {state.siteId=button.dataset.site;state.query='';state.expandedSection=null;render();window.scrollTo(0,0);return}
  if (button.dataset.open) return openBoard(button.dataset.open);
  if (button.dataset.toggle) return isSaved(button.dataset.toggle) ? removeFavorite(button.dataset.toggle) : addFavorite(button.dataset.name,button.dataset.toggle,button.dataset.group);
  if (button.dataset.remove) return removeFavorite(button.dataset.remove);
  if (button.dataset.section !== undefined) {const body=app.querySelector(`[data-section-body="${button.dataset.section}"]`);body.hidden=!body.hidden;state.expandedSection=body.hidden?null:Number(button.dataset.section);button.lastElementChild.textContent=body.hidden?'›':'⌄';return}
  if (button.hasAttribute('data-export')) return exportBackup();
  if (button.hasAttribute('data-import')) return importFile.click();
});
document.addEventListener('submit',event => {
  if (event.target.id !== 'manual-form') return;
  event.preventDefault(); const data = new FormData(event.target);
  const name = String(data.get('name') || '').trim(); const url = String(data.get('url') || '');
  if (name) {addFavorite(name,url,host(url) || '직접 추가');event.target.reset()}
});
document.addEventListener('input',event => {
  if (event.target.id !== 'search') return;
  state.query=event.target.value;
  const start=event.target.selectionStart;
  render(); const input=document.querySelector('#search');input.focus();input.setSelectionRange(start,start);
});
importFile.addEventListener('change',() => importBackup(importFile.files[0]));
document.addEventListener('keydown',event => {
  const handle=event.target.closest('[data-drag]');
  if (!handle || !['ArrowUp','ArrowDown'].includes(event.key)) return;
  event.preventDefault(); const index=Number(handle.dataset.drag);const target=index+(event.key==='ArrowUp'?-1:1);
  if (target<0 || target>=state.favorites.length) return;
  const [item]=state.favorites.splice(index,1);state.favorites.splice(target,0,item);persist();render();app.querySelector(`[data-drag="${target}"]`).focus();
});
document.addEventListener('pointerdown',event => {
  const handle=event.target.closest('[data-drag]'); if (!handle) return;
  const from=Number(handle.dataset.drag);let to=from;
  handle.setPointerCapture(event.pointerId);
  const onMove=move => {const row=document.elementFromPoint(move.clientX,move.clientY)?.closest('.favorite-row');if(row)to=Number(row.dataset.index)};
  const onEnd=() => {handle.removeEventListener('pointermove',onMove);handle.removeEventListener('pointerup',onEnd);handle.removeEventListener('pointercancel',onEnd);if(to!==from){const[item]=state.favorites.splice(from,1);state.favorites.splice(to,0,item);persist();render();notify('순서를 변경했습니다.')}};
  handle.addEventListener('pointermove',onMove);handle.addEventListener('pointerup',onEnd);handle.addEventListener('pointercancel',onEnd);
});
async function start() {
  loadSaved();
  try {const response=await fetch('catalog.json');if(!response.ok)throw new Error();catalog=await response.json()} catch {notify('게시판 목록을 불러오지 못했습니다. 다시 연결해주세요.');}
  render();
  if ('serviceWorker' in navigator && location.protocol==='https:') navigator.serviceWorker.register('sw.js').catch(()=>{});
}
start();
