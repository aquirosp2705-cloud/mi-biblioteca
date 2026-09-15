import json, time, urllib.request, urllib.parse, os

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


OUT = DATOS
RAW = os.path.join(OUT,'raw.json')
def get(url, tries=3, espera=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=45) as r:
                return json.loads(r.read().decode('utf-8'))
        except Exception as e:
            print('   retry', i, str(e)[:40], flush=True); time.sleep(espera*(i+1))
    return None

libros = {}
if os.path.exists(RAW):
    for b in json.load(open(RAW,encoding='utf-8')): libros[b['id']] = b
    print('reanudando con', len(libros), flush=True)

def salvar():
    guardar_json(list(libros.values()), RAW, ensure_ascii=False)

# Si el usuario pidio expresamente buscar libros nuevos, se baja aunque ya haya datos.
forzar = os.environ.get('FORZAR_CATALOGO') == '1'
espanoles = sum(1 for b in libros.values() if 'es' in b.get('languages', []))
if forzar or espanoles < 900:
    print('== catalogo en espanol ==', flush=True)
    url = 'https://gutendex.com/books/?languages=es'
    while url:
        d = get(url)
        if not d: break
        for b in d['results']: libros[b['id']] = b
        print('  ', len(libros), '/', d['count'], flush=True)
        url = (d.get('next') or '').replace('http://','https://') or None
    salvar()

QUERIES = ['aesop fables','la fontaine','fairy tales','jane austen','bronte','love stories',
 'marcus aurelius','epictetus','seneca','james allen','samuel smiles','orison marden','benjamin franklin',
 'william james','psychology','brain mind','sun tzu','machiavelli','plutarch','xenophon',
 'helen keller','frederick douglass','booker washington','adam smith','grimm','andersen',
 'thoreau','emerson','baltasar gracian','ralph trine','wallace wattles','napoleon']
hechas = set(json.load(open(os.path.join(OUT,'hechas.json'))) if os.path.exists(os.path.join(OUT,'hechas.json')) else [])
print('== temas ==', flush=True)
for q in QUERIES:
    if q in hechas: continue
    d = get('https://gutendex.com/books/?search=' + urllib.parse.quote(q), tries=2, espera=6)
    if d:
        for b in d['results'][:30]: libros.setdefault(b['id'], b)
        hechas.add(q); print('  ', q, '->', len(libros), flush=True)
        salvar(); guardar_json(list(hechas), os.path.join(OUT,'hechas.json'))
    else:
        print('   (saltado)', q, flush=True)
    time.sleep(2.5)
salvar()
print('TOTAL', len(libros), flush=True)
