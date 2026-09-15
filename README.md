# Mi Biblioteca

App de lectura para iPad. Libros completos, gratis y legales.

**https://aquirosp2705-cloud.github.io/mi-biblioteca/**

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

## Si un libro no está

Busca cualquier título y la app responde por niveles:

1. **En tu biblioteca** — los que ya tienes, se leen al momento.
2. **Gratis, para añadir** — otros 787 libros de dominio público (628 en español) que
   no venían incluidos. Se abren igual; la primera vez se traen de internet y quedan
   guardados para siempre.
3. **Modernos, en préstamo** — lo que Internet Archive presta gratis.
4. **Cómo conseguirlo** — si no hay nada gratis: el **precio real de hoy en Apple Books**
   (consultado en vivo, en dólares), enlaces a otras bibliotecas gratuitas en español
   (Cervantes, Elejandría, Gutenberg, Archive) y a otras tiendas.

Y si ya compraste el libro, puedes **subirlo** en EPUB o TXT desde *Mi estantería*: se
lee aquí igual que los demás y se queda **solo en tu iPad**.

> En Ecuador no existe todavía ninguna biblioteca pública que preste libros electrónicos
> actuales por internet — se comprobó una por una. El préstamo de Internet Archive es
> hoy la mejor opción gratuita.

## Géneros

Fábulas y moralejas · Romántico · Crecimiento personal · Liderazgo y equipos ·
Neurociencia y mente · Historias que inspiran · IA aplicada a negocios ·
Negocios y economía · Clásicos imprescindibles

Además: filtro de **lectura fácil** (libros cortos que se terminan en una o dos
sentadas), búsqueda por título y autor, e índice de autores.

## Biblioteca portátil (sin internet)

La app funciona sin conexión:

- **La app se guarda sola** en el iPad la primera vez que se abre, así que abre aunque
  no haya internet (lo hace `sw.js`).
- **Los libros se descargan** con el botón *"Descargar los N que faltan"* en la pestaña
  **Mi estantería**. Los 325 libros ocupan unos 132 MB y se bajan en pocos minutos.
  Se puede parar a la mitad y seguir después: no se repite lo ya bajado.
- También se puede descargar libro por libro desde su ficha.

Lo guardado, los favoritos y el punto donde quedó la lectura viven **solo en ese iPad**.

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
| `sw.js` | Hace que funcione sin internet |
| `icono.png` | Ícono para la pantalla de inicio |
| `herramientas/` | Los programas que arman el catálogo y `publicar.bat` (ver `herramientas/LEEME.md`) |

## Licencias

Los textos de `libros/` son de dominio público y se distribuyen con el aviso de
Project Gutenberg intacto, como exige su licencia. Los libros modernos no se
copian: solo se enlaza a Internet Archive, que es quien presta legalmente.
