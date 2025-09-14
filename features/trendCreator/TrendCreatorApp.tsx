/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { h, FunctionalComponent } from 'preact';
import { useState } from 'preact/hooks';
import htm from 'htm';

import { TrendCreatorSettings } from '../../types';
import { PREDEFINED_TRENDS } from '../../constants';
import { Loader, ImageUploader, DownloadIcon, Lightbox } from '../../components';
import { TrendCreatorSettingsPanel } from './TrendCreatorSettingsPanel';
import { callGeminiAPI } from '../../api';

const html = htm.bind(h);

export const TrendCreatorApp: FunctionalComponent = () => {
    const [settings, setSettings] = useState<TrendCreatorSettings>({
        subjectImage: null,
        selectedTrends: [],
        prompt: '',
        numImages: 1,
    });
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    const handleSubjectImageUpload = (dataUrl: string) => {
        setSettings(s => ({ ...s, subjectImage: dataUrl }));
        setGeneratedImages([]);
        setSelectedImages([]);
        setError('');
    };

    const handleGenerate = async () => {
        if (!settings.subjectImage) return;
        setGenerating(true);
        setError('');

        const isUsingPredefinedOnly = settings.prompt.trim() === settings.selectedTrends
            .map(key => PREDEFINED_TRENDS[key as keyof typeof PREDEFINED_TRENDS].prompt)
            .join('\n\n---\n\n').trim() && settings.selectedTrends.length > 0;
        
        const promptsToRun: string[] = [];
        if (isUsingPredefinedOnly) {
            promptsToRun.push(...settings.selectedTrends.map(key => PREDEFINED_TRENDS[key as keyof typeof PREDEFINED_TRENDS].prompt));
        } else {
            promptsToRun.push(settings.prompt);
        }

        const allResults: string[] = [];
        for (const prompt of promptsToRun) {
            for (let i = 0; i < settings.numImages; i++) {
                try {
                    // Reusing the existing API function for image editing
                    const result = await callGeminiAPI(prompt, settings.subjectImage);
                    allResults.push(result);
                } catch (err) {
                    console.error(`Error generating trend image:`, err);
                    const message = err instanceof Error ? err.message : String(err);
                    setError(prev => prev ? `${prev}\n${message}` : message);
                }
            }
        }
        setGeneratedImages(prev => [...prev, ...allResults]);
        setGenerating(false);
    };

    const toggleSelection = (url: string) => {
        setSelectedImages(prev => prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]);
    };

    const handleImageClick = (url: string) => {
        setLightboxImage(url);
    };

    const downloadSelectedImages = () => {
        selectedImages.forEach((dataUrl, index) => {
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `trend-image-${index + 1}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    };

    const CheckboxIcon = () => html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;

    return html`
        ${lightboxImage && html`
            <${Lightbox} 
                originalUrl=${settings.subjectImage} 
                generatedUrl=${lightboxImage}
                caption="So sánh ảnh Gốc và ảnh Trend"
                onClose=${() => setLightboxImage(null)}
            />
        `}
        <div class="editor-layout">
            <${TrendCreatorSettingsPanel} settings=${settings} setSettings=${setSettings} onGenerate=${handleGenerate} generating=${generating} hasImage=${!!settings.subjectImage} />
            <div class="image-panel">
                ${generating && html`<${Loader} text="AI đang tạo ảnh trend..." />`}
                ${!settings.subjectImage ? html`
                    <${ImageUploader} onImageUpload=${handleSubjectImageUpload} />
                ` : html`
                    <div class="trend-results-container">
                        <div class="results-actions">
                            <button class="btn btn-secondary" onClick=${() => { setGeneratedImages([]); setSelectedImages([]); }} disabled=${generatedImages.length === 0}>Xóa tất cả</button>
                            <button class="btn btn-primary" onClick=${downloadSelectedImages} disabled=${selectedImages.length === 0}>
                                <${DownloadIcon} /> Tải (${selectedImages.length}) ảnh
                            </button>
                        </div>
                         ${error && html`<div class="error-message" style=${{textAlign: 'left', whiteSpace: 'pre-wrap'}}>${error}</div>`}
                        <div class="trend-grid">
                            ${generatedImages.map(url => html`
                                <div class=${`trend-item ${selectedImages.includes(url) ? 'selected' : ''}`}>
                                    <img src=${url} alt="Generated trend image" onClick=${() => handleImageClick(url)} />
                                    <div class="trend-item-checkbox" onClick=${(e: MouseEvent) => { e.stopPropagation(); toggleSelection(url); }}><${CheckboxIcon}/></div>
                                </div>
                            `)}
                        </div>
                    </div>
                `}
            </div>
        </div>
    `;
};
