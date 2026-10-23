// Sonidos de máquina de escribir antigua.
// Se usan golpes reales de una Erika 5 de 1940 recortados en sonidos/erika.wav (grabación
// «WWS Typewriter» de Work With Sounds / Konrad Gutkowski, CC BY 4.0). Si el archivo no se
// puede cargar (por ejemplo al abrir la página con file://) se sintetizan con Web Audio.
const Sonido = (() => {
    const ARCHIVO = new URL('sonidos/erika.wav', document.currentScript ? document.currentScript.src : location.href);
    // [inicio, duración] en segundos de cada golpe dentro del archivo
    const MAPA = {
        tecla: [[0.04, 0.1577], [0.2377, 0.1712], [0.4488, 0.1721], [0.661, 0.1443], [0.8453, 0.1462], [1.0315, 0.1395],
            [1.211, 0.1439], [1.3949, 0.1462], [1.581, 0.1603], [1.7813, 0.1601], [1.9814, 0.1491], [2.1705, 0.1406]],
        espacio: [[2.3511, 0.206], [2.5971, 0.2116], [2.8486, 0.2076]],
        timbre: [3.0962, 0.925],
        retorno: [4.0612, 1.48],
    };
    const GANANCIA_MUESTRAS = 1.4;

    let ctx = null;
    let salida = null;
    let ruido = null;
    let muestras = null;
    let activo = true;

    try {
        activo = localStorage.getItem('mecanografo:sonido') !== 'off';
    } catch (e) { /* sin almacenamiento: sonido activado */ }

    const azar = (min, max) => min + Math.random() * (max - min);

    // Se descarga y decodifica al cargar la página (sin esperar a que el usuario toque nada)
    // para que el primer golpe ya suene real. Un AudioBuffer sirve para cualquier contexto.
    function cargarMuestras() {
        const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        if (!OAC || !window.fetch) return Promise.resolve(false);
        return fetch(ARCHIVO)
            .then(r => {
                if (!r.ok) throw new Error(r.status);
                return r.arrayBuffer();
            })
            .then(datos => new Promise((ok, mal) => new OAC(1, 1, 44100).decodeAudioData(datos, ok, mal)))
            .then(buffer => {
                muestras = buffer;
                return true;
            })
            .catch(() => false);
    }

    const listo = cargarMuestras();

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

    function muestra([inicio, duracion], volumen = 1, velocidad = 1, retardo = 0) {
        const fuente = ctx.createBufferSource();
        fuente.buffer = muestras;
        fuente.playbackRate.value = velocidad;
        const g = ctx.createGain();
        g.gain.value = volumen * GANANCIA_MUESTRAS;
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

    const golpe = sinRepetir(MAPA.tecla);
    const barra = sinRepetir(MAPA.espacio);

    const grabados = {
        tecla: () => muestra(golpe(), azar(0.8, 1), azar(0.97, 1.03)),
        acento: () => muestra(golpe(), azar(0.65, 0.8), azar(0.97, 1.03)),
        espacio: () => muestra(barra(), azar(0.85, 1), azar(0.97, 1.03)),
        retroceso: () => muestra(barra(), 0.6, 1.15),
        linea: () => muestra(MAPA.timbre, 0.3),
        fin: () => {
            muestra(MAPA.timbre, 0.9);
            muestra(MAPA.retorno, 0.9, 1, 0.45);
        },
    };

    // ----- Golpes sintetizados (si no hay archivo) -----

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

    function reproducir(tipo) {
        if (!activo || !iniciar()) return;
        const sonido = (muestras ? grabados : sintetizados)[tipo];
        if (sonido) sonido();
    }

    return {
        iniciar,
        reproducir,
        listo,
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
    };
})();
