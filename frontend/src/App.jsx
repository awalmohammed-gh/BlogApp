
import { RouterProvider } from 'react-router-dom'
import router from './router/router'
import { useVisualViewport } from './hooks/useVisualViewport'

const App = () => {
  useVisualViewport();
  return <RouterProvider router={router}/>
}

export default App
