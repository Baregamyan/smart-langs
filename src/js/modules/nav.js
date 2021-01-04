export class Nav {
  constructor(navClass) {
    this.class = navClass;
    this.nav = document.querySelector('.nav');
    this.trigger = document.querySelector('.header__trigger');

  }

  init() {
    this.trigger.addEventListener('click', this.toggle.bind(this));
  }

  toggle() {
    this.nav.classList.toggle('nav--show');
  }
}
