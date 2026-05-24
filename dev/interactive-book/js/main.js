import { createInteractiveBookApp } from './core/context.js';
import { registerBookStateModule } from './runtime/bookState.js';
import { registerRenderingModule } from './runtime/rendering.js';
import { registerAnimationModule } from './runtime/animation.js';
import { registerEventModule } from './runtime/events.js';

function describeCurrentBookAsset(app) {
    const canvas = app?.els?.canvas;
    if (!canvas || !canvas.width || !canvas.height) return null;
    const dataUrl = canvas.toDataURL('image/png');
    const activeBook = app.getActiveBook ? app.getActiveBook() : null;
    return {
        kind: 'image',
        title: activeBook?.title ? `${activeBook.title} Book Preview` : 'Interactive Book Preview',
        fileName: 'interactive-book-preview.png',
        mimeType: 'image/png',
        dataUrl,
        width: canvas.width,
        height: canvas.height,
        previewKind: 'image',
        previewUrl: dataUrl,
        metadata: {
            sourceTool: 'interactive-book',
            bookTitle: activeBook?.title || '',
            pageCount: Array.isArray(app.state?.pagesData) ? app.state.pagesData.length : 0,
            currentPage: app.state?.currentPage || 0
        }
    };
}

export async function initInteractiveBook() {
    const app = createInteractiveBookApp();
    registerBookStateModule(app);
    registerRenderingModule(app);
    registerAnimationModule(app);
    registerEventModule(app);
    await app.init();
    window.__urageToolDescribeCurrentAsset = () => describeCurrentBookAsset(app);
    window.__urageToolDescribeCurrentAssets = () => {
        const descriptor = describeCurrentBookAsset(app);
        return descriptor ? [descriptor] : [];
    };
    return app;
}
