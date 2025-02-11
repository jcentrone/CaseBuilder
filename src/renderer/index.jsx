// src/renderer/index.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ThemeToggleProvider from './ThemeToggleProvider'

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
    <ThemeToggleProvider>
      <App />
    </ThemeToggleProvider>

)
