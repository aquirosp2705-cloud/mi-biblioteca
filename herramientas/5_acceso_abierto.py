# -*- coding: utf-8 -*-
"""Libros de ACCESO ABIERTO (gratis, legales, sin cuenta) desde OAPEN/DOAB.
   Sirven para los estantes donde no hay clasicos ni prestamo: IA y negocios."""
import json, os, re, sys, time, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# --- rutas (no tocar) -------------------------------------------------------
AQUI     = os.path.dirname(os.path.abspath(__file__))   # carpeta herramientas
DATOS    = os.path.join(AQUI, 'datos')                  # datos de trabajo
PROYECTO = os.path.dirname(AQUI)                        # carpeta de la app
os.makedirs(DATOS, exist_ok=True)
# ---------------------------------------------------------------------------

def guardar_json(datos, ruta, **kw):
    """Escribe sin riesgo: primero a un temporal y luego reemplaza. Si se corta a
       la mitad (se cierra la ventana, se va la luz), el archivo bueno sigue ahi."""
    tmp = ruta + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(datos, f, **kw)
    if os.path.getsize(tmp) < 2:
        os.remove(tmp); raise IOError('no se escribio nada en ' + ruta)
    os.replace(tmp, ruta)


DEST = PROYECTO

CONSULTAS = {
 'ia_negocios': [
   'artificial intelligence business', 'artificial intelligence management',
   'digital transformation organizations', 'machine learning industry',
   'data driven decision making', 'artificial intelligence economy',
   'inteligencia artificial', 'algorithms society business',
 ],
 'liderazgo': ['leadership organizations', 'liderazgo', 'team management work'],
 'neurociencia': ['neuroscience brain', 'cognition decision making', 'neurociencia'],
 'negocios': ['entrepreneurship', 'innovation management', 'business models'],
}

def buscar(consulta, lim=18):
    u = ('https://library.oapen.org/rest/search?query=' + urllib.parse.quote(consulta) +
         '&expand=metadata&limit=' + str(lim))
    req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0 (biblioteca personal)',
                                             'Accept': 'application/json'})
    try:
        d = json.loads(urllib.request.urlopen(req, timeout=45).read().decode('utf-8', 'replace'))
    except Exception as e:
        print('   ERR', consulta[:30], str(e)[:40]); return []
    out = []
    for it in d:
        md = {}
        for m in (it.get('metadata') or []):
            k = m.get('key'); v = m.get('value')
            if k and v: md.setdefault(k, v)
        titulo = md.get('dc.title')
        idioma = (md.get('dc.language') or '').lower()
        tipo   = (md.get('dc.type') or '').lower()
        if not titulo or not it.get('handle'): continue
        if titulo.lower().startswith('chapter'): continue          # capitulos sueltos no
        if 'chapter' in tipo: continue
        if idioma and idioma not in ('english', 'spanish', 'en', 'es'): continue
        out.append({
            'id': 'oa' + it['handle'].replace('/', '-'),
            't': titulo.strip()[:120],
            'a': (md.get('dc.contributor.editor') or md.get('dc.contributor.author') or
                  md.get('dc.contributor.other') or 'Varios autores').split(';')[0].strip()[:60],
            'anio': (md.get('dc.date.issued') or '')[:4],
            'cov': f"https://library.oapen.org/bitstream/handle/{it['handle']}/thumbnail.jpg",
            'ia': '', 'oa': True, 'libre': True,
            'es': idioma.startswith('span') or idioma == 'es',
            'enlace': f"https://library.oapen.org/handle/{it['handle']}",
        })
    return out

TEMA = {
 'ia_negocios': r'artificial intelligence|ai|machine learning|algorithm|automation|robot|'
                r'digital|data|inteligencia artificial|digitaliza|datos',
 'liderazgo':   r'leader|liderazgo|management|manager|team|equipo|organizat|organizac|directiv|work',
 'neurociencia':r'neuro|brain|cerebro|cognit|mente|mind|memor|psycholog|psicolog|behavio|conduct',
 'negocios':    r'business|entrepreneur|innovation|innovaci|negocio|empresa|market|mercado|econom|value chain',
}

salida = {}
for gen, consultas in CONSULTAS.items():
    vistos, libros = set(), []
    with ThreadPoolExecutor(max_workers=4) as ex:
        for res in ex.map(buscar, consultas):
            for b in res:
                clave = b['t'].lower()[:50]
                if clave in vistos: continue
                vistos.add(clave); libros.append(b)
    rx = TEMA[gen]
    libros = [b for b in libros if re.search(rx, b['t'], re.I)]
    libros.sort(key=lambda b: -int(b['anio'] or 0))
    salida[gen] = libros[:14]
    print(f"== {gen}: {len(salida[gen])}")
    for b in salida[gen][:6]:
        print(f"   {'ES' if b['es'] else '  '} {b['anio']}  {b['t'][:58]}")

guardar_json(salida, os.path.join(DEST, 'abiertos.json'), ensure_ascii=False, separators=(',', ':'))
print('\nTOTAL acceso abierto:', sum(len(v) for v in salida.values()))
