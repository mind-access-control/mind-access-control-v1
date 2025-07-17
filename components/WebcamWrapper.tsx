// components/WebcamWrapper.tsx
import React, { useRef, useImperativeHandle, useEffect } from 'react';
import Webcam, { WebcamProps } from 'react-webcam';

// Definimos la interfaz para el objeto que queremos exponer a través de la ref.
export interface CustomWebcamRefCurrent {
  getScreenshot: (options?: { width?: number; height?: number; type?: string; quality?: number }) => string | null;
  video:
    | (HTMLVideoElement & {
        readyState?: number;
        srcObject?: MediaProvider | null;
      })
    | null;
}

// Interfaz para las opciones de getScreenshot, definida localmente
interface LocalScreenshotDimensions {
  width: number;
  height: number;
  type?: string;
  quality?: number;
}

// Definimos WebcamWrapperProps para incluir explícitamente todas las props que le pasamos
// y las que el error indica que faltan, todas como opcionales.
interface WebcamWrapperProps {
  audio?: boolean;
  screenshotFormat?: string;
  width?: string;
  height?: string;
  videoConstraints?: MediaTrackConstraints | MediaTrackConstraintSet[];
  className?: string;
  'data-cy'?: string;
  onUserMedia?: (stream: MediaStream) => void; // Propiedad opcional

  // Propiedades que TypeScript se queja que faltan y que son obligatorias en WebcamProps original
  disablePictureInPicture?: boolean;
  forceScreenshotSourceSize?: boolean;
  imageSmoothing?: boolean;
  mirrored?: boolean;
}

// Creamos nuestro componente wrapper usando React.forwardRef
const WebcamWrapper: React.ForwardRefRenderFunction<CustomWebcamRefCurrent, WebcamWrapperProps> = (props, ref) => {
  const realWebcamRef = useRef<Webcam>(null);

  // Exponemos los métodos y propiedades deseados a través de la ref pasada al wrapper
  useImperativeHandle(ref, () => ({
    getScreenshot: (options) => {
      let transformedOptions: LocalScreenshotDimensions | undefined;
      if (options && typeof options.width === 'number' && typeof options.height === 'number') {
        transformedOptions = {
          width: options.width,
          height: options.height,
          ...(options.type && { type: options.type }),
          ...(options.quality && { quality: options.quality }),
        };
      }
      return realWebcamRef.current?.getScreenshot(transformedOptions) || null;
    },
    video: realWebcamRef.current?.video || null,
  }));

  return (
    <Webcam
      {...(props as WebcamProps)}
      ref={realWebcamRef}
      onUserMedia={(stream) => {
        console.log('Webcam onUserMedia fired!'); // Log para Cypress
        props.onUserMedia?.(stream); // Aseguramos que el onUserMedia original se siga llamando
      }}
      onError={(error) => {
        console.error('Error en la cámara:', error);
        // Puedes manejar el error aquí, por ejemplo, mostrando un mensaje al usuario
      }}
    />
  );
};

export default React.forwardRef(WebcamWrapper);
