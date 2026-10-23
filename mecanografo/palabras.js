// Las 1000 palabras más comunes de cada idioma, aproximadamente ordenadas por frecuencia.
// Se guardan como texto plano separado por espacios para que el fichero sea fácil de leer y editar.
const PALABRAS = {
  es: `
    de la que el en y a los se del las un por con no una su para es al lo como más o pero sus le ha
    me si sin sobre este ya entre cuando todo esta ser son dos también fue había era muy años hasta
    desde está mi porque qué solo han yo hay vez puede todos así nos ni parte tiene él uno donde
    bien tiempo mismo ese ahora cada e vida otro después te otros aunque esa eso hace otra gobierno
    tan durante siempre día tanto ella tres sí dijo sido gran país según menos mundo año antes
    estado contra sino forma caso nada hacer general estaba poco estos presidente mayor ante unos
    les algo hacia casa ellos ayer hecho primera mucho mientras además quien momento millones esto
    hombre están pues hoy lugar nacional trabajo otras mejor nuevo decir algunos entonces todas días
    debe política cómo casi toda tal luego pasado primer medio va estas sea tenía nunca poder aquí
    ver veces embargo partido personas grupo cuenta pueden tienen misma nueva cual fueron mujer
    frente tras cosas fin ciudad he social manera tener sistema será historia muchos tipo cuatro
    dentro nuestro punto dice cualquier noche aún agua parece haber situación fuera bajo grandes
    nuestra ejemplo acuerdo habían usted estados hizo nadie países horas posible tarde ley
    importante guerra desarrollo proceso realidad sentido lado mí tu cambio allí mano eran estar
    número sociedad unas centro padre gente final relación cuerpo obra incluso través último madre
    mis modo problema cinco hombres información ojos muerte nombre algunas público mujeres siglo
    todavía meses mañana esos nosotros hora muchas pueblo alguna dar problemas da tú derecho verdad
    podría sería junto cabeza aquel cuanto tierra equipo segundo director dicho cierto casos manos
    nivel podía familia largo partir falta llegar propio cosa primero seguridad hemos mal algún tuvo
    semana varios real sé voz paso señor mil quienes proyecto mercado mayoría luz claro iba orden
    español buena quiere aquella programa palabras internacional van esas segunda empresa puesto ahí
    propia libro igual político persona últimos ellas total creo tengo dios española fuerza único
    acción amor policía puerta pesar zona sabe calle tampoco música ningún vista campo buen hubiera
    saber obras razón niños tema dinero servicio hijo última estoy hablar dio minutos camino seis
    quién fondo dirección papel demás idea especial diferentes dado base ambos libertad relaciones
    espacio medios ir actual población empresas estudio salud servicios haya principio siendo
    cultura anterior alto media primeros arte paz imagen medida deben datos personal interés grupos
    miembros ninguna existe cara edad movimiento visto llegó puntos actividad bueno uso niño difícil
    joven futuro aquellos mes pronto soy hacía nuevos nuestros estaban posibilidad sigue cerca
    resultados educación atención capacidad efecto necesario valor aire investigación siguiente
    comunidad necesidad nuevas calidad economía carácter jefe favor recursos fácil momentos lejos
    libre semanas éxito hija llega mira mesa ojo quiero puedo tenemos hacen hago sabes sabemos
    quieres cree conocer conoce vamos voy vas vienen viene venir salir sale llevar lleva dejar deja
    dejó seguir encontrar encuentra pensar pienso piensa vivir vive sentir siente siento volver
    vuelve volvió tomar toma tomó tratar conseguir parecer quedar queda quedó habla llamar llama
    entrar pasar pasa pasó esperar espera buscar existir recibir mantener terminar empezar empieza
    comenzar abrir escribir perder producir ocurrir ocurre entender pedir recordar resultar resulta
    leer crear crecer cambiar presentar considerar aparecer acabar decidir permitir ofrecer servir
    sacar necesitar jugar correr comer beber dormir caminar mirar escuchar oír ganar pagar comprar
    vender trabajar estudiar aprender enseñar ayudar cerrar subir bajar nacer morir mover cumplir
    explicar preguntar contar caer levantar viajar cocinar limpiar usar utilizar lograr elegir
    formar indicar añadir palabra amigo amiga amigos niña hermano hermana hijos padres esposa señora
    chico chica abuelo abuela mar sol cielo luna estrella fuego árbol flor río montaña playa piedra
    viento lluvia frío calor verano invierno otoño primavera minuto fecha domingo lunes martes
    miércoles jueves viernes sábado enero febrero marzo abril mayo junio julio agosto septiembre
    octubre noviembre diciembre escuela colegio universidad clase profesor estudiante alumno examen
    pregunta respuesta carta página nota lengua idioma letra color rojo azul verde blanco negro
    amarillo gris café comida pan leche carne fruta vino silla cama ventana pared suelo cocina baño
    habitación coche tren avión barco carretera tienda precio oficina teléfono ordenador juego
    película foto canción radio televisión noticia periódico mentira miedo sueño deseo alegría dolor
    boca pelo brazo pierna pie pies corazón sangre piel espalda médico hospital enfermedad perro
    gato caballo animal pájaro iglesia juez grande pequeño pequeña malo mala viejo vieja corto feliz
    triste rico pobre lleno caliente oscuro fuerte rápido lento seguro imposible peor menor próximo
    simple bonito hermoso verdadero falso humano natural común privado diferente distinto principal
    completo listo temprano jamás allá arriba abajo delante detrás bastante demasiado quizá quizás
    realmente simplemente ti conmigo contigo vosotros ustedes os suyo suya mío alguien siete ocho
    nueve diez veinte cien estuvo estamos estás eres somos fuimos serán habrá hubo tienes tendrá
    podemos puedes pudo quería dicen digo decía haciendo sabía saben veo vemos vio ven fui doy dan
    poner pone tenido hablando gracias hola vale perdón cuál dónde cuándo cuánto tenga haga diga
    vaya sean habido vuelto abierto escrito muerto ido llamado llegado dejado empezó salió murió
    nació hice dije tuve supe llevo sigo vengo pongo conozco parecía creía llegaron dijeron hicieron
    tenían querer deber debería tendría haría iban hermanos pareja novio novia barrio edificio plaza
    parque jardín bosque isla nube mapa viaje vacaciones fiesta regalo deporte fútbol pelota ropa
    zapatos llave caja botella vaso plato dedo diente frase texto cuento dibujo cuadro museo teatro
    cine ciencia pantalla red correo mensaje llamada banco negocio cliente ejército rey reina nación
    región norte sur oeste derecha izquierda línea tamaño peso altura velocidad energía sombra ruido
    sonido silencio hambre alma mente memoria recuerdo esperanza suerte peligro error secreto
    solución opinión plan objetivo causa resultado desayuno cena huevo pescado pollo queso manzana
    naranja cansado enfermo tranquilo loco guapo feo limpio sucio antiguo moderno caro barato dulce
    duro suave vacío cerrado ocupado apenas encima debajo despacio
  `.trim().split(/\s+/),

  en: `
    the of and to a in is you that it he was for on are as with his they at be this have from or one
    had by but not what all were we when your can said there an each which she do how their if will
    up other about out many then them these so some her would like him into has more two could my
    than first been who its now down did get may over new only little very after our just most any
    same also around another well must even such because here why us again off still should while
    those both between never under last might always next few since against until often without
    however though although within during toward among almost already enough rather perhaps maybe
    really quite yet ever once later soon today tonight tomorrow yesterday whether either neither
    nothing something anything everything someone anyone everyone nobody everybody somebody himself
    herself itself myself yourself whose where mine yours ours else instead upon behind above below
    across along beyond inside outside near far away back through being does done say go went gone
    going got make made making know knew known think thought take took taken see saw seen come came
    coming want wanted look looked looking use used using find found give gave given tell told work
    worked working call called try tried trying ask asked need needed feel felt become became leave
    left put mean meant keep kept let begin began seem seemed help helped talk talked turn turned
    start started show showed hear heard play played run ran move moved liked live lived believe
    believed hold held bring brought happen happened write wrote written provide sit sat stand stood
    lose lost pay paid meet met include included continue set learn learned change changed lead
    understand watch watched follow followed stop stopped create speak spoke read allow add spend
    spent grow grew open opened walk walked win won offer remember love loved consider appear buy
    bought wait waited serve die died send sent expect build built stay stayed fall fell cut reach
    kill remain suggest raise pass sell sold require report decide pull break broke wear carry thank
    hope eat drink sleep cook clean wash drive fly swim sing dance laugh cry smile throw catch climb
    choose close draw dream fight fill fix forget hate hit hurry jump kiss knock lie listen marry
    miss order pick plan prepare promise push reply rest ride ring save search share shout shut sign
    smell solve steal study teach touch travel visit wake wish worry time year people way day man
    thing woman life child world school state family student group country problem hand part place
    case week company system program question government number night point home water room mother
    area money story fact month lot right book eye job word business issue side kind head house
    service friend father power hour game line end member law car city community name president team
    minute idea kid body information parent face others level office door health person art war
    history party result morning reason research girl guy moment air teacher force education foot
    boy age music market sense nation college interest death experience effect class control care
    field development role effort rate heart leader light voice wife police mind price decision son
    view relationship town road arm difference value building action model season society director
    position player record paper space ground form event matter center couple project activity star
    table oil situation cost industry figure street image phone data picture practice piece land
    product doctor wall patient worker news test movie north support technology step baby computer
    type attention film tree source hair window truth song bank chance dog cat bird fish horse
    animal food bread meat fruit apple egg milk coffee tea sugar rice cake dinner lunch breakfast
    kitchen bed chair box bag key ball gift letter card map garden river sea ocean lake mountain
    island forest sky sun moon rain snow wind fire stone gold glass ship boat train plane bus
    station hotel hospital church shop store library park farm village beach summer winter spring
    weekend holiday birthday brother sister husband daughter king queen army soldier god fear joy
    pain peace danger mistake answer example language color sound noise camera clock radio
    television message page shirt shoe dress coat hat clothes skin blood bone teeth nose mouth ear
    finger leg neck shoulder brain good great own old big high different small large early young
    important bad able human local late hard major better strong possible whole free true full
    special easy clear recent certain personal red difficult available likely short single current
    wrong private past fine common poor natural similar hot dead central happy serious ready simple
    physical general blue dark various entire legal cold final main green nice huge popular
    beautiful warm quiet soft heavy empty dirty fast slow quick safe sure sick tired busy rich cheap
    expensive famous funny sad angry afraid alone alive brave proud gentle strange wild deep wide
    thin thick tall round sweet bright fresh dry wet low white black brown yellow three four five
    six seven eight nine ten twelve twenty hundred thousand million second third half usually
    sometimes together simply actually especially quickly probably directly easily exactly certainly
    finally slowly completely recently nearly carefully clearly possibly mostly please thanks hello
    yes okay sorry every much less least none several whatever ago agree enjoy explain describe
    receive produce return join accept apply arrive belong cause check count cover deal develop
    discover discuss enter fail finish guess imagine improve increase introduce invite manage
    measure mention notice protect prove realize reduce refuse relax repeat replace shake trust
    wonder suppose corner floor roof plate cup knife bottle meal soup salt butter cheese chicken
    pizza dollar bill lesson homework exam pen desk screen email internet video photo artist band
    guitar piano sport football goal score race future present nature earth planet science energy
    machine metal wood plastic neighbor guest uncle aunt cousin
  `.trim().split(/\s+/),
};
