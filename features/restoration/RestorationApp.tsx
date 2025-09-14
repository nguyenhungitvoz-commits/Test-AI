/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { h, FunctionalComponent } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import htm from 'htm';
import type { TargetedEvent } from 'preact/compat';

import { ImageItem, RestorationSettings } from '../../types';
import { Loader, ImageUploader, ImageComparator, DownloadIcon, UploadIcon, RegenerateIcon, DeleteIcon } from '../../components';
import { RestorationSettingsPanel } from './RestorationSettingsPanel';
import { restoreImage } from '../../api';

const html = htm.bind(h);

const ImageRestorationEditor: FunctionalComponent = () => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [settings, setSettings] = useState<RestorationSettings>({
        preserveFace: true,
        useSamplePrompt: false,
        backgroundOption: 'original',
        customPrompt: '',
    });

    const handleGenerate = async () => {
        if (!originalImage) return;
        setGenerating(true);
        setError('');
        try {
            const result = await restoreImage(originalImage, settings);
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
            <${RestorationSettingsPanel} settings=${settings} setSettings=${setSettings} onGenerate=${handleGenerate} generating=${generating} hasImage=${!!originalImage} buttonText="Phục chế ảnh" />
            <div class="image-panel">
                ${generating && html`<${Loader} text="AI đang phục chế ảnh của bạn..." />`}
                ${!originalImage ? html`
                    <${ImageUploader} onImageUpload=${setOriginalImage} />
                ` : html`
                    <${ImageComparator} original=${originalImage} generated=${generatedImage} />
                    ${error && html`<div class="error-message">${error}</div>`}
                    <div class="actions">
                        <button class="btn btn-secondary" onClick=${() => { setOriginalImage(null); setGeneratedImage(null); }}>Chọn ảnh khác</button>
                        <button class="btn btn-primary" onClick=${() => downloadImage(generatedImage, 'restored-photo.png')} disabled=${!generatedImage}>
                            <${DownloadIcon} /> Tải ảnh
                        </button>
                    </div>
                `}
            </div>
        </div>
    `;
};

const BatchImageRestorationEditor: FunctionalComponent = () => {
    const [images, setImages] = useState<ImageItem[]>([]);
    const [settings, setSettings] = useState<RestorationSettings>({
        preserveFace: true,
        useSamplePrompt: false,
        backgroundOption: 'original',
        customPrompt: '',
    });
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');

    const handleFileChange = (e: TargetedEvent<HTMLInputElement>) => {
        if (!e.currentTarget.files) return;
        const files = Array.from(e.currentTarget.files);
        const newImages: ImageItem[] = files.map(file => ({
            id: Date.now() + Math.random(),
            file: file,
            original: URL.createObjectURL(file),
            generated: null,
            status: 'pending'
        }));
        setImages(current => [...current, ...newImages]);
    };
    
    const readFileAsDataURL = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

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
        }
        
        const workers = Array(concurrency).fill(null).map(() => worker());
        await Promise.all(workers);
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
                const result = await restoreImage(originalDataUrl, settings);
                setImages(current => current.map(i => i.id === img.id ? { ...i, generated: result, status: 'done' } : i));
            } catch (err) {
                 if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError(String(err));
                }
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

        setImages(current => current.map(i => i.id === id ? { ...i, status: 'processing' } : i));
        setError('');
        try {
            const originalDataUrl = await readFileAsDataURL(imageToRegen.file);
            const result = await restoreImage(originalDataUrl, settings);
            setImages(current => current.map(i => i.id === id ? { ...i, generated: result, status: 'done' } : i));
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError(String(err));
            }
            setImages(current => current.map(i => i.id === id ? { ...i, status: 'error' } : i));
        }
    };
    
    const deleteImage = (id: number) => {
        setImages(current => current.filter(i => i.id !== id));
    }
    
    const handleDownloadAll = () => {
        images.forEach((img, index) => {
            if(img.generated) {
                const link = document.createElement('a');
                link.href = img.generated;
                link.download = `restored-${index + 1}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        });
    };
    
    const pendingCount = useMemo(() => images.filter(img => img.status === 'pending' || img.status === 'error').length, [images]);
    const buttonText = pendingCount > 0 ? `Phục chế ${pendingCount} ảnh` : 'Phục chế ảnh';

    return html`
        <div class="batch-editor-layout">
             <${RestorationSettingsPanel} settings=${settings} setSettings=${setSettings} onGenerate=${handleBatchGenerate} generating=${processing} hasImage=${pendingCount > 0} buttonText=${buttonText} />
            <div class="actions" style=${{ marginTop: '2rem', justifyContent: 'space-between'}}>
                 <button class="btn btn-secondary" onClick=${() => document.getElementById('batch-restore-file-input')?.click()}>
                     <${UploadIcon} /> Thêm ảnh
                </button>
                 <input type="file" id="batch-restore-file-input" multiple accept="image/*" style=${{display: 'none'}} onChange=${handleFileChange} />
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
                            <button class="batch-item-btn" title="Phục chế lại" onClick=${() => regenerateImage(img.id)}><${RegenerateIcon} /></button>
                            <button class="batch-item-btn" title="Xóa" onClick=${() => deleteImage(img.id)}><${DeleteIcon} /></button>
                        </div>
                    </div>
                `)}
            </div>
        </div>
    `;
};

export const RestorationApp: FunctionalComponent = () => {
    const [activeTab, setActiveTab] = useState('single');
    return html`
         <div>
            <div class="tabs">
                <button class="tab ${activeTab === 'single' ? 'active' : ''}" onClick=${() => setActiveTab('single')}>Phục chế đơn</button>
                <button class="tab ${activeTab === 'batch' ? 'active' : ''}" onClick=${() => setActiveTab('batch')}>Phục chế hàng loạt</button>
            </div>
            ${activeTab === 'single' ? html`<${ImageRestorationEditor} />` : html`<${BatchImageRestorationEditor} />`}
        </div>
    `;
}
