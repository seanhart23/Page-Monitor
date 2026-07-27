// const BASE_URL = "https://smart-page-monitor.onrender.com";
const BASE_URL = "./";
const INDEX_URL = "index.html";
const SUPPORT_URL = "support.html";
const PRIVACY_URL = "privacy.html";

document.addEventListener("DOMContentLoaded", () => {
  const yearElement = document.getElementById("year");

  if (yearElement) {
    yearElement.textContent =
      String(new Date().getFullYear());
  }

  const getPageUrl = (className, base, url) => { 
    const allIndexLinks = document.querySelectorAll(className);
    allIndexLinks.forEach(link => {
        link.href = base + url;
    });
  }

  getPageUrl('.index-url', `${BASE_URL}`,`${INDEX_URL}` )
  getPageUrl('.support-url', `${BASE_URL}`,`${SUPPORT_URL}` )
  getPageUrl('.privacy-url', `${BASE_URL}`,`${PRIVACY_URL}` )

});

