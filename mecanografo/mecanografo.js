// Mecanógrafo: test de un minuto que mide las palabras por minuto (WPM).
// WPM = (caracteres de palabras bien escritas + sus espacios) / 5 / minutos, como en los tests habituales.
(() => {
    'use strict';

    const DURACION = 60;              // segundos que dura el test
    const PALABRAS_INICIALES = 120;
    const LOTE = 60;                  // palabras que se añaden cuando se acerca el final
    const MAX_EXTRA = 10;             // letras de más permitidas en una palabra
    const ACENTO_SUELTO = /[´`¨^~'"̀-ͯ]$/; // tecla muerta aún sin combinar

    const $ = id => document.getElementById(id);
    const dom = {
        hoja: $('hoja'),
        texto: $('texto'),
        pista: $('pista'),
        entrada: $('entrada'),
        contador: $('contador'),
        barra: $('barra'),
        vivo: $('vivo'),
        ayuda: $('ayuda'),
        mesa: $('mesa'),
        resultados: $('resultados'),
        record: $('record'),
        btnSonido: $('btn-sonido'),
        btnTildes: $('btn-tildes'),
        btnReiniciar: $('btn-reiniciar'),
        btnRepetir: $('btn-repetir'),
        btnNuevo: $('btn-nuevo'),
        grafica: $('grafica'),
        tooltip: $('tooltip'),
    };
    const botonesIdioma = document.querySelectorAll('[data-idioma]');

    const leer = clave => {
        try { return localStorage.getItem('mecanografo:' + clave); } catch (e) { return null; }
    };
    const guardar = (clave, valor) => {
        try { localStorage.setItem('mecanografo:' + clave, valor); } catch (e) { /* sin almacenamiento */ }
    };
    const azar = (min, max) => min + Math.random() * (max - min);
    const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)');

    // ----- Estado del test -----
    let idioma = 'es';                // español siempre seleccionado al entrar
    let conTildes = leer('tildes') !== 'off';
    let vocabulario = [];
    let objetivo = [];                // palabras que hay que escribir
    let escritas = [''];              // lo que se ha escrito en cada palabra
    let actual = 0;                   // palabra en curso
    let estado = 'espera';            // 'espera' | 'escribiendo' | 'fin'
    let inicio = 0;
    let raf = 0;
    let temporizadorFin = 0;
    let pulsaciones = { total: 0, correctas: 0 };
    let porSegundo = [];              // pulsaciones y errores de cada segundo
    let muestras = [];                // WPM acumulado al final de cada segundo
    let nodos = [];                   // elemento .palabra de cada palabra
    let cursor = null;
    let alturaLinea = 0;
    let lineaSuperior = 0;            // líneas que ha subido el papel
    let ultimoVivo = 0;
    let ultimoSonido = 0;
    let componiendo = false;
    let temporizadorParpadeo = 0;

    // ===== Palabras =====

    // Quita acentos y diéresis pero respeta la ñ
    function quitarTildes(palabra) {
        return palabra.normalize('NFD').replace(/[́̈]/g, '').normalize('NFC');
    }

    function prepararVocabulario() {
        const lista = PALABRAS[idioma];
        vocabulario = idioma === 'es' && !conTildes ? [...new Set(lista.map(quitarTildes))] : lista;
    }

    function generar(cuantas) {
        const nuevas = [];
        let anterior = objetivo[objetivo.length - 1];
        for (let i = 0; i < cuantas; i++) {
            let palabra;
            do {
                palabra = vocabulario[Math.floor(Math.random() * vocabulario.length)];
            } while (palabra === anterior);
            nuevas.push(palabra);
            anterior = palabra;
        }
        return nuevas;
    }

    function crearPalabra(palabra) {
        const nodo = document.createElement('div');
        nodo.className = 'palabra';
        for (const letra of palabra) {
            const span = document.createElement('span');
            span.className = 'l';
            span.textContent = letra;
            // Cada tipo deja una tinta y una altura un poco distintas, como en una máquina real
            span.style.setProperty('--tinta', azar(0.8, 1).toFixed(2));
            span.style.setProperty('--dy', azar(-0.025, 0.025).toFixed(3) + 'em');
            nodo.appendChild(span);
        }
        return nodo;
    }

    function agregarPalabras(palabras) {
        const fragmento = document.createDocumentFragment();
        for (const palabra of palabras) {
            const nodo = crearPalabra(palabra);
            nodos.push(nodo);
            fragmento.appendChild(nodo);
        }
        objetivo.push(...palabras);
        dom.pista.appendChild(fragmento);
    }

    function construirTexto(repetir) {
        const palabras = repetir && objetivo.length ? objetivo.slice() : null;
        objetivo = [];
        nodos = [];
        dom.pista.textContent = '';
        cursor = document.createElement('span');
        cursor.className = 'cursor parpadeo';
        dom.pista.appendChild(cursor);
        agregarPalabras(palabras || generar(PALABRAS_INICIALES));

        // Recoloca el papel arriba sin animación
        dom.pista.style.transition = 'none';
        dom.pista.style.transform = '';
        void dom.pista.offsetHeight;
        dom.pista.style.transition = '';
    }

    // ===== Pintado =====

    function pintarPalabra(i) {
        const nodo = nodos[i];
        const palabra = objetivo[i];
        const escrito = escritas[i] || '';
        const letras = nodo.children;

        for (let j = 0; j < palabra.length; j++) {
            let clase = 'l';
            if (j < escrito.length) clase += escrito[j] === palabra[j] ? ' ok' : ' mal';
            if (letras[j].className !== clase) letras[j].className = clase;
        }

        // Letras escritas de más al final de la palabra
        const extra = escrito.slice(palabra.length);
        while (letras.length > palabra.length + extra.length) nodo.lastChild.remove();
        for (let k = 0; k < extra.length; k++) {
            const span = letras[palabra.length + k];
            if (span) {
                if (span.textContent !== extra[k]) span.textContent = extra[k];
            } else {
                const nuevo = document.createElement('span');
                nuevo.className = 'l extra';
                nuevo.textContent = extra[k];
                nodo.appendChild(nuevo);
            }
        }

        nodo.classList.toggle('error', i < actual && escrito !== palabra);
    }

    function moverCursor() {
        const letras = nodos[actual].children;
        const posicion = escritas[actual].length;
        let x;
        let letra;
        if (posicion < letras.length) {
            letra = letras[posicion];
            x = letra.offsetLeft;
        } else {
            letra = letras[letras.length - 1];
            x = letra.offsetLeft + letra.offsetWidth;
        }
        cursor.style.transform = `translate(${x}px, ${letra.offsetTop}px)`;
    }

    function cursorActivo() {
        cursor.classList.remove('parpadeo');
        clearTimeout(temporizadorParpadeo);
        temporizadorParpadeo = setTimeout(() => cursor.classList.add('parpadeo'), 700);
    }

    function medir() {
        alturaLinea = nodos[0].getBoundingClientRect().height;
    }

    // Mantiene la palabra en curso en la segunda línea: el papel sube como en la máquina
    function ajustarLineas(forzar = false) {
        if (!alturaLinea) medir();
        const linea = Math.round(nodos[actual].offsetTop / alturaLinea);
        const destino = Math.max(0, linea - 1);
        if (destino === lineaSuperior && !forzar) return;
        if (destino > lineaSuperior && !forzar && estado === 'escribiendo') Sonido.reproducir('linea');
        lineaSuperior = destino;
        dom.pista.style.transform = `translateY(${-lineaSuperior * alturaLinea}px)`;
    }

    function recolocar() {
        medir();
        ajustarLineas(true);
        moverCursor();
    }

    // ===== Cálculos =====

    function segundos() {
        return (performance.now() - inicio) / 1000;
    }

    function caracteresCorrectos() {
        let n = 0;
        for (let i = 0; i < actual; i++) {
            if (escritas[i] === objetivo[i]) n += objetivo[i].length + 1; // la palabra y su espacio
        }
        const enCurso = escritas[actual];
        if (enCurso && objetivo[actual].startsWith(enCurso)) n += enCurso.length;
        return n;
    }

    function registrarPulsacion(correcta) {
        if (estado !== 'escribiendo') return;
        pulsaciones.total++;
        if (correcta) pulsaciones.correctas++;
        const s = Math.min(DURACION - 1, Math.floor(segundos()));
        const seg = porSegundo[s] || (porSegundo[s] = { brutas: 0, errores: 0 });
        seg.brutas++;
        if (!correcta) seg.errores++;
    }

    function tomarMuestra() {
        const s = muestras.length + 1;
        const seg = porSegundo[s - 1] || { brutas: 0, errores: 0 };
        muestras.push({
            s,
            wpm: caracteresCorrectos() / 5 / (s / 60),
            bruto: seg.brutas * 60 / 5,
            errores: seg.errores,
        });
    }

    function calcular() {
        let correctos = 0;
        let errores = 0;
        let extra = 0;
        let omitidos = 0;
        let bien = 0;
        let mal = 0;
        for (let i = 0; i <= actual; i++) {
            const palabra = objetivo[i];
            const escrito = escritas[i] || '';
            const cerrada = i < actual;
            for (let j = 0; j < palabra.length; j++) {
                if (j < escrito.length) {
                    if (escrito[j] === palabra[j]) correctos++;
                    else errores++;
                } else if (cerrada) {
                    omitidos++;
                }
            }
            extra += Math.max(0, escrito.length - palabra.length);
            if (escrito === palabra) bien++;
            else if (cerrada) mal++;
        }
        const minutos = DURACION / 60;
        return {
            wpm: Math.round(caracteresCorrectos() / 5 / minutos),
            bruto: Math.round(pulsaciones.total / 5 / minutos),
            precision: pulsaciones.total ? Math.floor(pulsaciones.correctas / pulsaciones.total * 100) : 0,
            correctos,
            errores,
            extra,
            omitidos,
            bien,
            mal,
        };
    }

    // ===== Escritura =====

    function escribir(valor) {
        const previo = escritas[actual];
        const palabra = objetivo[actual];
        if (valor.length > palabra.length + MAX_EXTRA) valor = valor.slice(0, palabra.length + MAX_EXTRA);
        if (valor === previo) return;
        if (estado === 'espera') empezar();

        // Cuenta como pulsaciones las letras nuevas desde el primer carácter que cambia
        let comun = 0;
        while (comun < previo.length && comun < valor.length && previo[comun] === valor[comun]) comun++;
        for (let j = comun; j < valor.length; j++) registrarPulsacion(valor[j] === palabra[j]);

        escritas[actual] = valor;
        pintarPalabra(actual);
    }

    function cerrarPalabra() {
        // El espacio cuenta como fallo si se salta letras de la palabra
        registrarPulsacion(escritas[actual].length >= objetivo[actual].length);
        actual++;
        escritas[actual] = '';
        pintarPalabra(actual - 1);
        if (actual > objetivo.length - 40) agregarPalabras(generar(LOTE));
    }

    // Retroceso con la palabra vacía: vuelve a la anterior si tenía algún fallo
    function volverAtras(borrarEntera) {
        if (actual === 0) return false;
        const anterior = actual - 1;
        if (escritas[anterior] === objetivo[anterior]) return false;
        escritas.length = actual;
        actual = anterior;
        if (borrarEntera) escritas[actual] = '';
        pintarPalabra(actual);
        dom.entrada.value = escritas[actual];
        return true;
    }

    function procesarEntrada() {
        if (estado === 'fin') {
            dom.entrada.value = '';
            return;
        }
        if (estado === 'escribiendo' && segundos() >= DURACION) {
            terminar();
            return;
        }

        const valor = dom.entrada.value.normalize('NFC');
        // Durante una composición (teclas muertas, teclados de móvil) se espera a que se cierre
        if (componiendo && (valor.includes(' ') || ACENTO_SUELTO.test(valor))) return;

        const partes = valor.split(' ');
        for (let k = 0; k < partes.length; k++) {
            escribir(partes[k]);
            // Un espacio con la palabra vacía no hace nada
            if (k < partes.length - 1 && escritas[actual].length > 0) cerrarPalabra();
        }
        if (!componiendo && dom.entrada.value !== escritas[actual]) dom.entrada.value = escritas[actual];

        ajustarLineas();
        moverCursor();
        cursorActivo();
    }

    function sonar(tipo) {
        ultimoSonido = performance.now();
        Sonido.reproducir(tipo);
    }

    // ===== Ciclo del test =====

    function empezar() {
        estado = 'escribiendo';
        inicio = performance.now();
        document.body.classList.add('escribiendo');
        dom.ayuda.textContent = 'Escribiendo… cuando acabe el minuto verás el resultado';
        temporizadorFin = setTimeout(terminar, DURACION * 1000 + 30);
        raf = requestAnimationFrame(bucle);
    }

    function bucle() {
        const t = segundos();
        if (t >= DURACION) {
            terminar();
            return;
        }
        const restante = String(Math.ceil(DURACION - t));
        if (dom.contador.textContent !== restante) {
            dom.contador.textContent = restante;
            dom.contador.classList.toggle('urgente', Number(restante) <= 10);
        }
        dom.barra.style.transform = `scaleX(${t / DURACION})`;
        while (muestras.length < Math.floor(t)) tomarMuestra();
        if (t >= 2 && t - ultimoVivo >= 0.25) {
            ultimoVivo = t;
            dom.vivo.textContent = Math.round(caracteresCorrectos() / 5 / (t / 60));
        }
        raf = requestAnimationFrame(bucle);
    }

    function terminar() {
        if (estado !== 'escribiendo') return;
        estado = 'fin';
        cancelAnimationFrame(raf);
        clearTimeout(temporizadorFin);
        while (muestras.length < DURACION) tomarMuestra();

        dom.contador.textContent = '0';
        dom.contador.classList.remove('urgente');
        dom.barra.style.transform = 'scaleX(1)';
        document.body.classList.remove('escribiendo');
        dom.entrada.blur();
        dom.hoja.classList.remove('desenfocada');
        Sonido.reproducir('fin');
        mostrarResultados(calcular());
    }

    function reiniciar(repetir = false) {
        cancelAnimationFrame(raf);
        clearTimeout(temporizadorFin);
        estado = 'espera';
        actual = 0;
        escritas = [''];
        pulsaciones = { total: 0, correctas: 0 };
        porSegundo = [];
        muestras = [];
        lineaSuperior = 0;
        ultimoVivo = 0;

        dom.resultados.hidden = true;
        dom.mesa.hidden = false;
        ocultarPunto();
        construirTexto(repetir);
        medir();
        moverCursor();

        dom.entrada.value = '';
        dom.contador.textContent = String(DURACION);
        dom.contador.classList.remove('urgente');
        dom.barra.style.transform = 'scaleX(0)';
        dom.vivo.textContent = '–';
        dom.ayuda.textContent = 'Empieza a escribir y el contador arrancará solo';
        document.body.classList.remove('escribiendo');
        actualizarRecord();
        enfocar();
    }

    function enfocar() {
        dom.entrada.focus({ preventScroll: true });
    }

    // ===== Resultados =====

    function claveRecord() {
        return 'record:' + idioma + (idioma === 'es' && !conTildes ? ':sin-tildes' : '');
    }

    function actualizarRecord() {
        const record = Number(leer(claveRecord())) || 0;
        dom.record.textContent = '';
        if (record) {
            const fuerte = document.createElement('strong');
            fuerte.textContent = `${record} WPM`;
            dom.record.append('Récord: ', fuerte);
        } else {
            dom.record.textContent = 'Aún sin récord';
        }
    }

    function contarHasta(nodo, valor) {
        if (movimientoReducido.matches) {
            nodo.textContent = valor;
            return;
        }
        const t0 = performance.now();
        const paso = ahora => {
            const p = Math.min(1, (ahora - t0) / 800);
            nodo.textContent = Math.round(valor * (1 - Math.pow(1 - p, 3)));
            if (p < 1 && estado === 'fin') requestAnimationFrame(paso);
        };
        requestAnimationFrame(paso);
    }

    function mostrarResultados(r) {
        const clave = claveRecord();
        const anterior = Number(leer(clave)) || 0;
        const nuevoRecord = r.wpm > anterior && r.wpm > 0;
        if (nuevoRecord) guardar(clave, r.wpm);

        dom.mesa.hidden = true;
        dom.resultados.hidden = false;

        $('r-precision').textContent = r.precision + '%';
        $('r-bruto').textContent = r.bruto;
        $('r-caracteres').textContent = `${r.correctos}/${r.errores}/${r.extra}/${r.omitidos}`;
        const total = document.createElement('small');
        total.textContent = ` de ${r.bien + r.mal}`;
        $('r-palabras').replaceChildren(String(r.bien), total);
        const record = Math.max(anterior, r.wpm);
        $('r-record').textContent = record ? `${record} WPM` : '–';
        $('r-sello').hidden = !nuevoRecord;
        contarHasta($('r-wpm'), r.wpm);

        const datos = datosGrafica();
        dibujarGrafica(datos);
        rellenarTabla(datos);
        actualizarRecord();
    }

    // El bruto de cada segundo es muy irregular: se suaviza con la media de 3 segundos
    function datosGrafica() {
        return muestras.map((d, i) => {
            const vecinos = muestras.slice(Math.max(0, i - 1), i + 2);
            return {
                s: d.s,
                wpm: d.wpm,
                bruto: vecinos.reduce((suma, v) => suma + v.bruto, 0) / vecinos.length,
                errores: d.errores,
            };
        });
    }

    function rellenarTabla(datos) {
        const filas = datos.map(d => {
            const tr = document.createElement('tr');
            for (const valor of [d.s, Math.round(d.wpm), Math.round(d.bruto), d.errores]) {
                const td = document.createElement('td');
                td.textContent = valor;
                tr.appendChild(td);
            }
            return tr;
        });
        $('r-tabla').replaceChildren(...filas);
    }

    // ===== Gráfica =====

    const SVG = 'http://www.w3.org/2000/svg';
    let geo = null;
    let puntoActivo = -1;

    function nodoSvg(etiqueta, atributos, padre) {
        const nodo = document.createElementNS(SVG, etiqueta);
        for (const clave in atributos) nodo.setAttribute(clave, atributos[clave]);
        if (padre) padre.appendChild(nodo);
        return nodo;
    }

    function dibujarGrafica(datos = geo && geo.datos) {
        const lienzo = dom.grafica;
        const ancho = lienzo.clientWidth;
        const alto = lienzo.clientHeight;
        lienzo.textContent = '';
        if (!ancho || !datos || !datos.length) return;

        const m = { izq: 34, der: 38, arr: 10, abj: 26 };
        const maximo = Math.max(40, ...datos.map(d => Math.max(d.wpm, d.bruto)));
        const salto = maximo > 200 ? 50 : maximo > 100 ? 25 : 20;
        const techo = Math.ceil(maximo / salto) * salto;
        const x = s => m.izq + s / DURACION * (ancho - m.izq - m.der);
        const y = v => m.arr + (1 - v / techo) * (alto - m.arr - m.abj);

        const svg = nodoSvg('svg', { viewBox: `0 0 ${ancho} ${alto}`, 'aria-hidden': 'true' }, lienzo);

        for (let v = 0; v <= techo; v += salto) {
            nodoSvg('line', { class: 'g-rejilla', x1: m.izq, x2: ancho - m.der, y1: y(v), y2: y(v) }, svg);
            const etiqueta = nodoSvg('text', { class: 'g-eje', x: m.izq - 8, y: y(v), dy: '0.35em', 'text-anchor': 'end' }, svg);
            etiqueta.textContent = v;
        }
        for (const s of [0, 15, 30, 45, 60]) {
            const etiqueta = nodoSvg('text', {
                class: 'g-eje',
                x: x(s),
                y: alto - 6,
                'text-anchor': s === 0 ? 'start' : s === 60 ? 'end' : 'middle',
            }, svg);
            etiqueta.textContent = s === 60 ? '60 s' : s;
        }

        const camino = clave => datos.map((d, i) => `${i ? 'L' : 'M'}${x(d.s).toFixed(1)} ${y(d[clave]).toFixed(1)}`).join('');
        const ultimo = datos[datos.length - 1];
        const estilo = getComputedStyle(document.documentElement);
        const color = nombre => estilo.getPropertyValue(nombre).trim();
        const papel = color('--papel');

        nodoSvg('path', { class: 'g-linea', d: camino('bruto'), stroke: color('--serie-bruto') }, svg);
        nodoSvg('path', {
            d: `${camino('wpm')}L${x(ultimo.s).toFixed(1)} ${y(0)}L${x(datos[0].s).toFixed(1)} ${y(0)}Z`,
            fill: color('--serie-wpm'),
            'fill-opacity': 0.1,
        }, svg);
        nodoSvg('path', { class: 'g-linea', d: camino('wpm'), stroke: color('--serie-wpm') }, svg);

        // Una cruz roja en cada segundo con fallos
        const rojo = color('--serie-error');
        for (const d of datos) {
            if (!d.errores) continue;
            const cx = x(d.s);
            const cy = y(d.wpm);
            const r = 3.5;
            const trazo = `M${cx - r} ${cy - r}L${cx + r} ${cy + r}M${cx + r} ${cy - r}L${cx - r} ${cy + r}`;
            nodoSvg('path', { d: trazo, stroke: papel, 'stroke-width': 6, 'stroke-linecap': 'round' }, svg);
            nodoSvg('path', { d: trazo, stroke: rojo, 'stroke-width': 2, 'stroke-linecap': 'round' }, svg);
        }

        // Punto y etiqueta final
        nodoSvg('circle', { cx: x(ultimo.s), cy: y(ultimo.wpm), r: 4, fill: color('--serie-wpm'), stroke: papel, 'stroke-width': 2 }, svg);
        const final = nodoSvg('text', {
            x: x(ultimo.s) + 9,
            y: y(ultimo.wpm),
            dy: '0.35em',
            fill: '#1f1b16',
            'font-weight': 700,
            'font-size': 13,
            'font-family': 'Courier Prime, Courier New, monospace',
        }, svg);
        final.textContent = Math.round(ultimo.wpm);

        // Capa de hover: línea vertical y puntos que siguen al cursor
        const cruz = nodoSvg('line', { y1: m.arr, y2: alto - m.abj, stroke: 'rgba(60, 45, 20, 0.4)', 'stroke-width': 1, visibility: 'hidden' }, svg);
        const puntoBruto = nodoSvg('circle', { r: 4, fill: color('--serie-bruto'), stroke: papel, 'stroke-width': 2, visibility: 'hidden' }, svg);
        const puntoWpm = nodoSvg('circle', { r: 4.5, fill: color('--serie-wpm'), stroke: papel, 'stroke-width': 2, visibility: 'hidden' }, svg);

        geo = { datos, x, y, m, ancho, cruz, puntoBruto, puntoWpm };
    }

    function filaTooltip(clase, valor, texto) {
        const fila = document.createElement('div');
        fila.className = 'tooltip__fila';
        const clave = document.createElement('i');
        clave.className = 'clave ' + clase;
        const fuerte = document.createElement('strong');
        fuerte.textContent = valor;
        const etiqueta = document.createElement('span');
        etiqueta.textContent = texto;
        fila.append(clave, fuerte, etiqueta);
        return fila;
    }

    function mostrarPunto(i) {
        if (!geo) return;
        i = Math.max(0, Math.min(geo.datos.length - 1, i));
        puntoActivo = i;
        const d = geo.datos[i];
        const px = geo.x(d.s);

        geo.cruz.setAttribute('x1', px);
        geo.cruz.setAttribute('x2', px);
        geo.puntoWpm.setAttribute('cx', px);
        geo.puntoWpm.setAttribute('cy', geo.y(d.wpm));
        geo.puntoBruto.setAttribute('cx', px);
        geo.puntoBruto.setAttribute('cy', geo.y(d.bruto));
        for (const nodo of [geo.cruz, geo.puntoWpm, geo.puntoBruto]) nodo.setAttribute('visibility', 'visible');

        const titulo = document.createElement('div');
        titulo.className = 'tooltip__titulo';
        titulo.textContent = `Segundo ${d.s}`;
        const filas = [
            titulo,
            filaTooltip('clave--wpm', Math.round(d.wpm), 'WPM'),
            filaTooltip('clave--bruto', Math.round(d.bruto), 'Bruto'),
        ];
        if (d.errores) filas.push(filaTooltip('clave--error', d.errores, d.errores === 1 ? 'Error' : 'Errores'));
        dom.tooltip.replaceChildren(...filas);
        dom.tooltip.hidden = false;

        const contenedor = dom.grafica.parentElement;
        const anchoTooltip = dom.tooltip.offsetWidth;
        let izquierda = px + 14;
        if (izquierda + anchoTooltip > contenedor.clientWidth) izquierda = px - 14 - anchoTooltip;
        dom.tooltip.style.left = `${Math.max(0, izquierda)}px`;
        dom.tooltip.style.top = `${dom.grafica.offsetTop + 4}px`;
    }

    function ocultarPunto() {
        dom.tooltip.hidden = true;
        if (!geo) return;
        for (const nodo of [geo.cruz, geo.puntoWpm, geo.puntoBruto]) nodo.setAttribute('visibility', 'hidden');
    }

    function puntoDesdePuntero(e) {
        if (!geo) return;
        const caja = dom.grafica.getBoundingClientRect();
        const s = Math.round((e.clientX - caja.left - geo.m.izq) / (geo.ancho - geo.m.izq - geo.m.der) * DURACION);
        mostrarPunto(s - 1);
    }

    dom.grafica.addEventListener('pointermove', puntoDesdePuntero);
    dom.grafica.addEventListener('pointerdown', puntoDesdePuntero);
    dom.grafica.addEventListener('pointerleave', () => {
        if (document.activeElement !== dom.grafica) ocultarPunto();
    });
    dom.grafica.addEventListener('focus', () => {
        if (geo) mostrarPunto(puntoActivo >= 0 ? puntoActivo : geo.datos.length - 1);
    });
    dom.grafica.addEventListener('blur', ocultarPunto);
    dom.grafica.addEventListener('keydown', e => {
        if (!geo) return;
        const ultimo = geo.datos.length - 1;
        const destinos = {
            ArrowLeft: puntoActivo - 1,
            ArrowRight: puntoActivo + 1,
            Home: 0,
            End: ultimo,
        };
        if (e.key in destinos) {
            e.preventDefault();
            mostrarPunto(destinos[e.key]);
        } else if (e.key === 'Escape') {
            e.stopPropagation();
            ocultarPunto();
        }
    });

    // ===== Eventos de teclado =====

    dom.entrada.addEventListener('keydown', e => {
        if (e.key === 'Tab') {
            e.preventDefault();
            reiniciar(e.shiftKey);
            return;
        }
        if (estado === 'fin' || e.key === 'Enter') {
            e.preventDefault();
            return;
        }
        if (e.key === 'Backspace') {
            if (dom.entrada.value === '' && !componiendo) {
                e.preventDefault();
                if (volverAtras(e.ctrlKey || e.altKey || e.metaKey)) {
                    sonar('retroceso');
                    ajustarLineas();
                    moverCursor();
                    cursorActivo();
                }
                return;
            }
            sonar('retroceso');
            return;
        }
        // Ctrl+tecla son atajos (AltGr, que es Ctrl+Alt, sí escribe)
        if ((e.ctrlKey && !e.altKey) || e.metaKey) return;
        if (e.key === ' ') sonar('espacio');
        else if (e.key === 'Dead') sonar('acento');
        else if (e.key.length === 1) sonar('tecla');
    });

    dom.entrada.addEventListener('input', e => {
        // Los teclados de móvil no siempre informan de la tecla en keydown: el sonido sale de aquí
        if (estado !== 'fin' && performance.now() - ultimoSonido > 50) {
            if (e.inputType && e.inputType.startsWith('delete')) sonar('retroceso');
            else if (e.data === ' ') sonar('espacio');
            else if (e.data) sonar('tecla');
        }
        procesarEntrada();
    });

    dom.entrada.addEventListener('compositionstart', () => {
        componiendo = true;
    });
    dom.entrada.addEventListener('compositionend', () => {
        componiendo = false;
        procesarEntrada();
    });
    dom.entrada.addEventListener('paste', e => e.preventDefault());
    dom.entrada.addEventListener('drop', e => e.preventDefault());

    dom.entrada.addEventListener('blur', () => {
        if (estado !== 'fin') dom.hoja.classList.add('desenfocada');
    });
    dom.entrada.addEventListener('focus', () => {
        dom.hoja.classList.remove('desenfocada');
    });

    const esControl = nodo => nodo instanceof Element && nodo.closest('button, a, summary, input, [tabindex]') !== null;

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            e.preventDefault();
            reiniciar();
            return;
        }
        if (estado === 'fin') {
            // Con el foco en un botón o en la gráfica, Tab navega con normalidad
            if (e.key === 'Tab' && !e.shiftKey && !esControl(e.target)) {
                e.preventDefault();
                reiniciar();
            }
            return;
        }
        if (document.activeElement === dom.entrada || e.ctrlKey || e.metaKey || e.altKey) return;
        if (esControl(e.target)) return;
        // Cualquier letra devuelve el foco a la hoja y se escribe directamente
        if (e.key.length === 1 || e.key === 'Dead') enfocar();
    });

    // ===== Ratón y botones =====

    // Pulsar la hoja enfoca la escritura sin que se pierda el foco por el camino
    dom.hoja.addEventListener('mousedown', e => e.preventDefault());
    dom.hoja.addEventListener('click', () => {
        if (Sonido.activo) Sonido.iniciar();
        enfocar();
    });

    // Los botones no roban el foco a la hoja al hacer clic
    for (const boton of [dom.btnSonido, dom.btnTildes, dom.btnReiniciar, ...botonesIdioma]) {
        boton.addEventListener('mousedown', e => e.preventDefault());
    }

    botonesIdioma.forEach(boton => boton.addEventListener('click', () => {
        if (boton.dataset.idioma === idioma && estado === 'espera') return enfocar();
        idioma = boton.dataset.idioma;
        actualizarIdioma();
        prepararVocabulario();
        reiniciar();
    }));

    dom.btnTildes.addEventListener('click', () => {
        conTildes = !conTildes;
        guardar('tildes', conTildes ? 'on' : 'off');
        dom.btnTildes.setAttribute('aria-pressed', String(conTildes));
        prepararVocabulario();
        reiniciar();
    });

    dom.btnSonido.addEventListener('click', () => {
        Sonido.activo = !Sonido.activo;
        actualizarSonido();
        if (Sonido.activo) Sonido.reproducir('tecla');
        if (estado !== 'fin') enfocar();
    });

    dom.btnReiniciar.addEventListener('click', () => reiniciar());
    dom.btnRepetir.addEventListener('click', () => reiniciar(true));
    dom.btnNuevo.addEventListener('click', () => reiniciar());

    function actualizarIdioma() {
        botonesIdioma.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.idioma === idioma)));
        dom.texto.lang = idioma;
        dom.btnTildes.hidden = idioma !== 'es';
    }

    function actualizarSonido() {
        dom.btnSonido.setAttribute('aria-pressed', String(Sonido.activo));
        dom.btnSonido.title = Sonido.activo ? 'Silenciar' : 'Activar sonido';
    }

    let temporizadorResize = 0;
    window.addEventListener('resize', () => {
        clearTimeout(temporizadorResize);
        temporizadorResize = setTimeout(() => {
            if (estado === 'fin') {
                ocultarPunto();
                dibujarGrafica();
            } else {
                recolocar();
            }
        }, 100);
    });

    // ===== Arranque =====

    dom.btnTildes.setAttribute('aria-pressed', String(conTildes));
    actualizarIdioma();
    actualizarSonido();
    prepararVocabulario();
    reiniciar();

    // Cuando llega la fuente de máquina de escribir cambian las medidas
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            if (estado !== 'fin') recolocar();
        });
    }
})();
