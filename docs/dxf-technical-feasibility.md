# Viabilidad técnica del DXF para fabricación

## Hallazgos verificados

Los bloques con atributos son compatibles con **DXF R12**. El patrón de implementación consiste en definir un `ATTDEF` dentro de la definición `BLOCK`, crear un `INSERT` por cada instancia y asociar los valores de cada atributo como entidades `ATTRIB`. Las marcas de atributos pueden declararse invisibles, manteniendo los metadatos disponibles para herramientas CAD de extracción de datos.

DXF R12 solo soporta **un único espacio papel**. Los layouts múltiples requieren una estructura de DXF más moderna, a partir de R13 y con objetos de layout completos desde R2000. Las escalas anotativas modernas se gestionan como propiedades de los objetos y por tanto no son un mecanismo que pueda declararse de manera fiable en el R12 ASCII mínimo actual.

## Decisión de implementación

La siguiente implementación mantendrá la geometría en espacio modelo a escala 1:1, expresada en milímetros, y ampliará el exportador con:

- Capas específicas de fabricación, con color, tipo de línea y grosor asignados.
- Bloques reutilizables de módulos, huecos, elementos y referencias de fabricación con atributos invisibles.
- Referencias `INSERT` y valores `ATTRIB` que permitan una extracción posterior de material mediante AutoCAD u otra herramienta compatible.
- Cotas geométricas explícitas y textos a alturas de impresión configurables, en sustitución de anotaciones nativas para conservar la compatibilidad R12.

La creación de layouts múltiples con cajetín, viewports a escala y objetos anotativos se documentará como mejora posterior que requiere elevar la salida a DXF R2000+ o utilizar una plantilla DWG/DWT externa.

## Fuentes consultadas

1. https://dxfwrite.readthedocs.io/en/latest/entities/attrib.html
2. https://ezdxf.readthedocs.io/en/stable/dxfinternals/layout_management.html
3. https://www.autodesk.com/learn/ondemand/curated/scaling-annotative-objects/5hBhXXm6lIP44sqOb05A1N

## Confirmación en navegador

La documentación revisada confirma que los atributos de bloque R12 permiten marcas invisibles y que los valores de cada instancia deben asociarse al `INSERT` como `ATTRIB`; este patrón permite después generar informes desde una aplicación CAD. Asimismo, la documentación de layouts confirma que R12 admite un único espacio papel, mientras que los layouts múltiples necesitan estructuras posteriores y más completas.

Por tanto, la exportación técnica se mantendrá deliberadamente en R12 para asegurar una estructura simple, transparente y compatible con el exportador actual. Las láminas múltiples anotativas quedarán fuera de esta fase por necesitar una revisión del formato de salida.
