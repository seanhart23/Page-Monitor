document.addEventListener("DOMContentLoaded", () => {
  const yearElement = document.getElementById("year");
 
  if (yearElement) {
    yearElement.textContent =
      String(new Date().getFullYear());
  }

});

