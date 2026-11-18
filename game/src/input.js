// Solmarina Heat - keyboard and mouse input.
// Keys are tracked as a live set plus a just-pressed set cleared each frame.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.clicked = false;
    this.canvas = canvas;

    window.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key.startsWith("Arrow")) {
        e.preventDefault();
      }
      if (!this.keys.has(e.key)) {
        this.pressed.add(e.key);
      }
      this.keys.add(e.key);
    });
    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.key);
    });
    window.addEventListener("blur", () => {
      this.keys.clear();
      this.pressed.clear();
    });
    canvas.addEventListener("mousemove", (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouseY = (e.clientY - r.top) * (canvas.height / r.height);
    });
    canvas.addEventListener("mousedown", () => {
      this.clicked = true;
    });
  }

  down(...names) {
    for (const n of names) {
      if (this.keys.has(n)) {
        return true;
      }
    }
    return false;
  }

  wasPressed(...names) {
    for (const n of names) {
      if (this.pressed.has(n)) {
        return true;
      }
    }
    return false;
  }

  moveAxis() {
    let x = 0;
    let y = 0;
    if (this.down("a", "A", "ArrowLeft")) {
      x -= 1;
    }
    if (this.down("d", "D", "ArrowRight")) {
      x += 1;
    }
    if (this.down("w", "W", "ArrowUp")) {
      y -= 1;
    }
    if (this.down("s", "S", "ArrowDown")) {
      y += 1;
    }
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.sqrt(2);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  endFrame() {
    this.pressed.clear();
    this.clicked = false;
  }
}
