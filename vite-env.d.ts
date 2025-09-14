// FIX: Replaced the problematic triple-slash reference with manual type declarations
// for common assets and Vite's `import.meta.env`. This resolves the
// "Cannot find type definition file for 'vite/client'" error while preserving
// essential type information for the project.

// FIX: Used unique variable names within each asset module declaration to resolve "Duplicate identifier 'src'" errors.
declare module '*.png' {
  const pngSrc: string;
  export default pngSrc;
}

declare module '*.jpg' {
  const jpgSrc: string;
  export default jpgSrc;
}

declare module '*.jpeg' {
  const jpegSrc: string;
  export default jpegSrc;
}

declare module '*.gif' {
  const gifSrc: string;
  export default gifSrc;
}

declare module '*.svg' {
  const svgSrc: string;
  export default svgSrc;
}

interface ImportMetaEnv {
  // You can define your environment variables here
  // e.g., readonly VITE_SOME_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
