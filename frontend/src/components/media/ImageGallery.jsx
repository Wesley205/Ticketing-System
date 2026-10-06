import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  LuChevronLeft,
  LuChevronRight,
  LuCamera,
  LuDownload,
  LuImage,
  LuImagePlus,
  LuRotateCcw,
  LuZoomIn,
  LuX,
} from 'react-icons/lu';
import { Button } from '../forms/Button.jsx';
import { EmptyState } from '../feedback/EmptyState.jsx';

function displayName(item) {
  return item.caption || item.fileName || item.altText || 'Image';
}

function useProtectedImageUrls(items, loadImage) {
  const [urls, setUrls] = useState({});
  const [errors, setErrors] = useState({});
  const loadImageRef = useRef(loadImage);
  const itemKey = items.map((item) => item.id).join('|');
  loadImageRef.current = loadImage;

  useEffect(() => {
    let isMounted = true;
    const objectUrls = [];

    async function load() {
      const nextUrls = {};
      const nextErrors = {};

      setUrls({});
      setErrors({});

      await Promise.all(
        items.map(async (item) => {
          try {
            const blob = await loadImageRef.current(item.id);
            const url = window.URL.createObjectURL(blob);
            objectUrls.push(url);
            nextUrls[item.id] = url;
          } catch (error) {
            nextErrors[item.id] = error.message || 'Image unavailable';
          }
        })
      );

      if (isMounted) {
        setUrls(nextUrls);
        setErrors(nextErrors);
      } else {
        objectUrls.forEach((url) => window.URL.revokeObjectURL(url));
      }
    }

    if (items.length && typeof loadImageRef.current === 'function') {
      load();
    } else {
      setUrls({});
      setErrors({});
    }

    return () => {
      isMounted = false;
      objectUrls.forEach((url) => window.URL.revokeObjectURL(url));
    };
  }, [itemKey]);

  return { urls, errors };
}

function Lightbox({ items, urls, activeIndex, onClose, onDownload, onNavigate }) {
  const [zoomed, setZoomed] = useState(false);
  const [rotation, setRotation] = useState(0);
  const item = items[activeIndex];
  const src = item ? urls[item.id] : null;

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onNavigate(-1);
      if (event.key === 'ArrowRight') onNavigate(1);
      if (event.key === '+' || event.key === '=') setZoomed(true);
      if (event.key === '0' || event.key === '-') setZoomed(false);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNavigate]);

  useEffect(() => {
    setZoomed(false);
    setRotation(0);
  }, [activeIndex]);

  if (!item) return null;

  return (
    <div className="media-lightbox" role="dialog" aria-modal="true" aria-label={displayName(item)}>
      <div className="media-lightbox-toolbar">
        <div>
          <strong>{displayName(item)}</strong>
          <span>{activeIndex + 1} of {items.length}</span>
        </div>
        <div className="media-lightbox-actions">
          <button type="button" title="Zoom image" onClick={() => setZoomed((current) => !current)}><LuZoomIn /></button>
          <button type="button" title="Rotate image" onClick={() => setRotation((current) => current + 90)}><LuRotateCcw /></button>
          {onDownload ? <button type="button" title="Download image" onClick={() => onDownload(item)}><LuDownload /></button> : null}
          <button type="button" title="Close viewer" onClick={onClose}><LuX /></button>
        </div>
      </div>
      <button type="button" className="media-lightbox-nav media-lightbox-prev" title="Previous image" onClick={() => onNavigate(-1)} disabled={items.length < 2}>
        <LuChevronLeft />
      </button>
      <figure className={`media-lightbox-figure ${zoomed ? 'is-zoomed' : ''}`}>
        {src ? (
          <img src={src} alt={item.altText || displayName(item)} style={{ transform: `rotate(${rotation}deg)` }} />
        ) : (
          <div className="media-image-loading"><LuImage /> Loading image...</div>
        )}
        {item.caption ? <figcaption>{item.caption}</figcaption> : null}
      </figure>
      <button type="button" className="media-lightbox-nav media-lightbox-next" title="Next image" onClick={() => onNavigate(1)} disabled={items.length < 2}>
        <LuChevronRight />
      </button>
    </div>
  );
}

export function ImageGallery({
  title = 'Images',
  emptyTitle = 'No images yet.',
  emptyDescription = 'Images added for context will appear here.',
  items = [],
  loadImage,
  onDownload,
  onAddImages,
  remainingSlots = 0,
  isAdding = false,
}) {
  const uploadInputId = useId();
  const cameraInputId = useId();
  const normalizedItems = useMemo(
    () => items.filter((item) => item && item.id),
    [items]
  );
  const { urls, errors } = useProtectedImageUrls(normalizedItems, loadImage);
  const [activeIndex, setActiveIndex] = useState(null);

  function navigate(direction) {
    setActiveIndex((current) => {
      if (current == null || !normalizedItems.length) return current;
      return (current + direction + normalizedItems.length) % normalizedItems.length;
    });
  }

  async function addImages(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length || typeof onAddImages !== 'function') return;
    await onAddImages(files);
  }

  return (
    <div className="media-gallery">
      <div className="media-gallery-head">
        <div>
          <strong>{title}</strong>
          <span>{normalizedItems.length} image{normalizedItems.length === 1 ? '' : 's'}</span>
        </div>
        {onAddImages ? (
          <div className="media-gallery-actions">
            <label
              className={`media-gallery-add${isAdding || remainingSlots < 1 ? ' is-disabled' : ''}`}
              htmlFor={cameraInputId}
              title={remainingSlots < 1 ? 'Image limit reached' : 'Take a photo'}
            >
              <LuCamera aria-hidden="true" />
              <span>Take photo</span>
              <input
                id={cameraInputId}
                type="file"
                accept="image/*"
                capture="environment"
                disabled={isAdding || remainingSlots < 1}
                onChange={addImages}
              />
            </label>
            <label
              className={`media-gallery-add${isAdding || remainingSlots < 1 ? ' is-disabled' : ''}`}
              htmlFor={uploadInputId}
              title={remainingSlots < 1 ? 'Image limit reached' : 'Add images'}
            >
              <LuImagePlus aria-hidden="true" />
              <span>{isAdding ? 'Adding...' : 'Add images'}</span>
              <input
                id={uploadInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={isAdding || remainingSlots < 1}
                onChange={addImages}
              />
            </label>
          </div>
        ) : null}
      </div>
      {normalizedItems.length ? (
        <div className="media-gallery-grid">
          {normalizedItems.map((item, index) => (
            <button key={item.id} type="button" className="media-thumb" onClick={() => setActiveIndex(index)}>
              {urls[item.id] ? (
                <img src={urls[item.id]} alt={item.altText || displayName(item)} />
              ) : (
                <span><LuImage /> {errors[item.id] || 'Loading'}</span>
              )}
              <small>{displayName(item)}</small>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      )}
      {activeIndex != null ? (
        <Lightbox
          items={normalizedItems}
          urls={urls}
          activeIndex={activeIndex}
          onClose={() => setActiveIndex(null)}
          onDownload={onDownload}
          onNavigate={navigate}
        />
      ) : null}
    </div>
  );
}

export function ImageUploadPreview({
  files = [],
  limit,
  label = 'Add images',
  description,
  onAdd,
  onRemove,
  error = '',
}) {
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    const urls = files.map((file) => ({
      file,
      url: window.URL.createObjectURL(file),
    }));
    setPreviews(urls);
    return () => urls.forEach((preview) => window.URL.revokeObjectURL(preview.url));
  }, [files]);

  return (
    <div className="media-upload-panel">
      <div className="media-upload-head">
        <div>
          <strong>{label}</strong>
          {description ? <p>{description}</p> : null}
        </div>
        <span>{files.length}/{limit}</span>
      </div>
      <label className="media-upload-dropzone">
        <LuImage />
        <span>Select JPG, PNG, or WEBP images</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onAdd} />
      </label>
      {error ? <p className="ui-field-error">{error}</p> : null}
      {previews.length ? (
        <div className="media-upload-preview-grid">
          {previews.map((preview, index) => (
            <figure key={`${preview.file.name}-${index}`}>
              <img src={preview.url} alt={preview.file.name} />
              <figcaption>{preview.file.name}</figcaption>
              <button type="button" title="Remove image" onClick={() => onRemove(index)}><LuX /></button>
            </figure>
          ))}
        </div>
      ) : null}
    </div>
  );
}
