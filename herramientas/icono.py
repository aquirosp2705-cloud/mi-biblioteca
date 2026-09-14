import zlib, struct, os

# --- rutas (no tocar) -------------------------------------------------------
AQUI     = os.path.dirname(os.path.abspath(__file__))   # carpeta herramientas
DATOS    = os.path.join(AQUI, 'datos')                  # datos de trabajo
PROYECTO = os.path.dirname(AQUI)                        # carpeta de la app
os.makedirs(DATOS, exist_ok=True)
# ---------------------------------------------------------------------------

S=512
def px(x,y):
    # fondo
    r,g,b = 0x7a,0x2f,0x2f
    # esquina redondeada
    R=110
    for cx,cy in ((R,R),(S-R,R),(R,S-R),(S-R,S-R)):
        if ((x<R and cx==R) or (x>S-R and cx==S-R)) and ((y<R and cy==R) or (y>S-R and cy==S-R)):
            if (x-cx)**2+(y-cy)**2 > R*R: return (0,0,0,0)
    # tres lomos de libro
    libros = [(96,150,150,300,(0xf7,0xf3,0xec)), (176,120,150,340,(0x3f,0x5d,0x4a)), (256,160,150,290,(0xe0,0xa9,0x7a))]
    for lx,ly,w,h,col in libros:
        if lx<=x<lx+w and ly<=y<ly+h:
            if x-lx<10 or x-lx>w-10: col=tuple(int(c*0.82) for c in col)
            if y-ly<14: col=tuple(min(255,int(c*1.12)) for c in col)
            return col+(255,)
    # base (repisa)
    if 470<=y<492 and 70<=x<440: return (0xe0,0xa9,0x7a,255)
    return (r,g,b,255)
rows=[]
for y in range(S):
    row=bytearray([0])
    for x in range(S):
        row += bytes(px(x,y))
    rows.append(bytes(row))
raw=b''.join(rows)
def chunk(t,d):
    c=struct.pack('>I',len(d))+t+d
    return c+struct.pack('>I', zlib.crc32(t+d)&0xffffffff)
png=(b'\x89PNG\r\n\x1a\n'
  +chunk(b'IHDR',struct.pack('>IIBBBBB',S,S,8,6,0,0,0))
  +chunk(b'IDAT',zlib.compress(raw,9))
  +chunk(b'IEND',b''))
open(os.path.join(PROYECTO, 'icono.png'), 'wb').write(png)
print('icono listo', len(png), 'bytes')
