# Mejora visual y técnica de la exportación DXF

## Diagnóstico de la captura

La captura no muestra un fallo de lectura del visor, sino una exportación geométricamente demasiado abstracta. Los módulos aparecen como rectángulos con una etiqueta interior; los elementos aparecen como cajas pequeñas sin simbología funcional; las cotas están desconectadas del objeto y expresadas como `cm`, aunque el proyecto trabaja con módulos y dimensiones reales en metros; y el cajetín queda lejos de la geometría principal, por lo que la lámina no tiene una composición técnica equilibrada.

El problema principal es que el exportador actual representa la entidad conceptual “módulo” pero no representa sus componentes técnicos. En planta faltan espesores de cerramiento, puertas con hoja y arco, ventanas con marco, mobiliario reconocible, sanitarios, equipos, ejes y referencias. En alzado faltan alturas de huecos, zócalos, paneles, carpinterías y una línea de terreno o base vinculada al módulo. El resultado es válido como esquema de ubicación, pero pobre como plano de fabricación o montaje.

## Objetivo recomendado

La mejora debe convertir la exportación en un **plano 2D técnico por capas**, no intentar dibujar un modelo 3D dentro de un DXF 2D. Un DXF puede representar una planta y un alzado claros, con bloques repetibles y atributos extraíbles; la comprobación de interferencias, la explosión de montaje y la generación de piezas estructurales 3D deben quedar para un flujo posterior en SolidWorks, Inventor, Fusion 360 o un sistema BIM.

## Arquitectura de representación

| Capa | Contenido | Tratamiento recomendado |
|---|---|---|
| `ESTR_PERFILES` | perímetro, bastidor y perfiles principales | doble línea cuando exista espesor; color rojo; grosor ByLayer |
| `PANELES` | paneles, juntas y revestimientos | líneas finas y juntas modulares cada longitud real de panel |
| `ABERTURAS` | puertas y ventanas | bloques con marco, hoja, arco de apertura, antepecho y etiqueta |
| `ELEMENTOS` | mobiliario, sanitarios, equipos y depósitos | bloques 2D por tipo, con geometría reconocible y atributos |
| `EJES_CENTRO` | ejes y centros de modulación | tipo de línea CENTER y color gris |
| `COTAS_GENERALES` | cotas exteriores y generales | líneas finas, flechas y textos fuera del objeto |
| `COTAS_DETALLES` | cotas de huecos, perfiles y piezas | líneas finas y referencias a detalle |
| `TEXTO` | nombres, referencias y notas | altura anotativa equivalente a la escala de salida |
| `CAJETIN` | marco, título y atributos del plano | bloque único insertado cerca del conjunto, no como objeto aislado |

La separación responde al principio de tipos de línea y jerarquía gráfica de ISO 128-2, que define las configuraciones y aplicaciones de las líneas en planos técnicos [1]. Las cotas deben reorganizarse según principios de presentación de dimensiones de ISO 129-1 [2].

## Módulos: tres niveles de detalle

El exportador debería disponer de un nivel de detalle seleccionable. En el nivel **esquema**, se conserva el perímetro y el nombre. En el nivel **técnico**, cada módulo se dibuja como un conjunto de paneles, perfiles, huecos y elementos interiores. En el nivel **fabricación**, se añaden referencias de perfiles, juntas, tornillería, puntos de izado y una tabla de despiece.

El nivel técnico es el objetivo inmediato. Cada módulo debe mostrar un perímetro exterior y otro interior separados por el espesor de cerramiento disponible en el modelo; juntas verticales y horizontales; esquinas reforzadas; orientación; ejes de modulación; puertas y ventanas con símbolos convencionales; y una etiqueta exterior con referencia, dimensiones y altura. Las juntas no deben competir visualmente con el perímetro: deben usar una capa fina y un tipo de línea diferenciado.

La geometría debe generarse en unidades reales y 1:1. La etiqueta actual `3 x 2 cm` es especialmente problemática: para un módulo de 3,00 × 2,44 m debe aparecer como `3000 × 2440 mm` o `3,00 × 2,44 m`, según la norma gráfica seleccionada. No debe mezclarse la unidad interna de la aplicación con la unidad de presentación.

## Piezas y elementos

Cada elemento debe tener un bloque 2D dedicado, aunque su geometría se componga de líneas simples. Una mesa necesita sobre y patas; una taquilla necesita módulos verticales; una escalera necesita peldaños y sentido de subida; una rampa necesita flecha de pendiente; un cuadro eléctrico necesita envolvente y puerta; un depósito necesita contorno, conexiones y eje; una puerta necesita marco, hoja y arco; y una ventana necesita marco, montantes y línea de vidrio.

Los bloques repetibles deben incluir atributos como `REF`, `TIPO`, `CANTIDAD`, `ANCHO`, `FONDO`, `ALTURA`, `PESO_KG` y `PROVEEDOR`. La referencia debe mostrarse en planta cuando sea necesario y mantenerse como atributo editable cuando no convenga saturar el dibujo. AutoCAD trata los bloques como grupos nombrados de objetos 2D o 3D reutilizables [3], y los atributos permiten conservar información asociada al bloque para extracción posterior.

## Cotas, composición y cajetín

Las cotas actuales deben sustituirse por un sistema de cotas con tres bandas: cotas generales de conjunto, cotas de módulos y cotas de huecos o piezas. Las líneas auxiliares deben salir de los extremos reales y el texto debe permanecer fuera del contorno siempre que haya espacio. El texto debe declarar explícitamente la unidad, por ejemplo `6000`, `2440` y `2700 mm`, y no `6 x 2 cm`.

El cajetín debe colocarse en una lámina coherente con el conjunto. Si se mantiene solo model space, el exportador debe calcular el bounding box de toda la geometría y situar el cajetín a una distancia controlada debajo o a la derecha del plano, escalándolo con el mismo factor de presentación. La captura muestra que el cajetín está demasiado separado del conjunto; esto se corrige agrupando geometría y cajetín en una extensión común y evitando posiciones fijas basadas únicamente en `maxX + 10`.

El cajetín debe incluir título, referencia de plano, revisión, fecha, cliente, escala, unidades, autor, estado de datos y advertencia de pesos pendientes. Para una lámina técnica también conviene añadir una leyenda de capas y una tabla de elementos. Los grosores deben continuar siendo ByLayer y la CTB debe asignar espesores; Autodesk documenta que el resultado de impresión depende de la configuración de lineweight y de cómo se controlan las propiedades de los objetos y capas [4].

## Qué debe implementarse primero

| Prioridad | Mejora | Impacto |
|---|---|---|
| 1 | Corregir unidades, bounding box y posición del cajetín | elimina el aspecto de exportación rota |
| 2 | Crear bloques 2D para puerta, ventana y elementos principales | hace reconocible la planta |
| 3 | Dibujar doble línea de cerramiento, esquinas y juntas de panel | da espesor y lectura constructiva |
| 4 | Separar capas estructurales, paneles, cotas, ejes y texto | permite controlar impresión y edición |
| 5 | Añadir cotas generales y de huecos con mm explícitos | hace el plano verificable |
| 6 | Añadir atributos por pieza y tabla de despiece | prepara fabricación y extracción BOM |
| 7 | Crear detalles ampliados de uniones y perfiles | completa el nivel de fabricación |

## Límite entre DXF 2D y modelo 3D

El DXF mejorado puede ser un plano técnico de planta, alzado y detalles con bloques, atributos, capas y cotas. No debe prometer por sí solo una representación realista tridimensional, una vista explosionada o una validación de interferencias. Para eso habría que añadir un modelo paramétrico 3D por módulo, perfiles y uniones, y después exportar STEP/IGES o IFC según el flujo de destino.

La recomendación es implementar primero el nivel técnico 2D y validar una lámina completa con un módulo de 6 m, un módulo de 4 m, una puerta, una ventana y tres elementos interiores. Solo después conviene ampliar el catálogo de bloques y abordar los detalles de fabricación.

## Referencias

[1]: https://www.iso.org/obp/ui/#iso:std:iso:128:-2:ed-1:v1:en "ISO 128-2:2020 — Technical product documentation: basic conventions for lines"
[2]: https://www.iso.org/obp/ui#!iso:std:iso:129:-1:ed-2:v1:en "ISO 129-1:2018 — Technical product documentation: dimensioning"
[3]: https://www.autodesk.com/solutions/cad-blocks "Autodesk — CAD blocks"
[4]: https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/Lineweights-plot-thicker-than-expected-in-AutoCAD.html "Autodesk — Lineweights plot thicker or lighter than expected in AutoCAD products"

## Comprobación visual de la implementación

La vista previa de planta ya muestra doble perímetro, juntas verticales, ejes, símbolos de huecos y bloques reconocibles para piezas; el cajetín aparece junto al conjunto y las dimensiones se expresan en milímetros. La vista previa de alzado muestra perfiles, juntas horizontales y verticales, una abertura exterior y una línea de base.

La escala de previsualización completa hace que los textos pequeños se vean reducidos; esto es esperable en una lámina global y debe resolverse con zoom o escala de impresión, no aumentando indiscriminadamente todos los textos. La composición es claramente más técnica que la versión anterior, aunque la siguiente iteración podría añadir una vista de detalle ampliada para puertas, ventanas y uniones.
