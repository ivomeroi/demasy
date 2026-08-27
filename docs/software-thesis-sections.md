# Propuesta de incorporacion del componente software en el informe

Este documento propone como integrar la parte de software dentro de los capitulos 6, 7, 8 y 9 del Proyecto Integrador. La idea es que el informe final no presente el software como un complemento menor del hardware, sino como una mitad tecnica del sistema: adquisicion, comunicacion, visualizacion, almacenamiento, procesamiento y soporte al analisis de asimetrias musculares.

El criterio general recomendado es mantener una proporcion cercana a 50/50 entre hardware y software en el desarrollo tecnico del informe. Para lograrlo, el software debe aparecer desde el marco teorico hasta la implementacion, con bibliografia, decisiones de diseno, metodologia, validacion y limitaciones propias.

## 6. Marco teorico

El marco teorico deberia incorporar los fundamentos necesarios para justificar tecnicamente las decisiones de software. No conviene limitar este capitulo a electromiografia, electrodos, acondicionamiento analogico, ADC y BLE; tambien debe explicar por que el sistema necesita procesamiento digital, visualizacion en tiempo real, gestion de datos y metricas de analisis.

Estas secciones deben integrarse sin repetir contenido que ya este desarrollado en el documento principal. La idea es ampliar el marco teorico hacia el componente software, incorporando conceptos utiles para tomar decisiones de construccion, validacion y uso, aunque no todos ellos hayan sido implementados por completo en el prototipo final.

### 6.5. Sistemas de adquisicion y visualizacion de biosenales

Los sistemas de adquisicion de biosenales no se componen unicamente de sensores, etapas analogicas y conversores analogico-digitales. Para que una senal fisiologica pueda utilizarse en una evaluacion funcional, tambien resulta necesario disponer de una capa de software capaz de recibir las muestras, organizarlas temporalmente, representarlas de forma interpretable, conservarlas junto con los parametros de la prueba y permitir su analisis posterior.

En este tipo de sistemas, el software cumple una funcion intermedia entre el instrumento de medicion y el usuario profesional. Por un lado, debe respetar las caracteristicas tecnicas de la senal adquirida, tales como frecuencia de muestreo, amplitud, resolucion, continuidad temporal y correspondencia entre canales. Por otro lado, debe presentar esa informacion de manera comprensible, evitando que el usuario dependa de datos crudos o de procedimientos manuales para reconocer el estado de la adquisicion.

La visualizacion en tiempo real permite observar la evolucion temporal de la actividad muscular durante la prueba. En el caso de senales electromiograficas bilaterales, esta representacion resulta especialmente relevante porque facilita la comparacion entre miembros homologos y permite detectar diferencias de activacion, amplitud, regularidad o fatiga durante el movimiento. Sin embargo, una visualizacion destinada a evaluacion funcional no debe confundirse con una visualizacion de depuracion electronica. Mientras que la segunda puede priorizar la inspeccion tecnica de valores instantaneos, la primera debe priorizar legibilidad, estabilidad, continuidad, comparacion entre canales y asociacion con el contexto de la prueba.

La adquisicion en tiempo real tambien introduce requisitos sobre el manejo de datos. Las muestras deben conservar un orden temporal consistente, deben asociarse con el canal correspondiente y deben poder vincularse con informacion experimental, como tipo de prueba, musculo evaluado, duracion, modalidad de movimiento y datos del participante. Esta trazabilidad permite repetir ensayos, comparar sesiones y exportar la informacion para analisis posteriores. Por este motivo, el software forma parte del sistema de medicion y no constituye solamente una interfaz grafica.

### 6.6. Comunicacion de datos en tiempo real

La comunicacion de datos en tiempo real constituye el enlace entre los modulos de adquisicion y la aplicacion encargada de visualizar y procesar la senal. En sistemas portatiles, esta comunicacion debe equilibrar portabilidad, consumo energetico, tasa de transferencia, confiabilidad y facilidad de integracion con la computadora.

Bluetooth Low Energy (BLE) es una tecnologia adecuada para dispositivos de bajo consumo que transmiten paquetes periodicos de informacion. Su modelo de comunicacion se organiza mediante el perfil GATT, en el cual los dispositivos perifericos exponen servicios y caracteristicas, mientras que un dispositivo central puede leer datos o recibir notificaciones cuando existen nuevos valores disponibles [17]. En una arquitectura distribuida, cada modulo sensor puede actuar como periferico BLE y enviar muestras digitalizadas hacia una unidad central, reduciendo la necesidad de cables largos entre el participante y el equipo de visualizacion.

Una vez recibidos los datos en la unidad central, la transmision hacia la computadora puede realizarse mediante comunicacion serie por USB. Este enfoque simplifica la integracion con aplicaciones locales, ya que numerosos microcontroladores permiten enviar datos estructurados a traves de un puerto serie virtual. En aplicaciones web modernas, la Web Serial API permite que un sitio ejecutado en un contexto seguro solicite permiso al usuario para leer y escribir sobre dispositivos serie desde el navegador [27]. Esta caracteristica resulta util para prototipos biomedicos porque permite conectar hardware externo sin desarrollar una aplicacion de escritorio especifica.

No obstante, la comunicacion en tiempo real requiere considerar limitaciones practicas. La frecuencia de muestreo define la cantidad de datos que debe transmitirse por segundo, mientras que el formato de paquete determina la cantidad de bytes necesarios por muestra y por canal. Tambien deben contemplarse perdida de paquetes, retrasos variables, reconexiones, identificacion de canales y sincronizacion entre senales bilaterales. Cuando las muestras provienen de modulos distribuidos, la sincronizacion adquiere especial importancia, ya que las diferencias temporales entre canales pueden afectar la interpretacion de asimetrias dinamicas.

Por estas razones, el software debe incluir mecanismos para recibir paquetes de manera continua, validar su formato, asignar cada muestra al canal correspondiente, mantener una base temporal coherente y detectar estados de conexion o desconexion. En una herramienta orientada a evaluacion funcional, estos aspectos no son accesorios: condicionan la confiabilidad de la representacion y la utilidad de los registros obtenidos.

### 6.7. Procesamiento digital de senales EMG

El procesamiento digital permite transformar las muestras adquiridas en variables mas adecuadas para su interpretacion. En senales electromiograficas superficiales, este procesamiento suele aplicarse sobre ventanas temporales, ya que la activacion muscular varia durante el movimiento y no siempre resulta representativa si se analiza solamente mediante valores instantaneos.

Una etapa habitual consiste en remover el nivel de continua introducido por la adaptacion de la senal al rango del conversor analogico-digital. Luego, puede aplicarse rectificacion de onda completa para convertir las excursiones positivas y negativas en una magnitud relacionada con la intensidad de activacion. A partir de la senal rectificada, el suavizado o calculo de envolvente permite observar tendencias de activacion y relajacion con mayor claridad que en la senal cruda.

Tambien pueden aplicarse filtros digitales para reducir componentes no deseadas. En particular, la interferencia de red electrica puede tratarse mediante filtros de rechazo en 50 Hz, aunque su utilizacion debe evaluarse con cuidado porque dicha frecuencia puede encontrarse dentro de la banda de interes de la senal EMG. Por lo tanto, el filtrado digital debe interpretarse como una decision de compromiso entre reduccion de ruido y preservacion de informacion fisiologica.

La extraccion de caracteristicas resume cada ventana de datos mediante descriptores numericos. Entre las variables de uso frecuente se encuentran el valor cuadratico medio (RMS), el valor absoluto medio (MAV), la longitud de forma de onda (WL), los cruces por cero (ZC), la amplitud media y la amplitud pico a pico. Estas caracteristicas permiten representar amplitud, variabilidad y dinamica temporal de la senal con menor cantidad de datos que la forma de onda completa [18], [19].

Para el analisis bilateral, las caracteristicas extraidas pueden calcularse de manera independiente para cada lado y luego compararse mediante indices de simetria o asimetria. Estos indices no constituyen por si mismos un diagnostico, pero pueden aportar informacion objetiva sobre diferencias de activacion entre miembros inferiores durante una tarea controlada. La entropia de Shannon tambien puede utilizarse como medida complementaria de variabilidad o complejidad de la senal, especialmente cuando se desea analizar la organizacion temporal de la actividad muscular mas alla de su amplitud media [20].

De esta manera, el procesamiento digital no debe presentarse solamente como un conjunto de formulas, sino como una secuencia implementable dentro del software: adquisicion de muestras, organizacion en ventanas, preprocesamiento, calculo de caracteristicas, comparacion bilateral, visualizacion y almacenamiento de resultados.

### 6.8. Aplicaciones de software para evaluacion funcional en salud

Las aplicaciones de software utilizadas en evaluacion funcional deben responder tanto a requisitos tecnicos como a necesidades del ambito de la salud. En este contexto, el usuario principal no necesariamente es un desarrollador o un especialista en procesamiento de senales, sino un profesional que necesita observar, registrar e interpretar informacion durante una prueba. Por ello, la interfaz debe reducir la carga cognitiva, evitar ambiguedades y presentar la informacion critica de manera clara y oportuna.

El diseno centrado en el usuario propone considerar las necesidades, capacidades y contexto de uso de las personas que interactuan con un sistema durante todo su ciclo de desarrollo [29]. Aplicado a una herramienta de evaluacion neuromuscular, este enfoque implica organizar la pantalla alrededor del flujo real de trabajo: seleccion del participante, configuracion de la prueba, conexion del dispositivo, inicio de adquisicion, observacion de senales, control de grabacion, guardado de resultados y exportacion. Los controles principales deben ser visibles y comprensibles, mientras que los indicadores de estado deben permitir reconocer rapidamente si el sistema esta conectado, adquiriendo, pausado o detenido.

La visualizacion debe favorecer la comparacion entre miembros inferiores, ya que el objetivo del sistema es analizar asimetrias dinamicas. Para ello, resulta conveniente representar las senales izquierda y derecha con escalas consistentes, actualizar los graficos sin interrupciones y mostrar indicadores resumidos como amplitud, RMS, calidad de senal o porcentaje de simetria. Librerias de graficacion como Chart.js permiten construir visualizaciones interactivas en aplicaciones web mediante JavaScript, integrandose tanto por paquetes como por CDN [32].

Ademas de visualizar la senal, la aplicacion debe organizar los datos generados durante la evaluacion. El registro de participantes, sesiones, parametros experimentales y resultados permite conservar trazabilidad entre la medicion y el contexto en que fue obtenida. En aplicaciones web locales, IndexedDB ofrece una base de datos transaccional del lado del navegador, apta para almacenar objetos estructurados y trabajar incluso sin conexion permanente a internet [28]. Esta caracteristica resulta util para prototipos de investigacion, siempre que se contemplen sus limitaciones: los datos quedan asociados al navegador/dispositivo utilizado y deben exportarse o respaldarse si se desea conservarlos fuera de ese entorno.

El tratamiento de informacion vinculada con participantes requiere considerar aspectos de privacidad y consentimiento. En Argentina, la Ley 25.326 establece principios para la proteccion de datos personales asentados en archivos, registros o bancos de datos, incluyendo el resguardo de la intimidad y el control de la informacion por parte de sus titulares [30]. Aunque el prototipo desarrollado no constituya un sistema clinico certificado, la documentacion del software debe reconocer que las mediciones, los datos antropometricos y la informacion asociada a sesiones pueden tener caracter sensible cuando se vinculan con personas identificables. Por esta razon, se deben contemplar criterios de minimizacion de datos, resguardo local, exportacion controlada, anonimizacion cuando corresponda y asociacion con el consentimiento informado.

Finalmente, el uso de tecnologias web para un prototipo biomedico presenta ventajas y restricciones. Entre las ventajas se encuentran la portabilidad, la facilidad de ejecucion en distintos equipos, la separacion entre estructura, estilos y logica de aplicacion, y la posibilidad de integrar visualizacion, almacenamiento y comunicacion con dispositivos externos. Entre las restricciones se encuentran la compatibilidad desigual de ciertas APIs, la necesidad de permisos explicitos para acceder a hardware, la dependencia del navegador y la obligacion de validar que el rendimiento sea suficiente para una visualizacion fluida. Por lo tanto, la eleccion de una aplicacion web debe justificarse como una decision de arquitectura orientada a accesibilidad, iteracion rapida y control del flujo experimental, no solo como una preferencia de implementacion.

## 7. Propuestas

El siguiente texto propone una estructura para reemplazar la organizacion anterior de alternativas. Se conserva el contenido conceptual ya existente sobre sistemas comerciales, sistema cableado y modulos inalambricos distribuidos, pero se reorganiza dentro de una jerarquia que separa el analisis general entre sistema comercial y sistema propio. A su vez, dentro del sistema propio se distinguen alternativas de hardware y alternativas de software.

### 7.2. Alternativas de solucion

Con el proposito de responder a la necesidad detectada, se analizaron distintas alternativas para la adquisicion, transmision, visualizacion y procesamiento de senales electromiograficas superficiales durante el movimiento. La evaluacion contemplo antecedentes nacionales e internacionales, sistemas comerciales y soluciones de desarrollo propio. Posteriormente, las opciones se compararon segun su desempeno esperado, portabilidad, costo, posibilidad de modificacion, acceso a los datos adquiridos e integracion con algoritmos de procesamiento y analisis.

El analisis permitio identificar dos enfoques principales. El primero consistio en adoptar un sistema comercial inalambrico de electromiografia, con hardware y software provistos por el fabricante. El segundo consistio en desarrollar un sistema propio, capaz de integrar el subsistema electronico, la comunicacion, la aplicacion de visualizacion, el almacenamiento y el procesamiento de datos. Dentro de este segundo enfoque se evaluaron alternativas de hardware y de software, ya que ambas condicionan la factibilidad tecnica y el alcance del prototipo.

### 7.2.1. Adopcion de sistema comercial inalambrico

La primera alternativa consistio en adquirir un sistema comercial inalambrico de electromiografia. Esta opcion habria permitido disponer de sensores compactos, software especializado, multiples canales y prestaciones previamente verificadas por el fabricante. Sistemas como FREEEMG, Trigno o Ultium EMG representan soluciones orientadas a evaluacion biomecanica, rehabilitacion e investigacion, y ofrecen ventajas relacionadas con calidad de senal, portabilidad, sincronizacion y herramientas de visualizacion [23]-[25].

Sin embargo, esta alternativa no fue seleccionada como solucion principal debido a que su costo de adquisicion no resulto compatible con los recursos disponibles para el proyecto. Asimismo, la dependencia de componentes, licencias, protocolos y herramientas especificas del fabricante habria limitado la posibilidad de modificar el acondicionamiento analogico, adaptar el flujo de comunicacion y acceder con libertad a los datos crudos o a las etapas internas de procesamiento. Por esta razon, los equipos comerciales se consideraron principalmente como referencia para establecer prestaciones deseables del prototipo, pero no como plataforma de desarrollo.

### 7.2.2. Sistema propio

La segunda alternativa general consistio en desarrollar un sistema propio. Este enfoque permitio controlar la arquitectura completa del dispositivo, desde la captacion de la senal hasta su visualizacion y analisis en una computadora. A diferencia de una plataforma cerrada, el desarrollo propio permitio adaptar el hardware y el software a las condiciones particulares del protocolo experimental, acceder directamente a las senales adquiridas y documentar las decisiones tecnicas tomadas durante el proceso.

Como contrapartida, esta alternativa requirio resolver aspectos de diseno electronico, comunicacion, alimentacion, integracion mecanica, desarrollo de aplicacion, almacenamiento, procesamiento y pruebas. Por lo tanto, no se trato solamente de reemplazar un equipo comercial por componentes de menor costo, sino de construir un prototipo academico capaz de justificar cada bloque funcional y sus limitaciones.

#### 7.2.2.1. Alternativas de hardware

Dentro del sistema propio se analizaron dos alternativas principales para la arquitectura fisica de adquisicion: una unidad centralizada y cableada, y un sistema con modulos inalambricos distribuidos.

##### 7.2.2.1.1. Sistema centralizado y cableado

La primera alternativa de hardware consistio en desarrollar una unica unidad de adquisicion multicanal conectada mediante cables a los electrodos colocados sobre ambos miembros inferiores. Esta configuracion habria simplificado la sincronizacion de las senales, ya que todos los canales podrian compartir el mismo conversor analogico-digital, la misma base temporal y una unica etapa de comunicacion hacia la computadora.

No obstante, esta opcion habria requerido cables de mayor longitud entre los electrodos y la unidad central. Durante una prueba de pedaleo, esta condicion podria incrementar la captacion de interferencias, favorecer artefactos por movimiento y generar restricciones mecanicas para el participante. Ademas, la presencia de conexiones analogicas extensas resultaba menos compatible con el objetivo de desarrollar un sistema portable y vestible.

##### 7.2.2.1.2. Sistema con modulos inalambricos distribuidos

La segunda alternativa de hardware contemplo el desarrollo de modulos sensores autonomos, ubicados proximos a los electrodos de cada miembro inferior. Cada modulo incluyo el acondicionamiento analogico, la conversion analogico-digital, el microcontrolador ESP32-C3, el sistema de alimentacion mediante bateria y la transmision por Bluetooth Low Energy.

Los datos provenientes de los modulos sensores fueron recibidos por una unidad central y enviados hacia una computadora para su visualizacion y procesamiento. Esta arquitectura redujo la longitud de las conexiones analogicas, favorecio la libertad de movimiento y permitio acceder directamente a las muestras para implementar algoritmos de analisis. Sus principales desafios se relacionaron con la sincronizacion entre modulos, la gestion de energia, la estabilidad de la comunicacion inalambrica y la integracion de los datos en una aplicacion comun.

#### 7.2.2.2. Alternativas de software

Una vez definido que el sistema propio requeria una capa computacional especifica, se analizaron distintas alternativas de arquitectura software. La evaluacion no se limito a la posibilidad de mostrar senales en pantalla, sino que considero el flujo completo de adquisicion, visualizacion, almacenamiento, exportacion y procesamiento de datos. Tambien se contemplaron criterios de usabilidad para profesionales de salud, trazabilidad de sesiones, acceso a datos crudos y capacidad de evolucion del prototipo.

##### Criterios de evaluacion del software

Los criterios de evaluacion utilizados para comparar las alternativas de software fueron los siguientes:

- capacidad de representar senales bilaterales en tiempo real;
- compatibilidad con adquisicion desde una unidad central mediante comunicacion serial/USB;
- posibilidad de registrar participantes, sesiones, parametros experimentales y resultados;
- exportacion de datos para analisis posterior;
- bajo costo de implementacion y despliegue;
- independencia respecto de plataformas comerciales cerradas;
- acceso a datos crudos y procesados;
- modularidad para incorporar nuevas metricas de procesamiento;
- trazabilidad entre participante, sesion, senales adquiridas y analisis;
- facilidad de uso para profesionales de salud;
- mantenibilidad del codigo y documentacion tecnica.

##### 7.2.2.2.1. Aplicacion de escritorio nativa

Una primera alternativa de software fue el desarrollo de una aplicacion de escritorio nativa. Esta opcion habria ofrecido buen acceso a recursos del sistema operativo, puertos serie, archivos locales y bibliotecas de procesamiento. Tambien podria haber facilitado el empaquetado de dependencias especificas para adquisicion y analisis.

Sin embargo, su implementacion habria requerido resolver instalacion, actualizacion y mantenimiento para cada sistema operativo. Para un prototipo academico en iteracion, esta carga podia dificultar la distribucion, la prueba en distintos equipos y la modificacion rapida de la interfaz. Por este motivo, aunque tecnicamente viable, no resulto la alternativa mas conveniente para el alcance inicial del proyecto.

##### 7.2.2.2.2. Aplicacion web local ejecutada en navegador

Una segunda alternativa consistio en desarrollar una aplicacion web local ejecutada en un navegador. Esta opcion permitio construir una interfaz portable mediante tecnologias estandar como HTML, CSS y JavaScript, separando la estructura visual, la presentacion y la logica de aplicacion. Ademas, facilito la integracion de graficos en tiempo real, almacenamiento local y comunicacion con dispositivos externos mediante APIs del navegador.

La Web Serial API permite que una aplicacion web solicite acceso a dispositivos serie conectados al equipo, bajo un modelo de permisos explicitos del usuario y en contextos seguros [27]. Por su parte, IndexedDB permite almacenar datos estructurados localmente en el navegador mediante una base transaccional [28]. Estas caracteristicas hicieron posible plantear una aplicacion local capaz de recibir datos desde la unidad central, representar senales EMG, registrar sesiones y conservar informacion para su posterior exportacion.

La principal limitacion de esta alternativa se encontro en la compatibilidad desigual de algunas APIs entre navegadores y en la necesidad de ejecutar la aplicacion bajo condiciones que habiliten permisos de hardware. Aun asi, su bajo costo, portabilidad, facilidad de iteracion y adecuacion al flujo experimental la convirtieron en una opcion favorable para el prototipo.

##### 7.2.2.2.3. Sistema basado en scripts de adquisicion y analisis offline

Una tercera alternativa consistio en utilizar scripts para capturar datos, almacenarlos en archivos y procesarlos posteriormente. Este enfoque resulta habitual en etapas tempranas de investigacion, ya que permite probar algoritmos con flexibilidad, modificar rapidamente el procesamiento y reproducir analisis sobre conjuntos de datos guardados.

No obstante, una solucion basada principalmente en scripts presenta limitaciones para una evaluacion funcional en tiempo real. Su uso exige mayor conocimiento tecnico, ofrece menor claridad visual durante la prueba y dificulta que un profesional de salud controle la adquisicion sin intervencion de un operador especializado. Por este motivo, se considero mas adecuada como herramienta complementaria de analisis que como interfaz principal del sistema.

##### 7.2.2.2.4. Plataforma comercial cerrada

Una cuarta alternativa fue utilizar software provisto por plataformas comerciales de adquisicion. Este tipo de software suele ofrecer estabilidad, visualizacion integrada, exportacion de datos y compatibilidad directa con hardware del mismo fabricante. En sistemas profesionales, estas herramientas constituyen una ventaja importante porque reducen el esfuerzo de integracion y suelen estar acompanadas por soporte tecnico.

Sin embargo, esta alternativa habria introducido dependencia de licencias, formatos, protocolos y algoritmos internos. Ademas, podia restringir el acceso a la senal cruda o limitar la implementacion de metricas especificas para el analisis de asimetrias durante pedaleo. Por estas razones, se considero menos adecuada para un proyecto cuyo objetivo incluia el desarrollo, la documentacion y la comprension de la solucion completa.

### 7.3. Evaluacion de factibilidad

Las alternativas se compararon mediante criterios relacionados con los objetivos y las restricciones del proyecto. La valoracion fue cualitativa y considero el alcance del prototipo, los recursos disponibles, la necesidad de efectuar mediciones durante el movimiento y la integracion entre adquisicion, transmision, visualizacion y procesamiento de las senales. Para evitar mezclar dimensiones de analisis diferentes, la factibilidad se organizo en dos comparaciones: una correspondiente a la arquitectura de hardware y otra correspondiente a la arquitectura de software.

En primer lugar, se evaluaron las alternativas de hardware segun su capacidad para adquirir senales electromiograficas durante el pedaleo, conservar la libertad de movimiento y permitir modificaciones sobre el diseno del prototipo.

| Criterio | Sistema comercial inalambrico | Sistema propio cableado | Sistema propio inalambrico |
|---|---|---|---|
| Calidad esperada de la senal | Muy alta | Alta | Adecuada para el objetivo |
| Portabilidad | Muy alta | Baja o media | Alta |
| Costo relativo | Alto | Bajo | Bajo |
| Posibilidad de modificacion | Media | Alta | Muy alta |
| Acceso a las senales sin procesar | Dependiente del fabricante | Completo | Completo |
| Integracion con inteligencia artificial | Media o alta | Alta | Alta |
| Libertad de movimiento | Alta | Baja | Alta |
| Escalabilidad | Alta, con componentes propietarios | Media | Alta |
| Factibilidad dentro del proyecto | Baja | Media | Alta |

Tabla 7.1. Comparacion cualitativa de las alternativas de hardware.

La solucion comercial presento las mejores prestaciones instrumentales, especialmente en calidad de senal, sincronizacion, portabilidad y disponibilidad de sensores compactos. Sin embargo, su costo de adquisicion y la dependencia de tecnologias propietarias disminuyeron su factibilidad dentro del proyecto. Ademas, el acceso a las senales sin procesar y a los protocolos internos podia depender de las herramientas provistas por el fabricante, lo que limitaba la posibilidad de adaptar el sistema a los objetivos especificos del trabajo.

La arquitectura propia centralizada y cableada presento un costo reducido, mayor control sobre el diseno y una implementacion inicialmente mas accesible. Tambien ofrecia ventajas para la sincronizacion de canales, debido a que las senales podian concentrarse en una unica unidad de adquisicion. No obstante, esta alternativa no respondio completamente al requisito de portabilidad, ya que habria requerido conexiones analogicas de mayor longitud entre los electrodos y la unidad central. Esta condicion podia aumentar la susceptibilidad al ruido, los artefactos por movimiento y las restricciones mecanicas durante el pedaleo.

La arquitectura propia inalambrica proporciono el mejor equilibrio entre accesibilidad, libertad de movimiento, capacidad de modificacion e integracion con las etapas de procesamiento. Si bien su calidad de senal esperada no alcanzaba la de sistemas comerciales certificados, resultaba adecuada para los objetivos de un prototipo academico orientado a investigacion y evaluacion funcional. Ademas, permitio conservar acceso completo a los datos adquiridos y adaptar el sistema al protocolo experimental.

En segundo lugar, se evaluaron las alternativas de software segun su capacidad para recibir datos desde el sistema de adquisicion, visualizar senales en tiempo real, registrar sesiones, conservar trazabilidad y permitir analisis posteriores.

| Criterio | Aplicacion de escritorio nativa | Aplicacion web local | Scripts de adquisicion y analisis offline | Plataforma comercial cerrada |
|---|---|---|---|---|
| Visualizacion en tiempo real | Alta | Alta | Baja o media | Alta |
| Acceso a hardware local | Alto | Medio o alto, segun navegador | Alto | Dependiente del fabricante |
| Facilidad de despliegue | Media | Alta | Media | Alta, si se dispone de licencia |
| Portabilidad entre equipos | Media | Alta | Media | Baja o media |
| Registro de participantes y sesiones | Alta | Alta | Media | Alta, segun plataforma |
| Trazabilidad y exportacion de datos | Alta | Alta | Alta | Dependiente del fabricante |
| Facilidad de uso para profesionales | Alta | Alta | Baja | Alta |
| Costo relativo | Medio | Bajo | Bajo | Alto |
| Posibilidad de modificacion | Alta | Muy alta | Muy alta | Baja |
| Mantenibilidad dentro del proyecto | Media | Alta | Media | Baja |
| Factibilidad dentro del proyecto | Media | Alta | Media | Baja |

Tabla 7.2. Comparacion cualitativa de las alternativas de software.

La aplicacion de escritorio nativa presento ventajas en el acceso al hardware local y en la posibilidad de integrar bibliotecas especificas de procesamiento. Sin embargo, su desarrollo habria requerido resolver instalacion, empaquetado y mantenimiento en distintos sistemas operativos, lo que aumentaba la complejidad para el alcance del prototipo.

La aplicacion web local ofrecio el mejor equilibrio entre portabilidad, bajo costo, facilidad de modificacion, visualizacion en tiempo real y almacenamiento estructurado. Su principal restriccion estuvo asociada con la compatibilidad de APIs del navegador para acceso a hardware, pero esta limitacion resulto aceptable para un prototipo ejecutado en condiciones controladas.

El enfoque basado en scripts resulto flexible para procesamiento offline y validacion experimental, pero no respondio adecuadamente a la necesidad de una interfaz clara para profesionales durante la adquisicion. Por otra parte, una plataforma comercial cerrada habria ofrecido herramientas robustas de visualizacion, pero con mayor costo, dependencia de licencias y menor capacidad de adaptar metricas especificas al protocolo del proyecto.

Por estos motivos, la alternativa considerada mas factible fue el desarrollo de un sistema propio con modulos inalambricos distribuidos y una aplicacion web local desarrollada especificamente para el proyecto. Esta combinacion permitio abordar de manera integrada los requerimientos de adquisicion electromiografica, comunicacion, visualizacion en tiempo real, registro de sesiones, trazabilidad de datos y analisis de asimetrias musculares.

## 8. Materiales y metodos

Este capitulo debe explicar como se desarrollo, organizo y valido el software. La metodologia no debe quedar reducida a fabricacion electronica; tambien debe incluir diseno de arquitectura, implementacion incremental, pruebas, datos simulados y pruebas con hardware.

### 8.3. Metodologia de desarrollo del software

Describir el proceso de desarrollo usado para construir la aplicacion.

Contenido sugerido:
- desarrollo incremental por modulos;
- primero modo simulacion, luego integracion con adquisicion real;
- separacion entre interfaz, adquisicion, procesamiento y almacenamiento;
- documentacion tecnica en markdown dentro del repositorio;
- control de versiones con Git;
- registro de decisiones tecnicas y pruebas.

### 8.4. Arquitectura funcional de la aplicacion

Presentar el flujo de datos completo desde la muestra EMG hasta la visualizacion y almacenamiento.

Subsecciones sugeridas:
- 8.4.1. Entrada de datos: simulador y hardware real;
- 8.4.2. Normalizacion y estructura interna de las muestras;
- 8.4.3. Actualizacion de graficos en tiempo real;
- 8.4.4. Calculo de estadisticas y metricas;
- 8.4.5. Registro de sesiones y exportacion.

### 8.5. Modelo de datos

Explicar que informacion se almacena y por que. Esta seccion ayuda mucho a darle peso academico al software porque muestra trazabilidad experimental.

Contenido sugerido:
- entidad participante/paciente;
- entidad sesion;
- senales EMG por canal o lado;
- parametros de la prueba: musculo, duracion, cadencia, resistencia, modalidad;
- resultados o analisis asociados;
- criterios para exportacion y reutilizacion de datos.

### 8.6. Diseno del simulador EMG

Explicar como se genero la senal simulada y que parametros controla.

Contenido sugerido:
- senales bilaterales izquierda/derecha;
- nivel de activacion, ruido, fatiga y asimetria;
- patron ciclico asociado al pedaleo;
- fase entre miembros inferiores;
- parametros de cadencia y resistencia;
- limitaciones del simulador respecto de una senal fisiologica real.

### 8.7. Integracion con hardware

Describir el metodo de conexion entre la unidad central y la aplicacion.

Contenido sugerido:
- lectura desde puerto serial/USB;
- formato esperado de los datos;
- identificacion de canales o lados;
- manejo de conexion/desconexion;
- validacion de paquetes;
- fallback a modo simulacion;
- pruebas de comunicacion con ESP32.

### 8.8. Procesamiento y calculo de metricas

Detallar el metodo computacional usado para convertir muestras en indicadores.

Contenido sugerido:
- ventanas temporales;
- limpieza basica de la senal;
- calculo de amplitud media, pico, RMS u otras caracteristicas disponibles;
- comparacion bilateral;
- indice de simetria/asimetria;
- almacenamiento de resultados junto con la sesion.

### 8.9. Criterios de verificacion del software

Incluir pruebas y criterios de aceptacion.

Contenido sugerido:
- la aplicacion inicia sin errores;
- los graficos se actualizan en tiempo real;
- el modo simulacion produce patrones esperados;
- la conexion serial recibe y muestra datos;
- la grabacion guarda sesiones completas;
- la exportacion conserva datos suficientes para analisis externo;
- la interfaz es usable en el flujo de una prueba.

## 9. Implementacion

Este capitulo debe describir lo que efectivamente se construyo. Es el lugar para mencionar archivos, modulos, clases, decisiones concretas y capturas de pantalla. Conviene mantener la redaccion en tercera persona y en pasado, como pide la plantilla.

### 9.3. Implementacion de la aplicacion web

Describir la estructura general del software implementado.

Contenido sugerido:
- `index.html` como estructura de la interfaz;
- `styles.css` como definicion visual y responsive;
- `app.js` como controlador principal;
- inicializacion de componentes;
- eventos de usuario;
- actualizacion de visualizacion y estadisticas.

### 9.4. Implementacion del modulo de simulacion EMG

Explicar el archivo `emg-simulator.js` y su funcion en el desarrollo.

Contenido sugerido:
- generacion de muestras bilaterales;
- parametros de activacion, fatiga, asimetria, cadencia y resistencia;
- perfiles musculares;
- escenarios simulados: estado estable, asimetria, fatiga unilateral, intervalos;
- uso del simulador para pruebas de interfaz.

### 9.5. Implementacion de la comunicacion con hardware

Describir los modulos responsables de conectar con el dispositivo real.

Contenido sugerido:
- `serial-manager.js` para lectura por USB/serial;
- `bluetooth-manager.js` si se usa conexion BLE directa o gestion Bluetooth;
- deteccion de dispositivos;
- parseo de muestras;
- manejo de errores de conexion;
- integracion con el flujo de visualizacion.

### 9.6. Implementacion de la visualizacion en tiempo real

Explicar como se muestran las senales y estadisticas durante una sesion.

Contenido sugerido:
- grafico temporal de senales EMG;
- canales izquierdo/derecho o multiples canales;
- escala, frecuencia de actualizacion y ventana visible;
- indicadores de calidad de senal;
- estadisticas de activacion y asimetria;
- controles de inicio, pausa, detencion y guardado.

### 9.7. Implementacion de gestion de pacientes y sesiones

Describir `database.js`, `database-init.js` y `patient-manager.js`.

Contenido sugerido:
- uso de almacenamiento local;
- creacion, edicion y busqueda de pacientes;
- creacion de sesiones asociadas a pacientes;
- guardado de datos EMG y parametros de prueba;
- exportacion de datos;
- ventajas y limitaciones del almacenamiento local.

### 9.8. Implementacion del procesamiento y analisis

Explicar las metricas ya implementadas y las previstas si algunas todavia estan en desarrollo.

Contenido sugerido:
- estadisticas calculadas durante la adquisicion;
- comparacion bilateral;
- calculo de asimetria;
- analisis por ventanas;
- relacion con metricas teoricas del capitulo 6;
- posibles ampliaciones: RMS, MAV, WL, ZC, entropia de Shannon, clasificacion supervisada.

### 9.9. Implementacion del asistente o modulo de apoyo interpretativo

Si `ai-assistant.js` se mantiene en la solucion, conviene justificarlo cuidadosamente. Debe presentarse como una herramienta de apoyo y no como diagnostico automatico.

Contenido sugerido:
- generacion de observaciones sobre patrones de senal;
- recomendaciones no clinicas o preliminares;
- limites de interpretacion;
- necesidad de supervision profesional;
- trazabilidad entre metricas calculadas y mensajes mostrados.

### 9.10. Pruebas realizadas

Esta seccion debe documentar evidencia concreta.

Contenido sugerido:
- pruebas en modo simulacion;
- pruebas de conexion con ESP32;
- pruebas de adquisicion y visualizacion;
- pruebas de grabacion/exportacion;
- capturas de pantalla de la interfaz;
- ejemplos de archivos exportados;
- limitaciones observadas.

### 9.11. Resultados parciales del componente software

Si el capitulo 10 queda reservado para resultados generales, en 9 se puede cerrar con resultados de implementacion.

Contenido sugerido:
- estado funcional de cada modulo;
- funciones completadas;
- funciones pendientes;
- comportamiento observado durante las pruebas;
- relacion entre objetivos especificos y funcionalidades implementadas.

## Recomendacion de proporcion dentro del informe

Para que el software ocupe aproximadamente la mitad del contenido tecnico, se recomienda distribuirlo asi:

- Capitulo 6: agregar entre 5 y 7 paginas de fundamentos de software, comunicacion, procesamiento, interfaz y datos.
- Capitulo 7: agregar entre 4 y 6 paginas de alternativas y justificacion de arquitectura software.
- Capitulo 8: agregar entre 6 y 8 paginas de metodologia de desarrollo, modelo de datos, simulador, integracion y verificacion.
- Capitulo 9: agregar entre 8 y 12 paginas de implementacion concreta con capturas, diagramas, fragmentos representativos y pruebas.

La tesis deberia evitar presentar listados completos de codigo en el cuerpo principal. Es preferible explicar arquitectura, algoritmos, flujos de datos y decisiones tecnicas. El codigo completo, si hace falta, puede ir en anexos o quedar referenciado al repositorio.

## Diagramas y figuras recomendadas

Para reforzar la parte software, se recomienda incluir figuras especificas:

- arquitectura general hardware-software;
- flujo de datos desde sensor hasta interfaz;
- diagrama de modulos del software;
- estructura del modelo de datos;
- secuencia de una sesion de adquisicion;
- captura de pantalla del modo simulacion;
- captura de pantalla del modo hardware real;
- ejemplo de exportacion de datos;
- grafico de procesamiento por ventanas.

Estas figuras ayudan a mostrar que el software fue disenado como un subsistema de ingenieria y no solamente como una interfaz grafica.

## Citas sugeridas para Bibliografia y Referencias

Las referencias del informe usan numeracion correlativa entre corchetes. Por lo tanto, las citas siguientes deberian renumerarse segun la posicion que ocupen dentro de la bibliografia final. En este borrador se numeran a partir de [27] para continuar despues de las referencias ya observadas en el documento.

Formato recomendado para citar dentro del texto:
- Web Serial API: utilizar cuando se justifique la comunicacion serie desde el navegador [27].
- IndexedDB: utilizar cuando se justifique el almacenamiento local estructurado de sesiones y participantes [28].
- Diseno centrado en el usuario: utilizar en el marco teorico de interfaz y usabilidad en salud [29].
- Ley 25.326: utilizar al mencionar privacidad, datos personales, consentimiento y resguardo de informacion identificable [30].
- Web Bluetooth: utilizar si se describe conexion BLE directa desde navegador o fundamentos de GATT en aplicaciones web [31].
- Chart.js: utilizar si se menciona la libreria concreta utilizada para graficos en tiempo real [32].

Entradas sugeridas para Bibliografia y Referencias:

[27] Web Platform Incubator Community Group, "Web Serial API," Draft Community Group Report, 2026. [Online]. Available: https://wicg.github.io/serial/. Accessed: Aug. 26, 2026.

[28] Mozilla Developer Network, "IndexedDB API," MDN Web Docs, 2025. [Online]. Available: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API. Accessed: Aug. 26, 2026.

[29] International Organization for Standardization, "ISO 9241-210:2019 Ergonomics of human-system interaction - Part 210: Human-centred design for interactive systems," ISO, 2019. [Online]. Available: https://www.iso.org/standard/77520.html. Accessed: Aug. 26, 2026.

[30] Honorable Congreso de la Nacion Argentina, "Ley 25.326 - Proteccion de los Datos Personales," InfoLeg, 2000. [Online]. Available: https://servicios.infoleg.gob.ar/infolegInternet/anexos/60000-64999/64790/texact.htm. Accessed: Aug. 26, 2026.

[31] Web Bluetooth Community Group, "Web Bluetooth," Draft Community Group Report, 2026. [Online]. Available: https://webbluetoothcg.github.io/web-bluetooth/. Accessed: Aug. 26, 2026.

[32] Chart.js Contributors, "Chart.js Documentation," 2025. [Online]. Available: https://www.chartjs.org/docs/latest/. Accessed: Aug. 26, 2026.
