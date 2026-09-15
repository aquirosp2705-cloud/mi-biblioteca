# -*- coding: utf-8 -*-
"""Selecciona los libros, descarga los textos y arma catalogo.json.
   Regla: el espanol manda; el ingles solo entra donde el espanol no alcanza."""
import json, os, re, sys, time, unicodedata, urllib.request
from collections import defaultdict
sys.stdout.reconfigure(encoding='utf-8', errors='replace')


# --- rutas (no tocar) -------------------------------------------------------
AQUI     = os.path.dirname(os.path.abspath(__file__))   # carpeta herramientas
DATOS    = os.path.join(AQUI, 'datos')                  # datos de trabajo
PROYECTO = os.path.dirname(AQUI)                        # carpeta de la app
os.makedirs(DATOS, exist_ok=True)
# ---------------------------------------------------------------------------

BIB  = DATOS
DEST = PROYECTO
LIB  = os.path.join(DEST, "libros")
os.makedirs(LIB, exist_ok=True)

# Cuanto puede pesar la biblioteca. Subir este numero = mas libros dentro de la app.
# Se puede cambiar aqui, o desde fuera con la variable TOPE_MB.
TOPE_MB     = int(os.environ.get('TOPE_MB', 72))
CUPO_ES     = int(os.environ.get('CUPO_ES', 40))   # maximo de libros en espanol por genero
CUPO_EN     = int(os.environ.get('CUPO_EN', 8))    # maximo en ingles por genero (si el espanol escasea)
MAX_LARGO   = 900_000      # bytes; los mamotretos solo entran si son muy populares
LIMITE_CORTO = 200_000     # caracteres; por debajo de esto se marca 'Fácil' (~3 horas)

libros = json.load(open(os.path.join(BIB, 'clasificados.json'), encoding='utf-8'))
porgen = defaultdict(list)
for b in libros:
    for g in b['g']:
        porgen[g].append(b)
for g in porgen:
    porgen[g].sort(key=lambda b: -b['d'])

sel, ids, firmas = [], set(), set()

def firma(b):
    """Misma obra del mismo autor aunque cambie la edicion:
       'The Prince' y 'The Prince (traducido)' cuentan como uno solo."""
    t = unicodedata.normalize('NFD', b['t'].lower())
    t = ''.join(c for c in t if unicodedata.category(c) != 'Mn')
    t = re.sub(r'[^a-z0-9 ]', ' ', t)
    return (b['a'].lower(), re.sub(r'\s+', ' ', t).strip()[:24])

def agregar(b):
    if b['id'] in ids: return False
    f = firma(b)
    if f in firmas: return False        # ya tenemos esa misma obra
    ids.add(b['id']); firmas.add(f); sel.append(b); return True

# 1) cuota en espanol por genero
for g, arr in sorted(porgen.items()):
    n = 0
    for b in arr:
        if b['l'] != 'es' or n >= CUPO_ES: continue
        if agregar(b): n += 1
    print(f'  {g:13s} espanol: {n}')

# 2) ingles solo donde el espanol no llena el estante
for g, arr in sorted(porgen.items()):
    hay_es = sum(1 for b in arr if b['l'] == 'es')
    if hay_es >= 20: continue
    n = 0
    for b in arr:
        if b['l'] != 'en' or n >= CUPO_EN: continue
        if agregar(b): n += 1
    if n: print(f'  {g:13s} ingles:  {n} (el espanol solo daba {hay_es})')

# 3) el resto del espanol, por popularidad (con un minimo de calidad)
for b in sorted((x for x in libros if x['l'] == 'es' and x['d'] >= 320), key=lambda x: -x['d']):
    agregar(b)

print('seleccionados:', len(sel))

def bajar(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (biblioteca personal)'})
            with urllib.request.urlopen(req, timeout=90) as r:
                return r.read().decode('utf-8', 'replace')
        except Exception:
            time.sleep(1.5)
    return None

def limpiar(t):
    t = t.replace('\r\n', '\n')
    m = re.search(r'\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG[^\n]*\n', t, re.I)
    if m and m.start() > 2000:
        t = t[:m.end()]
    return t.strip() + '\n'

total, final, saltados, fallos_red = 0, [], 0, 0
for i, b in enumerate(sel, 1):
    if total > TOPE_MB * 1024 * 1024:
        print('  (tope de tamano alcanzado)'); break
    ruta = os.path.join(LIB, f"{b['id']}.txt")
    if os.path.exists(ruta) and os.path.getsize(ruta) > 3000:
        txt = open(ruta, encoding='utf-8').read()
    else:
        txt = bajar(b['txt'])
        if not txt or len(txt) < 3000:
            saltados += 1; fallos_red += 1
            print(f"    no se pudo bajar: {b['t'][:50]}", flush=True)
            continue
        txt = limpiar(txt)
        open(ruta, 'w', encoding='utf-8').write(txt)
    n = len(txt.encode('utf-8'))
    if n > MAX_LARGO and b['d'] < 1200:      # mamotreto poco leido: no ocupa sitio
        saltados += 1; continue
    total += n
    final.append({
        'id': b['id'], 't': b['t'], 'a': b['a'], 'ay': b['ay'], 'l': b['l'],
        'g': b['g'], 'd': b['d'], 'sum': b['sum'],
        'chars': len(txt), 'facil': len(txt) < LIMITE_CORTO,
        'cov': b['cov'], 'url': b['url'], 'local': f"libros/{b['id']}.txt",
    })
    if i % 30 == 0:
        print(f"  [{i}/{len(sel)}] {len(final)} libros · {total/1048576:.1f} MB", flush=True)

# cuantos libros habia antes, para no empobrecer la biblioteca por accidente
ruta_cat = os.path.join(DEST, 'catalogo.json')
antes = 0
if os.path.exists(ruta_cat):
    try:
        antes = len(json.load(open(ruta_cat, encoding='utf-8')))
    except Exception:
        antes = 0

if antes and len(final) < antes * 0.9:
    print()
    print(f'*** AVISO: saldrian {len(final)} libros cuando antes habia {antes}.')
    print('*** No se toca nada. Revisa la conexion a internet y vuelve a intentarlo.')
    sys.exit(1)

# guardamos copia del catalogo anterior y escribimos de forma segura
if os.path.exists(ruta_cat):
    open(ruta_cat + '.bak', 'w', encoding='utf-8').write(open(ruta_cat, encoding='utf-8').read())
tmp = ruta_cat + '.tmp'
json.dump(final, open(tmp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
os.replace(tmp, ruta_cat)

# limpia textos que sobraron -- SOLO si la descarga fue limpia
vivos = {f"{b['id']}.txt" for b in final}
sobrantes = [f for f in os.listdir(LIB) if f.endswith('.txt') and f not in vivos]
if fallos_red:
    print()
    print(f'*** {fallos_red} libros no se pudieron bajar (internet).')
    print(f'*** Por seguridad NO se borro ningun libro ({len(sobrantes)} quedan de mas).')
else:
    for f in sobrantes:
        try: os.remove(os.path.join(LIB, f))
        except OSError as e: print('   no se pudo borrar', f, e)

c = defaultdict(lambda: [0, 0])
for b in final:
    for g in b['g']:
        c[g][0] += 1
        if b['l'] == 'es': c[g][1] += 1
print('\n== CATALOGO FINAL ==')
print(f"libros: {len(final)} | {total/1048576:.1f} MB | espanol: {sum(1 for b in final if b['l']=='es')} | cortos: {sum(1 for b in final if b['facil'])}")
for g, (n, esn) in sorted(c.items(), key=lambda x: -x[1][0]):
    print(f'  {g:13s} {n:3d}  (español {esn})')
