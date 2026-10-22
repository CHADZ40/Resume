(() => {
  const root = document.getElementById('root');
  const template = document.getElementById('portfolio-template');
  if (!root || !template || !window.React || !window.ReactDOM) return;

  const h = React.createElement;

  function ThemeToggle() {
    const [dark, setDark] = React.useState(document.documentElement.dataset.theme === 'dark');
    function toggleTheme(event) {
      const next = dark ? 'light' : 'dark';
      const bounds = event.currentTarget.getBoundingClientRect();
      document.documentElement.style.setProperty('--theme-x', `${bounds.left + bounds.width / 2}px`);
      document.documentElement.style.setProperty('--theme-y', `${bounds.top + bounds.height / 2}px`);
      const update = () => {
        document.documentElement.dataset.theme = next;
        try { localStorage.setItem('menghour-theme', next); } catch (_) {}
        setDark(next === 'dark');
      };
      if (document.startViewTransition && ReactDOM.flushSync) {
        document.startViewTransition(() => ReactDOM.flushSync(update));
      } else update();
    }
    return h('button', {
      className: 'theme-toggle', type: 'button', onClick: toggleTheme,
      'aria-label': `Switch to ${dark ? 'light' : 'dark'} mode`, 'aria-pressed': dark
    }, h('i', { className: `theme-toggle-icon fa-solid ${dark ? 'fa-sun' : 'fa-moon'}`, 'aria-hidden': 'true' }),
    h('span', null, dark ? 'Light mode' : 'Dark mode'));
  }

  function PortfolioApp() {
    const [menuOpen, setMenuOpen] = React.useState(false);
    const [glowEnabled, setGlowEnabled] = React.useState(false);
    const markup = { __html: template.innerHTML };

    React.useEffect(() => {
      const themeMount = document.getElementById('theme-toggle-root');
      if (!themeMount) return;
      const themeRoot = ReactDOM.createRoot(themeMount);
      themeRoot.render(h(ThemeToggle));
      return () => themeRoot.unmount();
    }, []);

    React.useEffect(() => {
      const menu = document.getElementById('mobile-menu');
      menu?.classList.toggle('hidden', !menuOpen);
      document.getElementById('menu-btn')?.setAttribute('aria-expanded', String(menuOpen));
      document.getElementById('bar1')?.style.setProperty('transform', menuOpen ? 'rotate(45deg) translate(0, 6px)' : '');
      document.getElementById('bar2')?.style.setProperty('opacity', menuOpen ? '0' : '');
      document.getElementById('bar3')?.style.setProperty('transform', menuOpen ? 'rotate(-45deg) translate(0, -6px)' : '');
    }, [menuOpen]);

    React.useEffect(() => {
      const glow = document.getElementById('cursor-glow');
      const button = document.getElementById('toggle-glow');
      glow?.classList.toggle('active', glowEnabled);
      if (button) {
        button.setAttribute('aria-pressed', String(glowEnabled));
        const label = button.querySelector('span');
        if (label) label.textContent = glowEnabled ? 'Disable Glow' : 'Mouse Glow';
      }
    }, [glowEnabled]);

    React.useEffect(() => {
      document.querySelector('.portfolio-app')?.classList.add('js-ready');
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const targets = document.querySelectorAll('.section-inner > *, .project-card, .design-card, .academic-term, .resume-panel, .card, .contact-card');
      if (reducedMotion || !('IntersectionObserver' in window)) {
        targets.forEach((node) => node.classList.add('scroll-visible'));
        return;
      }

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('scroll-visible');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });

      targets.forEach((node, index) => {
        node.style.setProperty('--reveal-delay', `${Math.min(index % 5, 4) * 70}ms`);
        observer.observe(node);
      });
      return () => observer.disconnect();
    }, []);

    function handleClick(event) {
      if (event.target.closest('#menu-btn')) {
        setMenuOpen((open) => !open);
      } else if (event.target.closest('#mobile-menu a')) {
        setMenuOpen(false);
      } else if (event.target.closest('#toggle-glow')) {
        setGlowEnabled((enabled) => !enabled);
      }
    }

    function handlePointerMove(event) {
      if (!glowEnabled || event.pointerType === 'touch') return;
      const glow = document.getElementById('cursor-glow');
      if (glow) {
        glow.style.left = `${event.clientX}px`;
        glow.style.top = `${event.clientY}px`;
      }
    }

    return h('div', {
      className: 'portfolio-app',
      onClick: handleClick,
      onPointerMove: handlePointerMove,
      dangerouslySetInnerHTML: markup
    });
  }

  ReactDOM.createRoot(root).render(h(PortfolioApp));
})();
