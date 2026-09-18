# Verificación visual del DXF

La inspección inicial con `ezdxf` confirmó que los archivos de prueba son AC1021, tienen el bloque `CAJETIN`, 34 entidades en planta y 31 en alzado, y pasan `audit()` con cero errores. Las capas visibles son `MODULOS`, `TABIQUES`, `ABERTURAS`, `ELEMENTOS`, `TEXTO` y `CAJETIN`.

El visor Autodesk Viewer se abrió en Chromium, pero la interfaz permaneció en blanco y no mostró controles de carga en la sesión disponible. Por tanto, no se ha podido completar una comprobación visual interactiva en Autodesk Viewer.

Hallazgo importante: `@tarikjabiri/dxf` permite definir capas con nombre, color y tipo de línea mediante `addLayer`, pero su API no ofrece un parámetro de grosor de línea en `addLayer`. La lectura con `ezdxf` devuelve `lineweight=0` para las capas creadas. En consecuencia, el grosor final no queda codificado en este DXF por capa y debe controlarse mediante una tabla CTB/STB en AutoCAD, o mediante una modificación posterior del archivo que añada códigos de grosor a las tablas de capas. Esta limitación debe resolverse antes de afirmar que el CTB está verificado visualmente.

ShareCAD sí declara compatibilidad con DXF y muestra un control visible de selección, pero el navegador automatizado no pudo asociar el input de archivo oculto ni completar la carga. Se intentó cargar el DXF desde una ruta autorizada y se inspeccionó el DOM; la carga visual no pudo completarse en esta sesión.

La auditoría de capas confirmó que el color ACI y el tipo de línea sí están presentes, pero el grosor de capa resulta `0` en el DXF. Esto significa que una CTB puede asignar grosores al imprimir por color, pero no se puede afirmar que el archivo ya lleve grosores de capa equivalentes a 0,50/0,18 mm sin modificar la librería o postprocesar el DXF.

## Verificación visual de BOM, cotas y detalles

Las vistas previas muestran en planta y alzado una tabla BOM integrada bajo la geometría principal, tres recuadros de detalle ampliado y el cajetín. La planta incluye cotas de puerta, ventana y pieza individual, además de la doble línea del cerramiento: perímetro estructural y línea interior desplazada por el espesor configurado. La auditoría con ezdxf devuelve 0 errores en ambos archivos; no se generan LWPOLYLINE ni VIEWPORT.

La vista general reduce la legibilidad de los textos por la extensión conjunta de la lámina, pero la organización espacial es correcta y cada bloque puede inspeccionarse con zoom en el visor CAD. Los detalles son representaciones 2D ampliadas de referencia; no sustituyen todavía una ficha constructiva con tolerancias o perfiles verificados por Opein.
