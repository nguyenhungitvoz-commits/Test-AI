/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { h, FunctionalComponent } from 'preact';
import { useState, useMemo, useRef } from 'preact/hooks';
import htm from 'htm';
import type { TargetedEvent } from 'preact/compat';
import { BackgroundSettings, CommonSettingsPanelProps } from '../../types';
import { MicIcon, UploadIcon, CloseIcon } from '../../components';

const html = htm.bind(h);

interface BackgroundSettingsPanelProps extends CommonSettingsPanelProps {
    settings: BackgroundSettings;
    setSettings: (updater: (s: BackgroundSettings) => BackgroundSettings) => void;
    isBatch?: boolean;
}

export const BackgroundSettingsPanel: FunctionalComponent<BackgroundSettingsPanelProps> = ({ settings, setSettings, onGenerate, generating, hasImage, isBatch = false }) => {
    const [isRecording, setIsRecording] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            setSettings(s => ({ ...s, prompt: s.prompt ? `${s.prompt} ${transcript}` : transcript }));
        };
        isRecording ? recognition.stop() : recognition.start();
    };

    const handleReferenceImageUpload = (e: TargetedEvent<HTMLInputElement>) => {
        const file = e.currentTarget.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                if (loadEvent.target) {
                    setSettings(s => ({ ...s, referenceImage: loadEvent.target!.result as string }));
                }
            };
            reader.readAsDataURL(file);
        }
    };
    
    const canGenerate = useMemo(() => {
        return hasImage && (settings.prompt.trim() !== '' || settings.referenceImage !== null);
    }, [hasImage, settings.prompt, settings.referenceImage]);

    const lightingEffects = {
        'none': 'Mặc định',
        'left-light': 'Ngược nắng nhẹ (trái)',
        'left-strong': 'Ngược nắng mạnh (trái)',
        'right-light': 'Ngược nắng nhẹ (phải)',
        'right-strong': 'Ngược nắng mạnh (phải)',
    };
    
    return html`
        <div class="settings-panel">
            <div class="form-group">
                <label for="bg-prompt">Mô tả nền (Text)</label>
                <div class="voice-input-container">
                    <textarea 
                        id="bg-prompt" 
                        placeholder="VD: một bãi biển nhiệt đới với cát trắng và biển xanh..."
                        value=${settings.prompt}
                        onInput=${(e: TargetedEvent<HTMLTextAreaElement>) => setSettings(s => ({ ...s, prompt: e.currentTarget.value }))}
                    ></textarea>
                    <button class="voice-btn ${isRecording ? 'recording' : ''}" onClick=${handleVoiceInput} title="Nhập bằng giọng nói">
                        <${MicIcon} recording=${isRecording} />
                    </button>
                </div>
            </div>

            <div class="form-group">
                <label>Ảnh tham chiếu (Reference)</label>
                <input type="file" ref=${fileInputRef} onChange=${handleReferenceImageUpload} accept="image/*" style=${{ display: 'none' }} />
                <div class="reference-uploader" onClick=${() => fileInputRef.current?.click()}>
                    ${settings.referenceImage ? html`
                        <img src=${settings.referenceImage} alt="Reference" class="reference-preview"/>
                        <button class="remove-reference-btn" onClick=${(e: MouseEvent) => { e.stopPropagation(); setSettings(s => ({ ...s, referenceImage: null })); }} title="Xóa ảnh tham chiếu"><${CloseIcon}/></button>
                    ` : html`
                        <div class="reference-placeholder">
                           <${UploadIcon} />
                           <span>Nhấp để tải lên</span>
                        </div>
                    `}
                </div>
            </div>

            <div class="form-group">
                <label>Tùy chọn tư thế</label>
                <div class="radio-group">
                    <label>
                        <input type="radio" name="pose" value="keep" checked=${settings.poseOption === 'keep'} onChange=${(e: TargetedEvent<HTMLInputElement>) => setSettings(s => ({...s, poseOption: e.currentTarget.value as BackgroundSettings['poseOption']}))} />
                        Giữ nguyên
                    </label>
                    <label>
                        <input type="radio" name="pose" value="change" checked=${settings.poseOption === 'change'} onChange=${(e: TargetedEvent<HTMLInputElement>) => setSettings(s => ({...s, poseOption: e.currentTarget.value as BackgroundSettings['poseOption']}))} />
                        Thay đổi dáng
                    </label>
                </div>
            </div>

            <div class="form-group">
                <label>Hiệu ứng ánh sáng</label>
                <select value=${settings.lightingEffect} onChange=${(e: TargetedEvent<HTMLSelectElement>) => setSettings(s => ({ ...s, lightingEffect: e.currentTarget.value }))}>
                    ${Object.entries(lightingEffects).map(([key, value]) => html`
                        <option value=${key}>${value}</option>
                    `)}
                </select>
            </div>
            
            ${!isBatch && html`
                <div class="form-group">
                    <label>Số lượng ảnh tạo</label>
                    <input type="number" min="1" max="3" class="number-input" value=${settings.numImages} onInput=${(e: TargetedEvent<HTMLInputElement>) => setSettings(s => ({ ...s, numImages: Math.max(1, Math.min(3, parseInt(e.currentTarget.value, 10))) }))} />
                </div>
            `}

            <button class="btn btn-primary" onClick=${onGenerate} disabled=${generating || !canGenerate} style=${{width: '100%'}}>
                ${generating ? 'Đang thay đổi...' : 'Tạo ảnh'}
            </button>
        </div>
    `;
};
