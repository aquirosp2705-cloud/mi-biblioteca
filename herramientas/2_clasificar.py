# -*- coding: utf-8 -*-
"""Clasificacion curada: reglas de alta precision, no palabras sueltas."""
import json, os, re, sys
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


BIB = DATOS
raw = json.load(open(os.path.join(BIB, 'raw.json'), encoding='utf-8'))

def norm(s):
    s = (s or '').lower()
    for a, b in zip('áéíóúüñç', 'aeiouunc'):
        s = s.replace(a, b)
    return s

# (genero, regex de AUTOR, regex de TITULO, regex de MATERIA)  -- basta que acierte una
REGLAS = [
 ('fabulas',
  r'\baesop\b|\besopo\b|samaniego|iriarte, tomas|la fontaine|fedro|phaedrus',
  r'\bfabulas?\b|\bfables?\b|apologos',
  r'\bfables\b'),
 ('cuentos',
  r'grimm|andersen, h|perrault|trueba, antonio|coloma, luis|fernan caballero',
  r'^cuentos|cuentos (de|para|populares|infantiles)|leyendas|tradiciones peruanas|mil noches',
  r'fairy tales|tales -- |short stories, spanish|legends'),
 ('crecimiento',
  r'marcus aurelius|epictetus|seneca, lucius|gracian y morales|kempis|allen, james$|smiles, samuel|marden, orison|trine, ralph|wattles|conwell|thoreau|emerson, ralph|ingenieros, jose',
  r'as a man thinketh|self-help|character|el hombre mediocre|oraculo manual|arte de la prudencia|imitacion de cristo|meditations|enchiridion|walden|hacia una moral',
  r'conduct of life|self-actualization|success|new thought|stoics|ethics -- early works'),
 ('liderazgo',
  r'machiavelli|maquiavelo|sunzi|sun tzu|plutarch|plutarco|xenophon|jenofonte|clausewitz',
  r'^the prince$|el principe|arte de la guerra|art of war|vidas paralelas|ciropedia|helenicas|discourses on the first',
  r'political science -- early works|military art and science -- early works|kings and rulers'),
 ('neurociencia',
  r'james, william|freud, sigmund|ramon y cajal|le bon, gustave|ribot|binet|wundt|jung, c',
  r'psicolog|psychology|^dream psychology|cerebro|reglas y consejos|la simulacion en la lucha',
  r'^psychology|psychology --|psychoanalysis|brain|mind and body|consciousness|memory --'),
 ('historias',
  r'keller, helen|douglass, frederick|washington, booker|franklin, benjamin|cellini|casanova',
  r'^recuerdos de mi vida|^autobiograf|^memorias de |story of my life|^vida de |^mi vida',
  r'^autobiograph|autobiographies|^biography|biography --|personal narratives'),
 ('negocios',
  r'smith, adam|bastiat|ricardo, david|marx, karl|veblen|mill, john stuart',
  r'riqueza de las naciones|wealth of nations|el capital|economia politica|political economy',
  r'^economics|economics --|finance|commerce|industries --'),
 ('romantico',
  r'austen, jane|bronte|gaskell|pardo bazan|sparks|alarcon, pedro|valera, juan',
  r'^orgullo y prejuicio|^cumbres|^jane eyre|^persuasion|^emma$|^sentido y sensibilidad',
  r'love stories|courtship -- fiction|man-woman relationships -- fiction'),
]

# autores canonicos -> clasicos (solo obra literaria)
CANON = (r'cervantes|shakespeare|dickens|tolstoy|dostoyevsky|hugo, victor|verne, jules|wilde, oscar|'
         r'poe, edgar|twain, mark|dumas, alexandre|perez galdos|quevedo|lope de vega|calderon de la barca|'
         r'homer|dante|moliere|stendhal|flaubert|melville|austen|bronte|becquer|espronceda|dario, ruben|'
         r'marti, jose|baroja|valle-inclan|unamuno|clarin|blasco ibanez|zorrilla|tirso|virgil|ovid|'
         r'sophocles|euripides|esquilo|aeschylus|boccaccio|rabelais|swift|defoe|goethe|schiller|pushkin|'
         r'chekhov|maupassant|balzac|zola|alcott|stevenson|kipling|conan doyle|jules verne|dickinson')

# nunca deben entrar como "lectura corta" ni en fabulas
EPICOS = r'iliada|odisea|eneida|orlando furioso|telemaco|divina comedia|paraiso perdido|obras (completas|dramaticas|escogidas)'

def clasificar(b):
    subj = ' | '.join(b.get('subjects', []) + b.get('bookshelves', []))
    auth = ' | '.join(a.get('name', '') for a in b.get('authors', []))
    t, s, a = norm(b.get('title', '')), norm(subj), norm(auth)
    gs = []
    for gen, rxa, rxt, rxs in REGLAS:
        if re.search(rxa, a) or re.search(rxt, t) or re.search(rxs, s):
            gs.append(gen)
    # la epica no es fabula ni cuento corto
    if re.search(EPICOS, t):
        for x in ('fabulas', 'cuentos'):
            if x in gs: gs.remove(x)
    # la ficcion, el teatro y la poesia no van en los estantes de no-ficcion
    if re.search(r'-- fiction|^fiction|drama|poetry|poesia|novel', s):
        for x in ('crecimiento', 'liderazgo', 'neurociencia', 'negocios', 'historias'):
            if x in gs and not re.search(r'autobiograph|biography|personal narratives', s):
                gs.remove(x)
    if re.search(CANON, a) and re.search(r'fiction|poetry|drama|novel|literature|tales', s):
        if 'clasicos' not in gs: gs.append('clasicos')
    return gs

def anios(nace, muere):
    """'1812-1870', '750 a.C.-650 a.C.', 'n. 1878', 'm. 406 a.C.'  (nunca '43-17')."""
    uno = lambda y: (f'{abs(y)} a.C.' if y < 0 else str(y)) if y else ''
    if nace and muere: return f'{uno(nace)}-{uno(muere)}'
    if nace:  return f'n. {uno(nace)}'
    if muere: return f'm. {uno(muere)}'
    return ''

def texto_url(b):
    f = b.get('formats', {})
    for k in ('text/plain; charset=utf-8', 'text/plain; charset=us-ascii', 'text/plain'):
        if k in f and not f[k].endswith('.zip'): return f[k]
    return None

NOMBRES = {'Aesop': 'Esopo', 'Homer': 'Homero', 'Ovid': 'Ovidio', 'Virgil': 'Virgilio',
           'Anonymous': 'Anónimo', 'Xenophon': 'Jenofonte', 'Plutarch': 'Plutarco',
           'Marcus Aurelius, Emperor of Rome': 'Marco Aurelio', 'Epictetus': 'Epicteto',
           'Sunzi': 'Sun Tzu', 'Confucius': 'Confucio', 'Various': 'Varios autores',
           'Unknown': 'Anónimo', 'Plato': 'Platón', 'Aristotle': 'Aristóteles'}

out = []
for b in raw:
    if b.get('media_type') != 'Text' or not texto_url(b): continue
    gs = clasificar(b)
    if not gs: continue
    langs = b.get('languages', ['en'])
    lang = 'es' if 'es' in langs else langs[0]
    if lang not in ('es', 'en'): continue
    a0 = (b.get('authors') or [{'name': 'Anónimo'}])[0]
    nombre = NOMBRES.get(a0.get('name', ''), a0.get('name', 'Anónimo'))
    if ',' in nombre and nombre not in NOMBRES.values():
        ap, no = nombre.split(',', 1)
        nombre = (no.strip() + ' ' + ap.strip()).strip()
    out.append({
        'id': b['id'], 't': b['title'].strip(), 'a': nombre,
        'ay': anios(a0.get('birth_year'), a0.get('death_year')),
        'l': lang, 'g': gs, 'd': b.get('download_count', 0),
        'sum': (b.get('summaries') or [''])[0][:600],
        'txt': texto_url(b), 'cov': b.get('formats', {}).get('image/jpeg', ''),
        'url': f"https://www.gutenberg.org/ebooks/{b['id']}",
    })

from collections import Counter
c = Counter(g for x in out for g in x['g'])
print('clasificados:', len(out), '| espanol:', sum(1 for x in out if x['l'] == 'es'))
for g, n in c.most_common():
    esn = sum(1 for x in out if g in x['g'] and x['l'] == 'es')
    print(f'  {g:13s} {n:4d}  (es: {esn})')
guardar_json(out, os.path.join(BIB, 'clasificados.json'), ensure_ascii=False)
