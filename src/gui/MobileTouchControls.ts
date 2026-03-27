let mobileTouchButton: number = 0;

export function getMobileTouchButton(): number {
  return mobileTouchButton;
}

export function setMobileTouchButton(button: number): void {
  mobileTouchButton = button;
}

export function createMobileTouchControls(container: HTMLElement): () => void {
  const wrapper = document.createElement("div");
  wrapper.className = "mobile-touch-controls";

  const leftBtn = document.createElement("button");
  leftBtn.className = "mobile-touch-btn mobile-touch-btn-left active";
  leftBtn.textContent = "L";
  leftBtn.setAttribute("data-button", "0");

  const rightBtn = document.createElement("button");
  rightBtn.className = "mobile-touch-btn mobile-touch-btn-right";
  rightBtn.textContent = "R";
  rightBtn.setAttribute("data-button", "2");

  function setActive(button: number): void {
    mobileTouchButton = button;
    leftBtn.classList.toggle("active", button === 0);
    rightBtn.classList.toggle("active", button === 2);
  }

  const onLeftClick = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    setActive(0);
  };

  const onRightClick = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    setActive(2);
  };

  leftBtn.addEventListener("touchstart", onLeftClick, { passive: false });
  leftBtn.addEventListener("mousedown", onLeftClick);
  rightBtn.addEventListener("touchstart", onRightClick, { passive: false });
  rightBtn.addEventListener("mousedown", onRightClick);

  wrapper.appendChild(leftBtn);
  wrapper.appendChild(rightBtn);
  container.appendChild(wrapper);

  return () => {
    leftBtn.removeEventListener("touchstart", onLeftClick);
    leftBtn.removeEventListener("mousedown", onLeftClick);
    rightBtn.removeEventListener("touchstart", onRightClick);
    rightBtn.removeEventListener("mousedown", onRightClick);
    wrapper.remove();
  };
}
