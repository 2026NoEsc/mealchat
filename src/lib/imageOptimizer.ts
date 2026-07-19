import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 1024; // 1024x1024px
const JPEG_QUALITY = 0.8; // 80% quality

interface OptimizationResult {
  success: boolean;
  base64?: string;
  error?: string;
  progress: number;
}

export const validateImageFormat = (uri: string): boolean => {
  const extension = uri.toLowerCase().split('.').pop();
  return ['jpg', 'jpeg', 'png', 'webp'].includes(extension || '');
};

export const getImageFileSizeInMB = async (uri: string): Promise<number> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists && fileInfo.size) {
      return fileInfo.size / (1024 * 1024);
    }
    return 0;
  } catch (error) {
    console.error('Error getting file size:', error);
    return 0;
  }
};

export const optimizeImage = async (
  uri: string,
  onProgress?: (progress: number) => void
): Promise<OptimizationResult> => {
  try {
    onProgress?.(10);

    // Validate format
    if (!validateImageFormat(uri)) {
      return {
        success: false,
        error: '지원하지 않는 이미지 형식입니다. JPG, PNG, WebP만 지원합니다.',
        progress: 0
      };
    }

    onProgress?.(20);

    // Check file size
    const fileSizeInMB = await getImageFileSizeInMB(uri);
    if (fileSizeInMB > MAX_FILE_SIZE / (1024 * 1024)) {
      return {
        success: false,
        error: '이미지는 5MB 이하여야 합니다.',
        progress: 0
      };
    }

    onProgress?.(40);

    // Resize image
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: MAX_DIMENSION,
            height: MAX_DIMENSION
          }
        }
      ],
      {
        compress: JPEG_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true
      }
    );

    onProgress?.(80);

    if (!manipulatedImage.base64) {
      return {
        success: false,
        error: '이미지 처리에 실패했습니다.',
        progress: 0
      };
    }

    onProgress?.(100);

    return {
      success: true,
      base64: `data:image/jpeg;base64,${manipulatedImage.base64}`,
      progress: 100
    };
  } catch (error: any) {
    console.error('Error optimizing image:', error);
    return {
      success: false,
      error: error.message || '이미지 최적화에 실패했습니다.',
      progress: 0
    };
  }
};
