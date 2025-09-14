/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { h, FunctionalComponent } from 'preact';
import htm from 'htm';
import type { TargetedEvent } from 'preact/compat';
import { SymmetrySettings, CommonSettingsPanelProps, SymmetryAdjustment } from '../../types';

const html = htm.bind(h);

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
