(() => {
  const mount = document.getElementById('theme-toggle-root');
  if (!mount || !window.React || !window.ReactDOM) return;

  const h = React.createElement;

  function ThemeToggle() {
    const [dark, setDark] = React.useState(document.documentElement.dataset.theme === 'dark');

    function toggleTheme(event) {
      const nextTheme = dark ? 'light' : 'dark';
      const button = event.currentTarget;
      const bounds = button.getBoundingClientRect();
      document.documentElement.style.setProperty('--theme-x', `${bounds.left + bounds.width / 2}px`);
      document.documentElement.style.setProperty('--theme-y', `${bounds.top + bounds.height / 2}px`);

      const update = () => {
        document.documentElement.dataset.theme = nextTheme;
        try { localStorage.setItem('menghour-theme', nextTheme); } catch (_) {}
        setDark(nextTheme === 'dark');
      };

      if (document.startViewTransition && ReactDOM.flushSync) {
        document.startViewTransition(() => ReactDOM.flushSync(update));
      } else {
        update();
      }
    }

    return h('button', {
      className: 'theme-toggle',
      type: 'button',
      onClick: toggleTheme,
      'aria-label': `Switch to ${dark ? 'light' : 'dark'} mode`,
      'aria-pressed': dark
    },
      h('i', { className: `theme-toggle-icon fa-solid ${dark ? 'fa-sun' : 'fa-moon'}`, 'aria-hidden': 'true' }),
      h('span', null, dark ? 'Light mode' : 'Dark mode')
    );
  }

  ReactDOM.createRoot(mount).render(React.createElement(ThemeToggle));
})();
