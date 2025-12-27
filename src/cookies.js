const MOBILE_MENU_ID = 'mobileMenu';
const MOBILE_MENU_TOGGLE_ID = 'mobileMenuToggle';

const bannerAnimationName = 'cookie-banner-slide';

function toggleMobileMenu(forceOpen) {
	const menu = document.getElementById(MOBILE_MENU_ID);
	const toggleBtn = document.getElementById(MOBILE_MENU_TOGGLE_ID);
	if (!menu || !toggleBtn) {
		return;
	}

	const isHidden = menu.classList.contains('hidden');
	const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : isHidden;

	if (shouldOpen) {
		menu.classList.remove('hidden');
		toggleBtn.setAttribute('aria-expanded', 'true');
	} else {
		menu.classList.add('hidden');
		toggleBtn.setAttribute('aria-expanded', 'false');
	}
}

function closeMobileMenuIfClickOutside(event) {
	const menu = document.getElementById(MOBILE_MENU_ID);
	const toggleBtn = document.getElementById(MOBILE_MENU_TOGGLE_ID);
	if (!menu || !toggleBtn || menu.classList.contains('hidden')) {
		return;
	}

	if (!menu.contains(event.target) && !toggleBtn.contains(event.target)) {
		toggleMobileMenu(false);
	}
}

function bindMobileMenu() {
	const toggleBtn = document.getElementById(MOBILE_MENU_TOGGLE_ID);
	const mobileMenu = document.getElementById(MOBILE_MENU_ID);

	if (!toggleBtn || !mobileMenu) {
		return;
	}

	toggleBtn.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		toggleMobileMenu();
	});

	mobileMenu.querySelectorAll('a').forEach((link) => {
		link.addEventListener('click', () => toggleMobileMenu(false));
	});

	document.addEventListener('click', closeMobileMenuIfClickOutside);
}

function bindCookieBanner() {
	const banner = document.getElementById('cookieBanner');
	if (!banner) {
		return;
	}

	const isAccepted = localStorage.getItem('cookiesAccepted');
	if (isAccepted !== null) {
		banner.style.display = 'none';
	}

	window.acceptCookies = function acceptCookies() {
		localStorage.setItem('cookiesAccepted', 'true');
		hideBanner();
	};

	window.rejectCookies = function rejectCookies() {
		localStorage.setItem('cookiesAccepted', 'false');
		hideBanner();
	};

	window.showCookiePolicy = function showCookiePolicy(event) {
		event?.preventDefault();
		window.alert('Çerez Politikası\n\nRentCar, deneyiminizi iyileştirmek için gerekli, analitik ve reklam amaçlı çerezler kullanır. Ayrıntılar için gizlilik@rentcar.local adresi ile iletişime geçebilirsiniz.');
	};

	function hideBanner() {
		banner.style.animation = `${bannerAnimationName} 0.3s ease-out forwards`;
		window.setTimeout(() => {
			banner.remove();
		}, 300);
	}

	const style = document.createElement('style');
	style.textContent = `
		@keyframes ${bannerAnimationName} {
			from { opacity: 1; transform: translateY(0); }
			to { opacity: 0; transform: translateY(100%); }
		}
	`;
	document.head.appendChild(style);
}

function registerUtilities() {
	window.toggleMobileMenu = toggleMobileMenu;

	window.scrollToTop = function scrollToTop(event) {
		event?.preventDefault();
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};
}

document.addEventListener('DOMContentLoaded', () => {
	bindMobileMenu();
	bindCookieBanner();
	registerUtilities();
});
