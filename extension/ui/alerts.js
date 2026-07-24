const statusElement = document.getElementById("status");

export function createAlert(message){
    statusElement.innerHTML = "<h2>" + message + "</h2>";
}