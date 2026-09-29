document.addEventListener('DOMContentLoaded', function () {
    var menuToggle = document.querySelector('.menu-toggle');
    var nav = document.querySelector('.main-nav');
    if (!menuToggle || !nav) return;

    function closeNav() {
        nav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
    }

    menuToggle.addEventListener('click', function () {
        var expanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', String(!expanded));
        nav.classList.toggle('open');
    });

    document.addEventListener('click', function (e) {
        if (!nav.contains(e.target) && nav.classList.contains('open')) {
            closeNav();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && nav.classList.contains('open')) {
            closeNav();
            menuToggle.focus();
        }
    });
});
