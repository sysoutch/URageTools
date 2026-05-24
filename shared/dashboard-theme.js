(function() {
    const themes = {
        fire: { accent: '#ff8a4d', accentStrong: '#ff6136', bg: '#120d0d', surface: 'rgba(24, 14, 14, 0.92)', surfaceStrong: 'rgba(18, 11, 11, 0.98)', line: 'rgba(255, 180, 128, 0.18)', lineStrong: 'rgba(255, 180, 128, 0.34)', text: '#f6f1ee', muted: '#c8b6ae' },
        water: { accent: '#59b6ff', accentStrong: '#2f8cf0', bg: '#0d1522', surface: 'rgba(12, 21, 37, 0.94)', surfaceStrong: 'rgba(10, 17, 29, 0.98)', line: 'rgba(114, 190, 255, 0.18)', lineStrong: 'rgba(114, 190, 255, 0.34)', text: '#eef5ff', muted: '#a9bfd8' },
        purple: { accent: '#c27cff', accentStrong: '#9b59d1', bg: '#1a0d1a', surface: 'rgba(26, 13, 26, 0.95)', surfaceStrong: 'rgba(17, 11, 17, 0.98)', line: 'rgba(194, 124, 255, 0.18)', lineStrong: 'rgba(194, 124, 255, 0.34)', text: '#f9eefe', muted: '#d1a9d8' },
        nature: { accent: '#82cd5f', accentStrong: '#58a23c', bg: '#11170f', surface: 'rgba(18, 24, 16, 0.94)', surfaceStrong: 'rgba(13, 19, 11, 0.98)', line: 'rgba(146, 213, 120, 0.18)', lineStrong: 'rgba(146, 213, 120, 0.34)', text: '#f2f8ee', muted: '#bccfaf' },
        rock: { accent: '#c4ae8a', accentStrong: '#9b8563', bg: '#151515', surface: 'rgba(24, 24, 24, 0.95)', surfaceStrong: 'rgba(16, 16, 16, 0.98)', line: 'rgba(196, 190, 176, 0.18)', lineStrong: 'rgba(196, 190, 176, 0.34)', text: '#f2efea', muted: '#b7aea2' }
    }

    function getTokens(themeName) {
        return themes[themeName] || themes.fire
    }

    function ensureSharedToolComponentStyles() {
        if (document.getElementById('urage-shared-tool-component-styles')) return
        const link = document.createElement('link')
        link.id = 'urage-shared-tool-component-styles'
        link.rel = 'stylesheet'
        link.href = '/tools/shared/css/components/tool-components.css'
        const target = document.head || document.documentElement
        target.appendChild(link)
    }

    function applyBodyTheme(themeName) {
        const nextTheme = themeName || document.body.getAttribute('data-dashboard-theme') || 'fire'
        document.body.setAttribute('data-dashboard-theme', nextTheme)
        ensureSharedToolComponentStyles()
        return getTokens(nextTheme)
    }

    function applyThemeVars(themeName, cssVarMap) {
        const tokens = applyBodyTheme(themeName)
        if (!cssVarMap) return tokens
        Object.entries(cssVarMap).forEach(([cssVar, tokenName]) => {
            const value = tokens[tokenName]
            if (value) document.documentElement.style.setProperty(cssVar, value)
        })
        return tokens
    }

    function registerThemeSync(onApply) {
        const apply = (themeName) => {
            const resolvedTheme = themeName || document.body.getAttribute('data-dashboard-theme') || 'fire'
            const tokens = applyBodyTheme(resolvedTheme)
            if (typeof onApply === 'function') onApply(resolvedTheme, tokens)
            return tokens
        }

        window.addEventListener('message', (event) => {
            const message = event && event.data
            if (!message || message.type !== 'tool:theme') return
            apply(message.payload && message.payload.theme)
        })

        return apply()
    }

    window.getDashboardThemeTokens = getTokens
    window.applyDashboardThemeVars = applyThemeVars
    window.registerDashboardThemeSync = registerThemeSync
})()
