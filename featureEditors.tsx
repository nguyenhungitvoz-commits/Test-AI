/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { h, FunctionalComponent } from 'preact';
import { useState, useMemo, useRef, useEffect } from 'preact/hooks';
import htm from 'htm';
import type { TargetedEvent } from 'preact/compat';

import {
    ImageItem,
    IdPhotoSettings,
    RestorationSettings,
    SymmetrySettings,
    LightingSettings,
    BackgroundSettings,
    MockupSettings,
    TrendCreatorSettings,
    Theme,
} from './types';
import { CLOTHING_OPTIONS, LIGHTING_STYLES, PREDEFINED_TRENDS } from './constants';
import {
    Loader,
    ImageUploader,
    ImageComparator,
    DownloadIcon,
    UploadIcon,
    RegenerateIcon,
    DeleteIcon,
    Lightbox,
} from './components';
import {
    IdPhotoSettingsPanel,
    RestorationSettingsPanel,
    SymmetrySettingsPanel,
    LightingSettingsPanel,
    BackgroundSettingsPanel,
    MockupSettingsPanel,
    TrendCreatorSettingsPanel,
} from './featurePanels';
import {
    generateIdPhoto,
    restoreImage,
    correctFacialSymmetry,
    changeImageLighting,
    changeBackground,
    createProductMockup,
    callGeminiAPI,
    testApiKey,
} from './api';

const html = htm.bind(h);

const IdPhotoEditor: FunctionalComponent = () => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [settings, setSettings] = useState<IdPhotoSettings>({
        background: 'white',
        clothingSelection: CLOTHING_OPTIONS["Sơ mi & Áo kiểu"][0].prompt,
        customClothingPrompt: '',
        isCustomClothing: false,
        customPrompt: '',
        preserveFace: true,
        smoothSkin: true,
        slightSmile: false,
        hairStyle: 'auto',
    });

    const handleGenerate = async () => {
        if (!originalImage) return;
        setGenerating(true);
        setError('');
        try {
            const result = await generateIdPhoto(originalImage, settings);
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
            <${IdPhotoSettingsPanel} settings=${settings} setSettings=${setSettings} onGenerate=${handleGenerate} generating=${generating} hasImage=${!!originalImage} buttonText="Tạo ảnh" />
            <div class="image-panel">
                ${generating && html`<${Loader} text="AI đang tạo ảnh thẻ của bạn..." />`}
                ${!originalImage ? html`
                    <${ImageUploader} onImageUpload=${setOriginalImage} />
                ` : html`
                    <${ImageComparator} original=${originalImage} generated=${generatedImage} />
                    ${error && html`<div class="error-message">${error}</div>`}
                    <div class="actions">
                        <button class="btn btn-secondary" onClick=${() => setOriginalImage(null)}>Chọn ảnh khác</button>
                        <button class="btn btn-primary" onClick=${() => downloadImage(generatedImage, 'id-photo.png')} disabled=${!generatedImage}>
                            <${DownloadIcon} /> Tải ảnh
                        </button>
                    </div>
                `}
            </div>
        </div>
    `;
};


const BatchIdPhotoEditor: FunctionalComponent = () => {
    const [images, setImages] = useState<ImageItem[]>([]);
    const [settings, setSettings] = useState<IdPhotoSettings>({
        background: 'white',
        clothingSelection: CLOTHING_OPTIONS["Sơ mi & Áo kiểu"][0].prompt,
        customClothingPrompt: '',
        isCustomClothing: false,
        customPrompt: '',
        preserveFace: true,
        smoothSkin: true,
        slightSmile: false,
        hairStyle: 'auto',
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
        
        const tasks = images.filter(img => img.status === 'pending');
        
        const processTask = async (img: ImageItem) => {
            setImages(current => current.map(i => i.id === img.id ? { ...i, status: 'processing' } : i));
            try {
                const originalDataUrl = await readFileAsDataURL(img.file);
                const result = await generateIdPhoto(originalDataUrl, settings);
                setImages(current => current.map(i => i.id === img.id ? { ...i, generated: result, status: 'done' } : i));
            } catch (err) {
                 if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError(String(err));
                }
                setImages(current => current.map(i => i.id === img.id ? { ...i, status: 'error' } : i));
                // Stop the entire queue on first error
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
            const result = await generateIdPhoto(originalDataUrl, settings);
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
                link.download = `id-photo-${index + 1}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        });
    };
    
    const pendingCount = useMemo(() => images.filter(img => img.status === 'pending').length, [images]);
    const buttonText = pendingCount > 0 ? `Tạo ${pendingCount} ảnh` : 'Tạo ảnh';

    return html`
        <div class="batch-editor-layout">
             <${IdPhotoSettingsPanel} settings=${settings} setSettings=${setSettings} onGenerate=${handleBatchGenerate} generating=${processing} hasImage=${pendingCount > 0} buttonText=${buttonText} />
            <div class="actions" style=${{ marginTop: '2rem', justifyContent: 'space-between'}}>
                 <button class="btn btn-secondary" onClick=${() => document.getElementById('batch-file-input')?.click()}>
                     <${UploadIcon} /> Thêm ảnh
                </button>
                 <input type="file" id="batch-file-input" multiple accept="image/*" style=${{display: 'none'}} onChange=${handleFileChange} />
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
    
    const displayImage = generatedImage || settings.productImage;

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


export const IdPhotoApp: FunctionalComponent = () => {
    const [activeTab, setActiveTab] = useState('single');
    return html`
        <div>
            <div class="tabs">
                <button class="tab ${activeTab === 'single' ? 'active' : ''}" onClick=${() => setActiveTab('single')}>Ảnh thẻ đơn</button>
                <button class="tab ${activeTab === 'batch' ? 'active' : ''}" onClick=${() => setActiveTab('batch')}>Ảnh thẻ hàng loạt</button>
            </div>
            ${activeTab === 'single' ? html`<${IdPhotoEditor} />` : html`<${BatchIdPhotoEditor} />`}
        </div>
    `;
}

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

export const MockupApp: FunctionalComponent = () => {
    return html`<${MockupEditor} />`;
}

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

const SettingsInfo: FunctionalComponent = () => html`
    <div class="settings-info">
        <div class="info-card">
            <div class="info-card-header">
                <h3>Cách hoạt động</h3>
            </div>
            <p>
                Magic Tool V1 sử dụng sức mạnh của mô hình AI Google Gemini để thực hiện các tác vụ chỉnh sửa ảnh.
            </p>
            <p>
                Để đảm bảo tính bảo mật và cho phép bạn toàn quyền kiểm soát việc sử dụng, ứng dụng yêu cầu bạn cung cấp API Key của riêng bạn. Mọi yêu cầu xử lý ảnh sẽ được thực hiện thông qua key của bạn.
            </p>
        </div>
         <div class="info-card">
            <div class="info-card-header">
                <h3>Làm thế nào để lấy API Key?</h3>
            </div>
            <ul>
                <li><strong>Bước 1:</strong> Truy cập vào Google AI Studio.</li>
                <li><strong>Bước 2:</strong> Nhấp vào nút "Get API Key" (Lấy khóa API).</li>
                <li><strong>Bước 3:</strong> Tạo một khóa API mới trong dự án của bạn.</li>
                <li><strong>Bước 4:</strong> Sao chép khóa và dán vào ô bên trái.</li>
            </ul>
             <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" class="youtube-link">
                <span>Lấy API Key tại Google AI Studio</span>
            </a>
        </div>
    </div>
`;


interface SettingsAppProps {
    onClearCache: () => void;
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

export const SettingsApp: FunctionalComponent<SettingsAppProps> = ({ onClearCache, theme, setTheme }) => {
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [apiKeyStatus, setApiKeyStatus] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);
    const [saveStatusMessage, setSaveStatusMessage] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [keySource, setKeySource] = useState<'custom' | 'default' | 'none'>('none');

    useEffect(() => {
        const savedKey = localStorage.getItem('gemini_api_key') || '';
        setApiKeyInput(savedKey);

        if (savedKey) {
            setKeySource('custom');
        } else if (process.env.API_KEY) {
            setKeySource('default');
        } else {
            setKeySource('none');
            setApiKeyStatus({ message: 'Chưa có API key nào được thiết lập.', type: 'warning' });
        }
    }, []);

    const handleTestKey = async () => {
        setIsTesting(true);
        setApiKeyStatus(null);
        const result = await testApiKey(apiKeyInput);
        setApiKeyStatus(result);
        setIsTesting(false);
    };

    const handleSaveKey = () => {
        const keyToSave = apiKeyInput.trim();
        setApiKeyStatus(null); // Clear previous test results on save

        if (keyToSave) {
            localStorage.setItem('gemini_api_key', keyToSave);
            setKeySource('custom');
        } else {
            localStorage.removeItem('gemini_api_key');
            setApiKeyInput(''); // Clear the input field visually
            if (process.env.API_KEY) {
                setKeySource('default');
            } else {
                setKeySource('none');
                setApiKeyStatus({ message: 'Chưa có API key nào được thiết lập.', type: 'warning' });
            }
        }
        setSaveStatusMessage('Đã lưu thành công!');
        setTimeout(() => setSaveStatusMessage(''), 3000);
    };
    
    return html`
        <div class="settings-app-layout">
            <div class="settings-panel">
                <h2>Cài đặt</h2>
                 <div class="form-group">
                    <h3>Google Gemini API Key</h3>
                    <p class="settings-description">
                        Để sử dụng các tính năng AI, bạn cần cung cấp API Key của riêng mình từ Google.
                    </p>
                    <label for="api-key">Nhập API Key của bạn</label>
                    ${keySource === 'custom' && html`<div class="api-status" style=${{marginBottom: '0.5rem', marginTop: '0.5rem'}}>Trạng thái: Đang dùng key tuỳ chỉnh.</div>`}
                    ${keySource === 'default' && html`<div class="api-status" style=${{marginBottom: '0.5rem', marginTop: '0.5rem'}}>Trạng thái: Đang dùng key mặc định của hệ thống.</div>`}
                    <input 
                        type="password" 
                        id="api-key" 
                        value=${apiKeyInput} 
                        onInput=${(e: TargetedEvent<HTMLInputElement>) => setApiKeyInput(e.currentTarget.value)}
                        placeholder="•••••••••••••••••••••••••••••••"
                    />
                    ${apiKeyStatus && html`
                        <div class="api-test-result ${apiKeyStatus.type}">
                            ${apiKeyStatus.message}
                        </div>
                    `}
                </div>
                <div class="actions" style=${{justifyContent: 'flex-start', paddingTop: 0, marginTop: '1rem', marginBottom: '2rem'}}>
                    <button class="btn btn-secondary" onClick=${handleTestKey} disabled=${isTesting}>
                        ${isTesting ? 'Đang kiểm tra...' : 'Kiểm tra Key'}
                    </button>
                     <button class="btn btn-primary" onClick=${handleSaveKey}>
                        Lưu Key
                    </button>
                </div>
                 ${saveStatusMessage && html`<div class="save-status-message">${saveStatusMessage}</div>`}
                

                 <div class="form-group">
                    <h3>Giao diện</h3>
                    <p class="settings-description">
                        Chọn giao diện sáng hoặc tối cho ứng dụng.
                    </p>
                    <div class="radio-group">
                        <label>
                            <input type="radio" name="theme" value="light" checked=${theme === 'light'} onChange=${() => setTheme('light')} />
                            Sáng
                        </label>
                        <label>
                            <input type="radio" name="theme" value="dark" checked=${theme === 'dark'} onChange=${() => setTheme('dark')} />
                            Tối
                        </label>
                    </div>
                </div>
                
                <div class="form-group">
                    <h3>Hệ thống</h3>
                    <button class="btn" onClick=${onClearCache} style=${{width: '100%', background: '#ff6b6b', color: 'white', marginTop: '0.5rem'}}>
                        🔄 Xóa Cache & Tải lại trang
                    </button>
                </div>
            </div>
             <${SettingsInfo} />
        </div>
    `;
};