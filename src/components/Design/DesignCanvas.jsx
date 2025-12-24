import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';

function DesignCanvas({ backgroundColor = '#ffffff', onReady }) {
  const containerRef = useRef(null);
  const [canvasInstance, setCanvasInstance] = useState(null);

  useEffect(() => {
    if (!containerRef.current || canvasInstance) return;

    const canvasEl = document.createElement('canvas');
    canvasEl.id = 'vestra-canvas';
    canvasEl.className = 'canvas-container';
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(canvasEl);

    const canvas = new fabric.Canvas(canvasEl, {
      backgroundColor,
      preserveObjectStacking: true
    });

    const resize = () => {
      const { clientWidth, clientHeight } = containerRef.current;
      canvas.setWidth(clientWidth);
      canvas.setHeight(clientHeight);
      canvas.requestRenderAll();
    };

    resize();
    window.addEventListener('resize', resize);

    const handleDragOver = (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e) => {
      e.preventDefault();
      const type = e.dataTransfer?.getData('text/plain');
      if (type) {
        const pointer = canvas.getPointer(e);
        addGarment(type, pointer.x, pointer.y);
      }
    };

    canvas.upperCanvasEl.addEventListener('dragover', handleDragOver);
    canvas.upperCanvasEl.addEventListener('drop', handleDrop);

    const addGarment = (type = 'tee', x, y) => {
      const fill = '#eceff1';
      let shape;
      switch (type) {
        case 'hoodie':
          shape = new fabric.Rect({
            width: 280,
            height: 320,
            rx: 28,
            ry: 28,
            fill,
            stroke: '#b0bec5',
            strokeWidth: 2
          });
          break;
        case 'tote':
          shape = new fabric.Rect({
            width: 240,
            height: 260,
            rx: 12,
            ry: 12,
            fill,
            stroke: '#b0bec5',
            strokeWidth: 2
          });
          break;
        case 'tee':
        default:
          shape = new fabric.Rect({
            width: 260,
            height: 300,
            rx: 20,
            ry: 20,
            fill,
            stroke: '#b0bec5',
            strokeWidth: 2
          });
          break;
      }

      const left = x ?? canvas.getWidth() / 2;
      const top = y ?? canvas.getHeight() / 2;
      shape.set({ left, top, originX: 'center', originY: 'center' });
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.requestRenderAll();
    };

    const api = {
      addText: (text = 'Edit Me') => {
        const textbox = new fabric.Textbox(text, {
          left: 80,
          top: 80,
          fontSize: 32,
          fill: '#2D3436',
          fontWeight: 'bold'
        });
        canvas.add(textbox);
        canvas.setActiveObject(textbox);
        canvas.requestRenderAll();
      },
      addGarment,
      setBackground: (color) => {
        canvas.set('backgroundColor', color);
        canvas.requestRenderAll();
      },
      exportJson: () => JSON.stringify(canvas.toJSON())
    };

    setCanvasInstance(canvas);
    if (onReady) {
      onReady(api);
    }

    return () => {
      window.removeEventListener('resize', resize);
      canvas.upperCanvasEl.removeEventListener('dragover', handleDragOver);
      canvas.upperCanvasEl.removeEventListener('drop', handleDrop);
      canvas.dispose();
    };
  }, [backgroundColor, canvasInstance, onReady]);

  useEffect(() => {
    if (canvasInstance) {
      canvasInstance.set('backgroundColor', backgroundColor);
      canvasInstance.requestRenderAll();
    }
  }, [backgroundColor, canvasInstance]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('text/plain');
        if (canvasInstance && type) {
          const pointer = canvasInstance.getPointer(e);
          addGarment(type, pointer.x, pointer.y);
        }
      }}
    />
  );
}

export default DesignCanvas;
