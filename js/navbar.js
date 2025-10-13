const navButton = document.querySelector("#nav-button");
const navMobileMenu = document.querySelector("#mobile-menu");
const logo = document.querySelector("#nav-logo");

navButton.addEventListener("click", e => {
	e.currentTarget.toggleAttribute("aria-expanded");
  navMobileMenu.toggleAttribute("data-hidden");
});

const randomLogo = () => `${Math.floor(Math.random() * 7) * 12.5}%`;

logo.style.setProperty("--bgPosition", randomLogo() );