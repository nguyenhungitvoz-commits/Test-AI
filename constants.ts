/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    IdPhotoIcon,
    RestorationIcon,
    SymmetryIcon,
    LightingIcon,
    BackgroundIcon,
    MockupIcon,
    SettingsIcon,
    TrendIcon
} from './components';

export const TABS = [
    { id: 'id-photo', label: 'Chỉnh sửa ảnh thẻ', icon: IdPhotoIcon, description: 'Tạo và tùy chỉnh ảnh thẻ chuyên nghiệp chỉ với một cú nhấp chuột.' },
    { id: 'restoration', label: 'Phục chế ảnh cũ', icon: RestorationIcon, description: 'Khôi phục, sửa chữa và làm mới những bức ảnh cũ, bị hỏng hoặc mờ.' },
    { id: 'symmetry', label: 'Chỉnh sửa Cân đối', icon: SymmetryIcon, description: 'Tinh chỉnh và cân bằng các đường nét trên khuôn mặt một cách tự nhiên.' },
    { id: 'lighting', label: 'Ánh sáng', icon: LightingIcon, description: 'Tái tạo và thay đổi ánh sáng của ảnh với các hiệu ứng chuyên nghiệp.' },
    { id: 'background', label: 'Thay nền', icon: BackgroundIcon, description: 'Dễ dàng tách và thay đổi nền ảnh bằng văn bản hoặc ảnh tham chiếu.' },
    { id: 'trend-creator', label: 'Tạo ảnh Trend', icon: TrendIcon, description: 'Sử dụng ảnh của bạn và một trend có sẵn để tạo ra một tác phẩm độc đáo.' },
    { id: 'mockup', label: 'Tạo Mockup', icon: MockupIcon, description: 'Tạo mockup sản phẩm chuyên nghiệp với nhân vật và bối cảnh tùy chỉnh.' },
    { id: 'settings', label: 'Cài đặt', icon: SettingsIcon, description: 'Quản lý tài khoản, API key và các cấu hình khác của ứng dụng.' },
];

export const CLOTHING_OPTIONS = {
    "Sơ mi & Áo kiểu": [
    { name: "Sơ mi trắng", prompt: "Plain white button-up dress shirt, formal style" },
    { name: "Sơ mi xanh", prompt: "Plain light blue button-up dress shirt, formal style" },
    { name: "Sơ mi đen", prompt: "Plain black button-up dress shirt, formal style" },
    { name: "Áo polo", prompt: "Solid color polo shirt, simple and neat" },
    { name: "Áo blouse", prompt: "Plain professional women's blouse" },
    { name: "Áo cổ nơ", prompt: "Neat blouse with a small bow-tie collar" },
  ],
  "Vest Nam": [
    { name: "Vest công sở", prompt: "Business suit with plain white shirt and tie, passport photo style" },
    { name: "Vest đen cổ điển", prompt: "Classic black suit with white shirt and dark tie" },
    { name: "Vest xanh navy", prompt: "Navy blue suit with white shirt and tie" },
    { name: "Vest xám khói", prompt: "Charcoal grey suit with white shirt and tie" },
    { name: "Vest & cà vạt", prompt: "Formal suit with matching plain tie" },
  ],
  "Trang phục Nữ": [
    { name: "Áo dài trắng", prompt: "Traditional plain white Vietnamese Ao Dai, passport photo style" },
    { name: "Vest nữ", prompt: "Women's business suit jacket over a plain top" },
    { name: "Vest dáng ôm", prompt: "Tailored fitted women's suit jacket, professional style" },
  ],
};

export const LIGHTING_STYLES = [ 
  { 
    name: "Ánh sáng bên", 
    prompt: "Apply natural side lighting: light coming from one side, like sunlight through a window, illuminating half of the face clearly while the other half remains softly shaded. Keep the transition smooth and realistic." 
  },
  { 
    name: "Ánh sáng cứng", 
    prompt: "Apply natural hard light: direct sunlight effect with sharp, well-defined shadows and strong contrast. The look should feel realistic, like midday sun, without artificial glow." 
  },
  { 
    name: "Ánh sáng 45°", 
    prompt: "Apply natural 45-degree lighting: light angled from above and to the side, forming a small triangle of light on the shadowed cheek. Shadows should stay gentle and natural, adding depth without harshness." 
  },
  { 
    name: "Ánh sáng ngược", 
    prompt: "Apply natural backlighting: strong light from behind the subject, creating a soft rim or halo glow around the hair and shoulders. Keep the front lighting subtle and balanced." 
  },
  { 
    name: "Ánh sáng nền", 
    prompt: "Apply natural background lighting: light behind the subject that softly brightens the backdrop, separating the subject from it. The front should remain evenly and naturally lit." 
  },
  { 
    name: "Ánh sáng tóc", 
    prompt: "Apply natural hair lighting: gentle light from above or behind that highlights the hair. Keep it subtle and realistic, adding texture and depth without overexposing." 
  },
  { 
    name: "Ánh sáng tách đôi", 
    prompt: "Apply natural split lighting: light shining from one side, dividing the face into a bright half and a shadowed half. The contrast should look natural and not overly dramatic." 
  },
  { 
    name: "Ngược sáng toàn phần", 
    prompt: "Apply natural silhouette effect: strong light from behind, turning the subject into a dark outline against a bright background. Preserve clean edges and a natural atmosphere." 
  },
  { 
    name: "Ánh sáng môi trường", 
    prompt: "Apply natural ambient lighting: soft, diffused light filling the scene, like daylight on a cloudy day. Minimal shadows, evenly lit subject, and a gentle, realistic look." 
  },
];




export const PREDEFINED_TRENDS = {
    beggar: {
        label: "Trend Ăn Xin",
        prompt: "A homeless person, sitting hunched on the sidewalk of a city street. They are dressed in ragged, tattered, and patched clothing. Their hands cling tightly to the inner pot of an old, dented, and dusty rice cooker. Important: The face and identity of the homeless person must be identical to the provided reference portrait.",
    },
    figurine: {
        label: "Trend Mô Hình",
        prompt: "A modern-styled character, inspired by the reference portrait, striking a dynamic pose with strong, confident energy. The design is gender-neutral (could be interpreted as male or female). The character has a well-proportioned physique, dressed in fashionable attire suitable for outdoor activities or performances, with sharp detailing and realistic fabric textures. The face is rendered faithfully to the reference portrait, preserving an expression of confidence, focus, and determination. The pose is captured like a moment of action, blending artistic flair with realism.The figure is presented in premium quality, commercial-style (1/7 scale collectible figure), mounted on a transparent acrylic base, and placed on a computer desk.Behind it, the computer screen displays the modeling process of the figure. The entire scene is set in a bright, modern studio with wooden shelves neatly showcasing a collection of figures and models. Multicolored LED lighting reflects softly on the walls and desk, creating a lively, professional, and creatively charged atmosphere. On the back wall, the prominent TG DESIGN AI logo highlights the brand identity. Next to the figure, there is a commercial-style figure box, printed with the original illustration.",
    },
    statue: {
        label: "Trend Nắn Tượng",
        prompt: "Create a commercialized 1/7 scale figure of the character from the reference portrait, designed in a hyper-realistic style and placed within a real-world environment. The model is displayed on a computer desk with a round transparent acrylic base.Beside the desk, the real person from the reference portrait appears at life-size, wearing the same outfit as in both the photo and the figure, carefully holding a screwdriver as if adjusting or repairing the model.The setting is a modern, brightly lit studio, with a collection of toys and figures neatly displayed in the background. Important: The face and identity of both the real person and the figure must be identical to the provided reference portrait.",
    },
};