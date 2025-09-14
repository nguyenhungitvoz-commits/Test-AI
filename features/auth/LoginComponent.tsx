/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { h, FunctionalComponent } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import htm from 'htm';
import type { TargetedEvent } from 'preact/compat';

const html = htm.bind(h);

interface LoginComponentProps {
    onLogin: (username: string, password: string, rememberMe: boolean) => Promise<void>;
    error: string;
}

export const LoginComponent: FunctionalComponent<LoginComponentProps> = ({ onLogin, error }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const savedCreds = localStorage.getItem('login_credentials');
        if (savedCreds) {
            try {
                const { username: savedUser, password: savedPass } = JSON.parse(savedCreds);
                setUsername(savedUser || '');
                setPassword(savedPass || '');
                setRememberMe(true);
            } catch(e) {
                console.error("Failed to parse saved credentials", e);
                localStorage.removeItem('login_credentials');
            }
        }
    }, []);

    const handleSubmit = async (e: TargetedEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onLogin(username, password, rememberMe);
        } catch (err) {
            // Error is handled by the parent component's state
        } finally {
            setLoading(false);
        }
    };

    return html`
        <div class="login-container">
            <div class="login-form">
                <h2>Yêu cầu đăng nhập</h2>
                <p class="subtitle" style=${{marginBottom: '1.5rem'}}>Vui lòng đăng nhập để truy cập tính năng này.</p>
                 <p class="subtitle" style=${{marginBottom: '1rem'}}>Liên hệ zalo : 0378.180.567</p>
                ${error && html`<div class="error-message">${error}</div>`}
                <form onSubmit=${handleSubmit}>
                    <div class="form-group">
                        <label for="username">Tên đăng nhập</label>
                        <input 
                            type="text" 
                            id="username" 
                            value=${username} 
                            onInput=${(e: TargetedEvent<HTMLInputElement>) => setUsername(e.currentTarget.value)} 
                            required
                        />
                    </div>
                    <div class="form-group">
                        <label for="password">Mật khẩu</label>
                        <input 
                            type="password" 
                            id="password" 
                            value=${password} 
                            onInput=${(e: TargetedEvent<HTMLInputElement>) => setPassword(e.currentTarget.value)} 
                            required
                        />
                    </div>
                     <div class="form-group remember-me">
                        <label>
                            <input 
                                type="checkbox" 
                                checked=${rememberMe} 
                                onChange=${(e: TargetedEvent<HTMLInputElement>) => setRememberMe(e.currentTarget.checked)} 
                            />
                            Lưu tài khoản
                        </label>
                    </div>
                    <button type="submit" class="btn btn-primary" style=${{width: '100%'}} disabled=${loading}>
                        ${loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </button>
                </form>
            </div>
        </div>
    `;
};
