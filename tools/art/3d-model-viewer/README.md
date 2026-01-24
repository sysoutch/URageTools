# 3D Model Viewer

A powerful, web-based 3D model viewer tool built with Three.js that allows users to import, visualize, and interact with 3D models in their browser.

## Features

- **Multi-Format Support**: Import 3D models in GLB, GLTF, and OBJ formats
- **Interactive Controls**: Orbit controls for rotating, panning, and zooming the model
- **Advanced Rendering**: High-quality rendering with tone mapping and anti-aliasing
- **Material Controls**: Adjust flat shading, metallic, and roughness properties
- **Lighting Controls**: Modify light intensity and rotation
- **Camera Settings**: Fine-tune field of view, near/far clipping planes
- **Display Modes**: Switch between solid, material, and wireframe rendering modes
- **Environment Controls**: Adjust environment exposure
- **Capture Functionality**: Export high-quality screenshots of your 3D models
- **Responsive Design**: Works on desktop and mobile devices

## How to Use

1. **Import a Model**: Click the "Import Model" area or drag and drop a 3D model file (GLB, GLTF, or OBJ) onto the viewer
2. **Navigate**: 
   - Left-click and drag to rotate the model
   - Scroll to zoom in/out
   - Right-click and drag to pan the view
3. **Adjust Settings**: Use the controls in the sidebar to modify:
   - Environment exposure
   - Lighting intensity and rotation
   - Material properties (flat shading, metallic, roughness)
   - Camera settings (FOV, near/far clipping)
   - Display modes (solid, material, wireframe)
4. **Capture Screenshots**: Click the camera icon to download a high-quality image of your model

## Technical Details

- **Framework**: Built with Three.js (R165)
- **Dependencies**: 
  - OrbitControls for camera navigation
  - GLTFLoader for GLB/GLTF models
  - OBJLoader for OBJ models
  - RGBELoader for environment maps
- **Rendering**: WebGL with antialiasing and tone mapping
- **Responsive**: Adapts to different screen sizes
- **Performance**: Optimized for smooth interaction with 3D models

## Browser Compatibility

This tool requires a modern browser with WebGL support:

- Chrome 56+
- Firefox 51+
- Safari 11+
- Edge 16+

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## Author

URage Tools - A collection of web-based creative tools for developers and designers

For more information about this toolset, visit [URageTools GitHub Repository](https://github.com/URageTools/URageTools)