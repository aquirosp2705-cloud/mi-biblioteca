# -*- coding: utf-8 -*-
"""ACTUALIZAR LA BIBLIOTECA

Ejecuta los pasos en orden y deja la app lista para publicar.
Se puede correr con doble clic en 'actualizar.bat' (en esta misma carpeta).

Para AGREGAR MAS LIBROS: sube el numero de TOPE_MB aqui abajo y vuelve a correrlo.
  72 MB  -> unos 157 libros   (lo que hay hoy)
 200 MB  -> unos 360 libros   (entra todo el espanol ya clasificado)
"""
import os, subprocess, sys, time

TOPE_MB = 72          # <-- cuanto puede pesar la carpeta 'libros'
BAJAR_CATALOGO = False  # True = vuelve a preguntarle a Gutenberg que hay (tarda ~20 min)

AQUI = os.path.dirname(os.path.abspath(__file__))
PASOS = [
    ('1_descargar_catalogo.py', 'Preguntar a Project Gutenberg que libros hay', BAJAR_CATALOGO),
    ('2_clasificar.py',         'Ordenar los libros por genero',                True),
    ('3_armar_biblioteca.py',   'Bajar los textos y armar el catalogo',         True),
    ('4_modernos_prestamo.py',  'Verificar libros modernos en Internet Archive', True),
    ('5_acceso_abierto.py',     'Buscar libros academicos de acceso abierto',    True),
]

entorno = dict(os.environ, TOPE_MB=str(TOPE_MB), PYTHONIOENCODING='utf-8')
fallos = []

for archivo, descripcion, activo in PASOS:
    if not activo:
        print(f'\n--- SALTADO: {descripcion} ({archivo})')
        continue
    print(f'\n=== {descripcion}\n    ({archivo})')
    inicio = time.time()
    r = subprocess.run([sys.executable, '-u', os.path.join(AQUI, archivo)],
                       cwd=AQUI, env=entorno)
    if r.returncode == 0:
        print(f'    terminado en {time.time()-inicio:.0f} s')
    else:
        print(f'    *** FALLO (codigo {r.returncode})')
        fallos.append(archivo)

print('\n' + '=' * 60)
if fallos:
    print('Terminado CON FALLOS en:', ', '.join(fallos))
    print('La app sigue funcionando con lo que ya tenia.')
else:
    print('Biblioteca actualizada.')
print('\nSiguiente paso para publicarla en internet, desde la carpeta del proyecto:')
print('   git add -A')
print('   git commit -m "Mas libros"')
print('   git push')
