/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { h, FunctionalComponent } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import htm from 'htm';
import type { TargetedEvent } from 'preact/compat';

import { ImageItem, BackgroundSettings } from '../../types';
import { Loader, ImageUploader, ImageComparator, DownloadIcon, UploadIcon, RegenerateIcon, DeleteIcon } from '../../components';
import { BackgroundSettingsPanel } from './BackgroundSettingsPanel';
import { changeBackground } from '../../api';

const html = htm.bind(h);

const BackgroundEditor: FunctionalComponent = () => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [selectedGeneratedImage, setSelectedGeneratedImage] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [settings, setSettings] = useState<BackgroundSettings>({
        prompt: '',
        referenceImage: null,
        poseOption: 'keep',
        lightingEffect: 'none',
        numImages: 1,
    });

    const handleGenerate = async () => {
        if (!originalImage) return;
        setGenerating(true);
        setError('');
        setGeneratedImages([]);
        setSelectedGeneratedImage(null);

        const results: (string | null)[] = [];
        for (let i = 0; i < settings.numImages; i++) {
            try {
                const result = await changeBackground(originalImage, settings);
                results.push(result);
            } catch (err) {
                console.error("Error generating one background:", err);
                const message = err instanceof Error ? err.message : String(err);
                setError(prev => prev ? `${prev}\nLỗi lần ${i+1}: ${message}`: `Lỗi lần ${i+1}: ${message}`);
                results.push(null);
            }
        }
        const successfulResults = results.filter((url): url is string => url !== null);

        setGeneratedImages(successfulResults);
        if (successfulResults.length > 0) {
            setSelectedGeneratedImage(successfulResults[0]);
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
    };

    return html`
        <div class="editor-layout">
            <${BackgroundSettingsPanel} settings=${settings} setSettings=${setSettings} onGenerate=${handleGenerate} generating=${generating} hasImage=${!!originalImage} />
            <div class="image-panel">
                ${generating && html`<${Loader} text="AI đang thay đổi nền..." />`}
                ${!originalImage ? html`
                    <${ImageUploader} onImageUpload=${handleUpload} />
                ` : html`
                    <${ImageComparator} original=${originalImage} generated=${selectedGeneratedImage} />
                    ${generatedImages.length > 0 && html`
                        <div class="thumbnail-gallery">
                            ${generatedImages.map((url, index) => html`
                                <div class="thumbnail-item">
                                    <img 
                                        src=${url} 
                                        alt="Generated ${index + 1}" 
                                        class=${selectedGeneratedImage === url ? 'active' : ''}
                                        onClick=${() => setSelectedGeneratedImage(url)}
                                    />
                                </div>
                            `)}
                        </div>
                    `}
                    ${error && html`<div class="error-message" style=${{textAlign: 'left', whiteSpace: 'pre-wrap'}}>${error}</div>`}
                    <div class="actions">
                        <button class="btn btn-secondary" onClick=${() => handleUpload(null)}>Chọn ảnh khác</button>
                        <button class="btn btn-primary" onClick=${() => downloadImage(selectedGeneratedImage, 'background-changed.png')} disabled=${!selectedGeneratedImage}>
                            <${DownloadIcon} /> Tải ảnh
                        </button>
                    </div>
                `}
            </div>
        </div>
    `;
};

const BatchBackgroundEditor: FunctionalComponent = () => {
    const [images, setImages] = useState<ImageItem[]>([]);
    const [settings, setSettings] = useState<Omit<BackgroundSettings, 'numImages'>>({
        prompt: '',
        referenceImage: null,
        poseOption: 'keep',
        lightingEffect: 'none',
    });
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');

    const handleFileChange = (e: TargetedEvent<HTMLInputElement>) => {
        if (!e.currentTarget.files) return;
        const newImages: ImageItem[] = Array.from(e.currentTarget.files).map(file => ({
            id: Date.now() + Math.random(), file, original: URL.createObjectURL(file), generated: null, status: 'pending'
        }));
        setImages(current => [...current, ...newImages]);
    };
    
    const readFileAsDataURL = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const processQueue = async (tasks: ImageItem[], concurrency: number, processFn: (task: ImageItem) => Promise<void>) => {
        let completed = 0;
        const queue = [...tasks];
        const worker = async () => {
            while(queue.length > 0) {
                const task = queue.shift();
                if (task) {
                    await processFn(task);
                    completed++;
                    setProgress(Math.round((completed / tasks.length) * 100));
                    if (queue.length > 0) {
                        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before the next call
                    }
                }
            }
        };
        await Promise.all(Array(concurrency).fill(null).map(() => worker()));
    };

    const handleBatchGenerate = async () => {
        setProcessing(true);
        setProgress(0);
        setError('');
        const tasks = images.filter(img => img.status === 'pending' || img.status === 'error');
        
        const processTask = async (img: ImageItem) => {
            setImages(current => current.map(i => i.id === img.id ? { ...i, status: 'processing' } : i));
            try {
                const originalDataUrl = await readFileAsDataURL(img.file);
                const result = await changeBackground(originalDataUrl, settings);
                setImages(current => current.map(i => i.id === img.id ? { ...i, generated: result, status: 'done' } : i));
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                setError(message);
                console.error(`Error processing image ${img.id}:`, err);
                setImages(current => current.map(i => i.id === img.id ? { ...i, status: 'error' } : i));
                throw err;
            }
        };
        
        try {
            await processQueue(tasks, 1, processTask);
        } catch (e) {
            console.error("Batch processing stopped due to an error.", e);
        } finally {
            setProcessing(false);
        }
    };
    
    const regenerateImage = async (id: number) => {
        const imageToRegen = images.find(i => i.id === id);
        if (!imageToRegen) return;
        setError('');
        setImages(current => current.map(i => i.id === id ? { ...i, status: 'processing' } : i));
        try {
            const originalDataUrl = await readFileAsDataURL(imageToRegen.file);
            const result = await changeBackground(originalDataUrl, settings);
            setImages(current => current.map(i => i.id === id ? { ...i, generated: result, status: 'done' } : i));
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            setImages(current => current.map(i => i.id === id ? { ...i, status: 'error' } : i));
        }
    };
    
    const deleteImage = (id: number) => setImages(current => current.filter(i => i.id !== id));
    
    const handleDownloadAll = () => {
        images.forEach((img, index) => {
            if(img.generated) {
                const link = document.createElement('a');
                link.href = img.generated;
                link.download = `background-changed-${index + 1}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        });
    };
    
    const pendingCount = useMemo(() => images.filter(img => img.status === 'pending' || img.status === 'error').length, [images]);
    const buttonText = pendingCount > 0 ? `Thay nền ${pendingCount} ảnh` : 'Thay nền';

    return html`
        <div class="batch-editor-layout">
            <${BackgroundSettingsPanel} 
                settings=${{...settings, numImages: 1}} 
                setSettings=${(updater) => setSettings(s => updater({...s, numImages: 1}))}
                onGenerate=${handleBatchGenerate} 
                generating=${processing} 
                hasImage=${pendingCount > 0} 
                buttonText=${buttonText} 
                isBatch=${true} 
            />
            <div class="actions" style=${{ marginTop: '2rem', justifyContent: 'space-between'}}>
                <button class="btn btn-secondary" onClick=${() => document.getElementById('batch-bg-file-input')?.click()}>
                     <${UploadIcon} /> Thêm ảnh
                </button>
                <input type="file" id="batch-bg-file-input" multiple accept="image/*" style=${{display: 'none'}} onChange=${handleFileChange} />
                <button class="btn btn-primary" onClick=${handleDownloadAll} disabled=${images.every(img => !img.generated)}>
                    <${DownloadIcon} /> Tải tất cả
                </button>
            </div>
            
            ${processing && html`
                <div class="progress-bar">
                    <div class="progress-bar-inner" style=${{ width: `${progress}%` }}></div>
                    <span class="progress-label">${progress}%</span>
                </div>
            `}
            
            ${error && html`<div class="error-message" style=${{marginTop: '1rem'}}>${error}</div>`}

            <div class="batch-grid">
                ${images.map(img => html`
                    <div class="batch-item">
                        <div class="image-comparator" style=${{ display: 'block' }}>
                            <div class="image-container">
                                <img src=${img.generated || img.original} />
                                ${img.status === 'processing' && html`<${Loader} text="Đang xử lý..." />`}
                                ${img.status === 'error' && html`<div class="error-badge">Lỗi</div>`}
                            </div>
                        </div>
                        <div class="batch-item-actions">
                            <button class="batch-item-btn" title="Tạo lại" onClick=${() => regenerateImage(img.id)}><${RegenerateIcon} /></button>
                            <button class="batch-item-btn" title="Xóa" onClick=${() => deleteImage(img.id)}><${DeleteIcon} /></button>
                        </div>
                    </div>
                `)}
            </div>
        </div>
    `;
};

export const BackgroundApp: FunctionalComponent = () => {
    const [activeTab, setActiveTab] = useState('single');
    return html`
         <div>
            <div class="tabs">
                <button class="tab ${activeTab === 'single' ? 'active' : ''}" onClick=${() => setActiveTab('single')}>Thay nền đơn</button>
                <button class="tab ${activeTab === 'batch' ? 'active' : ''}" onClick=${() => setActiveTab('batch')}>Thay nền hàng loạt</button>
            </div>
            ${activeTab === 'single' ? html`<${BackgroundEditor} />` : html`<${BatchBackgroundEditor} />`}
        </div>
    `;
}
