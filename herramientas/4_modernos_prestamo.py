# -*- coding: utf-8 -*-
"""Verifica titulos modernos concretos en Open Library y guarda los que se pueden
leer gratis (lectura libre o prestamo digital gratuito de Internet Archive)."""
import json, os, sys, time, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# --- rutas (no tocar) -------------------------------------------------------
AQUI     = os.path.dirname(os.path.abspath(__file__))   # carpeta herramientas
DATOS    = os.path.join(AQUI, 'datos')                  # datos de trabajo
PROYECTO = os.path.dirname(AQUI)                        # carpeta de la app
os.makedirs(DATOS, exist_ok=True)
# ---------------------------------------------------------------------------

DEST = PROYECTO

LISTA = {
 'ia_negocios': [
   ("Prediction machines", "Agrawal"), ("Competing in the age of AI", "Iansiti"),
   ("Human + machine", "Daugherty"), ("AI superpowers", "Kai-Fu Lee"),
   ("Life 3.0", "Tegmark"), ("The second machine age", "Brynjolfsson"),
   ("Big data la revolucion de los datos", "Mayer-Schonberger"),
   ("Weapons of math destruction", "O'Neil"), ("Machine platform crowd", "McAfee"),
   ("Hello world", "Hannah Fry"), ("The master algorithm", "Domingos"),
   ("Artificial intelligence and business management", "Partridge"),
   ("Seven methods for transforming corporate data into business intelligence", "Dhar"),
   ("The innovator's dilemma", "Christensen"), ("Competing on analytics", "Davenport"),
   ("The signal and the noise", "Silver"), ("Rise of the robots", "Ford"),
   ("Automate this", "Steiner"), ("Moneyball", "Lewis"),
   ("Naked statistics", "Wheelan"), ("Blown to bits", "Abelson"),
   ("The innovators", "Isaacson"), ("What technology wants", "Kelly"),
 ],
 'neurociencia': [
   ("Pensar rapido pensar despacio", "Kahneman"), ("El error de Descartes", "Damasio"),
   ("En busca de la memoria", "Kandel"), ("Incognito", "Eagleman"),
   ("El cerebro del nino", "Siegel"), ("El hombre que confundio a su mujer con un sombrero", "Sacks"),
   ("Neuromarketing", "Braidot"), ("Por que dormimos", "Walker"),
   ("Tu cerebro y la musica", "Levitin"), ("Fantasmas en el cerebro", "Ramachandran"),
   ("El cerebro y la inteligencia emocional", "Goleman"), ("Cerebro de pan", "Perlmutter"),
   ("Thinking fast and slow", "Kahneman"), ("The brain that changes itself", "Doidge"),
 ],
 'liderazgo': [
   ("Los 7 habitos de la gente altamente efectiva", "Covey"),
   ("Empieza con el porque", "Sinek"), ("Los lideres comen al final", "Sinek"),
   ("Las cinco disfunciones de un equipo", "Lencioni"),
   ("Como ganar amigos e influir sobre las personas", "Carnegie"),
   ("El lider que no tenia cargo", "Sharma"), ("Inteligencia emocional", "Goleman"),
   ("Las 21 leyes irrefutables del liderazgo", "Maxwell"),
   ("La motivacion Drive", "Pink"), ("Multipliers", "Wiseman"),
   ("El ejecutivo eficaz", "Drucker"), ("Good to great", "Collins"),
   ("Radical candor", "Scott"), ("Lideres", "Bennis"),
 ],
 'crecimiento': [
   ("Habitos atomicos", "Clear"), ("Mindset la actitud del exito", "Dweck"),
   ("El poder del ahora", "Tolle"), ("Los cuatro acuerdos", "Ruiz"),
   ("Enfocate Deep work", "Newport"), ("Grit el poder de la pasion", "Duckworth"),
   ("El monje que vendio su Ferrari", "Sharma"), ("Despertando al gigante interior", "Robbins"),
   ("El poder de los habitos", "Duhigg"), ("Los secretos de la mente millonaria", "Eker"),
   ("Manana empiezo", "Marian Rojas"), ("Como hacer que te pasen cosas buenas", "Rojas Estape"),
 ],
 'historias': [
   ("El hombre en busca de sentido", "Frankl"), ("Steve Jobs", "Isaacson"),
   ("Mi historia Becoming", "Michelle Obama"), ("Una educacion", "Westover"),
   ("Cuando el aliento se vuelve aire", "Kalanithi"), ("Diario de Ana Frank", "Frank"),
   ("El largo camino hacia la libertad", "Mandela"), ("Nunca desistas Shoe dog", "Knight"),
   ("Salvaje Wild", "Strayed"), ("Yo soy Malala", "Yousafzai"),
   ("La chica salvaje", "Owens"), ("Educated", "Westover"),
 ],
 'negocios': [
   ("Padre rico padre pobre", "Kiyosaki"), ("El inversor inteligente", "Graham"),
   ("De cero a uno", "Thiel"), ("El metodo Lean Startup", "Ries"),
   ("La semana laboral de 4 horas", "Ferriss"), ("Reinicia Rework", "Fried"),
   ("El hombre mas rico de Babilonia", "Clason"), ("Piense y hagase rico", "Hill"),
   ("La estrategia del oceano azul", "Kim"), ("Vender es humano", "Pink"),
   ("La meta", "Goldratt"), ("Empresas que sobresalen", "Collins"),
 ],
 'fabulas': [
   ("Quien se ha llevado mi queso", "Johnson"), ("El vendedor mas grande del mundo", "Mandino"),
   ("La vaca", "Camilo Cruz"), ("Fish la eficacia de un equipo", "Lundin"),
   ("El caballero de la armadura oxidada", "Fisher"), ("La buena suerte", "Rovira"),
   ("El principito", "Saint-Exupery"), ("Juan Salvador Gaviota", "Bach"),
   ("Padre rico padre pobre para jovenes", "Kiyosaki"), ("El arbol generoso", "Silverstein"),
 ],
 'romantico': [
   ("Yo antes de ti", "Moyes"), ("Orgullo y prejuicio", "Austen"),
   ("El diario de Noa", "Sparks"), ("Un cuento perfecto", "Elisabet Benavent"),
   ("Outlander", "Gabaldon"), ("El duque y yo", "Quinn"),
   ("Bajo la misma estrella", "Green"), ("Los puentes de Madison", "Waller"),
   ("Como agua para chocolate", "Esquivel"), ("El tiempo entre costuras", "Duenas"),
 ],
}

def _norm(x):
    x = (x or '').lower()
    for a, b in zip('áéíóúüñ', 'aeiouun'): x = x.replace(a, b)
    return x

def coincide(pedido, autor, b):
    """Evita falsos positivos: el resultado debe compartir palabra clave o autor."""
    tt = _norm(b.get('title'))
    aa = _norm(' '.join(b.get('author_name') or []))
    if _norm(autor).split()[-1] in aa: return True
    claves = [w for w in _norm(pedido).split() if len(w) > 4]
    return any(w in tt for w in claves)

def buscar(titulo, autor):
    # pedimos primero la edicion en espanol; si no hay, la inglesa
    for idioma in ('spa', 'eng'):
        r = _buscar(f'{titulo} {autor} AND language:{idioma}', titulo, autor, idioma)
        if r: return r
    return None

def _buscar(q, titulo, autor, idioma):
    u = ('https://openlibrary.org/search.json?q=' + urllib.parse.quote(q) +
         '&fields=title,author_name,first_publish_year,ia,ebook_access,cover_i,key,language&limit=12')
    try:
        req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0 (biblioteca personal)'})
        d = json.loads(urllib.request.urlopen(req, timeout=25).read().decode())
    except Exception as e:
        print('   ERR', str(e)[:50]); return None
    cand = [b for b in d.get('docs', []) if b.get('ebook_access') in ('borrowable', 'public')
            and coincide(titulo, autor, b)]
    # nada de ediciones en holandes, hebreo o chino: solo espanol o ingles
    cand = [b for b in cand if not (b.get('language') or [])
            or 'spa' in b['language'] or 'eng' in b['language']]
    if not cand: return None
    cand.sort(key=lambda b: (0 if 'spa' in (b.get('language') or []) else 1,
                             0 if b.get('ebook_access') == 'public' else 1))
    b = cand[0]
    return {
        'id': 'ol' + (b.get('key') or '').split('/')[-1],
        't': b.get('title') or titulo,
        'a': (b.get('author_name') or [autor])[0],
        'anio': b.get('first_publish_year') or '',
        'cov': f"https://covers.openlibrary.org/b/id/{b['cover_i']}-M.jpg" if b.get('cover_i') else '',
        'ia': (b.get('ia') or [''])[0],
        'libre': b.get('ebook_access') == 'public',
        'es': idioma == 'spa',
    }

salida = {}
tareas = [(g, t, a) for g, libros in LISTA.items() for t, a in libros]
def tarea(x):
    g, t, a = x
    for intento in range(2):
        r = buscar(t, a)
        if r: return (g, t, r)
        time.sleep(1)
    return (g, t, None)
with ThreadPoolExecutor(max_workers=3) as ex:
    for g, t, r in ex.map(tarea, tareas):
        salida.setdefault(g, [])
        if r and not any(x['t'].lower() == r['t'].lower() for x in salida[g]):
            salida[g].append(r)
            print(f"   OK  {g:12s} {r['t'][:40]:40s} {'ES' if r['es'] else '  '} {'libre' if r['libre'] else 'prestamo'}", flush=True)
        else:
            print(f"   --  {g:12s} {t[:40]}", flush=True)

# une con lo que ya se habia verificado antes
ruta = os.path.join(DEST, 'modernos.json')
if os.path.exists(ruta):
    previo = json.load(open(ruta, encoding='utf-8'))
    for g, arr in previo.items():
        vistos = {b['id'] for b in salida.get(g, [])}
        salida.setdefault(g, []).extend(b for b in arr if b['id'] not in vistos)

json.dump(salida, open(ruta, 'w', encoding='utf-8'),
          ensure_ascii=False, separators=(',', ':'))
print('\nTOTAL modernos:', sum(len(v) for v in salida.values()))
