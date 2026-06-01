import { Cancel } from "pixelarticons/react/Cancel";
import { Check } from "pixelarticons/react/Check";
import { Upload } from "pixelarticons/react/Upload";
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { usePlayerAvatarSettings } from "../services/avatars/playerAvatarSettings";
import { Button, IconButton } from "../ui/components";

const CROP_SIZE = 128;

interface AvatarUploadModalProps {
  currentAvatarUrl?: string;
  onClose(): void;
  onSave(url: string): void;
}

export function AvatarUploadModal({ currentAvatarUrl, onClose, onSave }: AvatarUploadModalProps) {
  const blockSize = usePlayerAvatarSettings(state => state.blockSize);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    };
  }, [sourceUrl]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSourceUrl(URL.createObjectURL(file));
    setPreviewUrl(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handlePreview = async () => {
    if (!sourceUrl || !croppedAreaPixels) return;
    const nextPreview = await createPixelAvatar(sourceUrl, croppedAreaPixels, blockSize);
    setPreviewUrl(nextPreview);
  };

  const handleSave = async () => {
    if (previewUrl) {
      onSave(previewUrl);
      return;
    }
    if (!sourceUrl || !croppedAreaPixels) return;
    onSave(await createPixelAvatar(sourceUrl, croppedAreaPixels, blockSize));
  };

  return (
    <div className="df-modal-backdrop" role="presentation">
      <section
        className="df-avatar-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Upload avatar"
      >
        <header className="df-avatar-modal-head">
          <h3>TWOJ AVATAR</h3>
          <IconButton label="Zamknij" onClick={onClose}>
            <Cancel width={18} height={18} aria-hidden="true" />
          </IconButton>
        </header>

        <div className="df-avatar-editor">
          <div className="df-crop-stage">
            {sourceUrl ? (
              <Cropper
                image={sourceUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="rect"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
              />
            ) : (
              <button
                type="button"
                className="df-upload-drop"
                onClick={() => inputRef.current?.click()}
              >
                <Upload width={22} height={22} aria-hidden="true" />
                <span>WYBIERZ ZDJECIE</span>
              </button>
            )}
          </div>

          <div className="df-avatar-preview-panel">
            <div className="df-avatar-preview">
              {previewUrl ? <img src={previewUrl} alt="" draggable={false} /> : <span />}
            </div>
          </div>
        </div>

        {sourceUrl && (
          <label className="df-avatar-zoom-control">
            <span>ZOOM</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={event => setZoom(Number(event.target.value))}
            />
          </label>
        )}

        <footer className="df-avatar-modal-actions">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="df-file-input"
            onChange={handleFileChange}
          />
          <Button onClick={() => inputRef.current?.click()}>
            <Upload width={14} height={14} aria-hidden="true" />
            <span>UPLOAD</span>
          </Button>
          <Button onClick={handlePreview} disabled={!sourceUrl}>
            <span>PODGLAD</span>
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!previewUrl && !sourceUrl}>
            <Check width={14} height={14} aria-hidden="true" />
            <span>ZAPISZ</span>
          </Button>
        </footer>
      </section>
    </div>
  );
}

async function createPixelAvatar(
  sourceUrl: string,
  cropArea: Area,
  blockSize: number,
): Promise<string> {
  const image = await loadImage(sourceUrl);
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = CROP_SIZE;
  cropCanvas.height = CROP_SIZE;

  const cropContext = cropCanvas.getContext("2d");
  if (!cropContext) throw new Error("Canvas is not available.");

  cropContext.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    CROP_SIZE,
    CROP_SIZE,
  );

  const outCanvas = document.createElement("canvas");
  outCanvas.width = CROP_SIZE;
  outCanvas.height = CROP_SIZE;
  const outContext = outCanvas.getContext("2d");
  if (!outContext) throw new Error("Canvas is not available.");
  outContext.imageSmoothingEnabled = false;

  const pixelCount = Math.ceil(CROP_SIZE / blockSize);
  for (let y = 0; y < pixelCount; y += 1) {
    for (let x = 0; x < pixelCount; x += 1) {
      const sampleX = Math.min(CROP_SIZE - 1, Math.floor(x * blockSize + blockSize / 2));
      const sampleY = Math.min(CROP_SIZE - 1, Math.floor(y * blockSize + blockSize / 2));
      const [r, g, b, alpha] = cropContext.getImageData(sampleX, sampleY, 1, 1).data;
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      outContext.fillStyle = `rgba(${gray}, ${gray}, ${gray}, ${alpha / 255})`;
      outContext.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
    }
  }

  return outCanvas.toDataURL("image/png");
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image."));
    image.src = url;
  });
}
