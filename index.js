function hacer(caracter) {
    var pantalla = document.getElementById("pantalla");
    var valorActual = pantalla.value;
    var resultado = 0;



    switch (caracter) {
        case 'dlt': { valorActual = 0; break; }
        case '=': { valorActual = resultado; break; }
        default: valorActual=1; break;
    }

    pantalla.value = valorActual;
}
