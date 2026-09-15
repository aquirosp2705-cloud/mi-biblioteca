// ============================================================
// Lector de EPUB sin librerias. Solo APIs del navegador.
// Funciona en Safari de iPad 16.4+ (DecompressionStream).
// ============================================================

// ---------- 1. ZIP: leer el directorio central ----------
function leerZip(buf) {
  const dv = new DataView(buf);
  const u8 = new Uint8Array(buf);

  // El EOCD ("fin del directorio central") esta al final del archivo.
  // Puede llevar hasta 65535 bytes de comentario detras, asi que
  // lo buscamos hacia atras.
  let eocd = -1;
  const minimo = Math.max(0, buf.byteLength - 65557 - 22);
  for (let i = buf.byteLength - 22; i >= minimo; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('No parece un ZIP/EPUB valido.');

  const nEntradas = dv.getUint16(eocd + 10, true);
  const inicioCD  = dv.getUint32(eocd + 16, true);

  if (nEntradas === 0xffff || inicioCD === 0xffffffff) {
    throw new Error('ZIP64 no soportado.'); // no pasa con libros normales
  }

  const dec = new TextDecoder('utf-8');
  const entradas = new Map();
  let p = inicioCD;

  for (let i = 0; i < nEntradas; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const metodo   = dv.getUint16(p + 10, true);
    const cSize    = dv.getUint32(p + 20, true);
    const uSize    = dv.getUint32(p + 24, true);
    const nLen     = dv.getUint16(p + 28, true);
    const eLen     = dv.getUint16(p + 30, true);
    const cLen     = dv.getUint16(p + 32, true);
    const offLocal = dv.getUint32(p + 42, true);
    const nombre   = dec.decode(u8.subarray(p + 46, p + 46 + nLen));
    entradas.set(nombre, { metodo, cSize, uSize, offLocal });
    p += 46 + nLen + eLen + cLen;
  }
  return { dv, u8, entradas };
}

// ---------- 2. Sacar UN archivo del ZIP ----------
async function sacarArchivo(zip, nombre) {
  const e = zip.entradas.get(nombre);
  if (!e) throw new Error('No esta en el libro: ' + nombre);

  // OJO: la cabecera local tiene su PROPIO tamano de "extra field",
  // distinto al del directorio central. Hay que leerla.
  const h = e.offLocal;
  if (zip.dv.getUint32(h, true) !== 0x04034b50) {
    throw new Error('Cabecera local corrupta.');
  }
  const nLen = zip.dv.getUint16(h + 26, true);
  const eLen = zip.dv.getUint16(h + 28, true);
  const ini  = h + 30 + nLen + eLen;
  const datos = zip.u8.subarray(ini, ini + e.cSize);

  if (e.metodo === 0) return datos;            // guardado tal cual
  if (e.metodo !== 8) throw new Error('Metodo de compresion ' + e.metodo);

  // deflate crudo -> DecompressionStream
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([datos]).stream().pipeThrough(ds);
  const salida = await new Response(stream).arrayBuffer();
  return new Uint8Array(salida);
}

async function sacarTexto(zip, nombre) {
  return new TextDecoder('utf-8').decode(await sacarArchivo(zip, nombre));
}

// ---------- 3. EPUB: container.xml -> OPF -> spine ----------
function resolverRuta(base, rel) {
  // Los href del OPF son URIs: pueden venir con %20, %C3%A9, etc.
  // Dentro del ZIP el nombre esta SIN codificar. Hay que decodificar
  // o el capitulo "cap%201.xhtml" no se encuentra nunca.
  rel = rel.split('#')[0];                        // quitar ancla
  try { rel = decodeURIComponent(rel); } catch (e) { /* href raro: dejarlo */ }

  // base = "OEBPS/content.opf" -> carpeta "OEBPS/"
  const carpeta = base.includes('/') ? base.slice(0, base.lastIndexOf('/') + 1) : '';
  const partes = (carpeta + rel).split('/');
  const out = [];
  for (const s of partes) {
    if (s === '.' || s === '') continue;
    if (s === '..') out.pop(); else out.push(s);
  }
  return out.join('/');
}

async function abrirEpub(arrayBuffer) {
  const zip = leerZip(arrayBuffer);
  const P = new DOMParser();

  // Libros COMPRADOS en Amazon/Kobo/Google llevan candado (DRM).
  // No se pueden abrir, y hay que decirlo claro en vez de fallar raro.
  if (zip.entradas.has('META-INF/encryption.xml') ||
      zip.entradas.has('META-INF/rights.xml')) {
    throw new Error('DRM: este libro tiene proteccion anticopia y no se puede abrir aqui.');
  }

  // container.xml dice donde esta el OPF
  const cont = P.parseFromString(
    await sacarTexto(zip, 'META-INF/container.xml'), 'application/xml');
  const rootEl = cont.querySelector('rootfile');
  const opfPath = rootEl && rootEl.getAttribute('full-path');
  if (!opfPath) throw new Error('EPUB sin container.xml valido.');

  const opf = P.parseFromString(await sacarTexto(zip, opfPath), 'application/xml');

  // titulo y autor
  const t = opf.getElementsByTagName('dc:title')[0] || opf.querySelector('title');
  const a = opf.getElementsByTagName('dc:creator')[0] || opf.querySelector('creator');
  const titulo = t ? t.textContent.trim() : 'Sin titulo';
  const autor  = a ? a.textContent.trim() : '';

  // manifest: id -> ruta absoluta dentro del zip
  const manifest = new Map();
  for (const it of opf.querySelectorAll('manifest > item')) {
    manifest.set(it.getAttribute('id'),
      resolverRuta(opfPath, it.getAttribute('href')));
  }

  // spine: EL ORDEN DE LECTURA. Esto es lo que importa.
  const orden = [], faltan = [];
  for (const ir of opf.querySelectorAll('spine > itemref')) {
    if (ir.getAttribute('linear') === 'no') continue; // saltar anexos
    const ruta = manifest.get(ir.getAttribute('idref'));
    // Si falta, lo anotamos: NO lo tiramos en silencio, porque si no
    // el libro se abre "bien" pero con capitulos de menos.
    if (!ruta || !zip.entradas.has(ruta)) { faltan.push(ir.getAttribute('idref')); continue; }
    orden.push(ruta);
  }
  if (!orden.length) throw new Error('El EPUB no tiene capitulos legibles.');

  return { zip, titulo, autor, orden, faltan };
}

// ---------- 4. Capitulo -> texto limpio ----------
async function leerCapitulo(libro, i) {
  const html = await sacarTexto(libro.zip, libro.orden[i]);
  const doc = new DOMParser().parseFromString(html, 'application/xhtml+xml');
  // si el XHTML viene mal formado, reintentar como HTML
  const d = doc.querySelector('parsererror')
    ? new DOMParser().parseFromString(html, 'text/html') : doc;
  d.querySelectorAll('script,style,svg,img').forEach(n => n.remove());
  const body = d.body || d.documentElement;
  return (body.textContent || '').replace(/[ \t ]+/g, ' ')
                                 .replace(/\n{3,}/g, '\n\n').trim();
}
