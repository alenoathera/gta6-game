/**
 * Solara Bay - Input Controller
 * Tracks keyboard state, mouse orientation, and action triggers
 */

export class InputController {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Map();
    this.actions = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      action: false, // Enter/exit car
      sprint: false,
      attack: false,
      aim: false,
      mute: false,
      pause: false,
    };

    this.mouse = {
      x: 0,
      y: 0,
      dx: 0,
      dy: 0,
      down: false,
      rightDown: false,
    };

    this.actionPressed = false;
    this.mutePressed = false;
    this.pausePressed = false;

    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('keydown', (e) => {
      const code = e.code.toLowerCase();
      this.keys.set(code, true);

      if (code === 'keyf' || code === 'enter') this.actionPressed = true;
      if (code === 'keym') this.mutePressed = true;
      if (code === 'escape' || code === 'keyp') this.pausePressed = true;

      this.updateState();
    });

    window.addEventListener('keyup', (e) => {
      this.keys.set(e.code.toLowerCase(), false);
      this.updateState();
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouse.down = true;
      if (e.button === 2) this.mouse.rightDown = true;
      this.updateState();
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.down = false;
      if (e.button === 2) this.mouse.rightDown = false;
      this.updateState();
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('mousemove', (e) => {
      this.mouse.dx = e.movementX || 0;
      this.mouse.dy = e.movementY || 0;
    });
  }

  updateState() {
    const k = (code) => !!this.keys.get(code);

    this.actions.forward = k('keyw') || k('arrowup');
    this.actions.backward = k('keys') || k('arrowdown');
    this.actions.left = k('keya') || k('arrowleft');
    this.actions.right = k('keyd') || k('arrowright');
    this.actions.jump = k('space');
    this.actions.sprint = k('shiftleft') || k('shiftright');
    this.actions.attack = this.mouse.down || k('keyj');
    this.actions.aim = this.mouse.rightDown || k('keyk');
  }

  // Consume one-shot triggers
  consumeAction() {
    const p = this.actionPressed;
    this.actionPressed = false;
    return p;
  }

  consumeMute() {
    const p = this.mutePressed;
    this.mutePressed = false;
    return p;
  }

  consumePause() {
    const p = this.pausePressed;
    this.pausePressed = false;
    return p;
  }
}
