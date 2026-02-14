import './App.css'
import { RouterProvider } from 'react-router'
import { router } from './router'
import { AuthProvider } from './contexts/AuthContext'
import { WebSocketProvider } from './contexts/WebSocketContext'

function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <RouterProvider router={router} />
      </WebSocketProvider>
    </AuthProvider>
  )
}

export default App
