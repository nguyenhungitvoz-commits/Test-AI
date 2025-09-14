/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { h, FunctionalComponent } from 'preact';
import { useState } from 'preact/hooks';
import htm from 'htm';

import { SymmetrySettings } from '../../types';
import { Loader, ImageUploader, ImageComparator, DownloadIcon } from '../../components';
import { SymmetrySettingsPanel } from './SymmetrySettingsPanel';
import { correctFacialSymmetry } from '../../api';

const html = htm.bind(h);

export const FacialSymmetryEditor: FunctionalComponent = () => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    
    const createDefaultAdjustments = () => ({
        enabled: false,
        intensity: 50,
    });

    const [settings, setSettings] = useState<SymmetrySettings>({
        adjustments: {
            smoothHair: createDefaultAdjustments(),
            balanceEyes: createDefaultAdjustments(),
            equalizeEyeSize: createDefaultAdjustments(),
            correctEyeGaze: createDefaultAdjustments(),
            narrowNose: createDefaultAdjustments(),
            straightenNose: createDefaultAdjustments(),
            liftNoseTip: createDefaultAdjustments(),
            centerMouth: createDefaultAdjustments(),
            evenTeeth: createDefaultAdjustments(),
            removeLipWrinkles: createDefaultAdjustments(),
            slimJawline: createDefaultAdjustments(),
            adjustChin: createDefaultAdjustments(),
        },
    });

    const handleGenerate = async () => {
        if (!originalImage) return;
        setGenerating(true);
        setError('');
        try {
            const result = await correctFacialSymmetry(originalImage, settings);
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

    return html`
        <div class="editor-layout">
            <${SymmetrySettingsPanel} settings=${settings} setSettings=${setSettings} onGenerate=${handleGenerate} generating=${generating} hasImage=${!!originalImage} />
            <div class="image-panel">
                ${generating && html`<${Loader} text="AI đang phân tích và chỉnh sửa..." />`}
                ${!originalImage ? html`
                    <${ImageUploader} onImageUpload=${setOriginalImage} />
                ` : html`
                    <${ImageComparator} original=${originalImage} generated=${generatedImage} />
                    ${error && html`<div class="error-message">${error}</div>`}
                    <div class="actions">
                        <button class="btn btn-secondary" onClick=${() => { setOriginalImage(null); setGeneratedImage(null); }}>Chọn ảnh khác</button>
                        <button class="btn btn-primary" onClick=${() => downloadImage(generatedImage, 'symmetric-photo.png')} disabled=${!generatedImage}>
                            <${DownloadIcon} /> Tải ảnh
                        </button>
                    </div>
                `}
            </div>
        </div>
    `;
};
