# React + Vite

## Application toast notifications

The toast store, viewport and styling belong to this application. Import
`toast` from `src/utils/toast.js` using the appropriate relative path:

```js
toast.success("Article published");
toast.error("Unable to save your article");
const id = toast.loading("Uploading your image…");
toast.success("Image uploaded", { id });
toast.dismiss(id); // Omit the ID to dismiss all messages.
```

`info` and `warning` are also supported. Messages accept `{ id, duration }`;
loading messages stay until updated or dismissed. The viewport keeps up to five
messages, supports keyboard dismissal and screen-reader announcements, and
pauses timers while hovered, focused or the browser is inactive. Long stacks
scroll within the device viewport, with reduced-motion preferences respected.

Run `npm --prefix frontend run test:toast` for deterministic timer tests and
`npm --prefix server run test:toast-browser` for contact form and toast browser
checks. The browser audit intercepts all submissions and reads only public
content. Set `TOAST_SITE_URL` to check the contact flow on a deployed build.

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
