/* =========================================================
   MI BIBLIOTECA — app de lectura para iPad
   Solo fuentes legales y gratuitas:
     · Project Gutenberg (dominio publico) — texto completo dentro de la app
     · Open Library / Internet Archive — libros modernos en prestamo gratuito
   ========================================================= */

const GENEROS = [
  {id:'crecimiento', em:'🌱', n:'Crecimiento personal',  d:'Hábitos, carácter, disciplina y sabiduría práctica.',
   ol:['self-help','conduct of life','personal development']},
  {id:'liderazgo',   em:'🎯', n:'Liderazgo y equipos',   d:'Dirigir, motivar e influir en las personas.',
   ol:['leadership','management','teams in the workplace']},
  {id:'neurociencia',em:'🧠', n:'Neurociencia y mente',  d:'Cómo funcionan el cerebro, la memoria y las decisiones.',
   ol:['neuroscience','brain','cognitive psychology']},
  {id:'ia_negocios', em:'🤖', n:'IA aplicada a negocios',d:'Inteligencia artificial y datos puestos a trabajar en la empresa.',
   ol:['artificial intelligence','machine learning','business intelligence']},
  {id:'historias',   em:'⭐', n:'Historias que inspiran',d:'Vidas reales que muestran cómo una historia personal deja huella.',
   ol:['biography','autobiography']},
  {id:'romantico',   em:'💗', n:'Romántico',             d:'Grandes historias de amor, de las clásicas a las de hoy.',
   ol:['love stories','romance']},
  {id:'fabulas',     em:'🦊', n:'Fábulas y moralejas',   d:'Historias cortas que dejan enseñanza. Se leen en diez minutos.',
   ol:['fables','conduct of life']},
  {id:'cuentos',     em:'📜', n:'Cuentos y leyendas',    d:'Relatos breves para leer de uno en uno.',
   ol:['short stories','fairy tales']},
  {id:'negocios',    em:'💼', n:'Negocios y economía',   d:'La empresa, el dinero y los mercados.',
   ol:['business','economics','entrepreneurship']},
  {id:'clasicos',    em:'📖', n:'Clásicos imprescindibles', d:'Los libros que todo lector quiere haber leído.',
   ol:['classic literature']},
];
const GMAP = Object.fromEntries(GENEROS.map(g => [g.id, g]));

/* ---------------- estado guardado ---------------- */
const LS = 'biblioteca_v1';
let E = {fav:[], prog:{}, fin:[], desc:[], tema:'claro', lec:'claro', tipo:'serif', fs:19};
try { Object.assign(E, JSON.parse(localStorage.getItem(LS) || '{}')); } catch(e){}
const guardar = () => { try { localStorage.setItem(LS, JSON.stringify(E)); } catch(e){} };

/* ---------------- almacen offline (IndexedDB) ---------------- */
const DB = {
  _p:null,
  abrir(){
    if (this._p) return this._p;
    this._p = new Promise((ok,err)=>{
      const r = indexedDB.open('biblioteca', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('textos');
      r.onsuccess = () => ok(r.result);
      r.onerror  = () => err(r.error);
    }).catch(()=>null);
    return this._p;
  },
  async get(k){ const db = await this.abrir(); if(!db) return null;
    return new Promise(ok=>{ const q = db.transaction('textos').objectStore('textos').get(k);
      q.onsuccess=()=>ok(q.result||null); q.onerror=()=>ok(null); }); },
  async set(k,v){ const db = await this.abrir(); if(!db) return false;
    return new Promise(ok=>{ const t = db.transaction('textos','readwrite');
      t.objectStore('textos').put(v,k); t.oncomplete=()=>ok(true); t.onerror=()=>ok(false); }); },
  async del(k){ const db = await this.abrir(); if(!db) return;
    db.transaction('textos','readwrite').objectStore('textos').delete(k); },
};

/* ---------------- utilidades ---------------- */
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sinAcento = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
let tToast;
function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(tToast); tToast = setTimeout(()=>t.classList.remove('on'), 2600);
}
const COLORES = ['#3f5d4a','#7a2f2f','#4a5568','#6b4423','#2f4858','#5c3a4e','#3d5a6c','#6b5b2f','#4a3b5c','#2f5a52'];
const colorDe = s => COLORES[Math.abs([...String(s)].reduce((a,c)=>a*31+c.charCodeAt(0)|0,7)) % COLORES.length];

let LIBROS = [], PORGEN = {}, AUTORES = [], MODERNOS = {}, ABIERTOS = {};

/* =========================================================
   TARJETAS
   ========================================================= */
function tapa(b){
  const col = colorDe(b.t + b.a);
  const img = b.cov ? `<img src="${esc(b.cov)}" loading="lazy" alt="" onerror="this.style.display='none'">` : '';
  return `<div class="tapa" style="background:${col}">
    <div class="gen"><b>${esc(b.t)}</b><span>${esc(b.a)}</span></div>${img}
    ${b.facil ? '<span class="insignia">Fácil</span>' : ''}
  </div>`;
}
function tarjeta(b){
  const p = E.prog[b.id];
  const barra = p && p.p > 0.01 ? `<div class="barrita"><i style="width:${Math.round(p.p*100)}%"></i></div>` : '';
  return `<button class="libro" data-id="${esc(b.id)}">${tapa(b)}
    <h4>${esc(b.t)}</h4><p>${esc(b.a)}</p>${barra}</button>`;
}
function tarjetaOL(b){
  return `<button class="libro" data-ol='${esc(JSON.stringify(b))}'>
    <div class="tapa" style="background:${colorDe(b.t+b.a)}">
      <div class="gen"><b>${esc(b.t)}</b><span>${esc(b.a)}</span></div>
      ${b.cov?`<img src="${esc(b.cov)}" loading="lazy" alt="" onerror="this.style.display='none'">`:''}
      <span class="insignia">${b.oa?'Gratis':(b.libre?'Libre':'Préstamo')}</span></div>
    <h4>${esc(b.t)}</h4><p>${esc(b.a)}${b.anio?' · '+b.anio:''}</p></button>`;
}
function rejilla(libros, vacio='Sin resultados'){
  if (!libros.length) return `<div class="vacio"><span class="em">🔍</span>${vacio}</div>`;
  return `<div class="rejilla">${libros.map(tarjeta).join('')}</div>`;
}
function carrusel(libros){ return `<div class="carrusel">${libros.map(tarjeta).join('')}</div>`; }

/* =========================================================
   PANTALLAS
   ========================================================= */
const TABS = [
  {id:'inicio',  n:'Inicio'},
  {id:'generos', n:'Géneros'},
  {id:'autores', n:'Autores'},
  {id:'mia',     n:'Mi estantería'},
];
function pintarTabs(activo){
  $('#tabs').innerHTML = TABS.map(t =>
    `<button class="tab ${t.id===activo?'on':''}" data-tab="${t.id}">${t.n}</button>`).join('');
}
function verSeccion(id){
  $$('section').forEach(s => s.classList.toggle('on', s.id === 's-'+id));
  if (TABS.some(t=>t.id===id)) pintarTabs(id);
  window.scrollTo({top:0});
}

/* ---------- INICIO ---------- */
function pintarInicio(){
  let h = '';
  const leyendo = Object.entries(E.prog)
    .filter(([id,p]) => p.p > 0.005 && p.p < 0.985)
    .sort((a,b) => b[1].fecha - a[1].fecha)
    .map(([id]) => LIBROS.find(l => l.id == id)).filter(Boolean).slice(0,12);

  if (leyendo.length){
    h += `<div class="fila-tit"><h2>Seguir leyendo</h2></div>` + carrusel(leyendo);
  } else {
    h += `<h1 class="titulo">Buenas lecturas 👋</h1>
      <p class="sub">${LIBROS.length} libros completos y gratuitos, listos para leer aquí mismo — sin cuentas, sin pagos y sin internet una vez descargados.</p>`;
  }

  const faciles = LIBROS.filter(b => b.facil && b.l === 'es' && b.d >= 500)
    .sort((a,b)=>a.chars-b.chars).slice(0,18);
  if (faciles.length) h += `<div class="fila-tit"><h2>Para leer en un rato</h2>
    <button data-gen="__faciles">Ver todo</button></div>` + carrusel(faciles);

  GENEROS.forEach(g => {
    const mod = (MODERNOS[g.id]||[]).slice(0,8);
    const abi = (ABIERTOS[g.id]||[]).slice(0, mod.length ? 4 : 10);
    const cla = (PORGEN[g.id]||[]).slice(0,14);
    if (!mod.length && !abi.length && !cla.length) return;
    h += `<div class="fila-tit"><h2>${g.em} ${g.n}</h2><button data-gen="${g.id}">Ver todo</button></div>`
       + `<div class="carrusel">${mod.map(tarjetaOL).join('') + cla.map(tarjeta).join('')
            + abi.map(tarjetaOL).join('')}</div>`;
  });
  $('#s-inicio').innerHTML = h;
}

/* ---------- GENEROS ---------- */
function pintarGeneros(){
  $('#s-generos').innerHTML = `<h1 class="titulo">Géneros</h1>
    <p class="sub">Elige un estante. Dentro puedes filtrar por idioma, por lectura fácil y buscar libros modernos en préstamo gratuito.</p>
    <div class="generos">${GENEROS.map(g => {
      const n = (PORGEN[g.id]||[]).length;
      return `<button class="gcard" data-gen="${g.id}"><span class="em">${g.em}</span>
        <span><b>${g.n}</b><small>${g.d}</small>
        <small style="margin-top:4px;opacity:.8">${n ? n+' libros completos' : 'Libros modernos en préstamo'}</small></span></button>`;
    }).join('')}</div>`;
}

/* ---------- UN GENERO ---------- */
let FG = {gen:null, idioma:'todos', facil:false, orden:'pop'};
let ANTERIOR = 'inicio';
function abrirGenero(gen){
  ANTERIOR = $$('section.on').map(s=>s.id.replace('s-',''))[0] || 'inicio';
  if (ANTERIOR === 'genero' || ANTERIOR === 'resultados') ANTERIOR = 'inicio';
  FG = {gen, idioma:'todos', facil:false, orden:'pop'};
  verSeccion('genero'); pintarGenero();
}
function pintarGenero(){
  const esFacil = FG.gen === '__faciles';
  const g = esFacil ? {em:'⚡', n:'Para leer en un rato', d:'Libros cortos y sencillos: los terminas en una o dos sentadas.', ol:[]} : GMAP[FG.gen];
  let libros = esFacil ? LIBROS.filter(b=>b.facil) : (PORGEN[FG.gen]||[]).slice();

  if (FG.idioma !== 'todos') libros = libros.filter(b => b.l === FG.idioma);
  if (FG.facil) libros = libros.filter(b => b.facil);
  libros.sort(FG.orden === 'pop' ? (a,b)=>b.d-a.d
            : FG.orden === 'az'  ? (a,b)=>a.t.localeCompare(b.t)
            : (a,b)=>a.chars-b.chars);

  const mod = (MODERNOS[FG.gen] || []);
  const abi = (ABIERTOS[FG.gen] || []);
  const hayClasicos = (esFacil ? LIBROS.filter(b=>b.facil) : (PORGEN[FG.gen]||[])).length > 0;
  const chip = (k,v,txt) => `<button class="chip ${FG[k]==v?'on':''}" data-f="${k}" data-v="${v}">${txt}</button>`;
  $('#s-genero').innerHTML = `
    <button class="chip" data-volver="1" style="margin:2px 0 14px">‹ Volver</button>
    <h1 class="titulo">${g.em} ${g.n}</h1>
    <p class="sub">${g.d}</p>
    ${hayClasicos ? `<div class="filtros">
      ${chip('idioma','todos','Todos los idiomas')}${chip('idioma','es','Español')}${chip('idioma','en','Inglés')}
      <button class="chip ${FG.facil?'on':''}" data-f="facil" data-v="tog">⚡ Cortos</button>
      ${chip('orden','pop','Más leídos')}${chip('orden','az','A–Z')}${chip('orden','corto','Más breves')}
    </div>
    <p class="sub">${libros.length} ${libros.length===1?'libro completo':'libros completos'} para leer aquí mismo.</p>
    ${rejilla(libros, 'Ningún libro con esos filtros. Prueba quitando alguno.')}` : `
    <div class="aviso" style="border-left-color:var(--verde)">Este tema es moderno: no hay clásicos de dominio público que lo traten. Abajo están las opciones <b>gratuitas y legales</b> que sí existen.</div>`}
    ${mod.length || (g.ol && g.ol.length) ? `
      <div class="fila-tit"><h2>Libros modernos (préstamo gratuito)</h2></div>
      <div class="aviso">Títulos actuales de <b>Internet Archive</b>, la biblioteca digital sin fines de lucro. Se leen gratis: unos son de lectura libre y otros se prestan por 1 hora renovable, con una cuenta gratuita. Es préstamo legal, igual que en una biblioteca pública.</div>
      ${mod.length ? `<div class="rejilla">${mod.map(tarjetaOL).join('')}</div>` : ''}
      <div style="text-align:center;margin:22px 0 0">
        <button class="chip" id="bMas">🔎 Buscar más títulos modernos</button></div>
      <div id="vivo"></div>` : ''}
    ${abi.length ? `
      <div class="fila-tit"><h2>Acceso abierto (descarga libre)</h2></div>
      <div class="aviso">Libros académicos que sus editoriales publican <b>gratis y completos</b> en PDF: se descargan sin cuenta y sin pagar. Son más técnicos, y casi todos están en inglés.</div>
      <div class="rejilla">${abi.map(tarjetaOL).join('')}</div>` : ''}`;
  const bm = $('#bMas');
  if (bm) bm.onclick = () => {
    bm.style.display = 'none';
    $('#vivo').innerHTML = '<div class="cargando"><div class="spin"></div><div>Buscando…</div></div>';
    buscarVivo(g.ol || [], $('#vivo'));
  };
  window.scrollTo({top:0});
}

/* ---------- OPEN LIBRARY (libros modernos) ---------- */
async function olBuscar(consulta, limite=24){
  const url = 'https://openlibrary.org/search.json?q=' + encodeURIComponent(consulta) +
    '&fields=title,author_name,first_publish_year,ia,ebook_access,cover_i,key,language&limit=' + limite;
  const r = await fetch(url);
  if (!r.ok) throw new Error('OL ' + r.status);
  const d = await r.json();
  return (d.docs||[])
    .filter(b => b.ebook_access === 'borrowable' || b.ebook_access === 'public')
    .map(b => ({
      id: 'ol' + (b.key||'').split('/').pop(),
      t: b.title || 'Sin título',
      a: (b.author_name||['Autor desconocido'])[0],
      anio: b.first_publish_year || '',
      cov: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : '',
      ia: (b.ia||[])[0] || '',
      libre: b.ebook_access === 'public',
      vivo: true,
    }));
}
async function buscarVivo(temas, cont){
  if (!cont) return;
  try{
    const q = temas.map(t=>`subject:"${t}"`).join(' OR ');
    let libros = await olBuscar(`(${q}) AND language:spa`, 24);
    if (libros.length < 6){
      const mas = await olBuscar(`(${q}) AND language:eng`, 24);
      libros = libros.concat(mas);
    }
    const vistos = new Set();
    libros = libros.filter(b => !vistos.has(b.t) && vistos.add(b.t)).slice(0,24);
    cont.innerHTML = libros.length
      ? `<div class="rejilla" style="margin-top:18px">${libros.map(tarjetaOL).join('')}</div>`
      : `<div class="vacio">No encontramos más títulos disponibles ahora mismo.</div>`;
  }catch(e){
    cont.innerHTML = `<div class="vacio">No se pudo conectar con Internet Archive. Revisa tu conexión e inténtalo de nuevo.</div>`;
  }
}

/* ---------- AUTORES ---------- */
function pintarAutores(filtro=''){
  const f = sinAcento(filtro);
  const lista = AUTORES.filter(a => !f || sinAcento(a.n).includes(f));
  $('#s-autores').innerHTML = `<h1 class="titulo">Autores</h1>
    <p class="sub">${AUTORES.length} autores con obra completa disponible.</p>
    <div class="campo" style="margin-bottom:14px"><span>🔍</span>
      <input id="qAutor" type="search" placeholder="Buscar autor…" value="${esc(filtro)}"></div>
    ${lista.slice(0,400).map(a => `<button class="autor" data-autor="${esc(a.n)}">
      <span class="ini">${esc(a.n.trim()[0]||'?')}</span>
      <span><b>${esc(a.n)}</b><small>${a.libros.map(b=>b.t).slice(0,2).join(' · ')}</small></span>
      <span class="n">${a.libros.length} ›</span></button>`).join('') ||
      '<div class="vacio">Sin autores con ese nombre</div>'}`;
  const inp = $('#qAutor');
  if (inp){ inp.oninput = () => { const v = inp.value; pintarAutores(v);
      const n = $('#qAutor'); n.focus(); n.setSelectionRange(v.length, v.length); }; }
}
function verAutor(nombre){
  const a = AUTORES.find(x => x.n === nombre); if (!a) return;
  const act = $$('section.on').map(s=>s.id.replace('s-',''))[0];
  if (act && act !== 'resultados') ANTERIOR = act;
  $('#s-resultados').innerHTML = `<button class="chip" data-volver="1" style="margin:2px 0 14px">‹ Volver</button>
    <h1 class="titulo">${esc(a.n)}</h1>
    <p class="sub">${a.libros.length} ${a.libros.length===1?'libro':'libros'} en la biblioteca${a.ay?' · '+esc(a.ay):''}</p>
    ${rejilla(a.libros.sort((x,y)=>y.d-x.d))}`;
  verSeccion('resultados');
}

/* ---------- MI ESTANTERIA ---------- */
function pintarMia(){
  const porId = id => LIBROS.find(l => l.id == id);
  const leyendo = Object.entries(E.prog).filter(([,p])=>p.p>0.005&&p.p<0.985)
    .sort((a,b)=>b[1].fecha-a[1].fecha).map(([id])=>porId(id)).filter(Boolean);
  const favs = E.fav.map(porId).filter(Boolean);
  const desc = E.desc.map(porId).filter(Boolean);
  const fin  = E.fin.map(porId).filter(Boolean);
  const bloque = (t, arr, vacio) => arr.length
    ? `<div class="fila-tit"><h2>${t}</h2></div>${rejilla(arr)}`
    : `<div class="fila-tit"><h2>${t}</h2></div><div class="vacio" style="padding:26px">${vacio}</div>`;
  const pendientes = LIBROS.filter(b => !E.desc.includes(b.id));
  const mbTotal = Math.round(LIBROS.reduce((a,b)=>a+b.chars,0) / 1048576);
  const mbFalta = Math.round(pendientes.reduce((a,b)=>a+b.chars,0) / 1048576);
  $('#s-mia').innerHTML = `<h1 class="titulo">Mi estantería</h1>
    <p class="sub">Todo se guarda en este iPad. Nadie más lo ve.</p>
    <div class="aviso" style="border-left-color:var(--verde)">
      <b>Llevar la biblioteca conmigo.</b> Descarga los ${LIBROS.length} libros al iPad
      y podrás leerlos en el avión, en la playa o sin datos. Ocupan unos ${mbTotal} MB.
      ${desc.length ? `<br>Ya tienes <b>${desc.length}</b> guardados.` : ''}
      <div style="margin-top:12px" id="zonaTodo">
        ${pendientes.length
          ? `<button class="btn" style="max-width:320px" id="bTodo">⬇️ Descargar los ${pendientes.length} que faltan (${mbFalta} MB)</button>`
          : '<b style="color:var(--verde)">✓ Biblioteca completa en este iPad</b>'}
      </div>
    </div>
    ${bloque('📖 Leyendo ahora', leyendo, 'Aún no empiezas ningún libro.')}
    ${bloque('❤️ Favoritos', favs, 'Marca libros con el corazón para verlos aquí.')}
    ${bloque('⬇️ Descargados (sin internet)', desc, 'Descarga libros para leerlos sin conexión.')}
    ${bloque('✅ Terminados', fin, 'Los libros que completes aparecerán aquí.')}`;

  const bt = $('#bTodo');
  if (bt) bt.onclick = () => descargarTodo(pendientes);
}

/* ---------- llevarse toda la biblioteca ---------- */
let bajandoTodo = false;
async function descargarTodo(pendientes){
  if (bajandoTodo){ bajandoTodo = false; return; }
  bajandoTodo = true;
  const zona = $('#zonaTodo');
  let hechos = 0, fallos = 0;
  for (const b of pendientes){
    if (!bajandoTodo) break;
    if (zona) zona.innerHTML = `<b>Descargando ${hechos+1} de ${pendientes.length}…</b>
      <div class="barrita" style="height:6px;margin:10px 0">
        <i style="width:${Math.round(hechos/pendientes.length*100)}%"></i></div>
      <div style="font-size:13px">${esc(b.t)}</div>
      <button class="chip" style="margin-top:10px" id="bParar">Parar</button>`;
    const parar = $('#bParar');
    if (parar) parar.onclick = () => { bajandoTodo = false; };
    const txt = await traerTexto(b);
    if (txt && await DB.set(b.id, txt)){
      if (!E.desc.includes(b.id)) E.desc.unshift(b.id);
      hechos++; guardar();
    } else { fallos++; }
  }
  bajandoTodo = false;
  toast(fallos ? `Se guardaron ${hechos}. ${fallos} no se pudieron bajar.`
               : `Listo: ${hechos} libros guardados en el iPad`);
  pintarMia();
}

/* ---------- BUSCAR ---------- */
let tBusca;
async function buscar(q){
  const f = sinAcento(q).trim();
  if (f.length < 2){ verSeccion('inicio'); return; }
  const res = LIBROS.filter(b => sinAcento(b.t).includes(f) || sinAcento(b.a).includes(f))
    .sort((a,b)=>b.d-a.d).slice(0,80);
  $('#s-resultados').innerHTML = `<h1 class="titulo">“${esc(q)}”</h1>
    <p class="sub">${res.length} ${res.length===1?'resultado':'resultados'} en los libros completos</p>
    ${rejilla(res, 'Ningún clásico coincide.<br>Mira abajo en libros modernos.')}
    <div class="fila-tit"><h2>Libros modernos (préstamo gratuito)</h2></div>
    <div id="vivo"><div class="cargando"><div class="spin"></div><div>Buscando…</div></div></div>`;
  verSeccion('resultados');
  try{
    const libros = await olBuscar(q, 24);
    const c = $('#vivo');
    if (c) c.innerHTML = libros.length
      ? `<div class="rejilla">${libros.map(tarjetaOL).join('')}</div>`
      : '<div class="vacio">Sin títulos modernos para esa búsqueda.</div>';
  }catch(e){
    const c = $('#vivo'); if (c) c.innerHTML = '<div class="vacio">Sin conexión con Internet Archive.</div>';
  }
}

/* =========================================================
   FICHA DEL LIBRO
   ========================================================= */
let LIBRO_ACTUAL = null;
function cerrarFicha(){ $('#ficha').classList.remove('on'); $('#velo').classList.remove('on'); }
function abrirFicha(b){
  LIBRO_ACTUAL = b;
  const p = E.prog[b.id];
  const fav = E.fav.includes(b.id);
  const bajado = E.desc.includes(b.id);
  const gens = (b.g||[]).map(g => GMAP[g] ? `<span class="meta">${GMAP[g].em} ${GMAP[g].n}</span>` : '').join('');
  const mins = b.chars ? Math.max(5, Math.round(b.chars/1100)) : 0;
  $('#fichaIn').innerHTML = `
    <div class="ficha-top">${tapa(b)}
      <div><h3>${esc(b.t)}</h3>
        <button class="au" data-autor="${esc(b.a)}">${esc(b.a)}${b.ay?' · '+esc(b.ay):''}</button>
        <div class="metas">
          <span class="meta">${b.l==='es'?'🇪🇸 Español':'🌍 '+(b.l||'').toUpperCase()}</span>
          ${mins?`<span class="meta">⏱ ${mins>60?Math.round(mins/60)+' h de lectura':mins+' min'}</span>`:''}
          ${b.facil?'<span class="meta">⚡ Lectura fácil</span>':''}
          ${bajado?'<span class="meta">⬇️ Descargado</span>':''}
          ${gens}
        </div>
      </div></div>
    ${b.sum ? `<p class="resumen">${esc(b.sum)}</p>` : ''}
    ${p && p.p>0.01 ? `<p class="resumen">Vas por el <b>${Math.round(p.p*100)}%</b>.</p>` : ''}
    <div class="acciones">
      <button class="btn" id="bLeer">${p&&p.p>0.01?'Continuar leyendo':'Leer ahora'}</button>
      <button class="btn sec" id="bFav">${fav?'❤️':'🤍'}</button>
      <button class="btn sec" id="bBajar">${bajado?'✓ Sin internet':'⬇️ Descargar'}</button>
    </div>
    <p style="font-size:12.5px;color:var(--tinta2);margin:18px 0 0;line-height:1.6">
      Texto de dominio público cortesía de <a href="${esc(b.url)}" target="_blank" rel="noopener">Project Gutenberg</a>.</p>`;
  $('#velo').classList.add('on'); $('#ficha').classList.add('on');

  $('#bLeer').onclick = () => { cerrarFicha(); abrirLector(b); };
  $('#bFav').onclick = ev => {
    const i = E.fav.indexOf(b.id);
    if (i<0){ E.fav.unshift(b.id); toast('Guardado en favoritos'); } else { E.fav.splice(i,1); toast('Quitado de favoritos'); }
    guardar(); ev.currentTarget.textContent = E.fav.includes(b.id)?'❤️':'🤍'; refrescar();
  };
  $('#bBajar').onclick = async ev => {
    const btn = ev.currentTarget;
    if (E.desc.includes(b.id)){ await DB.del(b.id); E.desc = E.desc.filter(x=>x!=b.id); guardar();
      btn.textContent = '⬇️ Descargar'; toast('Borrado del iPad'); refrescar(); return; }
    btn.textContent = 'Descargando…';
    const txt = await traerTexto(b);
    if (txt){ await DB.set(b.id, txt); E.desc.unshift(b.id); guardar();
      btn.textContent = '✓ Sin internet'; toast('Listo: ya puedes leerlo sin internet'); refrescar(); }
    else { btn.textContent = '⬇️ Descargar'; toast('No se pudo descargar'); }
  };
}
function abrirFichaOL(b){
  LIBRO_ACTUAL = null;
  const enlace = b.enlace ? b.enlace
               : b.ia ? `https://archive.org/details/${encodeURIComponent(b.ia)}`
                      : `https://openlibrary.org${b.id.replace(/^ol/,'/works/')}`;
  $('#fichaIn').innerHTML = `
    <div class="ficha-top">
      <div class="tapa" style="background:${colorDe(b.t+b.a)}">
        <div class="gen"><b>${esc(b.t)}</b><span>${esc(b.a)}</span></div>
        ${b.cov?`<img src="${esc(b.cov)}" alt="" onerror="this.style.display='none'">`:''}</div>
      <div><h3>${esc(b.t)}</h3>
        <div class="au">${esc(b.a)}</div>
        <div class="metas">${b.anio?`<span class="meta">📅 ${esc(b.anio)}</span>`:''}
          <span class="meta">${b.oa?'🎓 Acceso abierto':(b.libre?'📖 Lectura libre':'🔓 Préstamo gratuito')}</span></div></div></div>
    <p class="resumen">${b.oa
      ? 'Libro académico de acceso abierto: se descarga completo y gratis en PDF, sin cuenta ni registro. Su editorial lo publicó así a propósito.'
      : b.libre
      ? 'Este libro se puede leer completo y gratis en Internet Archive, sin cuenta ni registro.'
      : 'Internet Archive te lo presta gratis por 1 hora, renovable, igual que una biblioteca pública. Necesitas una cuenta gratuita (solo correo y contraseña).'}</p>
    <div class="acciones">
      <a class="btn" href="${esc(enlace)}" target="_blank" rel="noopener">${
        b.oa ? 'Descargar gratis' : b.libre ? 'Leer gratis' : 'Pedir prestado gratis'}</a>
    </div>
    <p style="font-size:12.5px;color:var(--tinta2);margin:18px 0 0;line-height:1.6">
      ${b.oa ? 'Se abre en OAPEN, la biblioteca europea de libros académicos de acceso abierto.'
             : 'Se abre en Internet Archive (archive.org), una biblioteca digital sin fines de lucro. Préstamo digital legal.'}</p>`;
  $('#velo').classList.add('on'); $('#ficha').classList.add('on');
}

/* =========================================================
   LECTOR
   ========================================================= */
async function traerTexto(b){
  const local = await DB.get(b.id);
  if (local) return local;
  const fuentes = [];
  if (b.local) fuentes.push(b.local);
  if (b.txt)   fuentes.push('https://r.jina.ai/' + b.txt);
  for (const u of fuentes){
    try{
      const r = await fetch(u);
      if (!r.ok) continue;
      const t = await r.text();
      if (t && t.length > 500) return t;
    }catch(e){}
  }
  return null;
}
function parrafos(txt){
  const bloques = txt.split(/\n\s*\n/);
  const out = [];
  for (let bl of bloques){
    const crudo = bl.trim();
    if (!crudo) continue;
    const unido = crudo.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
    const esTitulo = unido.length < 70 && crudo.split('\n').length <= 2 &&
      (/^(cap[íi]tulo|cap\.|chapter|libro|parte|acto|escena|f[áa]bula|cuento|tomo|secci[óo]n|ep[íi]logo|pr[óo]logo|introducci[óo]n|[IVXLC]+\.?)\b/i.test(unido)
       || (unido === unido.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{3}/.test(unido)));
    out.push(esTitulo ? `<span class="cap">${esc(unido)}</span>` : `<p>${esc(unido)}</p>`);
  }
  return out.join('');
}
function formatear(txt){
  txt = txt.replace(/^Title:[\s\S]{0,400}?Markdown Content:\s*/, '');  // por si viene de proxy
  txt = txt.replace(/\r\n/g, '\n');
  txt = txt.replace(/<\/?(pre|body|html|head|div|span)[^>]*>/gi, '');   // restos de marcado
  // separa el aviso legal de Project Gutenberg del libro en si
  let nota = '';
  const mIni = txt.match(/\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG[^\n]*\n/i);
  if (mIni && mIni.index < 8000){
    nota = txt.slice(0, mIni.index).trim();
    txt  = txt.slice(mIni.index + mIni[0].length);
  }
  const mFin = txt.match(/\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG[^\n]*/i);
  if (mFin && mFin.index > 1500) txt = txt.slice(0, mFin.index);
  return (nota ? `<div class="nota">${parrafos(nota)}</div>` : '') + parrafos(txt);
}
let LEC = null, tGuarda = null;
async function abrirLector(b){
  LEC = b;
  $('#lecTit').textContent = b.t;
  $('#lector').classList.add('on');
  document.body.style.overflow = 'hidden';
  $('#lecTexto').innerHTML = `<div class="cargando"><div class="spin"></div>
    <div>Abriendo <b>${esc(b.t)}</b>…<br><small>La primera vez tarda unos segundos.</small></div></div>`;
  aplicarLectura();
  const txt = await traerTexto(b);
  if (!txt){
    $('#lecTexto').innerHTML = `<div class="cargando"><span style="font-size:40px">📶</span>
      <div>No pudimos abrir el texto ahora.<br>Revisa tu conexión o ábrelo en la web.</div>
      <a class="btn" style="max-width:260px" href="${esc(b.url)}" target="_blank" rel="noopener">Abrir en Project Gutenberg</a></div>`;
    return;
  }
  $('#lecTexto').innerHTML = `<div class="lec-cuerpo" id="lecCuerpo">${formatear(txt)}</div>`;
  const cont = $('#lecTexto');
  const p = E.prog[b.id];
  // Vuelve a donde se quedó. No dependemos solo de requestAnimationFrame porque
  // no se dispara si la pestaña está en segundo plano.
  let colocado = false;
  const colocar = () => {
    if (colocado) return;
    const alto = cont.scrollHeight - cont.clientHeight;
    if (alto <= 0) return;                       // todavía sin maquetar
    colocado = true;
    if (p && p.p > 0.005) cont.scrollTop = p.p * alto;
    actualizarProgreso();
  };
  requestAnimationFrame(colocar);
  setTimeout(colocar, 60);
  setTimeout(colocar, 400);
  setTimeout(actualizarProgreso, 1000);
}
function actualizarProgreso(){
  if (!LEC) return;
  const c = $('#lecTexto');
  const max = c.scrollHeight - c.clientHeight;
  const p = max > 0 ? Math.min(1, Math.max(0, c.scrollTop / max)) : 0;
  $('#lecProg').style.width = (p*100) + '%';
  $('#lecPct').textContent = Math.round(p*100) + '% leído';
  clearTimeout(tGuarda);
  tGuarda = setTimeout(() => {
    E.prog[LEC.id] = {p, fecha: Date.now()};
    if (p > 0.985 && !E.fin.includes(LEC.id)){ E.fin.unshift(LEC.id); toast('¡Libro terminado! 🎉'); }
    guardar();
  }, 500);
}
function cerrarLector(){
  actualizarProgreso();
  $('#lector').classList.remove('on');
  document.body.style.overflow = '';
  LEC = null; refrescar();
}
function aplicarLectura(){
  document.documentElement.dataset.lec = E.lec;
  document.documentElement.dataset.tipo = E.tipo;
  const c = $('#lecCuerpo'); if (c) c.style.fontSize = E.fs + 'px';
  $$('[data-lec]').forEach(b => b.classList.toggle('on', b.dataset.lec === E.lec));
}

/* =========================================================
   ARRANQUE
   ========================================================= */
function refrescar(){
  pintarInicio(); pintarMia();
  if ($('#s-genero').classList.contains('on')) pintarGenero();
}
function indexar(){
  PORGEN = {};
  LIBROS.forEach(b => (b.g||[]).forEach(g => (PORGEN[g] = PORGEN[g]||[]).push(b)));
  Object.values(PORGEN).forEach(a => a.sort((x,y)=>{
    if ((x.l==='es') !== (y.l==='es')) return x.l==='es' ? -1 : 1;
    return y.d - x.d;
  }));
  const m = {};
  LIBROS.forEach(b => { (m[b.a] = m[b.a] || {n:b.a, ay:b.ay, libros:[]}).libros.push(b); });
  AUTORES = Object.values(m).sort((a,b) => b.libros.length - a.libros.length || a.n.localeCompare(b.n));
}
async function arrancar(){
  document.documentElement.dataset.tema = E.tema;
  try{
    const r = await fetch('catalogo.json');
    LIBROS = await r.json();
  }catch(e){
    $('#s-inicio').innerHTML = '<div class="vacio"><span class="em">📚</span>No se pudo cargar el catálogo.</div>';
    return;
  }
  try { MODERNOS = await (await fetch('modernos.json')).json(); } catch(e) { MODERNOS = {}; }
  try { ABIERTOS = await (await fetch('abiertos.json')).json(); } catch(e) { ABIERTOS = {}; }
  indexar(); pintarTabs('inicio'); pintarInicio(); pintarGeneros(); pintarAutores(); pintarMia();
}

/* ---------- eventos globales ---------- */
document.addEventListener('click', ev => {
  const t = ev.target.closest('[data-tab],[data-gen],[data-autor],[data-id],[data-ol],[data-f],[data-volver],[data-lec]');
  if (!t) return;
  if (t.dataset.tab){
    const id = t.dataset.tab; verSeccion(id);
    if (id==='mia') pintarMia(); if (id==='autores') pintarAutores(); if (id==='inicio') pintarInicio();
  }
  else if (t.dataset.volver) {
    verSeccion(ANTERIOR);
    if (ANTERIOR === 'generos') pintarGeneros();
  }
  else if (t.dataset.gen)   { abrirGenero(t.dataset.gen); }
  else if (t.dataset.autor) { cerrarFicha(); verAutor(t.dataset.autor); }
  else if (t.dataset.id)    { const b = LIBROS.find(l => l.id == t.dataset.id); if (b) abrirFicha(b); }
  else if (t.dataset.ol)    { try{ abrirFichaOL(JSON.parse(t.dataset.ol)); }catch(e){} }
  else if (t.dataset.lec)   { E.lec = t.dataset.lec; guardar(); aplicarLectura(); }
  else if (t.dataset.f){
    if (t.dataset.f === 'facil') FG.facil = !FG.facil; else FG[t.dataset.f] = t.dataset.v;
    pintarGenero();
  }
});
$('#velo').onclick = cerrarFicha;
$('#bTema').onclick = () => {
  E.tema = E.tema === 'noche' ? 'claro' : 'noche';
  document.documentElement.dataset.tema = E.tema; guardar();
  $('#bTema').textContent = E.tema === 'noche' ? '☀️' : '🌙';
};
$('#bBuscar').onclick = () => { $('#cajaBuscar').classList.toggle('on'); if ($('#cajaBuscar').classList.contains('on')) $('#qInput').focus(); };
$('#bCerrarBuscar').onclick = () => { $('#cajaBuscar').classList.remove('on'); $('#qInput').value=''; verSeccion('inicio'); };
$('#qInput').oninput = ev => { clearTimeout(tBusca); const v = ev.target.value; tBusca = setTimeout(()=>buscar(v), 350); };

$('#lecCerrar').onclick = cerrarLector;
$('#lecTexto').onscroll = actualizarProgreso;
$('#fMas').onclick   = () => { E.fs = Math.min(30, E.fs+1); guardar(); aplicarLectura(); };
$('#fMenos').onclick = () => { E.fs = Math.max(14, E.fs-1); guardar(); aplicarLectura(); };
$('#bTipo').onclick  = () => { E.tipo = E.tipo==='serif'?'sans':'serif'; guardar(); aplicarLectura(); };
$('#lecIndice').onclick = () => {
  const caps = $$('#lecCuerpo .cap:not(.nota .cap)');
  if (!caps.length){ toast('Este libro no tiene capítulos marcados'); return; }
  $('#fichaIn').innerHTML = `<h3 style="margin:0 0 12px;font-size:20px">Índice</h3>
    ${caps.map((c,i) => `<button class="autor" data-cap="${i}" style="padding:12px 4px">
        <span style="flex:1;text-align:left;font-size:15px">${esc(c.textContent)}</span></button>`).join('')}`;
  $('#velo').classList.add('on'); $('#ficha').classList.add('on');
  $('#fichaIn').querySelectorAll('[data-cap]').forEach(b => b.onclick = () => {
    const el = $$('#lecCuerpo .cap:not(.nota .cap)')[+b.dataset.cap];
    cerrarFicha();
    if (el) $('#lecTexto').scrollTop += el.getBoundingClientRect().top - 92;
  });
};
$('#lecMarca').onclick = () => {
  if (!LEC) return;
  actualizarProgreso();
  toast('Marcador guardado en ' + Math.round((E.prog[LEC.id]?.p||0)*100) + '%');
};
$('#lecTexto').addEventListener('click', ev => {
  if (ev.target.closest('a')) return;
  const y = ev.clientY, h = innerHeight;
  if (y > h*0.25 && y < h*0.75){
    $('#lecTop').classList.toggle('off'); $('#lecBot').classList.toggle('off');
  }
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape'){ if ($('#lector').classList.contains('on')) cerrarLector(); else cerrarFicha(); }
});

arrancar();

/* ---------- funcionar sin internet ---------- */
if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
