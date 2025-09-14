/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { h, FunctionalComponent } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import htm from 'htm';
import type { TargetedEvent } from 'preact/compat';
import { LightingSettings, CommonSettingsPanelProps } from '../../types';
import { LIGHTING_STYLES } from '../../constants';
import { MicIcon } from '../../components';

const html = htm.bind(h);

interface LightingSettingsPanelProps extends CommonSettingsPanelProps {
    settings: LightingSettings;
    setSettings: (updater: (s: LightingSettings) => LightingSettings) => void;
}

export const LightingSettingsPanel: FunctionalComponent<LightingSettingsPanelProps> = ({ settings, setSettings, onGenerate, generating, hasImage }) => {
    const [isRecording, setIsRecording] = useState(false);

    const toggleStyle = (styleName: string) => {
        setSettings(s => {
            const selectedStyles = s.selectedStyles.includes(styleName)
                ? s.selectedStyles.filter(name => name !== styleName)
                : [...s.selectedStyles, styleName];
            return { ...s, selectedStyles };
        });
    };

    const handleVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Trình duyệt không hỗ trợ nhập liệu giọng nói.");
            return;
        }
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.lang = 'vi-VN';
        recognition.onstart = () => setIsRecording(true);
        recognition.onend = () => setIsRecording(false);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setSettings(s => ({ ...s, customPrompt: s.customPrompt ? `${s.customPrompt} ${transcript}` : transcript }));
        };
        if (isRecording) {
            recognition.stop();
        } else {
            recognition.start();
        }
    };
    
    const canGenerate = useMemo(() => {
        return settings.selectedStyles.length > 0 || settings.customPrompt.trim() !== '';
    }, [settings.selectedStyles, settings.customPrompt]);

    return html`
        <div class="settings-panel">
            <div class="form-group">
                <label>9 Kiểu ánh sáng có sẵn</label>
                <div class="lighting-styles-grid">
                    ${LIGHTING_STYLES.map(style => html`
                        <button 
                            class="style-button ${settings.selectedStyles.includes(style.name) ? 'active' : ''}"
                            onClick=${() => toggleStyle(style.name)}
                        >
                            ${style.name}
                        </button>
                    `)}
                </div>
            </div>

            <div class="form-group">
                <label for="custom-lighting-prompt">Prompt tùy chỉnh</label>
                <div class="voice-input-container">
                    <textarea 
                        id="custom-lighting-prompt" 
                        placeholder="VD: ánh sáng hoàng hôn ấm áp chiếu từ bên trái..."
                        value=${settings.customPrompt}
                        onInput=${(e: TargetedEvent<HTMLTextAreaElement>) => setSettings(s => ({ ...s, customPrompt: e.currentTarget.value }))}
                    ></textarea>
                    <button class="voice-btn ${isRecording ? 'recording' : ''}" onClick=${handleVoiceInput} title="Nhập bằng giọng nói">
                        <${MicIcon} recording=${isRecording} />
                    </button>
                </div>
            </div>
            
            <button class="btn btn-primary" onClick=${onGenerate} disabled=${generating || !hasImage || !canGenerate} style=${{width: '100%'}}>
                ${generating ? 'Đang xử lý...' : 'Tạo ảnh'}
            </button>
        </div>
    `;
};
