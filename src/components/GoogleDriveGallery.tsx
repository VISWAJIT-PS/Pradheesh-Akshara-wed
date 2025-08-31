import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Image as ImageIcon, RefreshCw, AlertCircle, Download, Share2 } from 'lucide-react';

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

  // Google Drive API configuration
  const API_KEY = 'AIzaSyBNn-27uk3XXKmsj8PtZJwWc7ZBcz-ouRo';
  const FOLDER_ID = folderId;

  const fetchGoogleDriveImages = useCallback(async (isRetry = false) => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    // Throttle requests to avoid 429 errors (minimum 1 second between requests)
    if (!isRetry && timeSinceLastRequest < 1000) {
      const waitTime = 1000 - timeSinceLastRequest;
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
              const backoffTime = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
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
      } else {
        setImages([]);
      }
    } catch (err) {
      console.error('Error fetching Google Drive images:', err);
      setError(err instanceof Error ? err.message : 'Failed to load images from Google Drive');
    } finally {
      setLoading(false);
    }
  }, [FOLDER_ID, API_KEY, lastRequestTime, retryCount]);

  useEffect(() => {
    fetchGoogleDriveImages();
  }, [fetchGoogleDriveImages]);

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

  const downloadImage = async (image: DriveImage) => {
    try {
      // Use the full image URL for download
      const downloadUrl = getFullImageUrl(image);
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = image.name || `wedding-photo-${image.id}.jpg`;
      link.target = '_blank'; // Open in new tab to handle any authentication if needed
      
      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Provide user feedback
      console.log('Download initiated for:', image.name);
      
    } catch (error) {
      console.error('Error downloading image:', error);
      
      // Fallback: open the image in a new tab for manual download
      try {
        const fallbackUrl = `https://drive.google.com/file/d/${image.id}/view`;
        window.open(fallbackUrl, '_blank');
        alert('Download failed. The image has been opened in a new tab. You can download it manually from there.');
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        alert('Download failed. Please try refreshing the page or contact support.');
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
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Loading Live Wedding Photos</h3>
        <p className="text-gray-600">Fetching the latest photos from our wedding...</p>
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
          onClick={() => fetchGoogleDriveImages()}
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
      {/* Centered Header with refresh button */}
      <div className="text-center mb-8">
        <div className="mb-4">
          <h3 className={`text-2xl md:text-3xl font-bold mb-2 inline-block px-3 py-1 rounded-lg bg-gradient-to-r from-${gradientFrom} to-${gradientTo} text-white`}>
            {title}
          </h3>
          <p className={`${textColor} mt-2`}>{description} ({images.length} photos)</p>
        </div>
        <button
          onClick={() => fetchGoogleDriveImages()}
          disabled={loading}
          className={`inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-${gradientFrom} to-${gradientTo} text-white rounded-lg hover:brightness-105 transition-all disabled:opacity-50`}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
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
              
              {/* Action buttons overlay */}
              <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadImage(image);
                  }}
                  className="p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-colors"
                  title="Download Photo"
                >
                  <Download className="h-4 w-4 text-gray-700" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    shareImage(image);
                  }}
                  className="p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-colors"
                  title="Share Photo"
                >
                  <Share2 className="h-4 w-4 text-gray-700" />
                </button>
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
    </div>
  );
};

export default GoogleDriveGallery;