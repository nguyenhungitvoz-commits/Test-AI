/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { h, FunctionalComponent } from 'preact';
import { useState, useMemo, useRef } from 'preact/hooks';
import htm from 'htm';
import type { TargetedEvent } from 'preact/compat';
import { TrendCreatorSettings, CommonSettingsPanelProps } from '../../types';
import { PREDEFINED_TRENDS } from '../../constants';
import { MicIcon, UploadIcon, CloseIcon } from '../../components';

const html = htm.bind(h);

interface TrendCreatorSettingsPanelProps extends CommonSettingsPanelProps {
    settings: TrendCreatorSettings;
    setSettings: (updater: (s: TrendCreatorSettings) => TrendCreatorSettings) => void;
}

export const TrendCreatorSettingsPanel: FunctionalComponent<TrendCreatorSettingsPanelProps> = ({ settings, setSettings, onGenerate, generating, hasImage: hasSubjectImage }) => {
    const subjectImageFileInputRef = useRef<HTMLInputElement>(null);
    const [isRecording, setIsRecording] = useState(false);

    const handleSubjectImageUpload = (e: TargetedEvent<HTMLInputElement>) => {
        const file = e.currentTarget.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                if (loadEvent.target) {
                    setSettings(s => ({ ...s, subjectImage: loadEvent.target!.result as string }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSelectPredefinedTrend = (trendKey: string) => {
        const newSelectedTrends = settings.selectedTrends.includes(trendKey)
            ? settings.selectedTrends.filter(k => k !== trendKey)
            : [...settings.selectedTrends, trendKey];

        const combinedPrompt = newSelectedTrends
            .map(key => PREDEFINED_TRENDS[key as keyof typeof PREDEFINED_TRENDS].prompt)
            .join('\n\n---\n\n');

        setSettings(s => ({
            ...s,
            selectedTrends: newSelectedTrends,
            prompt: combinedPrompt,
        }));
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
            setSettings(s => ({ ...s, prompt: s.prompt ? `${s.prompt} ${transcript}` : transcript }));
        };
        isRecording ? recognition.stop() : recognition.start();
    };

    const canGenerate = useMemo(() => hasSubjectImage && settings.prompt.trim() !== '', [hasSubjectImage, settings.prompt]);

    return html`
        <div class="settings-panel">
            <div class="form-group">
                <label class="uploader-label">1. Ảnh của bạn (Chủ thể)</label>
                <input type="file" ref=${subjectImageFileInputRef} onChange=${handleSubjectImageUpload} accept="image/*" style=${{ display: 'none' }} />
                <div class="reference-uploader" onClick=${() => subjectImageFileInputRef.current?.click()}>
                    ${settings.subjectImage ? html`
                        <img src=${settings.subjectImage} alt="Subject" class="reference-preview"/>
                        <button class="remove-reference-btn" onClick=${(e: MouseEvent) => { e.stopPropagation(); setSettings(s => ({ ...s, subjectImage: null })); }} title="Xóa ảnh chủ thể"><${CloseIcon}/></button>
                    ` : html`
                        <div class="reference-placeholder">
                           <${UploadIcon} />
                           <span>Nhấp để tải lên</span>
                        </div>
                    `}
                </div>
            </div>

            <div class="form-group">
                <label>2. Chọn Trend có sẵn (có thể chọn nhiều)</label>
                <div class="lighting-styles-grid">
                    ${Object.entries(PREDEFINED_TRENDS).map(([key, trend]) => html`
                        <button key=${key} onClick=${() => handleSelectPredefinedTrend(key)} class="style-button ${settings.selectedTrends.includes(key) ? 'active' : ''}">
                            ${trend.label}
                        </button>
                    `)}
                </div>
            </div>

            <div class="form-group">
                <label for="trend-prompt">3. Prompt (có thể chỉnh sửa)</label>
                <div class="voice-input-container">
                    <textarea id="trend-prompt" value=${settings.prompt} onInput=${(e: TargetedEvent<HTMLTextAreaElement>) => setSettings(s => ({ ...s, prompt: e.currentTarget.value }))} placeholder="Chọn một trend có sẵn hoặc tự viết prompt của bạn." rows="6"></textarea>
                    <button class="voice-btn ${isRecording ? 'recording' : ''}" onClick=${handleVoiceInput} title="Nhập bằng giọng nói"><${MicIcon} recording=${isRecording} /></button>
                </div>
            </div>
            
            <div class="form-group">
                <label>4. Số lượng ảnh (cho mỗi trend)</label>
                <div class="radio-group">${[1, 2, 3, 4].map(num => html`<label><input type="radio" name="numImages" value=${num} checked=${settings.numImages === num} onChange=${() => setSettings(s => ({ ...s, numImages: num }))}/> ${num}</label>`)}</div>
            </div>

            <button class="btn btn-primary" onClick=${onGenerate} disabled=${generating || !canGenerate} style=${{width: '100%'}}>
                ${generating ? 'Đang tạo...' : `Tạo ảnh`}
            </button>
        </div>
    `;
};
