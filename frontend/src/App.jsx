
import { RouterProvider } from 'react-router-dom'
import router from './router/router'
import { useVisualViewport } from './hooks/useVisualViewport'
import GlobalBroadcastSplash from './components/common/GlobalBroadcastSplash'

const App = () => {
  useVisualViewport();
  return (
    <>
      <GlobalBroadcastSplash />
      <RouterProvider router={router} />
    </>
  );
}

export default App
