let select = document.querySelector("select");
let html = document.querySelector("html");

function cambiatema(bgcolor,textcolor){

    html.style.backgroundColor = bgcolor;
    html.style.color = textcolor;
}

select.onchange = function(){

    switch(select.value){
        case("negro"):
        {
            cambiatema("black","white");
            break;
        }
        case("blanco"):{
            cambiatema("white","black");
            break;
        }
    }

    /*select.value === "negro" ? 
    cambiatema("black","white") 
    : cambiatema("white","black");
*/
}; 