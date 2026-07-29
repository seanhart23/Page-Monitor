// const BASE_URL = "https://smart-page-monitor.onrender.com";
const BASE_URL = "./";
const INDEX_URL = "index.html";
const SUPPORT_URL = "support.html";
const PRIVACY_URL = "privacy.html";

document.addEventListener("DOMContentLoaded", () => {
  const yearElement = document.getElementById("year");
  const siteHeaderElement = document.querySelector(".site-header");
  const siteFooterElement = document.querySelector(".site-footer");

  function siteHeader() {
    return `
    <div class="container header-content">
      <a class="brand" href="${BASE_URL}${INDEX_URL}" class="index-url">
        <span class="brand-icon"><img src="./icons/chrome_bubble_128.png"></span>
        <span>Smart Page Monitor</span>
      </a>

      <nav class="navigation" aria-label="Main navigation">
        <a href="${BASE_URL}${INDEX_URL}" class="index-url">Home</a>
        <a href="${BASE_URL}${SUPPORT_URL}" class="support-url">Support</a>
        <a href="${BASE_URL}${PRIVACY_URL}" class="privacy-url">Privacy</a>
      </nav>
    </div>
  `;
  }

  function siteFooter() {
    return `
    <div class="container footer-content">
      <p>
        © <span id="current-year"></span>
        Smart Page Monitor.
      </p>

      <div class="footer-links">
        <a href="${BASE_URL}${PRIVACY_URL}" class="privacy-url">Privacy Policy</a>
        <a href="${BASE_URL}${SUPPORT_URL}" class="support-url">Support</a>
      </div>
    </div>
  `;
  }

  if (yearElement) {
    yearElement.textContent =
      String(new Date().getFullYear());
  }

  siteHeaderElement.innerHTML = siteHeader();
  siteFooterElement.innerHTML = siteFooter();

});

