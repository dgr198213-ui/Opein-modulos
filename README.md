# Opein · Configurador modular

Aplicación web para diseñar distribuciones de módulos prefabricados de Opein. Permite trabajar en **planta**, **alzado** y **despiece de materiales**, asociar una ficha de cliente a cada proyecto local y exportar la vista de trabajo como imagen o PDF. Está pensada como una herramienta comercial de campo: móvil primero, sin instalación y con una interacción visual próxima a un CAD ligero.

La aplicación está desplegada en Vercel y el repositorio `main` está conectado al despliegue automático de producción.

> **Estado actual:** el configurador es funcional para diseño local y presentación comercial. No es todavía un sistema multiusuario, un ERP de stock ni un plano técnico homologado.

## 1. Stack tecnológico

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| Aplicación | Next.js 14.2, App Router | Entrada web, compilación y despliegue. |
| Interfaz | React 18 + TypeScript | Componentes, estado de la escena y formularios. |
| Plano | Konva 9 + react-konva | Lienzo, formas, arrastre, zoom, selección y eventos táctiles. |
| Exportación | jsPDF + canvg | Captura de planta/alzado y generación de PDF en el navegador. |
| Estilos | CSS global en `app/globals.css` | Diseño responsive, bandejas, paneles y herramientas. |
| Persistencia | `window.localStorage` | Proyectos y fichas de cliente en el navegador actual. |
| Backend | Ninguno | No existen API, base de datos, autenticación ni sincronización. |

El proyecto no necesita variables de entorno para su funcionamiento actual. Las dependencias principales están declaradas en `package.json` y bloqueadas mediante `package-lock.json`.

### Comandos

```bash
npm install
npm run dev       # servidor de desarrollo
npm run build     # compilación de producción y comprobación de tipos
npm run start     # arranque de la compilación producida
npm run lint      # disponible si el entorno de Next.js lo requiere
```

## 2. Arquitectura del proyecto

La aplicación concentra el estado de una escena en `components/Configurator.tsx`. El resto de componentes dibuja partes concretas o calcula vistas derivadas. Esta elección mantiene una única fuente de verdad para módulos, particiones, elementos, pestaña activa e historial, y permite que planta, alzado, despiece y exportación trabajen sobre los mismos datos.

| Archivo o directorio | Función |
|---|---|
| `app/page.tsx` | Punto de entrada de la página y montaje del configurador. |
| `app/layout.tsx` | Layout raíz, metadatos y estructura global de Next.js. |
| `app/globals.css` | Sistema visual completo y reglas responsive. |
| `components/Configurator.tsx` | Orquestación de la escena, herramientas, proyectos, historial y exportación. |
| `components/ModuleShape.tsx` | Representación Konva de un módulo, paredes, medidas, selección y arrastre. |
| `components/ElementToken.tsx` | Símbolos vectoriales de mobiliario, climatización, accesos, instalaciones y seguridad. |
| `components/WallShape.tsx` | Dibujo de tabiques y estados de pared, puerta y ventana. |
| `components/ElevationView.tsx` | Alzado generado desde los módulos y elementos exteriores de la planta. |
| `components/BreakdownView.tsx` | Vista de despiece de solo lectura, calculada al vuelo. |
| `components/ModuleThumbnail.tsx` | Siluetas SVG de los tipos de módulo en la bandeja de catálogo. |
| `lib/types.ts` | Tipos de módulo, partición, elemento, modo de herramienta y pestaña. |
| `lib/catalog.ts` | Catálogo de módulos y elementos, categorías, colores, medidas base y SKU. |
| `lib/geometry.ts` | Reglas de rejilla, límites, ajuste magnético, selección geométrica y estados de pared. |
| `lib/local-projects.ts` | Adaptador aislado de proyectos en `localStorage`, preparado para una futura migración. |

### Flujo de datos

La escena se modela con tres colecciones principales: `modules`, `partitions` y `elements`. Cada modificación se aplica desde el configurador y pasa por el historial de escenas cuando altera geometría o contenido. Las vistas de alzado y despiece reciben los datos actuales como propiedades; no mantienen una copia editable ni guardan información derivada.

El guardado local serializa un `ProjectSnapshot` con módulos, particiones, elementos y pestaña activa. La ficha de cliente es opcional dentro de `LocalProject`, de modo que los proyectos creados antes de esa funcionalidad continúan siendo válidos.

## 3. Funcionalidades actuales

### 3.1 Planta

La bandeja permite añadir módulos y elementos al plano. Los módulos actuales incluyen los modelos de 4 m y 6 m diáfanos, el módulo de 6 m con sanitario, el módulo de 6 m con duchas y almacenes de 10 y 20 pies. Las referencias verificadas se mantienen en `lib/catalog.ts` y las tarjetas muestran la referencia `sku` cuando está disponible.

En planta se puede seleccionar, arrastrar, rotar, duplicar y eliminar. El movimiento utiliza rejilla y alineación magnética. La herramienta **Desplazar** permite navegar por el lienzo; también existen zoom, encuadre, zoom con rueda y gesto de pellizco en dispositivos táctiles.

Los tabiques se crean marcando dos puntos. Las paredes de los módulos y las particiones recorren el ciclo `wall → door → window → wall`. Las medidas de módulos y elementos seleccionados son editables, y los elementos nuevos utilizan las dimensiones base de catálogo hasta que se personalizan.

La selección múltiple funciona mediante `Shift + clic` en escritorio o marco de selección. Arrastrar un objeto seleccionado mueve el grupo completo. El panel contextual ofrece duplicar, eliminar, alinear a izquierda, centro y derecha, alinear arriba, centro y abajo, y distribuir horizontal o verticalmente. Estas operaciones pasan por el historial.

### 3.2 Alzado

`ElevationView.tsx` genera una vista de fachada a partir de la planta. Usa la fachada inferior de cada módulo, refleja puertas y ventanas y coloca los elementos exteriores según su fracción de altura relativa. La vista es una representación comercial orientativa, no una elevación constructiva certificada.

### 3.3 Despiece

La pestaña **Despiece** es de solo lectura y se recalcula automáticamente desde el estado actual. Agrupa módulos por tipo con cantidad, medidas, superficie subtotal y superficie general. Agrupa elementos por tipo y cuenta puertas, ventanas y paredes ciegas.

El conteo de aberturas y paredes utiliza un único conjunto: las cuatro paredes de cada módulo más las particiones dibujadas. Por ello, una partición con estado de puerta o ventana no se cuenta además como pared ciega.

### 3.4 Proyectos y ficha de cliente

El panel **Proyectos** permite guardar, actualizar, guardar como nuevo, cargar y eliminar proyectos. Cada proyecto contiene nombre, fechas de creación y actualización, snapshot de la escena y una ficha de cliente opcional con:

| Campo | Uso |
|---|---|
| Cliente | Nombre comercial o persona responsable. |
| Contacto | Teléfono, correo u otro dato libre. |
| Ubicación | Dirección, municipio o emplazamiento. |
| Fecha de entrega | Fecha ISO `yyyy-mm-dd`, opcional. |
| Especificaciones | Observaciones y requisitos del cliente. |

La lista muestra el cliente y la fecha de entrega debajo del nombre cuando existen. La ficha no es una entidad independiente: vive dentro de cada proyecto.

### 3.5 Historial

El historial mantiene hasta 50 estados de escena. Deshacer y rehacer están disponibles mediante botones y atajos `Ctrl/Cmd + Z`, `Ctrl/Cmd + Shift + Z` y `Ctrl/Cmd + Y`. Se incluyen altas, bajas, movimientos, cambios de medidas, estados de paredes, operaciones de grupo, carga de ejemplos, carga de proyectos y reinicio.

### 3.6 Exportación

Planta y alzado se pueden descargar como PNG o PDF. El PDF reutiliza el lienzo visible y añade una cabecera con el nombre del proyecto, la vista, el cliente y la fecha de entrega cuando están disponibles. El despiece no se exporta todavía como informe PDF independiente.

## 4. Catálogo y criterio de verificación

El catálogo no debe completarse con medidas genéricas de internet. Las referencias, nombres y dimensiones comerciales deben contrastarse con fichas oficiales de Opein o con el catálogo oficial publicado por Opein en Calaméo.

Las fichas consultadas para las referencias actuales incluyen:

| Producto | Referencia | Fuente |
|---|---|---|
| Módulo 4 m diáfano | `CAS4MDIA.01` | [Ficha oficial Opein](https://www.opein.com/edificacion-modular/casetas-de-obra/modulo-4-m-diafano/) |
| Módulo 6 m diáfano | `CAS6MDIA.01` | [Ficha oficial Opein](https://www.opein.com/edificacion-modular/casetas-de-obra/modulo-6-m-diafano/) |
| Catálogo modular | Varias referencias | [Catálogo Opein Madrid en Calaméo](https://www.calameo.com/books/0066505959ffbf0108a1b) |
| Catálogo de eventos | Varias referencias | [Catálogo Opein eventos en Calaméo](https://www.calameo.com/books/0066505957e6418afc9b8) |

En el código se usan las dimensiones solicitadas para el configurador, mientras que las fichas comerciales pueden mostrar 2,44 m de ancho exterior. Esta diferencia debe resolverse antes de declarar el catálogo definitivo.

## 5. Limitaciones deliberadas

Estas limitaciones no son fallos accidentales: forman parte del alcance actual para poder validar primero la experiencia de diseño en campo.

### Todo es local

No hay cuentas, login, API ni sincronización entre dispositivos. Los proyectos se guardan únicamente en `localStorage` del navegador y dispositivo actuales. Borrar los datos del navegador, cambiar de dispositivo o usar otro navegador hace que esos proyectos no estén disponibles.

`lib/local-projects.ts` está aislado deliberadamente para que una futura migración a Supabase pueda sustituir el adaptador sin reescribir la escena ni las vistas. La migración prevista incluiría autenticación y tablas de proyecto, módulo, tabique y elemento.

### No hay stock

Añadir un módulo o elemento al plano no descuenta unidades de inventario. El catálogo es descriptivo y geométrico, no un inventario conectado a compras, alquileres, disponibilidad o reservas. Tampoco se consultan precios, sedes, transporte ni fechas de disponibilidad.

### El cliente no es una entidad global

La ficha de cliente pertenece a un proyecto concreto. No hay todavía un listado global de clientes, búsqueda transversal ni agrupación de varios proyectos por cliente.

### No es un plano técnico homologado

La rejilla, las cotas, el alzado y el PDF son herramientas orientativas. No sustituyen un plano firmado, una medición de obra, un cálculo estructural, una certificación ni la documentación técnica exigida para cada emplazamiento.

### Catálogo parcialmente verificado

`m10` y `mA` se conservan sin cambios porque sus medidas todavía no se han verificado contra una ficha oficial suficiente. Los snapshots guardados mantienen sus propias dimensiones, por lo que actualizar el catálogo no migra proyectos existentes.

## 6. Corrección pendiente de catálogo

Antes de dar el catálogo por definitivo hay que resolver dos discrepancias detectadas entre el encargo y las fuentes comerciales:

1. Los tipos `m15`, `m20`, `m6san` y `m6duc` están configurados con `W: 2.4`, mientras que las fichas comerciales consultadas muestran un ancho exterior de aproximadamente 2,44 m.
2. El tipo `m6duc` conserva actualmente `sku: 'CAS1MSAN.01'` por la instrucción aplicada al catálogo. La ficha oficial localizada para el módulo de 6 m con duchas muestra la referencia `CAS6MSAN.01`.

La corrección debe decidir si el configurador trabaja con el ancho comercial exterior de 2,44 m o con un ancho geométrico útil de 2,40 m, y debe confirmar cuál de las dos referencias sanitarias corresponde exactamente al producto que Opein quiere vender o alquilar. No se debe aplicar automáticamente a proyectos locales ya guardados: sus snapshots conservan `w`, `h` y `heightM` propios.

## 7. Cola priorizada completa

La prioridad combina impacto comercial, riesgo de datos y dependencias técnicas.

| Prioridad | Trabajo | Motivo y dependencia |
|---|---|---|
| P0 | Resolver la discrepancia de catálogo de anchos y SKU sanitario | Evita presupuestos o despieces con referencias comerciales incorrectas. Requiere confirmación oficial de Opein. |
| P1 | Calcular peso total de módulos y elementos | Es la base para organizar transporte, tráiler, carga y logística. Requiere pesos verificados por tipo. |
| P1 | Mejorar el informe de despiece y exportarlo | Convertir el despiece en un informe imprimible con módulos, elementos, aberturas, superficies y datos de cliente. |
| P1 | Completar medidas y propiedades técnicas de elementos | Permite presupuestos y logística más fiables; requiere datos reales del catálogo. |
| P2 | Gestión global de clientes | Crear clientes reutilizables y asociarles varios proyectos sin romper la ficha embebida existente. |
| P2 | Capas y visibilidad | Separar módulos, tabiques, elementos, cotas y anotaciones para trabajar con escenas complejas. |
| P2 | Copiar propiedades y estilos | Acelerar la configuración de módulos y elementos repetidos. |
| P2 | Exportación avanzada | Añadir PDF de despiece, leyenda, escala, cotas, cajetín y opciones de impresión. |
| P3 | Migración a Supabase | Añadir auth, proyectos multiusuario, tablas `proyecto`, `modulo`, `tabique` y `elemento`, y almacenamiento compartido. Debe hacerse después de estabilizar el modelo local. |
| P3 | Stock y disponibilidad | Descontar piezas y consultar inventario real. Depende de Supabase, un modelo de inventario y una fuente operativa de stock. |
| P3 | Precios, alquiler y reservas | Integrar tarifas, sedes, disponibilidad y fechas; requiere una fuente comercial autorizada y reglas de negocio. |
| P3 | Planificador logístico | Organizar transporte y cuadrillas a partir de peso, volumen, ubicación y fecha. Depende de datos de peso y de cliente. |
| P3 | Checklist de emplazamiento | Verificar accesos, nivelación, acometidas, descarga y condiciones del terreno. |
| P4 | Calculadora de baños químicos | Implementar la fórmula del catálogo oficial, incluida la referencia de la página 43 cuando se confirme la edición vigente. |
| P4 | Vista 3D | Mantenerla aplazada hasta estabilizar catálogo, medidas, persistencia y exportación 2D. |

### Trabajo ya completado del roadmap ampliado

La aplicación ya incorpora planta/alzado y medidas editables, navegación del plano, simbología vectorial, selección múltiple, movimiento de grupos, alineación y distribución, historial, despiece automático, ficha de cliente local, exportación PNG/PDF y catálogo con miniaturas y SKU disponible.

## 8. Convenciones de desarrollo

Los cambios se publican en commits pequeños y descriptivos, preferiblemente un cambio funcional por commit. Antes de publicar se debe ejecutar `npm run build` y `git diff --check`.

La unidad geométrica de planta es un decímetro: una unidad equivale a 0,1 m. La rejilla base representa aproximadamente 16 × 20 m mediante 160 × 200 unidades. Las medidas editables se expresan en metros en la interfaz y se convierten a unidades internas al actualizar la escena.

Las funciones derivadas deben recalcularse desde el estado actual y no guardarse como datos duplicados. Esto se aplica especialmente al despiece, alzado y exportaciones. Los cambios de catálogo no deben migrar silenciosamente los snapshots locales.

## 9. Publicación y mantenimiento

El flujo normal es:

```bash
git pull --ff-only
npm install
npm run build
git diff --check
git add <archivos-relacionados>
git commit -m "tipo: descripción breve"
git push origin main
```

Vercel despliega automáticamente los cambios publicados en `main`. Si un despliegue no aparece, revisar primero la conexión del proyecto de Vercel con el repositorio y la rama, y después los logs de compilación.

## 10. Referencias

[1]: https://www.opein.com/edificacion-modular/casetas-de-obra/modulo-4-m-diafano/ "Opein · Módulo 4 m diáfano"
[2]: https://www.opein.com/edificacion-modular/casetas-de-obra/modulo-6-m-diafano/ "Opein · Módulo 6 m diáfano"
[3]: https://www.calameo.com/books/0066505959ffbf0108a1b "Calaméo · Catálogo Opein Madrid"
[4]: https://www.calameo.com/books/0066505957e6418afc9b8 "Calaméo · Catálogo Opein eventos"
