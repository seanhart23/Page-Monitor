const statusElement = document.getElementById("status");

export function createAlert(message, type){
    statusElement.innerHTML = "<h2>" + message + "</h2>";
}