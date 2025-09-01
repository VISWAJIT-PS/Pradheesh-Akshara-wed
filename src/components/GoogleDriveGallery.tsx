import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Image as ImageIcon, AlertCircle, Download, Share2, Eye, X, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

// Global cache for Google Drive images to prevent re-fetching on tab switches
const imageCache = new Map<string, { images: DriveImage[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

interface DriveImage {
  id: string;
  name: string;
  webViewLink: string;
  webContentLink: string;
  thumbnailLink: string;
  mimeType: string;
}

interface GoogleDriveGalleryProps {
  className?: string;
  folderId: string;
  title: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
  textColor: string;
}

// Enhanced Image Modal Component with Gallery Navigation
const ImageModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  images: DriveImage[];
  selectedIndex: number;
  onNavigate: (index: number) => void;
}> = ({ isOpen, onClose, images, selectedIndex, onNavigate }) => {
  if (!isOpen || selectedIndex === null || !images[selectedIndex]) return null;

  const currentImage = images[selectedIndex];

  const nextImage = () => {
    onNavigate((selectedIndex + 1) % images.length);
  };

  const prevImage = () => {
    onNavigate(selectedIndex === 0 ? images.length - 1 : selectedIndex - 1);
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

  // Download the currently viewed image
  const downloadCurrentImage = async () => {
    try {
      // Try multiple download approaches for better browser compatibility
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${currentImage.id}`;
      
      // Method 1: Direct download with proper filename
      const fileName = (currentImage.name || `photo-${selectedIndex + 1}`).replace(/[^a-z0-9._-]/gi, '_');
      
      // Create download link
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      console.log('Modal download initiated for:', currentImage.name);
      showToast('Download started! Check your Downloads folder.', 'success');
      
    } catch (error) {
      console.error('Modal download failed:', error);
      
      // Fallback: try direct Google Drive download
      try {
        const fallbackUrl = `https://drive.google.com/uc?export=download&id=${currentImage.id}&confirm=t`;
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      } catch (fallbackError) {
        console.error('Modal fallback failed:', fallbackError);
        alert('Unable to download the image. Please try again.');
      }
    }
  };

  const getFullImageUrl = (image: DriveImage) => {
    return image.webContentLink || `https://drive.google.com/uc?export=view&id=${image.id}`;
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
        {/* Download Button */}
        <button
          onClick={async () => {
            try {
              await downloadCurrentImage();
              // Provide user feedback
              const button = document.querySelector('[title="Download Image"]') as HTMLElement;
              if (button) {
                const originalClass = button.className;
                button.className = originalClass + ' bg-green-500/80';
                setTimeout(() => {
                  button.className = originalClass;
                }, 1500);
              }
            } catch (error) {
              console.error('Download failed:', error);
            }
          }}
          className="absolute top-2 right-12 md:top-4 md:right-16 z-10 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
          title="Download Image"
        >
          <Download className="h-6 w-6" />
        </button>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 md:top-4 md:right-4 z-10 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Navigation Buttons */}
        {images.length > 1 && (
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
            src={getFullImageUrl(currentImage)}
            alt={currentImage.name}
            className="w-full h-full object-contain"
            onError={(e) => {
              // Fallback to thumbnail if full image fails
              const target = e.target as HTMLImageElement;
              const thumbnailUrl = currentImage.thumbnailLink || `https://drive.google.com/thumbnail?id=${currentImage.id}&sz=w1000`;
              if (target.src !== thumbnailUrl) {
                target.src = thumbnailUrl;
              }
            }}
          />
        </div>

        {/* Photo Info */}
        <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white text-center">
          <p className="text-sm md:text-base font-medium">{currentImage.name}</p>
          <p className="text-xs text-gray-300 mt-1">{selectedIndex + 1} of {images.length}</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

const GoogleDriveGallery: React.FC<GoogleDriveGalleryProps> = ({ 
  className = '', 
  folderId, 
  title, 
  description, 
  gradientFrom, 
  gradientTo, 
  textColor 
}) => {
  const [images, setImages] = useState<DriveImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [retryCount, setRetryCount] = useState(0);
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const [openDownloadIndex, setOpenDownloadIndex] = useState<string | null>(null);
  const [fetchComplete, setFetchComplete] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // Google Drive API configuration
  const API_KEY = 'AIzaSyBNn-27uk3XXKmsj8PtZJwWc7ZBcz-ouRo';
  const FOLDER_ID = folderId;

  const fetchGoogleDriveImages = useCallback(async (isRetry = false) => {
    // Check cache first
    const cacheKey = `folder-${FOLDER_ID}`;
    const cached = imageCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION && !isRetry) {
      console.log('Using cached images for folder:', FOLDER_ID);
      setImages(cached.images);
      setFetchComplete(true);
      setLoading(false);
      return;
    }
    
    // Prevent multiple simultaneous fetches
    if (loading && !isRetry) {
      console.log('Already loading, skipping fetch for:', FOLDER_ID);
      return;
    }
    
    const timeSinceLastRequest = now - lastRequestTime;
    
    // Throttle requests to avoid 429 errors (minimum 2 seconds between requests)
    if (!isRetry && timeSinceLastRequest < 2000) {
      const waitTime = 2000 - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Paginate through Google Drive results (pageSize=100)
      let allFiles: any[] = [];
      let pageToken: string | undefined = undefined;

      do {
        const fields = 'nextPageToken,files(id,name,webViewLink,webContentLink,thumbnailLink,mimeType)';
        const pageParam = pageToken ? `&pageToken=${pageToken}` : '';
        const url = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+mimeType+contains+'image/'&fields=${fields}&pageSize=100${pageParam}&key=${API_KEY}`;

        const response = await fetch(url);
        setLastRequestTime(Date.now());

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('Access denied. Please ensure the Google Drive folder is publicly shared with "Anyone with the link can view".');
          } else if (response.status === 429) {
            // Implement exponential backoff for 429 errors
            if (retryCount < 3) {
              const backoffTime = Math.pow(2, retryCount) * 3000; // 3s, 6s, 12s
              console.log(`Rate limited. Retrying in ${backoffTime}ms...`);
              await new Promise(resolve => setTimeout(resolve, backoffTime));
              setRetryCount(prev => prev + 1);
              // retry the same page
              continue;
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

      if (allFiles.length > 0) {
        const processedImages: DriveImage[] = allFiles.map((file: any) => ({
          id: file.id,
          name: file.name || 'Untitled',
          webViewLink: file.webViewLink || '',
          webContentLink: file.webContentLink || '',
          thumbnailLink: file.thumbnailLink || `https://drive.google.com/thumbnail?id=${file.id}&sz=w400-h300`,
          mimeType: file.mimeType || 'image/jpeg'
        }));

        setImages(processedImages);
        setRetryCount(0);
        setFetchComplete(true);
        
        // Cache the results
        imageCache.set(cacheKey, { images: processedImages, timestamp: now });
        console.log('Cached images for folder:', FOLDER_ID, 'Count:', processedImages.length);
      } else {
        setImages([]);
        setFetchComplete(true);
        // Cache empty result too
        imageCache.set(cacheKey, { images: [], timestamp: now });
      }
    } catch (err) {
      console.error('Error fetching Google Drive images:', err);
      setError(err instanceof Error ? err.message : 'Failed to load images from Google Drive');
      setFetchComplete(true);
    } finally {
      setLoading(false);
    }
  }, [FOLDER_ID, API_KEY, lastRequestTime, retryCount, loading]);

  // Reset state when folderId changes
  useEffect(() => {
    setFetchComplete(false);
    setError(null);
    setRetryCount(0);
    setImages([]);
    setLoading(true);
  }, [folderId]);

  useEffect(() => {
    const cacheKey = `folder-${FOLDER_ID}`;
    const cached = imageCache.get(cacheKey);
    const now = Date.now();
    
    // If we have valid cached data, use it immediately
    if (cached && (now - cached.timestamp) < CACHE_DURATION && !fetchComplete) {
      console.log('Loading from cache on mount:', FOLDER_ID);
      setImages(cached.images);
      setFetchComplete(true);
      setLoading(false);
      return;
    }
    
    // Only fetch if we don't have cache and haven't started fetching
    if (!fetchComplete && !loading) {
      console.log('Fetching fresh data for:', FOLDER_ID);
      fetchGoogleDriveImages();
    }
  }, [FOLDER_ID, fetchGoogleDriveImages, fetchComplete, loading]);

  const handleImageLoad = (imageId: string) => {
    setLoadedImages(prev => ({ ...prev, [imageId]: true }));
  };

  const getDirectImageUrl = (image: DriveImage) => {
    // Use thumbnail link for display, which is more reliable
    return image.thumbnailLink || `https://drive.google.com/thumbnail?id=${image.id}&sz=w400-h300`;
  };

  const getFullImageUrl = (image: DriveImage) => {
    // Use webContentLink if available, otherwise try direct export
    return image.webContentLink || `https://drive.google.com/uc?export=view&id=${image.id}`;
  };

  // Simple toast notification function
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 p-3 rounded-lg shadow-lg text-white transition-all transform translate-x-full ${
      type === 'success' ? 'bg-green-500' : 
      type === 'error' ? 'bg-red-500' : 
      'bg-blue-500'
    }`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  };

  const downloadImage = async (image: DriveImage) => {
    try {
      // Show immediate feedback to user
      showToast('Starting download...', 'info');
      
      // Try multiple download approaches for better browser compatibility
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${image.id}`;
      
      // Method 1: Try blob download first (works better on mobile and Safari)
      try {
        const response = await fetch(`https://drive.google.com/uc?export=view&id=${image.id}`, {
          mode: 'no-cors'
        });
        
        // Create download link with proper filename and extension
        const fileName = (image.name || `photo-${image.id}`).replace(/[^a-z0-9._-]/gi, '_');
        const fileExt = fileName.includes('.') ? '' : '.jpg'; // Add extension if missing
        
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName + fileExt;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        
        // For iOS Safari compatibility
        if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
          a.setAttribute('download', fileName + fileExt);
        }
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        console.log('Download initiated for:', image.name);
        showToast('Download started! Check your Downloads folder.', 'success');
        return;
        
      } catch (fetchError) {
        console.log('Fetch method failed, trying direct download:', fetchError);
      }
      
      // Method 2: Direct download URL (fallback)
      const directUrl = `https://drive.google.com/uc?export=download&id=${image.id}&confirm=t`;
      const fileName = (image.name || `photo-${image.id}`).replace(/[^a-z0-9._-]/gi, '_');
      const fileExt = fileName.includes('.') ? '' : '.jpg';
      
      // Create temporary link
      const link = document.createElement('a');
      link.href = directUrl;
      link.download = fileName + fileExt;
      link.target = '_blank';
      
      // Add to DOM and click
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Direct download initiated for:', image.name);
      showToast('Download started! Check your Downloads folder.', 'success');
      
    } catch (error) {
      console.error('Error downloading image:', error);
      
      // Method 3: Open in new tab as final fallback
      try {
        const fallbackUrl = `https://drive.google.com/file/d/${image.id}/view`;
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
        alert('Download failed. The image has been opened in a new tab. You can save it manually from there.');
        showToast('Opening image in new tab for manual download', 'info');
      } catch (fallbackError) {
        console.error('All download methods failed:', fallbackError);
        alert('Download failed. Please try again or check your internet connection.');
        showToast('Download failed. Please try again.', 'error');
      }
    }
  };


  const shareImage = async (image: DriveImage) => {
    // Use the shareable Google Drive URL instead of direct image URL
    const shareUrl = `https://drive.google.com/file/d/${image.id}/view?usp=sharing`;
    const shareData = {
      title: `Wedding Photo: ${image.name}`,
      text: `Check out this beautiful photo from Pradheesh & Akshara's wedding!`,
      url: shareUrl
    };

    try {
      // Check if Web Share API is supported (mainly mobile)
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        console.log('Shared successfully via Web Share API');
      } else {
        // Fallback: copy URL to clipboard
        await navigator.clipboard.writeText(shareUrl);
        alert('Photo link copied to clipboard! Share it with your friends.');
        console.log('Photo URL copied to clipboard:', shareUrl);
      }
    } catch (error) {
      console.error('Error sharing image:', error);
      
      // Final fallback: manual copy instruction
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Photo link copied to clipboard! Share it with your friends.');
      } catch (clipboardError) {
        console.error('Clipboard access failed:', clipboardError);
        // Show the URL to user for manual copy
        prompt('Copy this link to share the photo:', shareUrl);
      }
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`bg-white/60 rounded-lg p-8 text-center ${className}`}
      >
        <Loader2 className="h-8 w-8 text-pink-500 animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`bg-red-50 border border-red-200 rounded-lg p-8 text-center ${className}`}
      >
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-700 mb-2">Unable to Load Photos</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => {
            setFetchComplete(false);
            fetchGoogleDriveImages();
          }}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Try Again</span>
        </button>
      </motion.div>
    );
  }

  if (images.length === 0) {
    return null; // Don't render anything if no photos
  }

  return (
    <div className={className}>
      {/* Centered Header */}
      <div className="text-center mb-8">
        <div className="mb-4">
          <h3 className={`text-2xl md:text-3xl font-bold mb-2 inline-block px-3 py-1 rounded-lg bg-gradient-to-r from-${gradientFrom} to-${gradientTo} text-white`}>
            {title}
          </h3>
          <p className={`${textColor} mt-2`}>{description} ({images.length} photos)</p>
        </div>
      </div>

      {/* Image Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
      >
        {images.map((image, index) => (
          <motion.div
            key={image.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="group"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <div className="relative overflow-hidden rounded-lg shadow-md aspect-square bg-gray-100">
              {!loadedImages[image.id] && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <img
                src={getDirectImageUrl(image)}
                alt={image.name}
                loading="lazy"
                onLoad={() => handleImageLoad(image.id)}
                className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-110 ${
                  loadedImages[image.id] ? 'opacity-100' : 'opacity-0'
                }`}
                onError={(e) => {
                  // Fallback to webContentLink if thumbnail fails
                  const target = e.target as HTMLImageElement;
                  if (target.src !== image.webContentLink && image.webContentLink) {
                    target.src = image.webContentLink;
                  } else if (target.src !== `https://drive.google.com/uc?export=view&id=${image.id}`) {
                    target.src = `https://drive.google.com/uc?export=view&id=${image.id}`;
                  }
                }}
              />
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Action buttons overlay - centered and visible */}
              <div className="absolute inset-0 flex flex-col gap-3 items-center justify-center p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button
                  onClick={() => setSelectedImageIndex(index)}
                  className="bg-white/90 hover:bg-white px-4 py-2 rounded-full flex items-center space-x-2 text-sm shadow-lg"
                  aria-label={`View image ${image.name}`}
                >
                  <Eye className="h-4 w-4 text-gray-700" />
                  <span className="text-gray-700 font-medium">View Image</span>
                </button>

                <div className="flex space-x-2">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const button = e.currentTarget;
                      const originalText = button.innerHTML;
                      
                      // Show downloading feedback
                      button.innerHTML = '<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span class="text-gray-700 font-medium ml-2">Downloading...</span>';
                      button.disabled = true;
                      
                      try {
                        await downloadImage(image);
                        // Show success briefly
                        button.innerHTML = '<svg class="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span class="text-green-600 font-medium ml-2">Downloaded!</span>';
                        
                        // Reset after 2 seconds
                        setTimeout(() => {
                          button.innerHTML = originalText;
                          button.disabled = false;
                        }, 2000);
                      } catch (error) {
                        // Show error briefly
                        button.innerHTML = '<svg class="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg><span class="text-red-600 font-medium ml-2">Try Again</span>';
                        
                        // Reset after 3 seconds
                        setTimeout(() => {
                          button.innerHTML = originalText;
                          button.disabled = false;
                        }, 3000);
                      }
                    }}
                    className="bg-white/90 hover:bg-white px-4 py-2 rounded-full flex items-center space-x-2 text-sm shadow-lg disabled:opacity-70"
                    aria-label={`Download image ${image.name}`}
                  >
                    <Download className="h-4 w-4 text-gray-700" />
                    <span className="text-gray-700 font-medium">Download</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      shareImage(image);
                    }}
                    className="bg-white/90 hover:bg-white px-4 py-2 rounded-full flex items-center space-x-2 text-sm shadow-lg"
                    aria-label={`Share image ${image.name}`}
                  >
                    <Share2 className="h-4 w-4 text-gray-700" />
                    <span className="text-gray-700 font-medium">Share</span>
                  </button>
                </div>
              </div>
              
              {/* Image name overlay */}
              <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-white text-xs font-medium truncate bg-black/50 backdrop-blur-sm rounded px-2 py-1">
                  {image.name}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Image Modal */}
      <ImageModal
        isOpen={selectedImageIndex !== null}
        onClose={() => setSelectedImageIndex(null)}
        images={images}
        selectedIndex={selectedImageIndex || 0}
        onNavigate={setSelectedImageIndex}
      />
    </div>
  );
};

export default GoogleDriveGallery;