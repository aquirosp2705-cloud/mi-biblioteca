# Mi Biblioteca

App de lectura para iPad. Libros completos, gratis y legales.

## Qué es

Una biblioteca personal que se abre en Safari desde el iPad (o desde cualquier
navegador). No pide cuenta, no pide pago y no tiene publicidad.

Dos tipos de libros:

1. **Clásicos completos** — se leen dentro de la app, con su propio lector
   (tamaño de letra, modo sepia y modo noche, marcador y porcentaje leído).
   Los textos son de **Project Gutenberg**, todos en dominio público.
2. **Libros modernos** — títulos actuales de **Internet Archive**. Se abren en
   su web: unos son de lectura libre y otros se prestan gratis por 1 hora
   renovable, igual que en una biblioteca pública.

## Géneros

Fábulas y moralejas · Romántico · Crecimiento personal · Liderazgo y equipos ·
Neurociencia y mente · Historias que inspiran · IA aplicada a negocios ·
Negocios y economía · Clásicos imprescindibles

Además: filtro de **lectura fácil** (libros cortos que se terminan en una o dos
sentadas), búsqueda por título y autor, e índice de autores.

## Cómo se usa en el iPad

1. Abrir la dirección de la app en Safari.
2. Botón **Compartir** → **Añadir a pantalla de inicio**.
3. Queda como una app más, con su ícono.

Los libros descargados, los favoritos y el punto donde quedó la lectura se
guardan **solo en ese iPad**.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La página de la app |
| `estilo.css` | Los colores y el diseño |
| `app.js` | Toda la lógica: estantes, buscador, lector |
| `catalogo.json` | Ficha de cada libro clásico |
| `modernos.json` | Lista curada de libros modernos verificados |
| `libros/*.txt` | El texto completo de cada libro clásico |
| `icono.png` | Ícono para la pantalla de inicio |
| `herramientas/` | Los programas que arman el catálogo (ver `herramientas/LEEME.md`) |

## Licencias

Los textos de `libros/` son de dominio público y se distribuyen con el aviso de
Project Gutenberg intacto, como exige su licencia. Los libros modernos no se
copian: solo se enlaza a Internet Archive, que es quien presta legalmente.
