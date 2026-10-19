# React + Vite

## Responsive layout verification

From the repository root in PowerShell:

```powershell
$env:VITE_API_URL = "/api"
npm --prefix frontend run build
npm --prefix server run test:responsive
```

The browser audit checks nine viewport sizes from 320px phones to 1920px
desktops, including landscape, public pages, login, navigation, admin dialogs,
notifications, search and viewport resizing. It reads real published articles;
staff sessions are mocked and all real writes and analytics are blocked.
Screenshots and the report are saved under ignored
`server/test-results/responsive/`. These are Chromium emulation checks, not
physical-device Safari testing. Set `RESPONSIVE_API_URL` to use a different
backend, `RESPONSIVE_WIDTHS` to run selected widths, or `CHROME_PATH` to choose
the installed Chrome executable.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
