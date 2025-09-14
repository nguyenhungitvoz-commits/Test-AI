/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { h, FunctionalComponent } from 'preact';
import { useState } from 'preact/hooks';
import htm from 'htm';

import { LightingSettings } from '../../types';
import { LIGHTING_STYLES } from '../../constants';
import { Loader, ImageUploader, ImageComparator, DownloadIcon } from '../../components';
import { LightingSettingsPanel } from './LightingSettingsPanel';
import { changeImageLighting } from '../../api';

const html = htm.bind(h);

export const LightingEditor: FunctionalComponent = () => {
    type GeneratedImage = { name: string, url: string };
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [selectedGeneratedImage, setSelectedGeneratedImage] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [settings, setSettings] = useState<LightingSettings>({
        selectedStyles: [],
        customPrompt: '',
    });

    const handleGenerate = async () => {
        if (!originalImage) return;
        setGenerating(true);
        setError('');
        setGeneratedImages([]);
        setSelectedGeneratedImage(null);

        const stylesToGenerate = LIGHTING_STYLES.filter(s => settings.selectedStyles.includes(s.name));
        if (settings.customPrompt.trim()) {
            stylesToGenerate.push({ name: 'Tùy chỉnh', prompt: settings.customPrompt.trim() });
        }

        if (stylesToGenerate.length === 0) {
            setError("Vui lòng chọn ít nhất một kiểu ánh sáng hoặc nhập mô tả tùy chỉnh.");
            setGenerating(false);
            return;
        }

        const results: ({ name: string, url: string } | null)[] = [];
        for (const style of stylesToGenerate) {
            try {
                const url = await changeImageLighting(originalImage, style.prompt);
                results.push({ name: style.name, url });
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                setError(prev => prev ? `${prev}\nLỗi ${style.name}: ${message}` : `Lỗi ${style.name}: ${message}`);
                console.error(`Lỗi khi tạo ánh sáng cho ${style.name}:`, err);
                results.push(null); // Keep track of failures
            }
        }

        const successfulResults = results.filter((r): r is GeneratedImage => r !== null);
        
        setGeneratedImages(successfulResults);
        if (successfulResults.length > 0) {
            setSelectedGeneratedImage(successfulResults[0].url);
        } else if (!error) {
            setError("Bạn cần nhập API Key tại tab Cài đặt trước khi sử dụng tính năng này.");
        }
        
        setGenerating(false);
    };

    const downloadImage = (dataUrl: string | null, filename: string) => {
        if (!dataUrl) return;
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleUpload = (image: string | null) => {
        setOriginalImage(image);
        setGeneratedImages([]);
        setSelectedGeneratedImage(null);
        setError('');
    }

    return html`
        <div class="editor-layout">
            <${LightingSettingsPanel} settings=${settings} setSettings=${setSettings} onGenerate=${handleGenerate} generating=${generating} hasImage=${!!originalImage} />
            <div class="image-panel">
                ${generating && html`<${Loader} text="AI đang tái tạo ánh sáng..." />`}
                ${!originalImage ? html`
                    <${ImageUploader} onImageUpload=${handleUpload} />
                ` : html`
                    <${ImageComparator} original=${originalImage} generated=${selectedGeneratedImage} />
                    ${generatedImages.length > 0 && html`
                        <div class="thumbnail-gallery">
                            ${generatedImages.map(img => html`
                                <div class="thumbnail-item">
                                    <img 
                                        src=${img.url} 
                                        alt=${img.name} 
                                        class=${selectedGeneratedImage === img.url ? 'active' : ''}
                                        onClick=${() => setSelectedGeneratedImage(img.url)}
                                    />
                                    <span class="thumbnail-label">${img.name}</span>
                                </div>
                            `)}
                        </div>
                    `}
                    ${error && html`<div class="error-message" style=${{textAlign: 'left', whiteSpace: 'pre-wrap'}}>${error}</div>`}
                    <div class="actions">
                        <button class="btn btn-secondary" onClick=${() => handleUpload(null)}>Chọn ảnh khác</button>
                        <button class="btn btn-primary" onClick=${() => downloadImage(selectedGeneratedImage, 'relit-photo.png')} disabled=${!selectedGeneratedImage}>
                            <${DownloadIcon} /> Tải ảnh
                        </button>
                    </div>
                `}
            </div>
        </div>
    `;
};
