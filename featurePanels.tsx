/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { h, FunctionalComponent } from 'preact';
import { useState, useMemo, useRef } from 'preact/hooks';
import htm from 'htm';
import type { TargetedEvent } from 'preact/compat';
import { 
    IdPhotoSettings,
    RestorationSettings,
    SymmetrySettings,
    LightingSettings,
    BackgroundSettings,
    MockupSettings,
    CommonSettingsPanelProps,
    SymmetryAdjustment,
    TrendCreatorSettings,
} from './types';
import { CLOTHING_OPTIONS, LIGHTING_STYLES, PREDEFINED_TRENDS } from './constants';
import { MicIcon, UploadIcon, CloseIcon } from './components';

const html = htm.bind(h);

interface IdPhotoSettingsPanelProps extends CommonSettingsPanelProps {
    settings: IdPhotoSettings;
    setSettings: (updater: (s: IdPhotoSettings) => IdPhotoSettings) => void;
}

export const IdPhotoSettingsPanel: FunctionalComponent<IdPhotoSettingsPanelProps> = ({ settings, setSettings, onGenerate, generating, hasImage, buttonText }) => {
    const [isRecording, setIsRecording] = useState(false);

    const handleClothingChange = (e: TargetedEvent<HTMLSelectElement>) => {
        setSettings(s => ({ ...s, clothingSelection: e.currentTarget.value }));
    };

    const handleVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Sorry, your browser doesn't support voice input.");
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
    
    const hairStyleOptions = {
        'auto': 'Tự động',
        'front': 'Thả trước',
        'back': 'Vuốt sau',
        'original': 'Giữ nguyên'
    };
    
    return html`
        <div class="settings-panel">
            <div class="form-group">
                <label>Nền</label>
                <div class="radio-group-bg">
                    <label>
                        <input type="radio" name="bg" value="white" checked=${settings.background === 'white'} onChange=${(e: TargetedEvent<HTMLInputElement>) => setSettings(s => ({...s, background: e.currentTarget.value}))} />
                        Trắng
                    </label>
                    <label>
                        <input type="radio" name="bg" value="blue" checked=${settings.background === 'blue'} onChange=${(e: TargetedEvent<HTMLInputElement>) => setSettings(s => ({...s, background: e.currentTarget.value}))} />
                        Xanh nhạt
                    </label>
                    <label class="custom-color-label">
                        <input type="radio" name="bg" value="custom" checked=${!['white', 'blue'].includes(settings.background)} onChange=${() => setSettings(s => ({...s, background: '#cccccc'}))} />
                        Tùy chỉnh
                        <input 
                            type="color" 
                            class="color-picker"
                            value=${!['white', 'blue'].includes(settings.background) ? settings.background : '#cccccc'}
                            onInput=${(e: TargetedEvent<HTMLInputElement>) => setSettings(s => ({...s, background: e.currentTarget.value}))}
                        />
                    </label>
                </div>
            </div>

            <div class="form-group">
                <label>Trang phục</label>
                <div class="radio-group">
                    <label>
                        <input type="radio" name="clothing-mode" checked=${!settings.isCustomClothing} onChange=${() => setSettings(s => ({...s, isCustomClothing: false}))} />
                        Có sẵn
                    </label>
                    <label>
                        <input type="radio" name="clothing-mode" checked=${settings.isCustomClothing} onChange=${() => setSettings(s => ({...s, isCustomClothing: true}))} />
                        Tùy chỉnh
                    </label>
                </div>
            </div>

            ${!settings.isCustomClothing ? html`
                <div class="form-group">
                    <select id="clothing" value=${settings.clothingSelection} onChange=${handleClothingChange}>
                        ${Object.entries(CLOTHING_OPTIONS).map(([group, options]) => html`
                            <optgroup label=${group}>
                                ${options.map(opt => html`
                                    <option value=${opt.prompt}>${opt.name}</option>
                                `)}
                            </optgroup>
                        `)}
                    </select>
                </div>
            ` : html`
                <div class="form-group">
                     <textarea 
                        id="custom-clothing-prompt" 
                        placeholder="VD: một chiếc áo len cổ lọ màu be..."
                        value=${settings.customClothingPrompt}
                        onInput=${(e: TargetedEvent<HTMLTextAreaElement>) => setSettings(s => ({ ...s, customClothingPrompt: e.currentTarget.value }))}
                    ></textarea>
                </div>
            `}

            <div class="form-group">
                <label for="custom-prompt">Tùy chỉnh khác (kính, etc.)</label>
                 <div class="voice-input-container">
                    <textarea 
                        id="custom-prompt" 
                        placeholder="VD: đeo kính gọng đen..."
                        value=${settings.customPrompt}
                        onInput=${(e: TargetedEvent<HTMLTextAreaElement>) => setSettings(s => ({ ...s, customPrompt: e.currentTarget.value }))}
                    ></textarea>
                    <button class="voice-btn ${isRecording ? 'recording' : ''}" onClick=${handleVoiceInput} title="Nhập bằng giọng nói">
                        <${MicIcon} recording=${isRecording} />
                    </button>
                </div>
            </div>
             <div class="form-group">
                <label>Kiểu tóc</label>
                <div class="radio-group">
                   ${Object.entries(hairStyleOptions).map(([style, label]) => html`
                    <label>
                        <input type="radio" name="hairstyle" value=${style} checked=${settings.hairStyle === style} onChange=${() => setSettings(s => ({...s, hairStyle: style}))} />
                        ${label}
                    </label>
                   `)}
                </div>
            </div>
            <div class="form-group checkbox-group">
                <label><input type="checkbox" checked=${settings.preserveFace} onChange=${(e: TargetedEvent<HTMLInputElement>) => setSettings(s => ({...s, preserveFace: e.currentTarget.checked}))}/> Giữ nét mặt gốc</label>
                <label><input type="checkbox" checked=${settings.smoothSkin} onChange=${(e: TargetedEvent<HTMLInputElement>) => setSettings(s => ({...s, smoothSkin: e.currentTarget.checked}))}/> Làm mịn da</label>
                <label><input type="checkbox" checked=${settings.slightSmile} onChange=${(e: TargetedEvent<HTMLInputElement>) => setSettings(s => ({...s, slightSmile: e.currentTarget.checked}))}/> Cười nhẹ</label>
            </div>
            <button class="btn btn-primary" onClick=${onGenerate} disabled=${generating || !hasImage} style=${{width: '100%'}}>
                ${generating ? 'Đang xử lý...' : (buttonText || 'Tạo ảnh')}
            </button>
        </div>
    `;
};

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

interface SymmetrySettingsPanelProps extends CommonSettingsPanelProps {
    settings: SymmetrySettings;
    setSettings: (updater: (s: SymmetrySettings) => SymmetrySettings) => void;
}

export const SymmetrySettingsPanel: FunctionalComponent<SymmetrySettingsPanelProps> = ({ settings, setSettings, onGenerate, generating, hasImage }) => {
    const handleAdjustmentChange = (key: string, property: keyof SymmetryAdjustment, value: boolean | number) => {
        setSettings(s => ({
            ...s,
            adjustments: {
                ...s.adjustments,
                [key]: {
                    ...s.adjustments[key],
                    [property]: value,
                },
            },
        }));
    };

    const adjustmentGroups: Record<string, Record<string, string>> = {
        'Tóc': {
            smoothHair: 'Làm mượt tóc',
        },
        'Mắt': {
            balanceEyes: 'Cân đối khoảng cách',
            equalizeEyeSize: 'Cân chỉnh to/nhỏ',
            correctEyeGaze: 'Chỉnh lé/sụp mí',
        },
        'Mũi': {
            narrowNose: 'Thu nhỏ cánh mũi',
            straightenNose: 'Kéo thẳng sống mũi',
            liftNoseTip: 'Nâng nhẹ đầu mũi',
        },
        'Miệng & Răng': {
            centerMouth: 'Chỉnh miệng ngay ngắn',
            evenTeeth: 'Sửa răng & che lợi',
            removeLipWrinkles: 'Chỉnh hết nhăn môi',
        },
        'Cằm & Hàm': {
            slimJawline: 'Thon gọn viền hàm',
            adjustChin: 'Chỉnh cằm V-line',
        },
    };

    return html`
        <div class="settings-panel">
            ${Object.entries(adjustmentGroups).map(([groupName, adjustments]) => html`
                <fieldset class="fieldset-group">
                    <legend>${groupName}</legend>
                    <div class="checkbox-grid">
                        ${Object.entries(adjustments).map(([key, label]) => {
                            const current = settings.adjustments[key];
                            return html`
                                <div class="adjustment-control">
                                    <label>
                                        <input 
                                            type="checkbox" 
                                            checked=${current.enabled} 
                                            onChange=${(e: TargetedEvent<HTMLInputElement>) => handleAdjustmentChange(key, 'enabled', e.currentTarget.checked)} 
                                        />
                                        ${label}
                                    </label>
                                    <input 
                                        type="range"
                                        min="1"
                                        max="100"
                                        value=${current.intensity}
                                        disabled=${!current.enabled}
                                        onInput=${(e: TargetedEvent<HTMLInputElement>) => handleAdjustmentChange(key, 'intensity', parseInt(e.currentTarget.value, 10))}
                                    />
                                </div>
                            `;
                        })}
                    </div>
                </fieldset>
            `)}
            
            <button class="btn btn-primary" onClick=${onGenerate} disabled=${generating || !hasImage} style=${{width: '100%'}}>
                ${generating ? 'Đang chỉnh sửa...' : 'Thực hiện'}
            </button>
        </div>
    `;
};

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