import React from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GoogleDriveGallery from '../components/GoogleDriveGallery';
import { Share2, DownloadCloud, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';

// Global request queue to prevent simultaneous API calls
let requestQueue: Array<() => Promise<void>> = [];
let isProcessingQueue = false;

const processRequestQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return;

  isProcessingQueue = true;
  while (requestQueue.length > 0) {
    const request = requestQueue.shift();
    if (request) {
      try {
        await request();
        // Add delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Request queue error:', error);
      }
    }
  }
  isProcessingQueue = false;
};

const addToRequestQueue = (request: () => Promise<void>) => {
  requestQueue.push(request);
  processRequestQueue();
};

// Enhanced Image Modal Component with Gallery Navigation
const ImageModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  photos: Array<{ id: number; src: string; alt: string; name: string; fullSrc: string; download: string }>;
  selectedIndex: number;
  onNavigate: (index: number) => void;
}> = ({ isOpen, onClose, photos, selectedIndex, onNavigate }) => {
  if (!isOpen || selectedIndex === null) return null;

  const currentPhoto = photos[selectedIndex];

  const nextImage = () => {
    onNavigate((selectedIndex + 1) % photos.length);
  };

  const prevImage = () => {
    onNavigate(selectedIndex === 0 ? photos.length - 1 : selectedIndex - 1);
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [isOpen, selectedIndex]);

  // Download the currently viewed image (prefer webContentLink/fullSrc)
  const downloadCurrentImage = async () => {
    try {
      const imageUrl = currentPhoto.download || currentPhoto.fullSrc || currentPhoto.src;
      if (!imageUrl) throw new Error('No image URL available');

      // Fetch the image as a blob and create an object URL to force download
      // const response = await fetch(imageUrl);
      // if (!response.ok) throw new Error('Failed to fetch image for download');
      // const blob = await response.blob();
      // const objectUrl = URL.createObjectURL(blob);

      const fileName = (currentPhoto.name || `wedding-photo-${selectedIndex + 1}`).replace(/[^a-z0-9._-]/gi, '_');
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // revoke the created object url
      URL.revokeObjectURL(imageUrl);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Unable to download the image. Please try again.');
    }
  };


  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-2 md:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative max-w-4xl max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={downloadCurrentImage}
          className="absolute top-2 right-12 md:top-4 md:right-16 z-10 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
          title="Download Image"
        >
          <DownloadCloud className="h-6 w-6" />
        </button>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 md:top-4 md:right-4 z-10 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Navigation Buttons */}
        {photos.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>

            <button
              onClick={nextImage}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          </>
        )}

        {/* Image Container */}
        <div className="rounded-xl md:rounded-2xl overflow-hidden max-h-[80vh] max-w-full">
          <img
            src={currentPhoto.fullSrc || currentPhoto.src}
            alt={currentPhoto.alt}
            className="w-full h-full object-contain"
            onError={(e) => {
              // Fallback to thumbnail if full image fails
              const target = e.target as HTMLImageElement;
              if (target.src !== currentPhoto.src) {
                target.src = currentPhoto.src;
              }
            }}
          />
        </div>

        {/* Photo Info */}
        <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white text-center">
          <p className="text-sm md:text-base font-medium">{currentPhoto.download || currentPhoto.alt}</p>
          <p className="text-xs text-gray-300 mt-1">{selectedIndex + 1} of {photos.length}</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Enhanced Wedding Gallery with View Image functionality
const WeddingGalleryWithView: React.FC<{ onPhotosAvailable: (hasPhotos: boolean) => void }> = ({ onPhotosAvailable }) => {
  const [photos, setPhotos] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = React.useState<number | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const [lastRequestTime, setLastRequestTime] = React.useState(0);

  const checkWeddingPhotos = React.useCallback(async (isRetry = false) => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    // Throttle requests to avoid 429 errors (minimum 1 second between requests)
    if (!isRetry && timeSinceLastRequest < 1000) {
      const waitTime = 1000 - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    try {
      const API_KEY = 'AIzaSyBNn-27uk3XXKmsj8PtZJwWc7ZBcz-ouRo';
      const FOLDER_ID = '1RE_611tbYddCK2uQoTDKl3KSY85RLbTU';
      let allFiles: any[] = [];
      let pageToken: string | undefined = undefined;

      do {
        // request webContentLink and thumbnailLink so we can provide direct download URLs
        const fields = 'nextPageToken,files(id,name,webViewLink,webContentLink,thumbnailLink)';
        const pageParam = pageToken ? `&pageToken=${pageToken}` : '';
        const url = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+mimeType+contains+'image/'&fields=${fields}&pageSize=100${pageParam}&key=${API_KEY}`;

        const response = await fetch(url);
        setLastRequestTime(Date.now());

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('Access denied. Please ensure the Google Drive folder is publicly shared.');
          } else if (response.status === 429) {
            if (retryCount < 3) {
              const backoffTime = Math.pow(2, retryCount) * 2000;
              console.log(`Rate limited. Retrying wedding photos in ${backoffTime}ms...`);
              await new Promise(resolve => setTimeout(resolve, backoffTime));
              setRetryCount(prev => prev + 1);
              continue; // retry current page
            }
            throw new Error('API rate limit exceeded. Please try again later.');
          } else {
            throw new Error(`Failed to fetch images: ${response.status} ${response.statusText}`);
          }
        }

        const data = await response.json();
        if (data.files && data.files.length > 0) {
          allFiles.push(...data.files);
        }
        pageToken = data.nextPageToken;
      } while (pageToken);

      const hasPhotos = allFiles.length > 0;
      setPhotos(allFiles);
      setRetryCount(0);
      onPhotosAvailable(hasPhotos);
    } catch (error) {
      console.error('Error checking wedding photos:', error);
      onPhotosAvailable(false);
    } finally {
      setLoading(false);
    }
  }, [lastRequestTime, retryCount, onPhotosAvailable]);

  React.useEffect(() => {
    addToRequestQueue(() => checkWeddingPhotos());
  }, [checkWeddingPhotos]);

  if (loading) {
    return (
      <div className="mb-8 p-6 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 text-center">
        <div className="animate-pulse">
          <div className="h-6 bg-purple-200 rounded w-48 mx-auto mb-2"></div>
          <div className="h-4 bg-purple-100 rounded w-64 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (photos.length === 0) return null;

  const formattedPhotos = photos.map((photo, index) => ({
    id: index + 1,
    src: `https://drive.google.com/thumbnail?id=${photo.id}&sz=w1000`,
    alt: photo.name,
    name: photo.name,
    // prefer webContentLink if provided by API, otherwise fallback to a uc?export=download URL
    download: photo.webContentLink || `https://drive.google.com/uc?export=download&id=${photo.id}`,
    fullSrc: `https://drive.google.com/uc?export=view&id=${photo.id}`
  }));

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 p-6 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50"
      >
        <h3 className="text-2xl font-bold mb-2 text-center">
          <span className="inline-block px-3 py-1 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            Live Wedding Gallery
          </span>
        </h3>
        <p className="text-purple-700 text-center mb-6">Fresh photos from our special day!</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {formattedPhotos.map((photo, index) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="cursor-pointer"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="relative overflow-hidden rounded-xl shadow-lg aspect-square bg-gray-100">
                <img
                  src={photo.src}
                  alt={photo.alt}
                  className="w-full h-full object-cover transition-transform duration-500"
                />

                {/* Explicit overlay buttons (visible) */}
                <div className="absolute inset-0 flex flex-col gap-3 items-center justify-center p-3">
                  <button
                    onClick={() => setSelectedImageIndex(index)}
                    className="bg-white/90 hover:bg-white px-4 py-2 rounded-full flex items-center space-x-2 text-sm shadow-lg"
                    aria-label={`View image ${photo.alt}`}
                  >
                    <Eye className="h-4 w-4 text-gray-700" />
                    <span className="text-gray-700 font-medium">View Image</span>
                  </button>

                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const p = photos[index];
                        const imageUrl = p.webContentLink || p.download || p.fullSrc || `https://drive.google.com/uc?export=download&id=${p.id}` || p.src;
                        if (!imageUrl) throw new Error('No download URL');

                        // const res = await fetch(imageUrl);
                        // if (!res.ok) throw new Error('Failed to fetch image');
                        // const blob = await res.blob();
                        // const objectUrl = URL.createObjectURL(blob);
                        const fileName = (p.name || `wedding-photo-${index + 1}`).replace(/[^a-z0-9._-]/gi, '_');
                        const a = document.createElement('a');
                        a.href = imageUrl;
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(imageUrl);
                      } catch (error) {
                        console.error('Download failed:', error);
                        alert('Unable to download the image. Please try again.');
                      }
                    }}
                    className="bg-white/90 hover:bg-white px-4 py-2 rounded-full flex items-center space-x-2 text-sm shadow-lg"
                    aria-label={`Download image ${photo.alt}`}
                  >
                    <DownloadCloud className="h-4 w-4 text-gray-700" />
                    <span className="text-gray-700 font-medium">Download</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <ImageModal
        isOpen={selectedImageIndex !== null}
        onClose={() => setSelectedImageIndex(null)}
        photos={formattedPhotos}
        selectedIndex={selectedImageIndex || 0}
        onNavigate={setSelectedImageIndex}
      />
    </>
  );
};

// Wrapper component for Reception Gallery
const ReceptionGallery: React.FC<{ onPhotosAvailable: (hasPhotos: boolean) => void }> = ({ onPhotosAvailable }) => {
  const [photos, setPhotos] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [retryCount, setRetryCount] = React.useState(0);
  const [lastRequestTime, setLastRequestTime] = React.useState(0);

  const checkReceptionPhotos = React.useCallback(async (isRetry = false) => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    // Throttle requests to avoid 429 errors (minimum 1 second between requests)
    if (!isRetry && timeSinceLastRequest < 1000) {
      const waitTime = 1000 - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    try {
      const API_KEY = 'AIzaSyBNn-27uk3XXKmsj8PtZJwWc7ZBcz-ouRo';
      const FOLDER_ID = '1W3_aUFcDsB8HRodZ7_dZPDsqQ3zM81sY';
      let allFiles: any[] = [];
      let pageToken: string | undefined = undefined;

      do {
        const fields = 'nextPageToken,files(id,name,webViewLink,webContentLink,thumbnailLink)';
        const pageParam = pageToken ? `&pageToken=${pageToken}` : '';
        const url = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+mimeType+contains+'image/'&fields=${fields}&pageSize=100${pageParam}&key=${API_KEY}`;

        const response = await fetch(url);
        setLastRequestTime(Date.now());

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('Access denied. Please ensure the Google Drive folder is publicly shared.');
          } else if (response.status === 429) {
            if (retryCount < 3) {
              const backoffTime = Math.pow(2, retryCount) * 2000;
              console.log(`Rate limited. Retrying reception photos in ${backoffTime}ms...`);
              await new Promise(resolve => setTimeout(resolve, backoffTime));
              setRetryCount(prev => prev + 1);
              continue; // retry current page
            }
            throw new Error('API rate limit exceeded. Please try again later.');
          } else {
            throw new Error(`Failed to fetch images: ${response.status} ${response.statusText}`);
          }
        }

        const data = await response.json();
        if (data.files && data.files.length > 0) {
          allFiles.push(...data.files);
        }
        pageToken = data.nextPageToken;
      } while (pageToken);

      const hasPhotos = allFiles.length > 0;
      setPhotos(allFiles);
      setRetryCount(0);
      onPhotosAvailable(hasPhotos);
    } catch (error) {
      console.error('Error checking reception photos:', error);
      onPhotosAvailable(false);
    } finally {
      setLoading(false);
    }
  }, [lastRequestTime, retryCount, onPhotosAvailable]);

  React.useEffect(() => {
    addToRequestQueue(() => checkReceptionPhotos());
  }, [checkReceptionPhotos]);

  if (loading) {
    return (
      <div className="mb-8 p-6 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 text-center">
        <div className="animate-pulse">
          <div className="h-6 bg-emerald-200 rounded w-48 mx-auto mb-2"></div>
          <div className="h-4 bg-emerald-100 rounded w-64 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (photos.length === 0) return null;

  return (
    <GoogleDriveGallery
      className="mb-8"
      folderId="1W3_aUFcDsB8HRodZ7_dZPDsqQ3zM81sY"
      title="Live Reception Gallery"
      description="Beautiful moments from our reception!"
      gradientFrom="emerald-400"
      gradientTo="green-600"
      textColor="text-emerald-800"
    />
  );
};

// Grid that shows only the "now" photos (01..20) and a per-photo share button
const NowPhotosGrid: React.FC = () => {
  const [hasWeddingPhotos, setHasWeddingPhotos] = React.useState<boolean | null>(null);
  const [hasReceptionPhotos, setHasReceptionPhotos] = React.useState<boolean | null>(null);

  // load assets via Vite glob
  const assets = import.meta.glob('../assets/*.{jpg,jpeg,png,webp}', { as: 'url', eager: true }) as Record<string, string>;

  const getAsset = (filename: string) => {
    const entry = Object.entries(assets).find(([path]) => path.endsWith(`/${filename}`));
    return entry ? entry[1] : '';
  };

  const nowPhotos = Array.from({ length: 20 }, (_, i) => {
    const jpg = String(i + 1).padStart(2, '0') + '.jpg';
    const png = String(i + 1).padStart(2, '0') + '.png';
    const webp = String(i + 1).padStart(2, '0') + '.webp';
    return {
      id: i + 1,
      src: getAsset(webp) || getAsset(jpg) || getAsset(png) || '',
      alt: `Recent photo ${i + 1}`,
    };
  }).filter(p => p.src);

  // loading state for thumbnails
  const [loaded, setLoaded] = React.useState<Record<string, boolean>>({});
  const handleLoad = (src: string) => setLoaded((s) => ({ ...s, [src]: true }));

  // small thumbnails for Wedding and Reception sections
  const weddingThumbs = ['11.jpg', '12.jpg', '13.jpg'].map((n) => getAsset(n)).filter((s) => !!s) as string[];
  const receptionThumbs = ['14.jpg', '15.jpg', '16.jpg'].map((n) => getAsset(n)).filter((s) => !!s) as string[];

  // countdown helpers
  const calcRemaining = (target: Date) => {
    const total = Math.max(0, target.getTime() - Date.now());
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((total / (1000 * 60)) % 60);
    const seconds = Math.floor((total / 1000) % 60);
    return { days, hours, minutes, seconds };
  };

  const [weddingLeft, setWeddingLeft] = React.useState(() => calcRemaining(new Date('2025-08-31T10:00:00')));
  const [receptionLeft, setReceptionLeft] = React.useState(() => calcRemaining(new Date('2025-09-01T19:00:00')));

  React.useEffect(() => {
    const weddingDate = new Date('2025-08-31T10:00:00');
    const receptionDate = new Date('2025-09-01T19:00:00');
    const id = setInterval(() => {
      setWeddingLeft(calcRemaining(weddingDate));
      setReceptionLeft(calcRemaining(receptionDate));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const sharePhoto = async (photoUrl: string) => {
    try {
      // feature-detect Web Share API
      const nav = navigator as Navigator & { share?: (data: { title?: string; text?: string; url?: string }) => Promise<void> };
      if (typeof nav.share === 'function') {
        await nav.share({ title: 'Live Wedding Photo', text: 'Check out this photo from our wedding gallery', url: photoUrl });
        return;
      }

      // Fallback: copy the absolute URL to clipboard
      await navigator.clipboard.writeText(photoUrl);
      // minimal feedback
      alert('Photo URL copied to clipboard. Share it with your friends!');
    } catch (err) {
      console.error('Share failed', err);
      alert('Unable to share or copy the photo URL.');
    }
  };

  const downloadPhoto = async (photoUrl: string, id: number) => {
    try {
      const res = await fetch(photoUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const parts = photoUrl.split('.');
      const ext = parts[parts.length - 1].split('?')[0] || 'jpg';
      const a = document.createElement('a');
      a.href = url;
      a.download = `save-the-date-${String(id).padStart(2, '0')}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
      alert('Unable to download the photo.');
    }
  };

  return (
    <div>
      {/* Wedding Photos Coming Soon (hide when photos are available, show loading state initially) */}
      {hasWeddingPhotos === null ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-6 rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 text-center border border-dashed border-gray-200"
        >
          <div className="animate-pulse">
            <div className="h-6 bg-yellow-200 rounded w-48 mx-auto mb-2"></div>
            <div className="h-4 bg-yellow-100 rounded w-64 mx-auto"></div>
          </div>
        </motion.div>
      ) : hasWeddingPhotos === false ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-6 rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 text-center border border-dashed border-gray-200"
        >
          <h4 className="text-xl font-semibold mb-2 inline-block px-3 py-1 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white">Wedding Photos — Coming Soon</h4>
          <p className="text-rose-700 mt-3">Live uploads and the complete wedding gallery will appear here on the wedding day.</p>

          {/* Wedding countdown */}
          <div className="mt-4 flex items-center justify-center space-x-3">
            {weddingLeft.days > 0 || weddingLeft.hours > 0 || weddingLeft.minutes > 0 || weddingLeft.seconds > 0 ? (
              [{ label: 'Days', value: weddingLeft.days }, { label: 'Hours', value: weddingLeft.hours }, { label: 'Minutes', value: weddingLeft.minutes }, { label: 'Seconds', value: weddingLeft.seconds }].map((it) => (
                <div key={it.label} className="bg-white/90 text-rose-700 px-3 py-2 rounded-md shadow-sm">
                  <div className="font-bold text-lg">{String(it.value).padStart(2, '0')}</div>
                  <div className="text-xs">{it.label}</div>
                </div>
              ))
            ) : (
              <div className="text-rose-700 font-semibold text-lg">
                🎉 The Wedding Day is Here! 🎉
              </div>
            )}
          </div>

          {/* Wedding thumbnails (loading placeholders) */}
          <div className="mt-4 flex justify-center space-x-3">
            {weddingThumbs.map((src) => (
              <div key={src} className="w-24 h-16 rounded overflow-hidden bg-gray-100 relative">
                {!loaded[src] && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
                <img
                  src={src}
                  alt="wedding thumb"
                  loading="lazy"
                  onLoad={() => handleLoad(src)}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${loaded[src] ? 'opacity-100' : 'opacity-0'}`}
                />
              </div>
            ))}
          </div>
        </motion.div>
      ) : null}

      {/* Wedding Gallery - shows when photos are available */}
      <WeddingGalleryWithView onPhotosAvailable={setHasWeddingPhotos} />

      {/* Reception section - hide timer when photos are available, show loading state initially */}
      {hasReceptionPhotos === null ? (
        <div className="mb-8 text-center p-4 rounded-md bg-white/30">
          <div className="animate-pulse">
            <div className="h-6 bg-emerald-200 rounded w-32 mx-auto mb-2"></div>
            <div className="h-4 bg-emerald-100 rounded w-48 mx-auto"></div>
          </div>
        </div>
      ) : hasReceptionPhotos === false ? (
        <div className="mb-8 text-center p-4 rounded-md bg-white/30">
          <h3 className="text-xl font-semibold mb-2 inline-block px-3 py-1 rounded-md bg-gradient-to-r from-emerald-400 to-green-600 text-white">Reception</h3>
          <p className="text-emerald-800 text-sm">Live uploads and the reception gallery will appear here during and after the reception.</p>

          {/* Reception countdown */}
          <div className="mt-4 flex items-center justify-center space-x-3">
            {receptionLeft.days > 0 || receptionLeft.hours > 0 || receptionLeft.minutes > 0 || receptionLeft.seconds > 0 ? (
              [{ label: 'Days', value: receptionLeft.days }, { label: 'Hours', value: receptionLeft.hours }, { label: 'Minutes', value: receptionLeft.minutes }, { label: 'Seconds', value: receptionLeft.seconds }].map((it) => (
                <div key={it.label} className="bg-white/90 text-emerald-800 px-3 py-2 rounded-md shadow-sm">
                  <div className="font-bold text-lg">{String(it.value).padStart(2, '0')}</div>
                  <div className="text-xs">{it.label}</div>
                </div>
              ))
            ) : (
              <div className="text-emerald-800 font-semibold text-lg">
                🎉 Reception Time is Here! 🎉
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-center space-x-3">
            {receptionThumbs.map((src) => (
              <div key={src} className="w-24 h-16 rounded overflow-hidden bg-gray-100 relative">
                {!loaded[src] && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
                <img
                  src={src}
                  alt="reception thumb"
                  loading="lazy"
                  onLoad={() => handleLoad(src)}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${loaded[src] ? 'opacity-100' : 'opacity-0'}`}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Reception Gallery - shows when photos are available */}
      <ReceptionGallery onPhotosAvailable={setHasReceptionPhotos} />

      {/* Save the Date section with Download All and Timer */}
      <div className="mb-8 text-center">
        <h3 className="text-2xl md:text-3xl font-bold mb-2 inline-block px-3 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-white">Save the Date</h3>
        <p className="text-orange-700 mb-4">These are our Save-the-Date photos — download and share with loved ones.</p>

        {/* Save the Date countdown */}
        <div className="mb-6">
          <p className="text-orange-800 font-semibold mb-3">Time until our special day:</p>
          <div className="flex items-center justify-center space-x-3">
            {weddingLeft.days > 0 || weddingLeft.hours > 0 || weddingLeft.minutes > 0 || weddingLeft.seconds > 0 ? (
              [{ label: 'Days', value: weddingLeft.days }, { label: 'Hours', value: weddingLeft.hours }, { label: 'Minutes', value: weddingLeft.minutes }, { label: 'Seconds', value: weddingLeft.seconds }].map((it) => (
                <div key={it.label} className="bg-white/90 text-orange-800 px-3 py-2 rounded-md shadow-sm">
                  <div className="font-bold text-lg">{String(it.value).padStart(2, '0')}</div>
                  <div className="text-xs">{it.label}</div>
                </div>
              ))
            ) : (
              <div className="text-orange-800 font-semibold text-lg">
                🎉 The Wedding Day is Here! 🎉
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center">
          <button
            onClick={async () => {
              // download all photos sequentially
              for (const photo of nowPhotos) {
                try {
                  const res = await fetch(photo.src);
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const parts = photo.src.split('.');
                  const ext = parts[parts.length - 1].split('?')[0] || 'jpg';
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `save-the-date-${String(photo.id).padStart(2, '0')}.${ext}`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                } catch (err) {
                  console.error('Failed to download', err);
                }
              }
              alert('Downloads started — check your browser\'s downloads.');
            }}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-full shadow-md hover:brightness-105 transition"
          >
            <DownloadCloud className="h-5 w-5" />
            <span>Download All</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {nowPhotos.map((photo) => (
          <div key={photo.id} className="relative rounded-lg overflow-hidden shadow-md">
            <img src={photo.src} alt={photo.alt} className="w-full h-44 object-cover" />
            <div className="absolute top-2 right-2 flex space-x-2">
              <button
                onClick={() => sharePhoto(photo.src)}
                className="bg-white/80 hover:bg-white px-2 py-1 rounded-full flex items-center space-x-1 text-sm shadow-sm"
                aria-label={`Share photo ${photo.id}`}
              >
                <Share2 className="h-4 w-4 text-gray-700" />
                <span className="hidden md:inline">Share</span>
              </button>
              <button
                onClick={() => downloadPhoto(photo.src, photo.id)}
                className="bg-white/80 hover:bg-white px-2 py-1 rounded-full flex items-center space-x-1 text-sm shadow-sm"
                aria-label={`Download photo ${photo.id}`}
              >
                <DownloadCloud className="h-4 w-4 text-gray-700" />
                <span className="hidden md:inline">Download</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const GalleryPage: React.FC = () => {
  // Firework confetti effect on page load
  React.useEffect(() => {
    const firework = () => {
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);

        // since particles fall down, start a bit higher than random
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);
    };

    // Trigger firework after a short delay
    const timer = setTimeout(firework, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <NowPhotosGrid />
      </div>
      <Footer />
    </motion.div>
  );
};

export default GalleryPage;