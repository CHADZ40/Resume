const glow      = document.getElementById('cursor-glow');
const toggleBtn = document.getElementById('toggle-glow');

let isGlowEnabled = false;

window.addEventListener('mousemove', (e) => {
  if (isGlowEnabled) {
    glow.style.left = `${e.clientX}px`;
    glow.style.top  = `${e.clientY}px`;
  }
});

toggleBtn.addEventListener('click', () => {
  isGlowEnabled = !isGlowEnabled;
  glow.classList.toggle('active', isGlowEnabled);

  const label = toggleBtn.querySelector('span');
  if (label) {
    label.textContent = isGlowEnabled ? 'Disable Glow' : 'Mouse Glow';
  }
});
