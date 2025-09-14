/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { h, FunctionalComponent } from 'preact';
import { useState } from 'preact/hooks';
import htm from 'htm';
import type { TargetedEvent } from 'preact/compat';
import { RestorationSettings, CommonSettingsPanelProps } from '../../types';
import { MicIcon } from '../../components';

const html = htm.bind(h);

interface RestorationSettingsPanelProps extends CommonSettingsPanelProps {
    settings: RestorationSettings;
    setSettings: (updater: (s: RestorationSettings) => RestorationSettings) => void;
}

export const RestorationSettingsPanel: FunctionalComponent<RestorationSettingsPanelProps> = ({ settings, setSettings, onGenerate, generating, hasImage, buttonText }) => {
    const [isRecording, setIsRecording] = useState(false);

    const handleVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Xin lỗi, trình duyệt của bạn không hỗ trợ nhập liệu bằng giọng nói.");
            return;
        }
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'vi-VN';

        recognition.onstart = () => setIsRecording(true);
        recognition.onend = () => setIsRecording(false);
        recognition.onerror = (e: any) => console.error("Speech Recognition Error:", e);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setSettings(s => ({...s, customPrompt: s.customPrompt ? `${s.customPrompt} ${transcript}` : transcript}));
        };

        if (isRecording) {
            recognition.stop();
        } else {
            recognition.start();
        }
    };

    return html`
        <div class="settings-panel">
            <div class="form-group">
                <label>Phông nền</label>
                <div class="radio-group">
                    <label>
                        <input type="radio" name="bg-restore" value="original" checked=${settings.backgroundOption === 'original'} onChange=${(e: TargetedEvent<HTMLInputElement>) => setSettings(s => ({...s, backgroundOption: e.currentTarget.value as RestorationSettings['backgroundOption']}))} />
                        Giữ nguyên
                    </label>
                    <label>
                        <input type="radio" name="bg-restore" value="white" checked=${settings.backgroundOption === 'white'} onChange=${(e: TargetedEvent<HTMLInputElement>) => setSettings(s => ({...s, backgroundOption: e.currentTarget.value as RestorationSettings['backgroundOption']}))} />
                        Trắng
                    </label>
                    <label>
                        <input type="radio" name="bg-restore" value="blue" checked=${settings.backgroundOption === 'blue'} onChange=${(e: TargetedEvent<HTMLInputElement>) => setSettings(s => ({...s, backgroundOption: e.currentTarget.value as RestorationSettings['backgroundOption']}))} />
                        Xanh
                    </label>
                </div>
            </div>

            <div class="form-group checkbox-group">
                <label><input type="checkbox" checked=${settings.preserveFace} onChange=${(e: TargetedEvent<HTMLInputElement>) => setSettings(s => ({...s, preserveFace: e.currentTarget.checked}))}/> Giữ nguyên nét mặt</label>
                <label><input type="checkbox" checked=${settings.useSamplePrompt} onChange=${(e: TargetedEvent<HTMLInputElement>) => setSettings(s => ({...s, useSamplePrompt: e.currentTarget.checked}))}/> Lên màu (khuyên dùng cho ảnh đen trắng)</label>
            </div>

            <div class="form-group">
                <label for="custom-prompt-restore">Prompt tùy chỉnh</label>
                 <div class="voice-input-container">
                    <textarea 
                        id="custom-prompt-restore" 
                        placeholder="VD: Xóa vết xước ở góc phải, làm rõ chi tiết áo..."
                        value=${settings.customPrompt}
                        onInput=${(e: TargetedEvent<HTMLTextAreaElement>) => setSettings(s => ({ ...s, customPrompt: e.currentTarget.value }))}
                    ></textarea>
                    <button class="voice-btn ${isRecording ? 'recording' : ''}" onClick=${handleVoiceInput} title="Nhập bằng giọng nói">
                        <${MicIcon} recording=${isRecording} />
                    </button>
                </div>
            </div>
            
            <button class="btn btn-primary" onClick=${onGenerate} disabled=${generating || !hasImage} style=${{width: '100%'}}>
                ${generating ? 'Đang phục chế...' : (buttonText || 'Phục chế ảnh')}
            </button>
        </div>
    `;
};
