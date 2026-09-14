# Herramientas de Mi Biblioteca

Aquí están los programas que arman la biblioteca. **No hay que tocarlos para usar la
app** — solo cuando se quieran agregar más libros.

## Para agregar más libros

1. Abrir `actualizar.py` con el Bloc de notas.
2. Cambiar el número de `TOPE_MB` (es cuánto puede pesar la carpeta de libros):

   | TOPE_MB | Libros aproximados |
   |---|---|
   | 72 | 164 — lo que hay hoy |
   | 120 | unos 250 |
   | 200 | unos 360 — entra todo el español ya clasificado |

3. Guardar y hacer **doble clic en `actualizar.bat`**.
4. Cuando termine, publicar los cambios desde la carpeta del proyecto:

```bash
git add -A && git commit -m "Mas libros" && git push
```

La primera vez tarda: tiene que bajar el texto de cada libro nuevo. Los que ya están
descargados no se vuelven a bajar.

## Qué hace cada programa

| Programa | Qué hace | Tarda |
|---|---|---|
| `1_descargar_catalogo.py` | Le pregunta a Project Gutenberg qué libros existen y guarda la lista en `datos/raw.json` | ~20 min |
| `2_clasificar.py` | Ordena esos libros por género con reglas precisas y guarda `datos/clasificados.json` | segundos |
| `3_armar_biblioteca.py` | Elige los mejores, baja el texto completo a `libros/` y escribe `catalogo.json` | minutos |
| `4_modernos_prestamo.py` | Comprueba en Internet Archive qué libros modernos se pueden leer gratis y escribe `modernos.json` | ~3 min |
| `5_acceso_abierto.py` | Busca libros académicos de acceso abierto y escribe `abiertos.json` | ~1 min |
| `icono.py` | Vuelve a dibujar el ícono de la app | segundos |
| `actualizar.py` | Ejecuta todos los anteriores en orden | |

El paso 1 está **apagado** por defecto en `actualizar.py` (`BAJAR_CATALOGO = False`),
porque la lista de Gutenberg ya está guardada y casi no cambia. Solo se enciende si se
quiere buscar libros nuevos que hayan publicado.

## Reglas que aplica el programa 3

- **El español manda**: primero entran los libros en español; el inglés solo se usa
  donde el español no alcanza (liderazgo, crecimiento personal, neurociencia).
- **Sin repetidos**: si hay varias ediciones de la misma obra del mismo autor, entra una.
- **Nada de rarezas**: se descartan libros con menos de 320 descargas en Gutenberg.
- **Lectura corta**: se marca "Fácil" lo que baja de 200.000 caracteres (unas 3 horas).
- Los libros que quedan fuera del catálogo se borran de `libros/` para no ocupar espacio.

## Si algo sale mal

- La carpeta `datos/` se puede reconstruir: encender `BAJAR_CATALOGO = True` y correr
  `actualizar.bat` otra vez (tarda, pero no se pierde nada).
- Mientras no se haga `git push`, la app publicada en internet sigue como estaba.
- Para deshacer todo lo hecho desde el último `push`, desde la carpeta del proyecto:
  `git checkout -- .`

## Nota legal

Los textos de `libros/` son de dominio público y se guardan con el aviso de Project
Gutenberg intacto, como pide su licencia. Los libros modernos **no se copian**: solo se
guarda el enlace a Internet Archive y a OAPEN, que son quienes los prestan o publican.
