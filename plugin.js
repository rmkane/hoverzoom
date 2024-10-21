class HoverZoomModalPlugin {
  constructor({ theme = {}, strategies = [], offset = 20 } = {}) {
    this.modal = null;

    this.theme = { ...HoverZoomModalPlugin.defaultTheme, ...theme };
    this.strategies = strategies.length
      ? strategies
      : HoverZoomModalPlugin.defaultStrategies;
    this.offset = offset;

    attachEvent("DOMContentLoaded", this.init, { scope: this });
  }

  init() {
    this.modal = this.createModal();
    document.body.appendChild(this.modal);

    attachEvent("mouseenter", this.onMouseEnter, {
      scope: this,
      capture: true,
    });
    attachEvent("mousemove", this.onMouseMove, {
      scope: this,
      capture: true,
      throttle: 10,
    });
    attachEvent("mouseleave", this.onMouseLeave, {
      scope: this,
      capture: true,
    });
  }

  createModal() {
    return createElement("div", {
      className: "hover-zoom-modal",
      css: {
        display: "none",
        pointerEvents: "none",
        position: "fixed",
        zIndex: 9999,
        flexDirection: "column",
        justifyContent: "center",
        padding: "0.25rem",
        gap: "0.25rem",
        // Configurable
        fontFamily: this.theme.fontFamily,
        backgroundColor: this.theme.primary,
        color: this.theme.textColor,
        border: this.theme.border,
        boxShadow: this.theme.shadow,
      },
      children: [
        createElement("div", {
          className: "modal-title",
          css: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0.25rem",
            fontWeight: "bold",
            fontSize: "larger",
            backgroundColor: this.theme.secondary,
          },
        }),
        createElement("img", {
          className: "modal-image",
          props: { alt: "Image Preview" },
          css: {
            maxWidth: "90vw",
            maxHeight: "80vh",
            objectFit: "contain",
            boxShadow: this.theme.shadow,
          },
        }),
        createElement("div", {
          className: "modal-status",
          css: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0.25rem",
            fontWeight: "bold",
            fontSize: "smaller",
            backgroundColor: this.theme.secondary,
          },
        }),
      ],
    });
  }

  findStrategy(target) {
    if (target && target.nodeType === Node.ELEMENT_NODE) {
      return this.strategies.find((strategy) => strategy.isValid(target));
    }
    return null;
  }

  onMouseEnter(event) {
    const target = event.target;
    const strategy = this.findStrategy(target);

    if (!strategy) return;

    const modal = this.modal;
    const titleBar = modal.querySelector(".modal-title");

    titleBar.textContent = strategy.getTitle(target);
    strategy.loadImage(modal, target);

    modal.style.display = "flex";
    this.positionModal(event);
  }

  onMouseMove(event) {
    if (this.modal.style.display !== "flex") return;
    window.requestAnimationFrame(() => this.positionModal(event));
  }

  onMouseLeave(event) {
    const target = event.target;
    const strategy = this.findStrategy(target);

    if (!strategy) return;

    this.modal.style.display = "none";
  }

  positionModal(event) {
    let x = event.clientX + this.offset;
    let y = event.clientY + this.offset;

    const { x: adjustedX, y: adjustedY } = calculatePosition(
      this.modal,
      x,
      y,
      this.offset
    );

    applyStyle(this.modal, {
      top: `${adjustedY}px`,
      left: `${adjustedX}px`,
    });
  }

  // Method to dynamically update the theme after initialization
  updateTheme(newTheme) {
    this.theme = Object.assign({}, this.theme, newTheme);
    this.applyTheme();
    return this;
  }

  applyTheme() {
    applyStyle(this.modal, {
      backgroundColor: this.theme.primary,
      color: this.theme.textColor,
      border: this.theme.border,
      boxShadow: this.theme.shadow,
    });
  }
}

// Attach event with throttling
const attachEvent = (type, listener, options = {}) => {
  const {
    capture = false,
    scope = window,
    target = document,
    throttle: throttleDelay = 0,
  } = options;
  const boundFn = scope ? listener.bind(scope) : listener;
  const wrappedFn = throttleDelay ? throttle(boundFn, throttleDelay) : boundFn;
  target.addEventListener(type, wrappedFn, capture);
};

// Throttle using performance.now()
const throttle = (func, delay) => {
  let lastCall = 0;
  return (...args) => {
    const now = performance.now();
    if (now - lastCall < delay) return;
    lastCall = now;
    return func(...args);
  };
};

// Utility functions
const createElement = (type, config = {}) => {
  const el = document.createElement(type);
  if (config.id) el.id = config.id;
  if (config.className) el.classList.add(...config.className.split(" "));
  if (config.text) el.textContent = config.text;
  if (config.html) el.insertAdjacentHTML("beforeend", config.html);
  if (config.props) applyProps(el, config.props);
  if (config.css) applyStyle(el, config.css);
  if (config.children) el.append(...config.children);
  return el;
};

const applyProps = (el, props) => {
  for (let prop in props) {
    el.setAttribute(prop, props[prop]);
  }
};

const applyStyle = (el, props) => {
  for (let prop in props) {
    el.style[prop] = props[prop];
  }
  return el;
};

const calculatePosition = (element, x, y, offset) => {
  const rect = element.getBoundingClientRect();

  if (x + rect.width > window.innerWidth) {
    x = window.innerWidth - rect.width - offset;
  }

  if (y + rect.height > window.innerHeight) {
    y = window.innerHeight - rect.height - offset;
  }

  return { x, y };
};

// Strategies
const AnchorStrategy = {
  isValid: (el) => el.matches("a") && el.dataset.image,
  getTitle: (el) => el.textContent || "Untitled Link",
  loadImage: (modal, el) => {
    const modalImage = modal.querySelector(".modal-image");

    modalImage.src = el.dataset.image;
    modalImage.onload = () => updateImageStatus(modal);
  },
};

const ImageStrategy = {
  isValid: (el) => el.matches("img"),
  getTitle: (el) => el.alt || "Untitled Image",
  loadImage: (modal, el) => {
    const modalImage = modal.querySelector(".modal-image");

    modalImage.src = el.src;
    modalImage.onload = () => updateImageStatus(modal);
  },
};

const SVGStrategy = {
  isValid: (el) => el.matches("svg"),
  getTitle: (el) => el.getAttribute("title") || "Untitled SVG",
  loadImage: (modal, el) => {
    const modalImage = modal.querySelector(".modal-image");
    const statusBar = modal.querySelector(".modal-status");

    modalImage.src = `data:image/svg+xml;base64,${btoa(el.outerHTML)}`;
    modalImage.onload = () => {
      statusBar.textContent = `SVG Element Displayed`;
    };
  },
};

const updateImageStatus = (modal) => {
  const modalImage = modal.querySelector(".modal-image");
  const statusBar = modal.querySelector(".modal-status");
  const width = modalImage.naturalWidth;
  const height = modalImage.naturalHeight;

  statusBar.textContent = `Original: ${width}×${height}`;
};

HoverZoomModalPlugin.defaultStrategies = [
  AnchorStrategy,
  ImageStrategy,
  SVGStrategy,
];

HoverZoomModalPlugin.defaultTheme = {
  primary: "rgba(32, 32, 32, 0.8)",
  secondary: "transparent",
  border: "0.25rem solid #FFF",
  textColor: "#FFFFFF",
  shadow: "0 0 15px rgba(0, 0, 0, 0.7)",
  fontFamily: "inherit",
};

// Themes
const RedTheme = {
  primary: "rgba(50, 50, 50, 0.95)",
  secondary: "red",
  border: "0.25rem solid red",
  textColor: "yellow",
  shadow: "0 0 10px rgba(0, 0, 0, 0.8)",
  fontFamily: "Arial",
};
