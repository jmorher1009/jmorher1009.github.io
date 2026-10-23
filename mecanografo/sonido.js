// Sonidos de las teclas: una máquina de escribir antigua y tres teclados mecánicos Cherry MX.
// Todos son golpes reales recortados de grabaciones libres (los créditos están en cada archivo de
// sonidos/ y al pie de la página). El audio va en archivos .js (un WAV en base64) para que cargue
// también al abrir la página con file://. Si no se puede decodificar, se sintetiza con Web Audio.
const Sonido = (() => {
    const CARPETA = new URL('sonidos/', document.currentScript ? document.currentScript.src : location.href);
    // [inicio, duración] en segundos de cada golpe dentro de su archivo
    const PAQUETES = {
        // Erika 5 de 1940
        maquina: {
            ganancia: 1.4,
            tecla: [[0.04, 0.1577], [0.2377, 0.1712], [0.4488, 0.1721], [0.661, 0.1443], [0.8453, 0.1462], [1.0315, 0.1395],
                [1.211, 0.1439], [1.3949, 0.1462], [1.581, 0.1603], [1.7813, 0.1601], [1.9814, 0.1491], [2.1705, 0.1406]],
            espacio: [[2.3511, 0.206], [2.5971, 0.2116], [2.8486, 0.2076]],
            timbre: [3.0962, 0.925],
            retorno: [4.0612, 1.48],
        },
        // Cherry MX Blue: clic agudo al pulsar (clicky)
        azul: {
            ganancia: 1.5,
            tecla: [[0.04, 0.152], [0.232, 0.1105], [0.3825, 0.152], [0.5745, 0.152], [0.7665, 0.0988], [0.9054, 0.152],
                [1.0973, 0.152], [1.2893, 0.152], [1.4813, 0.152], [1.6733, 0.0904], [1.8037, 0.152]],
            espacio: [[1.9957, 0.152], [2.1877, 0.109], [2.3368, 0.152]],
        },
        // Cherry MX Red: lineal, solo el golpe al llegar al fondo
        rojo: {
            ganancia: 1.5,
            tecla: [[0.04, 0.1129], [0.1929, 0.152], [0.3849, 0.148], [0.5729, 0.152], [0.7649, 0.1373], [0.9422, 0.1415],
                [1.1237, 0.1091], [1.2728, 0.1038], [1.4166, 0.0742], [1.5308, 0.1449], [1.7157, 0.1008], [1.8566, 0.0712]],
            espacio: [[1.9678, 0.1335], [2.1413, 0.1401], [2.3214, 0.1235]],
        },
        // Cherry MX Brown: táctil, más suave que el azul
        marron: {
            ganancia: 1.5,
            tecla: [[0.04, 0.0738], [0.1538, 0.1099], [0.3037, 0.0803], [0.4241, 0.1242], [0.5883, 0.1287], [0.757, 0.0887],
                [0.8857, 0.118], [1.0437, 0.097], [1.1806, 0.104], [1.3246, 0.152], [1.5166, 0.1247], [1.6813, 0.0853]],
            espacio: [[1.8066, 0.1203], [1.967, 0.1196], [2.1265, 0.124]],
        },
    };

    let ctx = null;
    let salida = null;
    let ruido = null;
    let activo = true;
    let tipo = 'maquina';

    try {
        activo = localStorage.getItem('mecanografo:sonido') !== 'off';
        const guardado = localStorage.getItem('mecanografo:tipo-sonido');
        if (PAQUETES[guardado]) tipo = guardado;
    } catch (e) { /* sin almacenamiento: sonido activado, máquina de escribir */ }

    const azar = (min, max) => min + Math.random() * (max - min);

    // ----- Carga de los paquetes -----

    function leerScript(nombre) {
        const almacen = () => window.SONIDOS_MECANOGRAFO || {};
        if (almacen()[nombre]) return Promise.resolve(almacen()[nombre]);
        return new Promise((ok, mal) => {
            const script = document.createElement('script');
            script.src = new URL(nombre + '.js', CARPETA).href;
            script.onload = () => (almacen()[nombre] ? ok(almacen()[nombre]) : mal(new Error('vacío')));
            script.onerror = () => mal(new Error('no se pudo cargar ' + nombre));
            document.head.appendChild(script);
        });
    }

    // Un AudioBuffer decodificado sin contexto real sirve después para cualquier contexto,
    // así que se puede cargar sin esperar a que el usuario toque nada
    function decodificar(base64) {
        const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        if (!OAC) return Promise.reject(new Error('sin Web Audio'));
        const binario = atob(base64);
        const bytes = new Uint8Array(binario.length);
        for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
        return new Promise((ok, mal) => new OAC(1, 1, 44100).decodeAudioData(bytes.buffer, ok, mal));
    }

    function cargar(nombre) {
        const p = PAQUETES[nombre];
        if (!p) return Promise.resolve(false);
        if (!p.carga) {
            p.estado = 'cargando';
            p.carga = leerScript(nombre)
                .then(decodificar)
                .then(buffer => {
                    p.buffer = buffer;
                    p.acciones = acciones(p);
                    p.estado = 'listo';
                    return true;
                })
                .catch(() => {
                    p.estado = 'error';
                    return false;
                })
                .finally(() => {
                    // El base64 ya no hace falta: se libera la memoria
                    if (window.SONIDOS_MECANOGRAFO) delete window.SONIDOS_MECANOGRAFO[nombre];
                });
        }
        return p.carga;
    }

    // El navegador solo deja crear/reanudar el audio tras una acción del usuario
    function iniciar() {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return false;
            ctx = new AC({ latencyHint: 'interactive' });

            // Limitador suave (tanh): no toca el golpe a volumen normal, solo evita
            // la saturación si se solapan muchas teclas. Un compresor aplastaría el chasquido.
            const limitador = ctx.createWaveShaper();
            const curva = new Float32Array(2048);
            for (let i = 0; i < curva.length; i++) curva[i] = Math.tanh((i / (curva.length - 1)) * 2 - 1);
            limitador.curve = curva;

            salida = ctx.createGain();
            salida.gain.value = 0.6;
            salida.connect(limitador).connect(ctx.destination);

            // Un segundo de ruido blanco que reutilizan todos los golpes
            ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
            const datos = ruido.getChannelData(0);
            for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
        }
        if (ctx.state === 'suspended') ctx.resume();
        return true;
    }

    // ----- Golpes grabados -----

    function muestra(p, [inicio, duracion], volumen = 1, velocidad = 1, retardo = 0) {
        const fuente = ctx.createBufferSource();
        fuente.buffer = p.buffer;
        fuente.playbackRate.value = velocidad;
        const g = ctx.createGain();
        g.gain.value = volumen * p.ganancia;
        fuente.connect(g).connect(salida);
        fuente.start(ctx.currentTime + retardo, inicio, duracion);
    }

    // Elige un golpe al azar sin repetir el anterior, para que no suene a bucle
    function sinRepetir(lista) {
        let ultimo = -1;
        return () => {
            let i;
            do {
                i = Math.floor(Math.random() * lista.length);
            } while (lista.length > 1 && i === ultimo);
            ultimo = i;
            return lista[i];
        };
    }

    // Qué suena con cada acción. Todas reciben un retardo opcional en segundos.
    function acciones(p) {
        const golpe = sinRepetir(p.tecla);
        const barra = sinRepetir(p.espacio);
        const tecla = r => muestra(p, golpe(), azar(0.8, 1), azar(0.97, 1.03), r);
        const espacio = r => muestra(p, barra(), azar(0.85, 1), azar(0.97, 1.03), r);
        if (p.timbre) {
            return {
                tecla,
                acento: r => muestra(p, golpe(), azar(0.65, 0.8), azar(0.97, 1.03), r),
                espacio,
                retroceso: r => muestra(p, barra(), 0.6, 1.15, r),
                linea: r => muestra(p, p.timbre, 0.3, 1, r),
                fin: (r = 0) => {
                    muestra(p, p.timbre, 0.9, 1, r);
                    muestra(p, p.retorno, 0.9, 1, r + 0.45);
                },
            };
        }
        // En un teclado la tecla muerta y el retroceso son pulsaciones como las demás,
        // y no hay campanilla ni carro
        return {
            tecla,
            acento: tecla,
            espacio,
            retroceso: r => muestra(p, golpe(), azar(0.7, 0.85), azar(0.97, 1.03), r),
        };
    }

    // ----- Golpes sintetizados (si no hay grabación) -----

    // Envolvente percusiva: ataque casi instantáneo y caída exponencial de 60 dB
    function envolvente(t, volumen, caida, ataque = 0.0015) {
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(volumen, t + ataque);
        g.gain.exponentialRampToValueAtTime(volumen * 0.001, t + ataque + caida);
        g.gain.linearRampToValueAtTime(0, t + ataque + caida + 0.005);
        g.connect(salida);
        return g;
    }

    function golpeRuido(t, { tipo, frec, q = 1, volumen, caida, ataque }) {
        const fuente = ctx.createBufferSource();
        fuente.buffer = ruido;
        const filtro = ctx.createBiquadFilter();
        filtro.type = tipo;
        filtro.frequency.value = frec;
        filtro.Q.value = q;
        fuente.connect(filtro).connect(envolvente(t, volumen, caida, ataque));
        fuente.start(t, azar(0, 0.6));
        fuente.stop(t + (ataque || 0) + caida + 0.05);
    }

    function tono(t, { frec, frecFinal, forma = 'sine', volumen, caida, ataque }) {
        const osc = ctx.createOscillator();
        osc.type = forma;
        osc.frequency.setValueAtTime(frec, t);
        if (frecFinal) osc.frequency.exponentialRampToValueAtTime(frecFinal, t + caida);
        osc.connect(envolvente(t, volumen, caida, ataque));
        osc.start(t);
        osc.stop(t + (ataque || 0) + caida + 0.05);
    }

    // Tecla normal: el tipo golpea el rodillo y el carro avanza un espacio
    function tecla(avanzaCarro = true) {
        const t = ctx.currentTime + 0.002;
        const v = azar(0.85, 1.1);
        const p = azar(0.93, 1.07);
        // chasquido seco del tipo contra el papel
        golpeRuido(t, { tipo: 'highpass', frec: 3800 * p, q: 0.7, volumen: 0.6 * v, caida: 0.012 });
        // "clac" con cuerpo de la barra de tipos
        golpeRuido(t, { tipo: 'bandpass', frec: 1500 * p, q: 2.2, volumen: 2.4 * v, caida: 0.045 });
        // golpe sordo del rodillo de goma
        tono(t, { frec: 150 * p, frecFinal: 60, volumen: 0.5 * v, caida: 0.07 });
        // resonancia metálica de la barra
        tono(t, { frec: 2950 * p, volumen: 0.045 * v, caida: 0.06 });
        tono(t, { frec: 4420 * p, volumen: 0.028 * v, caida: 0.04 });
        // tic del escape al avanzar el carro
        if (avanzaCarro) {
            golpeRuido(t + azar(0.024, 0.034), { tipo: 'bandpass', frec: 5200, q: 1.5, volumen: 0.6 * v, caida: 0.01 });
        }
    }

    // Barra espaciadora: más grave y sin tipo que golpee
    function espacio() {
        const t = ctx.currentTime + 0.002;
        const v = azar(0.9, 1.05);
        const p = azar(0.95, 1.05);
        golpeRuido(t, { tipo: 'bandpass', frec: 760 * p, q: 1.4, volumen: 2.8 * v, caida: 0.06 });
        tono(t, { frec: 110 * p, frecFinal: 45, volumen: 0.65 * v, caida: 0.09 });
        golpeRuido(t + 0.03, { tipo: 'bandpass', frec: 4800, q: 1.5, volumen: 0.6 * v, caida: 0.012 });
    }

    // Retroceso: el carro vuelve un espacio, un clic más suave
    function retroceso() {
        const t = ctx.currentTime + 0.002;
        const v = azar(0.9, 1.05);
        golpeRuido(t, { tipo: 'bandpass', frec: 1100, q: 1.8, volumen: 2.6 * v, caida: 0.035 });
        golpeRuido(t + 0.018, { tipo: 'bandpass', frec: 3600, q: 2, volumen: 0.8 * v, caida: 0.01 });
    }

    // Campanilla de fin de línea
    function timbre(volumen) {
        const t = ctx.currentTime + 0.005;
        const f = 1900;
        golpeRuido(t, { tipo: 'highpass', frec: 5000, volumen: volumen * 0.4, caida: 0.008 });
        tono(t, { frec: f, volumen: volumen, caida: 1.3, ataque: 0.002 });
        tono(t, { frec: f * 2.41, volumen: volumen * 0.35, caida: 0.7, ataque: 0.002 });
        tono(t, { frec: f * 4.07, volumen: volumen * 0.12, caida: 0.35, ataque: 0.002 });
    }

    // Retorno de carro: carraca del trinquete y golpe final contra el tope
    function retornoCarro(volumen) {
        const t0 = ctx.currentTime + 0.12;
        const dientes = 10;
        golpeRuido(t0, { tipo: 'bandpass', frec: 900, q: 0.8, volumen: volumen * 0.4, caida: 0.2, ataque: 0.05 });
        for (let i = 0; i < dientes; i++) {
            const t = t0 + 0.24 * Math.pow(i / dientes, 0.85);
            golpeRuido(t, { tipo: 'bandpass', frec: azar(2600, 3400), q: 3, volumen: volumen * 1.2, caida: 0.012 });
        }
        const tope = t0 + 0.26;
        golpeRuido(tope, { tipo: 'bandpass', frec: 850, q: 1.2, volumen: volumen * 2.2, caida: 0.08 });
        tono(tope, { frec: 120, frecFinal: 50, volumen: volumen * 0.6, caida: 0.12 });
    }

    const sintetizados = {
        tecla: () => tecla(true),
        acento: () => tecla(false), // las teclas muertas no hacen avanzar el carro
        espacio,
        retroceso,
        linea: () => timbre(0.1),
        fin: () => { timbre(0.45); retornoCarro(0.8); },
    };

    // Mientras se carga un paquete no suena nada; si no se pudo cargar, se usa el sintetizado
    function reproducir(accion) {
        if (!activo || !iniciar()) return;
        const p = PAQUETES[tipo];
        const sonido = p.acciones ? p.acciones[accion] : p.estado === 'error' ? sintetizados[accion] : null;
        if (sonido) sonido(0);
    }

    // Para escuchar un sonido al elegirlo: tres teclas y la barra espaciadora
    function probar() {
        if (!activo || !iniciar()) return;
        const elegido = tipo;
        cargar(elegido).then(() => {
            const p = PAQUETES[elegido];
            if (tipo !== elegido || !activo) return;
            if (!p.acciones) {
                reproducir('tecla');
                return;
            }
            for (const r of [0, 0.12, 0.23]) p.acciones.tecla(r);
            p.acciones.espacio(0.37);
        });
    }

    cargar(tipo);

    return {
        iniciar,
        reproducir,
        probar,
        cargar,
        get activo() {
            return activo;
        },
        set activo(valor) {
            activo = valor;
            try {
                localStorage.setItem('mecanografo:sonido', valor ? 'on' : 'off');
            } catch (e) { /* no pasa nada si no se puede guardar */ }
            if (valor) iniciar();
        },
        get tipo() {
            return tipo;
        },
        set tipo(valor) {
            if (!PAQUETES[valor]) return;
            tipo = valor;
            try {
                localStorage.setItem('mecanografo:tipo-sonido', valor);
            } catch (e) { /* no pasa nada si no se puede guardar */ }
            cargar(valor);
        },
    };
})();
