function hacer(caracter) {
    var pantalla = document.getElementById("pantalla");
    var valorActual = pantalla.value;
    var resultado = 0;



    switch (caracter) {
        case 'dlt': {  break; }
        case '=': { valorActual = resultado; break; }
        default: valorActual=1; break;
    }

    pantalla.value = valorActual;
}
