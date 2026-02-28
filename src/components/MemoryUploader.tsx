import { useState, useCallback, useRef } from 'react';

export interface UploadedMedia {
  id: string;
  file: File;
  type: 'image' | 'video';
  dataUrl: string;
  thumbnail?: string;
}

interface Props {
  onComplete: (media: UploadedMedia[]) => void;
  isAnalyzing?: boolean;
}

export function MemoryUploader({ onComplete, isAnalyzing = false }: Props) {
  const [uploads, setUploads] = useState<UploadedMedia[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(f => 
      f.type.startsWith('image/') || f.type.startsWith('video/')
    );

    const newUploads: UploadedMedia[] = await Promise.all(
      validFiles.map(async (file) => {
        const dataUrl = await readFileAsDataUrl(file);
        const type = file.type.startsWith('video/') ? 'video' : 'image';
        
        let thumbnail = dataUrl;
        if (type === 'video') {
          thumbnail = await generateVideoThumbnail(file);
        }

        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          type,
          dataUrl,
          thumbnail,
        };
      })
    );

    setUploads(prev => [...prev, ...newUploads]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  }, [processFiles]);

  const removeUpload = useCallback((id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  }, []);

  const handleContinue = useCallback(() => {
    if (uploads.length >= 3) {
      onComplete(uploads);
    }
  }, [uploads, onComplete]);

  const canContinue = uploads.length >= 3;
  const imageCount = uploads.filter(u => u.type === 'image').length;
  const videoCount = uploads.filter(u => u.type === 'video').length;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-reverie-black px-6 py-12 animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-extralight tracking-[0.3em] text-white uppercase mb-3">
          MEMORY LANE
        </h1>
        <p className="text-reverie-muted text-sm tracking-widest uppercase mb-2">
          Walk Through Your Memories
        </p>
        <p className="text-reverie-accent text-xs tracking-wider">
          Upload at least 3 photos or videos from your camera roll
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          w-full max-w-2xl aspect-video rounded-2xl border-2 border-dashed
          flex flex-col items-center justify-center gap-4 cursor-pointer
          transition-all duration-200
          ${isDragging 
            ? 'border-reverie-accent bg-reverie-accent/10 scale-[1.02]' 
            : 'border-reverie-border bg-reverie-surface/30 hover:border-reverie-accent/50 hover:bg-reverie-surface/50'
          }
        `}
      >
        <div className="text-6xl">
          {isDragging ? '✨' : '📸'}
        </div>
        <div className="text-center">
          <p className="text-white text-lg font-medium mb-1">
            {isDragging ? 'Drop your memories here!' : 'Drag & drop your photos and videos'}
          </p>
          <p className="text-reverie-muted text-sm">
            or click to browse
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Upload Preview Grid */}
      {uploads.length > 0 && (
        <div className="w-full max-w-4xl mt-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-reverie-muted text-sm">
              {imageCount} photo{imageCount !== 1 ? 's' : ''}, {videoCount} video{videoCount !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => setUploads([])}
              className="text-red-400 text-xs hover:text-red-300 transition-colors"
            >
              Clear all
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className="relative aspect-square rounded-xl overflow-hidden group border border-reverie-border"
              >
                <img
                  src={upload.thumbnail || upload.dataUrl}
                  alt="Upload preview"
                  className="w-full h-full object-cover"
                />
                {upload.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeUpload(upload.id);
                  }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Continue Button */}
      <div className="mt-8 flex flex-col items-center gap-4">
        <p className="text-reverie-muted text-sm">
          {uploads.length} of 3+ uploaded
        </p>
        <button
          onClick={handleContinue}
          disabled={!canContinue || isAnalyzing}
          className={`
            px-8 py-3.5 rounded-xl font-medium tracking-widest uppercase text-sm
            transition-all duration-200 flex items-center gap-3
            ${canContinue && !isAnalyzing
              ? 'bg-reverie-accent text-white hover:bg-reverie-glow cursor-pointer'
              : 'bg-reverie-surface text-reverie-muted cursor-not-allowed opacity-50'
            }
          `}
        >
          {isAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing memories...
            </>
          ) : (
            'Create My Memory Lane'
          )}
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-12 max-w-lg text-center">
        <div className="bg-reverie-surface/50 border border-reverie-border rounded-xl p-4 space-y-2">
          <p className="text-purple-400 text-sm font-medium flex items-center justify-center gap-2">
            <span className="text-lg">🌟</span> How It Works
          </p>
          <p className="text-reverie-border text-xs leading-relaxed">
            Upload your favorite photos and videos. Our AI will analyze them to find the best
            <span className="text-purple-400 font-medium"> scene images</span> (rooms, parks, landscapes)
            to create your personalized 3D memory world.
            <br />
            Then explore and <span className="text-blue-400">click on memory frames</span> to replay your videos!
          </p>
          <p className="text-reverie-muted text-[10px] tracking-wider uppercase mt-2">
            Use WASD to move • Mouse to look • Click frames to play memories
          </p>
        </div>
      </div>
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function generateVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration / 2);
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
      URL.revokeObjectURL(video.src);
    };

    video.onerror = () => {
      resolve('');
    };

    video.src = URL.createObjectURL(file);
  });
}
