let select = document.querySelector("select");
let html = document.querySelector("html");

function cambiatema(bgcolor,textcolor){

    html.style.backgroundColor = bgcolor;
    html.style.color = textcolor;
}

select.onchange = function(){

    select.value === "negro" ? 
    cambiatema("black","white") 
    : cambiatema("white","black");
}; 