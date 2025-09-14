/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { render, h, FunctionalComponent } from 'preact';
import { useState, useEffect, useMemo } from 'preact/hooks';
import htm from 'htm';
import { Theme } from './types';
import { TABS } from './constants';
import { ThemeToggle, NavToggleIcon } from './components';
import {
    IdPhotoApp,
    RestorationApp,
    FacialSymmetryEditor,
    LightingEditor,
    BackgroundApp,
    TrendCreatorApp,
    MockupApp,
    SettingsApp,
} from './features';

const html = htm.bind(h);

// Function to clear cache and force refresh
const clearCacheAndRefresh = () => {
    if ('caches' in window) {
        caches.keys().then(names => {
            names.forEach(name => {
                caches.delete(name);
            });
        });
    }
    window.location.reload();
};

export const App: FunctionalComponent = () => {
    const [mainTab, setMainTab] = useState('id-photo');
    const [isNavCollapsed, setIsNavCollapsed] = useState(window.innerWidth < 900);
    const [theme, setTheme] = useState<Theme>('dark');

    const activeTabData = useMemo(() => TABS.find(t => t.id === mainTab) || TABS[0], [mainTab]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 900) {
                setIsNavCollapsed(true);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as Theme | null;
        const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
        setTheme(initialTheme);
    }, []);

    useEffect(() => {
        if (theme === 'light') {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const handleThemeToggle = () => {
        setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    };

    const renderContent = () => {
        switch (mainTab) {
            case 'id-photo':
                return html`<${IdPhotoApp} key="id-photo" />`;
            case 'restoration':
                return html`<${RestorationApp} key="restoration" />`;
            case 'symmetry':
                return html`<${FacialSymmetryEditor} key="symmetry" />`;
            case 'lighting':
                return html`<${LightingEditor} key="lighting" />`;
            case 'background':
                return html`<${BackgroundApp} key="background" />`;
            case 'trend-creator':
                return html`<${TrendCreatorApp} key="trend-creator" />`;
            case 'mockup':
                return html`<${MockupApp} key="mockup" />`;
            case 'settings':
                 return html`<${SettingsApp} key="settings" theme=${theme} setTheme=${setTheme} onClearCache=${clearCacheAndRefresh} />`;
            default:
                return null;
        }
    };

    return html`
        <div class="app-container ${isNavCollapsed ? 'nav-collapsed' : ''}">
            <nav class="sidebar-nav">
                <div class="sidebar-header">
                    <span class="logo-text">MAGIC TOOL V1</span>
                    <button class="nav-toggle" onClick=${() => setIsNavCollapsed(prev => !prev)} title="Toggle Navigation">
                        <${NavToggleIcon} />
                    </button>
                </div>

                <div class="main-tabs">
                    ${TABS.map(tab => html`
                        <button 
                            class="main-tab ${mainTab === tab.id ? 'active' : ''}" 
                            onClick=${() => setMainTab(tab.id)}
                            title=${tab.label}
                        >
                            <span class="tab-icon"><${tab.icon} /></span>
                            <span class="tab-label">${tab.label}</span>
                        </button>
                    `)}
                </div>

                <div class="sidebar-footer">
                    <${ThemeToggle} theme=${theme} onToggle=${handleThemeToggle} />
                </div>
            </nav>

            <main class="main-content">
                <div class="page-header">
                    <h1>${activeTabData.label}</h1>
                    <p class="subtitle">${activeTabData.description}</p>
                </div>
                
                <div class="tab-content">
                    ${renderContent()}
                </div>
            </main>
        </div>
    `;
};