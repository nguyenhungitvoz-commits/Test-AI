/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { h, FunctionalComponent } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import htm from 'htm';
import type { TargetedEvent } from 'preact/compat';
import { Theme } from '../../types';
import { testApiKey } from '../../api';

const html = htm.bind(h);

const SettingsInfo: FunctionalComponent = () => html`
    <div class="settings-info">
        <div class="info-card">
            <div class="info-card-header">
                <h3>Cách hoạt động</h3>
            </div>
            <p>
                Magic Tool V1 sử dụng sức mạnh của mô hình AI Google Gemini để thực hiện các tác vụ chỉnh sửa ảnh.
            </p>
            <p>
                Để đảm bảo tính bảo mật và cho phép bạn toàn quyền kiểm soát việc sử dụng, ứng dụng yêu cầu bạn cung cấp API Key của riêng bạn. Mọi yêu cầu xử lý ảnh sẽ được thực hiện thông qua key của bạn.
            </p>
        </div>
         <div class="info-card">
            <div class="info-card-header">
                <h3>Làm thế nào để lấy API Key?</h3>
            </div>
            <ul>
                <li><strong>Bước 1:</strong> Truy cập vào Google AI Studio.</li>
                <li><strong>Bước 2:</strong> Nhấp vào nút "Get API Key" (Lấy khóa API).</li>
                <li><strong>Bước 3:</strong> Tạo một khóa API mới trong dự án của bạn.</li>
                <li><strong>Bước 4:</strong> Sao chép khóa và dán vào ô bên trái.</li>
            </ul>
             <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" class="youtube-link">
                <span>Lấy API Key tại Google AI Studio</span>
            </a>
        </div>
    </div>
`;


interface SettingsAppProps {
    onClearCache: () => void;
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

export const SettingsApp: FunctionalComponent<SettingsAppProps> = ({ onClearCache, theme, setTheme }) => {
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [apiKeyStatus, setApiKeyStatus] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);
    const [saveStatusMessage, setSaveStatusMessage] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [keySource, setKeySource] = useState<'custom' | 'default' | 'none'>('none');

    useEffect(() => {
        const savedKey = localStorage.getItem('gemini_api_key') || '';
        setApiKeyInput(savedKey);

        if (savedKey) {
            setKeySource('custom');
        } else if (process.env.API_KEY) {
            setKeySource('default');
        } else {
            setKeySource('none');
            setApiKeyStatus({ message: 'Chưa có API key nào được thiết lập.', type: 'warning' });
        }
    }, []);

    const handleTestKey = async () => {
        setIsTesting(true);
        setApiKeyStatus(null);
        const result = await testApiKey(apiKeyInput);
        setApiKeyStatus(result);
        setIsTesting(false);
    };

    const handleSaveKey = () => {
        const keyToSave = apiKeyInput.trim();
        setApiKeyStatus(null); // Clear previous test results on save

        if (keyToSave) {
            localStorage.setItem('gemini_api_key', keyToSave);
            setKeySource('custom');
        } else {
            localStorage.removeItem('gemini_api_key');
            setApiKeyInput(''); // Clear the input field visually
            if (process.env.API_KEY) {
                setKeySource('default');
            } else {
                setKeySource('none');
                setApiKeyStatus({ message: 'Chưa có API key nào được thiết lập.', type: 'warning' });
            }
        }
        setSaveStatusMessage('Đã lưu thành công!');
        setTimeout(() => setSaveStatusMessage(''), 3000);
    };
    
    return html`
        <div class="settings-app-layout">
            <div class="settings-panel">
                <h2>Cài đặt</h2>
                 <div class="form-group">
                    <h3>Google Gemini API Key</h3>
                    <p class="settings-description">
                        Để sử dụng các tính năng AI, bạn cần cung cấp API Key của riêng mình từ Google.
                    </p>
                    <label for="api-key">Nhập API Key của bạn</label>
                    ${keySource === 'custom' && html`<div class="api-status" style=${{marginBottom: '0.5rem', marginTop: '0.5rem'}}>Trạng thái: Đang dùng key tuỳ chỉnh.</div>`}
                    ${keySource === 'default' && html`<div class="api-status" style=${{marginBottom: '0.5rem', marginTop: '0.5rem'}}>Trạng thái: Đang dùng key mặc định của hệ thống.</div>`}
                    <input 
                        type="password" 
                        id="api-key" 
                        value=${apiKeyInput} 
                        onInput=${(e: TargetedEvent<HTMLInputElement>) => setApiKeyInput(e.currentTarget.value)}
                        placeholder="•••••••••••••••••••••••••••••••"
                    />
                    ${apiKeyStatus && html`
                        <div class="api-test-result ${apiKeyStatus.type}">
                            ${apiKeyStatus.message}
                        </div>
                    `}
                </div>
                <div class="actions" style=${{justifyContent: 'flex-start', paddingTop: 0, marginTop: '1rem', marginBottom: '2rem'}}>
                    <button class="btn btn-secondary" onClick=${handleTestKey} disabled=${isTesting}>
                        ${isTesting ? 'Đang kiểm tra...' : 'Kiểm tra Key'}
                    </button>
                     <button class="btn btn-primary" onClick=${handleSaveKey}>
                        Lưu Key
                    </button>
                </div>
                 ${saveStatusMessage && html`<div class="save-status-message">${saveStatusMessage}</div>`}
                

                 <div class="form-group">
                    <h3>Giao diện</h3>
                    <p class="settings-description">
                        Chọn giao diện sáng hoặc tối cho ứng dụng.
                    </p>
                    <div class="radio-group">
                        <label>
                            <input type="radio" name="theme" value="light" checked=${theme === 'light'} onChange=${() => setTheme('light')} />
                            Sáng
                        </label>
                        <label>
                            <input type="radio" name="theme" value="dark" checked=${theme === 'dark'} onChange=${() => setTheme('dark')} />
                            Tối
                        </label>
                    </div>
                </div>
                
                <div class="form-group">
                    <h3>Hệ thống</h3>
                    <button class="btn" onClick=${onClearCache} style=${{width: '100%', background: '#ff6b6b', color: 'white', marginTop: '0.5rem'}}>
                        🔄 Xóa Cache & Tải lại trang
                    </button>
                </div>
            </div>
             <${SettingsInfo} />
        </div>
    `;
};