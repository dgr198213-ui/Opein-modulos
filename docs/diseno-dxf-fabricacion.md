# Diseño de fabricación y DXF moderno

## Metadatos editables

Cada módulo, elemento y partida de despiece podrá llevar una ficha de fabricación con los siguientes campos: `referencia`, `cantidad`, `proveedor`, `metrica`, `gradoAcero`, `perfil` y `notas`. Los campos se guardan con el proyecto y se exportan como atributos invisibles de un bloque para habilitar su extracción posterior mediante herramientas CAD.

Los valores iniciales proceden solo de fuentes verificadas. Los módulos de 6 m se precargan con las referencias publicadas por Opein cuando corresponda. Los campos que el catálogo no concreta, como la métrica, el grado de acero y el perfil, se inician como `N/D` y permanecen editables.

## Bloques y BOM

La salida incluirá definiciones `BLOCK` para módulos, elementos, tornillería, perfiles, uniones y esquineras. Cada referencia de módulo o elemento generará un `INSERT` con sus valores `ATTRIB`; las partidas de fabricación creadas por el usuario se exportarán como referencias de bloques de despiece. Las marcas de atributos se declararán invisibles para evitar contaminar el plano y conservar la capacidad de extracción de materiales.

## Capas de fabricación

| Capa | Color ACI | Tipo de línea | Grosor |
|---|---:|---|---:|
| `MEC_TORNILLERIA` | 4, cian | CONTINUOUS | 0,18 mm |
| `ESTR_PERFILES` | 1, rojo | CONTINUOUS | 0,50 mm |
| `COTAS_GENERALES` | 3, verde | CONTINUOUS | 0,18 mm |
| `COTAS_DETALLES` | 2, amarillo | CONTINUOUS | 0,18 mm |
| `EJES_CENTRO` | 8, gris | CENTER | 0,18 mm |

También se conservan capas separadas para módulos, tabiques, aberturas, elementos, texto y BOM. Las entidades se exportan en color, tipo de línea y grosor **ByLayer**.

## Láminas de salida

El DXF se elevará a formato **AC1015 (AutoCAD 2000)** para representar layouts, bloques, tablas, objetos y viewports. Se emitirán dos láminas A3 horizontales: `PLANTA_1_20` y `ALZADO_1_20`, con cajetín normalizado, área de viewport, escala y datos de cliente. La geometría del modelo se mantiene a escala 1:1 en milímetros; los viewports adoptan la escala seleccionada.

El estándar 2000 permite layouts y viewports, pero las propiedades anotativas nativas llegaron posteriormente. Para evitar una estructura de objetos contextual incompleta, las cotas se emitirán con una altura de texto calculada para que impriman de forma correcta a la escala de la lámina. Al abrir el DXF, un usuario de AutoCAD puede convertir el estilo de cota a anotativo si necesita asociar escalas adicionales.
