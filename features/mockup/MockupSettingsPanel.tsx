/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { h, FunctionalComponent } from 'preact';
import { useMemo, useRef } from 'preact/hooks';
import htm from 'htm';
import type { TargetedEvent } from 'preact/compat';
import { MockupSettings } from '../../types';
import { UploadIcon, CloseIcon } from '../../components';

const html = htm.bind(h);

interface MockupSettingsPanelProps {
    settings: MockupSettings;
    setSettings: (updater: (s: MockupSettings) => MockupSettings) => void;
    onGenerate: () => void;
    generating: boolean;
}

export const MockupSettingsPanel: FunctionalComponent<MockupSettingsPanelProps> = ({ settings, setSettings, onGenerate, generating }) => {
    const productFileInputRef = useRef<HTMLInputElement>(null);
    const characterFileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (file: File | undefined, field: keyof MockupSettings) => {
        if (file) {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                if (loadEvent.target) {
                    setSettings(s => ({ ...s, [field]: loadEvent.target!.result as string }));
                }
            };
            reader.readAsDataURL(file);
        }
    };
    
    const canGenerate = useMemo(() => {
        return settings.productImage && (settings.characterImage || settings.characterPrompt.trim() !== '');
    }, [settings.productImage, settings.characterImage, settings.characterPrompt]);

    return html`
        <div class="settings-panel">
            <div class="form-group">
                <label class="uploader-label">Ảnh sản phẩm (Bắt buộc)</label>
                <input type="file" ref=${productFileInputRef} onChange=${(e: TargetedEvent<HTMLInputElement>) => handleImageUpload(e.currentTarget.files?.[0], 'productImage')} accept="image/*" style=${{ display: 'none' }} />
                <div class="reference-uploader" onClick=${() => productFileInputRef.current?.click()}>
                    ${settings.productImage ? html`
                        <img src=${settings.productImage} alt="Product" class="reference-preview"/>
                        <button class="remove-reference-btn" onClick=${(e: MouseEvent) => { e.stopPropagation(); setSettings(s => ({ ...s, productImage: null })); }} title="Xóa ảnh sản phẩm"><${CloseIcon}/></button>
                    ` : html`
                        <div class="reference-placeholder">
                           <${UploadIcon} />
                           <span>Nhấp để tải lên</span>
                        </div>
                    `}
                </div>
            </div>

             <div class="form-group">
                <label class="uploader-label">Ảnh nhân vật (Tùy chọn)</label>
                <input type="file" ref=${characterFileInputRef} onChange=${(e: TargetedEvent<HTMLInputElement>) => handleImageUpload(e.currentTarget.files?.[0], 'characterImage')} accept="image/*" style=${{ display: 'none' }} />
                <div class="reference-uploader" onClick=${() => characterFileInputRef.current?.click()}>
                    ${settings.characterImage ? html`
                        <img src=${settings.characterImage} alt="Character" class="reference-preview"/>
                        <button class="remove-reference-btn" onClick=${(e: MouseEvent) => { e.stopPropagation(); setSettings(s => ({ ...s, characterImage: null })); }} title="Xóa ảnh nhân vật"><${CloseIcon}/></button>
                    ` : html`
                        <div class="reference-placeholder">
                           <${UploadIcon} />
                           <span>Nhấp để tải lên</span>
                        </div>
                    `}
                </div>
            </div>

            <div class="form-group">
                <label for="character-prompt">Mô tả nhân vật (nếu không tải ảnh)</label>
                <textarea 
                    id="character-prompt" 
                    placeholder="VD: một người phụ nữ châu Á, tóc dài, đang mỉm cười..."
                    value=${settings.characterPrompt}
                    onInput=${(e: TargetedEvent<HTMLTextAreaElement>) => setSettings(s => ({ ...s, characterPrompt: e.currentTarget.value }))}
                    disabled=${!!settings.characterImage}
                ></textarea>
            </div>

            <div class="form-group">
                <label for="scene-prompt">Mô tả bối cảnh & Tư thế</label>
                <textarea 
                    id="scene-prompt" 
                    placeholder="VD: đứng trong một quán cafe hiện đại, ánh sáng tự nhiên, cầm sản phẩm bằng hai tay..."
                    value=${settings.scenePrompt}
                    onInput=${(e: TargetedEvent<HTMLTextAreaElement>) => setSettings(s => ({ ...s, scenePrompt: e.currentTarget.value }))}
                ></textarea>
            </div>
            
            <button class="btn btn-primary" onClick=${onGenerate} disabled=${generating || !canGenerate} style=${{width: '100%'}}>
                ${generating ? 'Đang tạo mockup...' : 'Tạo ảnh'}
            </button>
        </div>
    `;
};
