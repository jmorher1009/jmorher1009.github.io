let input = document.getElementById('pantalla');
let buttons = document.querySelectorAll('button');

let string = "";

let parentesis = false;

let arr = Array.from(buttons);

arr.forEach(button => {
    button.addEventListener('click',(e) =>{
        if(e.target.innerHTML == '='){
            try {
                string = eval(input.value);
                input.value = string;
              } catch (error) {
                // Si ocurre un error, puedes manejarlo aquí
                console.error("Error:", error);
                input.value = "Error";
              }
        }
        else if(e.target.innerHTML == 'AC')
        {
            parentesis = false;
            string = "";
            input.value = string;
        }
        else if (e.target.innerHTML == 'dlt') {

            var ultimoCaracterEliminado = string.charAt(string.length - 1);
            if (ultimoCaracterEliminado == '(' && parentesis) {
                parentesis = false;  
            }
            else if (ultimoCaracterEliminado == ')' && !parentesis) {
                parentesis = true;  
            }
            string = string.substring(0, string.length - 1);
            input.value = string;
        }
        else{
            if(e.target.innerHTML == '()'){
                if(!parentesis){
                    string += '(';
                    parentesis = true;
                }
                else {
                    string += ')';
                    parentesis = false;    
             }
            }
            else if(e.target.innerHTML == '÷')
                string += '/';
            else if(e.target.innerHTML == ',')
                string +='.';
            else if(e.target.innerHTML == 'x')
                string +='*';
             if(e.target.innerHTML != '÷' && e.target.innerHTML !=',' && e.target.innerHTML !='x' && e.target.innerHTML !='()')   {
                if(input.value == 'Error')
                    string = "";
                string += e.target.innerHTML;
                
                }
            input.value = string;
        }
    })

})