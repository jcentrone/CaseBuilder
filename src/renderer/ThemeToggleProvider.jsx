// ThemeToggleProvider.jsx
import React from 'react'
import {createTheme, ThemeProvider} from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

export const ColorModeContext = React.createContext({
    toggleColorMode: () => {
    }
})

export default function ThemeToggleProvider({children}) {
    const storedMode = localStorage.getItem('themeMode') || 'light'
    // const storedMode = 'dark'
    const [mode, setMode] = React.useState(storedMode)

    const colorMode = React.useMemo(() => ({
        toggleColorMode: () => {
            setMode(prevMode => {
                const newMode = prevMode === 'light' ? 'dark' : 'light'
                // console.log('[COLOR MODE] Changing from', prevMode, 'to', newMode)
                localStorage.setItem('themeMode', newMode)
                return newMode
            })
        }
    }), [])

    React.useEffect(() => {
        if (window.electronAPI && window.electronAPI.onToggleDarkMode) {
            // console.log('[RENDERER] Listening for toggle-dark-mode')
            window.electronAPI.onToggleDarkMode(() => {
                // console.log('[RENDERER] toggle-dark-mode event received!')
                colorMode.toggleColorMode()
            })
        }
        // else {
        //     console.log('[RENDERER] window.electronAPI.onToggleDarkMode is not defined')
        // }
    }, [colorMode])

    const theme = React.useMemo(() => createTheme({
        palette: {
            mode,
            ...(mode === 'light'
                    ? {
                        primary: {main: '#1976d2'},
                        background: {default: '#fafafa', paper: '#fff'},
                    }
                    : {
                        primary: {main: '#90caf9'},
                        background: {default: '#121212', paper: '#1d1d1d'},
                    }
            )


        }
    }), [mode])

    return (
        <ColorModeContext.Provider value={colorMode}>
            <ThemeProvider theme={theme}>
                <CssBaseline/>
                {children}
            </ThemeProvider>
        </ColorModeContext.Provider>
    )
}
