/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { h, FunctionalComponent } from 'preact';
import { useState } from 'preact/hooks';
import htm from 'htm';

import { MockupSettings } from '../../types';
import { Loader, ImageComparator, DownloadIcon } from '../../components';
import { MockupSettingsPanel } from './MockupSettingsPanel';
import { createProductMockup } from '../../api';

const html = htm.bind(h);

const MockupEditor: FunctionalComponent = () => {
    const [settings, setSettings] = useState<MockupSettings>({
        productImage: null,
        characterImage: null,
        characterPrompt: '',
        scenePrompt: '',
    });
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!settings.productImage) return;
        setGenerating(true);
        setError('');
        try {
            const result = await createProductMockup(settings);
            setGeneratedImage(result);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError(String(err));
            }
        } finally {
            setGenerating(false);
        }
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
    
    const handleReset = () => {
        setSettings({
            productImage: null,
            characterImage: null,
            characterPrompt: '',
            scenePrompt: '',
        });
        setGeneratedImage(null);
        setError('');
    };

    return html`
        <div class="editor-layout">
            <${MockupSettingsPanel} settings=${settings} setSettings=${setSettings} onGenerate=${handleGenerate} generating=${generating} />
            <div class="image-panel">
                ${generating && html`<${Loader} text="AI đang tạo mockup sản phẩm..." />`}
                ${!settings.productImage ? html`
                    <div class="upload-placeholder" style=${{textAlign: 'center', padding: '2rem'}}>
                        <p>Vui lòng tải lên ảnh sản phẩm để bắt đầu.</p>
                    </div>
                ` : html`
                    <${ImageComparator} original=${settings.productImage} generated=${generatedImage} />
                    ${error && html`<div class="error-message">${error}</div>`}
                    <div class="actions">
                        <button class="btn btn-secondary" onClick=${handleReset}>Tạo mockup mới</button>
                        <button class="btn btn-primary" onClick=${() => downloadImage(generatedImage, 'product-mockup.png')} disabled=${!generatedImage}>
                            <${DownloadIcon} /> Tải ảnh
                        </button>
                    </div>
                `}
            </div>
        </div>
    `;
};

export const MockupApp: FunctionalComponent = () => {
    return html`<${MockupEditor} />`;
}
