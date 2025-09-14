/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// General types
export type Theme = 'light' | 'dark';

export interface ImageItem {
    id: number;
    file: File;
    original: string;
    generated: string | null;
    status: 'pending' | 'processing' | 'done' | 'error';
}

// Settings for ID Photo feature
export interface IdPhotoSettings {
    background: string;
    clothingSelection: string;
    customClothingPrompt: string;
    isCustomClothing: boolean;
    customPrompt: string;
    preserveFace: boolean;
    smoothSkin: boolean;
    slightSmile: boolean;
    hairStyle: string;
}

// Settings for Restoration feature
export interface RestorationSettings {
    preserveFace: boolean;
    useSamplePrompt: boolean;
    backgroundOption: 'original' | 'white' | 'blue';
    customPrompt: string;
}

// Settings for Symmetry feature
export interface SymmetryAdjustment {
    enabled: boolean;
    intensity: number;
}

export interface SymmetrySettings {
    adjustments: {
        [key: string]: SymmetryAdjustment;
    };
}

// Settings for Lighting feature
export interface LightingSettings {
    selectedStyles: string[];
    customPrompt: string;
}

// Settings for Background feature
export interface BackgroundSettings {
    prompt: string;
    referenceImage: string | null;
    poseOption: 'keep' | 'change';
    lightingEffect: string;
    numImages: number;
}

// Settings for Mockup feature
export interface MockupSettings {
    productImage: string | null;
    characterImage: string | null;
    characterPrompt: string;
    scenePrompt: string;
}

// Settings for Trend Creator feature
export interface TrendCreatorSettings {
    subjectImage: string | null;
    selectedTrends: string[];
    prompt: string;
    numImages: number;
}

// Props for common components
export interface CommonSettingsPanelProps {
    onGenerate: () => void;
    generating: boolean;
    hasImage: boolean;
    buttonText?: string;
}