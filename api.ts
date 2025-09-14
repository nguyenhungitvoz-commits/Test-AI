/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Part, Modality } from "@google/genai";
import { IdPhotoSettings, RestorationSettings, SymmetrySettings, BackgroundSettings, MockupSettings } from "./types";

const getMimeType = (dataUrl: string): string => {
    const parts = dataUrl.split(',')[0].split(':')[1].split(';');
    return parts[0];
};

const getApiKey = (): string => {
    // 1. Prioritize user's custom key from localStorage
    const customApiKey = localStorage.getItem('gemini_api_key');
    if (customApiKey && customApiKey.trim() !== '') {
        return customApiKey;
    }

    // 2. Fallback to the default system key from environment variables
    const defaultApiKey = process.env.API_KEY;
    if (defaultApiKey && defaultApiKey.trim() !== '') {
        return defaultApiKey;
    }

    // 3. If neither is available, throw an error
    throw new Error("Không có API Key hợp lệ. Vui lòng vào tab Cài đặt để thêm hoặc kiểm tra lại khóa API Google Gemini của bạn.");
}

// Wrapper function to call Gemini API with retry logic using the SDK
export const callGeminiAPI = async (prompt: string, imageData?: string, additionalImages?: string[]): Promise<string> => {
    const apiKey = getApiKey();
    // Retry logic with exponential backoff
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    const parts: Part[] = [];

    // Add main image first, if available
    if (imageData) {
        parts.push({
            inlineData: {
                data: imageData.split(',')[1],
                mimeType: getMimeType(imageData),
            }
        });
    }
    
    // Add the text prompt
    parts.push({ text: prompt });

    // Add any additional images
    if (additionalImages && additionalImages.length > 0) {
        additionalImages.forEach(img => {
            parts.push({
                inlineData: {
                    data: img.split(',')[1],
                    mimeType: getMimeType(img),
                }
            });
        });
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            console.log(`[callGeminiAPI] Attempt ${attempt + 1}/${maxRetries}`);
            const ai = new GoogleGenAI({ apiKey });

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image-preview',
                contents: { parts },
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                },
            });

            if (response.candidates && response.candidates.length > 0) {
                const candidate = response.candidates[0];
                if (candidate.content && Array.isArray(candidate.content.parts)) {
                    const imagePart = candidate.content.parts.find((p: Part) => p.inlineData);
                    if (imagePart && imagePart.inlineData) {
                        return `data:image/png;base64,${imagePart.inlineData.data}`;
                    }
                }
            }
            throw new Error('No image was generated via SDK');

        } catch (error) {
            lastError = error as Error;
            if (attempt < maxRetries - 1) {
                const waitTime = Math.pow(2, attempt) * 1000 + (Math.random() * 1000);
                const errorMsg = (error as Error).message || '';
                if (errorMsg.includes('429') || /rate limit/i.test(errorMsg) || /resource exhausted/i.test(errorMsg)) {
                    console.log(`Rate limit hit. Retrying in ${Math.ceil(waitTime/1000)}s... (${attempt + 1}/${maxRetries})`);
                } else {
                    console.log(`API call failed. Retrying in ${Math.ceil(waitTime/1000)}s... (${attempt + 1}/${maxRetries})`);
                }
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    throw lastError || new Error('All retry attempts failed');
};

export const testApiKey = async (apiKey: string): Promise<{ success: boolean; message: string; type: 'success' | 'warning' | 'error' }> => {
    if (!apiKey.trim()) {
        return { success: false, message: 'API key không được để trống.', type: 'error' };
    }
    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'Hi',
        });
        
        if (response.text) {
             return { success: true, message: 'Key hợp lệ và hoạt động!', type: 'success' };
        } else {
            throw new Error("Phản hồi API không hợp lệ.");
        }
    } catch (error) {
        const errorMessage = (error as Error).message;
        console.error("API Key Test Error:", errorMessage);

        if (errorMessage.includes("API key not valid")) {
            return { success: false, message: 'API key không hợp lệ. Vui lòng kiểm tra lại.', type: 'error' };
        } else if (errorMessage.includes("quota") || errorMessage.includes("rate limit")) {
            return { success: true, message: 'Key hợp lệ, nhưng đã đạt đến giới hạn sử dụng.', type: 'warning' };
        } else {
            return { success: false, message: `Đã xảy ra lỗi: ${errorMessage}`, type: 'error' };
        }
    }
};

// --- Feature-specific API Functions ---

export function generateIdPhoto(originalImage: string, settings: IdPhotoSettings): Promise<string> {
    const basePrompt = "Generate a high-resolution, professional ID photo suitable for official documents. The aspect ratio must be 3:4. The subject's head should be centered, facing forward. The lighting should be even and studio-quality. Critically, maintain the original framing of the subject from the source image. If the source image is a headshot, the result must also be a headshot. If it shows half the body, the result must also show half the body. Do not invent or add body parts that are not visible in the original photo.";
    
    let backgroundPrompt;
    if (settings.background === 'white') {
        backgroundPrompt = 'The background must be a solid, uniform pure white (#FFFFFF).';
    } else if (settings.background === 'blue') {
        backgroundPrompt = 'The background must be a solid, uniform light blue (#E0E8F0).';
    } else {
        backgroundPrompt = `The background must be a solid, uniform color with the hex code ${settings.background}.`;
    }

    const clothingDescription = settings.isCustomClothing ? settings.customClothingPrompt : settings.clothingSelection;
    const clothingPrompt = clothingDescription ? `The subject must be wearing: ${clothingDescription}.` : '';

    let facePrompt = "Crucially, preserve the subject's original facial features, structure, and identity. Do not alter their ethnicity, age, or key characteristics.";
    if (settings.smoothSkin) {
        facePrompt += " Apply subtle skin smoothing for a clean look, but keep it natural.";
    }
    if (settings.slightSmile) {
        facePrompt += " Adjust the expression to a slight, closed-mouth, pleasant smile.";
    } else if (settings.preserveFace) {
        facePrompt += " Maintain the original neutral facial expression.";
    }

    let hairPrompt = '';
    if (settings.hairStyle === 'front') {
        hairPrompt = 'Style the hair neatly, falling towards the front but off the face.';
    } else if (settings.hairStyle === 'back') {
        hairPrompt = 'Style the hair neatly, combed or swept back away from the face.';
    } else if (settings.hairStyle === 'original') {
        hairPrompt = "Keep the subject's original hairstyle from the source image.";
    }

    const customPromptPart = settings.customPrompt ? `Additionally: ${settings.customPrompt}.` : '';

    const finalPrompt = [basePrompt, backgroundPrompt, clothingPrompt, facePrompt, hairPrompt, customPromptPart].filter(Boolean).join(' ');

    return callGeminiAPI(finalPrompt, originalImage);
}

export function restoreImage(originalImage: string, settings: RestorationSettings): Promise<string> {
    const samplePromptText = "lên màu chân thật cho bức ảnh, colorize the photo realistically.";

    const promptSegments = [
        'You are an expert AI photo restoration artist. Your task is to restore the provided old, damaged, or low-quality photo to a high-quality, clear, and vibrant state.',
        '- Intelligently remove scratches, dust, creases, and other forms of damage.',
        '- Enhance the sharpness and clarity of the image, bringing out fine details.',
        '- Correct colors, improve contrast, and balance the lighting to look natural and vibrant.',
    ];

    if (settings.preserveFace) {
        promptSegments.push('- CRITICAL: The facial features and identity of any person in the photo must be preserved with the highest fidelity. Do not alter their appearance.');
    } else {
        promptSegments.push('- The facial features can be reconstructed and enhanced to appear clearer and more lifelike, while maintaining the person\'s core identity.');
    }

    if (settings.backgroundOption === 'white') {
        promptSegments.push('- Replace the background with a clean, solid, professional studio white background.');
    } else if (settings.backgroundOption === 'blue') {
        promptSegments.push('- Replace the background with a clean, solid, professional studio light blue background.');
    } else { // 'original'
        promptSegments.push('- The original background should be restored and enhanced along with the rest of the image.');
    }

    let finalCustomPrompt = settings.customPrompt || '';
    if (settings.useSamplePrompt) {
        finalCustomPrompt = `${samplePromptText} ${finalCustomPrompt}`.trim();
    }
    
    if (finalCustomPrompt) {
        promptSegments.push(`- Apply the following specific user adjustments: "${finalCustomPrompt}".`);
    }

    const finalPrompt = promptSegments.join(' ');

    return callGeminiAPI(finalPrompt, originalImage);
}

export function correctFacialSymmetry(originalImage: string, settings: SymmetrySettings): Promise<string> {
    const getIntensityWord = (intensity: number): string => {
        if (intensity <= 33) return "a very subtle and almost imperceptible";
        if (intensity <= 66) return "a moderate and natural-looking";
        if (intensity <= 100) return "a significant but realistic";
        return "a moderate";
    };

    const promptSegments = [
        "You are an expert AI cosmetic surgeon and retoucher. Your task is to subtly correct asymmetries and enhance the balance of the facial features in the provided photo, according to the user's specific instructions.",
        "IMPORTANT: You must ONLY apply the specific adjustments listed below. ALL other areas of the photo (including other facial features, skin texture, hair, background, lighting, etc.) must remain IDENTICAL to the original image.",
        "The final image must look completely natural, realistic, and preserve the subject's core identity. Maintain the original photo's quality, lighting, and background.",
        "Do not change the subject's gender, ethnicity, or approximate age."
    ];
    
    const specificInstructions: string[] = [];
    const adjustments = settings.adjustments;

    if (adjustments.balanceEyes.enabled) specificInstructions.push(`- Cân đối khoảng cách hai mắt: Apply ${getIntensityWord(adjustments.balanceEyes.intensity)} adjustment to analyze and subtly adjust the position and spacing of the eyes to be perfectly symmetrical.`);
    if (adjustments.equalizeEyeSize.enabled) specificInstructions.push(`- Cân chỉnh độ to/nhỏ mắt: Apply ${getIntensityWord(adjustments.equalizeEyeSize.intensity)} adjustment to carefully adjust the size of the eyes to make them appear equal and balanced.`);
    if (adjustments.correctEyeGaze.enabled) specificInstructions.push(`- Chỉnh lé/sụp mí: Apply ${getIntensityWord(adjustments.correctEyeGaze.intensity)} adjustment to correct eye gaze and eyelid position. Fix any strabismus (crossed eyes) to make both eyes look straight ahead. Lift any ptosis (droopy eyelids) so both eyes appear equally open. The result must be natural and symmetrical.`);
    if (adjustments.narrowNose.enabled) specificInstructions.push(`- Thu nhỏ cánh mũi: Apply ${getIntensityWord(adjustments.narrowNose.intensity)} adjustment to subtly narrow the width of the nostrils for a more refined appearance.`);
    if (adjustments.straightenNose.enabled) specificInstructions.push(`- Kéo sống mũi thẳng: Apply ${getIntensityWord(adjustments.straightenNose.intensity)} adjustment to ensure the bridge of the nose is perfectly straight, correcting any deviation.`);
    if (adjustments.liftNoseTip.enabled) specificInstructions.push(`- Nâng nhẹ đầu mũi: Apply ${getIntensityWord(adjustments.liftNoseTip.intensity)} adjustment to create a very slight upward lift to the tip of the nose.`);
    if (adjustments.centerMouth.enabled) specificInstructions.push(`- Chỉnh miệng ngay ngắn: Apply ${getIntensityWord(adjustments.centerMouth.intensity)} adjustment to make the mouth perfectly centered and horizontal, correcting any slight tilt or asymmetry.`);
    if (adjustments.evenTeeth.enabled) specificInstructions.push(`- Sửa răng & che lợi: Apply ${getIntensityWord(adjustments.evenTeeth.intensity)} adjustment to make the visible teeth appear more even and uniform. If there is a gummy smile, subtly lower the upper lip to cover the gums more.`);
    if (adjustments.removeLipWrinkles.enabled) specificInstructions.push(`- Chỉnh hết nhăn môi: Apply ${getIntensityWord(adjustments.removeLipWrinkles.intensity)} adjustment to reduce or remove fine lines and wrinkles on the lips for a smoother, more youthful appearance.`);
    if (adjustments.slimJawline.enabled) specificInstructions.push(`- Thon gọn đường viền hàm: Apply ${getIntensityWord(adjustments.slimJawline.intensity)} adjustment to subtly slim and refine the jawline, reducing any jowls or excess fat for a V-shape look.`);
    if (adjustments.adjustChin.enabled) specificInstructions.push(`- Chỉnh cằm: Apply ${getIntensityWord(adjustments.adjustChin.intensity)} adjustment to reshape the chin to be more pointed or shorter to create a balanced facial proportion.`);
    if (adjustments.smoothHair.enabled) specificInstructions.push(`- Làm mượt tóc: Apply ${getIntensityWord(adjustments.smoothHair.intensity)} adjustment to style the hair so it looks smooth, neat, and free of flyaways, without changing the overall hairstyle.`);


    if (specificInstructions.length > 0) {
        promptSegments.push("Focus on the following specific adjustments:");
        promptSegments.push(...specificInstructions);
    } else {
        promptSegments.push("No specific adjustments were selected. Return the original image without changes.");
    }
    
    const finalPrompt = promptSegments.join(' ');

    return callGeminiAPI(finalPrompt, originalImage);
}

export function changeImageLighting(originalImage: string, lightingPrompt: string): Promise<string> {
    const finalPrompt = `
        You are a master lighting director and photo editor.
        Your task is to re-light the provided image according to the following description, while preserving all other aspects of the photo.
        New lighting style: "${lightingPrompt}".
        CRITICAL: The person's identity, facial features, clothing, pose, and the background environment must remain EXACTLY the same. Only the lighting (including highlights, shadows, color temperature, and mood) should be changed.
        The output must be only the final, photorealistically re-lit image.
    `;

    return callGeminiAPI(finalPrompt, originalImage);
}

export function changeBackground(originalImage: string, settings: Omit<BackgroundSettings, 'numImages'>): Promise<string> {
    const promptSegments = [
        'You are an expert digital artist and photo editor. Your task is to masterfully replace the background of the primary image (the first image provided).',
    ];

    if (settings.prompt && settings.referenceImage) {
        promptSegments.push(`The new background should be a photorealistic depiction of: "${settings.prompt}", taking inspiration from the style, color palette, and environment of the reference image (the second image provided).`);
    } else if (settings.prompt) {
        promptSegments.push(`The new background should be a photorealistic depiction of: "${settings.prompt}".`);
    } else if (settings.referenceImage) {
        promptSegments.push(`The new background should be inspired by the style, color palette, and environment of the reference image (the second image provided).`);
    }

    if (settings.poseOption === 'keep') {
        promptSegments.push('CRITICAL: The person, their pose, and their clothing MUST be preserved exactly as in the original photo. Only the background should be replaced.');
    } else { // 'change'
        promptSegments.push('The person\'s pose can be slightly and naturally adjusted to better fit the new environment, but their identity, facial features, and clothing must be preserved.');
    }

    switch (settings.lightingEffect) {
        case 'left-light':
            promptSegments.push('Additionally, add a subtle, warm rim light coming from the top-left, as if from the sun, realistically illuminating the hair and left shoulder of the person. This light should blend naturally with the new background.');
            break;
        case 'left-strong':
            promptSegments.push('Additionally, add a strong, warm rim light coming from the top-left, as if from the sun, realistically illuminating the hair and left shoulder of the person. This light should blend naturally with the new background.');
            break;
        case 'right-light':
            promptSegments.push('Additionally, add a subtle, warm rim light coming from the top-right, as if from the sun, realistically illuminating the hair and right shoulder of the person. This light should blend naturally with the new background.');
            break;
        case 'right-strong':
            promptSegments.push('Additionally, add a strong, warm rim light coming from the top-right, as if from the sun, realistically illuminating the hair and right shoulder of the person. This light should blend naturally with the new background.');
            break;
    }

    const finalPrompt = promptSegments.join(' ');
    
    const additionalImages = settings.referenceImage ? [settings.referenceImage] : undefined;
    return callGeminiAPI(finalPrompt, originalImage, additionalImages);
}

export function createProductMockup(settings: MockupSettings): Promise<string> {
    if (!settings.productImage) {
        return Promise.reject(new Error("Product image is required."));
    }

    const promptSegments = [
        "You are an expert in creating photorealistic product mockups. Your task is to generate an image based on the provided inputs. It is absolutely critical that the product and the character (if an image is provided) are rendered with 100% fidelity from the source images.",
    ];

    if (settings.characterImage) {
        promptSegments.push("Use the character from the second provided image. Their identity, face, and body must be perfectly preserved. Naturally pose them holding the product from the first provided image.");
    } else {
        promptSegments.push(`Generate a character that matches the following description: "${settings.characterPrompt}". This character should be holding the product from the first provided image in a natural pose.`);
    }

    promptSegments.push("The product itself (from the first image) must be rendered exactly as it appears in its source image. Do not change its design, color, branding, or size.");
    
    if (settings.scenePrompt) {
        promptSegments.push(`The overall scene, background, pose, and lighting should be as follows: "${settings.scenePrompt}". If there are any details about clothing or hair in this prompt, apply them to the character while preserving their identity.`);
    }

    promptSegments.push("The final output must be a single, seamless, high-quality, photorealistic image. Do not output text.");

    const finalPrompt = promptSegments.join(' ');
    
    const additionalImages = settings.characterImage ? [settings.characterImage] : undefined;
    return callGeminiAPI(finalPrompt, settings.productImage, additionalImages);
}